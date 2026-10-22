"use client";

import React from "react";
import "./rolling.css";

/* Liczba jak licznik w kasie: każda cyfra to bęben, który przewija się do nowej wartości.
   Zmiana ceny jest wtedy RUCHEM, a nie podmianą tekstu. */
export default function RollingNumber({ value, suffix = "", className = "" }: { value: string; suffix?: string; className?: string }) {
  const chars = Array.from(value);
  return (
    <span className={`roll ${className}`} aria-label={`${value}${suffix}`} role="text">
      {chars.map((ch, i) => {
        const d = Number(ch);
        const isDigit = ch >= "0" && ch <= "9";
        const key = `${chars.length - i}`;
        return isDigit ? (
          <span className="roll__col" key={key} aria-hidden="true">
            <span className="roll__drum" style={{ "--d": d } as React.CSSProperties}>
              {Array.from({ length: 10 }).map((_, n) => <span key={n}>{n}</span>)}
            </span>
          </span>
        ) : (
          <span className="roll__sep" key={`${key}${ch}`} aria-hidden="true">{ch === " " ? " " : ch}</span>
        );
      })}
      {suffix ? <span className="roll__suf" aria-hidden="true">{suffix}</span> : null}
    </span>
  );
}
