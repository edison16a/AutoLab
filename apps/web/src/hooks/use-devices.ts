"use client";
/**
 * The Autolabs this person can use and which one is selected. In demo mode
 * the list lives in localStorage. In cloud mode the gateway returns the
 * devices this account has claimed, and renames go through it.
 */
import { useCallback, useEffect, useState } from "react";
import { api, cloudEnabled } from "@/lib/cloud";
import { errorText } from "@/lib/errors";
import { readSetting, STORAGE_KEYS, writeSetting } from "@/lib/storage/local-settings";
import type { Device } from "@/model/types";
import type { Notify } from "./use-notices";

/** Build time default. People can point the app somewhere else in Settings. */
export const DEFAULT_GATEWAY = (process.env.NEXT_PUBLIC_GATEWAY_URL || "ws://localhost:8000").replace(/\/$/, "");

export function useDevices(userId: string, notify: Notify) {
  const [gateway, setGatewayState] = useState(DEFAULT_GATEWAY);
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  // Until the list arrives we can't tell a stale selection from a pending one.
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const saved = readSetting<string | null>(STORAGE_KEYS.gateway, null);
    if (saved) setGatewayState(saved);
    setSelectedId(readSetting<string | null>(STORAGE_KEYS.selected(userId), null));
    if (cloudEnabled) return;
    setDevices(readSetting<Device[]>(STORAGE_KEYS.devices(userId), []));
    setLoaded(true);
  }, [userId]);

  useEffect(() => {
    if (!cloudEnabled) return;
    let cancelled = false;
    api(gateway, "/devices")
      .then((rows: Device[]) => {
        if (cancelled) return;
        setDevices(rows.map(({ id, name }) => ({ id, name })));
        setLoaded(true);
      })
      .catch((error) => !cancelled && notify(errorText(error), "error"));
    return () => {
      cancelled = true;
    };
  }, [gateway, userId, reload, notify]);

  // Fall back to the first device when the saved selection is gone.
  useEffect(() => {
    if (loaded && !devices.some((d) => d.id === selectedId)) setSelectedId(devices[0]?.id ?? null);
  }, [loaded, devices, selectedId]);

  /** Applies a change to the list and, in demo mode, remembers it. */
  const update = useCallback(
    (change: (list: Device[]) => Device[]) =>
      setDevices((list) => {
        const next = change(list);
        if (!cloudEnabled) writeSetting(STORAGE_KEYS.devices(userId), next);
        return next;
      }),
    [userId],
  );

  const selectDevice = useCallback(
    (id: string) => {
      setSelectedId(id);
      writeSetting(STORAGE_KEYS.selected(userId), id);
    },
    [userId],
  );

  const addDevice = useCallback(
    (id: string, name: string) => {
      update((list) => [...list.filter((d) => d.id !== id), { id, name: name.trim() || "My Autolab" }]);
      selectDevice(id);
    },
    [update, selectDevice],
  );

  const renameDevice = useCallback(
    async (id: string, name: string) => {
      const clean = name.trim();
      if (!clean) return;
      if (cloudEnabled) await api(gateway, `/devices/${id}`, "PATCH", { name: clean });
      update((list) => list.map((d) => (d.id === id ? { ...d, name: clean } : d)));
    },
    [gateway, update],
  );

  /** Demo only. Cloud devices stay claimed by the account. */
  const forgetDevice = useCallback((id: string) => update((list) => list.filter((d) => d.id !== id)), [update]);

  const setGateway = useCallback((url: string) => {
    const clean = url.trim().replace(/\/$/, "");
    setGatewayState(clean);
    writeSetting(STORAGE_KEYS.gateway, clean === DEFAULT_GATEWAY ? null : clean);
  }, []);

  return {
    gateway,
    setGateway,
    devices,
    device: devices.find((d) => d.id === selectedId) ?? null,
    selectDevice,
    addDevice,
    renameDevice,
    forgetDevice,
    reloadDevices: useCallback(() => setReload((v) => v + 1), []),
  };
}
