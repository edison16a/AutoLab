import type { Metadata } from "next";
import { HomeScreen } from "@/components/home/HomeScreen";

export const metadata: Metadata = { title: "Home" };

export default function Page() {
  return <HomeScreen />;
}
