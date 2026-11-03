import type { MetadataRoute } from "next";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://korkizkrzysztofem.pl").replace(/\/$/, "");

/* Indeksacja tylko na produkcji Vercela (VERCEL_ENV === "production"); podglądy są zamknięte.
   Uwaga: robots.txt nie chroni danych — panel i rezerwacje mają własne `noindex` i logowanie/token. */
export default function robots(): MetadataRoute.Robots {
  /* KORKI_NOINDEX=1 trzyma produkcję na *.vercel.app zamkniętą do czasu przełączenia domeny. */
  if (process.env.VERCEL_ENV !== "production" || process.env.KORKI_NOINDEX === "1") {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/panel", "/rezerwacja/"] },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
