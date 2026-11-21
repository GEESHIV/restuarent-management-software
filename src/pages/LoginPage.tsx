import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChefHat,
  LogIn,
  Utensils,
  ShoppingBag,
  Loader2,
  Eye,
  EyeOff,
  UserPlus,
  KeyRound,
  Mail,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button, Field, Input } from "@/components/ui";
import { useToast } from "@/components/Toast";

type Tab = "signin" | "register" | "reset";

const DEMO = [
  { role: "Owner", email: "owner@demo.restaurant", password: "SpiceGarden2025!", icon: ChefHat, desc: "Full access — menu, tables, staff, reports" },
  { role: "Waiter", email: "waiter@demo.restaurant", password: "SpiceGarden2025!", icon: Utensils, desc: "Take orders, send to kitchen, generate bills" },
  { role: "Kitchen", email: "kitchen@demo.restaurant", password: "SpiceGarden2025!", icon: ShoppingBag, desc: "View incoming orders, update prep status" },
];

export function LoginPage() {
  const { signIn, registerOwner, resetPassword } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();

  const [tab, setTab] = useState<Tab>("signin");

  // Sign-in fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Registration fields
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPw, setRegPw] = useState("");
  const [regRestaurant, setRegRestaurant] = useState("");

  // Reset field
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await signIn(email.trim(), password);
    setLoading(false);
    if (error) {
      setError(error);
      notify(error, "error");
    } else {
      notify("Welcome back!", "success");
      navigate("/");
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (regPw.length < 8) {
      setError("Password must be at least 8 characters.");
      notify("Password must be at least 8 characters.", "error");
      return;
    }
    setLoading(true);
    const { error } = await registerOwner({
      email: regEmail.trim(),
      password: regPw,
      full_name: regName.trim(),
      restaurant_name: regRestaurant.trim(),
    });
    setLoading(false);
    if (error) {
      setError(error);
      notify(error, "error");
    } else {
      notify("Restaurant registered! Welcome aboard.", "success");
      navigate("/");
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await resetPassword(resetEmail.trim());
    setLoading(false);
    if (error) {
      setError(error);
      notify(error, "error");
    } else {
      setResetSent(true);
      notify("Password reset link sent to your email.", "success");
    }
  }

  function fillDemo(em: string) {
    setEmail(em);
    setPassword("SpiceGarden2025!");
    setTab("signin");
    setError(null);
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 lg:grid lg:grid-cols-2">
      {/* Left brand panel */}
      <div className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background:
              "radial-gradient(60% 50% at 20% 10%, #16a34a55 0%, transparent 60%), radial-gradient(50% 50% at 80% 90%, #ea580c33 0%, transparent 60%)",
          }}
        />
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-2xl shadow-lg shadow-emerald-900/40">
              🍽️
            </div>
            <div>
              <p className="font-display text-2xl font-bold tracking-tight">Restaurant Manager</p>
              <p className="text-sm text-stone-400">Multi-restaurant Management Suite</p>
            </div>
          </div>
        </div>

        <div className="relative max-w-md">
          <h1 className="font-display text-4xl font-bold leading-tight">
            Run your restaurant from a single pane of glass.
          </h1>
          <p className="mt-4 text-lg text-stone-300">
            Register your restaurant, manage menus, tables, orders, kitchen tickets,
            bills and reports — all in real time across every device.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-4">
            {[
              ["3", "Staff roles"],
              ["24/7", "Live orders"],
              ["QR", "Table menus"],
            ].map(([n, l]) => (
              <div key={l} className="rounded-2xl border border-stone-800 bg-stone-900/60 p-4">
                <p className="font-display text-2xl font-bold text-emerald-400">{n}</p>
                <p className="mt-1 text-xs text-stone-400">{l}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-stone-500">
          © 2026 Restaurant Manager. Crafted for modern restaurants.
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex min-h-screen items-center justify-center bg-stone-100 px-6 py-12 text-stone-900 lg:rounded-l-[2.5rem]">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center lg:hidden">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-2xl text-white shadow-lg">
              🍽️
            </div>
            <h1 className="font-display text-2xl font-bold">Restaurant Manager</h1>
            <p className="text-sm text-stone-500">Management Suite</p>
          </div>

          {/* Tabs */}
          <div className="mb-6 grid grid-cols-3 gap-1 rounded-2xl bg-stone-200/70 p-1">
            <button
              onClick={() => { setTab("signin"); setError(null); }}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-medium transition ${
                tab === "signin" ? "bg-white text-stone-900 shadow-sm" : "text-stone-600 hover:text-stone-800"
              }`}
            >
              <LogIn size={15} /> Sign in
            </button>
            <button
              onClick={() => { setTab("register"); setError(null); }}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-medium transition ${
                tab === "register" ? "bg-white text-stone-900 shadow-sm" : "text-stone-600 hover:text-stone-800"
              }`}
            >
              <UserPlus size={15} /> Register
            </button>
            <button
              onClick={() => { setTab("reset"); setError(null); setResetSent(false); }}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-medium transition ${
                tab === "reset" ? "bg-white text-stone-900 shadow-sm" : "text-stone-600 hover:text-stone-800"
              }`}
            >
              <KeyRound size={15} /> Reset
            </button>
          </div>

          {/* SIGN IN */}
          {tab === "signin" && (
            <>
              <h2 className="font-display text-2xl font-bold">Staff sign in</h2>
              <p className="mt-2 text-sm text-stone-500">
                Log in with your account to access your dashboard.
              </p>
              <form onSubmit={handleSignIn} className="mt-6 space-y-5">
                <Field label="Email address">
                  <Input
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="you@restaurant.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </Field>
                <Field label="Password">
                  <div className="relative">
                    <Input
                      type={showPw ? "text" : "password"}
                      required
                      autoComplete="current-password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                    >
                      {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </Field>
                {error && (
                  <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
                )}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => { setTab("reset"); setError(null); setResetSent(false); }}
                    className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
                  >
                    Forgot password?
                  </button>
                </div>
                <Button type="submit" size="lg" className="w-full" disabled={loading}>
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
                  {loading ? "Signing in…" : "Sign in"}
                </Button>
              </form>

              {/* Demo accounts */}
              <div className="mt-8">
                <div className="relative mb-4 text-center">
                  <span className="relative z-10 bg-stone-100 px-3 text-xs font-medium uppercase tracking-wider text-stone-400">
                    Try a demo role
                  </span>
                  <div className="absolute left-0 top-1/2 h-px w-full bg-stone-200" />
                </div>
                <div className="grid gap-2.5">
                  {DEMO.map((d) => (
                    <button
                      key={d.role}
                      onClick={() => fillDemo(d.email)}
                      className="group flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-3 text-left transition hover:border-emerald-400 hover:bg-emerald-50"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-900 text-white group-hover:bg-emerald-600">
                        <d.icon size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-stone-800">{d.role}</p>
                        <p className="truncate text-xs text-stone-500">{d.desc}</p>
                      </div>
                      <span className="text-xs font-medium text-emerald-600 opacity-0 transition group-hover:opacity-100">
                        Use →
                      </span>
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-center text-xs text-stone-400">
                  Demo password: <span className="font-mono text-stone-600">SpiceGarden2025!</span>
                </p>
              </div>
            </>
          )}

          {/* REGISTER */}
          {tab === "register" && (
            <>
              <h2 className="font-display text-2xl font-bold">Register your restaurant</h2>
              <p className="mt-2 text-sm text-stone-500">
                Create an owner account and set up your restaurant in one step.
              </p>
              <form onSubmit={handleRegister} className="mt-6 space-y-4">
                <Field label="Your name">
                  <Input
                    required
                    placeholder="e.g. Arjun Mehta"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                  />
                </Field>
                <Field label="Restaurant name">
                  <Input
                    required
                    placeholder="e.g. Spice Garden"
                    value={regRestaurant}
                    onChange={(e) => setRegRestaurant(e.target.value)}
                  />
                </Field>
                <Field label="Email address">
                  <Input
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="you@restaurant.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                  />
                </Field>
                <Field label="Password (min 8 characters)">
                  <div className="relative">
                    <Input
                      type={showPw ? "text" : "password"}
                      required
                      autoComplete="new-password"
                      placeholder="••••••••"
                      value={regPw}
                      onChange={(e) => setRegPw(e.target.value)}
                      className="pr-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                    >
                      {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </Field>
                {error && (
                  <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
                )}
                <Button type="submit" size="lg" className="w-full" disabled={loading}>
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
                  {loading ? "Creating account…" : "Register restaurant"}
                </Button>
                <p className="text-center text-xs text-stone-400">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => { setTab("signin"); setError(null); }}
                    className="font-medium text-emerald-600 hover:text-emerald-700"
                  >
                    Sign in
                  </button>
                </p>
              </form>
            </>
          )}

          {/* RESET */}
          {tab === "reset" && (
            <>
              <h2 className="font-display text-2xl font-bold">Reset password</h2>
              <p className="mt-2 text-sm text-stone-500">
                Enter your email and we'll send you a secure link to set a new password.
              </p>
              {resetSent ? (
                <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
                  <Mail size={32} className="mx-auto text-emerald-600" />
                  <p className="mt-3 font-semibold text-emerald-800">Check your inbox</p>
                  <p className="mt-1 text-sm text-emerald-700">
                    We've sent a password reset link to {resetEmail}.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => { setTab("signin"); setResetSent(false); }}
                  >
                    Back to sign in
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleReset} className="mt-6 space-y-5">
                  <Field label="Email address">
                    <Input
                      type="email"
                      required
                      placeholder="you@restaurant.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                    />
                  </Field>
                  {error && (
                    <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
                  )}
                  <Button type="submit" size="lg" className="w-full" disabled={loading}>
                    {loading ? <Loader2 size={18} className="animate-spin" /> : <KeyRound size={18} />}
                    {loading ? "Sending…" : "Send reset link"}
                  </Button>
                  <p className="text-center text-xs text-stone-400">
                    Remembered your password?{" "}
                    <button
                      type="button"
                      onClick={() => { setTab("signin"); setError(null); }}
                      className="font-medium text-emerald-600 hover:text-emerald-700"
                    >
                      Sign in
                    </button>
                  </p>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
