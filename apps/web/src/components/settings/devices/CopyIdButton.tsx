"use client";
import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { useAutolab } from "@/providers/autolab-context";

/**
 * Copies a full device ID (the row only shows the short form) and shows a
 * check for a moment. The clipboard can be refused on insecure pages or
 * without permission, which gets a toast instead of failing quietly.
 */
export function CopyIdButton({ id }: { id: string }) {
  const { notify } = useAutolab();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      notify("Could not copy. Select the ID instead.", "error");
    }
  }

  const Icon = copied ? Check : Copy;
  return (
    <button
      type="button"
      className={`icon-btn icon-btn--sm settings-device__copy ${copied ? "icon-btn--active" : ""}`}
      aria-label="Copy device ID"
      title={copied ? "Copied" : "Copy device ID"}
      onClick={() => void copy()}
    >
      <Icon size={16} strokeWidth={1.8} aria-hidden="true" />
      <span className="visually-hidden" aria-live="polite">
        {copied ? "Copied" : ""}
      </span>
    </button>
  );
}
