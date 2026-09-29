"use client";
import "@/styles/live.css";
import "@/styles/live-stage.css";
import "@/styles/live-controls.css";
import { useState } from "react";
import { Tabs } from "../ui/Tabs";
import { AutolabCamera } from "./autolab/AutolabCamera";

type Source = "autolab" | "computer";

const SOURCES: { id: Source; label: string }[] = [
  { id: "autolab", label: "Autolab camera" },
  { id: "computer", label: "Computer camera" },
];

/**
 * Live camera workspace. Only the chosen source is mounted, so leaving the
 * Autolab tab stops its preview and leaving the computer tab releases the
 * webcam.
 */
export function LiveScreen() {
  const [source, setSource] = useState<Source>("autolab");

  return (
    <div className="workspace live">
      <Tabs className="live__tabs" label="Camera source" items={SOURCES} value={source} onChange={setSource} />
      {source === "autolab" ? <AutolabCamera /> : null}
    </div>
  );
}
