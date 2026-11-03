import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const alt = "Korepetycje matematyka i chemia Mysłowice — Korki z Krzysztofem";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const read = (...p: string[]) => readFile(path.join(process.cwd(), ...p));

/* Karta do udostępniania 1200×630: prawdziwe logo (public/korki-logo.png) + nazwa usługi.
   Krój Caveat (kreda, jak na stronie) w wersji latin + latin-ext, żeby „ł”, „ś” i „ę” się nie sypały.
   Kolory literalnie — to obraz generowany poza CSS strony. */
export default async function OgImage() {
  const [logo, latin, ext] = await Promise.all([
    read("public", "korki-logo.png"),
    read("node_modules", "@fontsource", "caveat", "files", "caveat-latin-700-normal.woff"),
    read("node_modules", "@fontsource", "caveat", "files", "caveat-latin-ext-700-normal.woff"),
  ]);
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex", alignItems: "center", padding: "0 80px", gap: 64,
          background: "linear-gradient(135deg, #F7FDFE 0%, #E2F4F8 100%)",
          color: "#07223A", fontFamily: "Caveat",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoSrc} width={380} height={380} alt="" />
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ fontSize: 38, letterSpacing: 6, color: "#0B7FA6", textTransform: "uppercase" }}>Korki z Krzysztofem</div>
          <div style={{ fontSize: 112, lineHeight: 1, marginTop: 14, color: "#031426" }}>Matematyka</div>
          <div style={{ fontSize: 112, lineHeight: 1, color: "#0B7FA6" }}>i chemia</div>
          <div style={{ fontSize: 48, marginTop: 28, color: "#0A5C86" }}>Korepetycje · Mysłowice i online</div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Caveat", data: latin, weight: 700, style: "normal" },
        { name: "Caveat", data: ext, weight: 700, style: "normal" },
      ],
    },
  );
}
