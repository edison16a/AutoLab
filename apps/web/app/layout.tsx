import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Autolab | Remote imaging",
  description:
    "Your laboratory, connected. Remote Raspberry Pi imaging and computer vision.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
