"use client";
/**
 * Who is signed in. Demo mode accepts any email and password and keeps a
 * fake session in localStorage, so the app feels the same as cloud mode
 * without an account system. Cloud mode uses Supabase Auth.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { cloudEnabled, supabase } from "@/lib/cloud";
import { readSetting, STORAGE_KEYS, writeSetting } from "@/lib/storage/local-settings";

export interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthValue {
  mode: "demo" | "cloud";
  /** False until the saved session has been read, so screens don't flash the sign in page. */
  ready: boolean;
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  /** Resolves true when the new account has to confirm its email first. */
  signUp: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

/** "jane.doe@lab.org" becomes "Jane Doe". Good enough for a greeting and an avatar letter. */
function nameFromEmail(email: string) {
  const local = email.split("@")[0] || "Researcher";
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function toUser(id: string, email: string): User {
  return { id, email, name: nameFromEmail(email) };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!cloudEnabled) {
      setUser(readSetting<User | null>(STORAGE_KEYS.session, null));
      setReady(true);
      return;
    }
    const client = supabase();
    const apply = (session: { user: { id: string; email?: string } } | null) =>
      setUser(session ? toUser(session.user.id, session.user.email ?? "") : null);
    void client.auth.getSession().then(({ data }) => {
      apply(data.session);
      setReady(true);
    });
    const { data } = client.auth.onAuthStateChange((_event, session) => apply(session));
    return () => data.subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!cloudEnabled) {
      // Demo users are keyed by email so each one gets their own library.
      const clean = email.trim().toLowerCase() || "guest";
      const next = toUser(`demo-${clean}`, clean);
      writeSetting(STORAGE_KEYS.session, next);
      setUser(next);
      return;
    }
    const { error } = await supabase().auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signUp = useCallback(
    async (email: string, password: string) => {
      if (!cloudEnabled) {
        await signIn(email, password);
        return false;
      }
      const { data, error } = await supabase().auth.signUp({ email, password });
      if (error) throw error;
      return !data.session;
    },
    [signIn],
  );

  const signOut = useCallback(async () => {
    if (cloudEnabled) {
      await supabase().auth.signOut();
      return;
    }
    writeSetting(STORAGE_KEYS.session, null);
    setUser(null);
  }, []);

  const value = useMemo<AuthValue>(
    () => ({ mode: cloudEnabled ? "cloud" : "demo", ready, user, signIn, signUp, signOut }),
    [ready, user, signIn, signUp, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
