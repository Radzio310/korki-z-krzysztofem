import Landing from "@/components/Landing";
import { fetchSite } from "@/lib/api";

/* Strona startowa renderuje się na serwerze z ustawieniami z panelu (cache 60 s),
   a gdy serwer milczy — z pustymi stanami. Reszta danych dociąga się po stronie gościa. */
export const revalidate = 60;

export default async function Page() {
  const site = await fetchSite();
  const site_url = (process.env.NEXT_PUBLIC_SITE_URL || "https://korkizkrzysztofem.pl").replace(/\/$/, "");
  const email = site?.content?.contact?.email;
  /* Tylko potwierdzone dane: osoba, usługa, telefon, profile, miasto. Bez adresu, godzin i ocen (AggregateRating). */
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        "@id": `${site_url}/#krzysztof`,
        name: "Krzysztof Witkowicz",
        jobTitle: "Korepetytor",
        url: `${site_url}/`,
        telephone: "+48882418481",
        ...(email ? { email } : {}),
        knowsAbout: ["matematyka", "chemia"],
        sameAs: ["https://www.facebook.com/krzysztof.witkowicz", "https://www.instagram.com/windknowsmyname/"],
      },
      {
        "@type": "Service",
        "@id": `${site_url}/#korepetycje`,
        name: "Korki z Krzysztofem",
        serviceType: "Korepetycje z matematyki i chemii",
        description: "Korepetycje z matematyki i chemii w Mysłowicach i online, dopasowane do poziomu ucznia.",
        url: `${site_url}/`,
        telephone: "+48882418481",
        provider: { "@id": `${site_url}/#krzysztof` },
        areaServed: [{ "@type": "City", name: "Mysłowice" }],
      },
    ],
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Landing site={site} />
    </>
  );
}
