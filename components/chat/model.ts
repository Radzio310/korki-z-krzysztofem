/* Model rozmowy: kroki, pytania Krzysztofa, wybory i podpisy odpowiedzi.
   Transkrypt to czysta funkcja odpowiedzi — edycja wcześniejszego dymka po prostu
   „otwiera” ten krok, a reszta rozmowy wraca, gdy odpowiesz. */
import type { BookingStatus, ContactLevel, ContactMode, ContactSubject } from "@/lib/types";
import { LEVELS, subjectLabel } from "@/lib/contact";

export type StepKey = "subjects" | "level" | "mode" | "path" | "duration" | "slot" | "details";
export type Path = "book" | "ask";

export type Answers = {
  subjects: ContactSubject[] | null;
  level: ContactLevel | null;
  mode: ContactMode | null;
  path: Path | null;
  duration: number | null;
  slot: string | null;
};
export const EMPTY_ANSWERS: Answers = { subjects: null, level: null, mode: null, path: null, duration: null, slot: null };

export type Result =
  | { kind: "book"; id: number; token: string; status: BookingStatus; starts_at: string; ends_at: string; duration: number; price: number | null; name: string; email: string }
  | { kind: "ask"; requestId: string | null; name: string; contact: string };

export const stepsFor = (a: Answers): StepKey[] =>
  a.path === "book" ? ["subjects", "level", "mode", "path", "duration", "slot", "details"] : ["subjects", "level", "mode", "path", "details"];

export const isAnswered = (a: Answers, s: StepKey, hasResult: boolean) =>
  s === "details" ? hasResult : s === "subjects" ? !!a.subjects?.length : a[s] != null;

export const SUBJECT_CHOICES: { v: ContactSubject[]; label: string; sub: string; glyph: "pi" | "flask" | "both" }[] = [
  { v: ["matematyka"], label: "Matematyka", sub: "od podstaw do matury", glyph: "pi" },
  { v: ["chemia"], label: "Chemia", sub: "zakres ustalimy razem", glyph: "flask" },
  { v: ["matematyka", "chemia"], label: "Matematyka i chemia", sub: "oba przedmioty", glyph: "both" },
];

export const LEVEL_CHOICES: { v: ContactLevel; label: string; badge: string; sub: string }[] = [
  { v: "sp_1_4", label: LEVELS[0].label, badge: "1–4", sub: "klasy 1–4" },
  { v: "sp_5_8", label: LEVELS[1].label, badge: "5–8", sub: "klasy 5–8, egzamin ósmoklasisty" },
  { v: "liceum", label: LEVELS[2].label, badge: "LO", sub: "matura podstawowa i rozszerzona" },
  { v: "inny", label: "Inny poziom", badge: "?", sub: "opiszesz na końcu" },
];

export const MODE_CHOICES: { v: ContactMode; label: string; sub: string; glyph: "pin" | "laptop" | "either" }[] = [
  { v: "stationary", label: "Stacjonarnie", sub: "w Mysłowicach", glyph: "pin" },
  { v: "online", label: "Online", sub: "przez internet", glyph: "laptop" },
  { v: "any", label: "Obojętnie", sub: "jak będzie wygodniej", glyph: "either" },
];

export const PATH_CHOICES: { v: Path; label: string; sub: string }[] = [
  { v: "book", label: "Zarezerwuj termin", sub: "wolne terminy w kalendarzu" },
  { v: "ask", label: "Tylko zapytaj, Krzysztof oddzwoni", sub: "zostaw numer albo e-mail" },
];

export const subjectsText = (s: ContactSubject[]) => s.map((k, i) => (i ? subjectLabel(k).toLowerCase() : subjectLabel(k))).join(" i ");
export const levelText = (l: ContactLevel) => LEVEL_CHOICES.find((x) => x.v === l)?.label || l;
export const modeText = (m: ContactMode) => {
  const c = MODE_CHOICES.find((x) => x.v === m);
  return m === "stationary" ? "Stacjonarnie, w Mysłowicach" : c?.label || m;
};
export const modeTicket = (m: ContactMode | null) => (m === "stationary" ? "Stacjonarnie" : m === "online" ? "Online" : "Do ustalenia");

/* Pytania Krzysztofa — 1. osoba, krótko. Zależą od wcześniejszych odpowiedzi. */
export function botLines(step: StepKey, a: Answers, opts: { open: boolean; conflict: string | null }): string[] {
  switch (step) {
    case "subjects":
      return ["Cześć! Tu Krzysztof.", "Z czym mogę pomóc?"];
    case "level": {
      const s = a.subjects || [];
      return [`${s.length ? subjectsText(s) : "Jasne"}, jasne.`.replace("Jasne, jasne.", "Jasne."), "Na jakim to poziomie?"];
    }
    case "mode":
      return ["Jaka forma zajęć Ci pasuje?"];
    case "path":
      return opts.open
        ? ["Dzięki, to mi wystarczy na start.", "Chcesz od razu wybrać termin w kalendarzu, czy wolisz, żebym się odezwał?"]
        : ["Dzięki, to mi wystarczy na start.", "Kalendarz jest teraz zamknięty — zostaw kontakt, a ustalimy termin razem."];
    case "duration":
      return ["Ile ma trwać lekcja?"];
    case "slot":
      return [...(opts.conflict ? [opts.conflict] : []), "Kropki pokazują wolne terminy. Wybierz dzień i godzinę."];
    case "details":
      return a.path === "book"
        ? ["Ostatni krok: na kogo zapisać lekcję?", "Potwierdzenie i link do zmiany terminu wyślę mailem."]
        : ["Zostaw imię i telefon albo e-mail — odezwę się."];
  }
}

export function resultLines(r: Result): string[] {
  if (r.kind === "ask") return ["Dziękuję, zgłoszenie zostało przyjęte.", "Skontaktuję się z Tobą na podany numer lub e-mail."];
  return r.status === "confirmed"
    ? ["Gotowe — termin potwierdzony.", "Oto Twój bilet. Do zobaczenia na lekcji!"]
    : ["Mam Twoją rezerwację.", "Oto bilet. Termin czeka na moje potwierdzenie — dam znać mailem."];
}

/* Liczebniki do podpisów. */
export function plural(n: number, one: string, few: string, many: string) {
  if (n === 1) return one;
  const d = n % 10, t = n % 100;
  return d >= 2 && d <= 4 && (t < 12 || t > 14) ? few : many;
}

/* Klucz dymka zależy od treści — zmieniona treść znów „pisze…”. */
export const keyOf = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
};
