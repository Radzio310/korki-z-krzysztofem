"use client";

import React from "react";
import Mascot from "../Mascot";
import Sheet from "../ui/Sheet";
import Stars from "../ui/Stars";
import KineticTitle from "../hero/KineticTitle";
import type { Review } from "@/lib/types";
import { publicApi } from "@/lib/api";
import { FALLBACK_REVIEWS, REVIEWS_HEAD, type FallbackReview } from "@/content/reviews";
import { ensureGsap, reducedMotion, ripple, useReveal } from "@/lib/motion";
import "./reviews.css";

type Card = {
  key: string;
  author: string;
  context: string;
  quote: string;
  rating?: number | null;
  original?: FallbackReview;
};

const FEATURED = ["julia", "amelia", "rodzic"];

function fromFallback(): Card[] {
  const first = FEATURED.map((id) => FALLBACK_REVIEWS.find((r) => r.id === id)!).filter(Boolean);
  const rest = FALLBACK_REVIEWS.filter((r) => !FEATURED.includes(r.id));
  return [...first, ...rest].map((r) => ({ key: r.id, author: r.author, context: r.context, quote: r.quote, original: r }));
}
function fromApi(rows: Review[]): Card[] {
  const sorted = [...rows].sort((a, b) => Number(b.featured) - Number(a.featured));
  return sorted.map((r) => ({ key: String(r.id), author: r.author_name, context: r.author_label || "", quote: r.body, rating: r.rating }));
}

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

function QuoteCard({ c, i, onOriginal }: { c: Card; i: number; onOriginal: (r: FallbackReview) => void }) {
  return (
    <article className="rvc" style={{ "--i": i } as React.CSSProperties}>
      <svg className="rvc__q" viewBox="0 0 48 40" aria-hidden="true">
        <path d="M4 38V22C4 11 10 4 20 2l2 5c-6 2-9 6-9 12h8v19zm24 0V22c0-11 6-18 16-20l2 5c-6 2-9 6-9 12h8v19z" />
      </svg>
      {c.rating ? <Stars value={c.rating} size={17} /> : null}
      <blockquote>{c.quote}</blockquote>
      <footer className="rvc__who">
        <span className="rvc__avatar" aria-hidden="true">{c.author.slice(0, 1).toUpperCase()}</span>
        <span><b>{c.author}</b>{c.context ? <small>{c.context}</small> : null}</span>
      </footer>
      {c.original ? (
        <button type="button" className="rvc__orig" onClick={() => onOriginal(c.original!)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={c.original.image} alt="" width={1024} height={576} loading="lazy" decoding="async" />
          <span>{REVIEWS_HEAD.original}<span className="sr-only">: opinia — {c.author}</span></span>
        </button>
      ) : null}
    </article>
  );
}

/* Opinie: trzy karty na wierzchu, reszta w natywnym <details> (działa bez JS).
   Bez opinii z API pokazujemy dziewięć prawdziwych opinii ze starej strony — klik w kartę
   otwiera oryginalną grafikę jako dowód. Karty lekko przechylają się do kursora. */
export default function Reviews({ summary }: { summary: { count: number; average: number | null } }) {
  const root = useReveal<HTMLElement>();
  const [rows, setRows] = React.useState<Review[] | null>(null);
  const [open, setOpen] = React.useState(false);
  const [orig, setOrig] = React.useState<FallbackReview | null>(null);
  const [origOpen, setOrigOpen] = React.useState(false);
  const showOrig = React.useCallback((r: FallbackReview) => { setOrig(r); setOrigOpen(true); }, []);
  const [more, setMore] = React.useState(false);

  React.useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      publicApi.reviews(30).then((r) => setRows(r.rows)).catch(() => setRows([]));
    }, { rootMargin: "600px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [root]);

  /* Po zmianie wysokości (opinie z API, rozwinięcie) przeliczamy sceny przypięte niżej. */
  React.useEffect(() => {
    const { ScrollTrigger } = ensureGsap();
    const t = window.setTimeout(() => ScrollTrigger.refresh(), 60);
    return () => window.clearTimeout(t);
  }, [rows, more]);

  /* Przechył karty do kursora — tylko precyzyjny wskaźnik. */
  React.useEffect(() => {
    const el = root.current;
    if (!el || reducedMotion() || !matchMedia("(pointer: fine)").matches) return;
    const move = (e: PointerEvent) => {
      const card = (e.target as HTMLElement).closest<HTMLElement>(".rvc");
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty("--rx", `${(((e.clientY - r.top) / r.height) - 0.5) * -6}deg`);
      card.style.setProperty("--ry", `${(((e.clientX - r.left) / r.width) - 0.5) * 8}deg`);
    };
    const out = (e: PointerEvent) => {
      const card = (e.target as HTMLElement).closest<HTMLElement>(".rvc");
      if (card && !card.contains(e.relatedTarget as Node)) { card.style.setProperty("--rx", "0deg"); card.style.setProperty("--ry", "0deg"); }
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerout", out);
    return () => { el.removeEventListener("pointermove", move); el.removeEventListener("pointerout", out); };
  }, [root]);

  const cards = rows && rows.length ? fromApi(rows) : fromFallback();
  const top = cards.slice(0, 3);
  const rest = cards.slice(3);
  const avg = summary.average;

  return (
    <section id="opinie" ref={root} className="section rvs">
      <span id="opinie_mobile" className="rvs__alias" aria-hidden="true" />
      <div className="wrap">
        <div className="rvs__head">
          <div className="rvs__titles">
            <span className="eyebrow" data-reveal>{REVIEWS_HEAD.eyebrow}</span>
            <KineticTitle as="h2" reveal="view" text={REVIEWS_HEAD.title} accentFrom={5} className="h-section" />
          </div>
          <div className="rvs__score" data-reveal>
            {summary.count > 0 && avg != null ? (
              <>
                <strong>{avg.toFixed(1).replace(".", ",")}</strong>
                <div>
                  <Stars value={avg} size={20} />
                  <span className="muted">{summary.count} {summary.count === 1 ? "opinia" : summary.count % 10 >= 2 && summary.count % 10 <= 4 && (summary.count % 100 < 10 || summary.count % 100 >= 20) ? "opinie" : "opinii"}</span>
                </div>
              </>
            ) : null}
            <button type="button" className="btn btn--sm" onClick={() => setOpen(true)} onPointerDown={ripple}>+ Dodaj opinię</button>
          </div>
        </div>

        <div className={`rvs__grid ${rows && rows.length ? "is-api" : ""}`}>
          {top.map((c, i) => <QuoteCard key={c.key} c={c} i={i} onOriginal={showOrig} />)}
        </div>

        {rest.length ? (
          <details className="rvs__more" onToggle={(e) => setMore((e.currentTarget as HTMLDetailsElement).open)}>
            <summary className="btn">
              <span>{more ? REVIEWS_HEAD.less : cards.length === 9 ? REVIEWS_HEAD.more : `Zobacz wszystkie ${cards.length} opinii`}</span>
              <i aria-hidden="true" />
            </summary>
            <div className="rvs__grid rvs__grid--rest">
              {rest.map((c, i) => <QuoteCard key={c.key} c={c} i={i} onOriginal={showOrig} />)}
            </div>
          </details>
        ) : null}
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} title="Twoja opinia">
        <ReviewForm onDone={() => setOpen(false)} />
      </Sheet>

      <Sheet open={origOpen} onClose={() => setOrigOpen(false)} title={orig ? `Opinia — ${orig.author}` : "Opinia"} wide>
        {orig ? (
          <figure className="rv-orig">
            <picture>
              <source media="(max-width: 640px)" srcSet={orig.imageTall} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={orig.image} alt={`Oryginalna grafika z opinią: „${orig.quote}” — ${orig.author}${orig.context ? `, ${orig.context}` : ""}`} width={1024} height={576} />
            </picture>
            <figcaption className="muted">Grafika z dotychczasowej strony — tekst na karcie jest jej wierną transkrypcją.</figcaption>
          </figure>
        ) : null}
      </Sheet>
    </section>
  );
}
