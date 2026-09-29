import AppFrame from "@/components/shell/app-frame";

// Stays mounted across app routes, so the device connection and library persist while navigating.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppFrame>{children}</AppFrame>;
}
