"use client";

import React from "react";
import type { TimelineStep } from "@/lib/types";
import { ensureGsap, getLenis, reducedMotion, scrollToTarget } from "@/lib/motion";
import "./timeline.css";

const DEFAULT_STEPS: TimelineStep[] = [
  { title: "Rezerwujesz termin", body: "Wybierasz wolne okienko w kalendarzu na tej stronie. Potwierdzenie i przypomnienie przychodzą na maila." },
  { title: "Poznajemy się", body: "Na pierwszej lekcji sprawdzamy, co już umiesz, a co dziś blokuje. Bez stresu i bez oceniania." },
  { title: "Plan na miarę", body: "Układamy plan pod Twój cel: sprawdzian, egzamin ósmoklasisty albo maturę — z kolejnością tematów." },
  { title: "Ćwiczymy razem", body: "Tłumaczę, rozwiązujemy zadania krok po kroku, a do powtórki dostajesz materiały." },
  { title: "Widzisz efekt", body: "Zadania, które wyglądały na czarną magię, robisz już sam. I wiesz dlaczego." },
];

function Scene({ i }: { i: number }) {
  switch (i % 5) {
    case 0:
      return (
        <svg viewBox="0 0 160 120" className="tl__scene" aria-hidden="true">
          <rect x="22" y="20" width="116" height="86" rx="14" className="s-card" />
          <rect x="22" y="20" width="116" height="22" rx="14" className="s-accent" />
          {Array.from({ length: 12 }).map((_, k) => (
            <rect key={k} x={32 + (k % 4) * 26} y={50 + Math.floor(k / 4) * 17} width="18" height="11" rx="4" className={k === 6 ? "s-hit" : "s-cell"} />
          ))}
          <path d="M84 85 l6 6 l12 -14" className="s-tick" pathLength={1} />
        </svg>
      );
    case 1:
      return (
        <svg viewBox="0 0 160 120" className="tl__scene" aria-hidden="true">
          <path d="M20 30 h70 a10 10 0 0 1 10 10 v20 a10 10 0 0 1 -10 10 h-50 l-12 10 v-10 h-8 a10 10 0 0 1 -10 -10 v-20 a10 10 0 0 1 10 -10z" className="s-bubble s-b1" />
          <path d="M70 62 h70 a10 10 0 0 1 10 10 v18 a10 10 0 0 1 -10 10 h-8 v10 l-12 -10 h-50 a10 10 0 0 1 -10 -10 v-18 a10 10 0 0 1 10 -10z" className="s-bubble s-b2" />
          <text x="55" y="56" className="s-q">?</text>
          <text x="106" y="88" className="s-a">a!</text>
        </svg>
      );
    case 2:
      return (
        <svg viewBox="0 0 160 120" className="tl__scene" aria-hidden="true">
          <path d="M18 100 C 50 100, 40 60, 80 62 S 110 24, 140 22" className="s-path" pathLength={1} />
          {[[18, 100], [80, 62], [140, 22]].map(([x, y], k) => <circle key={k} cx={x} cy={y} r="6" className="s-node" style={{ "--k": k } as React.CSSProperties} />)}
          <path d="M140 22 V 0 l16 6 l-16 6" className="s-flag" />
        </svg>
      );
    case 3:
      return (
        <svg viewBox="0 0 160 120" className="tl__scene" aria-hidden="true">
          <rect x="16" y="16" width="128" height="78" rx="8" className="s-board" />
          <path d="M30 40 h50 M30 56 h70 M30 72 h36" className="s-chalk" pathLength={1} />
          <circle cx="118" cy="60" r="16" className="s-ok" />
          <path d="M110 60 l6 6 l10 -12" className="s-tick" pathLength={1} />
          <rect x="60" y="94" width="40" height="6" rx="3" className="s-tray" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 160 120" className="tl__scene" aria-hidden="true">
          {[28, 52, 76, 100, 124].map((x, k) => (
            <rect key={k} x={x - 8} y={100 - (k + 1) * 15} width="16" height={(k + 1) * 15} rx="5" className="s-bar" style={{ "--k": k } as React.CSSProperties} />
          ))}
          <path d="M124 14 l4 9 l10 1 l-7 7 l2 10 l-9 -5 l-9 5 l2 -10 l-7 -7 l10 -1z" className="s-star" />
        </svg>
      );
  }
}

export default function Timeline({ steps: custom }: { steps: TimelineStep[] }) {
  const steps = custom?.length ? custom : DEFAULT_STEPS;
  const root = React.useRef<HTMLElement>(null);
  const track = React.useRef<HTMLDivElement>(null);
  const stRef = React.useRef<{ start: number; end: number } | null>(null);
  const [active, setActive] = React.useState(0);
  const [pinned, setPinned] = React.useState(false);

  React.useEffect(() => {
    const el = root.current;
    const tr = track.current;
    if (!el || !tr) return;
    if (reducedMotion()) return;
    const { gsap } = ensureGsap();
    const mm = gsap.matchMedia();
    mm.add("(min-width: 900px)", () => {
      setPinned(true);
      const dist = () => tr.scrollWidth - tr.parentElement!.clientWidth;
      const tween = gsap.to(tr, {
        x: () => -dist(),
        ease: "none",
        scrollTrigger: {
          trigger: el,
          start: "top top",
          end: () => `+=${dist() + innerHeight * 0.4}`,
          pin: true,
          scrub: 0.7,
          invalidateOnRefresh: true,
          snap: { snapTo: 1 / (steps.length - 1), duration: { min: 0.2, max: 0.6 }, ease: "power2.inOut", delay: 0.08 },
          onUpdate: (self) => {
            stRef.current = { start: self.start, end: self.end };
            setActive(Math.round(self.progress * (steps.length - 1)));
            el.style.setProperty("--tl-p", String(self.progress));
          },
          onRefresh: (self) => { stRef.current = { start: self.start, end: self.end }; },
        },
      });
      return () => { tween.kill(); setPinned(false); stRef.current = null; };
    });
    return () => mm.revert();
  }, [steps.length]);

  /* Na telefonie aktywny krok wynika z tego, która karta jest na ekranie. */
  React.useEffect(() => {
    if (pinned) return;
    const cards = Array.from(root.current?.querySelectorAll<HTMLElement>(".tl__card") || []);
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.i)); });
    }, { rootMargin: "-45% 0px -45% 0px" });
    cards.forEach((c) => io.observe(c));
    return () => io.disconnect();
  }, [pinned]);

  const go = (i: number) => {
    const st = stRef.current;
    if (pinned && st) {
      const y = st.start + ((st.end - st.start) * i) / (steps.length - 1);
      const l = getLenis();
      if (l) l.scrollTo(y, { duration: 1.2 });
      else window.scrollTo({ top: y, behavior: "smooth" });
    } else {
      const card = root.current?.querySelector<HTMLElement>(`.tl__card[data-i="${i}"]`);
      if (card) scrollToTarget(card, -110);
    }
  };

  return (
    <section id="wspolpraca" ref={root} className={`tl ${pinned ? "tl--pinned" : ""}`}>
      <div className="tl__inner">
        <div className="wrap tl__head">
          <div>
            <span className="eyebrow">Jak to działa</span>
            <h2 className="h-section">Od pierwszego kliknięcia <span className="text-sea">do „aha!”</span></h2>
          </div>
          <ol className="tl__rail" aria-label="Kroki współpracy">
            {steps.map((s, i) => (
              <li key={i}>
                <button type="button" onClick={() => go(i)} aria-current={active === i ? "step" : undefined} className={i <= active ? "is-done" : ""}>
                  <span className="tl__num">{i + 1}</span>
                  <span className="sr-only">{s.title}</span>
                </button>
              </li>
            ))}
            <span className="tl__railfill" style={{ "--f": steps.length > 1 ? active / (steps.length - 1) : 1 } as React.CSSProperties} aria-hidden="true" />
          </ol>
        </div>
        <div className="tl__viewport">
          <div ref={track} className="tl__track">
            {steps.map((s, i) => (
              <article key={i} className={`tl__card ${active === i ? "is-active" : ""}`} data-i={i} onClick={() => go(i)}>
                <div className="tl__art"><Scene i={i} /></div>
                <span className="tl__step">Krok {String(i + 1).padStart(2, "0")}</span>
                <h3 className="h-card">{s.title}</h3>
                <p className="muted">{s.body}</p>
              </article>
            ))}
            <div className="tl__end" aria-hidden="true">
              <span className="chalk">i tak dalej, aż do celu →</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
