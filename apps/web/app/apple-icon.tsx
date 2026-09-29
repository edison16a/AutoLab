import { ImageResponse } from "next/og";
import { LOGO_PATH, LOGO_VIEWBOX } from "@/data/logo";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home screen icons need an opaque tile: the white logo on the accent blue, like the original artwork. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#2684FF" }}>
        <svg width="132" height="132" viewBox={LOGO_VIEWBOX}>
          <path fill="#FFFFFF" fillRule="evenodd" d={LOGO_PATH} />
        </svg>
      </div>
    ),
    size,
  );
}
