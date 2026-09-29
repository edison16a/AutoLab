"use client";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Photo } from "@/model/types";
import { IconButton } from "../../ui/IconButton";

interface ImageBarProps {
  index: number;
  total: number;
  prev: Photo | null;
  next: Photo | null;
  onOpen: (photo: Photo | null) => void;
}

/** Back to the library on the left, position and stepping on the right. */
export function ImageBar({ index, total, prev, next, onOpen }: ImageBarProps) {
  return (
    <nav className="image-bar" aria-label="Image navigation">
      <Link href="/data" className="image-bar__back">
        <ChevronLeft size={18} strokeWidth={1.8} aria-hidden="true" />
        Data
      </Link>
      <span className="grow" />
      {index >= 0 ? (
        <span className="image-bar__count num">
          {index + 1} of {total}
        </span>
      ) : null}
      <IconButton icon={ChevronLeft} label="Previous image" disabled={!prev} onClick={() => onOpen(prev)} />
      <IconButton icon={ChevronRight} label="Next image" disabled={!next} onClick={() => onOpen(next)} />
    </nav>
  );
}
