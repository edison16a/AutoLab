"use client";
import { useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { MachineView } from "@/components/hardware/MachineView";
import { usePageWheel } from "./use-page-wheel";

/**
 * The whole Autolab in 3D, the centrepiece of Home. Hovering names a part
 * and clicking one opens it on the Hardware screen, which reads ?part= and
 * flies straight to it.
 */
export function MachinePanel() {
  const router = useRouter();
  const panel = useRef<HTMLElement>(null);
  usePageWheel(panel);

  const openPart = useCallback((id: string) => router.push(`/hardware?part=${encodeURIComponent(id)}`), [router]);

  return (
    <section ref={panel} className="home-machine" aria-label="Machine">
      <MachineView onSelect={openPart} />
      <Link href="/hardware" className="btn btn--sm home-machine__open">
        Open hardware
        <ArrowUpRight size={16} strokeWidth={1.8} aria-hidden="true" />
      </Link>
    </section>
  );
}
