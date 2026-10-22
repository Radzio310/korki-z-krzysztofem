"use client";

import React from "react";
import { ensureGsap, reducedMotion } from "@/lib/motion";

/* Kursor-kreda: mała kropka i pierścień, który dogania ją z opóźnieniem,
   puchnie nad tym, co klikalne, i zamienia się w „pisak” nad tablicą. Tylko precyzyjny wskaźnik. */
export default function Cursor() {
  const dot = React.useRef<HTMLDivElement>(null);
  const ring = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (reducedMotion() || !matchMedia("(pointer: fine)").matches) return;
    const d = dot.current, r = ring.current;
    if (!d || !r) return;
    const { gsap } = ensureGsap();
    document.documentElement.classList.add("has-cursor");
    const dx = gsap.quickTo(d, "x", { duration: 0.08, ease: "power3" });
    const dy = gsap.quickTo(d, "y", { duration: 0.08, ease: "power3" });
    const rx = gsap.quickTo(r, "x", { duration: 0.45, ease: "power3" });
    const ry = gsap.quickTo(r, "y", { duration: 0.45, ease: "power3" });
    let seen = false;
    const move = (e: PointerEvent) => {
      if (!seen) {
        seen = true;
        gsap.set([d, r], { x: e.clientX, y: e.clientY });
        document.documentElement.classList.add("cursor-on");
      }
      dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY);
      const t = e.target as HTMLElement;
      const board = !!t.closest?.(".board__canvas");
      const hot = !board && !!t.closest?.("a, button, [role='radio'], [role='option'], input, textarea, label, .rv, .tl__card");
      r.dataset.state = board ? "board" : hot ? "hot" : "";
      d.dataset.state = board ? "board" : "";
    };
    const down = () => r.classList.add("is-down");
    const up = () => r.classList.remove("is-down");
    const leave = () => { d.style.opacity = r.style.opacity = "0"; };
    const enter = () => { d.style.opacity = r.style.opacity = "1"; };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    document.addEventListener("pointerleave", leave);
    document.addEventListener("pointerenter", enter);
    return () => {
      document.documentElement.classList.remove("has-cursor", "cursor-on");
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      document.removeEventListener("pointerleave", leave);
      document.removeEventListener("pointerenter", enter);
    };
  }, []);

  return (
    <>
      <div ref={ring} className="cur cur__ring" aria-hidden="true" />
      <div ref={dot} className="cur cur__dot" aria-hidden="true" />
      <style>{`
        .cur { position: fixed; left: 0; top: 0; z-index: 200; pointer-events: none; opacity: 0; transition: opacity .3s; }
        .has-cursor.cursor-on .cur { opacity: 1; }
        .cur__dot { width: 8px; height: 8px; margin: -4px 0 0 -4px; border-radius: 50%; background: var(--accent); }
        .cur__dot[data-state="board"] { width: 4px; height: 4px; margin: -2px 0 0 -2px; background: var(--board-ink); }
        .cur__ring { width: 38px; height: 38px; margin: -19px 0 0 -19px; border-radius: 50%; border: 1.5px solid color-mix(in oklab, var(--accent) 60%, transparent); transition: width .35s var(--ease-spring), height .35s var(--ease-spring), margin .35s var(--ease-spring), background .3s, border-color .3s, opacity .3s; }
        .cur__ring[data-state="hot"] { width: 64px; height: 64px; margin: -32px 0 0 -32px; background: color-mix(in oklab, var(--accent) 12%, transparent); border-color: transparent; }
        .cur__ring[data-state="board"] { width: 22px; height: 22px; margin: -11px 0 0 -11px; border-style: dashed; border-color: var(--board-ink-soft); }
        .cur__ring.is-down { width: 26px; height: 26px; margin: -13px 0 0 -13px; }
        @media (pointer: coarse) { .cur { display: none; } }
      `}</style>
    </>
  );
}
