/**
 * The one account demo mode accepts. Demo mode has no server to check a
 * password against, so this is a shared login for the public demo, not a
 * secret. Cloud mode ignores it and uses Supabase Auth.
 */
export const DEMO_ACCOUNT = {
  username: "ntabuser",
  password: "ntabuser123",
} as const;

/** The signed in user for the demo account. Its ID keys the demo library and devices. */
export const DEMO_USER = {
  id: `demo-${DEMO_ACCOUNT.username}`,
  email: DEMO_ACCOUNT.username,
  name: DEMO_ACCOUNT.username,
};
