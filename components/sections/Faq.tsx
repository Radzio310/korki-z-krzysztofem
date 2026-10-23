"use client";

import React from "react";
import Avatar from "../chat/Avatar";
import { flipFrom, followInView } from "../chat/follow";
import type { Faq as FaqT } from "@/lib/types";
import { FAQ, FAQ_HEAD, type FaqItem } from "@/content/faq";
import { PHONE_DISPLAY, PHONE_TEL } from "@/lib/contact";
import { reducedMotion, ripple, scrollToTarget, useReveal } from "@/lib/motion";
import "../chat/chat.css";
import "./faq.css";

/* „Zanim zapytasz” jako komunikator: pod oknem rozmowy leżą podpowiedzi pytań. Stuknięte
   pytanie przelatuje do rozmowy jako Twój dymek, Krzysztof „pisze…” i odpowiada.
   Zadane pytania zostają w historii; ponowne stuknięcie podświetla wcześniejszą odpowiedź. */

const EVENT = "kk:faq-open";
const MISSING = "faq-brak";

/* Otwiera pytanie z innego miejsca strony (np. planeta „Online” w hero). */
export function openFaq(id: string) {
  window.dispatchEvent(new CustomEvent<string>(EVENT, { detail: id }));
  scrollToTarget("#faq", -40);
}

/* numer telefonu w odpowiedzi staje się linkiem */
function Linkified({ text }: { text: string }) {
  const parts = text.split(PHONE_DISPLAY);
  return (
    <>
      {parts.map((p, i) => (
        <React.Fragment key={i}>
          {p}
          {i < parts.length - 1 ? <a href={PHONE_TEL}>{PHONE_DISPLAY}</a> : null}
        </React.Fragment>
      ))}
    </>
  );
}

export default function Faq({ items }: { items: FaqT[] }) {
  const root = useReveal<HTMLElement>();
  const list: FaqItem[] = React.useMemo(() => (items.length ? items.map((f, i) => ({ ...f, id: `faq-p${i}` })) : FAQ), [items]);
  const [asked, setAsked] = React.useState<string[]>([]);
  const [answered, setAnswered] = React.useState<string[]>([]);
  const [flash, setFlash] = React.useState<string | null>(null);
  const [say, setSay] = React.useState("");
  const logRef = React.useRef<HTMLDivElement>(null);
  const winRef = React.useRef<HTMLDivElement>(null);
  const flip = React.useRef<{ id: string; rect: DOMRect } | null>(null);
  const engaged = React.useRef(false);
  const askedRef = React.useRef<string[]>([]);
  askedRef.current = asked;

  const pending = asked.find((id) => !answered.includes(id)) || null;

  const ask = React.useCallback((id: string, from?: DOMRect) => {
    if (askedRef.current.includes(id)) {
      setFlash(id);
      window.setTimeout(() => setFlash(null), 1400);
      const el = logRef.current?.querySelector<HTMLElement>(`[data-a="${id}"]`);
      if (el) scrollToTarget(el, -140);
      return;
    }
    if (from) flip.current = { id, rect: from };
    setAsked((a) => [...a, id]);
  }, []);

  /* odpowiedź po „pisze…” — czas zależy od długości odpowiedzi */
  React.useEffect(() => {
    if (!pending) return;
    const f = list.find((x) => x.id === pending);
    const len = f ? f.a.length : 40;
    const t = window.setTimeout(() => {
      setAnswered((a) => [...a, pending]);
      setSay(pending === MISSING ? "Napisz do mnie w czacie niżej." : f?.a || "");
    }, reducedMotion() ? 0 : 520 + Math.min(1100, len * 9));
    return () => window.clearTimeout(t);
  }, [pending, list]);

  React.useLayoutEffect(() => {
    const f = flip.current;
    if (!f) return;
    flip.current = null;
    flipFrom(logRef.current?.querySelector<HTMLElement>(`[data-q="${f.id}"]`), f.rect);
  });

  React.useEffect(() => {
    if (!engaged.current) return;
    followInView(logRef.current?.parentElement?.querySelector<HTMLElement>(".fqc__composer"), 16);
  }, [asked.length, answered.length]);

  /* pierwsze pytanie zadaje się samo, gdy okno wejdzie w widok — rozmowa nie startuje pusta */
  React.useEffect(() => {
    const el = winRef.current;
    if (!el || !list.length) return;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      if (!askedRef.current.length) ask(list[0].id);
    }, { rootMargin: "0px 0px -20% 0px" });
    io.observe(el);
    const on = (e: Event) => { engaged.current = true; ask((e as CustomEvent<string>).detail); };
    window.addEventListener(EVENT, on);
    return () => { io.disconnect(); window.removeEventListener(EVENT, on); };
  }, [ask, list]);

  const pick = (id: string, e: React.MouseEvent<HTMLButtonElement>) => {
    engaged.current = true;
    ask(id, e.currentTarget.getBoundingClientRect());
  };

  const q = (id: string) => (id === MISSING ? "Nie ma tu mojego pytania" : list.find((f) => f.id === id)?.q || "");

  return (
    <section id="faq" ref={root} className="section fq" aria-labelledby="fq-title">
      <div className="wrap fq__grid">
        <div className="fq__side">
          <span className="eyebrow" data-reveal>{FAQ_HEAD.eyebrow}</span>
          <h2 className="h-section" id="fq-title" data-reveal>Zanim <span className="text-sea">zapytasz</span></h2>
          <p className="lead" data-reveal>{FAQ_HEAD.lead}</p>
          <div className="fq__ask" data-reveal>
            <p><b>{FAQ_HEAD.ask}</b> Zapytaj w czacie — przedmiot, poziom i kontakt, kilka stuknięć.</p>
            <a className="btn btn--primary btn--sm" href="#kontakt" onPointerDown={ripple}>{FAQ_HEAD.askCta}</a>
          </div>
        </div>

        <div className="fqc kc__window" ref={winRef}>
          <header className="kc__head fqc__head">
            <Avatar size={44} typing={!!pending} />
            <div className="kc__who">
              <b>Krzysztof</b>
              <span className={`kc__status ${pending ? "is-typing" : ""}`}>
                <span className="kc__status-a">odpowiedzi na częste pytania</span>
                <span className="kc__status-b" aria-hidden="true">pisze<i>.</i><i>.</i><i>.</i></span>
              </span>
            </div>
          </header>

          <div className="kc__log fqc__log" ref={logRef} role="log" aria-live="off" aria-label="Pytania i odpowiedzi">
            <div className="kc-row kc-row--bot is-tail">
              <Avatar size={30} className="kc-row__av" />
              <p className="kc-b kc-b--bot">Cześć! Zebrałem tu odpowiedzi na pytania, które słyszę najczęściej. Stuknij pytanie pod rozmową.</p>
            </div>
            {asked.map((id) => {
              const f = list.find((x) => x.id === id);
              const done = answered.includes(id);
              return (
                <React.Fragment key={id}>
                  <div className="kc-row kc-row--me">
                    <p className="kc-b kc-b--me" data-q={id}>{q(id)}</p>
                  </div>
                  {done ? (
                    <div className={`kc-row kc-row--bot is-tail ${flash === id ? "is-flash" : ""}`} data-a={id}>
                      <Avatar size={30} className="kc-row__av" />
                      {id === MISSING ? (
                        <div className="kc-b kc-b--bot fqc__missing">
                          <p>Napisz do mnie w czacie niżej — wybierzesz przedmiot i poziom, a ja odpowiem.</p>
                          <button type="button" className="kc-pill" onClick={() => scrollToTarget("#kontakt")}>Przejdź do czatu</button>
                        </div>
                      ) : (
                        <p className="kc-b kc-b--bot"><Linkified text={f?.a || ""} /></p>
                      )}
                    </div>
                  ) : null}
                </React.Fragment>
              );
            })}
            {pending ? (
              <div className="kc-row kc-row--bot is-tail" aria-hidden="true">
                <Avatar size={30} className="kc-row__av" />
                <span className="kc-b kc-b--bot kc-typing"><i /><i /><i /></span>
              </div>
            ) : null}
          </div>
          <p className="sr-only" aria-live="polite" role="status">{say}</p>

          <div className="fqc__composer" role="group" aria-label="Zadaj pytanie">
            {list.map((f, i) => (
              <button
                key={f.id}
                id={f.id}
                type="button"
                className={`fqc__chip ${asked.includes(f.id) ? "is-asked" : ""}`}
                style={{ "--k": i } as React.CSSProperties}
                onClick={(e) => pick(f.id, e)}
                aria-describedby={asked.includes(f.id) ? "fqc-asked" : undefined}
              >
                {f.q}
                {asked.includes(f.id) ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l5 5 9-11" /></svg> : null}
              </button>
            ))}
            <button type="button" className={`fqc__chip fqc__chip--ghost ${asked.includes(MISSING) ? "is-asked" : ""}`} style={{ "--k": list.length } as React.CSSProperties} onClick={(e) => pick(MISSING, e)}>
              Nie ma tu mojego pytania
            </button>
            <span id="fqc-asked" className="sr-only">Już zadane — stuknij, żeby wrócić do odpowiedzi.</span>
          </div>
        </div>

        {/* Bez JavaScriptu: zwykła lista pytań i odpowiedzi. */}
        <noscript>
          <dl className="fq__plain">
            {list.map((f) => (
              <div key={f.id}><dt>{f.q}</dt><dd>{f.a}</dd></div>
            ))}
          </dl>
        </noscript>
      </div>
    </section>
  );
}
