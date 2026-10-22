"use client";

import React from "react";
import KineticTitle from "./KineticTitle";
import Portrait, { type Planet } from "./Portrait";
import Patterns from "../ui/Patterns";
import { showSubject } from "../sections/Offer";
import { openFaq } from "../sections/Faq";
import { ABOUT, HERO } from "@/content/site";
import { ensureGsap, reducedMotion, ripple, scrollToTarget, useMagnet } from "@/lib/motion";
import "./hero.css";

const Hex = () => (
  <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
    <path d="M12 3.5l7.4 4.25v8.5L12 20.5l-7.4-4.25v-8.5z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <path d="M12 7.6l3.8 2.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
const Pin = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
    <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <circle cx="12" cy="10" r="2.3" fill="currentColor" />
  </svg>
);
const Screen = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
    <rect x="3.5" y="5" width="17" height="11" rx="2.2" fill="none" stroke="currentColor" strokeWidth="2" />
    <path d="M9 20h6M12 16v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

/* Hero: człowiek, a nie logo. Po lewej obietnica i dwa działania, po prawej Krzysztof
   wynurzający się z koła, wokół orbita z czterema faktami — każdy da się kliknąć.
   W tle wzory ze starej strony, podświetlane latarką. */
export default function Hero({ title, subtitle }: { title: string | null; subtitle: string | null }) {
  const root = React.useRef<HTMLElement>(null);
  const primary = useMagnet<HTMLAnchorElement>(0.22);
  const custom = title?.trim();
  const heading = custom || HERO.title;

  const planets: Planet[] = React.useMemo(() => [
    { id: "mat", label: "Matematyka", glyph: "π", onClick: () => { showSubject("matematyka"); scrollToTarget("#oferta"); } },
    { id: "chem", label: "Chemia", glyph: <Hex />, onClick: () => { showSubject("chemia"); scrollToTarget("#oferta"); } },
    { id: "miasto", label: "Mysłowice", glyph: <Pin />, onClick: () => openFaq("faq-tryb") },
    { id: "online", label: "Online", glyph: <Screen />, onClick: () => openFaq("faq-tryb") },
  ], []);

  /* Przy zjeździe w dół tekst odpływa odrobinę szybciej niż portret — głębia bez przypinania. */
  React.useEffect(() => {
    const el = root.current;
    if (!el || reducedMotion()) return;
    const { gsap } = ensureGsap();
    const ctx = gsap.context(() => {
      gsap.to(".hero__copy", { yPercent: -8, opacity: 0.35, ease: "none", scrollTrigger: { trigger: el, start: "top top", end: "bottom top", scrub: 0.4 } });
      gsap.to(".hero__horizon", { yPercent: 40, ease: "none", scrollTrigger: { trigger: el, start: "top top", end: "bottom top", scrub: 0.4 } });
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <section id="top" ref={root} className="hero" aria-labelledby="hero-title">
      <div className="hero__bg" aria-hidden="true">
        <Patterns className="hero__pat" beam={250} />
        <div className="hero__horizon" />
      </div>

      <div className="wrap hero__grid">
        <div className="hero__copy">
          <p className="eyebrow hero__eyebrow"><Pin />{HERO.eyebrow}</p>
          <KineticTitle id="hero-title" text={heading} accentFrom={custom ? undefined : HERO.accentFrom} className="h-display hero__title" />
          <p className="hero__lead">{subtitle?.trim() || HERO.lead}</p>
          <div className="hero__cta">
            <a ref={primary} href="#kontakt" className="btn btn--primary" onPointerDown={ripple}>
              {HERO.ctaPrimary}
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </a>
            <a href="#oferta" className="btn" onPointerDown={ripple}>{HERO.ctaSecondary}</a>
          </div>
          <p className="hero__line">
            <span>{HERO.line[0]}</span>
            <i aria-hidden="true">·</i>
            <span>{HERO.line[1]}</span>
          </p>
        </div>

        <div className="hero__visual">
          <Portrait mode="hero" alt={ABOUT.photoAlt} planets={planets} />
        </div>
      </div>

      <a className="hero__scroll" href="#oferta" aria-label="Przewiń do oferty">
        <span aria-hidden="true">przewiń</span>
        <i aria-hidden="true" />
      </a>
    </section>
  );
}
