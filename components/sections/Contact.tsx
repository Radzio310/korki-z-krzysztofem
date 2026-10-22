"use client";

import React from "react";
import Mascot from "../Mascot";
import type { Content } from "@/lib/types";
import { publicApi } from "@/lib/api";
import { ripple, useReveal } from "@/lib/motion";
import "./contact.css";

function Faq({ items }: { items: Content["faq"] }) {
  const [open, setOpen] = React.useState<number | null>(0);
  if (!items.length) return null;
  return (
    <div className="faq">
      <h3 className="h-card">Częste pytania</h3>
      {items.map((f, i) => (
        <div key={i} className={`faq__item ${open === i ? "is-open" : ""}`} data-reveal style={{ "--d": `${i * 60}ms` } as React.CSSProperties}>
          <button type="button" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
            <span>{f.q}</span>
            <i aria-hidden="true" />
          </button>
          <div className="faq__a"><p>{f.a}</p></div>
        </div>
      ))}
    </div>
  );
}

export default function Contact({ content }: { content: Content }) {
  const root = useReveal<HTMLElement>();
  const [state, setState] = React.useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState<string | null>(null);
  const c = content.contact;

  const copy = async (v: string, label: string) => {
    try {
      await navigator.clipboard.writeText(v);
      setCopied(label);
      window.setTimeout(() => setCopied(null), 1600);
    } catch { /* brak schowka — zostaje zwykły link */ }
  };

  const send = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (!f.get("consent")) return setError("Zaznacz zgodę, żebym mógł odpisać.");
    setState("busy");
    setError(null);
    try {
      await publicApi.contact({
        name: String(f.get("name") || "").trim(),
        email: String(f.get("email") || "").trim(),
        phone: String(f.get("phone") || "").trim() || null,
        message: String(f.get("message") || "").trim(),
        consent: true,
        website: String(f.get("website") || ""),
      });
      setState("done");
    } catch (err) {
      setError((err as Error).message);
      setState("idle");
    }
  };

  const tiles = [
    c.email ? { k: "E-mail", v: c.email, href: `mailto:${c.email}`, icon: "✉️" } : null,
    c.phone ? { k: "Telefon", v: c.phone, href: `tel:${c.phone.replace(/\s+/g, "")}`, icon: "📞" } : null,
    c.city ? { k: "Gdzie", v: [c.city, c.area].filter(Boolean).join(" · "), href: null, icon: "📍" } : null,
  ].filter(Boolean) as { k: string; v: string; href: string | null; icon: string }[];

  return (
    <section id="kontakt" ref={root} className="section contact">
      <div className="wrap contact__grid">
        <div className="contact__left">
          <span className="eyebrow" data-reveal>Kontakt</span>
          <h2 className="h-section" data-reveal>Masz pytanie? <span className="text-sea">Napisz.</span></h2>
          {tiles.length ? (
            <div className="contact__tiles">
              {tiles.map((t) => (
                <div key={t.k} className="contact__tile" data-reveal>
                  <span className="contact__icon" aria-hidden="true">{t.icon}</span>
                  <div>
                    <small>{t.k}</small>
                    {t.href ? <a href={t.href}>{t.v}</a> : <span>{t.v}</span>}
                  </div>
                  {t.href ? (
                    <button type="button" className="contact__copy" onClick={() => copy(t.v, t.k)} aria-label={`Kopiuj: ${t.k}`}>
                      {copied === t.k ? "✓" : "⧉"}
                    </button>
                  ) : null}
                </div>
              ))}
              {c.facebook || c.instagram ? (
                <div className="contact__social" data-reveal>
                  {c.facebook ? <a className="btn btn--sm" href={c.facebook} target="_blank" rel="noopener noreferrer">Facebook</a> : null}
                  {c.instagram ? <a className="btn btn--sm" href={c.instagram} target="_blank" rel="noopener noreferrer">Instagram</a> : null}
                </div>
              ) : null}
            </div>
          ) : (
            <p className="lead" data-reveal>Formularz obok trafia prosto do mojej skrzynki — odpowiadam mailem.</p>
          )}
          <Faq items={content.faq || []} />
        </div>

        <div className="contact__form card" data-reveal>
          {state === "done" ? (
            <div className="contact__done">
              <Mascot mood="happy" size={120} say="Wiadomość dotarła — odpiszę najszybciej, jak się da." side="left" />
              <button type="button" className="btn" onClick={() => setState("idle")}>Napisz kolejną</button>
            </div>
          ) : (
            <form onSubmit={send}>
              <h3 className="h-card">Wiadomość</h3>
              <label className="field"><span>Imię</span><input className="input" name="name" required maxLength={80} autoComplete="name" /></label>
              <div className="contact__two">
                <label className="field"><span>E-mail</span><input className="input" type="email" name="email" required maxLength={120} autoComplete="email" /></label>
                <label className="field"><span>Telefon (opcjonalnie)</span><input className="input" type="tel" name="phone" maxLength={30} autoComplete="tel" /></label>
              </div>
              <label className="field"><span>Treść</span><textarea className="input" name="message" required minLength={5} maxLength={3000} placeholder="Klasa, przedmiot, cel — wszystko, co pomoże mi się przygotować." /></label>
              <input className="hp" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
              <label className="check">
                <input type="checkbox" name="consent" value="1" />
                <span className="box"><svg viewBox="0 0 24 24"><path d="M5 12l5 5 9-11" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
                <span>Zgadzam się na przetwarzanie danych w celu odpowiedzi na wiadomość. <a href="/polityka-prywatnosci" target="_blank">Polityka prywatności</a>.</span>
              </label>
              {error ? <p className="form-error" role="alert">{error}</p> : null}
              <button type="submit" className="btn btn--primary" disabled={state === "busy"} onPointerDown={ripple}>
                {state === "busy" ? <i className="spinner" /> : "Wyślij wiadomość"}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
