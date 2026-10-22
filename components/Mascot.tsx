"use client";

import React from "react";
import "./mascot.css";

/* Pi — ośmiornica-przewodniczka. Osiem ramion (osiem rzeczy naraz), okulary i kreda.
   Mówi w 1. osobie, jednym zdaniem. Oczy idą za kursorem, mruga, a nastrój zmienia
   pozę ramion — wszystko w CSS (transform/opacity), więc chodzi na kompozytorze. */

export type MascotMood = "idle" | "happy" | "think" | "wow" | "wave" | "sad";

type Props = {
  mood?: MascotMood;
  say?: React.ReactNode;
  size?: number;
  side?: "left" | "right";
  className?: string;
  follow?: boolean;
};

export default function Mascot({ mood = "idle", say, size = 140, side = "right", className = "", follow = true }: Props) {
  const ref = React.useRef<HTMLDivElement>(null);
  const uid = React.useId().replace(/:/g, "");

  React.useEffect(() => {
    if (!follow) return;
    const el = ref.current;
    if (!el) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height * 0.42;
        const dx = Math.max(-1, Math.min(1, (e.clientX - cx) / 400));
        const dy = Math.max(-1, Math.min(1, (e.clientY - cy) / 400));
        el.style.setProperty("--eye-x", `${dx * 3.2}px`);
        el.style.setProperty("--eye-y", `${dy * 2.6}px`);
        el.style.setProperty("--tilt", `${dx * 4}deg`);
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [follow]);

  const arms = [
    { x: 34, r: -38 }, { x: 44, r: -22 }, { x: 54, r: -10 }, { x: 62, r: -2 },
    { x: 78, r: 2 }, { x: 86, r: 10 }, { x: 96, r: 22 }, { x: 106, r: 38 },
  ];

  return (
    <div
      ref={ref}
      className={`pi pi--${mood} pi--${side} ${className}`}
      style={{ "--size": `${size}px` } as React.CSSProperties}
    >
      {say ? (
        <div className="pi__bubble" role="status">
          <span>{say}</span>
        </div>
      ) : null}
      <svg className="pi__svg" viewBox="0 0 140 150" aria-hidden="true">
        <defs>
          <radialGradient id={`pib${uid}`} cx="40%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#B7F6FB" />
            <stop offset="45%" stopColor="#2FD3E0" />
            <stop offset="100%" stopColor="#0A6E96" />
          </radialGradient>
          <linearGradient id={`pia${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#25BFD3" />
            <stop offset="100%" stopColor="#0A5C86" />
          </linearGradient>
        </defs>

        <g className="pi__body">
          {/* ramiona — każde kołysze się z innym opóźnieniem */}
          <g className="pi__arms">
            {arms.map((a, i) => (
              <path
                key={i}
                className={`pi__arm pi__arm--${i}`}
                style={{ "--i": i, transformOrigin: `${a.x}px 92px`, "--r": `${a.r}deg` } as React.CSSProperties}
                d={`M${a.x - 6} 90 C ${a.x - 8} 112, ${a.x + (a.r > 0 ? 10 : -14)} 124, ${a.x + (a.r > 0 ? 16 : -18)} 140 C ${a.x + (a.r > 0 ? 10 : -10)} 128, ${a.x + 4} 112, ${a.x + 6} 90 Z`}
                fill={`url(#pia${uid})`}
              />
            ))}
          </g>

          {/* kreda w ramieniu */}
          <g className="pi__chalk">
            <rect x="112" y="108" width="20" height="7" rx="3" transform="rotate(-28 122 111)" fill="#FFF8E6" />
            <rect x="126" y="101" width="6" height="7" rx="2" transform="rotate(-28 122 111)" fill="#FFC857" />
          </g>

          {/* płaszcz (głowa) */}
          <path
            className="pi__head"
            d="M70 8 C 104 8, 120 34, 118 62 C 117 82, 104 96, 70 96 C 36 96, 23 82, 22 62 C 20 34, 36 8, 70 8 Z"
            fill={`url(#pib${uid})`}
          />
          <ellipse cx="52" cy="26" rx="14" ry="7" fill="#fff" opacity=".35" transform="rotate(-22 52 26)" />
          <circle cx="92" cy="22" r="3" fill="#0A5C86" opacity=".35" />
          <circle cx="100" cy="32" r="2" fill="#0A5C86" opacity=".3" />
          <circle cx="40" cy="44" r="2.4" fill="#0A5C86" opacity=".28" />

          {/* policzki */}
          <ellipse className="pi__cheek" cx="40" cy="74" rx="8" ry="4.5" fill="#FF8A7A" opacity=".55" />
          <ellipse className="pi__cheek" cx="100" cy="74" rx="8" ry="4.5" fill="#FF8A7A" opacity=".55" />

          {/* oczy */}
          <g className="pi__eyes">
            <g className="pi__eye">
              <circle cx="54" cy="58" r="12" fill="#fff" />
              <g className="pi__pupil">
                <circle cx="54" cy="59" r="6.4" fill="#031426" />
                <circle cx="56.4" cy="56.4" r="2.2" fill="#fff" />
              </g>
              <rect className="pi__lid" x="40" y="44" width="28" height="28" rx="14" fill="#1AB6CB" />
            </g>
            <g className="pi__eye">
              <circle cx="86" cy="58" r="12" fill="#fff" />
              <g className="pi__pupil">
                <circle cx="86" cy="59" r="6.4" fill="#031426" />
                <circle cx="88.4" cy="56.4" r="2.2" fill="#fff" />
              </g>
              <rect className="pi__lid" x="72" y="44" width="28" height="28" rx="14" fill="#1AB6CB" />
            </g>
            {/* okulary */}
            <g fill="none" stroke="#031426" strokeWidth="2.6" opacity=".9">
              <circle cx="54" cy="58" r="15" />
              <circle cx="86" cy="58" r="15" />
              <path d="M69 57 Q70 54 71 57" />
              <path d="M39 55 L28 50" />
              <path d="M101 55 L112 50" />
            </g>
          </g>

          {/* usta — trzy warianty, CSS pokazuje jeden */}
          <path className="pi__mouth pi__mouth--smile" d="M60 80 Q70 89 80 80" fill="none" stroke="#031426" strokeWidth="3" strokeLinecap="round" />
          <path className="pi__mouth pi__mouth--open" d="M62 79 Q70 92 78 79 Z" fill="#031426" />
          <path className="pi__mouth pi__mouth--flat" d="M63 83 Q70 80 77 83" fill="none" stroke="#031426" strokeWidth="3" strokeLinecap="round" />

          {/* znak π na czubku */}
          <text x="70" y="27" textAnchor="middle" fontFamily="Georgia, serif" fontSize="15" fontStyle="italic" fill="#fff" opacity=".85">π</text>
        </g>

        {/* bąbelki */}
        <g className="pi__bubbles" fill="none" stroke="#7BE7F0" strokeWidth="1.6">
          <circle cx="16" cy="40" r="4" />
          <circle cx="10" cy="22" r="2.6" />
          <circle cx="126" cy="18" r="3" />
        </g>
      </svg>
    </div>
  );
}
