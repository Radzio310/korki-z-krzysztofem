"use client";

import React from "react";
import { ensureGsap, reducedMotion } from "@/lib/motion";
import "./patterns.css";

/* Wzory ze starej strony jako tło niskiej intensywności — z latarką.
   Warstwa przygaszona leży stale; nad nią krąg „światła pod wodą”, w którym wzory świecą.
   Krąg jedzie za kursorem, a sama treść kręgu jedzie w przeciwną stronę — dzięki temu
   wzory stoją w miejscu, a animujemy wyłącznie transform (bez przemalowywania maski).
   Bez myszy światło dryfuje samo, w losowych odstępach, i skacze tam, gdzie stukniesz.
   reduce motion: światło stoi w jednym miejscu. */
export default function Patterns({ className = "", beam = 240, interactive = true }: { className?: string; beam?: number; interactive?: boolean }) {
  const root = React.useRef<HTMLDivElement>(null);
  const lamp = React.useRef<HTMLDivElement>(null);
  const inner = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = root.current;
    const lp = lamp.current;
    const inn = inner.current;
    if (!el || !lp || !inn) return;
    const { gsap } = ensureGsap();
    let w = el.clientWidth, h = el.clientHeight;
    const size = () => { el.style.setProperty("--pw", `${w}px`); el.style.setProperty("--ph", `${h}px`); };
    size();
    const place = (x: number, y: number) => {
      gsap.set(lp, { x: x - beam, y: y - beam });
      gsap.set(inn, { x: beam - x, y: beam - y });
    };
    const start = { x: w * 0.72, y: h * 0.34 };
    place(start.x, start.y);
    const ro = new ResizeObserver(() => { w = el.clientWidth; h = el.clientHeight; size(); });
    ro.observe(el);
    if (reducedMotion() || !interactive) return () => ro.disconnect();

    const pos = { x: start.x, y: start.y };
    const sync = () => {
      gsap.set(lp, { x: pos.x - beam, y: pos.y - beam });
      gsap.set(inn, { x: beam - pos.x, y: beam - pos.y });
    };
    let tween: gsap.core.Tween | null = null;
    const go = (x: number, y: number, duration: number, ease = "power3.out") => {
      tween?.kill();
      tween = gsap.to(pos, { x, y, duration, ease, onUpdate: sync });
    };

    let visible = true;
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { rootMargin: "100px" });
    io.observe(el);

    const fine = matchMedia("(pointer: fine)").matches;
    let lastInput = 0;
    let timer = 0;
    /* dryf: losowy cel, losowy czas, losowa pauza — nigdy ta sama pętla */
    /* W trakcie przewijania światło nie dryfuje: przewijanie ma całą klatkę dla siebie. */
    let lastScroll = 0;
    const onScroll = () => { lastScroll = performance.now(); };
    window.addEventListener("scroll", onScroll, { passive: true });
    const drift = () => {
      const now = performance.now();
      if (visible && now - lastInput > 2600 && now - lastScroll > 700) {
        go(gsap.utils.random(w * 0.12, w * 0.9), gsap.utils.random(h * 0.12, h * 0.82), gsap.utils.random(3.2, 6.4), "sine.inOut");
      }
      timer = window.setTimeout(drift, gsap.utils.random(3600, 7800));
    };
    timer = window.setTimeout(drift, 2400);

    /* Ruch myszy: prostokąt czytany raz na klatkę, nie przy każdym zdarzeniu. */
    let mraf = 0, mx = 0, my = 0;
    const onMove = (e: PointerEvent) => {
      if (!visible || e.pointerType !== "mouse") return;
      mx = e.clientX; my = e.clientY;
      lastInput = performance.now();
      if (mraf) return;
      mraf = requestAnimationFrame(() => {
        mraf = 0;
        const r = el.getBoundingClientRect();
        go(mx - r.left, my - r.top, 0.9);
      });
    };
    const onTap = (e: PointerEvent) => {
      if (e.pointerType === "mouse") return;
      const r = el.getBoundingClientRect();
      const y = e.clientY - r.top;
      if (y < 0 || y > r.height) return;
      lastInput = performance.now();
      go(e.clientX - r.left, y, 1.1);
    };
    if (fine) window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onTap, { passive: true });
    return () => {
      tween?.kill();
      io.disconnect();
      ro.disconnect();
      window.clearTimeout(timer);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onTap);
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(mraf);
    };
  }, [beam, interactive]);

  return (
    <div ref={root} className={`pat ${className}`} aria-hidden="true" style={{ "--lamp": `${beam * 2}px` } as React.CSSProperties}>
      <div className="pat__layer pat__dim" />
      <div ref={lamp} className="pat__lamp">
        <div className="pat__glow" />
        <div ref={inner} className="pat__inner">
          <div className="pat__layer pat__lit" />
        </div>
      </div>
    </div>
  );
}
