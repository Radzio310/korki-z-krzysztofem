"use client";

import React from "react";
import KineticTitle from "./KineticTitle";
import Chalkboard, { BOARD_LINES } from "./Chalkboard";
import Mascot, { type MascotMood } from "../Mascot";
import { ensureGsap, reducedMotion, ripple, scrollToTarget, useMagnet } from "@/lib/motion";
import "./hero.css";

const WORDS = ["ma sens", "się układa", "wchodzi do głowy", "przestaje straszyć"];
const SYMBOLS = ["π", "√", "∑", "Δ", "∞", "x²", "∫", "≈", "%", "÷", "θ", "f(x)"];

const CAPTIONS: { at: number; say: string; mood: MascotMood }[] = [
  { at: 0, say: "Przewiń, a rozwiążę to z Tobą krok po kroku.", mood: "wave" },
  { at: 0.22, say: "Najpierw liczę deltę — to klucz do całego zadania.", mood: "think" },
  { at: 0.5, say: "Mam pierwsze rozwiązanie, zostało drugie.", mood: "think" },
  { at: 0.78, say: "Widzisz? Krok po kroku i zadanie zrobione.", mood: "happy" },
];

export default function Hero({ title, subtitle, modes = [] }: { title: string | null; subtitle: string | null; modes?: string[] }) {
  const root = React.useRef<HTMLElement>(null);
  const stage = React.useRef<HTMLDivElement>(null);
  const board = React.useRef<HTMLDivElement>(null);
  const [cap, setCap] = React.useState(0);
  const [word, setWord] = React.useState(0);
  const primary = useMagnet<HTMLAnchorElement>(0.25);

  /* Obracające się słowo w podtytule. */
  React.useEffect(() => {
    if (reducedMotion()) return;
    const t = window.setInterval(() => setWord((w) => (w + 1) % WORDS.length), 2600);
    return () => window.clearInterval(t);
  }, []);

  /* Scena przypięta do scrolla: kreda pisze kolejne linie, parabola się rysuje,
     pierwiastki zapalają się na osi, a na końcu złota pętla obejmuje odpowiedź. */
  React.useEffect(() => {
    const el = root.current;
    const st = stage.current;
    const bd = board.current;
    if (!el || !st || !bd) return;
    const lines = Array.from(bd.querySelectorAll<HTMLElement>(".board__line"));
    if (reducedMotion()) {
      lines.forEach((l) => l.style.setProperty("--w", "1"));
      bd.querySelectorAll(".board__root").forEach((c) => { c.setAttribute("r", "5"); (c as SVGElement).style.opacity = "1"; });
      bd.querySelectorAll<SVGPathElement>(".board__axis, .board__parab, .board__circle path").forEach((p) => { p.style.strokeDashoffset = "0"; });
      bd.classList.add("is-solved");
      setCap(CAPTIONS.length - 1);
      return;
    }
    const { gsap, ScrollTrigger } = ensureGsap();
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();
      mm.add({ desk: "(min-width: 900px)", mob: "(max-width: 899px)" }, (c) => {
        const desk = (c.conditions as { desk: boolean }).desk;
        gsap.set(lines, { "--w": 0 });
        /* pierwsza linia (treść zadania) pisze się sama po wejściu — gość widzi od razu, o co chodzi */
        gsap.to(lines[0], { "--w": 1, duration: 1.4, ease: "power1.inOut", delay: 0.9 });

        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: el,
            start: "top top",
            end: desk ? "+=190%" : "+=150%",
            scrub: 0.6,
            pin: st,
            anticipatePin: 1,
            onUpdate: (self) => {
              const p = self.progress;
              let idx = 0;
              CAPTIONS.forEach((cpt, i) => { if (p >= cpt.at) idx = i; });
              setCap(idx);
              bd.classList.toggle("is-solved", p > 0.8);
            },
          },
        });
        tl.to(bd.querySelector(".board__axis"), { strokeDashoffset: 0, duration: 0.5 }, 0)
          .to(lines[1], { "--w": 1, duration: 1 }, 0.2)
          .to(bd.querySelector(".board__parab"), { strokeDashoffset: 0, duration: 1.2 }, 0.6)
          .to(lines[2], { "--w": 1, duration: 1 }, 1.3)
          .to(bd.querySelector(".board__root--a"), { attr: { r: 5 }, opacity: 1, duration: 0.3, ease: "back.out(3)" }, 2.1)
          .to(lines[3], { "--w": 1, duration: 1 }, 2.3)
          .to(bd.querySelector(".board__root--b"), { attr: { r: 5 }, opacity: 1, duration: 0.3, ease: "back.out(3)" }, 3.1)
          .to(lines[4], { "--w": 1, duration: 0.8 }, 3.3)
          .to(bd.querySelector(".board__circle path"), { strokeDashoffset: 0, duration: 0.6 }, 4.0)
          .to(el.querySelector(".hero__copy"), { yPercent: desk ? -6 : -4, opacity: desk ? 1 : 0.9, duration: 4.6 }, 0)
          .to(bd, { rotateX: desk ? 4 : 0, rotateY: desk ? -8 : 0, scale: desk ? 0.96 : 1, duration: 1 }, 4.4)
          .to(el.querySelector(".hero__depth"), { yPercent: -18, duration: 5.4 }, 0);
        return () => tl.kill();
      });
      /* drobne symbole płyną w różnych głębiach */
      gsap.utils.toArray<HTMLElement>(".hero__sym").forEach((s, i) => {
        gsap.to(s, { y: () => gsap.utils.random(-60, 60), x: () => gsap.utils.random(-30, 30), rotate: gsap.utils.random(-30, 30), duration: gsap.utils.random(5, 9), repeat: -1, yoyo: true, ease: "sine.inOut", delay: i * 0.2 });
      });
    }, el);
    const r = () => ScrollTrigger.refresh();
    window.addEventListener("load", r);
    return () => {
      window.removeEventListener("load", r);
      ctx.revert();
    };
  }, []);

  const c = CAPTIONS[cap];
  const heading = title?.trim() || "Korki z Krzysztofem";

  return (
    <section id="top" ref={root} className="hero">
      <div ref={stage} className="hero__stage">
        <div className="hero__depth" aria-hidden="true">
          <div className="hero__caustics" />
          {SYMBOLS.map((s, i) => (
            <span key={i} className="hero__sym" style={{ "--x": `${(i * 37) % 100}%`, "--y": `${(i * 53) % 100}%`, "--z": (i % 3) + 1 } as React.CSSProperties}>
              {s}
            </span>
          ))}
        </div>

        <div className="wrap hero__grid">
          <div className="hero__copy">
            <span className="eyebrow">{modes.includes("online") && modes.includes("stationary") ? "Korepetycje · online i na miejscu" : modes.includes("online") ? "Korepetycje · online" : modes.includes("stationary") ? "Korepetycje · na miejscu" : "Korepetycje"}</span>
            <KineticTitle text={heading} className="h-display hero__title" />
            <p className="hero__sub">
              {subtitle?.trim() ? (
                subtitle
              ) : (
                <>
                  Matematyka, która{" "}
                  <span className="hero__rot" aria-live="polite">
                    {WORDS.map((w, i) => (
                      <span key={w} className={`hero__word chalk ${i === word ? "is-on" : ""}`} aria-hidden={i !== word}>
                        {w}
                      </span>
                    ))}
                  </span>
                </>
              )}
            </p>
            <div className="hero__cta">
              <a ref={primary} href="#rezerwacja" className="btn btn--primary" onPointerDown={ripple}>
                Zarezerwuj lekcję
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </a>
              <button type="button" className="btn" onPointerDown={ripple} onClick={() => scrollToTarget("#quiz")}>
                <span className="hero__timer" aria-hidden="true">60</span>
                Sprawdź poziom w 60 s
              </button>
            </div>
          </div>

          <div className="hero__boardwrap">
            <Chalkboard boardRef={board} />
            <Mascot className="hero__pi" mood={c.mood} say={c.say} size={128} side="right" />
          </div>
        </div>

        <div className="hero__scroll" aria-hidden="true">
          <span>przewiń</span>
          <i />
        </div>
        <p className="sr-only">
          Na tablicy: {BOARD_LINES.map((l) => l.text).join("; ")}; odpowiedź x należy do zbioru 2 i 3.
        </p>
      </div>
    </section>
  );
}
