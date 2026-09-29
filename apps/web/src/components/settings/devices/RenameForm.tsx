"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";

interface RenameFormProps {
  name: string;
  /** Rejects when the gateway refuses the rename, which keeps the form open. */
  onSave: (name: string) => Promise<void>;
  onCancel: () => void;
}

/** The inline editor a device row turns into. Enter saves, Escape backs out. */
export function RenameForm({ name, onSave, onCancel }: RenameFormProps) {
  const [value, setValue] = useState(name);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  // Select the old name so typing replaces it, which is what a rename usually wants.
  useEffect(() => input.current?.select(), []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const clean = value.trim();
    if (!clean) return;
    if (clean === name) return onCancel();
    setBusy(true);
    try {
      await onSave(clean);
    } catch {
      // The row already told the person what went wrong. Stay open so they can retry.
      setBusy(false);
    }
  }

  return (
    <form
      className="settings-device__rename"
      onSubmit={submit}
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.stopPropagation();
        onCancel();
      }}
    >
      <input
        ref={input}
        className="input"
        aria-label="Device name"
        value={value}
        maxLength={60}
        onChange={(event) => setValue(event.target.value)}
        disabled={busy}
      />
      <button type="submit" className="btn btn--primary btn--sm" disabled={busy || !value.trim()}>
        Save
      </button>
      <button type="button" className="btn btn--sm" onClick={onCancel} disabled={busy}>
        Cancel
      </button>
    </form>
  );
}
