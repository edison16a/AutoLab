"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  BarChart3,
  Boxes,
  Check,
  ChevronDown,
  CircleAlert,
  CircleCheck,
  Home,
  Images,
  Info,
  LogOut,
  Plus,
  Settings,
  Video,
  X,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { useAutolab } from "@/components/providers/autolab-provider";
import { LogoMark, StatusDot, type Tone } from "@/components/ui/primitives";

const OnboardingWizard = dynamic(
  () => import("@/components/autolab-3d/onboarding/OnboardingWizard"),
  { ssr: false },
);

export const navigation = [
  { href: "/", label: "Home", icon: Home },
  { href: "/live", label: "Live view", short: "Live", icon: Video },
  { href: "/data", label: "Data", icon: Images },
  { href: "/statistics", label: "Statistics", short: "Stats", icon: BarChart3 },
  { href: "/hardware", label: "Hardware", icon: Boxes },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function useDeviceTone(): { tone: Tone; label: string } {
  const { device, connection, status } = useAutolab();
  if (!device) return { tone: "offline", label: "No device" };
  if (connection !== "connected")
    return { tone: "busy", label: connection === "reconnecting" ? "Reconnecting" : "Connecting" };
  if (!status.online) return { tone: "offline", label: "Offline" };
  if (!status.camera_online) return { tone: "warning", label: "Camera not detected" };
  return { tone: "online", label: status.simulated ? "Online · simulator" : "Online" };
}

function DeviceSwitcher() {
  const { devices, device, selectDevice, openConnect } = useAutolab(),
    { tone, label } = useDeviceTone(),
    [open, setOpen] = useState(false),
    root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !root.current?.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);
  if (!device)
    return (
      <button className="primary sm" onClick={openConnect}>
        <Plus size={15} />
        Connect device
      </button>
    );
  return (
    <div className="device-switcher" ref={root}>
      <button
        className="device-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <StatusDot tone={tone} pulse={tone === "online"} />
        <span className="device-trigger-name">{device.name}</span>
        <span className="device-trigger-state">{label}</span>
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="device-menu" role="menu">
          <div className="device-menu-label">Devices</div>
          {devices.map((d) => (
            <button
              key={d.id}
              role="menuitemradio"
              aria-checked={d.id === device.id}
              onClick={() => {
                selectDevice(d.id);
                setOpen(false);
              }}
            >
              <span>{d.name}</span>
              {d.id === device.id && <Check size={14} />}
            </button>
          ))}
          <div className="divider" />
          <button
            role="menuitem"
            onClick={() => {
              setOpen(false);
              openConnect();
            }}
          >
            <Plus size={14} />
            Connect device
          </button>
        </div>
      )}
    </div>
  );
}

function Toasts() {
  const { toasts, dismissToast } = useAutolab();
  if (!toasts.length) return null;
  return (
    <div className="toast-stack" aria-live="polite">
      {toasts.map((t) => {
        const Icon = t.kind === "error" ? CircleAlert : t.kind === "success" ? CircleCheck : Info;
        return (
          <div key={t.id} className={`toast ${t.kind}`} role={t.kind === "error" ? "alert" : "status"}>
            <Icon size={16} />
            <span>{t.text}</span>
            <button
              className="icon-button sm"
              aria-label="Dismiss notification"
              onClick={() => dismissToast(t.id)}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname(),
    router = useRouter(),
    { user, signOut } = useAuth(),
    { connectOpen, closeConnect, mode } = useAutolab();
  const initial = (user?.name || user?.email || "A").slice(0, 1).toUpperCase();
  return (
    <div className="app">
      <aside className="sidebar">
        <Link href="/" className="brand" aria-label="Autolab home">
          <LogoMark size={22} />
          <span>Autolab</span>
        </Link>
        <nav className="side-nav" aria-label="Main">
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={isActive(pathname, href) ? "active" : ""}
              aria-current={isActive(pathname, href) ? "page" : undefined}
            >
              <Icon size={17} strokeWidth={1.8} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-foot">
          <Link
            href="/settings"
            className={`side-link ${pathname.startsWith("/settings") ? "active" : ""}`}
            aria-current={pathname.startsWith("/settings") ? "page" : undefined}
          >
            <Settings size={17} strokeWidth={1.8} />
            Settings
          </Link>
          <div className="user-chip">
            <span className="avatar" aria-hidden="true">
              {initial}
            </span>
            <span className="user-text">
              <strong>{user?.name}</strong>
              <small>{mode === "demo" ? "Demo account" : user?.email}</small>
            </span>
            <button
              className="icon-button sm"
              aria-label="Sign out"
              title="Sign out"
              onClick={async () => {
                await signOut();
                router.replace("/login");
              }}
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <Link href="/" className="brand mobile-only" aria-label="Autolab home">
            <LogoMark size={20} />
          </Link>
          <div className="topbar-spacer" />
          <DeviceSwitcher />
          <Link href="/settings" className="button icon-button mobile-only" aria-label="Settings">
            <Settings size={17} />
          </Link>
        </header>
        <main className="content" id="content">
          {children}
        </main>
      </div>
      <nav className="tabbar" aria-label="Main">
        {navigation.map(({ href, label, short, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={isActive(pathname, href) ? "active" : ""}
            aria-current={isActive(pathname, href) ? "page" : undefined}
          >
            <Icon size={19} strokeWidth={1.8} />
            <span>{short || label}</span>
          </Link>
        ))}
      </nav>
      <Toasts />
      {connectOpen && <OnboardingWizard onClose={closeConnect} />}
    </div>
  );
}
