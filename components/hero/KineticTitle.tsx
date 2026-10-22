"use client";

import React from "react";
import { ensureGsap, reducedMotion } from "@/lib/motion";

/* Żywy nagłówek: litery wpadają na miejsce sprężyną, a potem „oddychają” pod kursorem —
   litera najbliżej wskaźnika pogrubia się i poszerza (oś wght/wdth kroju zmiennego).
   Słowa nie łamią się w środku, a czytnik ekranu dostaje całe zdanie. */
export default function KineticTitle({ text, className = "", as: Tag = "h1" }: { text: string; className?: string; as?: "h1" | "h2" }) {
  const ref = React.useRef<HTMLHeadingElement>(null);
  const words = React.useMemo(() => text.split(/\s+/).filter(Boolean), [text]);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const chars = Array.from(el.querySelectorAll<HTMLElement>(".kt__c"));
    if (reducedMotion()) return;
    const { gsap } = ensureGsap();
    gsap.fromTo(
      chars,
      { yPercent: 110, rotate: () => gsap.utils.random(-18, 18), opacity: 0, "--w": 300 },
      { yPercent: 0, rotate: 0, opacity: 1, "--w": 720, duration: 1.1, ease: "elastic.out(1, 0.62)", stagger: { each: 0.035, from: "start" }, delay: 0.15,
        onComplete: () => { gsap.to(chars, { "--w": 700, duration: 0.6, ease: "power2.out" }); } },
    );

    if (!matchMedia("(pointer: fine)").matches) return;
    let raf = 0;
    let mx = -9999, my = -9999;
    const centers = () => chars.map((c) => {
      const r = c.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
    let cache = centers();
    const loop = () => {
      chars.forEach((c, i) => {
        const d = Math.hypot(mx - cache[i].x, my - cache[i].y);
        const t = Math.max(0, 1 - d / 260);
        const ease = t * t * (3 - 2 * t);
        c.style.setProperty("--w", String(Math.round(700 + ease * 100)));
        c.style.setProperty("--s", String(Math.round(100 - ease * 22)));
        c.style.setProperty("--lift", `${(-ease * 8).toFixed(2)}px`);
      });
      raf = 0;
    };
    const move = (e: PointerEvent) => {
      mx = e.clientX; my = e.clientY;
      if (!raf) raf = requestAnimationFrame(loop);
    };
    const refresh = () => { cache = centers(); };
    const leave = () => { mx = my = -9999; if (!raf) raf = requestAnimationFrame(loop); };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("scroll", refresh, { passive: true });
    window.addEventListener("resize", refresh);
    document.addEventListener("pointerleave", leave);
    const t = window.setTimeout(refresh, 1600);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("scroll", refresh);
      window.removeEventListener("resize", refresh);
      document.removeEventListener("pointerleave", leave);
      window.clearTimeout(t);
      cancelAnimationFrame(raf);
    };
  }, [text]);

  let n = 0;
  return (
    <Tag ref={ref} className={`kt ${className}`} aria-label={text}>
      {words.map((w, wi) => (
        <span className="kt__w" key={wi} aria-hidden="true">
          {Array.from(w).map((ch) => {
            const i = n++;
            return (
              <span className="kt__m" key={i}>
                <span className="kt__c" style={{ "--i": i } as React.CSSProperties}>{ch}</span>
              </span>
            );
          })}
          {wi < words.length - 1 ? " " : null}
        </span>
      ))}
    </Tag>
  );
}
