"use client";

import React from "react";

/* Gwiazdki: do odczytu (ułamkowe wypełnienie) albo do wyboru (najechanie podgląda ocenę). */
export default function Stars({ value, onChange, size = 20 }: { value: number; onChange?: (v: number) => void; size?: number }) {
  const [hover, setHover] = React.useState<number | null>(null);
  const shown = hover ?? value;
  const interactive = !!onChange;
  return (
    <span
      className={`stars ${interactive ? "stars--pick" : ""}`}
      role={interactive ? "radiogroup" : "img"}
      aria-label={interactive ? "Ocena" : `Ocena ${value.toFixed(1)} na 5`}
      onPointerLeave={() => setHover(null)}
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const fill = Math.max(0, Math.min(1, shown - (n - 1)));
        const star = (
          <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
            <defs>
              <linearGradient id={`st-${n}-${Math.round(fill * 100)}`}>
                <stop offset={`${fill * 100}%`} stopColor="var(--gold)" />
                <stop offset={`${fill * 100}%`} stopColor="var(--border-strong)" />
              </linearGradient>
            </defs>
            <path d="M12 2.6l2.9 6 6.5.8-4.8 4.5 1.2 6.5L12 17.3l-5.8 3.1 1.2-6.5L2.6 9.4l6.5-.8z" fill={`url(#st-${n}-${Math.round(fill * 100)})`} />
          </svg>
        );
        return interactive ? (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} na 5`}
            className={`stars__btn ${n <= shown ? "is-on" : ""}`}
            onPointerEnter={() => setHover(n)}
            onClick={() => onChange?.(n)}
          >
            {star}
          </button>
        ) : (
          <span key={n} className="stars__s">{star}</span>
        );
      })}
    </span>
  );
}
