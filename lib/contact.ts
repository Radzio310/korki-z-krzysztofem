/* Dane kontaktowe i walidacja formularza „Zapytaj o zajęcia”.
   Jedno źródło dla formularza, paska mobilnego i panelu. */
import type { ContactLevel, ContactMode, ContactSubject } from "./types";

export const PHONE_DISPLAY = "+48 882 418 481";
export const PHONE_TEL = "tel:+48882418481";
export const WHATSAPP_URL = "https://wa.me/48882418481";
export const FACEBOOK_URL = "https://www.facebook.com/krzysztof.witkowicz";
export const INSTAGRAM_URL = "https://www.instagram.com/windknowsmyname/";

export const SUBJECTS: { key: ContactSubject; label: string; hint: string }[] = [
  { key: "matematyka", label: "Matematyka", hint: "π" },
  { key: "chemia", label: "Chemia", hint: "H₂O" },
];

export const LEVELS: { key: ContactLevel; label: string }[] = [
  { key: "sp_1_4", label: "Szkoła podstawowa 1–4" },
  { key: "sp_5_8", label: "Szkoła podstawowa 5–8" },
  { key: "liceum", label: "Liceum / technikum" },
  { key: "inny", label: "Inny" },
];

export const MODES: { key: ContactMode; label: string }[] = [
  { key: "stationary", label: "Stacjonarnie" },
  { key: "online", label: "Online" },
  { key: "any", label: "Obojętnie" },
];

export const LIMITS = { name: [2, 100], classInfo: 120, message: 3000 } as const;

export const subjectLabel = (k: string) => SUBJECTS.find((s) => s.key === k)?.label || k;
export const levelLabel = (k: string) => LEVELS.find((l) => l.key === k)?.label || k;
export const modeLabel = (k: string) => MODES.find((m) => m.key === k)?.label || k;

export function asSubject(k?: string | null): ContactSubject | null {
  return SUBJECTS.some((s) => s.key === k) ? (k as ContactSubject) : null;
}

/* Poziom z kanału „handoff”. Przyjmuje klucze formularza albo klucze oferty z panelu
   (liceum, matura_*, technikum). „podstawowka” bez zakresu klas jest dwuznaczna — nie zgadujemy. */
export function asLevel(k?: string | null): ContactLevel | null {
  if (!k) return null;
  if (LEVELS.some((l) => l.key === k)) return k as ContactLevel;
  const t = k.toLowerCase();
  if (/(liceum|technikum|matura)/.test(t)) return "liceum";
  if (/(1[_-]?4|klasy_?1)/.test(t)) return "sp_1_4";
  if (/(5[_-]?8)/.test(t)) return "sp_5_8";
  return null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const isEmail = (v: string) => v.length <= 254 && EMAIL_RE.test(v);

/* Polski numer: 9 cyfr (pierwsza 1–9), opcjonalnie +48 / 0048 / 48 z przodu; spacje, myślniki,
   kropki i nawiasy są dopuszczone. Zwraca zapis +48XXXXXXXXX albo null. */
export function normalizePhone(raw: string): string | null {
  const t = raw.trim();
  if (!/^[+\d][\d\s\-.()]*$/.test(t)) return null;
  let d = t.replace(/[^\d]/g, "");
  if (t.startsWith("+")) {
    if (!d.startsWith("48")) return null;
    d = d.slice(2);
  } else if (d.startsWith("0048")) d = d.slice(4);
  else if (d.length === 11 && d.startsWith("48")) d = d.slice(2);
  return /^[1-9]\d{8}$/.test(d) ? `+48${d}` : null;
}

export const prettyPhone = (p: string) => {
  const m = /^\+48(\d{3})(\d{3})(\d{3})$/.exec(p.replace(/\s+/g, ""));
  return m ? `+48 ${m[1]} ${m[2]} ${m[3]}` : p;
};
