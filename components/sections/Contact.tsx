"use client";

import React from "react";
import Mascot from "../Mascot";
import MobileCta from "./MobileCta";
import type { Content, ContactLevel, ContactMode, ContactRequest, ContactSubject } from "@/lib/types";
import { ApiError, publicApi } from "@/lib/api";
import {
  FACEBOOK_URL, INSTAGRAM_URL, LEVELS, LIMITS, MODES, PHONE_DISPLAY, PHONE_TEL, SUBJECTS, WHATSAPP_URL,
  asLevel, asSubject, isEmail, levelLabel, normalizePhone, subjectLabel,
} from "@/lib/contact";
import { ripple, useHandoff, useReveal } from "@/lib/motion";
import "./contact.css";

function Faq({ items }: { items: Content["faq"] }) {
  const [open, setOpen] = React.useState<number | null>(0);
  if (!items.length) return null;
  return (
    <div className="faq" id="faq">
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

/* ── formularz „Zapytaj o zajęcia” ─────────────────────────────────────────── */

type FieldKey = "name" | "subjects" | "level" | "mode" | "contact" | "email" | "phone" | "class_info" | "message";
type Errors = Partial<Record<FieldKey, string>>;
type Values = {
  name: string; subjects: ContactSubject[]; level: ContactLevel | ""; mode: ContactMode;
  email: string; phone: string; class_info: string; message: string;
};
type Status = "idle" | "sending" | "success" | "error";

const EMPTY: Values = { name: "", subjects: [], level: "", mode: "any", email: "", phone: "", class_info: "", message: "" };
const ORDER: FieldKey[] = ["name", "subjects", "level", "mode", "contact", "email", "phone", "class_info", "message"];
const LABEL: Record<FieldKey, string> = {
  name: "Imię", subjects: "Przedmiot", level: "Poziom", mode: "Tryb", contact: "E-mail lub telefon",
  email: "E-mail", phone: "Telefon", class_info: "Klasa lub szczegóły", message: "Wiadomość",
};
const MSG: Record<FieldKey, string> = {
  name: "Podaj imię (2–100 znaków).",
  subjects: "Wybierz co najmniej jeden przedmiot.",
  level: "Wybierz poziom nauki.",
  mode: "Wybierz formę zajęć.",
  contact: "Podaj e-mail lub telefon, żeby można było odpowiedzieć.",
  email: "Podaj poprawny adres e-mail albo wyczyść to pole.",
  phone: "Podaj polski numer (9 cyfr, np. 600 123 456, może być z +48) albo wyczyść to pole.",
  class_info: `Skróć ten opis (najwyżej ${LIMITS.classInfo} znaków).`,
  message: `Skróć wiadomość (najwyżej ${LIMITS.message} znaków).`,
};
const TIMEOUT_MS = 20000;

function validate(v: Values): Errors {
  const e: Errors = {};
  const name = v.name.trim();
  if (name.length < LIMITS.name[0] || name.length > LIMITS.name[1]) e.name = MSG.name;
  if (!v.subjects.length) e.subjects = MSG.subjects;
  if (!v.level) e.level = MSG.level;
  const email = v.email.trim();
  const phone = v.phone.trim();
  if (email && !isEmail(email)) e.email = MSG.email;
  if (phone && !normalizePhone(phone)) e.phone = MSG.phone;
  if (!email && !phone) e.contact = MSG.contact;
  if (v.class_info.trim().length > LIMITS.classInfo) e.class_info = MSG.class_info;
  if (v.message.trim().length > LIMITS.message) e.message = MSG.message;
  return e;
}

function Field({ id, label, err, help, children }: { id: string; label: string; err?: string; help?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="field cf-field">
      <label htmlFor={id}>{label}</label>
      {children}
      {help}
      {err ? <em className="cf-err" id={`${id}-err`}>{err}</em> : null}
    </div>
  );
}

function ContactForm() {
  const [v, setV] = React.useState<Values>(EMPTY);
  const [errors, setErrors] = React.useState<Errors>({});
  const [status, setStatus] = React.useState<Status>("idle");
  const [serverMsg, setServerMsg] = React.useState<string | null>(null);
  const [requestId, setRequestId] = React.useState<string | null>(null);
  const [announce, setAnnounce] = React.useState("");
  const [flash, setFlash] = React.useState<{ subjects?: boolean; level?: boolean }>({});
  const formRef = React.useRef<HTMLFormElement>(null);
  const doneRef = React.useRef<HTMLDivElement>(null);
  const busy = React.useRef(false);
  const timers = React.useRef<number[]>([]);
  const statusRef = React.useRef<Status>("idle");
  statusRef.current = status;

  React.useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);
  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); };
  const say = (msg: string) => { setAnnounce(""); later(() => setAnnounce(msg), 60); };

  const patch = (p: Partial<Values>, keys: FieldKey[]) => {
    setV((o) => ({ ...o, ...p }));
    setErrors((o) => {
      if (!keys.some((k) => o[k]) && !(keys.some((k) => k === "email" || k === "phone") && o.contact)) return o;
      const n = { ...o };
      keys.forEach((k) => delete n[k]);
      if (keys.some((k) => k === "email" || k === "phone")) delete n.contact;
      return n;
    });
  };

  /* Handoff z quizu / cennika: dodaje przedmiot, ustawia poziom, NIE rusza wiadomości. */
  useHandoff((h) => {
    if (h.target !== "contact") return;
    const sub = asSubject(h.subject_key);
    const lvl = asLevel(h.level_key);
    if (!sub && !lvl) return;
    if (statusRef.current === "success") { setStatus("idle"); setRequestId(null); }
    setV((o) => ({
      ...o,
      subjects: sub && !o.subjects.includes(sub) ? [...o.subjects, sub] : o.subjects,
      level: lvl || o.level,
    }));
    setErrors((o) => {
      const n = { ...o };
      if (sub) delete n.subjects;
      if (lvl) delete n.level;
      return n;
    });
    setFlash({ subjects: !!sub, level: !!lvl });
    later(() => setFlash({}), 1700);
    const parts = [sub ? `przedmiot: ${subjectLabel(sub)}` : "", lvl ? `poziom: ${levelLabel(lvl)}` : ""].filter(Boolean);
    say(`Formularz uzupełniony — ${parts.join(", ")}. Wpisana wiadomość została bez zmian.`);
  });

  const focusFirst = () => {
    window.requestAnimationFrame(() => {
      const el = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"], [data-err="1"]');
      el?.focus();
    });
  };

  const send = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy.current) return;
    const fd = new FormData(e.currentTarget);
    const bad = validate(v);
    setServerMsg(null);
    if (Object.keys(bad).length) {
      setErrors(bad);
      const n = ORDER.filter((k) => bad[k]).length;
      say(`Formularz zawiera ${n} ${n === 1 ? "błąd" : n < 5 ? "błędy" : "błędów"}. ${LABEL[ORDER.find((k) => bad[k])!]}: ${bad[ORDER.find((k) => bad[k])!]}`);
      focusFirst();
      return;
    }
    setErrors({});
    busy.current = true;
    setStatus("sending");
    const email = v.email.trim();
    const phone = normalizePhone(v.phone.trim());
    const body: ContactRequest = {
      name: v.name.trim(),
      subjects: v.subjects,
      level: v.level as ContactLevel,
      mode: v.mode,
      ...(email ? { email } : {}),
      ...(phone ? { phone } : {}),
      ...(v.class_info.trim() ? { class_info: v.class_info.trim() } : {}),
      ...(v.message.trim() ? { message: v.message.trim() } : {}),
      website: String(fd.get("website") || ""),
    };
    const ctl = new AbortController();
    const timeout = window.setTimeout(() => ctl.abort(), TIMEOUT_MS);
    try {
      const res = await publicApi.contact(body, ctl.signal);
      setRequestId(res?.request_id || null);
      setV(EMPTY);
      setStatus("success");
      later(() => doneRef.current?.focus(), 80);
    } catch (err) {
      setStatus("error");
      if (err instanceof ApiError && err.fields.length) {
        const known = err.fields.filter((f): f is FieldKey => f in LABEL);
        if (known.length) {
          const n: Errors = {};
          known.forEach((k) => { n[k] = MSG[k]; });
          setErrors(n);
          focusFirst();
        }
        setServerMsg(known.length ? "Serwer odrzucił część pól — popraw je i wyślij ponownie. Wpisane dane zostały zachowane." : err.message);
      } else if ((err as Error).name === "AbortError") {
        setServerMsg("Serwer odpowiada zbyt długo, więc nie mam potwierdzenia, że zgłoszenie dotarło. Wpisane dane zostały zachowane — spróbuj jeszcze raz albo zadzwoń.");
      } else if (err instanceof ApiError && err.status === 429) {
        setServerMsg("Za dużo prób w krótkim czasie. Spróbuj za kilka minut albo zadzwoń lub napisz na WhatsApp. Wpisane dane zostały zachowane.");
      } else {
        setServerMsg(`${(err as Error).message} Wpisane dane zostały zachowane.`);
      }
    } finally {
      window.clearTimeout(timeout);
      busy.current = false;
    }
  };

  if (status === "success") {
    return (
      <div className="contact__done" ref={doneRef} tabIndex={-1} role="status">
        <Mascot mood="happy" size={110} side="left" />
        <p className="contact__done-msg">
          <b>Dziękuję, zgłoszenie zostało przyjęte.</b> Krzysztof skontaktuje się z Tobą na podany numer lub e-mail.
        </p>
        {requestId ? <small className="muted">Numer zgłoszenia: {requestId}</small> : null}
        <p className="muted">Wolisz porozmawiać od razu? Zadzwoń <a href={PHONE_TEL}>{PHONE_DISPLAY}</a> albo napisz na <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">WhatsApp<span className="sr-only"> (otwiera się w nowej karcie)</span></a>.</p>
        <button type="button" className="btn" onClick={() => { setStatus("idle"); setRequestId(null); }}>Wyślij kolejne zgłoszenie</button>
      </div>
    );
  }

  const errKeys = ORDER.filter((k) => errors[k]);
  const sending = status === "sending";
  const d = (k: FieldKey, extra?: string) => [errors[k] ? `cf-${k}-err` : "", extra].filter(Boolean).join(" ") || undefined;
  const contactErr = errors.contact;
  const firstSubjectErr = errors.subjects ? "1" : undefined;

  return (
    <form ref={formRef} id="cf-form" onSubmit={send} noValidate aria-busy={sending}>
      <h3 className="h-card">Formularz zapytania</h3>
      <p className="muted cf-req">Pola oznaczone gwiazdką są wymagane. Podaj e-mail lub telefon — wystarczy jedno z nich.</p>

      {errKeys.length ? (
        <div className="form-error cf-summary" id="cf-summary" tabIndex={-1}>
          <div>
            <b>Sprawdź formularz:</b>
            <ul>
              {errKeys.map((k) => (
                <li key={k}><a href={`#cf-${k}`} onClick={(ev) => { ev.preventDefault(); (formRef.current?.querySelector<HTMLElement>(`[data-f="${k === "contact" ? "phone" : k}"]`))?.focus(); }}>{LABEL[k]}</a>: {errors[k]}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      <Field id="cf-name" label="Imię *" err={errors.name}>
        <input
          className="input" id="cf-name" name="name" data-f="name" value={v.name} autoComplete="name" maxLength={LIMITS.name[1]}
          aria-required="true" aria-invalid={errors.name ? true : undefined} aria-describedby={d("name")}
          onChange={(e) => patch({ name: e.target.value }, ["name"])}
        />
      </Field>

      <fieldset className={`cf-group ${flash.subjects ? "is-flash" : ""}`} aria-describedby={d("subjects", "cf-subjects-help")}>
        <legend>Przedmiot *</legend>
        <div className="cf-tiles">
          {SUBJECTS.map((s, i) => (
            <label key={s.key} className="cf-opt cf-opt--tile">
              <input
                type="checkbox" name="subjects" value={s.key} className="sr-only" checked={v.subjects.includes(s.key)}
                data-f={i === 0 ? "subjects" : undefined} data-err={i === 0 ? firstSubjectErr : undefined}
                onChange={(e) => patch({ subjects: e.target.checked ? [...v.subjects, s.key] : v.subjects.filter((x) => x !== s.key) }, ["subjects"])}
              />
              <span className="cf-opt__body">
                <b className="cf-opt__glyph" aria-hidden="true">{s.hint}</b>
                <span>{s.label}</span>
                <svg className="cf-opt__tick" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l5 5 9-11" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </span>
            </label>
          ))}
        </div>
        <small className="muted" id="cf-subjects-help">Możesz wybrać oba.</small>
        {errors.subjects ? <em className="cf-err" id="cf-subjects-err">{errors.subjects}</em> : null}
      </fieldset>

      <fieldset className={`cf-group ${flash.level ? "is-flash" : ""}`} aria-describedby={d("level")}>
        <legend>Poziom *</legend>
        <div className="cf-segs cf-segs--levels">
          {LEVELS.map((l, i) => (
            <label key={l.key} className="cf-opt cf-opt--seg">
              <input
                type="radio" name="level" value={l.key} className="sr-only" checked={v.level === l.key}
                data-f={i === 0 ? "level" : undefined} data-err={i === 0 && errors.level ? "1" : undefined}
                onChange={() => patch({ level: l.key }, ["level"])}
              />
              <span className="cf-opt__body">{l.label}</span>
            </label>
          ))}
        </div>
        {errors.level ? <em className="cf-err" id="cf-level-err">{errors.level}</em> : null}
      </fieldset>

      <fieldset className="cf-group">
        <legend>Forma zajęć *</legend>
        <div className="cf-segs">
          {MODES.map((m) => (
            <label key={m.key} className="cf-opt cf-opt--seg">
              <input type="radio" name="mode" value={m.key} className="sr-only" checked={v.mode === m.key} onChange={() => patch({ mode: m.key }, ["mode"])} />
              <span className="cf-opt__body">{m.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div role="group" aria-labelledby="cf-contact-legend" className="cf-contact">
        <p className="cf-legend" id="cf-contact-legend">Jak się z Tobą skontaktować? *</p>
        {contactErr ? <em className="cf-err" id="cf-contact-err">{contactErr}</em> : null}
        <div className="contact__two">
          <Field id="cf-phone" label="Telefon" err={errors.phone}>
            <input
              className="input" id="cf-phone" name="phone" data-f="phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={30} value={v.phone}
              placeholder="np. 600 123 456"
              aria-invalid={errors.phone || contactErr ? true : undefined} aria-describedby={[errors.phone ? "cf-phone-err" : "", contactErr ? "cf-contact-err" : ""].filter(Boolean).join(" ") || undefined}
              onChange={(e) => patch({ phone: e.target.value }, ["phone"])}
            />
          </Field>
          <Field id="cf-email" label="E-mail" err={errors.email}>
            <input
              className="input" id="cf-email" name="email" data-f="email" type="email" inputMode="email" autoComplete="email" maxLength={254} value={v.email}
              placeholder="np. imie@poczta.pl"
              aria-invalid={errors.email || contactErr ? true : undefined} aria-describedby={[errors.email ? "cf-email-err" : "", contactErr ? "cf-contact-err" : ""].filter(Boolean).join(" ") || undefined}
              onChange={(e) => patch({ email: e.target.value }, ["email"])}
            />
          </Field>
        </div>
      </div>

      <Field id="cf-class_info" label="Klasa lub szczegóły (opcjonalnie)" err={errors.class_info}>
        <input
          className="input" id="cf-class_info" name="class_info" data-f="class_info" value={v.class_info} maxLength={LIMITS.classInfo}
          placeholder="np. 8 klasa, matura rozszerzona"
          aria-invalid={errors.class_info ? true : undefined} aria-describedby={d("class_info")}
          onChange={(e) => patch({ class_info: e.target.value }, ["class_info"])}
        />
      </Field>

      <Field
        id="cf-message" label="Wiadomość (opcjonalnie)" err={errors.message}
        help={
          <small className="muted" id="cf-message-help">
            Możesz napisać, z jakim tematem potrzebujesz pomocy.
            {v.message.length > LIMITS.message - 400 ? ` Zostało ${LIMITS.message - v.message.length} znaków.` : ""}
          </small>
        }
      >
        <textarea
          className="input" id="cf-message" name="message" data-f="message" value={v.message} maxLength={LIMITS.message}
          aria-invalid={errors.message ? true : undefined} aria-describedby={d("message", "cf-message-help")}
          onChange={(e) => patch({ message: e.target.value }, ["message"])}
        />
      </Field>

      {/* Pułapka na boty: poza ekranem, bez fokusu i dla czytników (inert). */}
      <div className="hp" aria-hidden="true" inert>
        <label>Nie wypełniaj tego pola<input name="website" tabIndex={-1} autoComplete="off" defaultValue="" /></label>
      </div>

      <p className="cf-privacy">
        Imię i dane kontaktowe wykorzystam wyłącznie, żeby odpowiedzieć na to zapytanie i ustalić zajęcia. Nie wysyłam reklam.{" "}
        <a href="/polityka-prywatnosci" target="_blank" rel="noopener noreferrer">Polityka prywatności<span className="sr-only"> (otwiera się w nowej karcie)</span></a>.
      </p>

      {serverMsg ? (
        <div className="form-error cf-server" role="alert">
          <div>
            <p>{serverMsg}</p>
            <p className="cf-alt">Możesz też zadzwonić <a href={PHONE_TEL}>{PHONE_DISPLAY}</a> albo napisać na <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">WhatsApp<span className="sr-only"> (otwiera się w nowej karcie)</span></a>.</p>
          </div>
        </div>
      ) : null}

      <p className="sr-only" role="status">{sending ? "Wysyłam wiadomość…" : ""}</p>
      <p className="sr-only" aria-live="polite" role="status">{announce}</p>

      <button type="submit" className="btn btn--primary cf-submit" aria-disabled={sending} onPointerDown={ripple}>
        {sending ? <><i className="spinner" aria-hidden="true" /> Wysyłam wiadomość…</> : "Wyślij zapytanie"}
      </button>
    </form>
  );
}

/* ── sekcja ────────────────────────────────────────────────────────────────── */

export default function Contact({ content }: { content: Content }) {
  const root = useReveal<HTMLElement>();
  const [copied, setCopied] = React.useState<string | null>(null);
  const c = content.contact;

  const copy = async (v: string, label: string) => {
    try {
      await navigator.clipboard.writeText(v);
      setCopied(label);
      window.setTimeout(() => setCopied(null), 1600);
    } catch { /* brak schowka — zostaje zwykły link */ }
  };

  const tiles = [
    { k: "Telefon", v: PHONE_DISPLAY, href: PHONE_TEL, icon: "📞", copy: true, ext: false },
    { k: "WhatsApp", v: "Napisz na WhatsAppie", href: WHATSAPP_URL, icon: "💬", copy: false, ext: true },
    c.email ? { k: "E-mail", v: c.email, href: `mailto:${c.email}`, icon: "✉️", copy: true, ext: false } : null,
    { k: "Gdzie", v: [c.city || "Mysłowice", c.area || "online"].filter(Boolean).join(" · "), href: null, icon: "📍", copy: false, ext: false },
  ].filter(Boolean) as { k: string; v: string; href: string | null; icon: string; copy: boolean; ext: boolean }[];

  return (
    <>
      <section id="kontakt" ref={root} className="section contact" tabIndex={-1}>
        <div className="wrap contact__grid">
          <div className="contact__left">
            <span className="eyebrow" data-reveal>Kontakt</span>
            <h2 className="h-section" data-reveal>Zapytaj o <span className="text-sea">zajęcia</span></h2>
            <p className="lead" data-reveal>Matematyka i chemia, w Mysłowicach i online. Wybierz przedmiot i poziom, zostaw numer lub e-mail — Krzysztof odezwie się do Ciebie.</p>
            <div className="contact__tiles">
              {tiles.map((t) => (
                <div key={t.k} className="contact__tile" data-reveal>
                  <span className="contact__icon" aria-hidden="true">{t.icon}</span>
                  <div>
                    <small>{t.k}</small>
                    {t.href ? (
                      <a href={t.href} {...(t.ext ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                        {t.v}{t.ext ? <span className="sr-only"> (otwiera się w nowej karcie)</span> : null}
                      </a>
                    ) : <span>{t.v}</span>}
                  </div>
                  {t.copy ? (
                    <button type="button" className="contact__copy" onClick={() => copy(t.v, t.k)} aria-label={`Kopiuj: ${t.k}`}>
                      {copied === t.k ? "✓" : "⧉"}
                    </button>
                  ) : null}
                </div>
              ))}
              <div className="contact__social" data-reveal>
                <a className="btn btn--sm" href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer">Facebook<span className="sr-only"> (otwiera się w nowej karcie)</span></a>
                <a className="btn btn--sm" href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">Instagram<span className="sr-only"> (otwiera się w nowej karcie)</span></a>
              </div>
            </div>
            <Faq items={content.faq || []} />
          </div>

          <div className="contact__form card" data-reveal>
            <ContactForm />
          </div>
        </div>
      </section>
      <MobileCta />
    </>
  );
}
