import type React from "react";

/* Małe znaki do dymków-wyborów. Kolory z CSS (currentColor). */

export function Flask() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="kg">
      <path d="M9 3h6M10 3v6.2L4.6 18.4A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.4-2.6L14 9.2V3" />
      <path className="kg__liquid" d="M7.3 15h9.4l2 3.4a.9.9 0 0 1-.8 1.4H6.1a.9.9 0 0 1-.8-1.4z" />
      <circle className="kg__bubble kg__bubble--1" cx="10.5" cy="17" r=".9" />
      <circle className="kg__bubble kg__bubble--2" cx="13.6" cy="16.4" r=".7" />
    </svg>
  );
}

export function Pi() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="kg">
      <path d="M4.5 7.5c1.2-1.4 2.6-1.8 4-1.6h11" />
      <path d="M9.5 6v5.5c0 3-.9 5.8-3 7.5" />
      <path d="M15.2 6v9.6c0 2 .9 3.1 2.4 3.1 1 0 1.8-.5 2.4-1.4" />
    </svg>
  );
}

export function Pin() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="kg">
      <path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z" />
      <circle cx="12" cy="10" r="2.4" />
    </svg>
  );
}

export function Laptop() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="kg">
      <rect x="4.5" y="5" width="15" height="10.5" rx="1.6" />
      <path d="M2.5 19h19" />
      <path className="kg__blink" d="M9 10.2h3" />
    </svg>
  );
}

export function Either() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="kg">
      <path d="M4 7h11l-3-3M20 17H9l3 3" />
    </svg>
  );
}

export function CalendarGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="kg">
      <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
      <circle className="kg__dot" cx="15.5" cy="15" r="1.6" />
    </svg>
  );
}

export function CallBack() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="kg">
      <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25c1.1.37 2.3.57 3.6.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z" />
      <path d="M15 3.5h5.5V9M20.5 3.5 14 10" />
    </svg>
  );
}

/* Tarcza zegara: łuk = część godziny (45 min = ¾), ponad godzinę — drugi, wewnętrzny łuk.
   Rysowanie łuku animuje stroke-dashoffset (atrybut SVG) — wyjątek od zasady
   transform/opacity: to jedyny sposób, żeby łuk „narysował się” bez maski. */
export function Clock({ minutes }: { minutes: number }) {
  const a = Math.min(minutes, 60) / 60;
  const b = Math.max(0, Math.min(minutes - 60, 60)) / 60;
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="kg kg--clock">
      <circle className="kg__track" cx="12" cy="12" r="9" />
      <circle className="kg__arc" cx="12" cy="12" r="9" pathLength={100} style={{ "--len": a * 100 } as React.CSSProperties} />
      {b > 0 ? <circle className="kg__arc kg__arc--in" cx="12" cy="12" r="5.2" pathLength={100} style={{ "--len": b * 100 } as React.CSSProperties} /> : null}
    </svg>
  );
}

export function Pencil() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="kg kg--pencil">
      <path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19z" />
    </svg>
  );
}
