"use client";

import React from "react";
import ThemeToggle from "./ThemeToggle";
import { CONTACT, HERO, IMAGES, NAV_LINKS, NAV_LIVE } from "@/content/site";
import { getLenis, ripple, useMagnet } from "@/lib/motion";
import "./nav.css";

/* Nawigacja: znak WK z pierścieniem postępu przewijania, pigułka płynąca pod aktywną sekcją,
   wyróżnione „Zapytaj o zajęcia”. Na telefonie menu rozlewa się kołem z przycisku;
   fokus wchodzi do menu, Esc zamyka i wraca na przycisk, Tab nie ucieka poza menu. */
export default function Nav() {
  const [active, setActive] = React.useState<string | null>(null);
  const [hidden, setHidden] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  /* sekcja dla żywego środka paska na telefonie (wszystkie sekcje, nie tylko linki) */
  const [now, setNow] = React.useState("top");
  const ringRef = React.useRef<SVGCircleElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);
  const pillRef = React.useRef<HTMLSpanElement>(null);
  const burger = React.useRef<HTMLButtonElement>(null);
  const sheet = React.useRef<HTMLDivElement>(null);
  const cta = useMagnet<HTMLAnchorElement>(0.22);

  React.useEffect(() => {
    let last = window.scrollY;
    let raf = 0;
    /* Wysokość strony mierzona tylko przy zmianie rozmiaru — czytanie scrollHeight w każdej
       klatce przewijania wymuszało przeliczenie układu. */
    let max = 1;
    const measure = () => { max = document.documentElement.scrollHeight - innerHeight; };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);
    /* Odczyt pozycji w zdarzeniu scroll (układ jest wtedy świeży), zapisy w rAF. */
    let y = window.scrollY;
    const on = () => {
      y = window.scrollY;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const p = max > 0 ? Math.min(1, y / max) : 0;
        if (ringRef.current) ringRef.current.style.strokeDashoffset = String(100 - p * 100);
        setScrolled(y > 24);
        if (Math.abs(y - last) > 6) {
          setHidden(y > last && y > 500);
          last = y;
        }
      });
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => { window.removeEventListener("scroll", on); ro.disconnect(); cancelAnimationFrame(raf); };
  }, []);

  React.useEffect(() => {
    const els = NAV_LINKS.map((l) => document.getElementById(l.id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (vis) setActive(vis.target.id);
      },
      { rootMargin: "-40% 0px -50% 0px", threshold: [0, 0.2, 0.5] },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);

  React.useEffect(() => {
    const els = Object.keys(NAV_LIVE).map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) setNow(e.target.id); });
    }, { rootMargin: "-42% 0px -52% 0px" });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);

  React.useLayoutEffect(() => {
    const list = listRef.current;
    const pill = pillRef.current;
    if (!list || !pill) return;
    const a = active ? list.querySelector<HTMLElement>(`[data-id="${active}"]`) : null;
    if (!a) { pill.style.opacity = "0"; return; }
    pill.style.opacity = "1";
    pill.style.width = `${a.offsetWidth}px`;
    pill.style.transform = `translateX(${a.offsetLeft}px)`;
  }, [active]);

  const close = React.useCallback((focusBack = true) => {
    setOpen(false);
    if (focusBack) window.setTimeout(() => burger.current?.focus(), 30);
  }, []);

  React.useEffect(() => {
    const l = getLenis();
    if (open) l?.stop(); else l?.start();
    document.body.style.overflow = open ? "hidden" : "";
    if (!open) return;
    const t = window.setTimeout(() => sheet.current?.querySelector<HTMLElement>("a")?.focus(), 260);
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); close(); return; }
      if (e.key !== "Tab" || !sheet.current) return;
      const f = [burger.current, ...Array.from(sheet.current.querySelectorAll<HTMLElement>("a, button"))].filter(Boolean) as HTMLElement[];
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", key);
    return () => { window.clearTimeout(t); window.removeEventListener("keydown", key); };
  }, [open, close]);

  return (
    <>
      <header className={`nav ${hidden && !open ? "nav--hidden" : ""} ${scrolled ? "nav--scrolled" : ""} ${open ? "nav--open" : ""}`}>
        <div className="nav__bar">
          <a href="#top" className="nav__brand" aria-label="Korki z Krzysztofem — na górę">
            <span className="nav__ring">
              <svg viewBox="0 0 48 48" aria-hidden="true">
                <circle cx="24" cy="24" r="22" pathLength={100} className="nav__ring-bg" />
                <circle ref={ringRef} cx="24" cy="24" r="22" pathLength={100} className="nav__ring-fg" />
              </svg>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="nav__logo" src={IMAGES.logo.src} alt="" width={36} height={36} />
            </span>
            <span className="nav__word">Korki <em>z</em> Krzysztofem</span>
          </a>

          {/* Telefon: środek paska żyje — nazwa i sekcja, w której jesteś, pisana kredą.
              Wszystkie etykiety leżą w jednej komórce; zmiana = opacity/transform, szerokość stoi. */}
          <a href="#top" className="nav__live" aria-hidden="true" tabIndex={-1}>
            <b>Korki <em>z</em> Krzysztofem</b>
            <span className="nav__now">
              {Object.entries(NAV_LIVE).map(([id, label], i) => (
                <i key={id} className={now === id ? "is-on" : ""}>
                  <span className="nav__glyph">{["π", "∑", "√", "Δ", "∞", "∫"][i % 6]}</span>{label}
                </i>
              ))}
            </span>
          </a>

          <nav className="nav__links" aria-label="Sekcje">
            <span ref={pillRef} className="nav__pill" aria-hidden="true" />
            <ul ref={listRef}>
              {NAV_LINKS.map((l) => (
                <li key={l.id}>
                  <a href={`#${l.id}`} data-id={l.id} aria-current={active === l.id ? "true" : undefined}>{l.label}</a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="nav__actions">
            <ThemeToggle />
            <a ref={cta} href="#kontakt" className="btn btn--primary btn--sm nav__cta" onPointerDown={ripple}>{HERO.ctaPrimary}</a>
            <button
              ref={burger}
              type="button"
              className={`nav__burger ${open ? "is-open" : ""}`}
              aria-label={open ? "Zamknij menu" : "Otwórz menu"}
              aria-expanded={open}
              aria-controls="nav-menu"
              onClick={() => setOpen((v) => !v)}
            >
              <span /><span />
            </button>
          </div>
        </div>
      </header>

      <div
        id="nav-menu"
        ref={sheet}
        className={`sheet ${open ? "is-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        aria-hidden={!open}
        inert={!open}
        onClick={(e) => {
          if (!(e.target as HTMLElement).closest("a")) return;
          /* Lenis musi ruszyć, zanim kotwica poprosi o przewinięcie */
          getLenis()?.start();
          document.body.style.overflow = "";
          close(false);
        }}
      >
        <div className="sheet__wave" />
        <nav className="sheet__nav" aria-label="Menu">
          {NAV_LINKS.map((l, i) => (
            <a key={l.id} href={`#${l.id}`} style={{ "--i": i } as React.CSSProperties}>
              <small>{String(i + 1).padStart(2, "0")}</small>
              {l.label}
            </a>
          ))}
          <div className="sheet__cta" style={{ "--i": NAV_LINKS.length } as React.CSSProperties}>
            <a href="#kontakt" className="btn btn--primary">{HERO.ctaPrimary}</a>
            <a href={CONTACT.phoneHref} className="btn">{CONTACT.phoneDisplay}</a>
            <a href={CONTACT.whatsapp} className="btn" target="_blank" rel="noopener noreferrer">WhatsApp<span className="sr-only"> (nowa karta)</span></a>
          </div>
        </nav>
      </div>
    </>
  );
}
