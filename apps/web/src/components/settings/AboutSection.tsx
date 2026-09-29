"use client";
import { useAutolab } from "@/providers/autolab-context";
import { SettingsRow, SettingsSection } from "./SettingsSection";

/** Read only facts that help when something looks off: the mode and the detector. */
export function AboutSection() {
  const { mode, detectorStatus } = useAutolab();
  return (
    <SettingsSection title="About">
      <SettingsRow label="Mode">
        <span className="settings-row__value">{mode === "demo" ? "Demo" : "Cloud"}</span>
      </SettingsRow>
      <SettingsRow label="Object detector">
        <span className="settings-row__value" aria-live="polite">
          {detectorStatus}
        </span>
      </SettingsRow>
    </SettingsSection>
  );
}
