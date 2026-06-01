import { ImageResponse } from "next/og";

export const alt = "Samuel Doane — Engineer-Builder";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0a0a0b",
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        {/* top eyebrow */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            color: "#9a9aa4",
            fontSize: 26,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}
        >
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 999,
              background: "#f5b63d",
            }}
          />
          Mechanical · Robotics · AI/ML · Quant
        </div>

        {/* name + tagline */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 96,
              fontWeight: 700,
              color: "#ededee",
              letterSpacing: "-0.03em",
            }}
          >
            Samuel Doane
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 20,
              fontSize: 38,
              color: "#9a9aa4",
              maxWidth: 900,
              lineHeight: 1.3,
            }}
          >
            Engineer-builder spanning mechanical design, robotics, AI/ML, and quant.
          </div>
          <div
            style={{
              width: 120,
              height: 6,
              marginTop: 36,
              borderRadius: 4,
              background: "#f5b63d",
            }}
          />
        </div>

        {/* footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            color: "#6b6b75",
            fontSize: 26,
          }}
        >
          <div style={{ display: "flex" }}>samueldoaneportfolio.com</div>
          <div style={{ display: "flex" }}>USC · B.S. MechE + M.S. AI/ML</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
