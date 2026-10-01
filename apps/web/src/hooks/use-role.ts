"use client";
/**
 * Lab mode: whether this browser is the station, the computer next to the
 * Autolab that holds the WebSocket, or a remote screen that sends commands
 * through Supabase. Remembered per account in this browser. Demo and cloud
 * screens always talk to the gateway directly.
 */
import { useCallback, useEffect, useState } from "react";
import { labEnabled } from "@/lib/cloud";
import { readSetting, STORAGE_KEYS, writeSetting } from "@/lib/storage/local-settings";
import type { Role } from "@/model/types";

export function useRole(userId: string) {
  const [station, setStationState] = useState(false);

  useEffect(() => {
    setStationState(readSetting<boolean>(STORAGE_KEYS.station(userId), false));
  }, [userId]);

  const setStation = useCallback(
    (on: boolean) => {
      setStationState(on);
      writeSetting(STORAGE_KEYS.station(userId), on || null);
    },
    [userId],
  );

  const role: Role = !labEnabled ? "direct" : station ? "station" : "remote";
  return { role, setStation };
}
