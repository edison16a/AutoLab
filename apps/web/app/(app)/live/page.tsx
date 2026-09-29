import type { Metadata } from "next";
import { LiveScreen } from "@/components/live/LiveScreen";

export const metadata: Metadata = { title: "Live" };

export default function Page() {
  return <LiveScreen />;
}
