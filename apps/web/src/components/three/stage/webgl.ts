"use client";
import { useEffect, useState } from "react";

// Probing creates a throwaway context, so do it once per page load.
let cached: boolean | null = null;

function probe(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    context?.getExtension("WEBGL_lose_context")?.loseContext();
    return !!context;
  } catch {
    return false;
  }
}

/** Null until checked in the browser, then whether WebGL can run at all. */
export function useWebGLSupport(): boolean | null {
  const [supported, setSupported] = useState<boolean | null>(cached);
  useEffect(() => {
    cached ??= probe();
    setSupported(cached);
  }, []);
  return supported;
}
