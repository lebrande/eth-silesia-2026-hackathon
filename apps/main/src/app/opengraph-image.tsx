import { ImageResponse } from "next/og";
import { BRAND } from "@/branding/config";

export const alt = BRAND.seo.title;
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
          alignItems: "center",
          justifyContent: "center",
          background: BRAND.theme.primary,
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 128, fontWeight: 700, letterSpacing: -2 }}>
          {BRAND.name}
        </div>
        <div style={{ fontSize: 40, opacity: 0.9, marginTop: 16 }}>
          {BRAND.tagline}
        </div>
      </div>
    ),
    { ...size },
  );
}
