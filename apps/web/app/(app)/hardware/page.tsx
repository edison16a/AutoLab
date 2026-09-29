import type { Metadata } from "next";
import { HardwareScreen } from "@/components/hardware/HardwareScreen";

export const metadata: Metadata = { title: "Hardware" };

export default function Page() {
  return <HardwareScreen />;
}
