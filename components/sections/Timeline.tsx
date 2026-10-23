"use client";

import React from "react";
import type { TimelineStep } from "@/lib/types";
import KineticTitle from "../hero/KineticTitle";
import Chalkboard, { BOARD_LINES, Guide } from "../hero/Chalkboard";
import type { MascotMood } from "../Mascot";
import { STEPS } from "@/content/site";
import { ensureGsap, getLenis, reducedMotion } from "@/lib/motion";
import "./timeline.css";

/* „Jak pracuję”: trzy kroki obok tablicy. Na komputerze sekcja przypina się, a przewijanie
   pisze kredą rozwiązanie — każdy krok to kolejny etap zadania. Na telefonie (i bez przypięcia)
   tablica rozwiązuje się sama po wejściu na ekran, a stuknięcie w krok przewija do niego tablicę.
   Na tablicy nadal można pisać palcem/myszką. */

const SAY: { say: string; mood: MascotMood }[] = [
  { say: "Najpierw sprawdzam, o co w zadaniu chodzi.", mood: "think" },
  { say: "Plan: liczę deltę, potem pierwiastki.", mood: "think" },
  { say: "Gotowe — i wiem, skąd wziął się wynik.", mood: "happy" },
];

export default function Timeline({ steps: custom }: { steps: TimelineStep[] }) {
  const steps = custom?.length ? custom : STEPS;
  const root = React.useRef<HTMLElement>(null);
  const board = React.useRef<HTMLDivElement>(null);
  const ctl = React.useRef<{ go: (i: number) => void } | null>(null);
  const [active, setActive] = React.useState(0);
  const [pinned, setPinned] = React.useState(false);

  React.useEffect(() => {
    const el = root.current;
    const bd = board.current;
    if (!el || !bd) return;
    const lines = Array.from(bd.querySelectorAll<HTMLElement>(".board__line"));
    const all = () => {
      lines.forEach((l) => l.style.setProperty("--w", "1"));
      bd.querySelectorAll(".board__root").forEach((c) => { c.setAttribute("r", "5"); (c as SVGElement).style.opacity = "1"; });
      bd.querySelectorAll<SVGPathElement>(".board__axis, .board__parab, .board__circle path").forEach((p) => { p.style.strokeDashoffset = "0"; });
      bd.querySelectorAll<SVGElement>(".board__lbl").forEach((t) => { t.style.opacity = "1"; });
      bd.classList.add("is-solved");
    };
    if (reducedMotion()) {
      all();
      setActive(steps.length - 1);
      return;
    }
    const { gsap } = ensureGsap();
    const n = steps.length;
    const stepAt = (p: number) => Math.min(n - 1, Math.floor(p * n * 0.999));

    /* Jedna oś czasu (0…6) — sterowana przewijaniem albo odtwarzana sama. */
    const build = () => {
      gsap.set(lines, { "--w": 0 });
      gsap.set(bd.querySelectorAll(".board__axis, .board__parab, .board__circle path"), { strokeDashoffset: 1 });
      gsap.set(bd.querySelectorAll(".board__root"), { attr: { r: 0 }, opacity: 0 });
      const lbls = bd.querySelectorAll(".board__lbl");
      gsap.set(lbls, { opacity: 0 });
      const tl = gsap.timeline({ defaults: { ease: "none" } });
      tl.to(lines[0], { "--w": 1, duration: 1.2 }, 0)
        .to(bd.querySelector(".board__axis"), { strokeDashoffset: 0, duration: 0.6 }, 1.6)
        .to(lines[1], { "--w": 1, duration: 1 }, 2)
        .to(bd.querySelector(".board__parab"), { strokeDashoffset: 0, duration: 1 }, 2.6)
        .to(lines[2], { "--w": 1, duration: 0.8 }, 4)
        .to(bd.querySelector(".board__root--a"), { attr: { r: 5 }, opacity: 1, duration: 0.25, ease: "back.out(2)" }, 4.6)
        .to(lbls[0], { opacity: 1, duration: 0.25 }, 4.6)
        .to(lines[3], { "--w": 1, duration: 0.8 }, 4.8)
        .to(bd.querySelector(".board__root--b"), { attr: { r: 5 }, opacity: 1, duration: 0.25, ease: "back.out(2)" }, 5.4)
        .to(lbls[1], { opacity: 1, duration: 0.25 }, 5.4)
        .to(lines[4], { "--w": 1, duration: 0.5 }, 5.6)
        .to(bd.querySelector(".board__circle path"), { strokeDashoffset: 0, duration: 0.4 }, 6);
      return tl;
    };

    const mm = gsap.matchMedia();
    mm.add("(min-width: 900px)", () => {
      setPinned(true);
      const tl = build();
      const st = tl.duration();
      /* treść zadania pisze się sama, gdy tablica wjedzie — przewijanie robi resztę */
      const io = new IntersectionObserver(([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        if ((trig.scrollTrigger?.progress ?? 0) < 0.05) gsap.fromTo(lines[0], { "--w": 0 }, { "--w": 1, duration: 1.3, ease: "power1.inOut", delay: 0.2 });
      }, { threshold: 0.35 });
      io.observe(bd);
      const trig = gsap.timeline({
        scrollTrigger: {
          trigger: el, start: "top top", end: "+=170%", pin: true, scrub: 0.6, anticipatePin: 1,
          onUpdate: (self) => {
            setActive(stepAt(self.progress));
            el.style.setProperty("--tl-p", self.progress.toFixed(3));
            bd.classList.toggle("is-solved", self.progress > 0.96);
          },
        },
      });
      trig.add(tl, 0).to({}, { duration: st * 0.08 });
      ctl.current = {
        go: (i) => {
          const s = trig.scrollTrigger;
          if (!s) return;
          const y = s.start + (s.end - s.start) * Math.min(0.999, (i + 0.85) / n);
          const l = getLenis();
          if (l) l.scrollTo(y, { duration: 1.1 });
          else window.scrollTo({ top: y, behavior: "smooth" });
        },
      };
      return () => { io.disconnect(); trig.kill(); tl.kill(); setPinned(false); ctl.current = null; };
    });
    mm.add("(max-width: 899px)", () => {
      const tl = build().pause();
      const total = tl.duration();
      tl.eventCallback("onUpdate", () => {
        const p = tl.progress();
        setActive(stepAt(p));
        bd.classList.toggle("is-solved", p > 0.98);
      });
      const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { tl.timeScale(0.9).play(); io.disconnect(); } }, { threshold: 0.45 });
      io.observe(bd);
      ctl.current = { go: (i) => { tl.timeScale(1.4).tweenTo(Math.min(total, ((i + 1) / n) * total)); } };
      return () => { io.disconnect(); tl.kill(); ctl.current = null; };
    });
    return () => mm.revert();
  }, [steps.length]);

  const say = SAY[Math.min(SAY.length - 1, Math.floor((active / Math.max(1, steps.length - 1)) * (SAY.length - 1) + 0.0001))];

  return (
    <section id="jak-pracuje" ref={root} className={`tl ${pinned ? "tl--pinned" : ""}`}>
      <div className="tl__paper" aria-hidden="true" />
      <div className="wrap tl__grid">
        <div className="tl__copy">
          <span className="eyebrow">Jak pracuję</span>
          <KineticTitle as="h2" reveal="view" text="Krok po kroku, aż wynik ma sens" accentFrom={3} className="h-section" />
          <ol className="tl__steps" style={{ "--n": steps.length, "--a": active } as React.CSSProperties}>
            <span className="tl__rail" aria-hidden="true"><i /></span>
            {steps.map((s, i) => (
              <li key={i} className={`tl__step ${i === active ? "is-active" : ""} ${i < active ? "is-done" : ""}`}>
                <button type="button" onClick={() => ctl.current?.go(i)} aria-current={i === active ? "step" : undefined}>
                  <span className="tl__num" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                  <span className="tl__txt">
                    <strong>{s.title}</strong>
                    <span>{s.body}</span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
          <p className="tl__note muted">Tak wygląda praca na zajęciach — szczegóły ustalamy przy pierwszym kontakcie.</p>
        </div>

        <div className="tl__boardwrap">
          <Chalkboard boardRef={board} />
          <Guide className="tl__guide" mood={say.mood} say={say.say} size={92} />
        </div>
      </div>
      <p className="sr-only">
        Na tablicy: {BOARD_LINES.map((l) => l.text).join("; ")}; odpowiedź: x = 2 lub x = 3.
      </p>
    </section>
  );
}
