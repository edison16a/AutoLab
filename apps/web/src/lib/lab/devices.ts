/**
 * Lab mode: the Autolabs this account owns, read and written straight to
 * Supabase. Row level security (supabase/migrations/002_lab_mode.sql) limits
 * every call to the signed in person's own rows.
 */
import { supabase } from "../cloud";
import type { ComponentReport, Device } from "@/model/types";

const COLUMNS = "id,name,status,camera_online,last_seen_at,simulated,agent_version";
/** The Pi's parts list, from supabase/migrations/003_components.sql. Projects that haven't applied it yet are read without it. */
const WITH_COMPONENTS = `${COLUMNS},components`;
/** Postgres' "undefined column". */
const NO_SUCH_COLUMN = "42703";

interface DeviceRow {
  id: string;
  name: string;
  status: string;
  camera_online: boolean;
  last_seen_at: string | null;
  simulated: boolean;
  agent_version: string | null;
  components?: ComponentReport[] | null;
}

function toDevice(row: DeviceRow): Device {
  return {
    id: row.id,
    name: row.name,
    report: {
      online: row.status === "online",
      camera_online: row.camera_online,
      last_seen: row.last_seen_at,
      simulated: row.simulated,
      agent_version: row.agent_version ?? undefined,
      components: Array.isArray(row.components) ? row.components : undefined,
    },
  };
}

export async function listDevices(): Promise<Device[]> {
  const read = (columns: string) => supabase().from("devices").select(columns).order("created_at");
  let { data, error } = await read(WITH_COMPONENTS);
  if (error?.code === NO_SUCH_COLUMN) ({ data, error } = await read(COLUMNS));
  if (error) throw error;
  return (data as unknown as DeviceRow[]).map(toDevice);
}

/**
 * Adds an Autolab to this account and links its Pi's login, or updates both
 * if it's already ours. A device id can only belong to one account: someone
 * else's row is invisible, so the insert hits the key and the follow up
 * update changes nothing.
 */
export async function saveDevice(id: string, name: string, agentId?: string) {
  const db = supabase();
  const link = agentId ? { agent_id: agentId } : {};
  const { error } = await db.from("devices").insert({ id, name, ...link });
  if (!error) return;
  if (error.code !== "23505") throw error;
  const { data, error: updateError } = await db.from("devices").update({ name, ...link }).eq("id", id).select("id");
  if (updateError) throw updateError;
  if (!data?.length) throw new Error("This Autolab is linked to another account.");
}

export async function renameDevice(id: string, name: string) {
  const { error } = await supabase().from("devices").update({ name }).eq("id", id);
  if (error) throw error;
}

/** Calls back whenever one of this account's Autolabs changes. Returns the unsubscribe. */
export function watchDevices(onChange: () => void) {
  const channel = supabase()
    .channel("lab-devices")
    .on("postgres_changes", { event: "*", schema: "public", table: "devices" }, onChange)
    .subscribe();
  return () => void supabase().removeChannel(channel);
}
