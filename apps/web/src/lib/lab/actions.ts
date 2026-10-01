/**
 * Lab mode's action log in Supabase. Every command sent to an Autolab gets a
 * row: the station logs what it does itself, and other screens add pending
 * rows that the station picks up, runs and closes.
 */
import { supabase } from "../cloud";
import type { ActionEntry, ActionKind, ActionStatus } from "@/model/types";

const COLUMNS = "id,device_id,kind,origin,status,error,image_id,created_at,completed_at";

export interface NewAction {
  device_id: string | null;
  kind: ActionKind;
  origin: ActionEntry["origin"];
  status: ActionStatus;
  payload?: Record<string, unknown>;
  image_id?: string | null;
  error?: string | null;
}

/** Records an action and returns its row. */
export async function addAction(action: NewAction): Promise<ActionEntry> {
  const now = new Date().toISOString();
  const finished = action.status === "done" || action.status === "failed";
  const { data, error } = await supabase()
    .from("actions")
    .insert({
      ...action,
      payload: action.payload ?? {},
      started_at: action.status === "pending" ? null : now,
      completed_at: finished ? now : null,
    })
    .select(COLUMNS)
    .single();
  if (error) throw error;
  return data as ActionEntry;
}

export interface ActionUpdate {
  status: ActionStatus;
  error?: string | null;
  image_id?: string | null;
  result?: Record<string, unknown>;
}

/** Moves an action on. Running stamps the start; every other state is an end. */
export async function updateAction(id: string, update: ActionUpdate) {
  const now = new Date().toISOString();
  const { error } = await supabase()
    .from("actions")
    .update({ ...update, ...(update.status === "running" ? { started_at: now } : { completed_at: now }) })
    .eq("id", id);
  if (error) throw error;
}

/** The newest entries, for the activity list. */
export async function recentActions(limit = 30): Promise<ActionEntry[]> {
  const { data, error } = await supabase().from("actions").select(COLUMNS).order("created_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return data as ActionEntry[];
}

/** Commands other screens left for this Autolab that nobody has picked up yet, oldest first. */
export async function pendingActions(deviceId: string): Promise<ActionEntry[]> {
  const { data, error } = await supabase()
    .from("actions")
    .select(COLUMNS)
    .eq("device_id", deviceId)
    .eq("status", "pending")
    .order("created_at");
  if (error) throw error;
  return data as ActionEntry[];
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
