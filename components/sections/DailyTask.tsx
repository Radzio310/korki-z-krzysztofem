"use client";

import React from "react";
import Mascot, { type MascotMood } from "../Mascot";
import type { DailyTask as Task, Level, TaskCheck } from "@/lib/types";
import { publicApi } from "@/lib/api";
import { reducedMotion, ripple, scrollToTarget, useReveal } from "@/lib/motion";
import { warsawDay, fmtLong } from "@/lib/time";
import "./daily.css";

type Streak = { last: string; count: number };
const KEY = "kk-streak";

function readStreak(): Streak {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || "null") as Streak | null;
    return s && typeof s.count === "number" ? s : { last: "", count: 0 };
  } catch {
    return { last: "", count: 0 };
  }
}

/* Konfetti z kredy — krótka scena wyniku na płótnie nad tablicą. */
function burst(canvas: HTMLCanvasElement | null) {
  if (!canvas || reducedMotion()) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const r = canvas.getBoundingClientRect();
  const dpr = Math.min(2, devicePixelRatio || 1);
  canvas.width = r.width * dpr;
  canvas.height = r.height * dpr;
  ctx.scale(dpr, dpr);
  /* barwy konfetti z tokenów motywu */
  const cs = getComputedStyle(document.documentElement);
  const colors = ["--sun-400", "--sea-300", "--board-ink", "--mint-400", "--coral-400"].map((v) => cs.getPropertyValue(v).trim()).filter(Boolean);
  const parts = Array.from({ length: 90 }, () => ({
    x: r.width / 2, y: r.height * 0.55,
    vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 13 - 4,
    s: Math.random() * 6 + 3, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
    c: colors[Math.floor(Math.random() * colors.length)],
  }));
  let frame = 0;
  const tick = () => {
    ctx.clearRect(0, 0, r.width, r.height);
    parts.forEach((p) => {
      p.vy += 0.38; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = Math.max(0, 1 - frame / 110);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
      ctx.restore();
    });
    if (++frame < 110) requestAnimationFrame(tick);
    else ctx.clearRect(0, 0, r.width, r.height);
  };
  tick();
}

export default function DailyTask({ levels }: { levels: Level[] }) {
  const root = useReveal<HTMLElement>();
  const [task, setTask] = React.useState<Task | null | undefined>(undefined);
  const [hint, setHint] = React.useState(false);
  const [answer, setAnswer] = React.useState("");
  const [check, setCheck] = React.useState<TaskCheck | null>(null);
  const [tries, setTries] = React.useState(0);
  const [busy, setBusy] = React.useState(false);
  const [shake, setShake] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const [streak, setStreak] = React.useState<Streak>({ last: "", count: 0 });
  const confetti = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    setStreak(readStreak());
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      publicApi.dailyTask().then(setTask).catch(() => setTask(null));
    }, { rootMargin: "500px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [root]);

  const solvedToday = streak.last === warsawDay();

  const submit = async (reveal = false) => {
    if (!task || busy) return;
    if (!reveal && !answer.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const r = await publicApi.checkTask(task.id, answer, reveal);
      setCheck(r);
      if (r.correct) {
        burst(confetti.current);
        const today = warsawDay();
        const s = readStreak();
        const yesterday = warsawDay(new Date(Date.now() - 864e5));
        const next = s.last === today ? s : { last: today, count: s.last === yesterday ? s.count + 1 : 1 };
        try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* prywatny tryb */ }
        setStreak(next);
      } else if (!reveal) {
        setTries((t) => t + 1);
        setShake((n) => n + 1);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const mood: MascotMood = check?.correct ? "happy" : tries > 0 && !check?.solution ? "think" : hint ? "think" : "idle";
  const say = check?.correct
    ? streak.count > 1 ? `Brawo! To już ${streak.count}. dzień z rzędu.` : "Brawo, dokładnie tak!"
    : check?.solution
      ? "Tak to się rozwiązuje — jutro będzie nowe zadanie."
      : tries === 1
        ? "Blisko! Zerknij na podpowiedź."
        : tries > 1
          ? "Nie poddawaj się — albo zobacz rozwiązanie."
          : "Masz minutkę? Rozwiąż ze mną dzisiejsze zadanie.";

  const level = levels.find((l) => l.key === task?.level_key);

  return (
    <section id="zadanie" ref={root} className="section daily">
      <div className="wrap daily__grid">
        <div className="daily__copy">
          <span className="eyebrow" data-reveal>Zadanie dnia</span>
          <h2 className="h-section" data-reveal>Jedno zadanie <span className="text-sea">dziennie</span></h2>
          <p className="lead" data-reveal>Codziennie nowe. Wpisz wynik, sprawdź się, a jeśli utkniesz — podpowiedź i pełne rozwiązanie są pod ręką.</p>
          {streak.count > 0 ? (
            <div className="daily__streak" data-reveal>
              <span className="daily__flame" aria-hidden="true">🔥</span>
              <b>{streak.count}</b> {streak.count === 1 ? "dzień" : "dni"} z rzędu
            </div>
          ) : null}
        </div>

        <div className="daily__board" data-reveal>
          <canvas ref={confetti} className="daily__confetti" aria-hidden="true" />
          {task === undefined ? (
            <div className="daily__skeleton" aria-busy="true">
              <span /><span /><span />
            </div>
          ) : task === null ? (
            <div className="daily__empty">
              <Mascot mood="think" size={110} say="Dzisiejsze zadanie jeszcze się pisze — zajrzyj później." side="left" />
              <button type="button" className="btn" onClick={() => scrollToTarget("#quiz")}>Na razie sprawdź się w quizie</button>
            </div>
          ) : (
            <div className="daily__task">
              <div className="daily__meta">
                <span>{fmtLong(`${task.date}T12:00:00Z`)}</span>
                {level ? <span className="daily__lvl">{level.name}</span> : null}
              </div>
              <h3 className="daily__title chalk">{task.title}</h3>
              <p className="daily__body">{task.body}</p>

              {task.hint ? (
                <div className={`daily__hint ${hint ? "is-open" : ""}`}>
                  <button type="button" onClick={() => setHint((v) => !v)} aria-expanded={hint}>
                    <span aria-hidden="true">💡</span> {hint ? "Schowaj podpowiedź" : "Podpowiedź"}
                  </button>
                  <div className="daily__hint-body"><p>{task.hint}</p></div>
                </div>
              ) : null}

              {check?.correct || check?.solution ? (
                <div className={`daily__solution ${check.correct ? "is-ok" : ""}`}>
                  <span className="daily__badge">{check.correct ? "✓ Poprawnie" : "Rozwiązanie"}</span>
                  {check.answer ? <p className="daily__ans chalk">Odpowiedź: {check.answer}</p> : null}
                  {check.solution ? <p className="daily__sol">{check.solution}</p> : null}
                </div>
              ) : (
                <form className="daily__form" onSubmit={(e) => { e.preventDefault(); submit(false); }}>
                  <input
                    key={shake}
                    className={`input daily__input ${shake ? "is-wrong" : ""}`}
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder={solvedToday ? "Dziś już rozwiązane — spróbuj jeszcze raz" : "Twój wynik, np. 12 albo 3/4"}
                    aria-label="Twoja odpowiedź"
                    inputMode="text"
                    autoComplete="off"
                  />
                  <button type="submit" className="btn btn--gold" disabled={busy || !answer.trim()} onPointerDown={ripple}>
                    {busy ? <i className="spinner" /> : "Sprawdź"}
                  </button>
                  {tries >= 2 ? (
                    <button type="button" className="daily__reveal" onClick={() => submit(true)} disabled={busy}>Pokaż rozwiązanie</button>
                  ) : null}
                </form>
              )}
              {error ? <p className="form-error" role="alert">{error}</p> : null}
            </div>
          )}
          {task ? <Mascot className="daily__pi" mood={mood} say={say} size={104} side="right" /> : null}
        </div>
      </div>
    </section>
  );
}
