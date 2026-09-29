"use client";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { IconButton } from "./IconButton";

/** Switches between light and dark mode. */
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === "dark";
  return (
    <IconButton
      icon={dark ? Sun : Moon}
      label={dark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggleTheme}
    />
  );
}
