import type { Metadata } from "next";
import Link from "next/link";
import { LogoMark } from "@/components/ui/LogoMark";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import "@/styles/auth.css";

export const metadata: Metadata = { title: "Page not found" };

/**
 * Any address that doesn't match a screen. It borrows the sign in card so it
 * looks like part of the app in both themes, instead of the framework default.
 */
export default function NotFound() {
  return (
    <main className="auth">
      <div className="auth__corner">
        <ThemeToggle />
      </div>
      <div className="auth__card">
        <LogoMark size={36} />
        <div className="auth__heading">
          <h1>Page not found</h1>
          <p className="muted">This address doesn&apos;t match anything in Autolab.</p>
        </div>
        <Link href="/" className="btn btn--primary btn--lg btn--block">
          Go to Home
        </Link>
      </div>
    </main>
  );
}
