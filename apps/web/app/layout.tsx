import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { THEME_BOOT_SCRIPT } from "@/hooks/use-theme";
import { AuthProvider } from "@/providers/AuthProvider";
import "@/styles/tokens.css";
import "@/styles/base.css";
import "@/styles/controls.css";
import "@/styles/ui.css";
import "@/styles/feedback.css";
import "@/styles/shell.css";
import "@/styles/layout.css";

export const metadata: Metadata = {
  title: { default: "Autolab", template: "%s | Autolab" },
  description: "Watch, capture and analyze your Autolab camera from anywhere.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0b" },
  ],
};

/**
 * Shared by every route. The inline script applies the saved theme before
 * the first paint, so the page never flashes the wrong colours.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
