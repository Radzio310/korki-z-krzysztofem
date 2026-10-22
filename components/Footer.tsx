"use client";

import React from "react";
import Mascot from "./Mascot";
import Patterns from "./ui/Patterns";
import { CONTACT, IMAGES, NAV_LINKS } from "@/content/site";
import { scrollToTarget } from "@/lib/motion";
import "./footer.css";

/* Stopka: żywe fale (klik = kręgi na wodzie), wzory pod latarką, kontakt bez szukania
   i wielki napis, który wraca na górę. */
export default function Footer() {
  const [rings, setRings] = React.useState<{ id: number; x: number; y: number }[]>([]);
  const year = new Date().getFullYear();

  const splash = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const id = performance.now();
    setRings((rs) => [...rs.slice(-6), { id, x: e.clientX - r.left, y: e.clientY - r.top }]);
    window.setTimeout(() => setRings((rs) => rs.filter((x) => x.id !== id)), 1400);
  };

  return (
    <footer className="ft">
      <div className="ft__sea" onClick={splash} aria-hidden="true">
        <svg className="ft__waves" viewBox="0 0 1440 160" preserveAspectRatio="none">
          <path className="ft__w ft__w--1" d="M0 80 C 240 40, 480 40, 720 80 S 1200 120, 1440 80 S 1920 40, 2160 80 S 2640 120, 2880 80 L 2880 160 L 0 160 Z" />
          <path className="ft__w ft__w--2" d="M0 100 C 240 70, 480 70, 720 100 S 1200 130, 1440 100 S 1920 70, 2160 100 S 2640 130, 2880 100 L 2880 160 L 0 160 Z" />
          <path className="ft__w ft__w--3" d="M0 122 C 240 104, 480 104, 720 122 S 1200 140, 1440 122 S 1920 104, 2160 122 S 2640 140, 2880 122 L 2880 160 L 0 160 Z" />
        </svg>
        {rings.map((r) => <span key={r.id} className="ft__ring" style={{ left: r.x, top: r.y }} />)}
      </div>
      <div className="ft__body">
        <Patterns className="ft__pat" beam={180} />
        <div className="wrap ft__wrap">
          <div className="ft__top">
            <div className="ft__brand">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={IMAGES.logo.src} alt="" width={64} height={64} className="ft__logo" />
              <p><b>Korki z Krzysztofem</b><br />Korepetycje z matematyki i chemii.<br />{CONTACT.city} {CONTACT.area}.</p>
            </div>

            <nav className="ft__links" aria-label="Stopka">
              {NAV_LINKS.map((l) => <a key={l.id} href={`#${l.id}`}>{l.label}</a>)}
              <a href="#kontakt">Kontakt</a>
              <a href="/polityka-prywatnosci">Polityka prywatności</a>
            </nav>

            <div className="ft__contact">
              <a className="ft__phone" href={CONTACT.phoneHref}>
                <small>Telefon</small>
                {CONTACT.phoneDisplay}
              </a>
              <div className="ft__social">
                <a href={CONTACT.whatsapp} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp (nowa karta)">
                  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14.2c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.2-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.8s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.3.5-.4.4c-.1.2-.3.3-.1.6.2.3.7 1.2 1.5 1.9 1 .9 1.8 1.2 2.1 1.3.3.1.4.1.6-.1l.8-1c.2-.2.4-.2.6-.1l1.9.9c.2.1.4.2.5.3.1.2.1.8-.1 1.4Z" /></svg>
                </a>
                <a href={CONTACT.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook (nowa karta)">
                  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M13.5 22v-8h2.7l.4-3.2h-3.1V8.8c0-.9.3-1.5 1.6-1.5h1.6V4.4c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.4-4 4.1v2.4H7.6V14h2.7v8z" /></svg>
                </a>
                <a href={CONTACT.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram (nowa karta)">
                  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="5" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="17.2" cy="6.8" r="1.2" fill="currentColor" /></svg>
                </a>
              </div>
            </div>

            <Mascot mood="wave" size={110} say="Do zobaczenia na lekcji!" side="right" className="ft__pi" />
          </div>

          <button type="button" className="ft__giant" onClick={() => scrollToTarget("#top", 0)} aria-label="Wróć na górę">
            <span>Korki</span> <em>z</em> <span>Krzysztofem</span>
          </button>
          <div className="ft__bottom">
            <span>© {year} Korki z Krzysztofem · Krzysztof Witkowicz</span>
            <span>Krok po kroku.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
