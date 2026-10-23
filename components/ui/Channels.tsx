"use client";

import React from "react";
import { FACEBOOK_URL, INSTAGRAM_URL, PHONE_DISPLAY, PHONE_TEL, WHATSAPP_URL } from "@/lib/contact";
import { reducedMotion } from "@/lib/motion";
import "./channels.css";

/* Kanały bezpośrednie: telefon, WhatsApp, Messenger, Instagram — prawdziwe znaki marek
   w barwnych kulach. Każda kula ma własne „życie” w spoczynku (fale dźwięku, krąg,
   pisze…, obrót gradientu), odpalane w losowych odstępach i tylko, gdy kula jest w widoku.
   To zwykłe linki, więc działają bez JavaScriptu. */

export type ChannelId = "phone" | "whatsapp" | "messenger" | "instagram";

export const CHANNELS: { id: ChannelId; label: string; sub: string; href: string; ext: boolean }[] = [
  { id: "phone", label: "Telefon", sub: PHONE_DISPLAY.replace("+48 ", ""), href: PHONE_TEL, ext: false },
  { id: "whatsapp", label: "WhatsApp", sub: "napisz wiadomość", href: WHATSAPP_URL, ext: true },
  { id: "messenger", label: "Messenger", sub: "Krzysztof Witkowicz", href: FACEBOOK_URL, ext: true },
  { id: "instagram", label: "Instagram", sub: "@windknowsmyname", href: INSTAGRAM_URL, ext: true },
];

/* Same znaki (białe, na barwnym tle kuli). */
export function ChannelGlyph({ id, size = 24 }: { id: ChannelId; size?: number }) {
  switch (id) {
    case "phone":
      return (
        <svg className="chg chg--phone" viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
          <path className="chg__fill" d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25c1.1.37 2.3.57 3.6.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z" />
          <path className="chg__wave chg__wave--1" d="M14.5 3.6a6.6 6.6 0 0 1 5.9 5.9" />
          <path className="chg__wave chg__wave--2" d="M14.2 0.6a9.6 9.6 0 0 1 9.2 9.2" />
        </svg>
      );
    case "whatsapp":
      return (
        <svg className="chg chg--wa" viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
          <path className="chg__fill" d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.47-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.18-1.41-.08-.13-.28-.2-.57-.35m-5.42 7.4h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88a9.83 9.83 0 0 1 9.88 9.89c0 5.45-4.44 9.88-9.88 9.88m8.41-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.69 1.45h.01c6.55 0 11.89-5.34 11.89-11.9a11.82 11.82 0 0 0-3.48-8.41Z" />
        </svg>
      );
    case "messenger":
      return (
        <svg className="chg chg--ms" viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
          <path className="chg__fill" d="M12 .5C5.53.5.5 5.24.5 11.64c0 3.35 1.37 6.24 3.61 8.24.19.17.3.4.31.65l.06 2.04a.92.92 0 0 0 1.29.81l2.28-1c.19-.09.41-.1.61-.05 1.05.29 2.16.44 3.34.44 6.47 0 11.5-4.74 11.5-11.14S18.47.5 12 .5Zm6.9 8.59-3.37 5.36a1.73 1.73 0 0 1-2.5.46l-2.69-2.01a.69.69 0 0 0-.83 0l-3.63 2.75c-.48.37-1.12-.21-.79-.72L8.46 9.6a1.73 1.73 0 0 1 2.5-.46l2.69 2.01c.25.19.59.19.83 0l3.63-2.75c.48-.37 1.12.21.79.72Z" />
        </svg>
      );
    case "instagram":
      return (
        <svg className="chg chg--ig" viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
          <rect className="chg__line" x="3" y="3" width="18" height="18" rx="5.4" />
          <circle className="chg__line" cx="12" cy="12" r="4.2" />
          <circle className="chg__fill" cx="17.4" cy="6.6" r="1.25" />
        </svg>
      );
  }
}

/* Losowy mikroruch: atrybut data-idle włącza animację na chwilę, potem przerwa 5–14 s.
   Pauzuje poza widokiem i przy ograniczonym ruchu nie startuje wcale. */
function useIdle<T extends HTMLElement>(min = 5000, max = 14000, run = 1600) {
  const ref = React.useRef<T>(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion()) return;
    let t = 0;
    let visible = false;
    const schedule = (first = false) => {
      window.clearTimeout(t);
      const wait = first ? 900 + Math.random() * 3200 : min + Math.random() * (max - min);
      t = window.setTimeout(() => {
        if (!visible) return;
        el.dataset.idle = "1";
        t = window.setTimeout(() => { delete el.dataset.idle; schedule(); }, run);
      }, wait);
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) schedule(true);
      else { window.clearTimeout(t); delete el.dataset.idle; }
    });
    io.observe(el);
    return () => { io.disconnect(); window.clearTimeout(t); };
  }, [min, max, run]);
  return ref;
}

export function ChannelOrb({ id, size = 64 }: { id: ChannelId; size?: number }) {
  const ref = useIdle<HTMLSpanElement>();
  return (
    <span ref={ref} className={`orb orb--${id}`} style={{ "--orb": `${size}px` } as React.CSSProperties} aria-hidden="true">
      <span className="orb__bg" />
      <span className="orb__ring" />
      {id === "messenger" ? <span className="orb__typing"><i /><i /><i /></span> : null}
      {id === "instagram" ? <span className="orb__spark" /> : null}
      <span className="orb__glyph"><ChannelGlyph id={id} size={Math.round(size * 0.46)} /></span>
    </span>
  );
}

/* Wariant „section”: kule z podpisem i dymkiem przy najechaniu; „footer”: same kule;
   „bar”: wybrane kanały w pasku na telefonie. */
export default function Channels({
  variant = "section",
  only,
  className = "",
}: {
  variant?: "section" | "footer" | "bar";
  only?: ChannelId[];
  className?: string;
}) {
  const list = only ? CHANNELS.filter((c) => only.includes(c.id)) : CHANNELS;
  const size = variant === "section" ? 64 : variant === "bar" ? 46 : 46;

  return (
    <ul className={`chn chn--${variant} ${className}`}>
      {list.map((c, i) => (
        <li key={c.id} className="chn__item" style={{ "--i": i } as React.CSSProperties}>
          <a
            className="chn__link"
            href={c.href}
            {...(c.ext ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            aria-label={`${c.label}${c.id === "phone" ? `: ${PHONE_DISPLAY}` : ""}${c.ext ? " (otwiera się w nowej karcie)" : ""}`}
          >
            <ChannelOrb id={c.id} size={size} />
            {variant === "section" ? (
              <>
                <span className="chn__label" aria-hidden="true">{c.label}</span>
                <span className="chn__tip" aria-hidden="true">{c.sub}</span>
              </>
            ) : null}
          </a>
        </li>
      ))}
    </ul>
  );
}
