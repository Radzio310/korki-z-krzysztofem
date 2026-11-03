"use client";

import React from "react";
import Mascot from "../Mascot";
import Sheet from "../ui/Sheet";
import Stars from "../ui/Stars";
import KineticTitle from "../hero/KineticTitle";
import type { Review } from "@/lib/types";
import { publicApi } from "@/lib/api";
import { FALLBACK_REVIEWS, REVIEWS_HEAD } from "@/content/reviews";
import { ensureGsap, reducedMotion, ripple, useReveal } from "@/lib/motion";
import "./reviews.css";

type Card = { key: string; author: string; context: string; quote: string; rating?: number | null; phrase?: string };

const FEATURED = ["julia", "amelia", "rodzic"];

function fromFallback(): Card[] {
  const first = FEATURED.map((id) => FALLBACK_REVIEWS.find((r) => r.id === id)).filter(Boolean) as typeof FALLBACK_REVIEWS;
  const rest = FALLBACK_REVIEWS.filter((r) => !FEATURED.includes(r.id));
  return [...first, ...rest].map((r) => ({ key: r.id, author: r.author, context: r.context, quote: r.quote, phrase: r.key }));
}
function fromApi(rows: Review[]): Card[] {
  const sorted = [...rows].sort((a, b) => Number(b.featured) - Number(a.featured));
  return sorted.map((r) => {
    /* Opinia z panelu, która jest jedną z dawnych — dziedziczy jej kluczową frazę. */
    const known = FALLBACK_REVIEWS.find((f) => f.quote.trim() === r.body.trim());
    return { key: String(r.id), author: r.author_name, context: r.author_label || "", quote: r.body, rating: r.rating, phrase: known?.key };
  });
}

/* Słowa cytatu z zaznaczeniem tych, które należą do kluczowej frazy. Fraza musi być dosłownym
   fragmentem tekstu; dla nowych opinii bierzemy krótki fragment od pierwszego „mocnego” słowa. */
type Word = { t: string; key: boolean };
const STRONG = /^(cierpliw|spokojn|zrozumi|prosty|przystępn|świetn|swietn|znakomic|fantastyczn|zaangaż|zaangaz|polecam)/i;
function splitWords(quote: string, phrase?: string): Word[] {
  const parts = quote.split(/\s+/).filter(Boolean);
  let from = -1, to = -1;
  if (phrase) {
    const at = quote.indexOf(phrase);
    if (at >= 0) {
      let pos = 0;
      parts.forEach((w, i) => {
        const s = quote.indexOf(w, pos);
        const e = s + w.length;
        pos = e;
        if (e > at && s < at + phrase.length) { if (from < 0) from = i; to = i; }
      });
    }
  }
  if (from < 0) {
    const i = parts.findIndex((w) => STRONG.test(w));
    if (i >= 0) {
      from = i; to = i;
      while (to < parts.length - 1 && to - from < 3 && !/[.,!?;:]$/.test(parts[to])) to++;
    }
  }
  return parts.map((t, i) => ({ t, key: i >= from && i <= to && from >= 0 }));
}

const initial = (name: string) => (name.match(/\p{Lu}/u)?.[0] || name.trim().charAt(0)).toUpperCase();
const sizeOf = (q: string) => (q.length < 150 ? "xl" : q.length < 230 ? "l" : "m");
const holdFor = (q: string) => Math.round(Math.min(15, Math.max(7, q.split(/\s+/).length * 0.3)) * 1000);
function ReviewForm({ onDone }: { onDone: () => void }) {
  const [rating, setRating] = React.useState(5);
  const [state, setState] = React.useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = React.useState<string | null>(null);

  const send = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (!f.get("consent")) return setError("Zaznacz zgodę na publikację opinii.");
    setState("busy");
    setError(null);
    try {
      await publicApi.addReview({
        author_name: String(f.get("author_name") || "").trim(),
        author_label: String(f.get("author_label") || "").trim() || null,
        rating,
        body: String(f.get("body") || "").trim(),
        consent: true,
        website: String(f.get("website") || ""),
      });
      setState("done");
    } catch (err) {
      setError((err as Error).message);
      setState("idle");
    }
  };

  if (state === "done") {
    return (
      <div className="rv-done">
        <Mascot mood="happy" size={120} say="Dziękuję! Opinia pojawi się po akceptacji." side="left" />
        <button type="button" className="btn btn--primary" onClick={onDone}>Zamknij</button>
      </div>
    );
  }
  return (
    <form className="rv-form" onSubmit={send} noValidate>
      <div className="field">
        <span>Ocena</span>
        <Stars value={rating} onChange={setRating} size={34} />
      </div>
      <label className="field"><span>Imię (albo inicjał)</span><input className="input" name="author_name" required maxLength={60} placeholder="np. Ola" /></label>
      <label className="field"><span>Kim jesteś? (opcjonalnie)</span><input className="input" name="author_label" maxLength={80} placeholder="np. maturzystka, rodzic ucznia 7 klasy" /></label>
      <label className="field"><span>Opinia</span><textarea className="input" name="body" required minLength={10} maxLength={1200} placeholder="Co się zmieniło po lekcjach?" /></label>
      <input className="hp" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      <label className="check">
        <input type="checkbox" name="consent" value="1" />
        <span className="box"><svg viewBox="0 0 24 24"><path d="M5 12l5 5 9-11" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
        <span>Zgadzam się na publikację opinii z podanym imieniem na tej stronie. Szczegóły w <a href="/polityka-prywatnosci" target="_blank">polityce prywatności</a>.</span>
      </label>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <button type="submit" className="btn btn--primary" disabled={state === "busy"} onPointerDown={ripple}>
        {state === "busy" ? <i className="spinner" /> : "Wyślij opinię"}
      </button>
    </form>
  );
}

/* Opinie „Wielki głos”: jedna opinia naraz jako ogromny cytat. Słowa wpadają po kolei
   (transform/opacity), kluczowa fraza dostaje podkreślenie kredą, pod spodem pasek inicjałów
   z odliczaniem do następnej. Wszystkie cytaty leżą w jednej komórce siatki, więc wysokość
   sceny = najdłuższa opinia: przełączanie nigdy nie przesuwa strony.
   Klik w inicjały, strzałki (też klawiatura) i przeciągnięcie przełączają; odliczanie stoi
   po najechaniu, przy fokusie, poza ekranem i przy reduce motion. Teksty dosłownie z danych. */
export default function Reviews({ summary }: { summary: { count: number; average: number | null } }) {
  const root = useReveal<HTMLElement>();
  const deck = React.useRef<HTMLDivElement>(null);
  const tabs = React.useRef<HTMLDivElement>(null);
  const [rows, setRows] = React.useState<Review[] | null>(null);
  const [open, setOpen] = React.useState(false);
  const [idx, setIdx] = React.useState(0);
  const [out, setOut] = React.useState<number | null>(null);
  const [dir, setDir] = React.useState<1 | -1>(1);
  const [run, setRun] = React.useState(false);

  const cards = React.useMemo(() => (rows && rows.length ? fromApi(rows) : fromFallback()), [rows]);
  const n = cards.length;
  const words = React.useMemo(() => cards.map((c) => splitWords(c.quote, c.phrase)), [cards]);

  React.useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      publicApi.reviews(30).then((r) => setRows(r.rows)).catch(() => setRows([]));
    }, { rootMargin: "600px 0px" });
    io.observe(el);
    /* odliczanie biegnie tylko, gdy scena jest na ekranie */
    const vis = new IntersectionObserver(([e]) => setRun(e.isIntersecting), { threshold: 0.35 });
    vis.observe(el);
    return () => { io.disconnect(); vis.disconnect(); };
  }, [root]);

  /* Nowa lista z API: zostajemy przy tej samej opinii, jeśli w niej jest. */
  const prevCards = React.useRef(cards);
  React.useEffect(() => {
    const before = prevCards.current[idx];
    prevCards.current = cards;
    const keep = before ? cards.findIndex((c) => c.quote === before.quote) : -1;
    setIdx(keep >= 0 ? keep : 0);
    setOut(null);
    const { ScrollTrigger } = ensureGsap();
    const t = window.setTimeout(() => ScrollTrigger.refresh(), 80);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards]);

  const idxRef = React.useRef(idx);
  React.useEffect(() => { idxRef.current = idx; }, [idx]);
  const go = React.useCallback((to: number, d?: 1 | -1) => {
    const cur = idxRef.current;
    const next = ((to % n) + n) % n;
    if (next === cur) return;
    idxRef.current = next;
    setDir(d ?? (next > cur ? 1 : -1));
    setOut(cur);
    setIdx(next);
  }, [n]);
  const goRef = React.useRef(go);
  React.useEffect(() => { goRef.current = go; }, [go]);

  /* Wychodzący cytat znika po swojej animacji. */
  React.useEffect(() => {
    if (out == null) return;
    const t = window.setTimeout(() => setOut(null), reducedMotion() ? 0 : 520);
    return () => window.clearTimeout(t);
  }, [out, idx]);

  /* Przeciąganie (palec i mysz): cytat jedzie za palcem, po puszczeniu przełącza. */
  React.useEffect(() => {
    const el = deck.current;
    if (!el) return;
    let x0 = 0, y0 = 0, dx = 0, id = -1, lock: "x" | "y" | null = null;
    const down = (e: PointerEvent) => {
      if (e.button !== 0 || (e.target as HTMLElement).closest("a, button")) return;
      x0 = e.clientX; y0 = e.clientY; dx = 0; id = e.pointerId; lock = null;
    };
    const move = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      const ddx = e.clientX - x0, ddy = e.clientY - y0;
      if (!lock && Math.hypot(ddx, ddy) > 8) {
        lock = Math.abs(ddx) > Math.abs(ddy) ? "x" : "y";
        if (lock === "x") { el.setPointerCapture(id); el.classList.add("is-drag"); }
      }
      if (lock !== "x") return;
      dx = ddx;
      el.style.transform = `translate3d(${dx * 0.45}px, 0, 0)`;
      el.style.opacity = String(1 - Math.min(0.5, Math.abs(dx) / 600));
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      id = -1;
      el.classList.remove("is-drag");
      el.style.transform = "";
      el.style.opacity = "";
      if (lock === "x" && Math.abs(dx) > 60) setIdxBy(dx < 0 ? 1 : -1);
      lock = null;
    };
    const setIdxBy = (d: 1 | -1) => goRef.current(idxRef.current + d, d);
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
  }, [n]);

  const onKey = (e: React.KeyboardEvent) => {
    const k = e.key;
    if (k !== "ArrowRight" && k !== "ArrowLeft" && k !== "Home" && k !== "End") return;
    e.preventDefault();
    const to = k === "Home" ? 0 : k === "End" ? n - 1 : idx + (k === "ArrowRight" ? 1 : -1);
    go(to, k === "ArrowLeft" ? -1 : 1);
    window.requestAnimationFrame(() => tabs.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus());
  };

  const avg = summary.average;
  const cur = cards[idx];

  return (
    <section id="opinie" ref={root} className="section vo" data-run={run ? "1" : "0"}>
      <span id="opinie_mobile" className="vo__alias" aria-hidden="true" />
      <div className="wrap">
        <div className="vo__head">
          <div className="vo__titles">
            <span className="eyebrow" data-reveal>{REVIEWS_HEAD.eyebrow}</span>
            <KineticTitle as="h2" reveal="view" text={REVIEWS_HEAD.title} accentFrom={5} className="h-section" />
          </div>
          <div className="vo__score" data-reveal>
            {summary.count > 0 && avg != null ? (
              <>
                <strong>{avg.toFixed(1).replace(".", ",")}</strong>
                <div>
                  <Stars value={avg} size={20} />
                  <span className="muted">{summary.count} {summary.count === 1 ? "opinia" : summary.count % 10 >= 2 && summary.count % 10 <= 4 && (summary.count % 100 < 10 || summary.count % 100 >= 20) ? "opinie" : "opinii"}</span>
                </div>
              </>
            ) : null}
            <button type="button" className="btn btn--sm" onClick={() => setOpen(true)} onPointerDown={ripple}>+ {REVIEWS_HEAD.add}</button>
          </div>
        </div>

        <div className="vo__stage" data-reveal>
          <svg className="vo__mark" viewBox="0 0 120 96" aria-hidden="true" key={`m${idx}`}>
            <path pathLength={1} d="M48 14 C26 20 12 38 12 60 C12 74 20 84 32 84 C43 84 50 76 50 66 C50 56 43 49 33 49 C30 49 28 50 26 51 C28 38 37 28 52 22 Z" />
            <path pathLength={1} d="M108 14 C86 20 72 38 72 60 C72 74 80 84 92 84 C103 84 110 76 110 66 C110 56 103 49 93 49 C90 49 88 50 86 51 C88 38 97 28 112 22 Z" />
          </svg>

          <div ref={deck} className="vo__deck" data-dir={dir > 0 ? "next" : "prev"}>
            {cards.map((c, i) => {
              const on = i === idx;
              const st = on ? "is-on" : i === out ? "is-out" : "";
              let k = -1;
              return (
                <figure key={c.key} className={`vo__q ${st}`} aria-hidden={!on} id={`vo-q-${i}`} role="tabpanel" aria-labelledby={`vo-t-${i}`}>
                  <blockquote className={`vo__text vo__text--${sizeOf(c.quote)}`}>
                    {words[i].map((w, wi) => {
                      if (w.key) k++;
                      const nextKey = words[i][wi + 1]?.key;
                      return (
                        <React.Fragment key={wi}>
                          <span
                            className={`vo__w ${w.key ? "is-key" : ""} ${w.key && nextKey ? "is-join" : ""}`}
                            style={{ "--i": Math.min(wi, 34), "--k": Math.max(0, k) } as React.CSSProperties}
                          >{w.t}</span>{" "}
                        </React.Fragment>
                      );
                    })}
                  </blockquote>
                  <figcaption className="vo__who">
                    <span className="vo__avatar" data-tone={i % 3} aria-hidden="true">{initial(c.author)}</span>
                    <span className="vo__name">
                      <b>{c.author}</b>
                      {c.context ? <small>{c.context}</small> : null}
                    </span>
                    {c.rating ? <Stars value={c.rating} size={16} /> : null}
                  </figcaption>
                </figure>
              );
            })}
          </div>
          <p className="vo__drag chalk" aria-hidden="true">← {REVIEWS_HEAD.hintDrag} →</p>
        </div>

        <div className="vo__nav">
          <button type="button" className="vo__arrow" onClick={() => go(idx - 1, -1)} aria-label={REVIEWS_HEAD.prev}>
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <div ref={tabs} className="vo__faces" role="tablist" aria-label={REVIEWS_HEAD.pick} onKeyDown={onKey}>
            {cards.map((c, i) => {
              const on = i === idx;
              return (
                <button
                  key={c.key}
                  id={`vo-t-${i}`}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  aria-controls={`vo-q-${i}`}
                  tabIndex={on ? 0 : -1}
                  className={`vo__face ${on ? "is-on" : ""}`}
                  data-tone={i % 3}
                  onClick={() => go(i)}
                >
                  <span aria-hidden="true">{initial(c.author)}</span>
                  <span className="sr-only">{c.author}{c.context ? `, ${c.context}` : ""}</span>
                  {on && n > 1 ? (
                    <svg className="vo__ring" viewBox="0 0 48 48" aria-hidden="true" key={`r${idx}`}>
                      {/* odliczanie = stroke-dashoffset (atrybut SVG) na 48 px — jedyny wyjątek od transform/opacity */}
                      <circle cx="24" cy="24" r="22" pathLength={1} style={{ animationDuration: `${holdFor(c.quote)}ms` }} onAnimationEnd={() => go(idx + 1, 1)} />
                    </svg>
                  ) : null}
                </button>
              );
            })}
          </div>
          <button type="button" className="vo__arrow" onClick={() => go(idx + 1, 1)} aria-label={REVIEWS_HEAD.next}>
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <p className="vo__count" aria-live="polite">
            <b>{String(idx + 1).padStart(2, "0")}</b> / {String(n).padStart(2, "0")}
            <span className="sr-only">: {cur?.author}</span>
          </p>
        </div>
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} title="Twoja opinia">
        <ReviewForm onDone={() => setOpen(false)} />
      </Sheet>
    </section>
  );
}
