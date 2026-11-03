/* Treści strony oddzielone od układu. Źródło: instrukcja właściciela (§5, §9, §19).
   Zasada: żadnych zmyślonych liczb, cen, procentów ani gwarancji. Dane z panelu
   (content/offer z API) nadpisują to, co jest tutaj — patrz `components/Landing.tsx`. */

export const CONTACT = {
  phoneDisplay: "+48 882 418 481",
  phoneHref: "tel:+48882418481",
  whatsapp: "https://wa.me/48882418481",
  facebook: "https://www.facebook.com/krzysztof.witkowicz",
  instagram: "https://www.instagram.com/windknowsmyname/",
  city: "Mysłowice",
  area: "i online",
} as const;

export const HERO = {
  eyebrow: "Korepetycje w Mysłowicach i online",
  title: "Zrozum matematykę i chemię. Krok po kroku, z Krzysztofem.",
  /** indeks słowa, od którego tytuł dostaje morski połysk */
  accentFrom: 4,
  lead: "Pomagam uczniom uporządkować wiedzę, zrozumieć trudne tematy i nabrać pewności w rozwiązywaniu zadań. Dopasowuję wyjaśnienia do poziomu i potrzeb ucznia.",
  ctaPrimary: "Zapytaj o zajęcia",
  ctaSecondary: "Poznaj ofertę",
  line: ["Matematyka i chemia", "Zajęcia stacjonarne i zdalne"],
} as const;

export const ABOUT = {
  eyebrow: "O mnie",
  title: "Cześć, jestem Krzysztof.",
  /* Wersja skrócona z §9. Fragmenty w nawiasach klamrowych to wartości podświetlane po kliknięciu. */
  body: "Nazywam się Krzysztof Witkowicz. Od kilku lat pomagam uczniom zrozumieć matematykę i chemię. Stawiam na {spokojne wyjaśnienia}, {praktyczne ćwiczenia} i {podejście dopasowane do konkretnej osoby}. Chcę, żeby uczeń wiedział nie tylko, jaki jest wynik, ale też {skąd się bierze}.",
  /* „Równanie” pod tekstem: trzy składniki i wynik. `k` = fragment tekstu podkreślany kredą. */
  values: [
    { k: "spokojne wyjaśnienia", label: "spokojnie", hint: "Wyjaśnienia bez pośpiechu." },
    { k: "praktyczne ćwiczenia", label: "w praktyce", hint: "Ćwiczenia na zadaniach." },
    { k: "podejście dopasowane do konkretnej osoby", label: "indywidualnie", hint: "Pod konkretną osobę." },
    { k: "skąd się bierze", label: "zrozumienie", hint: "Nie tylko wynik, ale skąd się bierze." },
  ],
  eqLabel: "Jak uczę",
  eqHint: "Stuknij składnik równania.",
  ring: "matematyka · chemia · Mysłowice i online",
  signature: "Krzysztof Witkowicz",
  ctaContact: "Skontaktuj się ze mną",
  ctaReviews: "Sprawdź opinie",
  photoAlt: "Krzysztof Witkowicz z kubkiem w dłoni, w jasnym płaszczu",
} as const;

/* Korzyści ze starej strony (§5.3) — bez pasków i procentów. Ostatnia karta to zaproszenie. */
export const BENEFITS = {
  eyebrow: "Korzyści",
  title: "Co osiągniesz dzięki naszej współpracy?",
  lead: "Odhacz, na czym Ci zależy — to dobry początek pierwszej rozmowy.",
  items: [
    { id: "egzaminy", text: "Solidne przygotowanie do egzaminów i testów", icon: "exam" },
    { id: "pewnosc", text: "Pewność siebie w rozwiązywaniu zadań", icon: "spark" },
    { id: "typy", text: "Znajomość różnorodnych typów zadań", icon: "cards" },
    { id: "zrozumienie", text: "Lepsze zrozumienie trudnych zagadnień", icon: "bulb" },
    { id: "podstawy", text: "Budowanie konkretnych podstaw matematycznych", icon: "bricks" },
    { id: "szybkosc", text: "Szybkość i precyzja w obliczeniach", icon: "watch" },
    { id: "logika", text: "Umiejętność logicznego myślenia", icon: "nodes" },
  ],
  closing: "To zależy już tylko od Ciebie…",
  listLabel: "Cele do zaznaczenia",
  countLabel: "Twoje cele:",
  countEmpty: "Odhacz to, na czym Ci zależy.",
} as const;

/* „Jak pracuję” — propozycja opisu procesu z §9, do potwierdzenia przez właściciela. */
export const STEPS = [
  { title: "Poznajemy problem", body: "Zaczynamy od rozmowy: co już umiesz, co sprawia trudność i do czego się przygotowujesz." },
  { title: "Plan dopasowany do ucznia", body: "Układam kolejność tematów pod Twój poziom, tempo i cel — bieżący materiał albo egzamin." },
  { title: "Ćwiczymy i omawiamy", body: "Rozwiązujemy zadania razem, krok po kroku. Dostajesz informację zwrotną: co już działa, a co jeszcze poćwiczyć." },
];

export const NAV_LINKS = [
  { id: "oferta", label: "Oferta" },
  { id: "jak-pracuje", label: "Jak pracuję" },
  { id: "o-mnie", label: "O mnie" },
  { id: "opinie", label: "Opinie" },
  { id: "faq", label: "FAQ" },
] as const;

/* Żywy środek paska na telefonie: sekcja, w której jesteś (pisana kredą). */
export const NAV_LIVE: Record<string, string> = {
  top: "zacznijmy",
  oferta: "oferta",
  korzysci: "korzyści",
  "jak-pracuje": "jak pracuję",
  "o-mnie": "o mnie",
  opinie: "opinie",
  zadanie: "zadanie dnia",
  quiz: "quiz 60 s",
  cennik: "cennik",
  rezerwacja: "rezerwacja",
  faq: "pytania",
  kontakt: "kontakt",
};

export const IMAGES = {
  portrait: { src: "/images/krzysztof-1024.webp", srcSet: "/images/krzysztof-640.webp 640w, /images/krzysztof-1024.webp 1024w", w: 1024, h: 1024 },
  logo: { src: "/images/korki-logo-160.webp", w: 160, h: 160 },
  patterns: { src: "/images/wzory-1600.webp", small: "/images/wzory-900.webp" },
} as const;

/* Geometria okręgu na portrecie (w procentach obrazu) — z pomiaru kanału alfa pliku źródłowego. */
export const PORTRAIT_CIRCLE = { cx: 50, cy: 57, r: 37.9 } as const;
