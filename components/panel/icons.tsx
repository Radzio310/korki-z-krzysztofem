/* Ikony panelu — jedna kreska (1.6), currentColor, siatka 24. Bez emoji. */
import React from "react";

const P = {
  dzis: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  rezerwacje: <><rect x="3.5" y="5" width="17" height="15" rx="2.5" /><path d="M3.5 9.5h17M8 3v4M16 3v4M8 13.5h3M8 16.5h6" /></>,
  dostepnosc: <><path d="M4 5h16M4 10h16M4 15h16M4 20h16" opacity=".35" /><path d="M7 8.5h5v3.5H7zM12 13.5h6v3.5h-6z" /></>,
  wiecej: <><circle cx="5.5" cy="12" r="1.3" /><circle cx="12" cy="12" r="1.3" /><circle cx="18.5" cy="12" r="1.3" /></>,
  oferta: <><path d="M6 3.5h9l4 4v13H6z" /><path d="M15 3.5v4h4M9 12h7M9 15.5h7M9 8.5h3" /></>,
  strona: <><rect x="3" y="4.5" width="18" height="15" rx="2.5" /><path d="M3 8.5h18M7 13h6M7 16h4" /></>,
  opinie: <><path d="M12 4l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 16.4l-4.8 2.5.9-5.4-3.9-3.8 5.4-.8z" /></>,
  zadania: <><path d="M5 19.5V6.5a2 2 0 012-2h10a2 2 0 012 2v13" /><path d="M9 9.5l2 2 4-4M9 15h6" /></>,
  quiz: <><circle cx="12" cy="13" r="7.5" /><path d="M12 9v4l2.5 1.5M10 2.5h4M18.5 6l1.5-1.5" /></>,
  wiadomosci: <><path d="M4 6.5h16v11H4z" /><path d="M4.5 7l7.5 6 7.5-6" /></>,
  wyloguj: <><path d="M10 4.5H6.5a2 2 0 00-2 2v11a2 2 0 002 2H10" /><path d="M14 8l4 4-4 4M18 12H9.5" /></>,
  strona_ext: <><path d="M14 4.5h5.5V10M19.5 4.5L11 13" /><path d="M17 14v4.5a1 1 0 01-1 1H5.5a1 1 0 01-1-1V8a1 1 0 011-1H10" /></>,
  zamknij: <><path d="M6 6l12 12M18 6L6 18" /></>,
  odswiez: <><path d="M19.5 12a7.5 7.5 0 11-2.2-5.3" /><path d="M19.5 4.5v4h-4" /></>,
  dalej: <><path d="M9 6l6 6-6 6" /></>,
} as const;
export type IconName = keyof typeof P;

export function Icon({ name, size }: { name: IconName; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {P[name]}
    </svg>
  );
}

/* Oficjalny znak WK na krążku papieru (logo ma przezroczyste tło i ciemną tarczę). */
export function Mark({ size = 48, className = "" }: { size?: number; className?: string }) {
  return (
    <span className={`pn-mark ${className}`} style={{ "--mk": `${size}px` } as React.CSSProperties}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={size > 90 ? "/images/korki-logo-500.webp" : "/images/korki-logo-160.webp"} alt="" width={size} height={size} decoding="async" />
    </span>
  );
}
