"use client";

import React from "react";
import { reducedMotion } from "@/lib/motion";
import "./kinetic.css";

/* Żywy nagłówek. Litery wpadają na miejsce (CSS — działa od pierwszej klatki, bez czekania
   na JS), a potem reagują na kursor: litery najbliżej wskaźnika unoszą się i nabierają barwy
   akcentu. ZASADA: żadna litera nie zmienia szerokości, wagi ani osi kroju — ruch to wyłącznie
   `translate`/`rotate` i kolor na pudełku o stałym rozmiarze, więc łamanie wierszy nigdy
   nie drgnie. `reveal="view"` = wejście dopiero, gdy nagłówek wjedzie na ekran.
   Słowa od `accentFrom` dostają kolor akcentu i podkreślenie-orbitę jak w logo.
   Czytnik ekranu dostaje całe zdanie przez aria-label. Bez JS tekst jest po prostu widoczny. */
export default function KineticTitle({
  text, className = "", as: Tag = "h1", reveal = "load", accentFrom, id,
}: {
  text: string;
  className?: string;
  as?: "h1" | "h2";
  reveal?: "load" | "view";
  accentFrom?: number;
  id?: string;
}) {
  const ref = React.useRef<HTMLHeadingElement>(null);
  const words = React.useMemo(() => text.split(/\s+/).filter(Boolean), [text]);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const chars = Array.from(el.querySelectorAll<HTMLElement>(".kt__c"));
    let visible = reveal === "load";

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (e.isIntersecting) el.dataset.in = "1";
    }, { rootMargin: "0px 0px -10% 0px" });
    io.observe(el);
    if (reducedMotion()) el.dataset.in = "1";

    if (reducedMotion() || !matchMedia("(pointer: fine)").matches) return () => io.disconnect();

    /* Środki liter liczone WZGLĘDEM nagłówka — raz (i po zmianie rozmiaru). Przy ruchu myszy
       czytamy tylko jeden prostokąt nagłówka, nie kilkadziesiąt prostokątów liter. */
    let offs: { x: number; y: number }[] = [];
    const last = new Float32Array(chars.length);
    const measure = () => {
      const h = el.getBoundingClientRect();
      offs = chars.map((c) => {
        const r = c.getBoundingClientRect();
        return { x: r.left - h.left + r.width / 2, y: r.top - h.top + r.height / 2 };
      });
    };
    let raf = 0;
    let mx = -9999, my = -9999;
    const loop = () => {
      raf = 0;
      if (!offs.length) measure();
      const h = el.getBoundingClientRect();
      const rx = mx - h.left, ry = my - h.top;
      for (let i = 0; i < chars.length; i++) {
        const d = Math.hypot(rx - offs[i].x, ry - offs[i].y);
        const t = Math.max(0, 1 - d / 220);
        const k = Math.round(t * t * (3 - 2 * t) * 100) / 100;
        if (k === last[i]) continue; // dotykamy tylko liter, które naprawdę się zmieniają
        last[i] = k;
        chars[i].style.setProperty("--k", String(k));
      }
    };
    const move = (e: PointerEvent) => {
      if (!visible) return;
      mx = e.clientX; my = e.clientY;
      if (!raf) raf = requestAnimationFrame(loop);
    };
    const leave = () => { mx = my = -9999; if (!raf) raf = requestAnimationFrame(loop); };
    const ro = new ResizeObserver(() => { offs = []; });
    ro.observe(el);
    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerleave", leave);
    return () => {
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", leave);
      cancelAnimationFrame(raf);
    };
  }, [text, reveal]);

  let n = 0;
  const accentStart = accentFrom ?? words.length;

  return (
    <Tag ref={ref} id={id} className={`kt ${className}`} aria-label={text} data-reveal-mode={reveal}>
      {words.map((w, wi) => {
        const accent = wi >= accentStart;
        const last = wi === words.length - 1;
        return (
          <React.Fragment key={wi}>
            <span className={`kt__w ${accent ? "kt__w--accent" : ""}`} aria-hidden="true">
              {Array.from(w).map((ch) => {
                const i = n++;
                return (
                  <span className="kt__m" key={i}>
                    <span className="kt__c" style={{ "--i": i, "--rot": `${((i * 37) % 31) - 15}deg`, "--tw": `${((i * 53) % 9) - 4}deg` } as React.CSSProperties}>{ch}</span>
                  </span>
                );
              })}
              {accent && last ? (
                <svg className="kt__orbit" viewBox="0 0 300 24" preserveAspectRatio="none" aria-hidden="true">
                  <path pathLength={1} d="M4 18 C 70 4, 200 2, 296 12" />
                </svg>
              ) : null}
            </span>
            {last ? null : " "}
          </React.Fragment>
        );
      })}
    </Tag>
  );
}
