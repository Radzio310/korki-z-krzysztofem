import type { Faq } from "@/lib/types";
import { CONTACT } from "./site";

/* FAQ wyłącznie z potwierdzonych faktów (przedmioty, poziomy, tryby, kontakt).
   Czas lekcji, cennik, dojazd, materiały i zasady odwoływania czekają na właściciela (§9) —
   nie publikujemy wymyślonych odpowiedzi. Panel (`content.faq`) zastępuje tę listę w całości. */

export type FaqItem = Faq & { id: string };

export const FAQ_HEAD = {
  eyebrow: "FAQ",
  title: "Zanim zapytasz",
  lead: "Krótko o tym, co już wiadomo. Resztę ustalimy w rozmowie.",
  ask: "Nie ma tu Twojego pytania?",
  askCta: "Zapytaj o zajęcia",
};

export const FAQ: FaqItem[] = [
  {
    id: "faq-przedmioty",
    q: "Z jakich przedmiotów są zajęcia?",
    a: "Z matematyki i z chemii.",
  },
  {
    id: "faq-poziomy",
    q: "Na jakim poziomie uczysz matematyki?",
    a: "Szkoła podstawowa (klasy 1–4 i 5–8) oraz liceum i technikum — z przygotowaniem do matury podstawowej i rozszerzonej.",
  },
  {
    id: "faq-chemia",
    q: "A chemia?",
    a: "Napisz, w której jesteś klasie i jaki temat chcesz uporządkować — ustalimy zakres zajęć.",
  },
  {
    id: "faq-tryb",
    q: "Zajęcia są stacjonarne czy online?",
    a: "Jedno i drugie: stacjonarnie w Mysłowicach albo zdalnie, online.",
  },
  {
    id: "faq-kontakt",
    q: "Jak najszybciej się skontaktować?",
    a: `Zadzwoń lub napisz na WhatsAppie: ${CONTACT.phoneDisplay}. Możesz też napisać w czacie na dole strony.`,
  },
];
