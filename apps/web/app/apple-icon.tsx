import { ImageResponse } from "next/og";
import { LOGO_PATH } from "@/components/ui/LogoMark";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home screen icons need an opaque tile, so the blue A sits on white. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#FFFFFF" }}>
        <svg width="112" height="112" viewBox="0 0 64 64">
          <path fill="#2684FF" fillRule="evenodd" d={LOGO_PATH} />
        </svg>
      </div>
    ),
    size,
  );
}
