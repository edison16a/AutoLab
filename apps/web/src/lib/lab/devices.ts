/**
 * Lab mode: the Autolabs this account owns, read and written straight to
 * Supabase. Row level security (supabase/migrations/002_lab_mode.sql) limits
 * every call to the signed in person's own rows.
 */
import { supabase } from "../cloud";
import type { Device, DeviceReport } from "@/model/types";

const COLUMNS = "id,name,status,camera_online,last_seen_at,simulated,agent_version";

interface DeviceRow {
  id: string;
  name: string;
  status: string;
  camera_online: boolean;
  last_seen_at: string | null;
  simulated: boolean;
  agent_version: string | null;
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
    },
  };
}

export async function listDevices(): Promise<Device[]> {
  const { data, error } = await supabase().from("devices").select(COLUMNS).order("created_at");
  if (error) throw error;
  return (data as DeviceRow[]).map(toDevice);
}

/**
 * Adds an Autolab to this account, or renames it if it's already ours. A
 * device id can only belong to one account: someone else's row is invisible,
 * so the insert hits the key and the follow up update changes nothing.
 */
export async function saveDevice(id: string, name: string) {
  const db = supabase();
  const { error } = await db.from("devices").insert({ id, name });
  if (!error) return;
  if (error.code !== "23505") throw error;
  const { data, error: renameError } = await db.from("devices").update({ name }).eq("id", id).select("id");
  if (renameError) throw renameError;
  if (!data?.length) throw new Error("This Autolab is linked to another account.");
}

export async function renameDevice(id: string, name: string) {
  const { error } = await supabase().from("devices").update({ name }).eq("id", id);
  if (error) throw error;
}

/** The lab computer's view of the Autolab, so remote screens can show it. */
export async function reportDevice(id: string, report: DeviceReport) {
  const { error } = await supabase()
    .from("devices")
    .update({
      status: report.online ? "online" : "offline",
      camera_online: report.camera_online,
      last_seen_at: report.last_seen,
      simulated: report.simulated,
      agent_version: report.agent_version ?? null,
    })
    .eq("id", id);
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
