import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          background: "#0c0c14",
          borderRadius: 6,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          gap: 3,
          padding: "5px 5px 5px 5px",
        }}
      >
        {/* Candlestick bars — short, medium, tall */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
          <div style={{ width: 1, height: 3, background: "#5bafff" }} />
          <div style={{ width: 4, height: 8, background: "#5bafff", borderRadius: 1 }} />
          <div style={{ width: 1, height: 2, background: "#5bafff" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
          <div style={{ width: 1, height: 2, background: "#34d399" }} />
          <div style={{ width: 4, height: 13, background: "#34d399", borderRadius: 1 }} />
          <div style={{ width: 1, height: 2, background: "#34d399" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
          <div style={{ width: 1, height: 2, background: "#f87171" }} />
          <div style={{ width: 4, height: 9, background: "#f87171", borderRadius: 1 }} />
          <div style={{ width: 1, height: 3, background: "#f87171" }} />
        </div>
      </div>
    ),
    { ...size }
  );
}
