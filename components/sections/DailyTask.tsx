"use client";

import React from "react";
import { ChalkRing, Slate, chalkDust } from "../hero/Chalkboard";
import type { DailyTask as Task, Level, TaskCheck } from "@/lib/types";
import { publicApi } from "@/lib/api";
import { ripple, scrollToTarget, useReveal } from "@/lib/motion";
import { warsawDay, fmtLong } from "@/lib/time";
import "./daily.css";

/* Zadanie dnia na tablicy: data w rogu jak w szkole, treść kredą, odpowiedź „pisana kredą”
   (prawdziwe pole tekstowe w kroju kredy + klawiatura cyfr na półce tablicy), zła odpowiedź
   zostaje przekreślona, dobra — obwiedziona, z pyłem kredy; rozwiązanie rozpisuje się krok po kroku.
   Seria dni to kreski liczone piątkami (z localStorage, czyli prawdziwa). */

type Streak = { last: string; count: number };
const KEY = "kk-streak";
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", ",", "/", "-", ";"];

function readStreak(): Streak {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || "null") as Streak | null;
    return s && typeof s.count === "number" ? s : { last: "", count: 0 };
  } catch {
    return { last: "", count: 0 };
  }
}

/* Rozwiązanie z panelu → kroki: nowe linie albo koniec zdania przed wielką literą/cyfrą. */
function steps(text: string): string[] {
  return text
    .split(/\n+|(?<=[.!?])\s+(?=[A-ZĄĆĘŁŃÓŚŹŻ0-9(])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/* Kreski piątkami: cztery pionowe i piąta na ukos. Najwyżej 20 kresek, dalej sama liczba. */
function Tally({ n }: { n: number }) {
  const shown = Math.min(n, 20);
  const groups = Math.ceil(shown / 5);
  const w = groups * 38;
  let k = 0;
  return (
    <svg className="dt__tally" viewBox={`0 0 ${Math.max(w, 38)} 34`} width={Math.max(w, 38)} height={34} aria-hidden="true">
      {Array.from({ length: groups }).map((_, g) => {
        const inGroup = Math.min(5, shown - g * 5);
        return Array.from({ length: inGroup }).map((__, i) => {
          const x = g * 38 + 4 + i * 7;
          const d = i < 4 ? `M${x} 5 L${x + 0.8} 29` : `M${g * 38 + 1} 25 L${g * 38 + 30} 8`;
          const delay = 200 + k++ * 120;
          return <path key={`${g}-${i}`} pathLength={1} d={d} style={{ animationDelay: `${delay}ms` }} />;
        });
      })}
    </svg>
  );
}

export default function DailyTask({ levels }: { levels: Level[] }) {
  const root = useReveal<HTMLElement>();
  const [task, setTask] = React.useState<Task | null | undefined>(undefined);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [hint, setHint] = React.useState(false);
  const [answer, setAnswer] = React.useState("");
  const [check, setCheck] = React.useState<TaskCheck | null>(null);
  const [tries, setTries] = React.useState(0);
  const [wrong, setWrong] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [streak, setStreak] = React.useState<Streak>({ last: "", count: 0 });
  const dust = React.useRef<HTMLCanvasElement>(null);
  const input = React.useRef<HTMLInputElement>(null);
  const ansRef = React.useRef<HTMLSpanElement>(null);
  const uid = React.useId().replace(/:/g, "");

  const load = React.useCallback(() => {
    setTask(undefined);
    setLoadError(null);
    publicApi.dailyTask().then(setTask).catch((e: Error) => { setLoadError(e.message); setTask(null); });
  }, []);

  React.useEffect(() => {
    setStreak(readStreak());
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      load();
    }, { rootMargin: "500px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [root, load]);

  /* Pył kredy spod obwiedzionej odpowiedzi, gdy już jest na tablicy. */
  React.useEffect(() => {
    if (!check?.correct) return;
    const t = window.setTimeout(() => chalkDust(dust.current, ansRef.current), 380);
    return () => window.clearTimeout(t);
  }, [check]);

  const solvedToday = streak.last === warsawDay();

  const submit = async (reveal = false) => {
    if (!task || busy) return;
    if (!reveal && !answer.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const r = await publicApi.checkTask(task.id, answer, reveal);
      setCheck(r.correct || r.solution ? r : null);
      if (r.correct) {
        setWrong(false);
        const today = warsawDay();
        const s = readStreak();
        const yesterday = warsawDay(new Date(Date.now() - 864e5));
        const next = s.last === today ? s : { last: today, count: s.last === yesterday ? s.count + 1 : 1 };
        try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* prywatny tryb */ }
        setStreak(next);
      } else if (!reveal) {
        setTries((t) => t + 1);
        setWrong(true);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  /* Klawiatura cyfr na półce: wstawia w miejscu kursora, nie otwiera klawiatury telefonu. */
  const put = (k: string) => {
    const el = input.current;
    const focused = !!el && document.activeElement === el;
    const v = answer;
    const s = focused ? el!.selectionStart ?? v.length : v.length;
    const e = focused ? el!.selectionEnd ?? v.length : v.length;
    let next: string;
    let caret: number;
    if (k === "⌫") {
      if (s !== e) { next = v.slice(0, s) + v.slice(e); caret = s; }
      else { next = v.slice(0, Math.max(0, s - 1)) + v.slice(e); caret = Math.max(0, s - 1); }
    } else {
      next = (v.slice(0, s) + k + v.slice(e)).slice(0, 40);
      caret = Math.min(next.length, s + k.length);
    }
    setAnswer(next);
    setWrong(false);
    if (focused) requestAnimationFrame(() => el!.setSelectionRange(caret, caret));
  };

  const level = levels.find((l) => l.key === task?.level_key);
  const done = !!(check?.correct || check?.solution);
  const solSteps = check?.solution ? steps(check.solution) : [];

  let tray: React.ReactNode = null;
  if (task && !done) {
    tray = (
      <div className="dt__tray">
        <div className="dt__pad" role="group" aria-label="Klawiatura cyfr">
          {KEYS.map((k) => (
            <button key={k} type="button" className="dt__key ck" onPointerDown={(e) => e.preventDefault()} onClick={() => put(k)} aria-label={k === "-" ? "minus" : k === "/" ? "kreska ułamkowa" : k === ";" ? "średnik" : k === "," ? "przecinek" : k}>
              {k === "-" ? "−" : k}
            </button>
          ))}
          <button type="button" className="dt__key dt__key--back" onPointerDown={(e) => e.preventDefault()} onClick={() => put("⌫")} aria-label="Usuń znak">⌫</button>
        </div>
        <div className="dt__tools">
          {task.hint ? (
            <button type="button" className="ck-btn" onClick={() => setHint((v) => !v)} aria-expanded={hint} aria-controls={`dt-hint-${uid}`}>
              <svg className="dt__bulb" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.3 1.1 2.2h5c0-.9.4-1.6 1.1-2.2A6 6 0 0 0 12 3Z" /></svg>
              {hint ? "Schowaj podpowiedź" : "Podpowiedź"}
            </button>
          ) : null}
          {tries >= 2 ? <button type="button" className="ck-btn" onClick={() => submit(true)} disabled={busy}>Pokaż rozwiązanie</button> : null}
          <button type="button" className="ck-btn dt__sponge" onClick={() => { setAnswer(""); setWrong(false); input.current?.focus(); }} disabled={!answer}>
            <span className="board__sponge" aria-hidden="true" /> Wytrzyj
          </button>
        </div>
      </div>
    );
  } else if (task && done) {
    tray = (
      <div className="dt__tray dt__tray--done">
        <span className="dt__next">Nowe zadanie jutro rano.</span>
        <button type="button" className="ck-btn" onClick={() => scrollToTarget("#quiz")}>Sprawdź się w quizie</button>
      </div>
    );
  } else if (task === null) {
    tray = (
      <div className="dt__tray dt__tray--done">
        {loadError ? <button type="button" className="btn btn--gold btn--sm" onClick={load} onPointerDown={ripple}>Spróbuj ponownie</button> : null}
        <button type="button" className="ck-btn" onClick={() => scrollToTarget("#quiz")}>Na razie sprawdź się w quizie</button>
      </div>
    );
  }

  return (
    <section id="zadanie" ref={root} className="section daily">
      <div className="wrap daily__grid">
        <div className="daily__copy">
          <span className="eyebrow" data-reveal>Zadanie dnia</span>
          <h2 className="h-section" data-reveal>Jedno zadanie <span className="text-sea">dziennie</span></h2>
          <p className="lead" data-reveal>Codziennie nowe. Wpisz wynik, sprawdź się, a jeśli utkniesz — podpowiedź i pełne rozwiązanie są pod ręką.</p>
          {streak.count > 0 ? (
            <div className="daily__streak" data-reveal>
              <Tally n={streak.count} />
              <span><b>{streak.count}</b> {streak.count === 1 ? "dzień" : "dni"} z rzędu{solvedToday ? " · dziś zaliczone" : ""}</span>
            </div>
          ) : null}
        </div>

        <div className="daily__stage" data-reveal>
          <Slate className="dt" label="Tablica z zadaniem dnia" dustRef={dust} tray={tray}>
            {task === undefined ? (
              <div className="dt__skel" aria-busy="true" aria-label="Wczytuję zadanie">
                <span /><span /><span /><span />
              </div>
            ) : task === null ? (
              <div className="dt__empty">
                <p className="dt__empty-big ck cw">{loadError ? "Tablica chwilowo niedostępna" : "Dziś tablica jest jeszcze czysta"}</p>
                <p className="ck-soft dt__empty-sub">{loadError || "Zadanie pojawi się tu, gdy tylko zostanie zapisane."}</p>
              </div>
            ) : (
              <div className="dt__task">
                <div className="dt__head">
                  <p className="ck-label">Zadanie dnia{level ? ` · ${level.name}` : ""}</p>
                  <p className="dt__date ck">{fmtLong(`${task.date}T12:00:00Z`)}</p>
                </div>
                <h3 className="dt__title ck cw">{task.title}</h3>
                <p className="dt__body ck cf" style={{ "--cw-d": 300 } as React.CSSProperties}>{task.body}</p>

                {task.hint && hint ? (
                  <p className="dt__hint ck cw" id={`dt-hint-${uid}`}>
                    <svg viewBox="0 0 20 40" preserveAspectRatio="none" aria-hidden="true"><path d="M16 2 C 6 6, 8 18, 3 20 C 8 22, 6 34, 16 38" /></svg>
                    <span>{task.hint}</span>
                  </p>
                ) : null}

                {done && check ? (
                  <div className="dt__sol">
                    <p className={`dt__verdict ck cw ${check.correct ? "is-ok" : ""}`}>
                      {check.correct ? (
                        <><svg className="dt__tick" viewBox="0 0 40 32" aria-hidden="true"><path pathLength={1} d="M3 17 L14 28 L37 3" /></svg> Poprawnie!</>
                      ) : "Rozwiązanie krok po kroku"}
                    </p>
                    {solSteps.length ? (
                      <ol className="dt__steps">
                        {solSteps.map((s, i) => (
                          <li key={i} className="ck cw" style={{ "--cw-d": 350 + i * 650, "--cw-t": "620ms" } as React.CSSProperties}>{s}</li>
                        ))}
                      </ol>
                    ) : null}
                    {check.answer ? (
                      <p className="dt__final ck cf" style={{ "--cw-d": 400 + solSteps.length * 650 } as React.CSSProperties}>
                        Odp.: <span className="dt__ans ck-choice is-on" ref={ansRef}>{check.answer}<ChalkRing v={task.id} /></span>
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <>
                    <form className="dt__form" onSubmit={(e) => { e.preventDefault(); submit(false); }}>
                      <label className="dt__odp ck" htmlFor={`dt-in-${uid}`}>Odp.:</label>
                      <span className={`dt__field ${wrong ? "is-wrong" : ""}`} key={tries} style={{ "--n": answer.length } as React.CSSProperties}>
                        <input
                          id={`dt-in-${uid}`}
                          ref={input}
                          className="dt__input ck"
                          value={answer}
                          onChange={(e) => { setAnswer(e.target.value); setWrong(false); }}
                          placeholder={solvedToday ? "spróbuj jeszcze raz" : "wpisz wynik"}
                          aria-invalid={wrong || undefined}
                          aria-describedby={`dt-fb-${uid}`}
                          autoComplete="off" autoCapitalize="off" autoCorrect="off" spellCheck={false}
                          enterKeyHint="done"
                          maxLength={40}
                        />
                        <svg className="dt__line" viewBox="0 0 300 10" preserveAspectRatio="none" aria-hidden="true"><path d="M2 6 C 80 3, 200 8, 298 4" /></svg>
                        {wrong ? <svg className="dt__strike" viewBox="0 0 300 40" preserveAspectRatio="none" aria-hidden="true"><path pathLength={1} d="M4 26 C 90 18, 190 22, 296 12" /></svg> : null}
                      </span>
                      <button type="submit" className="btn btn--gold btn--sm dt__check" disabled={busy || !answer.trim()} onPointerDown={ripple}>
                        {busy ? <i className="spinner" /> : "Sprawdź"}
                      </button>
                    </form>
                    <p className="dt__fb" id={`dt-fb-${uid}`} aria-live="polite">
                      {wrong ? <span className="ck ck-acc">Jeszcze nie — spróbuj ponownie.</span> : <span>Ułamek jako a/b, dwie liczby rozdziel średnikiem.</span>}
                    </p>
                  </>
                )}
                {error ? <p className="form-error" role="alert">{error}</p> : null}
              </div>
            )}
          </Slate>
        </div>
      </div>
    </section>
  );
}
