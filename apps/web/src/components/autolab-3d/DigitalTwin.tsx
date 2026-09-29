"use client";
import dynamic from "next/dynamic";
import { memo, useCallback, useState, type ReactNode } from "react";
import { Box, Camera, Layers, Link2, RotateCcw, Search, X } from "lucide-react";
import { autolabComponents, componentById } from "./registry/componentRegistry";
import {
  useAutolab3DState,
  type DeviceRealtimeState,
} from "./state/useAutolab3DState";
const Scene = dynamic(() => import("./AutolabScene"), {
  ssr: false,
  loading: () => <div className="scene-loading">Loading 3D workspace…</div>,
});
export default memo(function DigitalTwin({
  deviceId,
  status,
  connection,
  preview,
  lastCapture,
  capturing,
  onCapture,
  onLive,
  onSettings,
  livePanel,
  full = false,
}: {
  deviceId?: string;
  status: DeviceRealtimeState;
  connection: string;
  preview: boolean;
  lastCapture?: string;
  capturing: boolean;
  onCapture: () => void;
  onLive: () => void;
  onSettings: () => void;
  livePanel?: ReactNode;
  full?: boolean;
}) {
  const states = useAutolab3DState(
      deviceId,
      status,
      connection,
      preview,
      lastCapture,
    ),
    [selected, setSelected] = useState<string | null>(null),
    [isolated, setIsolated] = useState(false),
    [exploded, setExploded] = useState(false),
    [connections, setConnections] = useState(false),
    [reset, setReset] = useState(0),
    [search, setSearch] = useState(""),
    [showLive, setShowLive] = useState(false);
  const select = useCallback((id: string) => {
      setSelected(id);
      setIsolated(true);
    }, []),
    c = selected ? componentById[selected] : null,
    state = selected ? states[selected] : null;
  const matches = autolabComponents.filter((c) =>
    (c.name + " " + c.category + " " + c.shortName)
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <section
      className={`digital-twin ${full ? "twin-full" : ""}`}
      aria-label="Autolab digital twin"
    >
      <div className="twin-heading">
        <div>
          <h2>{c ? c.shortName : "Hardware"}</h2>
        </div>
      </div>
      <div className="twin-toolbar">
        <button
          onClick={() => {
            setSelected(null);
            setReset((v) => v + 1);
          }}
        >
          <RotateCcw size={14} />
          Reset view
        </button>
        <button aria-pressed={exploded} onClick={() => setExploded((v) => !v)}>
          <Layers size={14} />
          Exploded view
        </button>
        <button
          aria-pressed={connections}
          onClick={() => {
            setIsolated(false);
            setConnections((v) => !v);
          }}
        >
          <Link2 size={14} />
          Connections
        </button>
        {selected && (
          <button
            aria-pressed={isolated}
            onClick={() => setIsolated((v) => !v)}
          >
            <Box size={14} />
            Isolate part
          </button>
        )}
        <button
          className={showLive ? "active" : ""}
          onClick={() => {
            setShowLive((v) => !v);
            if (!showLive) onLive();
          }}
          disabled={!status.camera_online}
        >
          <Camera size={14} />
          {showLive ? "Hide live camera" : "Show live camera"}
        </button>
      </div>
      <div className={`twin-main ${selected ? "has-selection" : ""}`}>
        <div className="twin-canvas" data-testid="autolab-scene">
          <Scene
            states={states}
            selected={selected}
            isolated={isolated && !!selected}
            exploded={exploded}
            connections={connections}
            reset={reset}
            onSelect={select}
          />
          <div className="scene-caption">Drag to rotate. Scroll to zoom.</div>
        </div>
        {c && state && (
          <aside className="component-details" aria-label="Component details">
            <div className="component-detail-top">
              <span>{c.category}</span>
              <button
                className="icon-button"
                aria-label="Close component details"
                onClick={() => setSelected(null)}
              >
                <X size={17} />
              </button>
            </div>
            <h3>{c.name}</h3>
            <div
              className={`component-status ${state.online ? "is-online" : ""}`}
            >
              <span className={`dot ${state.online ? "green" : ""}`} />
              {state.status}
            </div>
            <p>{c.purpose}</p>
            <dl>
              <div>
                <dt>Connection</dt>
                <dd>{c.connection}</dd>
              </div>
              {state.lastUpdated && (
                <div>
                  <dt>Last heartbeat</dt>
                  <dd>{new Date(state.lastUpdated).toLocaleTimeString()}</dd>
                </div>
              )}
              {Object.entries(state.telemetry || {}).map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>
                    {typeof value === "boolean"
                      ? value
                        ? "Yes"
                        : "No"
                      : String(value)}
                  </dd>
                </div>
              ))}
            </dl>
            {c.id === "camera" ? (
              <div className="component-actions">
                <button
                  onClick={() => {
                    setShowLive(true);
                    onLive();
                  }}
                  disabled={!status.camera_online}
                >
                  <Camera size={15} />
                  Live view
                </button>
                <button
                  className="primary"
                  disabled={!status.camera_online || capturing}
                  onClick={onCapture}
                >
                  {capturing ? "Capturing…" : "Take photo"}
                </button>
              </div>
            ) : c.id === "raspberry_pi" ? (
              <button className="full" onClick={onSettings}>
                View device settings
              </button>
            ) : (
              <div className="not-installed">
                <strong>
                  {state.installed
                    ? "Hardware reported by agent"
                    : "No sensor readings available"}
                </strong>
                <p>
                  {state.installed
                    ? "Values appear only when reported by the device."
                    : "This component is shown in its planned location. Setup coming soon."}
                </p>
              </div>
            )}
          </aside>
        )}
      </div>
      {showLive && (
        <div className="twin-live-panel">
          <div className="panel-heading">
            <strong>Live camera</strong>
            <span>{preview ? "Preview active" : "Waiting for preview"}</span>
          </div>
          {livePanel || <p>Start the camera preview to see live images.</p>}
        </div>
      )}
      <div className="twin-status-strip">
        <span>
          <i className={`dot ${status.online ? "green" : ""}`} />
          Pi {status.online ? "online" : "offline"}
        </span>
        <span>
          <i className={`dot ${status.camera_online ? "green" : ""}`} />
          Camera {status.camera_online ? "connected" : "unavailable"}
        </span>
        <span>{status.simulated ? "Simulator session" : ""}</span>
      </div>
      <details className="components-browser" open={full}>
        <summary>
          Components <span>{autolabComponents.length}</span>
        </summary>
        <div className="component-list-heading">
          <h3>
            Components <span>{autolabComponents.length}</span>
          </h3>
          <label className="component-search">
            <Search size={15} />
            <input
              aria-label="Search components"
              placeholder="Search components"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        </div>
        <div
          className="component-list"
          role="list"
          aria-label="Hardware components"
        >
          {matches.map((part) => (
            <button
              role="listitem"
              aria-label={`Select ${part.name}`}
              key={part.id}
              aria-current={selected === part.id ? "true" : undefined}
              className={selected === part.id ? "selected" : ""}
              onClick={() => select(part.id)}
              data-component-id={part.id}
            >
              <span
                className={`dot ${states[part.id].online ? "green" : ""}`}
              />
              <span>
                <strong>{part.shortName}</strong>
                <small>{part.category}</small>
              </span>
              <em>{states[part.id].status}</em>
            </button>
          ))}
        </div>
        {!matches.length && (
          <p className="no-components">No matching components.</p>
        )}
      </details>
    </section>
  );
});
