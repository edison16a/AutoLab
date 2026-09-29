import type { Metadata } from "next";
import { ImageScreen } from "@/components/data/ImageScreen";

export const metadata: Metadata = { title: "Image" };

export default function Page() {
  return <ImageScreen />;
}
