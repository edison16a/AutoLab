"use client";
import { Download, Trash2, X } from "lucide-react";

interface SelectionBarProps {
  count: number;
  total: number;
  busy: boolean;
  onSelectAll: () => void;
  onDownload: () => void;
  onDelete: () => void;
  onDone: () => void;
}

/**
 * Bulk actions while select mode is on. It sticks to the bottom of the
 * screen so the actions stay in reach while scrolling through days. On
 * phones the action words are hidden visually but still name the buttons.
 */
export function SelectionBar({ count, total, busy, onSelectAll, onDownload, onDelete, onDone }: SelectionBarProps) {
  const none = count === 0;
  return (
    <div className="data-selection" role="region" aria-label="Selection">
      <button type="button" className="icon-btn icon-btn--sm" aria-label="Done selecting" title="Done selecting" onClick={onDone}>
        <X size={16} strokeWidth={1.8} aria-hidden="true" />
      </button>
      <span className="data-selection__count num" aria-live="polite">
        {count} selected
      </span>
      {count < total ? (
        <button type="button" className="btn btn--ghost btn--sm" onClick={onSelectAll}>
          Select all
        </button>
      ) : null}
      <span className="grow" />
      <button type="button" className="btn btn--sm data-selection__action" disabled={none || busy} onClick={onDownload}>
        <Download size={16} strokeWidth={1.8} aria-hidden="true" />
        <span className="data-selection__text">Download</span>
      </button>
      <button type="button" className="btn btn--sm data-selection__action" disabled={none || busy} onClick={onDelete}>
        <Trash2 size={16} strokeWidth={1.8} aria-hidden="true" />
        <span className="data-selection__text">Delete</span>
      </button>
    </div>
  );
}
