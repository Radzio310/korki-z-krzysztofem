"use client";

import React from "react";
import Avatar from "../chat/Avatar";
import { CHANNELS, ChannelOrb, type ChannelId } from "../ui/Channels";
import { reducedMotion, scrollToTarget } from "@/lib/motion";
import "./mcta.css";

/* Stały pasek na telefonie, spójny z czatem: „pole wiadomości” do Krzysztofa (stuknięcie
   przewija do czatu i ustawia fokus na pierwszym wyborze) + jedna kula „więcej”, która
   rozkłada wachlarzem WhatsApp, telefon i Messenger. Jedna kula zamiast trzech, więc pasek
   mieści się w całości już od 320 px. Chowa się, gdy w widoku jest czat (#kontakt) albo stopka. */

const FAN: ChannelId[] = ["whatsapp", "phone", "messenger"];

export default function MobileCta() {
  const [hidden, setHidden] = React.useState(false);
  const [typing, setTyping] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const toggleRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    const targets = [document.getElementById("kontakt"), document.querySelector("footer")].filter(Boolean) as Element[];
    if (!targets.length || typeof IntersectionObserver === "undefined") return;
    const seen = new Set<Element>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) seen.add(e.target);
          else seen.delete(e.target);
        }
        setHidden(seen.size > 0);
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, []);

  React.useEffect(() => { if (hidden) setOpen(false); }, [hidden]);
  React.useEffect(() => {
    if (open) rootRef.current?.querySelector<HTMLElement>(".mcta__fan a")?.focus({ preventScroll: true });
  }, [open]);

  /* wachlarz zamyka stuknięcie obok i Esc (fokus wraca na kulę) */
  React.useEffect(() => {
    if (!open) return;
    const out = (e: PointerEvent) => { if (!rootRef.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); toggleRef.current?.focus(); } };
    document.addEventListener("pointerdown", out, true);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("pointerdown", out, true); document.removeEventListener("keydown", key); };
  }, [open]);

  React.useEffect(() => {
    if (hidden || open || reducedMotion() || !matchMedia("(max-width: 719px)").matches) return;
    let t = 0;
    const loop = () => {
      t = window.setTimeout(() => {
        setTyping(true);
        t = window.setTimeout(() => { setTyping(false); loop(); }, 1800);
      }, 7000 + Math.random() * 9000);
    };
    loop();
    return () => { window.clearTimeout(t); setTyping(false); };
  }, [hidden, open]);

  const go = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    setOpen(false);
    scrollToTarget("#rezerwacja", -84);
    window.setTimeout(() => {
      const first = document.querySelector<HTMLElement>("#rezerwacja .kc-opt, #rezerwacja .kcal__near, #rezerwacja input");
      (first || document.getElementById("kontakt"))?.focus({ preventScroll: true });
    }, 1000);
  };

  const fan = FAN.map((id) => CHANNELS.find((c) => c.id === id)!);

  return (
    <div ref={rootRef} className={`mcta ${hidden ? "is-hidden" : ""} ${open ? "is-open" : ""}`} role="region" aria-label="Szybki kontakt">
      <a className="mcta__main" href="#kontakt" onClick={go}>
        <Avatar size={34} typing={typing} />
        <span className="mcta__txt">
          <span className={`mcta__line ${typing ? "is-off" : ""}`}>Zapytaj o zajęcia…</span>
          <span className={`mcta__line mcta__line--typing ${typing ? "" : "is-off"}`} aria-hidden="true">Krzysztof pisze…</span>
        </span>
        <span className="mcta__send" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M3.4 20.4 21 12 3.4 3.6l2.2 7.1L14 12l-8.4 1.3z" /></svg>
        </span>
      </a>

      <div className="mcta__more">
        <ul className="mcta__fan" id="mcta-fan" aria-hidden={!open}>
          {fan.map((c, i) => (
            <li key={c.id} className="mcta__fan-item" style={{ "--i": i } as React.CSSProperties}>
              <a
                href={c.href}
                tabIndex={open ? 0 : -1}
                {...(c.ext ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                onClick={() => setOpen(false)}
                aria-label={`${c.label}${c.id === "phone" ? `: ${c.sub}` : ""}${c.ext ? " (otwiera się w nowej karcie)" : ""}`}
              >
                <ChannelOrb id={c.id} size={48} />
                <span className="mcta__fan-label" aria-hidden="true">{c.label}</span>
              </a>
            </li>
          ))}
        </ul>
        <button
          ref={toggleRef}
          type="button"
          className="mcta__toggle"
          aria-expanded={open}
          aria-controls="mcta-fan"
          aria-label={open ? "Zamknij inne kanały" : "Inne kanały: WhatsApp, telefon, Messenger"}
          onClick={() => setOpen((v) => !v)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
          <span className="mcta__badge" aria-hidden="true">3</span>
        </button>
      </div>
    </div>
  );
}
