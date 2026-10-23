"use client";

import React from "react";
import type { MascotMood } from "../Mascot";
import { ChalkRing, Guide, Slate } from "../hero/Chalkboard";
import type { Offer } from "@/lib/types";
import { durationLabel, hasAnyPrice, lessonPrice, quote, zl } from "@/lib/pricing";
import { emitHandoff, ripple, scrollToTarget, useHandoff, useReveal } from "@/lib/motion";
import "./pricing.css";

/* „Ułóż swój plan” na tablicy: tydzień narysowany kredą. Stuknięcie w dzień dopisuje albo ściera
   spotkanie, długość lekcji to linijka (wysokość bloków = długość), a pod spodem tablica liczy
   rachunek kredą. Cena pojawia się tylko, gdy jest w ofercie z panelu (ta sama reguła co serwer,
   lib/pricing.ts); inaczej „ustalana indywidualnie” i „Zapytaj o cenę”. */

const DAYS = ["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"];
const DAYS_FULL = ["Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota", "Niedziela"];
/* rozkład poglądowy dla danej liczby spotkań (równo w tygodniu) */
const PATTERN: Record<number, number[]> = {
  1: [1], 2: [1, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 2, 3, 4], 6: [0, 1, 2, 3, 4, 5], 7: [0, 1, 2, 3, 4, 5, 6],
};
const PREF = [1, 3, 0, 2, 4, 5, 6];

function fmtHours(min: number) {
  const h = min / 60;
  return Number.isInteger(h) ? `${h} h` : `${h.toFixed(2).replace(/0$/, "").replace(".", ",")} h`;
}

function lessonsWord(n: number) {
  return n === 1 ? "godzina lekcyjna" : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? "godziny lekcyjne" : "godzin lekcyjnych";
}

export default function Pricing({ offer }: { offer: Offer }) {
  const root = useReveal<HTMLElement>();
  const levels = offer.levels.filter((l) => l.active);
  const durations = offer.durations.length ? [...offer.durations].sort((a, b) => a - b) : [45, 60, 90, 120];
  const maxDur = Math.max(...durations);
  const priced = hasAnyPrice(offer);
  const [levelKey, setLevelKey] = React.useState<string | undefined>(levels[0]?.key);
  const [duration, setDuration] = React.useState<number>(durations.includes(60) ? 60 : durations[0]);
  const [days, setDays] = React.useState<number[]>(PATTERN[1]);
  const [flash, setFlash] = React.useState(0);
  const [hits, setHits] = React.useState(0);
  const [fromQuiz, setFromQuiz] = React.useState(false);
  const weekly = days.length;

  useHandoff((h) => {
    if (h.source === "plan" || h.target === "contact") return;
    if (h.level_key && levels.some((l) => l.key === h.level_key)) setLevelKey(h.level_key);
    if (h.duration && durations.includes(h.duration)) setDuration(h.duration);
    if (h.weekly && PATTERN[h.weekly]) setDays(PATTERN[h.weekly]);
    setFromQuiz(h.source === "quiz" && !!h.level_key);
    setFlash((n) => n + 1);
    setHits((n) => n + 1);
  });
  React.useEffect(() => {
    if (!flash) return;
    const t = window.setTimeout(() => setFlash(0), 1400);
    return () => window.clearTimeout(t);
  }, [flash]);

  const toggleDay = (i: number) => {
    setDays((d) => (d.includes(i) ? (d.length > 1 ? d.filter((x) => x !== i) : d) : [...d, i].sort((a, b) => a - b)));
  };
  /* Nieruszony rozkład przechodzi w następny równy (Wt+Cz → Pn+Śr+Pt); ręcznie ułożony — dopisuje dzień. */
  const same = (a: number[], b: number[] | undefined) => !!b && a.length === b.length && a.every((x, i) => x === b[i]);
  const more = () => setDays((d) => {
    if (same(d, PATTERN[d.length]) && PATTERN[d.length + 1]) return PATTERN[d.length + 1];
    const free = PREF.find((i) => !d.includes(i));
    return free == null ? d : [...d, free].sort((a, b) => a - b);
  });
  const less = () => setDays((d) => {
    if (d.length <= 1) return d;
    if (same(d, PATTERN[d.length])) return PATTERN[d.length - 1];
    const drop = [...PREF].reverse().find((i) => d.includes(i));
    return d.filter((x) => x !== drop);
  });

  const level = levels.find((l) => l.key === levelKey);
  const q = priced ? quote(offer, level, duration, weekly) : null;
  const weeklyMin = duration * weekly;
  const weeks = offer.weeks_per_month > 0 ? offer.weeks_per_month : 4;
  const nextDiscount = [...offer.discounts].sort((a, b) => a.min_weekly_minutes - b.min_weekly_minutes).find((d) => d.min_weekly_minutes > weeklyMin);

  const askPrice = () => {
    emitHandoff({ target: "contact", level_key: levelKey, source: "plan" });
    scrollToTarget("#kontakt");
  };
  const book = () => {
    emitHandoff({ level_key: levelKey, duration, weekly, source: "plan" });
    scrollToTarget("#rezerwacja");
  };

  /* Linijka długości: skala od (najkrótsza − 15 min) do najdłuższej, etykiety i kreski z tej samej
     funkcji `pos`, więc zawsze stoją jedna pod drugą. Klik/stuknięcie/przeciąganie wybiera
     najbliższą długość; na dotyku przeciąganie rusza dopiero po ruchu w poziomie (pionowo = przewijanie). */
  const lo = Math.max(0, durations[0] - 15);
  const span = maxDur - lo;
  const pos = (d: number) => (span > 0 ? (d - lo) / span : 0.5);
  const step = span / 15 <= 16 ? 15 : 30;
  const ticks: number[] = [];
  for (let m = lo; m <= maxDur + 0.001; m += step) ticks.push(m);
  durations.forEach((d) => { if (!ticks.includes(d)) ticks.push(d); });
  const railRef = React.useRef<HTMLDivElement>(null);
  const drag = React.useRef<{ id: number; x: number; y: number; touch: boolean; on: boolean } | null>(null);
  const nearest = (clientX: number) => {
    const r = railRef.current?.getBoundingClientRect();
    if (!r || !r.width) return duration;
    const t = (clientX - r.left) / r.width;
    return durations.reduce((best, d) => (Math.abs(pos(d) - t) < Math.abs(pos(best) - t) ? d : best), durations[0]);
  };
  const rulerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const touch = e.pointerType === "touch";
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, touch, on: !touch };
    if (!touch) {
      e.currentTarget.setPointerCapture(e.pointerId);
      setDuration(nearest(e.clientX));
    }
  };
  const rulerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = drag.current;
    if (!g || g.id !== e.pointerId) return;
    if (!g.on) {
      const dx = Math.abs(e.clientX - g.x), dy = Math.abs(e.clientY - g.y);
      if (dx > 6 && dx > dy) { g.on = true; e.currentTarget.setPointerCapture(e.pointerId); }
      else return;
    }
    setDuration(nearest(e.clientX));
  };
  const rulerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = drag.current;
    drag.current = null;
    if (!g || g.id !== e.pointerId) return;
    /* stuknięcie palcem bez przesuwania = wybór pod palcem */
    if (g.touch && !g.on && Math.hypot(e.clientX - g.x, e.clientY - g.y) < 10) setDuration(nearest(e.clientX));
  };
  const rulerCancel = () => { drag.current = null; };
  const durKeys = (e: React.KeyboardEvent) => {
    const i = durations.indexOf(duration);
    let n = i;
    if (e.key === "ArrowRight" || e.key === "ArrowUp" || e.key === "PageUp") n = Math.min(durations.length - 1, i + 1);
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown" || e.key === "PageDown") n = Math.max(0, i - 1);
    else if (e.key === "Home") n = 0;
    else if (e.key === "End") n = durations.length - 1;
    else return;
    e.preventDefault();
    setDuration(durations[n]);
  };

  const mood: MascotMood = fromQuiz ? "happy" : q ? "wow" : "think";
  const say = fromQuiz
    ? "Ustawiłem poziom z quizu — dobierz resztę planu."
    : q
      ? "Stukaj w dni tygodnia — rachunek liczy się sam."
      : "Ułóż tydzień, a o cenę tego planu zapytaj jednym kliknięciem.";

  const summary = `${level ? `${level.name}, ` : ""}${weekly} × ${duration} min tygodniowo${q ? `, ${zl(q.monthly)} miesięcznie` : ", cena ustalana indywidualnie"}`;

  const tray = (
    <div className="pl__tray">
      <span className="pl__note">Dni są poglądowe — konkretny termin wybierzesz przy rezerwacji.</span>
      <div className="pl__ctas">
        {q ? (
          <button type="button" className="btn btn--gold btn--sm" onClick={book} onPointerDown={ripple}>Zarezerwuj ten wariant</button>
        ) : (
          <>
            <button type="button" className="btn btn--gold btn--sm" onClick={askPrice} onPointerDown={ripple}>Zapytaj o cenę</button>
            <button type="button" className="ck-btn" onClick={book}>Zarezerwuj ten wariant</button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <section id="cennik" ref={root} className="section pricing">
      <div className="wrap">
        <div className="pricing__head">
          <div className="pricing__titles">
            <span className="eyebrow" data-reveal>{priced ? "Cennik i plan" : "Plan zajęć"}</span>
            <h2 className="h-section" data-reveal>Ułóż swój <span className="text-sea">plan</span></h2>
            <p className="lead" data-reveal>
              {priced
                ? "Wybierz poziom, długość lekcji i dni w tygodniu — tablica od razu policzy rachunek."
                : "Wybierz poziom, długość lekcji i dni w tygodniu. Cenę ustalamy indywidualnie — zapytasz o nią jednym kliknięciem."}
            </p>
          </div>
          {fromQuiz ? <Guide className="pricing__guide" mood={mood} say={say} size={96} /> : null}
        </div>

        <div data-reveal>
          <Slate className={`pl ${flash ? "is-flash" : ""}`} label="Tablica planu zajęć" tray={tray}>
            <div className="pl__grid">
              <div className="pl__controls">
                <fieldset className="pl__group">
                  <legend className="ck-label">Poziom</legend>
                  {levels.length ? (
                    <div className="pl__levels" role="radiogroup" aria-label="Poziom">
                      {levels.map((l, i) => (
                        <button
                          key={l.key} type="button" role="radio" aria-checked={l.key === levelKey}
                          className={`pl__level ck-choice ${l.key === levelKey ? "is-on" : ""}`}
                          onClick={() => setLevelKey(l.key)}
                        >
                          <span className="ck">{l.name}</span>
                          <ChalkRing v={i + hits} key={l.key === levelKey ? `on${hits}` : "off"} />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="pl__muted">Poziomy pojawią się tu wkrótce — szczegóły ustalimy przy rezerwacji.</p>
                  )}
                  {level?.description ? <p className="pl__muted">{level.description}</p> : null}
                </fieldset>

                <fieldset className="pl__group">
                  <legend className="ck-label">Długość lekcji</legend>
                  <div
                    className="pl__ruler"
                    role="slider"
                    tabIndex={0}
                    aria-label="Długość lekcji"
                    aria-valuemin={durations[0]}
                    aria-valuemax={maxDur}
                    aria-valuenow={duration}
                    aria-valuetext={`${duration} minut`}
                    onKeyDown={durKeys}
                    onPointerDown={rulerDown}
                    onPointerMove={rulerMove}
                    onPointerUp={rulerUp}
                    onPointerCancel={rulerCancel}
                  >
                    <div className="pl__rail" ref={railRef}>
                      <svg className="pl__scale" viewBox="0 0 100 20" preserveAspectRatio="none" aria-hidden="true">
                        <path d="M0 4 H 100" />
                        {ticks.map((m) => (
                          <path key={m} d={`M${(pos(m) * 100).toFixed(2)} 4 V ${durations.includes(m) ? 15 : 10}`} />
                        ))}
                      </svg>
                      <span className="pl__magnet-track" aria-hidden="true" style={{ "--p": pos(duration) } as React.CSSProperties}>
                        <i className="pl__magnet" />
                      </span>
                      {durations.map((d) => (
                        <span key={d} aria-hidden="true" className={`pl__dur ck ${d === duration ? "is-on" : ""}`} style={{ left: `${pos(d) * 100}%` }}>
                          {d}<small>min</small>
                        </span>
                      ))}
                    </div>
                  </div>
                  {duration === 45 ? <p className="pl__muted">{durationLabel(duration)}</p> : null}
                </fieldset>
              </div>

              <div className="pl__week">
                <div className="pl__weekhead">
                  <span className="pl__wlabel"><span className="ck-label">Spotkania w tygodniu</span><span className="pl__whint">stuknij dzień, by dopisać albo zetrzeć</span></span>
                  <div className="pl__stepper">
                    <button type="button" className="pl__step ck" onClick={less} disabled={weekly <= 1} aria-label="Mniej spotkań">−</button>
                    <span className="ck pl__count" aria-hidden="true">{weekly}</span>
                    <button type="button" className="pl__step ck" onClick={more} disabled={weekly >= 7} aria-label="Więcej spotkań">+</button>
                  </div>
                </div>
                <div className="pl__chart" style={{ "--h": duration / maxDur } as React.CSSProperties}>
                  <div className="pl__yaxis" aria-hidden="true">
                    {durations.map((d) => (
                      <span key={d} style={{ bottom: `${(d / maxDur) * 100}%` }} className={d === duration ? "is-on" : ""}>{d}</span>
                    ))}
                  </div>
                  <div className="pl__days" role="group" aria-label="Dni spotkań (poglądowo)">
                    {DAYS.map((d, i) => {
                      const on = days.includes(i);
                      return (
                        <button key={d} type="button" className={`pl__day ${on ? "is-on" : ""}`} aria-pressed={on} aria-label={`${DAYS_FULL[i]}: ${on ? "spotkanie" : "wolne"}`} onClick={() => toggleDay(i)}>
                          <span className="pl__slot" aria-hidden="true">
                            <i className="pl__block hatch" />
                            <span className="pl__tag"><b className="ck">{duration}</b></span>
                          </span>
                          <span className="pl__dname ck">{d}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="pl__sum" aria-live="polite">
              <p className="sr-only">{summary}</p>
              <p className="pl__eq ck cw" key={`e${weekly}-${duration}`} aria-hidden="true">
                {weekly} × {duration} min = <b>{fmtHours(weeklyMin)}</b> tygodniowo
                {duration === 45 ? <span className="ck-soft"> · {weekly} {lessonsWord(weekly)}</span> : null}
              </p>
              {q ? (
                <div className="pl__price" aria-hidden="true">
                  <p className="pl__eq ck cw" key={`l${q.perLesson}-${weekly}`} style={{ "--cw-d": 160 } as React.CSSProperties}>
                    {zl(q.perLesson)} × {weekly} × {weeks} tyg. =
                    {q.discountPercent > 0 ? <s className="pl__old ck-soft">{zl(q.monthlyBefore)}</s> : null}
                  </p>
                  <p className="pl__big ck cf" key={`m${q.monthly}`} style={{ "--cw-d": 320 } as React.CSSProperties}>
                    <span className="ck-choice is-on">{zl(q.monthly)}<ChalkRing v={q.monthly % 3} /></span>
                    <small> / miesiąc</small>
                  </p>
                  {q.discountPercent > 0 ? (
                    <p className="pl__disc ck ck-acc">−{q.discountPercent}% {q.discountLabel || "rabatu"}</p>
                  ) : nextDiscount ? (
                    <p className="pl__disc ck ck-soft">jeszcze {fmtHours(nextDiscount.min_weekly_minutes - weeklyMin)} tygodniowo i wpada −{nextDiscount.percent}%</p>
                  ) : null}
                  <p className="pl__fine">Lekcja {duration} min: {zl(q.perLesson)} · godzina zegarowa: {zl(q.perHour)} · miesiąc liczony jako {weeks} tyg.{offer.notes ? ` ${offer.notes}` : ""}</p>
                </div>
              ) : (
                <div className="pl__price" aria-hidden="true">
                  <p className="pl__big pl__indiv ck cw" style={{ "--cw-d": 160 } as React.CSSProperties}>cena: ustalana indywidualnie</p>
                  <p className="pl__fine">Zapytaj o ten plan — dostaniesz konkretną kwotę.</p>
                </div>
              )}
            </div>
          </Slate>
        </div>

        {priced && levels.length > 0 ? (
          <div className="pricing__table" data-reveal>
            <table>
              <thead>
                <tr><th scope="col">Poziom</th>{durations.map((d) => <th scope="col" key={d}>{d} min</th>)}</tr>
              </thead>
              <tbody>
                {levels.map((l) => (
                  <tr key={l.key} className={l.key === levelKey ? "is-on" : ""}>
                    <th scope="row">{l.name}</th>
                    {durations.map((d) => {
                      const p = lessonPrice(l, d);
                      return (
                        <td key={d}>
                          <button type="button" className={l.key === levelKey && d === duration ? "is-sel" : ""} onClick={() => { setLevelKey(l.key); setDuration(d); }} disabled={p == null}>
                            {p != null ? zl(p) : "—"}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </section>
  );
}
