import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { Button, Field, Input } from "@/components/ui";

export function ResetPasswordPage() {
  const { updatePassword, signOut } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validLink, setValidLink] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkRecoverySession() {
      const { data, error } = await supabase.auth.getSession();
      if (!mounted) return;
      if (error || !data.session) {
        setValidLink(false);
        setError("This password reset link is invalid or has expired.");
      } else {
        setValidLink(true);
      }
      setLoading(false);
    }

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "PASSWORD_RECOVERY" && session) {
        setValidLink(true);
        setError(null);
        setLoading(false);
      }
    });

    void checkRecoverySession();

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    const { error: updateError } = await updatePassword(password);
    setSubmitting(false);

    if (updateError) {
      setError(updateError);
      return;
    }

    await signOut();
    navigate("/login", { replace: true });
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-100 text-stone-500">
        <Loader2 className="animate-spin" size={24} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-100 px-6 py-12 text-stone-900">
      <div className="w-full max-w-md rounded-[2rem] border border-stone-200 bg-white p-8 shadow-xl shadow-stone-300/40">
        <div className="mb-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-white">
            <KeyRound size={24} />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold">Set a new password</h1>
        </div>

        {validLink ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            <Field label="New password">
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  minLength={8}
                  placeholder="Minimum 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((shown) => !shown)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </Field>

            <Field label="Confirm password">
              <Input
                type={showPassword ? "text" : "password"}
                required
                autoComplete="new-password"
                minLength={8}
                placeholder="Repeat your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </Field>

            {error && (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={submitting}>
              {submitting ? <Loader2 size={18} className="animate-spin" /> : <KeyRound size={18} />}
              {submitting ? "Updating…" : "Update password"}
            </Button>
          </form>
        ) : (
          <div className="text-center">
            {error && (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            )}
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => navigate("/login", { replace: true })}
            >
              Back to sign in
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
