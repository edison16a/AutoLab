"use client";
import { useTheme, type Theme } from "@/hooks/use-theme";
import { Tabs } from "../ui/Tabs";
import { SettingsRow, SettingsSection } from "./SettingsSection";

const THEMES: { id: Theme; label: string }[] = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
];

/** Light or dark. The choice is remembered by useTheme, so it sticks across visits. */
export function AppearanceSection() {
  const { theme, setTheme } = useTheme();
  return (
    <SettingsSection title="Appearance">
      <SettingsRow label="Theme">
        <Tabs items={THEMES} value={theme} onChange={setTheme} label="Theme" className="settings-theme" />
      </SettingsRow>
    </SettingsSection>
  );
}
