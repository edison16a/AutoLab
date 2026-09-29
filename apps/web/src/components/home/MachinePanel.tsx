"use client";
import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { MachineView } from "@/components/hardware/MachineView";
import { useWideLayout } from "@/components/hardware/use-wide-layout";
import { useAutolab } from "@/providers/autolab-context";

/**
 * The whole Autolab in 3D, the centrepiece of Home, running a looping
 * pipetting demo. The wheel zooms toward the pointer, hovering names a
 * part, and clicking one opens it on the Hardware screen, which reads
 * ?part= and flies straight to it.
 */
export function MachinePanel() {
  const router = useRouter();
  // The connect wizard covers Home and draws its own machine. Rendering both
  // at once doubles the GPU work, and on slow machines it stalls the page.
  const { connectOpen } = useAutolab();
  // A phone's narrow card has no slack, so the machine is drawn a little smaller there to keep off its edges.
  const fill = useWideLayout() ? 0.96 : 0.84;

  const openPart = useCallback((id: string) => router.push(`/hardware?part=${encodeURIComponent(id)}`), [router]);

  return (
    <section className="home-machine" aria-label="Machine">
      {connectOpen ? null : <MachineView onSelect={openPart} overviewFill={fill} demo />}
    </section>
  );
}
