"use client";
import { CircleAlert, CircleCheck, Info, X } from "lucide-react";
import type { Notice } from "@/model/types";
import { IconButton } from "./IconButton";

const ICONS = { error: CircleAlert, success: CircleCheck, info: Info };

/** Stack of short notices in the corner. Errors are announced as alerts. */
export function Toasts({ toasts, onDismiss }: { toasts: Notice[]; onDismiss: (id: string) => void }) {
  if (!toasts.length) return null;
  return (
    <div className="toasts">
      {toasts.map((toast) => {
        const Icon = ICONS[toast.kind];
        return (
          <div key={toast.id} className={`toast toast--${toast.kind}`} role={toast.kind === "error" ? "alert" : "status"}>
            <Icon size={16} strokeWidth={1.8} aria-hidden="true" />
            <span className="toast__text">{toast.text}</span>
            <IconButton icon={X} label="Dismiss" small onClick={() => onDismiss(toast.id)} />
          </div>
        );
      })}
    </div>
  );
}
