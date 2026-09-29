"use client";
import "@/styles/settings.css";
import "@/styles/settings-devices.css";
import { PageHeader } from "../ui/PageHeader";
import { AboutSection } from "./AboutSection";
import { AccountSection } from "./AccountSection";
import { AppearanceSection } from "./AppearanceSection";
import { ConnectionSection } from "./connection/ConnectionSection";
import { DevicesSection } from "./devices/DevicesSection";
import { StorageSection } from "./StorageSection";

/** Account, theme, devices, gateway and storage, grouped in one narrow column. */
export function SettingsScreen() {
  return (
    <div className="page">
      <div className="settings">
        <PageHeader title="Settings" />
        <AccountSection />
        <AppearanceSection />
        <DevicesSection />
        <ConnectionSection />
        <StorageSection />
        <AboutSection />
      </div>
    </div>
  );
}
