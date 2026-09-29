"use client";
/**
 * Blob URLs keep their image alive in memory until revoked. This hook owns
 * every URL it creates and revokes whatever is left when the app unmounts, so
 * signing out or switching users never leaks images.
 */
import { useCallback, useEffect, useRef } from "react";

export function useObjectUrls() {
  const owned = useRef(new Set<string>());

  useEffect(() => {
    const urls = owned.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  const makeUrl = useCallback((blob: Blob) => {
    const url = URL.createObjectURL(blob);
    owned.current.add(url);
    return url;
  }, []);

  /** Safe to call with remote URLs or undefined; only blob URLs are revoked. */
  const revoke = useCallback((url?: string) => {
    if (!url?.startsWith("blob:")) return;
    URL.revokeObjectURL(url);
    owned.current.delete(url);
  }, []);

  return { makeUrl, revoke };
}

export type ObjectUrls = ReturnType<typeof useObjectUrls>;
