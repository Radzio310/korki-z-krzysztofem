"use client";

import React from "react";
import type { MascotMood } from "../Mascot";
import { ChalkRing, Guide, Slate, chalkDust, roughLoop } from "../hero/Chalkboard";
import type { Level, QuizQuestion, QuizResult } from "@/lib/types";
import { publicApi } from "@/lib/api";
import { emitHandoff, reducedMotion, ripple, scrollToTarget, useReveal } from "@/lib/motion";
import "./quiz.css";

/* Quiz poziomu jako kartkówka na tablicy: pytanie pisane kredą, odpowiedzi w kółkach
   do stuknięcia (prawdziwe przyciski, klawisze 1–4), zegar rysowany kredą, gąbka przeciera
   tablicę przed następnym pytaniem, a wynik to wykres słupkowy kredą — trafność na każdym
   poziomie z prawdziwych odpowiedzi i strzałka „start tutaj” przy poziomie z serwera. */

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

/* Krótka etykieta pod słupkiem: „Szkoła podstawowa, klasy 1–4” → „SP · kl. 1–4”. Pełna nazwa w title/aria. */
function shortName(name: string) {
  const base = name.replace(/\s*\(.*?\)\s*/g, " ").trim();
  const m = base.match(/klas[ay]?\s+(.+)$/i);
  if (/^szkoła podstawowa/i.test(base) && m) return `SP · kl. ${m[1]}`;
  return base.length > 22 ? `${base.slice(0, 20).trim()}…` : base;
}

/* Zegar kredą: obręcz, 12 kresek, pozostały czas jako gruby łuk i wskazówka (transform). */
function ChalkClock({ left }: { left: number }) {
  const t = left / LIMIT;
  return (
    <div className={`qz__clock ${left <= 10 ? "is-low" : ""}`} role="timer" aria-label={`Zostało ${left} sekund`}>
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path className="qz__face" d={roughLoop(32, 32, 27, 27, 5)} />
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i / 12) * Math.PI * 2;
          const r1 = i % 3 === 0 ? 19 : 21.5;
          return <line key={i} className="qz__tick" x1={32 + Math.sin(a) * r1} y1={32 - Math.cos(a) * r1} x2={32 + Math.sin(a) * 24} y2={32 - Math.cos(a) * 24} />;
        })}
        <circle className="qz__left" cx="32" cy="32" r="14" pathLength={1} transform="rotate(-90 32 32)" style={{ strokeDashoffset: 1 - t }} />
        <g className="qz__hand" style={{ transform: `rotate(${(1 - t) * 360}deg)` }}>
          <line x1="32" y1="33" x2="32" y2="12" />
        </g>
        <circle className="qz__pin" cx="32" cy="32" r="2.4" />
      </svg>
      <span className="ck"><b>{left}</b> s</span>
    </div>
  );
}

type Bar = { key: string; name: string; asked: number; correct: number };

function Chart({ bars, rec }: { bars: Bar[]; rec?: string }) {
  const label = bars.map((b) => `${b.name}: ${b.correct} z ${b.asked}`).join("; ");
  return (
    <div className="qz__chart" role="img" aria-label={`Trafność na poziomach — ${label}`}>
      <svg className="qz__axis" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true">
        <path pathLength={1} d="M0 5 C 30 4, 70 6.5, 100 4.6" />
      </svg>
      {bars.map((b, i) => (
        <div
          key={b.key}
          className={`qz__bar ${b.key === rec ? "is-rec" : ""}`}
          style={{ "--v": b.asked ? Math.max(0.04, b.correct / b.asked) : 0.04, "--k": i } as React.CSSProperties}
          title={b.name}
        >
          <span className="qz__col">
            <i className="hatch" />
            <span className="qz__val ck cw" style={{ "--cw-d": 900 + i * 220 } as React.CSSProperties}>{b.correct}/{b.asked}</span>
          </span>
          <span className="qz__lbl">{shortName(b.name)}</span>
          {b.key === rec ? <span className="qz__here ck cw" style={{ "--cw-d": 1500 } as React.CSSProperties}>↑ start tutaj</span> : null}
        </div>
      ))}
    </div>
  );
}

function Mark({ ok }: { ok: boolean }) {
  return (
    <svg className={`qz__mark ${ok ? "ok" : "no"}`} viewBox="0 0 24 24" aria-hidden="true">
      {ok ? <path pathLength={1} d="M3 13 L9 19 L21 4" /> : <path pathLength={1} d="M5 5 L19 19 M19 5 L5 19" />}
    </svg>
  );
}

function plural(n: number, one: string, few: string, many: string) {
  if (n === 1) return one;
  const d = n % 10, h = n % 100;
  return d >= 2 && d <= 4 && (h < 10 || h >= 20) ? few : many;
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
  const [poolRows, setPoolRows] = React.useState<QuizQuestion[] | null>(null);
  const dust = React.useRef<HTMLCanvasElement>(null);
  const scoreRef = React.useRef<HTMLParagraphElement>(null);

  /* Pytania pobieramy, gdy sekcja zbliża się do ekranu — start jest wtedy natychmiastowy. */
  React.useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      publicApi.quiz().then((r) => { pool.current = r.rows; setPoolRows(r.rows); }).catch(() => { pool.current = null; });
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

  /* Dobry wynik = pył kredy spod liczby punktów. */
  React.useEffect(() => {
    if (phase !== "result" || !result?.total) return;
    if (result.score / result.total < 0.5) return;
    const t = window.setTimeout(() => chalkDust(dust.current, scoreRef.current), 500);
    return () => window.clearTimeout(t);
  }, [phase, result]);

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
        setPoolRows(rows);
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

  const reset = () => {
    setPhase("intro");
    setResult(null);
    setShowReview(false);
    setChosen(null);
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
    }, reducedMotion() ? 0 : 480);
  }, [phase, chosen, qs, idx, submit]);

  /* Klawiatura: 1–6 wybiera odpowiedź. */
  React.useEffect(() => {
    if (phase !== "run") return;
    const on = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      const n = Number(e.key);
      if (n >= 1 && n <= (qs[idx]?.options.length || 0)) choose(n - 1);
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [phase, qs, idx, choose]);

  const levelName = (key: string | null | undefined) => levels.find((l) => l.key === key)?.name;
  const recLevel = levels.find((l) => l.key === result?.level_key_recommended);
  const pct = result && result.total ? result.score / result.total : 0;

  /* Słupki: trafność na każdym poziomie z prawdziwych odpowiedzi (kolejność poziomów z oferty). */
  const bars: Bar[] = React.useMemo(() => {
    if (!result) return [];
    const map = new Map<string, Bar>();
    qs.forEach((q) => {
      const k = q.level_key || "_";
      const b = map.get(k) || { key: k, name: levels.find((l) => l.key === q.level_key)?.name || "Inne", asked: 0, correct: 0 };
      b.asked += 1;
      if (result.results.find((r) => r.id === q.id)?.correct) b.correct += 1;
      map.set(k, b);
    });
    return [...map.values()];
  }, [result, qs, levels]);

  let mood: MascotMood = "wave";
  let say = "Gotowy? Zegar rusza po stuknięciu w Start.";
  if (phase === "run") {
    mood = left <= 10 ? "wow" : "think";
    say = left <= 10 ? "Ostatnie sekundy — stawiaj na pierwszy odruch!" : "Stuknij odpowiedź albo naciśnij jej numer.";
  } else if (phase === "scoring") {
    mood = "think"; say = "Sprawdzam odpowiedzi…";
  } else if (phase === "result" && result) {
    mood = pct >= 0.75 ? "happy" : pct >= 0.4 ? "wow" : "think";
    say = pct >= 0.75
      ? "Mocny wynik — wchodzimy od razu w trudniejsze zadania!"
      : pct >= 0.4
        ? "Dobra baza — wiem już, od czego zaczniemy."
        : "Spokojnie, zaczniemy od podstaw i pójdzie szybko.";
  } else if (phase === "empty") {
    mood = "think"; say = "Układam właśnie pytania — wpadnij tu za chwilę.";
  } else if (phase === "error") {
    mood = "sad"; say = "Coś mi przerwało — spróbujmy jeszcze raz.";
  }

  const live =
    phase === "run" ? `Pytanie ${idx + 1} z ${qs.length}` :
    phase === "scoring" ? "Liczę wynik" :
    phase === "result" && result ? `Wynik: ${result.score} na ${result.total} w ${result.seconds} sekund. ${recLevel ? `Proponowany poziom startowy: ${recLevel.name}.` : ""}` :
    phase === "error" ? (error || "Błąd") : "";

  const q = qs[idx];

  /* Zapowiedź na tablicy startowej — z prawdziwej puli pytań (gdy już wczytana), inaczej z oferty. */
  const poolKeys = poolRows ? [...new Set(poolRows.map((r) => r.level_key || "_"))] : levels.map((l) => l.key);
  const orderedKeys = levels.map((l) => l.key).filter((k) => poolKeys.includes(k));
  const nQ = poolRows ? Math.min(MAX_Q, poolRows.length) : MAX_Q;
  const nL = poolRows ? poolKeys.length : levels.length;
  const pathNames = orderedKeys.map((k) => shortName(levels.find((l) => l.key === k)?.name || k));

  const sticks = (
    <span className="qz__sticks" aria-hidden="true">
      <span className="board__stick board__stick--white" />
      <span className="board__stick board__stick--gold" />
    </span>
  );
  const sponge = (
    <button type="button" className="ck-btn qz__sponge" onClick={reset}>
      <span className="board__sponge" aria-hidden="true" /> Wytrzyj
    </button>
  );

  let tray: React.ReactNode = null;
  if (phase === "intro" || phase === "loading") tray = <>{sticks}<span className="qz__keys">klawisze 1–4 też działają</span></>;
  else if (phase === "run") tray = <>{sticks}<span className="qz__keys">klawisze 1–{q?.options.length || 4}</span>{sponge}</>;
  else if (phase === "result") {
    tray = (
      <>
        <button
          type="button"
          className="btn btn--gold btn--sm"
          onPointerDown={ripple}
          onClick={() => { emitHandoff({ level_key: recLevel?.key, source: "quiz" }); scrollToTarget("#cennik"); }}
        >
          {recLevel ? "Zobacz plan dla tego poziomu" : "Ułóż plan zajęć"}
        </button>
        <button type="button" className="ck-btn" onClick={() => setShowReview((v) => !v)} aria-expanded={showReview} aria-controls="qz-review">
          {showReview ? "Schowaj omówienie" : "Omówienie"}
        </button>
        <button type="button" className="ck-btn" onClick={start}>Jeszcze raz</button>
      </>
    );
  } else if (phase === "empty") {
    tray = <button type="button" className="btn btn--gold btn--sm" onClick={() => scrollToTarget("#rezerwacja")} onPointerDown={ripple}>Przejdź do rezerwacji</button>;
  } else if (phase === "error") {
    tray = <button type="button" className="btn btn--gold btn--sm" onClick={start} onPointerDown={ripple}>Spróbuj ponownie</button>;
  }

  return (
    <section id="quiz" ref={root} className="section quiz">
      <div className="wrap quiz__grid">
        <div className="quiz__copy">
          <span className="eyebrow" data-reveal>Quiz poziomu</span>
          <h2 className="h-section" data-reveal>Sprawdź się <span className="text-sea">w 60 sekund</span></h2>
          <p className="lead" data-reveal>Kilka szybkich pytań, od łatwych do trudnych. Na końcu zobaczysz wynik, omówienie i podpowiedź, od którego poziomu zacząć.</p>
          {phase === "result" || phase === "error" || phase === "empty" ? <Guide className="quiz__guide" mood={mood} say={say} size={96} /> : null}
        </div>

        <div className="quiz__stage" data-reveal>
          <Slate className={`qz qz--${phase}`} label="Tablica quizu" dustRef={dust} tray={<div className="qz__tray">{tray}</div>}>
            <p className="sr-only" aria-live="polite">{live}</p>

            {phase === "intro" || phase === "loading" ? (
              <div className="qz__intro">
                <p className="ck-label qz__kicker">Kartkówka na czas</p>
                <ul className="qz__facts">
                  <li className="cw" style={{ "--cw-d": 120 } as React.CSSProperties}><b className="ck">{nQ}</b><span>{plural(nQ, "pytanie", "pytania", "pytań")}</span></li>
                  <li className="cw" style={{ "--cw-d": 320 } as React.CSSProperties}><b className="ck">{LIMIT}</b><span>sekund</span></li>
                  {nL > 1 ? <li className="cw" style={{ "--cw-d": 520 } as React.CSSProperties}><b className="ck">{nL}</b><span>{plural(nL, "poziom", "poziomy", "poziomów")}</span></li> : null}
                </ul>
                <button type="button" className="qz__start ck-choice" onClick={start} disabled={phase === "loading"} aria-describedby="qz-path">
                  <svg viewBox="0 0 160 160" aria-hidden="true">
                    <path className="qz__start-a" pathLength={1} d={roughLoop(80, 80, 66, 64, 11)} />
                    <path className="qz__start-b" pathLength={1} d={roughLoop(80, 80, 72, 70, 23)} />
                  </svg>
                  <span className="ck">{phase === "loading" ? "…" : "Start"}<small>zegar rusza po stuknięciu</small></span>
                </button>
                {pathNames.length > 1 ? (
                  <p className="qz__path ck" id="qz-path">
                    {pathNames.map((n, i) => (
                      <span key={n} className="cw" style={{ "--cw-d": 800 + i * 260 } as React.CSSProperties}>{i ? <i aria-hidden="true">›</i> : null}{n}</span>
                    ))}
                  </p>
                ) : <p className="qz__path ck ck-soft" id="qz-path">od łatwych do trudnych</p>}
                <p className="qz__after">Na końcu: wynik na każdym poziomie i omówienie odpowiedzi.</p>
              </div>
            ) : null}

            {phase === "run" && q ? (
              <div className="qz__run">
                <div className="qz__top">
                  <ChalkClock left={left} />
                  <p className="qz__count ck">Pytanie {idx + 1}<span className="ck-soft"> / {qs.length}</span></p>
                  <ol className="qz__marks" aria-hidden="true">
                    {qs.map((qq, i) => <li key={qq.id} className={i < idx ? "done" : i === idx ? "now" : ""} />)}
                  </ol>
                </div>
                <div className="qz__sheet" key={q.id}>
                  {idx > 0 ? <span className="wipe" aria-hidden="true" /> : null}
                  {levelName(q.level_key) ? <p className="ck-label cf" style={{ "--cw-d": idx ? 320 : 0 } as React.CSSProperties}>{levelName(q.level_key)}</p> : null}
                  <p className="qz__q ck cw" style={{ "--cw-d": idx ? 340 : 60 } as React.CSSProperties}>{q.prompt}</p>
                  <div className="qz__opts" role="group" aria-label="Odpowiedzi">
                    {q.options.map((o, i) => (
                      <button
                        type="button"
                        key={i}
                        className={`qz__opt ck-choice ${chosen === i ? "is-on" : ""} ${chosen !== null && chosen !== i ? "is-off" : ""}`}
                        onClick={() => choose(i)}
                        disabled={chosen !== null}
                        aria-keyshortcuts={String(i + 1)}
                      >
                        <span className="qz__key" aria-hidden="true">{i + 1}</span>
                        <span className="qz__otxt ck cw" style={{ "--cw-d": (idx ? 560 : 300) + i * 110, "--cw-t": "380ms" } as React.CSSProperties}>{o}</span>
                        <ChalkRing v={q.id + i} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {phase === "scoring" ? (
              <div className="qz__center">
                <p className="qz__big ck">Sprawdzam<span className="qz__dots" aria-hidden="true"><i /><i /><i /></span></p>
              </div>
            ) : null}

            {phase === "result" && result ? (
              <div className="qz__res">
                <div className="qz__score">
                  <p className="ck-label">Wynik</p>
                  <p className="qz__frac ck cw" ref={scoreRef}><b>{result.score}</b><span>/{result.total}</span></p>
                  <svg className="qz__under" viewBox="0 0 120 16" preserveAspectRatio="none" aria-hidden="true">
                    <path pathLength={1} d="M4 6 C 40 3, 80 4, 116 5 M10 12 C 46 9, 84 11, 112 10" />
                  </svg>
                  <p className="ck ck-soft qz__time cw" style={{ "--cw-d": 500 } as React.CSSProperties}>w {result.seconds} s</p>
                </div>
                <Chart bars={bars} rec={recLevel?.key} />
                <p className="qz__rec">
                  {recLevel ? <>Proponowany start: <b className="ck">{recLevel.name}</b></> : <>Zaczniemy od solidnych podstaw — tempo dopasujemy na pierwszej lekcji.</>}
                </p>
                {showReview ? (
                  <ol className="qz__review" id="qz-review">
                    {qs.map((qq) => {
                      const r = result.results.find((x) => x.id === qq.id);
                      const mine = answers.find((a) => a.id === qq.id);
                      return (
                        <li key={qq.id}>
                          <Mark ok={!!r?.correct} />
                          <div>
                            <p className="ck qz__rq">{qq.prompt}</p>
                            <p className="qz__ra">
                              {mine ? <>Twoja: {qq.options[mine.choice]} · </> : <>Bez odpowiedzi · </>}
                              Poprawna: <b>{r ? qq.options[r.correct_index] : "—"}</b>
                            </p>
                            {r?.explanation ? <p className="qz__rx">{r.explanation}</p> : null}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                ) : null}
              </div>
            ) : null}

            {phase === "empty" || phase === "error" ? (
              <div className="qz__center">
                <p className="qz__big ck cw">{phase === "empty" ? "Pytania jeszcze się układają" : "Nie udało się"}</p>
                <p className="qz__sub ck-soft">
                  {phase === "empty" ? "Quiz pojawi się tu wkrótce. W międzyczasie możesz od razu zarezerwować lekcję próbną." : error}
                </p>
                <span className="qz__smudge" aria-hidden="true" />
              </div>
            ) : null}
          </Slate>
        </div>
      </div>
    </section>
  );
}
