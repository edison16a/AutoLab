"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef, useState } from "react";

/** The app's sections, in the order they appear. */
export const SECTIONS = [
  { href: "/", label: "Home" },
  { href: "/live", label: "Live" },
  { href: "/data", label: "Data" },
  { href: "/statistics", label: "Statistics" },
  { href: "/hardware", label: "Hardware" },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/**
 * Section links with one accent line under the current section. The line is
 * measured after each route change and slides to its new place.
 */
export function SiteNav() {
  const pathname = usePathname();
  const nav = useRef<HTMLElement>(null);
  const [underline, setUnderline] = useState<{ left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const measure = () => {
      const active = nav.current?.querySelector<HTMLElement>("[aria-current='page']");
      setUnderline(active ? { left: active.offsetLeft, width: active.offsetWidth } : null);
    };
    measure();
    // Fonts and the mobile layout change widths after first paint.
    window.addEventListener("resize", measure);
    void document.fonts?.ready.then(measure);
    return () => window.removeEventListener("resize", measure);
  }, [pathname]);

  return (
    <nav ref={nav} className="site-nav" aria-label="Sections">
      {SECTIONS.map((section) => (
        <Link
          key={section.href}
          href={section.href}
          className="site-nav__item"
          aria-current={isActive(pathname, section.href) ? "page" : undefined}
        >
          {section.label}
        </Link>
      ))}
      <span className="site-nav__underline" aria-hidden="true" style={underline ? { ...underline, opacity: 1 } : { opacity: 0 }} />
    </nav>
  );
}
