/**
 * Lab mode's action log in Supabase. Every command sent to an Autolab gets a
 * row. A photo command starts as pending and the Pi claims, runs and closes
 * it. Preview and analysis are logged as already done.
 */
import { supabase } from "../cloud";
import type { ActionEntry, ActionKind, ActionStatus } from "@/model/types";

const COLUMNS = "id,device_id,kind,status,error,image_id,created_at,completed_at";

export interface NewAction {
  device_id: string | null;
  kind: ActionKind;
  status: ActionStatus;
  payload?: Record<string, unknown>;
  image_id?: string | null;
}

/** Records an action and returns its row. The database stamps every time on it. */
export async function addAction(action: NewAction): Promise<ActionEntry> {
  const { data, error } = await supabase()
    .from("actions")
    .insert({ ...action, payload: action.payload ?? {} })
    .select(COLUMNS)
    .single();
  if (error) throw error;
  return data as ActionEntry;
}

/**
 * Expires a command nobody took. Only a row still pending changes, so a Pi
 * that took it a moment ago keeps it. Resolves false when it had moved on.
 */
export async function expirePending(id: string, error: string) {
  const { data, error: failure } = await supabase()
    .from("actions")
    .update({ status: "expired", error })
    .eq("id", id)
    .eq("status", "pending")
    .select("id");
  if (failure) throw failure;
  return !!data?.length;
}

/** The newest entries, for the activity list. */
export async function recentActions(limit = 30): Promise<ActionEntry[]> {
  const { data, error } = await supabase().from("actions").select(COLUMNS).order("created_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return data as ActionEntry[];
}

export async function getAction(id: string): Promise<ActionEntry | null> {
  const { data, error } = await supabase().from("actions").select(COLUMNS).eq("id", id).maybeSingle();
  if (error) throw error;
  return data as ActionEntry | null;
}

/** Calls back with every new or changed action this account can see. Returns the unsubscribe. */
export function watchActions(onChange: (entry: ActionEntry) => void) {
  const channel = supabase()
    .channel("lab-actions")
    .on("postgres_changes", { event: "*", schema: "public", table: "actions" }, (e) => {
      if (e.eventType !== "DELETE") onChange(e.new as ActionEntry);
    })
    .subscribe();
  return () => void supabase().removeChannel(channel);
}
