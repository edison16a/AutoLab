import { LOGO_PATH, LOGO_VIEWBOX } from "@/data/logo";

/** The Autolab logo in the accent blue. */
export function LogoMark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox={LOGO_VIEWBOX} role="img" aria-label="Autolab">
      <path fill="#2684FF" fillRule="evenodd" d={LOGO_PATH} />
    </svg>
  );
}
