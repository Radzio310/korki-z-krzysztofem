import Landing from "@/components/Landing";
import { fetchSite } from "@/lib/api";

/* Strona startowa renderuje się na serwerze z ustawieniami z panelu (cache 60 s),
   a gdy serwer milczy — z pustymi stanami. Reszta danych dociąga się po stronie gościa. */
export const revalidate = 60;

export default async function Page() {
  const site = await fetchSite();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    name: "Korki z Krzysztofem",
    url: process.env.NEXT_PUBLIC_SITE_URL || "https://korkizkrzysztofem.pl",
    description: "Korepetycje — rezerwacja terminów online, quiz poziomu i kalkulator ceny.",
    ...(site?.content?.contact?.email ? { email: site.content.contact.email } : {}),
    ...(site?.content?.contact?.phone ? { telephone: site.content.contact.phone } : {}),
    ...(site?.content?.contact?.city ? { address: { "@type": "PostalAddress", addressLocality: site.content.contact.city, addressCountry: "PL" } } : {}),
    ...(site && site.reviews_summary.count > 0 && site.reviews_summary.average
      ? { aggregateRating: { "@type": "AggregateRating", ratingValue: site.reviews_summary.average.toFixed(1), reviewCount: site.reviews_summary.count } }
      : {}),
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Landing site={site} />
    </>
  );
}
