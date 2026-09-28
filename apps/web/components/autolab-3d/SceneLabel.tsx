import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Group, Vector3 } from "three";
import type { Vec3 } from "./registry/componentRegistry";

/** Lightweight projected text, with one DOM owner and synchronous cleanup.
 * Avoids separate React roots racing when an animated Canvas is replaced.
 */
export default function SceneLabel({
  position = [0, 0, 0],
  text,
  detail,
  className,
}: {
  position?: Vec3;
  text: string;
  detail?: string;
  className: string;
}) {
  const group = useRef<Group>(null);
  const element = useRef<HTMLDivElement | null>(null);
  const point = useMemo(() => new Vector3(), []);
  const { gl, invalidate } = useThree();
  useLayoutEffect(() => {
    const node = document.createElement("div");
    node.className = className;
    Object.assign(node.style, {
      position: "absolute",
      top: "0",
      left: "0",
      pointerEvents: "none",
      zIndex: "3",
      whiteSpace: "pre-line",
      visibility: "hidden",
    });
    if (detail !== undefined) {
      const title = document.createElement("strong");
      title.textContent = text;
      const subtitle = document.createElement("span");
      subtitle.textContent = detail;
      node.append(title, subtitle);
    } else node.textContent = text;
    gl.domElement.parentElement?.append(node);
    element.current = node;
    invalidate();
    return () => {
      element.current = null;
      node.remove();
    };
  }, [gl, text, detail, className, invalidate]);
  useFrame(({ camera, size }) => {
    if (!group.current || !element.current) return;
    group.current.getWorldPosition(point).project(camera);
    const node = element.current;
    node.style.visibility = point.z < -1 || point.z > 1 ? "hidden" : "visible";
    node.style.transform = `translate(${((point.x + 1) * size.width) / 2}px, ${((1 - point.y) * size.height) / 2}px) translate(-50%, -50%)`;
  });
  return <group ref={group} position={position} />;
}
