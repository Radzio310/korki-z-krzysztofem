import type { Metadata, Viewport } from "next";
import "@fontsource-variable/bricolage-grotesque/standard.css";
import "@fontsource-variable/manrope";
import "@fontsource/caveat/latin-ext-500.css";
import "@fontsource/caveat/latin-ext-700.css";
import "@fontsource/caveat/latin-500.css";
import "@fontsource/caveat/latin-700.css";
import "./globals.css";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://korkizkrzysztofem.pl").replace(/\/$/, "");
const TITLE = "Korepetycje matematyka i chemia Mysłowice | Korki z Krzysztofem";
const DESCRIPTION =
  "Matematyka i chemia z Krzysztofem Witkowiczem. Korepetycje w Mysłowicach i online, dopasowane do poziomu ucznia. Poznaj ofertę i zapytaj o zajęcia.";
/* Indeksacja tylko na produkcji Vercela; podglądy i lokalne uruchomienia dostają noindex. */
const INDEXABLE = process.env.VERCEL_ENV === "production";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: TITLE, template: "%s · Korki z Krzysztofem" },
  description: DESCRIPTION,
  keywords: ["korepetycje Mysłowice", "korepetycje matematyka", "korepetycje chemia", "korepetycje online", "Korki z Krzysztofem"],
  authors: [{ name: "Krzysztof Witkowicz" }],
  alternates: { canonical: `${SITE}/` },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${SITE}/`,
    siteName: "Korki z Krzysztofem",
    locale: "pl_PL",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
  robots: INDEXABLE ? { index: true, follow: true } : { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#031426" },
    { media: "(prefers-color-scheme: light)", color: "#F1FAFC" },
  ],
  colorScheme: "dark light",
};

/* Motyw ustawiany przed pierwszym malowaniem — bez mignięcia jasnego na ciemnym. */
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('kk-theme');if(t!=='light'&&t!=='dark'){t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme='dark'}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
