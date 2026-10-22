"use client";

import React from "react";
import { reducedMotion } from "@/lib/motion";

type Theme = "dark" | "light";

/* Przełącznik motywu: nowy motyw rozlewa się kołem z miejsca kliknięcia
   (View Transitions). Bez wsparcia — zwykłe przejście kolorów z tokenów. */
export default function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = React.useState<Theme>("dark");

  React.useEffect(() => {
    setTheme((document.documentElement.dataset.theme as Theme) || "dark");
  }, []);

  const toggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    const apply = () => {
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem("kk-theme", next); } catch { /* tryb prywatny */ }
      setTheme(next);
    };
    const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };
    if (!doc.startViewTransition || reducedMotion()) return apply();
    const x = e.clientX || window.innerWidth - 40;
    const y = e.clientY || 40;
    const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const vt = doc.startViewTransition(apply);
    vt.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
        { duration: 700, easing: "cubic-bezier(.16,1,.3,1)", pseudoElement: "::view-transition-new(root)" },
      );
    });
  };

  const light = theme === "light";
  return (
    <button
      type="button"
      className={`theme-toggle ${className}`}
      onClick={toggle}
      aria-label={light ? "Włącz ciemny motyw" : "Włącz jasny motyw"}
      title={light ? "Ciemny motyw" : "Jasny motyw"}
      data-light={light ? "1" : "0"}
    >
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <mask id="tt-moon">
          <rect width="24" height="24" fill="#fff" />
          <circle className="tt-cut" cx="17" cy="7" r="6" fill="#000" />
        </mask>
        <circle className="tt-core" cx="12" cy="12" r="6" fill="currentColor" mask="url(#tt-moon)" />
        <g className="tt-rays" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M12 1.5v2.2M12 20.3v2.2M1.5 12h2.2M20.3 12h2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6" />
        </g>
      </svg>
    </button>
  );
}
