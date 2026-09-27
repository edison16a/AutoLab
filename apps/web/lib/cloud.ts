import { createClient } from "@supabase/supabase-js";
export const cloudEnabled = process.env.NEXT_PUBLIC_AUTOLAB_MODE === "cloud";
let client: ReturnType<typeof createClient> | undefined;
export function supabase() {
  if (!cloudEnabled) throw new Error("Cloud mode is disabled");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key)
    throw new Error("Set the Supabase public environment variables");
  return (client ??= createClient(url, key));
}
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
