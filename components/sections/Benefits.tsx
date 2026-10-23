"use client";

import React from "react";
import KineticTitle from "../hero/KineticTitle";
import { BENEFITS, HERO } from "@/content/site";
import { emitHandoff, ripple, scrollToTarget, useReveal } from "@/lib/motion";
import "./benefits.css";

type IconName = (typeof BENEFITS.items)[number]["icon"];

/* Rysuneczki na marginesie zeszytu; każdy ma własny drobny ruch w spoczynku (inny czas, inne opóźnienie). */
function Icon({ name }: { name: IconName }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (name) {
    case "exam":
      return <svg viewBox="0 0 32 32" className="ic ic--exam"><rect x="7" y="4" width="18" height="24" rx="3" {...p} /><path d="M11 10h10M11 15h7" {...p} /><path className="ic__tick" d="M12 21.5l3 3 6-7" {...p} pathLength={1} /></svg>;
    case "spark":
      return <svg viewBox="0 0 32 32" className="ic ic--spark"><path className="ic__star" d="M16 4l2.9 7.6L27 13l-6.2 5.2L22.6 27 16 22.6 9.4 27l1.8-8.8L5 13l8.1-1.4z" {...p} /></svg>;
    case "cards":
      return <svg viewBox="0 0 32 32" className="ic ic--cards"><rect className="ic__c1" x="5" y="9" width="15" height="19" rx="2.6" {...p} /><rect className="ic__c2" x="12" y="4" width="15" height="19" rx="2.6" {...p} /><path d="M16 10h7M16 14h5" {...p} /></svg>;
    case "bulb":
      return <svg viewBox="0 0 32 32" className="ic ic--bulb"><path d="M11 19a8 8 0 1 1 10 0c-1.2 1-1.8 2.2-1.8 3.6h-6.4c0-1.4-.6-2.6-1.8-3.6z" {...p} /><path d="M13 26.5h6M14 29.5h4" {...p} /><path className="ic__rays" d="M16 2v-1M5 7L4 6M27 7l1-1" {...p} /></svg>;
    case "bricks":
      return <svg viewBox="0 0 32 32" className="ic ic--bricks"><rect x="4" y="20" width="11" height="7" rx="1.5" {...p} /><rect x="17" y="20" width="11" height="7" rx="1.5" {...p} /><rect className="ic__top" x="10" y="11" width="12" height="7" rx="1.5" {...p} /></svg>;
    case "watch":
      return <svg viewBox="0 0 32 32" className="ic ic--watch"><circle cx="16" cy="18" r="10" {...p} /><path d="M13 4h6M16 4v4" {...p} /><path className="ic__hand" d="M16 18V12" {...p} /></svg>;
    default:
      return <svg viewBox="0 0 32 32" className="ic ic--nodes"><circle cx="7" cy="9" r="3" {...p} /><circle cx="25" cy="9" r="3" {...p} /><circle cx="16" cy="25" r="3" {...p} /><path className="ic__links" d="M10 9h12M8.6 11.6l5.8 10.8M23.4 11.6l-5.8 10.8" {...p} pathLength={1} /></svg>;
  }
}

/* Korzyści jako lista kontrolna na wielkiej kartce z zeszytu w kratkę. Stuknięcie w wiersz
   odhacza go kredą (w jasnym motywie — czerwonym długopisem nauczyciela) i podkreśla zakreślaczem.
   Na dole przypięta karteczka liczy zaznaczone cele i prowadzi do kontaktu.
   Wybór zostaje w sessionStorage (`kk-goals`). Bez JS lista jest zwykłą, czytelną listą. */
export default function Benefits() {
  const root = useReveal<HTMLElement>();
  const [picked, setPicked] = React.useState<string[]>([]);
  const [last, setLast] = React.useState<string | null>(null);

  React.useEffect(() => {
    try {
      const raw = sessionStorage.getItem("kk-goals");
      if (raw) setPicked((JSON.parse(raw) as string[]).filter((id) => BENEFITS.items.some((b) => b.id === id)));
    } catch { /* tryb prywatny */ }
  }, []);

  const toggle = (id: string) => {
    setPicked((cur) => {
      const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
      try { sessionStorage.setItem("kk-goals", JSON.stringify(next)); } catch { /* tryb prywatny */ }
      return next;
    });
    setLast(id);
  };

  const ask = () => {
    emitHandoff({ target: "contact", source: "benefits" });
    scrollToTarget("#kontakt");
  };

  const n = picked.length;
  const total = BENEFITS.items.length;
  return (
    <section id="korzysci" ref={root} className="section bn">
      <div className="wrap">
        <div className="bn__head">
          <span className="eyebrow" data-reveal>{BENEFITS.eyebrow}</span>
          <KineticTitle as="h2" reveal="view" text={BENEFITS.title} accentFrom={3} className="h-section" />
          <p className="lead" data-reveal>{BENEFITS.lead}</p>
        </div>

        <div className="bn__sheet" data-reveal>
          <span className="bn__holes" aria-hidden="true"><i /><i /><i /></span>
          <ul className="bn__list" aria-label={BENEFITS.listLabel}>
            {BENEFITS.items.map((b, i) => {
              const on = picked.includes(b.id);
              return (
                <li key={b.id} className="bn__row" data-reveal style={{ "--d": `${120 + i * 80}ms`, "--j": i } as React.CSSProperties}>
                  <span className="bn__doodle" aria-hidden="true"><Icon name={b.icon} /></span>
                  <button
                    type="button"
                    className={`bn__item ${on ? "is-on" : ""} ${on && last === b.id ? "is-fresh" : ""}`}
                    aria-pressed={on}
                    onClick={() => toggle(b.id)}
                  >
                    <span className="bn__box" aria-hidden="true">
                      <svg viewBox="0 0 40 40">
                        <path className="bn__frame" d="M6 8 C 14 6, 26 7, 33 6 C 34 14, 33 26, 34 33 C 25 34, 14 33, 7 34 C 6 26, 7 15, 6 8 Z" />
                        <path className="bn__tick" pathLength={1} d="M9 21 C 12 23, 15 27, 17 31 C 21 22, 28 12, 38 3" />
                      </svg>
                    </span>
                    <span className="bn__text"><span>{b.text}</span></span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="bn__note" data-reveal style={{ "--d": `${200 + total * 80}ms` } as React.CSSProperties}>
            <span className="bn__tape" aria-hidden="true" />
            <p className="bn__closing chalk">{BENEFITS.closing}</p>
            <p className="bn__count" aria-live="polite">
              {n ? <>{BENEFITS.countLabel} <b>{n}</b> / {total}</> : BENEFITS.countEmpty}
            </p>
            <button type="button" className="btn btn--primary" onPointerDown={ripple} onClick={ask}>{HERO.ctaPrimary}</button>
          </div>
        </div>
      </div>
    </section>
  );
}
