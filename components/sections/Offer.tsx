"use client";

import React from "react";
import KineticTitle from "../hero/KineticTitle";
import type { Level } from "@/lib/types";
import { CHEMISTRY, MATH_LEVELS, OFFER_HEAD, type MathLevel, type SubjectKey } from "@/content/offer";
import { lessonPrice, zl } from "@/lib/pricing";
import { emitHandoff, reducedMotion, ripple, scrollToTarget, useReveal } from "@/lib/motion";
import "./offer.css";

/* Przełączanie przedmiotu z innych miejsc strony (np. planety w hero). */
const SUBJECT_EVENT = "kk:subject";
export function showSubject(key: SubjectKey) {
  window.dispatchEvent(new CustomEvent<SubjectKey>(SUBJECT_EVENT, { detail: key }));
}

/* Poziom z panelu bez własnej karty dostaje najbliższą ilustrację po kluczu/nazwie. */
function richFor(l: Level): MathLevel {
  const exact = MATH_LEVELS.find((m) => m.key === l.key);
  if (exact) return { ...exact, title: exact.title, forWhom: l.description?.trim() || exact.forWhom };
  const t = `${l.key} ${l.name}`.toLowerCase();
  const near = /(liceum|technikum|matur)/.test(t) ? MATH_LEVELS[2] : /(5|8|ósm|osm)/.test(t) ? MATH_LEVELS[1] : MATH_LEVELS[0];
  return { ...near, key: l.key, tag: l.name, title: l.name, forWhom: l.description?.trim() || near.forWhom, points: [] };
}

function Molecule() {
  const [kek, setKek] = React.useState(false);
  const [n, setN] = React.useState(0);
  const pts = Array.from({ length: 6 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 3;
    return { x: 100 + 46 * Math.cos(a), y: 100 + 46 * Math.sin(a), hx: 100 + 82 * Math.cos(a), hy: 100 + 82 * Math.sin(a), a };
  });
  const inner = (i: number) => {
    const p = pts[i], q = pts[(i + 1) % 6];
    const k = 0.78;
    return { x1: 100 + (p.x - 100) * k, y1: 100 + (p.y - 100) * k, x2: 100 + (q.x - 100) * k, y2: 100 + (q.y - 100) * k };
  };
  return (
    <button
      type="button"
      className={`mol ${kek ? "is-b" : ""}`}
      onClick={() => { setKek((v) => !v); setN((x) => x + 1); }}
      aria-label="Cząsteczka benzenu — stuknij, żeby przełączyć wiązania (rezonans)"
      aria-pressed={kek}
    >
      <svg viewBox="0 0 200 200" aria-hidden="true">
        <g className="mol__spin" key={n}>
          {pts.map((p, i) => (
            <g key={`h${i}`} className="mol__h" style={{ "--d": `${2.6 + ((i * 7) % 5) * 0.55}s`, "--o": `${(i * 0.37) % 1.3}s` } as React.CSSProperties}>
              <line x1={p.x} y1={p.y} x2={100 + 70 * Math.cos(p.a)} y2={100 + 70 * Math.sin(p.a)} className="mol__bond" />
              <text x={p.hx} y={p.hy} className="mol__lbl">H</text>
            </g>
          ))}
          <polygon points={pts.map((p) => `${p.x},${p.y}`).join(" ")} className="mol__ring" />
          {[0, 2, 4].map((i) => <line key={`a${i}`} {...inner(i)} className="mol__dbl mol__dbl--a" />)}
          {[1, 3, 5].map((i) => <line key={`b${i}`} {...inner(i)} className="mol__dbl mol__dbl--b" />)}
          {pts.map((p, i) => <circle key={`c${i}`} cx={p.x} cy={p.y} r="7.5" className="mol__atom" style={{ "--k": i } as React.CSSProperties} />)}
        </g>
      </svg>
      <span className="mol__hint chalk">{CHEMISTRY.hint}</span>
    </button>
  );
}

export default function Offer({ levels }: { levels: Level[] }) {
  const root = useReveal<HTMLElement>();
  const [subject, setSubject] = React.useState<SubjectKey>("matematyka");
  const [said, setSaid] = React.useState("");
  const cards = levels.map(richFor);

  React.useEffect(() => {
    const on = (e: Event) => setSubject((e as CustomEvent<SubjectKey>).detail);
    window.addEventListener(SUBJECT_EVENT, on);
    return () => window.removeEventListener(SUBJECT_EVENT, on);
  }, []);

  /* Karty wchodzą dopiero, gdy sekcja jest na ekranie (CSS czeka na data-in). */
  React.useEffect(() => {
    const el = root.current;
    if (!el) return;
    if (reducedMotion()) { el.dataset.in = "1"; return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { el.dataset.in = "1"; io.disconnect(); } }, { rootMargin: "0px 0px -15% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [root]);

  /* Strzała w tarczę, potem przejście do formularza z ustawionym przedmiotem i poziomem. */
  const ask = (e: React.MouseEvent<HTMLButtonElement>, subject_key: SubjectKey, level_key?: string, label?: string) => {
    const card = e.currentTarget.closest<HTMLElement>(".of__card, .of__chem");
    const target = card?.querySelector<HTMLElement>(".of__target, .mol");
    if (target && !reducedMotion()) {
      target.classList.remove("is-hit");
      void target.getBoundingClientRect();
      target.classList.add("is-hit");
    }
    emitHandoff({ target: "contact", subject_key, level_key, source: "offer" });
    setSaid(`Ustawiono w formularzu: ${subject_key === "chemia" ? "Chemia" : `Matematyka, ${label}`}.`);
    window.setTimeout(() => scrollToTarget("#kontakt"), reducedMotion() ? 0 : 420);
  };

  return (
    <section id="oferta" ref={root} className="section of" data-subject={subject}>
      <div className="of__tint of__tint--mat" aria-hidden="true" />
      <div className="of__tint of__tint--chem" aria-hidden="true" />
      <div className="wrap">
        <div className="of__top">
        <div className="of__head">
          <span className="eyebrow">{OFFER_HEAD.eyebrow}</span>
          <KineticTitle as="h2" reveal="view" text={OFFER_HEAD.title} accentFrom={3} className="h-section" />
        </div>
        <div className="of__side">
        <p className="lead">{OFFER_HEAD.lead}</p>
        <div className="of__switch" role="radiogroup" aria-label="Przedmiot">
          <input type="radio" id="of-mat" name="of-subject" className="of__radio" checked={subject === "matematyka"} onChange={() => setSubject("matematyka")} />
          <label htmlFor="of-mat"><span className="of__sym" aria-hidden="true">π</span>Matematyka</label>
          <input type="radio" id="of-chem" name="of-subject" className="of__radio" checked={subject === "chemia"} onChange={() => setSubject("chemia")} />
          <label htmlFor="of-chem">
            <span className="of__sym" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 3.5l7.4 4.25v8.5L12 20.5l-7.4-4.25v-8.5z" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" /></svg>
            </span>
            Chemia
          </label>
          <span className="of__thumb" aria-hidden="true"><i /><i /></span>
        </div>
        </div>
        </div>

        <div className="of__panel of__panel--mat" role="group" aria-label="Matematyka — poziomy">
          {cards.map((c, i) => {
            const lvl = levels[i];
            const price = lessonPrice(lvl, 60);
            return (
              <article key={c.key} className="of__card" style={{ "--i": i } as React.CSSProperties}>
                <div className="of__target" style={{ "--t": `${7 + i * 1.7}s` } as React.CSSProperties}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.image} alt={c.imageAlt} width={640} height={640} loading="lazy" decoding="async" />
                  <span className="of__hitring" aria-hidden="true" />
                </div>
                <p className="of__tag">{c.tag}</p>
                <h3 className="h-card">{c.title}</h3>
                <p className="of__for">{c.forWhom}</p>
                {c.points.length ? (
                  <ul className="of__points">
                    {c.points.map((p) => <li key={p}>{p}</li>)}
                  </ul>
                ) : null}
                {price != null ? <p className="of__price">Lekcja 60 min: <b>{zl(price)}</b></p> : null}
                <button type="button" className="btn btn--primary of__ask" onPointerDown={ripple} onClick={(e) => ask(e, "matematyka", c.key, c.tag)}>
                  {OFFER_HEAD.levelCta}
                </button>
              </article>
            );
          })}
        </div>

        <div className="of__panel of__panel--chem" role="group" aria-label="Chemia">
          <article className="of__chem">
            <Molecule />
            <div className="of__chemcopy">
              <p className="of__tag">{CHEMISTRY.tag}</p>
              <h3 className="h-section of__chemtitle">{CHEMISTRY.title}</h3>
              <p className="lead">{CHEMISTRY.body}</p>
              <button type="button" className="btn btn--primary of__ask" onPointerDown={ripple} onClick={(e) => ask(e, "chemia")}>
                {CHEMISTRY.cta}
              </button>
            </div>
          </article>
        </div>

        <p className="sr-only" aria-live="polite">{said}</p>
      </div>
    </section>
  );
}
