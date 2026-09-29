"use client";
import { useEffect, useState } from "react";

export interface WebGLInfo {
  /** WebGL2 works at all. Without it the 3D views show a sentence instead. */
  supported: boolean;
  /**
   * The browser draws with a software renderer (no usable GPU, a blocklisted
   * driver, a virtual machine, headless CI). Every frame then costs seconds
   * of CPU, so the stage drops its shadow passes to keep the page responsive.
   */
  software: boolean;
}

// Probing creates a throwaway context, so do it once per page load.
let cached: WebGLInfo | null = null;

const SOFTWARE = /swiftshader|llvmpipe|softpipe|software|basic render/i;

/**
 * Screenshots are rendered in software too, and want the full look. Setting
 * localStorage "autolab:render" to "full" skips the software fallback.
 */
function forcedFull() {
  try {
    return localStorage.getItem("autolab:render") === "full";
  } catch {
    return false;
  }
}

function probe(): WebGLInfo {
  try {
    const canvas = document.createElement("canvas");
    // three.js r163 and later need WebGL2, so a WebGL1 only browser gets the fallback.
    const context = canvas.getContext("webgl2");
    if (!context) return { supported: false, software: false };
    const debug = context.getExtension("WEBGL_debug_renderer_info");
    const renderer = String(context.getParameter(debug ? debug.UNMASKED_RENDERER_WEBGL : context.RENDERER) ?? "");
    context.getExtension("WEBGL_lose_context")?.loseContext();
    return { supported: true, software: SOFTWARE.test(renderer) && !forcedFull() };
  } catch {
    return { supported: false, software: false };
  }
}

/** Null until checked in the browser, then whether WebGL can run and how. */
export function useWebGLSupport(): WebGLInfo | null {
  const [info, setInfo] = useState<WebGLInfo | null>(cached);
  useEffect(() => {
    cached ??= probe();
    setInfo(cached);
  }, []);
  return info;
}
