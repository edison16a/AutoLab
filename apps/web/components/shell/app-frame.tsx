"use client";
import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { AutolabProvider } from "@/components/providers/autolab-provider";
import { LogoMark } from "@/components/ui/primitives";
import AppShell from "./app-shell";

export default function AppFrame({ children }: { children: ReactNode }) {
  const { ready, user } = useAuth(),
    router = useRouter(),
    pathname = usePathname();
  useEffect(() => {
    if (ready && !user)
      router.replace(pathname === "/" ? "/login" : `/login?next=${encodeURIComponent(pathname)}`);
  }, [ready, user, router, pathname]);
  if (!ready || !user)
    return (
      <div className="splash" aria-busy="true">
        <LogoMark size={36} />
      </div>
    );
  return (
    <AutolabProvider key={user.id} user={user}>
      <AppShell>{children}</AppShell>
    </AutolabProvider>
  );
}
