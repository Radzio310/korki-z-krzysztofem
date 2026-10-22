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

/* Tekst z {fragmentami} do podświetlenia markerem. */
function Marked({ text, on }: { text: string; on: string | null }) {
  const parts = text.split(/\{([^}]+)\}/);
  return (
    <>
      {parts.map((p, i) => (i % 2 ? <mark key={i} className={`ab__mark ${on === p ? "is-on" : ""}`}>{p}</mark> : <React.Fragment key={i}>{p}</React.Fragment>))}
    </>
  );
}

/* O mnie: Krzysztof wynurza się z koła, gdy przewijasz (ten sam „bulaj” co w hero).
   Cztery wartości to przyciski — każdy podkreśla markerem swój fragment tekstu. */
export default function About({ content }: { content: Content }) {
  const root = useReveal<HTMLElement>();
  const [on, setOn] = React.useState<string | null>(null);
  const title = content.about_title?.trim() || ABOUT.title;
  const customBody = content.about_body?.trim();

  /* Pierścień z napisem obraca się z przewijaniem. */
  React.useEffect(() => {
    const el = root.current;
    if (!el || reducedMotion()) return;
    const { gsap } = ensureGsap();
    const ctx = gsap.context(() => {
      gsap.to(".ab__ring", { rotate: 140, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true } });
    }, el);
    return () => ctx.revert();
  }, [root]);

  return (
    <section id="o-mnie" ref={root} className="section ab">
      <div className="wrap ab__grid">
        <div className="ab__visual">
          <div className="ab__ring" aria-hidden="true">
            <svg viewBox="0 0 200 200">
              <defs><path id="ab-circle" d="M100 100 m -92 0 a 92 92 0 1 1 184 0 a 92 92 0 1 1 -184 0" /></defs>
              <text><textPath href="#ab-circle">matematyka · chemia · krok po kroku · Mysłowice i online · </textPath></text>
            </svg>
          </div>
          <Portrait mode="about" src={content.photo_url} alt={ABOUT.photoAlt} />
          <p className="ab__sign chalk" aria-hidden="true">{ABOUT.signature}</p>
        </div>

        <div className="ab__copy">
          <span className="eyebrow" data-reveal>{ABOUT.eyebrow}</span>
          <KineticTitle as="h2" reveal="view" text={title} accentFrom={content.about_title?.trim() ? undefined : 2} className="h-section" />
          <p className="lead ab__body" data-reveal style={{ "--d": "120ms" } as React.CSSProperties}>
            {customBody ? customBody : <Marked text={ABOUT.body} on={on} />}
          </p>

          {!customBody ? (
            <ul className="ab__values" aria-label="Jak uczę" data-reveal style={{ "--d": "220ms" } as React.CSSProperties}>
              {ABOUT.values.map((v) => (
                <li key={v.k}>
                  <button
                    type="button"
                    aria-pressed={on === v.k}
                    onClick={() => setOn((c) => (c === v.k ? null : v.k))}
                    onPointerEnter={(e) => { if (e.pointerType === "mouse") setOn(v.k); }}
                    onPointerLeave={(e) => { if (e.pointerType === "mouse") setOn(null); }}
                  >
                    <b>{v.label}</b>
                    <small>{v.hint}</small>
                  </button>
                </li>
              ))}
            </ul>
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
