"use client";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { AutolabProvider } from "@/providers/AutolabProvider";
import { useAutolab } from "@/providers/autolab-context";
import { LogoMark } from "../ui/LogoMark";
import { Toasts } from "../ui/Toasts";
import { TopBar } from "./TopBar";

// The connect wizard pulls in the 3D stack, so it only loads when opened.
const ConnectWizard = dynamic(() => import("../onboarding/ConnectWizard"), { ssr: false });

/** Everything that needs the Autolab context, rendered once signed in. */
function Shell({ children }: { children: ReactNode }) {
  const { toasts, dismissToast, connectOpen, closeConnect } = useAutolab();
  return (
    <div className="app">
      <TopBar />
      <main className="app__main" id="main">
        {children}
      </main>
      <Toasts toasts={toasts} onDismiss={dismissToast} />
      {connectOpen ? <ConnectWizard onClose={closeConnect} /> : null}
    </div>
  );
}

/**
 * Gate for every signed in screen. Sends signed out visitors to /login and
 * remembers where they were headed. Keyed by user so switching accounts
 * starts from a clean slate.
 */
export function AppFrame({ children }: { children: ReactNode }) {
  const { ready, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (ready && !user) router.replace(pathname === "/" ? "/login" : `/login?next=${encodeURIComponent(pathname)}`);
  }, [ready, user, router, pathname]);

  if (!ready || !user)
    return (
      <div className="splash" aria-busy="true">
        <LogoMark size={32} />
      </div>
    );
  return (
    <AutolabProvider key={user.id} user={user}>
      <Shell>{children}</Shell>
    </AutolabProvider>
  );
}
