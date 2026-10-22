"use client";

import React from "react";
import ThemeToggle from "./ThemeToggle";
import Logo from "./Logo";
import { getLenis, ripple, useMagnet } from "@/lib/motion";
import "./nav.css";

const LINKS = [
  { id: "o-mnie", label: "O mnie" },
  { id: "wspolpraca", label: "Jak to działa" },
  { id: "quiz", label: "Quiz" },
  { id: "cennik", label: "Cennik" },
  { id: "zadanie", label: "Zadanie dnia" },
  { id: "opinie", label: "Opinie" },
  { id: "kontakt", label: "Kontakt" },
];

export default function Nav() {
  const [active, setActive] = React.useState<string | null>(null);
  const [hidden, setHidden] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const ringRef = React.useRef<SVGCircleElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);
  const pillRef = React.useRef<HTMLSpanElement>(null);
  const cta = useMagnet<HTMLAnchorElement>(0.22);

  /* Pierścień postępu przewijania wokół logo + chowanie przy scrollu w dół. */
  React.useEffect(() => {
    let last = window.scrollY;
    let raf = 0;
    const on = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = window.scrollY;
        const max = document.documentElement.scrollHeight - innerHeight;
        const p = max > 0 ? y / max : 0;
        if (ringRef.current) ringRef.current.style.strokeDashoffset = String(100 - p * 100);
        setScrolled(y > 24);
        if (Math.abs(y - last) > 6) {
          setHidden(y > last && y > 400);
          last = y;
        }
      });
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  /* Aktywna sekcja. */
  React.useEffect(() => {
    const els = LINKS.map((l) => document.getElementById(l.id)).filter(Boolean) as HTMLElement[];
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

  /* Pigułka, która płynie pod aktywny link. */
  React.useLayoutEffect(() => {
    const list = listRef.current;
    const pill = pillRef.current;
    if (!list || !pill) return;
    const a = active ? list.querySelector<HTMLElement>(`[data-id="${active}"]`) : null;
    if (!a) {
      pill.style.opacity = "0";
      return;
    }
    pill.style.opacity = "1";
    pill.style.width = `${a.offsetWidth}px`;
    pill.style.transform = `translateX(${a.offsetLeft}px)`;
  }, [active]);

  React.useEffect(() => {
    const l = getLenis();
    if (open) l?.stop();
    else l?.start();
    document.body.style.overflow = open ? "hidden" : "";
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open]);

  return (
    <>
      <header className={`nav ${hidden && !open ? "nav--hidden" : ""} ${scrolled ? "nav--scrolled" : ""}`}>
        <div className="nav__bar">
          <a href="#top" className="nav__brand" aria-label="Korki z Krzysztofem — na górę">
            <span className="nav__ring">
              <svg viewBox="0 0 40 40" aria-hidden="true">
                <circle cx="20" cy="20" r="18" pathLength={100} className="nav__ring-bg" />
                <circle ref={ringRef} cx="20" cy="20" r="18" pathLength={100} className="nav__ring-fg" />
              </svg>
              <Logo size={26} />
            </span>
            <span className="nav__word">
              Korki <em>z</em> Krzysztofem
            </span>
          </a>

          <nav className="nav__links" aria-label="Sekcje">
            <span ref={pillRef} className="nav__pill" aria-hidden="true" />
            <ul ref={listRef}>
              {LINKS.map((l) => (
                <li key={l.id}>
                  <a href={`#${l.id}`} data-id={l.id} aria-current={active === l.id ? "true" : undefined}>
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="nav__actions">
            <ThemeToggle />
            <a ref={cta} href="#rezerwacja" className="btn btn--primary btn--sm nav__cta" onPointerDown={ripple}>
              Zarezerwuj
            </a>
            <button
              type="button"
              className={`nav__burger ${open ? "is-open" : ""}`}
              aria-label={open ? "Zamknij menu" : "Otwórz menu"}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              <span /><span />
            </button>
          </div>
        </div>
      </header>

      <div className={`sheet ${open ? "is-open" : ""}`} aria-hidden={!open} onClick={() => setOpen(false)}>
        <div className="sheet__wave" />
        <nav className="sheet__nav" aria-label="Menu">
          {LINKS.concat([{ id: "rezerwacja", label: "Rezerwacja" }]).map((l, i) => (
            <a key={l.id} href={`#${l.id}`} style={{ "--i": i } as React.CSSProperties} tabIndex={open ? 0 : -1}>
              <small>{String(i + 1).padStart(2, "0")}</small>
              {l.label}
            </a>
          ))}
        </nav>
      </div>
    </>
  );
}
