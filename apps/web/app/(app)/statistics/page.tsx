import type { Metadata } from "next";
import { StatsScreen } from "@/components/stats/StatsScreen";

export const metadata: Metadata = { title: "Statistics" };

export default function Page() {
  return <StatsScreen />;
}
