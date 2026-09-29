import type { ReactNode } from "react";
import { AppFrame } from "@/components/shell/AppFrame";

/**
 * Every signed in screen. This layout stays mounted while moving between
 * them, so the device connection and the library are kept.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return <AppFrame>{children}</AppFrame>;
}
