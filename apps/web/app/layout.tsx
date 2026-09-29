import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { AuthProvider } from "@/components/providers/auth-provider";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/shell.css";
import "./styles/auth.css";
import "./styles/home.css";
import "./styles/live.css";
import "./styles/data.css";
import "./styles/stats.css";
import "./styles/hardware.css";
import "./styles/onboarding.css";
import "./styles/settings.css";

export const metadata: Metadata = {
  title: { default: "Autolab", template: "%s · Autolab" },
  description: "Remote imaging for your Autolab.",
};

export const viewport: Viewport = {
  themeColor: "#05070A",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
