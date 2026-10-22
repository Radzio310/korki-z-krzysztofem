import type { Level, Offer } from "./types";

/* Ta sama reguła co serwer (`app/korki_pricing.py`): cena za długość, a gdy jej brak —
   proporcjonalnie z ceny za 60 minut, zaokrąglona do pełnej złotówki. */
export function lessonPrice(level: Level | undefined, duration: number): number | null {
  if (!level) return null;
  const exact = level.prices?.[String(duration)];
  if (typeof exact === "number" && exact > 0) return exact;
  const base = level.prices?.["60"];
  if (typeof base === "number" && base > 0) return Math.round((base * duration) / 60 / 100) * 100;
  return null;
}

export type Quote = {
  perLesson: number;
  weekly: number;
  monthlyBefore: number;
  discountPercent: number;
  discountLabel: string | null;
  monthly: number;
  perHour: number;
  weeklyMinutes: number;
};

export function quote(offer: Offer, level: Level | undefined, duration: number, perWeek: number): Quote | null {
  const perLesson = lessonPrice(level, duration);
  if (perLesson == null) return null;
  const weeklyMinutes = duration * perWeek;
  const weeks = offer.weeks_per_month > 0 ? offer.weeks_per_month : 4;
  const monthlyBefore = perLesson * perWeek * weeks;
  const best = [...(offer.discounts || [])]
    .filter((d) => weeklyMinutes >= d.min_weekly_minutes)
    .sort((a, b) => b.percent - a.percent)[0];
  const discountPercent = best?.percent ?? 0;
  const monthly = Math.round((monthlyBefore * (100 - discountPercent)) / 100);
  return {
    perLesson,
    weekly: perLesson * perWeek,
    monthlyBefore,
    discountPercent,
    discountLabel: best?.label ?? null,
    monthly,
    perHour: Math.round((perLesson * 60) / duration),
    weeklyMinutes,
  };
}

export function hasAnyPrice(offer: Offer): boolean {
  return offer.levels.some((l) => l.active && Object.values(l.prices || {}).some((v) => v > 0));
}

export function zl(grosze: number, opts: { decimals?: boolean } = {}): string {
  const v = grosze / 100;
  return new Intl.NumberFormat("pl-PL", {
    minimumFractionDigits: opts.decimals ? 2 : 0,
    maximumFractionDigits: opts.decimals ? 2 : v % 1 === 0 ? 0 : 2,
  }).format(v) + " zł";
}

export function durationLabel(min: number): string {
  if (min === 45) return "45 min · lekcja szkolna";
  if (min % 60 === 0) return `${min / 60} h`;
  return `${min} min`;
}
