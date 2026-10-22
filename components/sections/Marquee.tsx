"use client";

import React from "react";
import { ensureGsap, reducedMotion } from "@/lib/motion";
import "./marquee.css";

/* Taśma tematów: płynie sama, przyspiesza i przechyla się razem z prędkością przewijania,
   a najechany temat zatrzymuje swój rząd. */
export default function Marquee({ items }: { items: string[] }) {
  const root = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = root.current;
    if (!el || reducedMotion()) return;
    const { gsap, ScrollTrigger } = ensureGsap();
    const rows = Array.from(el.querySelectorAll<HTMLElement>(".mq__track"));
    const tweens = rows.map((r, i) =>
      gsap.to(r, { xPercent: i % 2 ? 0 : -50, startAt: { xPercent: i % 2 ? -50 : 0 }, duration: 38 + i * 6, ease: "none", repeat: -1 }),
    );
    const hovered = new Set<gsap.core.Tween>();
    let lastMove = 0;
    let skewed = false;
    const skewTo = gsap.quickTo(el, "--skew", { duration: 0.5, ease: "power3" });
    const st = ScrollTrigger.create({
      trigger: el, start: "top bottom", end: "bottom top",
      onUpdate: (self) => {
        const v = self.getVelocity();
        lastMove = performance.now();
        skewed = true;
        const boost = 1 + Math.min(4, Math.abs(v) / 600);
        if (Math.abs(v) > 40) tweens.forEach((t) => { if (!hovered.has(t)) t.timeScale((v < 0 ? -1 : 1) * boost); });
        skewTo(Math.max(-8, Math.min(8, v / -260)));
      },
    });
    /* po zrywie wracamy łagodnie do spokojnego tempa (z zachowaniem kierunku) */
    const settle = () => {
      if (skewed && performance.now() - lastMove > 140) { skewTo(0); skewed = false; }
      tweens.forEach((t) => {
        if (hovered.has(t)) return;
        const ts = t.timeScale();
        const target = ts < 0 ? -1 : 1;
        t.timeScale(ts + (target - ts) * 0.05);
      });
    };
    gsap.ticker.add(settle);
    const pauseRow = (e: Event) => {
      const row = (e.currentTarget as HTMLElement).dataset.row;
      const t = tweens[Number(row)];
      if (!t) return;
      if (e.type === "pointerenter") {
        hovered.add(t);
        gsap.to(t, { timeScale: 0.0001, duration: 0.6 });
      } else {
        gsap.to(t, { timeScale: 1, duration: 0.6, onComplete: () => { hovered.delete(t); } });
      }
    };
    const lanes = Array.from(el.querySelectorAll<HTMLElement>(".mq__lane"));
    lanes.forEach((l) => { l.addEventListener("pointerenter", pauseRow); l.addEventListener("pointerleave", pauseRow); });
    return () => {
      gsap.ticker.remove(settle);
      st.kill();
      tweens.forEach((t) => t.kill());
      lanes.forEach((l) => { l.removeEventListener("pointerenter", pauseRow); l.removeEventListener("pointerleave", pauseRow); });
    };
  }, [items]);

  const half = Math.ceil(items.length / 2);
  const rows = [items, [...items.slice(half), ...items.slice(0, half)]];

  return (
    <div ref={root} className="mq" aria-label={`Tematy: ${items.join(", ")}`}>
      {rows.map((row, ri) => (
        <div className={`mq__lane mq__lane--${ri}`} key={ri} data-row={ri} aria-hidden="true">
          <div className="mq__track">
            {[0, 1].map((dup) => (
              <div className="mq__set" key={dup}>
                {row.map((t, i) => (
                  <span className="mq__item" key={`${dup}-${i}`}>
                    <span className="mq__txt">{t}</span>
                    <span className="mq__dot">{["π", "∑", "√", "Δ", "∞", "∫"][i % 6]}</span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
