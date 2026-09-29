"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { CircleAlert, LoaderCircle } from "lucide-react";
import { errorText } from "@/lib/errors";
import { useAuth } from "@/providers/AuthProvider";
import { LogoMark } from "../ui/LogoMark";
import { ThemeToggle } from "../ui/ThemeToggle";

/** Only same site paths are allowed as a destination after sign in. */
function safeDestination(next: string | null) {
  return next?.startsWith("/") && !next.startsWith("//") ? next : "/";
}

/**
 * Sign in, and in cloud mode create an account. Demo mode asks for the fixed
 * demo username instead of an email.
 */
export function LoginScreen() {
  const { ready, user, mode, signIn, signUp } = useAuth();
  const router = useRouter();
  const destination = safeDestination(useSearchParams().get("next"));
  const [creating, setCreating] = useState(false);
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  useEffect(() => {
    if (ready && user) router.replace(destination);
  }, [ready, user, router, destination]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      if (!creating) await signIn(login, password);
      else if (await signUp(login, password)) {
        setMessage({ text: "Check your email to confirm your account, then sign in.", error: false });
        setCreating(false);
      }
    } catch (error) {
      setMessage({ text: errorText(error), error: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth">
      <div className="auth__corner">
        <ThemeToggle />
      </div>
      <form className="auth__card" onSubmit={submit}>
        <LogoMark size={36} />
        <div className="auth__heading">
          <h1>{creating ? "Create your account" : "Sign in to Autolab"}</h1>
          {mode === "demo" ? <p className="muted">Demo mode</p> : null}
        </div>
        <label className="field">
          <span className="field__label">{mode === "demo" ? "Username" : "Email"}</span>
          <input
            className="input"
            type={mode === "demo" ? "text" : "email"}
            autoComplete={mode === "demo" ? "username" : "email"}
            autoCapitalize="none"
            spellCheck={false}
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            required
            autoFocus
          />
        </label>
        <label className="field">
          <span className="field__label">Password</span>
          <input
            className="input"
            type="password"
            autoComplete={creating ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={mode === "cloud" ? 8 : undefined}
            required
          />
        </label>
        {message ? (
          <p className={`auth__message ${message.error ? "auth__message--error" : ""}`} role={message.error ? "alert" : "status"}>
            {message.error ? <CircleAlert size={16} strokeWidth={1.8} aria-hidden="true" /> : null}
            {message.text}
          </p>
        ) : null}
        <button className="btn btn--primary btn--lg btn--block" disabled={busy || !ready}>
          {busy ? <LoaderCircle size={16} className="spin" aria-hidden="true" /> : null}
          {creating ? "Create account" : "Sign in"}
        </button>
        {mode === "cloud" ? (
          <p className="auth__switch muted">
            {creating ? "Already have an account?" : "New here?"}{" "}
            <button type="button" className="auth__link" onClick={() => setCreating((v) => !v)}>
              {creating ? "Sign in" : "Create an account"}
            </button>
          </p>
        ) : null}
      </form>
    </main>
  );
}
