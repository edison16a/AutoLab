"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { errorText } from "@/lib/errors";
import { SetupCancelled, useBluetoothSetup } from "./use-bluetooth-setup";
import { useDeviceLink } from "./use-device-link";
import { STEP, type SetupPath, type StepIndex } from "./wizard-steps";

/** What the Wi-Fi form sends to the Pi over Bluetooth. */
export interface WifiDetails {
  name: string;
  ssid: string;
  password: string;
  pin: string;
}

/** Closing the browser's device chooser is a choice, not an error worth a message. */
function isChooserCancel(error: unknown) {
  return error instanceof DOMException && error.name === "NotFoundError";
}

/**
 * The wizard's state machine: which step is showing, which way the Device
 * step connects, and the actions each step's buttons run. Ready is only
 * ever reached from a real heartbeat and camera, never from a button.
 */
export function useConnectFlow() {
  const link = useDeviceLink();
  const bluetooth = useBluetoothSetup(link.gateway);
  const [step, setStep] = useState<StepIndex>(STEP.camera);
  const [path, setPath] = useState<SetupPath>("bluetooth");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const { ready } = link;
  const { disconnect } = bluetooth;
  useEffect(() => {
    if (!ready) return;
    setStep(STEP.ready);
    setBusy(false);
    setMessage("");
    // Setup is over, so let the Pi's setup service go.
    disconnect();
  }, [ready, disconnect]);

  /** Runs one async action with the busy flag and error message handled. */
  const run = useCallback(async (action: () => Promise<void>) => {
    setBusy(true);
    setMessage("");
    try {
      await action();
    } catch (error) {
      if (alive.current && !(error instanceof SetupCancelled) && !isChooserCancel(error)) setMessage(errorText(error));
    } finally {
      if (alive.current) setBusy(false);
    }
  }, []);

  const goTo = useCallback((next: StepIndex) => {
    setMessage("");
    setStep(next);
  }, []);

  const { find, provision } = bluetooth;
  const findAutolab = useCallback(
    () =>
      run(async () => {
        await find();
        setPath("bluetooth");
        setStep(STEP.device);
      }),
    [run, find],
  );

  const { attach, follow, mode } = link;
  const sendWifi = useCallback(
    (details: WifiDetails) =>
      run(async () => {
        const result = await provision(details.ssid, details.password, details.pin);
        // An already claimed cloud device only needs adding to the list.
        if (mode === "cloud" && result.claimed) follow(result.deviceId, details.name);
        else await attach(result.deviceId, result.claimCode, details.name);
      }),
    [run, provision, mode, follow, attach],
  );

  const connectManually = useCallback(
    (idOrCode: string, name: string) =>
      run(() => (mode === "cloud" ? attach("", idOrCode, name) : attach(idOrCode, "", name))),
    [run, mode, attach],
  );

  const chooseManual = useCallback(() => {
    disconnect();
    setPath("manual");
    goTo(STEP.device);
  }, [disconnect, goTo]);

  const { stopWaiting } = link;
  const stop = useCallback(() => {
    stopWaiting();
    setMessage("Check that the Pi agent is running and sees its camera, then try again.");
  }, [stopWaiting]);

  const back = useCallback(() => {
    if (step === STEP.device) disconnect();
    goTo(Math.max(STEP.camera, step - 1) as StepIndex);
  }, [step, disconnect, goTo]);

  return {
    step,
    path,
    busy,
    waiting: link.waiting,
    message,
    mode,
    gateway: link.gateway,
    bluetoothSupported: bluetooth.supported,
    provisionState: bluetooth.status?.state ?? null,
    /** For the 3D stage: the Pi is on Wi-Fi, and it reached the gateway. */
    wifiLinked: link.online || ["wifi_connected", "gateway_connected"].includes(bluetooth.status?.state ?? ""),
    gatewayLinked: link.online || bluetooth.status?.state === "gateway_connected",
    goTo,
    back,
    findAutolab,
    sendWifi,
    connectManually,
    chooseManual,
    stopWaiting: stop,
  };
}

export type ConnectFlow = ReturnType<typeof useConnectFlow>;
