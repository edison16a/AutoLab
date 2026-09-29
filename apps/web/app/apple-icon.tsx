import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Home-screen icons need an opaque tile, so the blue A sits on the app background.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#05070A",
        }}
      >
        <svg width="120" height="120" viewBox="0 0 64 64">
          <path
            fill="#2684FF"
            fillRule="evenodd"
            d="M26 6h12l20 52H45l-5-13H24l-5 13H6L26 6Zm6 18.2L36.5 36h-9L32 24.2Z"
          />
        </svg>
      </div>
    ),
    size,
  );
}
