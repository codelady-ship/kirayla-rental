import { ImageResponse } from "next/og";

export const alt = "Share — rent things by the day in Azerbaijan";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OG({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const line = locale === "en" ? "Rent your neighbour’s camera, drill or tent — by the day." : "Qonşunun fotoaparatı, drel və çadırı — günlük kirayə.";
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", background: "#f2f4f5", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "flex-end", fontSize: 168, fontWeight: 600, letterSpacing: -9, color: "#000" }}>
          share
          <div style={{ width: 40, height: 40, borderRadius: 40, background: "#5433eb", marginLeft: 8, marginBottom: 34 }} />
        </div>
        <div style={{ fontSize: 40, color: "#4b4846", marginTop: 12 }}>{line}</div>
        <div style={{ display: "flex", marginTop: 48, gap: 16 }}>
          {["Bakı", "Gəncə", "Sumqayıt"].map((c) => (
            <div key={c} style={{ display: "flex", padding: "14px 30px", borderRadius: 999, background: "#fff", border: "1px solid #ebebeb", fontSize: 30 }}>{c}</div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
