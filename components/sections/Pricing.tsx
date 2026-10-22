"use client";

import React from "react";
import Mascot from "../Mascot";
import RollingNumber from "../ui/RollingNumber";
import type { Offer } from "@/lib/types";
import { durationLabel, hasAnyPrice, lessonPrice, quote, zl } from "@/lib/pricing";
import { emitHandoff, ripple, scrollToTarget, useHandoff, useReveal } from "@/lib/motion";
import "./pricing.css";

const MAX_WEEKLY = 7;

function fmtHours(min: number) {
  const h = min / 60;
  return Number.isInteger(h) ? `${h} h` : `${h.toFixed(2).replace(/0$/, "").replace(".", ",")} h`;
}

export default function Pricing({ offer }: { offer: Offer }) {
  const root = useReveal<HTMLElement>();
  const levels = offer.levels.filter((l) => l.active);
  const durations = offer.durations.length ? offer.durations : [45, 60, 90, 120];
  const priced = hasAnyPrice(offer);
  const [levelKey, setLevelKey] = React.useState<string | undefined>(levels[0]?.key);
  const [duration, setDuration] = React.useState<number>(durations.includes(60) ? 60 : durations[0]);
  const [weekly, setWeekly] = React.useState(1);
  const [flash, setFlash] = React.useState(false);

  useHandoff((h) => {
    if (h.source === "pricing" || h.target === "contact") return;
    if (h.level_key && levels.some((l) => l.key === h.level_key)) setLevelKey(h.level_key);
    if (h.duration && durations.includes(h.duration)) setDuration(h.duration);
    setFlash(true);
    window.setTimeout(() => setFlash(false), 1400);
  });

  const level = levels.find((l) => l.key === levelKey);
  const q = quote(offer, level, duration, weekly);
  const weeklyMin = duration * weekly;
  const nextDiscount = [...offer.discounts].sort((a, b) => a.min_weekly_minutes - b.min_weekly_minutes).find((d) => d.min_weekly_minutes > weeklyMin);

  const askPrice = () => {
    emitHandoff({ target: "contact", subject_key: "matematyka", level_key: levelKey, source: "pricing" });
    scrollToTarget("#kontakt");
  };

  const book = () => {
    emitHandoff({ level_key: levelKey, duration, weekly, source: "pricing" });
    scrollToTarget("#rezerwacja");
  };

  return (
    <section id="cennik" ref={root} className="section pricing">
      <div className="wrap">
        <div className="pricing__head">
          <span className="eyebrow" data-reveal>{priced ? "Cennik i kalkulator" : "Plan zajęć"}</span>
          <h2 className="h-section" data-reveal>{priced ? <>Policz swój <span className="text-sea">pakiet</span></> : <>Ułóż swój <span className="text-sea">plan</span></>}</h2>
          <p className="lead" data-reveal>
            {priced
              ? "Wybierz poziom, długość lekcji i liczbę spotkań w tygodniu — cena przelicza się na żywo."
              : "Wybierz poziom, długość lekcji i liczbę spotkań w tygodniu. Cenę ustalamy indywidualnie — zapytaj o nią jednym kliknięciem."}
          </p>
        </div>

        <div className={`pricing__calc card ${flash ? "is-flash" : ""}`} data-reveal>
          <div className="pricing__controls">
            <fieldset className="pricing__group">
              <legend>Poziom</legend>
              {levels.length ? (
                <div className="pricing__chips" role="radiogroup">
                  {levels.map((l) => (
                    <button key={l.key} type="button" role="radio" aria-checked={l.key === levelKey} className="chip" onClick={() => setLevelKey(l.key)} onPointerDown={ripple}>
                      {l.name}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="muted pricing__note">Poziomy pojawią się tu wkrótce — wycenę dostaniesz przy rezerwacji.</p>
              )}
              {level?.description ? <p className="pricing__desc muted">{level.description}</p> : null}
            </fieldset>

            <fieldset className="pricing__group">
              <legend>Długość lekcji</legend>
              <div className="pricing__seg" role="radiogroup" style={{ "--n": durations.length, "--i": Math.max(0, durations.indexOf(duration)) } as React.CSSProperties}>
                <span className="pricing__seg-thumb" aria-hidden="true" />
                {durations.map((d) => (
                  <button key={d} type="button" role="radio" aria-checked={d === duration} onClick={() => setDuration(d)}>
                    <b>{d}</b><small>min</small>
                  </button>
                ))}
              </div>
              <p className="pricing__desc muted">{durationLabel(duration)}</p>
            </fieldset>

            <fieldset className="pricing__group">
              <legend>Spotkań w tygodniu</legend>
              <div className="pricing__weekly">
                <button type="button" className="pricing__step" onClick={() => setWeekly((w) => Math.max(1, w - 1))} disabled={weekly <= 1} aria-label="Mniej spotkań">−</button>
                <div className="pricing__slider">
                  <input
                    type="range" min={1} max={MAX_WEEKLY} step={1} value={weekly}
                    onChange={(e) => setWeekly(Number(e.target.value))}
                    aria-label="Liczba spotkań w tygodniu"
                    style={{ "--v": (weekly - 1) / (MAX_WEEKLY - 1) } as React.CSSProperties}
                  />
                  <div className="pricing__ticks" aria-hidden="true">
                    {Array.from({ length: MAX_WEEKLY }).map((_, i) => <span key={i} className={i < weekly ? "on" : ""}>{i + 1}</span>)}
                  </div>
                </div>
                <button type="button" className="pricing__step" onClick={() => setWeekly((w) => Math.min(MAX_WEEKLY, w + 1))} disabled={weekly >= MAX_WEEKLY} aria-label="Więcej spotkań">+</button>
              </div>
              <div className="pricing__blocks" aria-hidden="true">
                {Array.from({ length: weekly }).map((_, i) => (
                  <span key={i} style={{ "--w": duration / 120, "--k": i } as React.CSSProperties} />
                ))}
              </div>
              <p className="pricing__desc muted">
                {weekly} × {duration} min = <b>{fmtHours(weeklyMin)}</b> tygodniowo
                {duration === 45 ? <> · {weekly} {weekly === 1 ? "godzina lekcyjna" : weekly < 5 ? "godziny lekcyjne" : "godzin lekcyjnych"}</> : null}
              </p>
            </fieldset>
          </div>

          <div className="pricing__out">
            {q && priced ? (
              <>
                <span className="pricing__label">Miesięcznie</span>
                <div className="pricing__big">
                  <RollingNumber value={new Intl.NumberFormat("pl-PL").format(Math.round(q.monthly / 100))} suffix="zł" />
                </div>
                {q.discountPercent > 0 ? (
                  <span className="pricing__badge" key={q.discountPercent}>−{q.discountPercent}% {q.discountLabel || "rabatu"} · zamiast {zl(q.monthlyBefore)}</span>
                ) : nextDiscount ? (
                  <span className="pricing__hint">Jeszcze {fmtHours(nextDiscount.min_weekly_minutes - weeklyMin)} tygodniowo i wpada −{nextDiscount.percent}%</span>
                ) : null}
                <dl className="pricing__rows">
                  <div><dt>Lekcja {duration} min</dt><dd>{zl(q.perLesson)}</dd></div>
                  <div><dt>Tygodniowo</dt><dd>{zl(q.weekly)}</dd></div>
                  <div><dt>Za godzinę zegarową</dt><dd>{zl(q.perHour)}</dd></div>
                </dl>
                <p className="pricing__fine muted">Miesiąc liczony jako {offer.weeks_per_month} tygodnie. {offer.notes || ""}</p>
              </>
            ) : (
              <div className="pricing__nop">
                <span className="pricing__label">Cena</span>
                <p className="pricing__indiv">ustalana<br />indywidualnie</p>
                <p className="muted">
                  {level ? <>Wybrany plan: <b>{level.name}</b>, {weekly} × {duration} min tygodniowo.</> : <>Wybrany plan: {weekly} × {duration} min tygodniowo.</>}
                </p>
                <Mascot className="pricing__pi" mood="think" size={88} say="Zapytaj o cenę tego planu — to jedno kliknięcie." side="left" />
              </div>
            )}
            {q && priced ? (
              <button type="button" className="btn btn--primary pricing__cta" onClick={book} onPointerDown={ripple}>
                Zarezerwuj ten wariant
              </button>
            ) : (
              <div className="pricing__ctas">
                <button type="button" className="btn btn--primary pricing__cta" onClick={askPrice} onPointerDown={ripple}>
                  Zapytaj o cenę
                </button>
                <button type="button" className="btn pricing__cta" onClick={book} onPointerDown={ripple}>
                  Zarezerwuj termin
                </button>
              </div>
            )}
          </div>
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
