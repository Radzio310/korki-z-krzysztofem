"use client";

import React from "react";
import Mascot from "../Mascot";
import type { Level, QuizQuestion, QuizResult } from "@/lib/types";
import { publicApi } from "@/lib/api";
import { emitHandoff, reducedMotion, ripple, scrollToTarget, useReveal } from "@/lib/motion";
import "./quiz.css";

const LIMIT = 60;
const MAX_Q = 8;

type Phase = "intro" | "loading" | "empty" | "run" | "scoring" | "result" | "error";

function pick(rows: QuizQuestion[], levels: Level[]): QuizQuestion[] {
  const order = new Map(levels.map((l, i) => [l.key, i]));
  const shuffled = [...rows].sort(() => Math.random() - 0.5);
  const byLevel = new Map<string, QuizQuestion[]>();
  shuffled.forEach((q) => {
    const k = q.level_key || "_";
    byLevel.set(k, [...(byLevel.get(k) || []), q]);
  });
  const keys = [...byLevel.keys()].sort((a, b) => (order.get(a) ?? 99) - (order.get(b) ?? 99));
  const out: QuizQuestion[] = [];
  /* po równo z każdego poziomu, od najłatwiejszego */
  let round = 0;
  while (out.length < MAX_Q && keys.some((k) => (byLevel.get(k)?.length || 0) > round)) {
    keys.forEach((k) => {
      const q = byLevel.get(k)?.[round];
      if (q && out.length < MAX_Q) out.push(q);
    });
    round++;
  }
  return out.sort((a, b) => (order.get(a.level_key || "_") ?? 99) - (order.get(b.level_key || "_") ?? 99));
}

export default function Quiz({ levels }: { levels: Level[] }) {
  const root = useReveal<HTMLElement>();
  const [phase, setPhase] = React.useState<Phase>("intro");
  const [qs, setQs] = React.useState<QuizQuestion[]>([]);
  const [idx, setIdx] = React.useState(0);
  const [answers, setAnswers] = React.useState<{ id: number; choice: number }[]>([]);
  const [left, setLeft] = React.useState(LIMIT);
  const [chosen, setChosen] = React.useState<number | null>(null);
  const [result, setResult] = React.useState<QuizResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [showReview, setShowReview] = React.useState(false);
  const startedAt = React.useRef(0);
  const answersRef = React.useRef(answers);
  answersRef.current = answers;
  const pool = React.useRef<QuizQuestion[] | null>(null);

  /* Pytania pobieramy, gdy sekcja zbliża się do ekranu — start jest wtedy natychmiastowy. */
  React.useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      publicApi.quiz().then((r) => { pool.current = r.rows; }).catch(() => { pool.current = null; });
    }, { rootMargin: "600px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [root]);

  const submit = React.useCallback(async (final: { id: number; choice: number }[]) => {
    setPhase("scoring");
    const secs = Math.min(LIMIT, Math.round((performance.now() - startedAt.current) / 1000));
    try {
      const r = await publicApi.score(final, secs);
      setResult(r);
      setPhase("result");
    } catch (e) {
      setError((e as Error).message);
      setPhase("error");
    }
  }, []);

  const start = async () => {
    setError(null);
    setResult(null);
    setShowReview(false);
    let rows = pool.current;
    if (!rows) {
      setPhase("loading");
      try {
        rows = (await publicApi.quiz()).rows;
        pool.current = rows;
      } catch (e) {
        setError((e as Error).message);
        setPhase("error");
        return;
      }
    }
    if (!rows.length) return setPhase("empty");
    setQs(pick(rows, levels));
    setIdx(0);
    setAnswers([]);
    setChosen(null);
    setLeft(LIMIT);
    startedAt.current = performance.now();
    setPhase("run");
  };

  /* Zegar: prawdziwe 60 sekund; po czasie wysyłamy to, co jest. */
  React.useEffect(() => {
    if (phase !== "run") return;
    const t = window.setInterval(() => {
      const l = LIMIT - Math.floor((performance.now() - startedAt.current) / 1000);
      setLeft(Math.max(0, l));
      if (l <= 0) {
        window.clearInterval(t);
        submit(answersRef.current);
      }
    }, 250);
    return () => window.clearInterval(t);
  }, [phase, submit]);

  const choose = React.useCallback((choice: number) => {
    if (phase !== "run" || chosen !== null) return;
    const q = qs[idx];
    setChosen(choice);
    const next = [...answersRef.current, { id: q.id, choice }];
    setAnswers(next);
    window.setTimeout(() => {
      setChosen(null);
      if (idx + 1 >= qs.length) submit(next);
      else setIdx((i) => i + 1);
    }, reducedMotion() ? 0 : 380);
  }, [phase, chosen, qs, idx, submit]);

  /* Klawiatura: 1–6 wybiera odpowiedź. */
  React.useEffect(() => {
    if (phase !== "run") return;
    const on = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= (qs[idx]?.options.length || 0)) choose(n - 1);
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [phase, qs, idx, choose]);

  const recLevel = levels.find((l) => l.key === result?.level_key_recommended);
  const pct = result && result.total ? result.score / result.total : 0;
  const mood = !result ? "idle" : pct >= 0.75 ? "happy" : pct >= 0.4 ? "wow" : "think";
  const say = !result
    ? ""
    : pct >= 0.75
      ? "Mocny wynik — wchodzimy od razu w trudniejsze zadania!"
      : pct >= 0.4
        ? "Dobra baza — wiem już, od czego zaczniemy."
        : "Spokojnie, zaczniemy od podstaw i pójdzie szybko.";

  const q = qs[idx];

  return (
    <section id="quiz" ref={root} className="section quiz">
      <div className="wrap quiz__grid">
        <div className="quiz__copy">
          <span className="eyebrow" data-reveal>Quiz poziomu</span>
          <h2 className="h-section" data-reveal>Sprawdź się <span className="text-sea">w 60 sekund</span></h2>
          <p className="lead" data-reveal>Kilka szybkich pytań, od łatwych do trudnych. Na końcu zobaczysz wynik, omówienie i podpowiedź, od którego poziomu zacząć.</p>
          <ul className="quiz__bullets" data-reveal>
            <li><b>60 s</b> prawdziwego zegara</li>
            <li><b>1–{MAX_Q}</b> pytań z rosnącą trudnością</li>
            <li><b>klawisze 1–4</b> działają</li>
          </ul>
        </div>

        <div className="quiz__stage card" data-reveal data-phase={phase}>
          {phase === "intro" || phase === "loading" ? (
            <div className="quiz__intro">
              <Mascot mood="wave" size={120} say="Gotowy? Zegar rusza po kliknięciu." side="left" />
              <button type="button" className="quiz__start" onClick={start} onPointerDown={ripple} disabled={phase === "loading"}>
                <svg viewBox="0 0 120 120" aria-hidden="true">
                  <circle cx="60" cy="60" r="54" className="quiz__start-bg" />
                  <circle cx="60" cy="60" r="54" className="quiz__start-ring" pathLength={1} />
                </svg>
                <span>{phase === "loading" ? <i className="spinner" /> : <>Start<small>60 s</small></>}</span>
              </button>
            </div>
          ) : null}

          {phase === "empty" ? (
            <div className="quiz__empty">
              <Mascot mood="think" size={120} say="Układam właśnie pytania — wpadnij tu za chwilę." side="left" />
              <p className="muted">Quiz jeszcze się przygotowuje. W międzyczasie możesz od razu zarezerwować lekcję próbną.</p>
              <button type="button" className="btn btn--primary" onClick={() => scrollToTarget("#rezerwacja")} onPointerDown={ripple}>Przejdź do rezerwacji</button>
            </div>
          ) : null}

          {phase === "run" && q ? (
            <div className="quiz__run">
              <div className="quiz__bar">
                <div className={`quiz__clock ${left <= 10 ? "is-low" : ""}`} style={{ "--t": left / LIMIT } as React.CSSProperties} aria-label={`Zostało ${left} sekund`}>
                  <svg viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="19" pathLength={1} /></svg>
                  <span>{left}</span>
                </div>
                <div className="quiz__dots" aria-label={`Pytanie ${idx + 1} z ${qs.length}`}>
                  {qs.map((_, i) => <i key={i} className={i < idx ? "done" : i === idx ? "now" : ""} />)}
                </div>
              </div>
              <div className="quiz__deck">
                <div className="quiz__card" key={q.id}>
                  <span className="quiz__lvl">{levels.find((l) => l.key === q.level_key)?.name || "Pytanie"} · {idx + 1}/{qs.length}</span>
                  <p className="quiz__q">{q.prompt}</p>
                  <div className="quiz__opts" role="group" aria-label="Odpowiedzi">
                    {q.options.map((o, i) => (
                      <button
                        type="button"
                        key={i}
                        className={`quiz__opt ${chosen === i ? "is-chosen" : ""}`}
                        onClick={() => choose(i)}
                        onPointerDown={ripple}
                        disabled={chosen !== null}
                      >
                        <kbd>{i + 1}</kbd>
                        <span>{o}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="quiz__ghost quiz__ghost--1" aria-hidden="true" />
                <div className="quiz__ghost quiz__ghost--2" aria-hidden="true" />
              </div>
            </div>
          ) : null}

          {phase === "scoring" ? (
            <div className="quiz__scoring"><i className="spinner" /> Liczę wynik…</div>
          ) : null}

          {phase === "result" && result ? (
            <div className="quiz__result">
              <div className="quiz__score" style={{ "--pct": pct } as React.CSSProperties}>
                <svg viewBox="0 0 160 160" aria-hidden="true">
                  <circle cx="80" cy="80" r="68" className="quiz__score-bg" />
                  <circle cx="80" cy="80" r="68" className="quiz__score-fg" pathLength={1} />
                </svg>
                <div>
                  <strong>{result.score}<small>/{result.total}</small></strong>
                  <span>{result.seconds} s</span>
                </div>
                <Mascot className="quiz__pi" mood={mood} size={92} say={say} side="right" />
              </div>
              <div className="quiz__verdict">
                <p className="quiz__rec">
                  {recLevel ? <>Proponowany poziom startowy: <b>{recLevel.name}</b></> : <>Zaczniemy od solidnych podstaw — dopasujemy tempo na pierwszej lekcji.</>}
                </p>
                <div className="quiz__actions">
                  <button
                    type="button"
                    className="btn btn--primary"
                    onPointerDown={ripple}
                    onClick={() => { emitHandoff({ level_key: recLevel?.key, source: "quiz" }); scrollToTarget("#cennik"); }}
                  >
                    {recLevel ? "Zobacz cenę dla tego poziomu" : "Zobacz cennik"}
                  </button>
                  <button type="button" className="btn" onClick={start} onPointerDown={ripple}>Jeszcze raz</button>
                </div>
                <button type="button" className="quiz__toggle" onClick={() => setShowReview((v) => !v)} aria-expanded={showReview}>
                  {showReview ? "Schowaj omówienie" : "Pokaż omówienie odpowiedzi"}
                </button>
                {showReview ? (
                  <ol className="quiz__review">
                    {qs.map((qq) => {
                      const r = result.results.find((x) => x.id === qq.id);
                      const mine = answers.find((a) => a.id === qq.id);
                      return (
                        <li key={qq.id} className={r?.correct ? "ok" : "no"}>
                          <p>{qq.prompt}</p>
                          <p className="muted">
                            {mine ? <>Twoja: {qq.options[mine.choice]} · </> : <>Bez odpowiedzi · </>}
                            Poprawna: <b>{r ? qq.options[r.correct_index] : "—"}</b>
                          </p>
                          {r?.explanation ? <p className="quiz__exp">{r.explanation}</p> : null}
                        </li>
                      );
                    })}
                  </ol>
                ) : null}
              </div>
            </div>
          ) : null}

          {phase === "error" ? (
            <div className="quiz__empty">
              <Mascot mood="sad" size={110} say="Coś mi przerwało — spróbujmy jeszcze raz." side="left" />
              <p className="form-error">{error}</p>
              <button type="button" className="btn btn--primary" onClick={start}>Spróbuj ponownie</button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
