"use client";

import React from "react";
import type { Content } from "@/lib/types";
import KineticTitle from "../hero/KineticTitle";
import Portrait from "../hero/Portrait";
import { ABOUT } from "@/content/site";
import { ensureGsap, reducedMotion, ripple, useReveal } from "@/lib/motion";
import "./about.css";

/* Licznik, który dolicza do wartości po wejściu na ekran (tylko liczby z panelu). */
function Counter({ value }: { value: string }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const m = value.match(/^(\D*)(\d+(?:[.,]\d+)?)(.*)$/);
    if (!m || reducedMotion()) return;
    const [, pre, num, post] = m;
    const target = parseFloat(num.replace(",", "."));
    const dec = (num.split(/[.,]/)[1] || "").length;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const { gsap } = ensureGsap();
      const o = { v: 0 };
      gsap.to(o, { v: target, duration: 1.8, ease: "power3.out", onUpdate: () => { el.textContent = `${pre}${o.v.toFixed(dec).replace(".", ",")}${post}`; } });
    }, { threshold: 0.6 });
    io.observe(el);
    return () => io.disconnect();
  }, [value]);
  return <span ref={ref}>{value}</span>;
}

/* Tekst z {fragmentami} do podświetlenia kredą. */
function Marked({ text, on }: { text: string; on: string | null }) {
  const parts = text.split(/\{([^}]+)\}/);
  return (
    <>
      {parts.map((p, i) => (i % 2 ? <mark key={i} className={`ab__mark ${on === p ? "is-on" : ""}`}>{p}</mark> : <React.Fragment key={i}>{p}</React.Fragment>))}
    </>
  );
}

/* O mnie. Zamiast siatki kafelków — „równanie” pisane kredą:
   spokojnie + w praktyce + indywidualnie = ze zrozumieniem.
   Składa się wyraz po wyrazie, gdy wjedzie na ekran (raz, nie przy każdej klatce scrolla).
   Każdy wyraz to przycisk: podkreśla kredą swój fragment w tekście i pokazuje dopisek.
   Portret wynurza się z koła raz po wejściu; napis biegnie tylko DOLNYM łukiem pierścienia,
   a podpis stoi pod portretem — nic nie wchodzi na twarz. */
export default function About({ content }: { content: Content }) {
  const root = useReveal<HTMLElement>();
  const eq = React.useRef<HTMLDivElement>(null);
  const [on, setOn] = React.useState<string | null>(null);
  const title = content.about_title?.trim() || ABOUT.title;
  const customBody = content.about_body?.trim();
  const values = ABOUT.values;
  const active = values.find((v) => v.k === on);

  React.useEffect(() => {
    const el = eq.current;
    if (!el) return;
    if (reducedMotion()) { el.dataset.in = "1"; return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { el.dataset.in = "1"; io.disconnect(); } }, { rootMargin: "0px 0px -18% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [customBody]);

  const pick = (k: string) => setOn((c) => (c === k ? null : k));

  return (
    <section id="o-mnie" ref={root} className="section ab">
      <div className="wrap ab__grid">
        <div className="ab__visual">
          <div className="ab__stagewrap">
            <svg className="ab__ring" viewBox="0 0 100 100" aria-hidden="true">
              <defs><path id="ab-arc" d="M5 57 A45 45 0 0 0 95 57" /></defs>
              <text><textPath href="#ab-arc" startOffset="50%" textAnchor="middle">{ABOUT.ring}</textPath></text>
            </svg>
            <Portrait mode="about" src={content.photo_url} alt={ABOUT.photoAlt} />
          </div>
          <p className="ab__sign chalk" aria-hidden="true" data-reveal style={{ "--d": "500ms" } as React.CSSProperties}>
            <span>{ABOUT.signature}</span>
            <svg viewBox="0 0 220 18" preserveAspectRatio="none"><path pathLength={1} d="M4 12 C 50 4, 120 16, 216 6" /></svg>
          </p>
        </div>

        <div className="ab__copy">
          <span className="eyebrow" data-reveal>{ABOUT.eyebrow}</span>
          <KineticTitle as="h2" reveal="view" text={title} accentFrom={content.about_title?.trim() ? undefined : 2} className="h-section" />
          <p className="lead ab__body" data-reveal style={{ "--d": "120ms" } as React.CSSProperties}>
            {customBody ? customBody : <Marked text={ABOUT.body} on={on} />}
          </p>

          {!customBody ? (
            <div className="ab__eq" ref={eq}>
              <p className="ab__eqlabel">{ABOUT.eqLabel}</p>
              <div className="ab__terms" role="group" aria-label={ABOUT.eqLabel}>
                {values.map((v, i) => {
                  const last = i === values.length - 1;
                  return (
                    <React.Fragment key={v.k}>
                      {i > 0 ? <span className="ab__op" aria-hidden="true" style={{ "--s": i * 2 - 1 } as React.CSSProperties}>{last ? "=" : "+"}</span> : null}
                      <button
                        type="button"
                        className={`ab__term chalk ${last ? "ab__term--sum" : ""}`}
                        aria-pressed={on === v.k}
                        style={{ "--s": i * 2 } as React.CSSProperties}
                        onClick={() => pick(v.k)}
                        onPointerEnter={(e) => { if (e.pointerType === "mouse") setOn(v.k); }}
                        onPointerLeave={(e) => { if (e.pointerType === "mouse") setOn(null); }}
                      >
                        {v.label}
                        <svg className="ab__scribble" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true"><path d="M2 6 C 25 3, 60 9, 98 4" /></svg>
                      </button>
                    </React.Fragment>
                  );
                })}
              </div>
              <p className="ab__note" aria-live="polite">{active ? active.hint : ABOUT.eqHint}</p>
            </div>
          ) : null}

          {content.about_facts?.length ? (
            <dl className="ab__facts" data-reveal>
              {content.about_facts.slice(0, 4).map((f, i) => (
                <div key={i} className="ab__fact">
                  <dt><Counter value={f.value} /></dt>
                  <dd>{f.label}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          <div className="ab__cta" data-reveal style={{ "--d": "300ms" } as React.CSSProperties}>
            <a href="#kontakt" className="btn btn--primary" onPointerDown={ripple}>{ABOUT.ctaContact}</a>
            <a href="#opinie" className="btn" onPointerDown={ripple}>{ABOUT.ctaReviews}</a>
          </div>
        </div>
      </div>
    </section>
  );
}
