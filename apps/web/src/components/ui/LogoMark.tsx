/** The Autolab mark: a blue A. The same path is used by app/icon.svg. */
export const LOGO_PATH = "M26 6h12l20 52H45l-5-13H24l-5 13H6L26 6Zm6 18.2L36.5 36h-9L32 24.2Z";

export function LogoMark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="Autolab">
      <path fill="#2684FF" fillRule="evenodd" d={LOGO_PATH} />
    </svg>
  );
}
