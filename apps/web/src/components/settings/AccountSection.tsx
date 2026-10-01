"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { MODE_LABEL } from "@/lib/cloud";
import { errorText } from "@/lib/errors";
import { useAuth } from "@/providers/AuthProvider";
import { useAutolab } from "@/providers/autolab-context";
import { SettingsSection } from "./SettingsSection";

/** Who is signed in, which mode the app runs in, and the way out. */
export function AccountSection() {
  const { user, mode, signOut } = useAuth();
  const { notify } = useAutolab();
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  const name = user?.name || user?.email || "Account";
  // The demo account uses its username for both, so only show the second line when it adds something.
  const email = user?.email && user.email !== name ? user.email : null;

  async function leave() {
    setLeaving(true);
    try {
      await signOut();
      router.replace("/login");
    } catch (error) {
      notify(errorText(error), "error");
      setLeaving(false);
    }
  }

  return (
    <SettingsSection title="Account">
      <div className="settings-row settings-account">
        <span className="settings-account__avatar" aria-hidden="true">
          {name.charAt(0).toUpperCase()}
        </span>
        <div className="settings-account__who">
          <span className="settings-account__name">
            <span className="settings-account__text">{name}</span>
            <span className="badge">{MODE_LABEL[mode]}</span>
          </span>
          {email ? <span className="settings-row__hint">{email}</span> : null}
        </div>
        <button type="button" className="btn btn--sm" onClick={() => void leave()} disabled={leaving}>
          <LogOut size={16} strokeWidth={1.8} aria-hidden="true" />
          Sign out
        </button>
      </div>
    </SettingsSection>
  );
}
