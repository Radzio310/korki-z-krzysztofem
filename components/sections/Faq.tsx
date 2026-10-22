"use client";

import React from "react";
import KineticTitle from "../hero/KineticTitle";
import type { Faq as FaqT } from "@/lib/types";
import { FAQ, FAQ_HEAD, type FaqItem } from "@/content/faq";
import { CONTACT, IMAGES } from "@/content/site";
import { ripple, scrollToTarget, useReveal } from "@/lib/motion";
import "./faq.css";

/* Otwiera pytanie z innego miejsca strony (np. planeta „Online” w hero). */
export function openFaq(id: string) {
  const el = document.getElementById(id) as HTMLDetailsElement | null;
  if (!el) return scrollToTarget("#faq");
  el.open = true;
  scrollToTarget(el, -140);
  window.setTimeout(() => el.querySelector<HTMLElement>("summary")?.focus({ preventScroll: true }), 700);
}

/* FAQ jak rozmowa: pytanie to Twój dymek, odpowiedź — dymek Krzysztofa (najpierw „pisze…”).
   Natywne <details>, więc działa bez JS i z klawiatury. */
export default function Faq({ items }: { items: FaqT[] }) {
  const root = useReveal<HTMLElement>();
  const list: FaqItem[] = items.length ? items.map((f, i) => ({ ...f, id: `faq-p${i}` })) : FAQ;

  return (
    <section id="faq" ref={root} className="section fq">
      <div className="wrap fq__grid">
        <div className="fq__side">
          <span className="eyebrow" data-reveal>{FAQ_HEAD.eyebrow}</span>
          <KineticTitle as="h2" reveal="view" text={FAQ_HEAD.title} accentFrom={1} className="h-section" />
          <p className="lead" data-reveal>{FAQ_HEAD.lead}</p>
          <div className="fq__ask" data-reveal>
            <p><b>{FAQ_HEAD.ask}</b></p>
            <div className="fq__links">
              <a className="btn btn--primary btn--sm" href="#kontakt" onPointerDown={ripple}>{FAQ_HEAD.askCta}</a>
              <a className="btn btn--sm" href={CONTACT.phoneHref}>Zadzwoń: {CONTACT.phoneDisplay}</a>
              <a className="btn btn--sm" href={CONTACT.whatsapp} target="_blank" rel="noopener noreferrer">WhatsApp<span className="sr-only"> (nowa karta)</span></a>
            </div>
          </div>
        </div>

        <div className="fq__chat">
          {list.map((f, i) => (
            <details key={f.id} id={f.id} className="fq__item" data-reveal style={{ "--d": `${i * 60}ms` } as React.CSSProperties}>
              <summary>
                <span className="fq__q">{f.q}</span>
                <i aria-hidden="true" />
              </summary>
              <div className="fq__a">
                <span className="fq__avatar" aria-hidden="true">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={IMAGES.portrait.srcSet.split(" ")[0]} alt="" width={640} height={640} loading="lazy" decoding="async" />
                </span>
                <div className="fq__bubble">
                  <span className="fq__typing" aria-hidden="true"><i /><i /><i /></span>
                  <p>{f.a}</p>
                </div>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
