import { redirect } from "next/navigation";

// Earlier builds linked here. The hardware view now lives at /hardware.
export default function LegacyComponentsPage() {
  redirect("/hardware");
}
