import { ImageResponse } from "next/og";

export const alt = "Korki z Krzysztofem — korepetycje, które mają sens";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/* Karta do udostępniania: tablica z rozwiązanym równaniem na morskim tle. */
export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex", padding: 64,
          background: "radial-gradient(900px 600px at 85% 0%, #12A8C4 0%, transparent 60%), linear-gradient(180deg, #020B16, #031426)",
          color: "#EAF7FB", fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", flex: 1 }}>
          <div style={{ fontSize: 26, letterSpacing: 6, color: "#2FD3E0", textTransform: "uppercase" }}>Korepetycje</div>
          <div style={{ fontSize: 104, fontWeight: 800, lineHeight: 1, marginTop: 18 }}>Korki z</div>
          <div style={{ fontSize: 104, fontWeight: 800, lineHeight: 1, color: "#7BE7F0" }}>Krzysztofem</div>
          <div style={{ fontSize: 34, marginTop: 28, color: "rgba(234,247,251,.8)" }}>Quiz poziomu · kalkulator · rezerwacja online</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", width: 420, padding: 28, borderRadius: 26, background: "#0C2E3B", border: "14px solid #5A3B22", fontSize: 34, gap: 10 }}>
          <div style={{ color: "#7BE7F0" }}>x² − 5x + 6 = 0</div>
          <div>Δ = 25 − 24 = 1</div>
          <div>x = 2 lub x = 3</div>
          <div style={{ color: "#FFC857", marginTop: 8 }}>krok po kroku!</div>
        </div>
      </div>
    ),
    size,
  );
}
