import type { Level, Subject } from "@/lib/types";

/* Oferta: Matematyka (trzy poziomy, opisy skrócone ze starej strony — §19 fragmenty 15–17)
   i Chemia (ostrożny tekst z §9: bez matury rozszerzonej, olimpiad ani studiów). */

export type SubjectKey = "matematyka" | "chemia";

export const SUBJECTS: Subject[] = [
  { key: "matematyka", name: "Matematyka" },
  { key: "chemia", name: "Chemia" },
];

export type MathLevel = {
  key: string;
  tag: string;
  title: string;
  forWhom: string;
  points: string[];
  image: string;
  imageAlt: string;
};

export const MATH_LEVELS: MathLevel[] = [
  {
    key: "sp_1_4",
    tag: "Szkoła podstawowa · klasy 1–4",
    title: "Początek przygody z matematyką!",
    forWhom: "Dla dzieci, które budują pierwsze matematyczne fundamenty.",
    points: [
      "Dodawanie, odejmowanie, mnożenie i dzielenie — ze zrozumieniem",
      "Logiczne myślenie i rozwiązywanie prostych problemów",
      "Solidne podstawy pod kolejne klasy i pozytywne nastawienie",
    ],
    image: "/images/poziom-sp-1-4.webp",
    imageAlt: "Tarcza z napisami: dobre podstawy, podstawowe działania, rozumowanie, zabawa",
  },
  {
    key: "sp_5_8",
    tag: "Szkoła podstawowa · klasy 5–8",
    title: "Teraz już czas na konkrety!",
    forWhom: "Dla uczniów, przed którymi pojawiają się trudniejsze zagadnienia.",
    points: [
      "Ułamki, proporcje, geometria i równania",
      "Logiczne zależności i matematyka w codziennym życiu",
      "Skuteczne metody rozwiązywania zadań i pewność siebie",
    ],
    image: "/images/poziom-sp-5-8.webp",
    imageAlt: "Tarcza z napisami: logiczne podejście, nowe tematy, ciągły rozwój, efekty",
  },
  {
    key: "liceum",
    tag: "Liceum i technikum · matura",
    title: "Ostatnia prosta przed maturką!",
    forWhom: "Przygotowanie do matury na poziomie podstawowym i rozszerzonym.",
    points: [
      "Funkcje, geometria analityczna, ciągi, trygonometria, prawdopodobieństwo",
      "Praca na arkuszach maturalnych z ubiegłych lat",
      "Jak unikać typowych błędów",
    ],
    image: "/images/poziom-liceum.webp",
    imageAlt: "Tarcza z napisami: pewność i zrozumienie, wiele zadań, start w przyszłość",
  },
];

export const CHEMISTRY = {
  tag: "Chemia · zakres ustalamy razem",
  title: "Potrzebujesz pomocy z chemią?",
  body: "Napisz, w której jesteś klasie i jaki temat chcesz uporządkować — ustalimy zakres zajęć.",
  cta: "Zapytaj o chemię",
  hint: "Stuknij w cząsteczkę",
};

export const OFFER_HEAD = {
  eyebrow: "Oferta",
  title: "Każdy poziom wymaga innego podejścia",
  lead: "Wybierz przedmiot, a potem przystanek na trasie. Przycisk przy poziomie od razu ustawi go w formularzu kontaktu.",
  levelCta: "Zapytaj o ten poziom",
  empty: "Poziomy właśnie się układają — napisz, a ustalimy zakres.",
  emptyCta: "Zapytaj o zajęcia",
};

/* Poziomy dla kalkulatora i rezerwacji, gdy panel nie ma jeszcze własnych. Bez cen —
   kalkulator pokazuje wtedy „cena ustalana indywidualnie”. */
export const DEFAULT_LEVELS: Level[] = MATH_LEVELS.map((l) => ({
  key: l.key,
  name: l.tag.replace(" · matura", "").replace("Szkoła podstawowa · ", "SP, "),
  description: l.forWhom,
  prices: {},
  active: true,
}));

/* Tematy na taśmę pod nagłówkiem — wyłącznie z zakresu opisanego w ofercie. */
export const TOPICS = [
  "Działania", "Ułamki", "Proporcje", "Geometria", "Równania", "Funkcje",
  "Geometria analityczna", "Ciągi", "Trygonometria", "Prawdopodobieństwo", "Arkusze maturalne", "Chemia",
];
