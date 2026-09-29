"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Settings } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { Menu } from "../ui/Menu";

/** Avatar button with the account name, Settings and Sign out. */
export function AccountMenu() {
  const { user, mode, signOut } = useAuth();
  const router = useRouter();
  const initial = (user?.name || user?.email || "A").charAt(0).toUpperCase();

  return (
    <Menu
      label="Account"
      trigger={({ open, toggle }) => (
        <button type="button" className="avatar" aria-label="Account" aria-haspopup="menu" aria-expanded={open} onClick={toggle}>
          {initial}
        </button>
      )}
    >
      {(close) => (
        <>
          <div className="menu__header">
            <strong>{user?.name}</strong>
            <span className="muted small">{mode === "demo" ? "Demo account" : user?.email}</span>
          </div>
          <hr className="menu__divider" />
          <Link href="/settings" role="menuitem" className="menu__item" onClick={close}>
            <Settings size={14} aria-hidden="true" />
            Settings
          </Link>
          <button
            type="button"
            role="menuitem"
            className="menu__item"
            onClick={async () => {
              close();
              await signOut();
              router.replace("/login");
            }}
          >
            <LogOut size={14} aria-hidden="true" />
            Sign out
          </button>
        </>
      )}
    </Menu>
  );
}
