"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { gatewayMode } from "@/lib/cloud";
import { AutolabBluetooth, type ProvisionStatus } from "@/lib/provisioning/bluetooth";
import { piGateway } from "@/lib/provisioning/pi-gateway";

/** How often to ask the Pi how Wi-Fi is going, and when to give up. */
const POLL_MS = 1500;
const TIMEOUT_MS = 100_000;

/** Thrown when the wizard closes mid-setup, so callers can stay quiet about it. */
export class SetupCancelled extends Error {
  constructor() {
    super("Setup was closed");
  }
}

/** The Pi finished joining Wi-Fi and reached the gateway. */
export interface GatewayResult {
  deviceId: string;
  /** Cloud mode only, when the Pi still needs claiming by this account. */
  claimCode: string;
  claimed: boolean;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Web Bluetooth setup: find the Pi's provisioning service, send it the
 * Wi-Fi details, setup PIN and this app's gateway, then poll until the Pi
 * reports it reached that gateway.
 * Nothing sent here is stored. The connection closes when the wizard does.
 */
export function useBluetoothSetup(gateway: string) {
  const bluetooth = useRef<AutolabBluetooth | null>(null);
  const alive = useRef(true);
  // null until checked on the client, so the first render never guesses.
  const [supported, setSupported] = useState<boolean | null>(null);
  const [status, setStatus] = useState<ProvisionStatus | null>(null);

  useEffect(() => {
    alive.current = true;
    setSupported(typeof navigator !== "undefined" && !!navigator.bluetooth && window.isSecureContext);
    return () => {
      alive.current = false;
      bluetooth.current?.disconnect();
      bluetooth.current = null;
    };
  }, []);

  const guard = useCallback(() => {
    if (!alive.current) throw new SetupCancelled();
  }, []);

  /** Opens the browser's device chooser. Must run straight from a click. */
  const find = useCallback(async () => {
    bluetooth.current?.disconnect();
    const link = new AutolabBluetooth();
    bluetooth.current = link;
    const first = await link.connect();
    guard();
    setStatus(first);
    return first;
  }, [guard]);

  /** Sends the Wi-Fi details, then waits for the Pi to reach the gateway. */
  const provision = useCallback(
    async (ssid: string, password: string, pin: string): Promise<GatewayResult> => {
      const link = bluetooth.current;
      if (!link) throw new Error("Bluetooth is disconnected. Select Find Autolab again.");
      const target = await piGateway(gateway);
      guard();
      await link.provision(ssid, password, pin, target);
      const started = Date.now();
      while (Date.now() - started < TIMEOUT_MS) {
        await wait(POLL_MS);
        guard();
        const next = await link.read();
        guard();
        setStatus(next);
        if (next.state === "error") throw new Error(next.message || "The Pi couldn't join Wi-Fi.");
        if (next.state !== "gateway_connected") continue;
        if (next.mode !== gatewayMode) throw new Error(`The Pi and this app run in different modes. Set the Pi to ${gatewayMode} mode.`);
        if (!next.device_id) throw new Error("The Pi didn't report its Device ID.");
        return { deviceId: next.device_id, claimCode: next.claim_code ?? "", claimed: !!next.claimed };
      }
      throw new Error("The Pi took too long to connect. Check it, then try again or use manual setup.");
    },
    [guard, gateway],
  );

  const disconnect = useCallback(() => {
    bluetooth.current?.disconnect();
    bluetooth.current = null;
    setStatus(null);
  }, []);

  return { supported, status, find, provision, disconnect };
}
