"use client";

import React from "react";
import Mascot from "../Mascot";
import Sheet from "../ui/Sheet";
import Stars from "../ui/Stars";
import type { Review } from "@/lib/types";
import { publicApi } from "@/lib/api";
import { ensureGsap, reducedMotion, ripple, useReveal } from "@/lib/motion";
import "./reviews.css";

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

export default function Reviews({ summary }: { summary: { count: number; average: number | null } }) {
  const root = useReveal<HTMLElement>();
  const rail = React.useRef<HTMLDivElement>(null);
  const [rows, setRows] = React.useState<Review[] | null>(null);
  const [open, setOpen] = React.useState(false);
  const [expanded, setExpanded] = React.useState<number | null>(null);

  React.useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      publicApi.reviews(30).then((r) => setRows(r.rows)).catch(() => setRows([]));
    }, { rootMargin: "500px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [root]);

  /* Przeciąganie taśmy z bezwładnością; karty lekko się przechylają w ruchu. */
  React.useEffect(() => {
    const el = rail.current;
    if (!el || !rows?.length) return;
    const { gsap } = ensureGsap();
    let down = false, startX = 0, startScroll = 0, lastX = 0, v = 0, raf = 0, moved = false;
    const tiltTo = gsap.quickTo(el, "--tilt", { duration: 0.5, ease: "power3" });
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      down = true; moved = false; startX = lastX = e.clientX; startScroll = el.scrollLeft; v = 0;
      cancelAnimationFrame(raf);
      el.classList.add("is-drag");
    };
    const onMove = (e: PointerEvent) => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 4) moved = true;
      v = e.clientX - lastX; lastX = e.clientX;
      el.scrollLeft = startScroll - dx;
      if (!reducedMotion()) tiltTo(Math.max(-6, Math.min(6, v * 0.5)));
    };
    const onUp = () => {
      if (!down) return;
      down = false;
      el.classList.remove("is-drag");
      tiltTo(0);
      const glide = () => {
        v *= 0.94;
        el.scrollLeft -= v;
        if (Math.abs(v) > 0.4) raf = requestAnimationFrame(glide);
      };
      if (!reducedMotion()) glide();
    };
    const onClick = (e: MouseEvent) => { if (moved) { e.stopPropagation(); e.preventDefault(); } };
    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    el.addEventListener("click", onClick, true);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      el.removeEventListener("click", onClick, true);
    };
  }, [rows]);

  const nudge = (dir: number) => {
    const el = rail.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.min(460, el.clientWidth * 0.8), behavior: reducedMotion() ? "auto" : "smooth" });
  };

  const avg = summary.average;
  return (
    <section id="opinie" ref={root} className="section reviews">
      <div className="wrap reviews__head">
        <div>
          <span className="eyebrow" data-reveal>Opinie</span>
          <h2 className="h-section" data-reveal>Co mówią <span className="text-sea">uczniowie</span></h2>
        </div>
        <div className="reviews__score" data-reveal>
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

      {rows === null ? (
        <div className="wrap reviews__loading"><span /><span /><span /></div>
      ) : rows.length === 0 ? (
        <div className="wrap">
          <div className="reviews__empty card">
            <Mascot mood="wave" size={120} say="Tu zawisną pierwsze opinie — może Twoja?" side="left" />
            <button type="button" className="btn btn--primary" onClick={() => setOpen(true)} onPointerDown={ripple}>Napisz opinię</button>
          </div>
        </div>
      ) : (
        <>
          <div ref={rail} className="reviews__rail" tabIndex={0} aria-label="Opinie — przewiń w bok">
            {rows.map((r, i) => {
              const long = r.body.length > 260;
              const isOpen = expanded === r.id;
              return (
                <figure key={r.id} className={`rv ${r.featured ? "rv--featured" : ""}`} style={{ "--i": i } as React.CSSProperties}>
                  <span className="rv__quote" aria-hidden="true">“</span>
                  {r.rating ? <Stars value={r.rating} size={18} /> : null}
                  <blockquote className={long && !isOpen ? "is-clamped" : ""}>{r.body}</blockquote>
                  {long ? (
                    <button type="button" className="rv__more" onClick={() => setExpanded(isOpen ? null : r.id)}>{isOpen ? "Zwiń" : "Czytaj całość"}</button>
                  ) : null}
                  <figcaption>
                    <span className="rv__avatar" aria-hidden="true">{r.author_name.slice(0, 1).toUpperCase()}</span>
                    <span><b>{r.author_name}</b>{r.author_label ? <small>{r.author_label}</small> : null}</span>
                  </figcaption>
                </figure>
              );
            })}
          </div>
          <div className="wrap reviews__nav">
            <button type="button" className="reviews__arrow" onClick={() => nudge(-1)} aria-label="Poprzednie opinie">←</button>
            <button type="button" className="reviews__arrow" onClick={() => nudge(1)} aria-label="Następne opinie">→</button>
          </div>
        </>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title="Twoja opinia">
        <ReviewForm onDone={() => setOpen(false)} />
      </Sheet>
    </section>
  );
}
