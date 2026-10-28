"use client";

import React from "react";
import { IMAGES, PORTRAIT_CIRCLE } from "@/content/site";
import { ensureGsap, reducedMotion } from "@/lib/motion";
import "./portrait.css";

/* Portret w kole — „bulaj”. Zdjęcie ma przezroczyste tło, a głowa wystaje ponad okrąg.
   Maska = okrąg ∪ prostokąt od dołu o wysokości --rise: gdy --rise rośnie, głowa wynurza się
   z koła jak z wody (zmarszczki na tafli przy krawędzi). W hero wynurza się po wejściu i chowa
   przy zjeździe w dół; w „O mnie” wynurza się znowu, sterowana przewijaniem.
   Wokół (tylko hero) orbita jak w logo z klikalnymi „planetami”. Para z kubka unosi się
   w losowych odstępach. Stuknięcie w portret = krótkie zanurzenie i powrót. */

export type Planet = { id: string; label: string; glyph: React.ReactNode; onClick: () => void };

const ORBIT = { rx: 55, ry: 15, tilt: -10 }; // w % szerokości sceny, kąt w stopniach

function orbitPoint(theta: number) {
  const { cx, cy } = PORTRAIT_CIRCLE;
  const x = ORBIT.rx * Math.cos(theta);
  const y = ORBIT.ry * Math.sin(theta);
  const t = (ORBIT.tilt * Math.PI) / 180;
  return { x: cx + x * Math.cos(t) - y * Math.sin(t), y: cy + 6 + x * Math.sin(t) + y * Math.cos(t), depth: Math.sin(theta) };
}

function arcPath(from: number, to: number) {
  const pts: string[] = [];
  for (let i = 0; i <= 48; i++) {
    const p = orbitPoint(from + ((to - from) * i) / 48);
    pts.push(`${i ? "L" : "M"}${p.x.toFixed(2)} ${p.y.toFixed(2)}`);
  }
  return pts.join(" ");
}
const BACK = arcPath(Math.PI, Math.PI * 2);
const FRONT = arcPath(0, Math.PI);

export default function Portrait({
  mode, src, alt, planets = [], className = "",
}: {
  mode: "hero" | "about";
  src?: string | null;
  alt: string;
  planets?: Planet[];
  className?: string;
}) {
  const stage = React.useRef<HTMLDivElement>(null);
  const [dip, setDip] = React.useState(0);
  const img = React.useRef<HTMLImageElement>(null);
  const custom = !!src;
  const base = planets.map((_, i) => -Math.PI / 2.4 + (i * Math.PI * 2) / Math.max(1, planets.length));

  /* Orbita: kąt rośnie powoli; planeta z przodu jest nad portretem, z tyłu — za nim. */
  React.useEffect(() => {
    const el = stage.current;
    if (!el || !planets.length || reducedMotion()) return;
    const { gsap } = ensureGsap();
    const nodes = Array.from(el.querySelectorAll<HTMLElement>(".pt__planet"));
    let angle = 0;
    let speed = 1;
    let target = 1;
    let visible = true;
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0 });
    io.observe(el);
    const hover = (on: boolean) => () => { target = on ? 0 : 1; };
    const enters = nodes.map((n) => { const f = hover(true); n.addEventListener("pointerenter", f); n.addEventListener("focus", f); return f; });
    const leaves = nodes.map((n) => { const f = hover(false); n.addEventListener("pointerleave", f); n.addEventListener("blur", f); return f; });
    const tick = (_t: number, dt: number) => {
      if (!visible || document.hidden) return;
      speed += (target - speed) * 0.06;
      angle += (dt / 1000) * speed * ((Math.PI * 2) / 46);
      nodes.forEach((n, i) => {
        const p = orbitPoint(base[i] + angle);
        n.style.setProperty("--px", p.x.toFixed(3));
        n.style.setProperty("--py", p.y.toFixed(3));
        n.style.setProperty("--depth", p.depth.toFixed(3));
        n.style.zIndex = p.depth > 0 ? "4" : "1";
      });
    };
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      io.disconnect();
      nodes.forEach((n, i) => {
        n.removeEventListener("pointerenter", enters[i]); n.removeEventListener("focus", enters[i]);
        n.removeEventListener("pointerleave", leaves[i]); n.removeEventListener("blur", leaves[i]);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planets.length]);

  /* Przewijanie. Hero: przy zjeździe portret odpływa i lekko maleje — sam transform, bez
     przeliczania maski w każdej klatce. „O mnie”: głowa wynurza się z koła RAZ, gdy portret
     wjedzie na ekran (maska animuje się 1,5 s, potem stoi — zero kosztu przy przewijaniu). */
  React.useEffect(() => {
    const el = stage.current;
    if (!el || custom || reducedMotion()) return;
    if (mode === "hero") {
      if (!matchMedia("(min-width: 900px)").matches) return;
      const { gsap } = ensureGsap();
      const ctx = gsap.context(() => {
        gsap.to(el, { yPercent: 8, scale: 0.94, ease: "none", scrollTrigger: { trigger: el, start: "center 45%", end: "bottom top", scrub: true } });
      }, el);
      return () => ctx.revert();
    }
    const im = img.current;
    if (!im) return;
    im.classList.add("is-under");
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      im.classList.remove("is-under");
      im.classList.add("is-rise");
      setDip((d) => d + 1);
    }, { rootMargin: "0px 0px -22% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [mode, custom]);

  /* Para nad kubkiem: każda smużka startuje w swoim losowym rytmie. */
  React.useEffect(() => {
    const el = stage.current;
    if (!el || custom || reducedMotion()) return;
    const curls = Array.from(el.querySelectorAll<SVGPathElement>(".pt__curl"));
    const timers: number[] = [];
    const puff = (c: SVGPathElement) => {
      c.classList.remove("is-on");
      void c.getBoundingClientRect();
      c.classList.add("is-on");
      timers.push(window.setTimeout(() => puff(c), 2600 + Math.random() * 4200));
    };
    curls.forEach((c, i) => timers.push(window.setTimeout(() => puff(c), 1800 + i * 700 + Math.random() * 1500)));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [custom]);

  const tap = () => {
    const el = img.current;
    if (!el || reducedMotion()) return;
    el.classList.remove("is-dip");
    void el.getBoundingClientRect();
    el.classList.add("is-dip");
    setDip((d) => d + 1);
  };

  const { cx, cy, r } = PORTRAIT_CIRCLE;
  return (
    <div className={`pt pt--${mode} ${custom ? "pt--custom" : ""} ${className}`}>
      <div
        ref={stage}
        className="pt__stage"
        style={{ "--cx": `${cx}%`, "--cy": `${cy}%`, "--r": `${r}%` } as React.CSSProperties}
      >
        {planets.length ? (
          <svg className="pt__ring pt__ring--back" viewBox="0 0 100 100" aria-hidden="true"><path pathLength={1} d={BACK} /></svg>
        ) : null}

        <div className="pt__photo" onClick={tap}>
          {custom ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="pt__custom" src={src!} alt={alt} loading={mode === "hero" ? "eager" : "lazy"} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              ref={img}
              className="pt__img"
              src={IMAGES.portrait.src}
              srcSet={IMAGES.portrait.srcSet}
              sizes={mode === "hero" ? "(max-width: 899px) 82vw, 560px" : "(max-width: 899px) 82vw, 480px"}
              width={IMAGES.portrait.w}
              height={IMAGES.portrait.h}
              alt={alt}
              loading={mode === "hero" ? "eager" : "lazy"}
              fetchPriority={mode === "hero" ? "high" : "auto"}
              decoding="async"
            />
          )}
        </div>

        {!custom ? (
          <svg className="pt__fx" viewBox="0 0 100 100" aria-hidden="true">
            <g className={`pt__ripples ${dip ? "is-on is-tap" : mode === "hero" ? "is-on" : ""}`} key={dip}>
              <ellipse className="pt__ripple pt__ripple--1" cx={cx} cy={cy - r + 0.6} rx="9" ry="1.6" />
              <ellipse className="pt__ripple pt__ripple--2" cx={cx} cy={cy - r + 0.6} rx="9" ry="1.6" />
            </g>
            <g className="pt__steam">
              <path className="pt__curl" d="M66.4 43.6 c -1.6 -2.4 1.6 -4 0 -6.6 s 1.4 -4 0 -6" />
              <path className="pt__curl" d="M69 44 c 1.4 -2.2 -1.4 -4 0 -6.2 s -1.2 -3.6 0 -5.6" />
              <path className="pt__curl" d="M71.6 43.6 c -1.2 -2 1.2 -3.4 0 -5.4 s 1 -3 0 -4.6" />
            </g>
          </svg>
        ) : null}

        {planets.length ? (
          <svg className="pt__ring pt__ring--front" viewBox="0 0 100 100" aria-hidden="true"><path pathLength={1} d={FRONT} /></svg>
        ) : null}

        {planets.map((p, i) => {
          const o = orbitPoint(base[i]);
          return (
            <button
              key={p.id}
              type="button"
              className="pt__planet"
              onClick={p.onClick}
              style={{ "--px": o.x.toFixed(3), "--py": o.y.toFixed(3), "--depth": o.depth.toFixed(3), "--bob": `${3.4 + i * 0.9}s`, zIndex: o.depth > 0 ? 4 : 1 } as React.CSSProperties}
            >
              <span className="pt__glyph" aria-hidden="true">{p.glyph}</span>
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
