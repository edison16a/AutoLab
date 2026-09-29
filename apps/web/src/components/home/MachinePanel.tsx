"use client";
import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { MachineView } from "@/components/hardware/MachineView";

/**
 * The whole Autolab in 3D, the centrepiece of Home. The wheel zooms toward
 * the pointer, hovering names a part, and clicking one opens it on the
 * Hardware screen, which reads ?part= and flies straight to it.
 */
export function MachinePanel() {
  const router = useRouter();

  const openPart = useCallback((id: string) => router.push(`/hardware?part=${encodeURIComponent(id)}`), [router]);

  return (
    <section className="home-machine" aria-label="Machine">
      <MachineView onSelect={openPart} overviewFill={0.96} />
    </section>
  );
}
