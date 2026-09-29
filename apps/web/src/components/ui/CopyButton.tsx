"use client";
import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { useAutolab } from "@/providers/autolab-context";

interface CopyButtonProps {
  text: string;
  /** Accessible name and tooltip, like "Copy device ID". */
  label: string;
  className?: string;
}

/**
 * Copies text and swaps to a check for a moment. The clipboard API can be
 * refused (no permission, insecure page), which gets a toast instead.
 */
export function CopyButton({ text, label, className = "" }: CopyButtonProps) {
  const { notify } = useAutolab();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      notify("Could not copy. Select the text instead.", "error");
    }
  };

  const Icon = copied ? Check : Copy;
  return (
    <button
      type="button"
      className={`icon-btn icon-btn--sm ${className} ${copied ? "icon-btn--active" : ""}`}
      aria-label={label}
      title={copied ? "Copied" : label}
      onClick={() => void copy()}
    >
      <Icon size={16} strokeWidth={1.8} aria-hidden="true" />
      <span className="visually-hidden" aria-live="polite">
        {copied ? "Copied" : ""}
      </span>
    </button>
  );
}
