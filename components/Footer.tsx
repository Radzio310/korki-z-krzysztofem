"use client";

import React from "react";
import Mascot from "./Mascot";
import Patterns from "./ui/Patterns";
import Channels from "./ui/Channels";
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
              <Channels variant="footer" className="ft__social" />
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
