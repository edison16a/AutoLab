import type { Metadata } from "next";
import { DataScreen } from "@/components/data/DataScreen";

export const metadata: Metadata = { title: "Data" };

export default function Page() {
  return <DataScreen />;
}
