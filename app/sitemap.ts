import type { MetadataRoute } from "next";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://korkizkrzysztofem.pl").replace(/\/$/, "");

/* Tylko strony publiczne i warte indeksu. Panel i linki rezerwacji są poza mapą. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/polityka-prywatnosci`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
