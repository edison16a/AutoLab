"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { LogoMark } from "@/components/ui/primitives";

function LoginForm() {
  const { ready, user, mode, signIn, signUp } = useAuth(),
    router = useRouter(),
    params = useSearchParams();
  const [creating, setCreating] = useState(false),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const next = params.get("next");
  const destination = next?.startsWith("/") && !next.startsWith("//") ? next : "/";
  useEffect(() => {
    if (ready && user) router.replace(destination);
  }, [ready, user, router, destination]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (creating) {
        const confirm = await signUp(email, password);
        if (confirm) {
          setNotice("Check your email to confirm your account, then sign in.");
          setCreating(false);
        }
      } else await signIn(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="auth-card" onSubmit={submit}>
      <LogoMark size={40} />
      <div className="auth-heading">
        <h1>{creating ? "Create your account" : "Sign in to Autolab"}</h1>
        {mode === "demo" && <p>Demo mode: any email and password works.</p>}
      </div>
      <label>
        Email
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@lab.org"
          required
          autoFocus
        />
      </label>
      <label>
        Password
        <input
          type="password"
          autoComplete={creating ? "new-password" : "current-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={mode === "cloud" ? 8 : undefined}
          required
        />
      </label>
      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="auth-notice" role="status">
          {notice}
        </p>
      )}
      <button className="primary lg full" disabled={busy || !ready}>
        {busy ? <LoaderCircle size={16} className="spin" /> : null}
        {creating ? "Create account" : "Sign in"}
        {!busy && <ArrowRight size={16} />}
      </button>
      {mode === "cloud" && (
        <p className="auth-switch">
          {creating ? "Already have an account?" : "New to Autolab?"}{" "}
          <button
            type="button"
            className="link-button"
            onClick={() => {
              setCreating((v) => !v);
              setError("");
            }}
          >
            {creating ? "Sign in" : "Create an account"}
          </button>
        </p>
      )}
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="auth-page">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
