"use client";
import { useLayoutEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3, type Group } from "three";
import type { Vec3 } from "../types";

export interface SceneLabelProps {
  text: string;
  /** Anchor point relative to the parent. The label sits just above it. */
  position?: Vec3;
  /** Accent marks the selected part. Quiet is for connection names. */
  tone?: "plain" | "accent" | "quiet";
  /** Pixels between the anchor and the bottom of the label. */
  offset?: number;
}

/**
 * A small HTML pill pinned to a point in the scene. It's one plain DOM node
 * placed with a transform each rendered frame, rather than a React portal
 * per label, so labels appear and disappear in step with the canvas and
 * never outlive it. Text stays crisp at any zoom.
 */
export function SceneLabel({ text, position, tone = "plain", offset = 10 }: SceneLabelProps) {
  const anchor = useRef<Group>(null);
  const node = useRef<HTMLDivElement | null>(null);
  const gl = useThree((state) => state.gl);
  const invalidate = useThree((state) => state.invalidate);
  const point = useRef(new Vector3());

  useLayoutEffect(() => {
    const element = document.createElement("div");
    element.setAttribute("aria-hidden", "true");
    element.style.visibility = "hidden";
    gl.domElement.parentElement?.append(element);
    node.current = element;
    invalidate();
    return () => {
      node.current = null;
      element.remove();
    };
  }, [gl, invalidate]);

  useLayoutEffect(() => {
    const element = node.current;
    if (!element) return;
    element.className = `stage3d-label stage3d-label--${tone}`;
    element.textContent = text;
    invalidate();
  }, [text, tone, invalidate]);

  useFrame(({ camera, size }) => {
    const element = node.current;
    if (!anchor.current || !element) return;
    const p = anchor.current.getWorldPosition(point.current).project(camera);
    const behind = p.z < -1 || p.z > 1;
    element.style.visibility = behind ? "hidden" : "visible";
    if (behind) return;
    const x = ((p.x + 1) * size.width) / 2;
    const y = ((1 - p.y) * size.height) / 2;
    element.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, calc(-100% - ${offset}px))`;
  });

  return <group ref={anchor} position={position} />;
}
