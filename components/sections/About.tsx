"use client";

import React from "react";
import type { Content } from "@/lib/types";
import { ensureGsap, reducedMotion, useReveal } from "@/lib/motion";
import "./about.css";

const DEFAULT_BODY =
  "Tłumaczę tak długo, aż zaczniesz rozumieć — nie tylko zapamiętywać wzory. Każde spotkanie zaczynamy od tego, co Cię dziś blokuje, i kończymy zadaniem, które zrobisz już sam.";

const VALUES = [
  { k: "Spokój", v: "Bez oceniania i bez pośpiechu. Błąd to informacja, nie porażka." },
  { k: "Zrozumienie", v: "Najpierw „dlaczego”, potem „jak”. Wzór staje się oczywisty." },
  { k: "Plan", v: "Wiesz, co robimy na każdej lekcji i dokąd zmierzamy." },
];

/* Licznik, który dolicza do wartości po wejściu na ekran. Tekst, który nie jest liczbą, wpada bez liczenia. */
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
      gsap.to(o, {
        v: target, duration: 1.8, ease: "power3.out",
        onUpdate: () => { el.textContent = `${pre}${o.v.toFixed(dec).replace(".", ",")}${post}`; },
      });
    }, { threshold: 0.6 });
    io.observe(el);
    return () => io.disconnect();
  }, [value]);
  return <span ref={ref}>{value}</span>;
}

export default function About({ content }: { content: Content }) {
  const root = useReveal<HTMLElement>();
  const photo = React.useRef<HTMLDivElement>(null);

  /* Zdjęcie przechyla się za kursorem, a odblask idzie za nim po szkle. */
  React.useEffect(() => {
    const el = photo.current;
    if (!el || reducedMotion() || !matchMedia("(pointer: fine)").matches) return;
    const { gsap } = ensureGsap();
    const rx = gsap.quickTo(el, "rotateX", { duration: 0.8, ease: "power3" });
    const ry = gsap.quickTo(el, "rotateY", { duration: 0.8, ease: "power3" });
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      ry((x - 0.5) * 14);
      rx((0.5 - y) * 12);
      el.style.setProperty("--glow-x", `${x * 100}%`);
      el.style.setProperty("--glow-y", `${y * 100}%`);
    };
    const leave = () => { rx(0); ry(0); };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => { el.removeEventListener("pointermove", move); el.removeEventListener("pointerleave", leave); };
  }, []);

  /* Parallax warstw w sekcji. */
  React.useEffect(() => {
    const el = root.current;
    if (!el || reducedMotion()) return;
    const { gsap } = ensureGsap();
    const ctx = gsap.context(() => {
      gsap.to(".about__ring", { rotate: 120, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true } });
      gsap.fromTo(".about__photowrap", { yPercent: 8 }, { yPercent: -8, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true } });
    }, el);
    return () => ctx.revert();
  }, [root]);

  const title = content.about_title?.trim() || "Cześć, jestem Krzysztof.";
  const body = content.about_body?.trim() || DEFAULT_BODY;

  return (
    <section id="o-mnie" ref={root} className="section about">
      <div className="wrap about__grid">
        <div className="about__photowrap" data-reveal>
          <div className="about__ring" aria-hidden="true">
            <svg viewBox="0 0 200 200">
              <defs><path id="about-circle" d="M100 100 m -86 0 a 86 86 0 1 1 172 0 a 86 86 0 1 1 -172 0" /></defs>
              <text><textPath href="#about-circle">korki z krzysztofem · krok po kroku · bez stresu · </textPath></text>
            </svg>
          </div>
          <div ref={photo} className="about__photo">
            {content.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={content.photo_url} alt="Krzysztof" loading="lazy" />
            ) : (
              <div className="about__mono" aria-hidden="true">
                <svg viewBox="0 0 200 240">
                  <defs>
                    <clipPath id="about-k"><text x="100" y="190" textAnchor="middle">K</text></clipPath>
                  </defs>
                  <g clipPath="url(#about-k)">
                    <rect width="200" height="240" className="about__mono-bg" />
                    <path className="about__wave about__wave--1" d="M0 120 Q 25 105 50 120 T 100 120 T 150 120 T 200 120 T 250 120 T 300 120 T 350 120 T 400 120 V 240 H 0 Z" />
                    <path className="about__wave about__wave--2" d="M0 132 Q 25 118 50 132 T 100 132 T 150 132 T 200 132 T 250 132 T 300 132 T 350 132 T 400 132 V 240 H 0 Z" />
                  </g>
                </svg>
              </div>
            )}
            <span className="about__glare" aria-hidden="true" />
          </div>
        </div>

        <div className="about__copy">
          <span className="eyebrow" data-reveal>O mnie</span>
          <h2 className="h-section" data-reveal style={{ "--d": "80ms" } as React.CSSProperties}>{title}</h2>
          <p className="lead" data-reveal style={{ "--d": "160ms" } as React.CSSProperties}>{body}</p>

          {content.about_facts?.length ? (
            <dl className="about__facts" data-reveal style={{ "--d": "240ms" } as React.CSSProperties}>
              {content.about_facts.slice(0, 4).map((f, i) => (
                <div key={i} className="about__fact">
                  <dt><Counter value={f.value} /></dt>
                  <dd>{f.label}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          <ul className="about__values">
            {VALUES.map((v, i) => (
              <li key={v.k} data-reveal style={{ "--d": `${300 + i * 90}ms` } as React.CSSProperties}>
                <strong>{v.k}</strong>
                <span>{v.v}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
