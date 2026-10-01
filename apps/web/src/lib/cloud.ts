import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * How this build talks to the world:
 * demo: no accounts, photos stay in this browser.
 * lab: a computer in the lab talks to the Autolab and syncs to Supabase as
 *   the signed in person, so any other device can follow along.
 * cloud: a hosted gateway checks logins and stores photos itself.
 */
export type AppMode = "demo" | "cloud" | "lab";
const configured = process.env.NEXT_PUBLIC_AUTOLAB_MODE;
export const appMode: AppMode = configured === "cloud" || configured === "lab" ? configured : "demo";
export const cloudEnabled = appMode === "cloud";
export const labEnabled = appMode === "lab";
/** Supabase accounts sign people in. */
export const accountsEnabled = appMode !== "demo";
/** What the gateway and the Pi run as. Lab mode's gateway is a local one, so it needs no logins. */
export const gatewayMode: "demo" | "cloud" = cloudEnabled ? "cloud" : "demo";
/** How Settings names each mode. */
export const MODE_LABEL: Record<AppMode, string> = { demo: "Demo", cloud: "Cloud", lab: "Lab" };

let client: SupabaseClient | undefined;
export function supabase() {
  if (!accountsEnabled) throw new Error("Accounts are off in demo mode");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key)
    throw new Error("Set the Supabase public environment variables");
  return (client ??= createClient(url, key));
}
/** The login the hosted gateway checks. Demo and lab gateways don't ask for one. */
export async function token() {
  return cloudEnabled
    ? (await supabase().auth.getSession()).data.session?.access_token
    : undefined;
}
export function httpBase(ws: string) {
  const u = new URL(ws);
  u.protocol = u.protocol === "wss:" ? "https:" : "http:";
  u.pathname = "";
  return u.origin;
}
export async function api(
  base: string,
  path: string,
  method = "GET",
  body?: unknown,
) {
  const t = await token();
  const r = await fetch(httpBase(base) + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.detail || "Request failed");
  return data;
}
