"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Bluetooth,
  Check,
  LoaderCircle,
  RotateCcw,
  Wifi,
  X,
} from "lucide-react";
import {
  AutolabBluetooth,
  type ProvisionStatus,
} from "@/lib/provisioning/bluetooth";
import { api, cloudEnabled } from "@/lib/cloud";
const Assembly = dynamic(() => import("./AssemblyAnimations"), {
  ssr: false,
  loading: () => <div className="scene-loading">Loading assembly guide…</div>,
});
const titles = [
  "Connect the camera",
  "Power on your Autolab",
  "Find your Autolab",
  "Connect to your network",
  "Your Autolab is ready",
];
export default function OnboardingWizard({
  gateway,
  onClose,
  onConnect,
  online,
  cameraOnline,
  deviceId,
}: {
  gateway: string;
  onClose: () => void;
  onConnect: (id: string, name: string) => Promise<void>;
  online: boolean;
  cameraOnline: boolean;
  deviceId?: string;
}) {
  const [step, setStep] = useState(0),
    [replay, setReplay] = useState(0),
    [manual, setManual] = useState(false),
    [supported, setSupported] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [bleStatus, setBleStatus] = useState<ProvisionStatus | null>(null),
    [id, setId] = useState(""),
    [name, setName] = useState("Neurotech Autolab"),
    [code, setCode] = useState(""),
    [ssid, setSsid] = useState(""),
    [password, setPassword] = useState(""),
    [pin, setPin] = useState(""),
    [waiting, setWaiting] = useState(false);
  const bluetooth = useRef(new AutolabBluetooth()),
    alive = useRef(true),
    polling = useRef(false),
    returnFocus = useRef<HTMLElement | null>(null),
    dialog = useRef<HTMLElement>(null);
  useEffect(() => {
    alive.current = true;
    returnFocus.current = document.activeElement as HTMLElement;
    setSupported(!!navigator.bluetooth && window.isSecureContext);
    dialog.current?.focus();
    return () => {
      alive.current = false;
      polling.current = false;
      bluetooth.current.disconnect();
      returnFocus.current?.focus();
    };
  }, []);
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const items = Array.from(
          dialog.current?.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input, a[href], [tabindex="0"]',
          ) || [],
        );
        const first = items[0],
          last = items.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    }
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [onClose]);
  useEffect(() => {
    if (waiting && online && cameraOnline && deviceId === id) {
      setWaiting(false);
      setStep(4);
      setBusy(false);
      bluetooth.current.disconnect();
    }
  }, [waiting, online, cameraOnline, deviceId, id]);
  async function find() {
    setBusy(true);
    setMessage("");
    try {
      const result = await bluetooth.current.connect();
      if (!alive.current) return;
      setBleStatus(result);
      setId(result.device_id || "");
      setStep(3);
    } catch (e) {
      if (alive.current)
        setMessage(
          e instanceof Error ? e.message : "Bluetooth connection failed",
        );
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  async function attach(target: string, claim: string) {
    let next = target;
    if (cloudEnabled) {
      if (!/^\d{6}$/.test(claim))
        throw new Error("Enter the six-digit claim code from your agent.");
      const result = await api(gateway, "/devices/claim", "POST", {
        code: claim,
        name,
      });
      next = result.device_id;
    }
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        next,
      )
    )
      throw new Error("Paste the complete Device ID printed by the Pi agent.");
    setId(next);
    await onConnect(next, name);
    setWaiting(true);
    setMessage("Waiting for a real Pi heartbeat and camera detection…");
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      if (manual) {
        await attach(id, code);
        return;
      }
      await bluetooth.current.provision(ssid, password, pin);
      setPassword("");
      setPin("");
      polling.current = true;
      const started = Date.now();
      while (
        alive.current &&
        polling.current &&
        Date.now() - started < 100000
      ) {
        await new Promise((r) => setTimeout(r, 1500));
        if (!alive.current || !polling.current) return;
        const result = await bluetooth.current.read();
        setBleStatus(result);
        if (result.state === "error")
          throw new Error(result.message || "Wi-Fi setup failed");
        if (result.state === "gateway_connected") {
          polling.current = false;
          if (result.mode !== (cloudEnabled ? "cloud" : "demo"))
            throw new Error(
              "Pi and web app modes differ. Update the Pi configuration.",
            );
          if (cloudEnabled && result.claimed) {
            await onConnect(result.device_id!, name);
            setId(result.device_id!);
            setWaiting(true);
          } else await attach(result.device_id!, result.claim_code || "");
          return;
        }
      }
      if (alive.current)
        throw new Error(
          "Provisioning timed out. Check the Pi terminal, then retry or use manual setup.",
        );
    } catch (e) {
      if (alive.current) setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      polling.current = false;
      if (alive.current) setBusy(false);
    }
  }
  return (
    <div className="modal-backdrop onboarding-backdrop">
      <section
        className="onboarding-wizard"
        ref={dialog}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
      >
        <header>
          <span className="eyebrow">Connect device</span>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Close setup"
          >
            <X size={20} />
          </button>
        </header>
        <div
          className="onboarding-progress"
          aria-label={`Step ${step + 1} of 5`}
        >
          {titles.map((title, i) => (
            <span
              key={title}
              className={i === step ? "current" : i < step ? "complete" : ""}
            >
              {i < step ? <Check size={12} /> : i + 1}
              <em>{["Camera", "Power", "Discover", "Network", "Ready"][i]}</em>
            </span>
          ))}
        </div>
        <div className="onboarding-body">
          <div className="onboarding-scene">
            <Assembly
              key={`${step}-${replay}`}
              step={step}
              bluetoothConnected={!!bleStatus}
              wifiConnected={["wifi_connected", "gateway_connected"].includes(
                bleStatus?.state || "",
              )}
              gatewayConnected={bleStatus?.state === "gateway_connected"}
            />
            <span className="illustration-note">
              Assembly illustration. Follow your board’s connector labels.
            </span>
            <button
              aria-label="Replay animation"
              className="replay-animation"
              onClick={() => setReplay((v) => v + 1)}
            >
              <RotateCcw size={14} />
            </button>
          </div>
          <div className="onboarding-copy">
            <span className="step-number">
              STEP {String(step + 1).padStart(2, "0")}
            </span>
            <h2 id="onboarding-title">{titles[step]}</h2>
            {step === 0 && (
              <>
                <p>Seat the camera ribbon before applying power.</p>
                <ol>
                  <li>Make sure the Raspberry Pi is powered off.</li>
                  <li>
                    Connect the RP camera using the HBv RPi 160 FPC ribbon and
                    the <strong>CSI camera connector</strong>, not the display
                    connector.
                  </li>
                  <li>
                    Align the exposed contacts with the connector contacts and
                    fully seat both ends.
                  </li>
                  <li>Close both retaining clips gently.</li>
                </ol>
                <button className="primary full" onClick={() => setStep(1)}>
                  Camera connected
                </button>
              </>
            )}
            {step === 1 && (
              <>
                <p>
                  Plug the Raspberry Pi into power using the{" "}
                  <strong>USB-C power port</strong> and its power adapter.
                </p>
                <div className="onboarding-note">
                  You do not need to connect the Raspberry Pi to your computer
                  with a cable.
                </div>
                <p>
                  The browser communicates over the internet once setup is
                  complete. Bluetooth is optional for Wi-Fi setup.
                </p>
                <button className="primary full" onClick={() => setStep(2)}>
                  Raspberry Pi is powered on
                </button>
              </>
            )}
            {step === 2 && (
              <>
                <p>
                  Start the optional provisioning service on your Pi, then
                  select it from your browser’s Bluetooth chooser.
                </p>
                <p className="muted">
                  The service must already be installed. Its terminal displays a
                  short-lived setup PIN. Bluetooth is used only during setup.
                </p>
                {!supported && (
                  <div className="onboarding-note">
                    Web Bluetooth is unavailable here. Use manual Wi-Fi setup,
                    or a supported browser on HTTPS.
                  </div>
                )}
                <button
                  className="primary full"
                  disabled={!supported || busy}
                  onClick={find}
                >
                  {busy ? (
                    <LoaderCircle className="spin" size={16} />
                  ) : (
                    <Bluetooth size={16} />
                  )}
                  Find Autolab
                </button>
                <button
                  className="full"
                  onClick={() => {
                    setManual(true);
                    setStep(3);
                  }}
                >
                  Use manual Wi-Fi setup
                </button>
              </>
            )}
            {step === 3 && (
              <form onSubmit={submit}>
                <p>
                  {manual
                    ? "Configure Wi-Fi in Raspberry Pi Imager or over SSH, then run the camera agent. Paste its details below."
                    : "Send your Wi-Fi settings directly to the nearby Pi over encrypted Bluetooth."}
                </p>
                <label>
                  Device name
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={80}
                    required
                    disabled={busy}
                  />
                </label>
                {manual ? (
                  <>
                    {cloudEnabled ? (
                      <label>
                        Six-digit claim code
                        <input
                          value={code}
                          onChange={(e) => setCode(e.target.value)}
                          inputMode="numeric"
                          pattern="[0-9]{6}"
                          maxLength={6}
                          required
                        />
                      </label>
                    ) : (
                      <label>
                        Device ID
                        <input
                          value={id}
                          onChange={(e) => setId(e.target.value)}
                          placeholder="UUID from the Pi agent"
                          required
                        />
                      </label>
                    )}
                    <details>
                      <summary>Manual setup commands</summary>
                      <pre>{`cd AutoLab/devices/raspberry-pi\nsource .venv/bin/activate\npython -m autolab_agent.main --gateway ${gateway}`}</pre>
                      <p>
                        Use Raspberry Pi Imager to set Wi-Fi before flashing, or
                        configure the network with <code>sudo nmtui</code> over
                        SSH. Add <code>--simulate</code> only when testing
                        without a camera.
                      </p>
                    </details>
                  </>
                ) : (
                  <>
                    <label>
                      Wi-Fi network name
                      <input
                        value={ssid}
                        onChange={(e) => setSsid(e.target.value)}
                        maxLength={32}
                        required
                        autoComplete="off"
                        disabled={busy}
                      />
                    </label>
                    <label>
                      Wi-Fi password
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        minLength={8}
                        maxLength={63}
                        required
                        autoComplete="new-password"
                        disabled={busy}
                      />
                    </label>
                    <label>
                      Setup PIN from the Pi terminal
                      <input
                        type="password"
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        inputMode="numeric"
                        pattern="[0-9]{6}"
                        maxLength={6}
                        required
                        autoComplete="off"
                        disabled={busy}
                      />
                    </label>
                    <div className="provision-state">
                      <Wifi size={14} />
                      {bleStatus?.state?.replaceAll("_", " ")}
                    </div>
                  </>
                )}
                <button className="primary full" disabled={busy || waiting}>
                  {busy || waiting ? (
                    <LoaderCircle className="spin" size={15} />
                  ) : (
                    <Wifi size={15} />
                  )}{" "}
                  {waiting
                    ? "Waiting for Pi and camera"
                    : manual
                      ? "Connect device"
                      : "Connect Wi-Fi"}
                </button>
                {waiting && (
                  <button
                    type="button"
                    className="full"
                    onClick={() => {
                      setWaiting(false);
                      setBusy(false);
                      setMessage(
                        "Confirm the agent is running, the camera is detected, and the gateway URL matches. Then retry.",
                      );
                    }}
                  >
                    Stop waiting and review setup
                  </button>
                )}
                {!manual && (
                  <button
                    type="button"
                    className="full"
                    disabled={busy}
                    onClick={() => {
                      bluetooth.current.disconnect();
                      setManual(true);
                      setBleStatus(null);
                    }}
                  >
                    Use manual setup instead
                  </button>
                )}
              </form>
            )}
            {step === 4 && (
              <>
                <p>
                  Your Raspberry Pi is online and its camera is detected. Open
                  your workspace to explore the machine and take a photo.
                </p>
                <div className="ready-checks">
                  <span>
                    <Check size={16} />
                    Pi heartbeat received
                  </span>
                  <span>
                    <Check size={16} />
                    Camera detected
                  </span>
                  <span>Future sensors: not installed</span>
                </div>
                <button className="primary full" onClick={onClose}>
                  Open Autolab
                </button>
              </>
            )}
            {message && (
              <p role="status" className="onboarding-message">
                {message}
              </p>
            )}
            {step > 0 && step < 4 && !busy && !waiting && (
              <button
                className="onboarding-back"
                onClick={() => setStep(step - 1)}
              >
                <ArrowLeft size={14} />
                Back
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
