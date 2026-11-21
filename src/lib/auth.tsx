import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, SUPABASE_URL } from "@/lib/supabase";
import type { Restaurant, Role, Staff } from "@/types";

interface AuthState {
  session: Session | null;
  staff: Staff | null;
  restaurant: Restaurant | null;
  loading: boolean;
}

interface RegisterOwnerInput {
  email: string;
  password: string;
  full_name: string;
  restaurant_name: string;
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  registerOwner: (input: RegisterOwnerInput) => Promise<{ error: string | null }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    session: null,
    staff: null,
    restaurant: null,
    loading: true,
  });

  async function loadProfile(userId: string) {
    const { data: staffRow } = await supabase
      .from("staff")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle();

    let restaurant: Restaurant | null = null;
    if (staffRow) {
      const { data: rest } = await supabase
        .from("restaurants")
        .select("*")
        .eq("id", staffRow.restaurant_id)
        .maybeSingle();
      restaurant = rest as Restaurant | null;
    }
    setState((s) => ({
      ...s,
      staff: staffRow as Staff | null,
      restaurant: restaurant,
      loading: false,
    }));
  }

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      const session = data.session;
      if (session) {
        await loadProfile(session.user.id);
      } else {
        setState({ session: null, staff: null, restaurant: null, loading: false });
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        if (session) {
          setState((s) => ({ ...s, session, loading: true }));
          await loadProfile(session.user.id);
        } else {
          setState({ session: null, staff: null, restaurant: null, loading: false });
        }
      })();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  }

  async function registerOwner(input: RegisterOwnerInput) {
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/register-owner`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(input),
      });
      const data = await resp.json();
      if (!resp.ok || data.error) {
        return { error: data.error || "Registration failed." };
      }
      // Auto sign-in after successful registration
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: input.email.trim().toLowerCase(),
        password: input.password,
      });
      if (signInError) {
        return { error: "Registration succeeded, but sign-in failed. Please sign in manually." };
      }
      return { error: null };
    } catch (err: any) {
      return { error: err.message || "Registration failed." };
    }
  }

  async function resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    if (error) return { error: error.message };
    return { error: null };
  }

  async function signOut() {
    setState({ session: null, staff: null, restaurant: null, loading: false });
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ ...state, signIn, registerOwner, resetPassword, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function useRole(): Role | null {
  const { staff } = useAuth();
  return staff?.role ?? null;
}
