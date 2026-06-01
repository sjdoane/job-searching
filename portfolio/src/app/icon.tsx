import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0b",
          color: "#f5b63d",
          fontSize: 32,
          fontWeight: 700,
          letterSpacing: "-0.04em",
          fontFamily: "monospace",
        }}
      >
        SD
      </div>
    ),
    { ...size },
  );
}
