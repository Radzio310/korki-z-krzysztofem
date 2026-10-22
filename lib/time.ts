export const TZ = "Europe/Warsaw";

const timeFmt = new Intl.DateTimeFormat("pl-PL", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
const dayFmt = new Intl.DateTimeFormat("pl-PL", { timeZone: TZ, weekday: "short" });
const longFmt = new Intl.DateTimeFormat("pl-PL", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" });
const dateFmt = new Intl.DateTimeFormat("pl-PL", { timeZone: TZ, day: "numeric", month: "short" });
const isoDayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });

export const fmtTime = (iso: string) => timeFmt.format(new Date(iso));
export const fmtLong = (iso: string) => longFmt.format(new Date(iso));
export const fmtDayShort = (d: Date) => dayFmt.format(d).replace(".", "");
export const fmtDate = (d: Date) => dateFmt.format(d);

/* Dzień kalendarzowy w Warszawie (YYYY-MM-DD) — nie w strefie przeglądarki. */
export const warsawDay = (d: Date = new Date()) => isoDayFmt.format(d);

/* `YYYY-MM-DD` → Date w południe UTC: bezpieczne do formatowania nazwy dnia w każdej strefie. */
export const dayToDate = (day: string) => new Date(`${day}T12:00:00Z`);

export function addDays(day: string, n: number): string {
  const d = dayToDate(day);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function partOfDay(iso: string): "rano" | "popołudnie" | "wieczór" {
  const h = Number(timeFmt.format(new Date(iso)).slice(0, 2));
  if (h < 12) return "rano";
  if (h < 17) return "popołudnie";
  return "wieczór";
}
