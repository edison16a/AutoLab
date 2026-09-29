"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { cloudEnabled, supabase } from "@/lib/cloud";
import { keys, readJSON, writeJSON } from "@/lib/storage";

export type User = { id: string; email: string; name: string };

type AuthValue = {
  mode: "demo" | "cloud";
  ready: boolean;
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  /** Returns true when the account needs email confirmation before sign-in. */
  signUp: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

function nameFrom(email: string) {
  const local = email.split("@")[0] || "Researcher";
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function demoUser(email: string): User {
  const clean = email.trim().toLowerCase() || "guest";
  return { id: `demo-${clean}`, email: clean, name: nameFrom(clean) };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false),
    [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!cloudEnabled) {
      setUser(readJSON<User | null>(keys.session, null));
      setReady(true);
      return;
    }
    try {
      const client = supabase();
      const apply = (session: { user: { id: string; email?: string } } | null) =>
        setUser(
          session
            ? {
                id: session.user.id,
                email: session.user.email || "",
                name: nameFrom(session.user.email || ""),
              }
            : null,
        );
      client.auth.getSession().then(({ data }) => {
        apply(data.session);
        setReady(true);
      });
      const { data } = client.auth.onAuthStateChange((_event, session) =>
        apply(session),
      );
      return () => data.subscription.unsubscribe();
    } catch {
      setReady(true);
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!cloudEnabled) {
      // Demo mode accepts any credentials. Nothing is sent anywhere.
      const next = demoUser(email);
      writeJSON(keys.session, next);
      setUser(next);
      return;
    }
    const { error } = await supabase().auth.signInWithPassword({
      email,
      password,
    });
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
    if (!cloudEnabled) {
      writeJSON(keys.session, null);
      setUser(null);
      return;
    }
    await supabase().auth.signOut();
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      mode: cloudEnabled ? "cloud" : "demo",
      ready,
      user,
      signIn,
      signUp,
      signOut,
    }),
    [ready, user, signIn, signUp, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
