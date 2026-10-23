"use client";

import React from "react";
import { ApiError } from "@/lib/api";
import { LIMITS, PHONE_DISPLAY, PHONE_TEL, WHATSAPP_URL, isEmail, normalizePhone } from "@/lib/contact";
import { ripple } from "@/lib/motion";

/* Ostatni dymek: dane kontaktowe jako „wiadomość do wysłania”. Wszystkie wymagania z §12:
   błędy przy polach (aria-invalid + aria-describedby), podsumowanie, fokus na pierwszym
   błędzie, blokada podwójnego wysłania, dane zostają przy błędzie, pułapka `website`,
   informacja o danych z linkiem do polityki. Sukces ogłasza rodzic dopiero po odpowiedzi serwera. */

export type Details = { name: string; email: string; phone: string; class_info: string; message: string; consent: boolean };
export const EMPTY_DETAILS: Details = { name: "", email: "", phone: "", class_info: "", message: "", consent: false };

type Key = "name" | "contact" | "email" | "phone" | "class_info" | "message" | "consent";
type Errors = Partial<Record<Key, string>>;
const ORDER: Key[] = ["name", "contact", "email", "phone", "class_info", "message", "consent"];
const LABEL: Record<Key, string> = {
  name: "Imię", contact: "Kontakt", email: "E-mail", phone: "Telefon", class_info: "Klasa", message: "Wiadomość", consent: "Zgoda",
};
const FIELD_OF: Record<string, Key> = {
  name: "name", student_name: "name", email: "email", phone: "phone", class_info: "class_info", message: "message", consent: "consent",
};
const TIMEOUT_MS = 20000;

function validate(v: Details, kind: "book" | "ask"): Errors {
  const e: Errors = {};
  const name = v.name.trim();
  if (name.length < LIMITS.name[0] || name.length > LIMITS.name[1]) e.name = "Podaj imię (2–100 znaków).";
  const email = v.email.trim();
  const phone = v.phone.trim();
  if (kind === "book") {
    if (!email) e.email = "Podaj e-mail — wyślę na niego potwierdzenie i link do zmiany terminu.";
    else if (!isEmail(email)) e.email = "Podaj poprawny adres e-mail.";
  } else {
    if (!email && !phone) e.contact = "Podaj telefon lub e-mail, żebym mógł odpowiedzieć.";
    if (email && !isEmail(email)) e.email = "Podaj poprawny adres e-mail albo wyczyść to pole.";
  }
  if (phone && !normalizePhone(phone)) e.phone = "Podaj polski numer (9 cyfr, np. 600 123 456, może być z +48) albo wyczyść to pole.";
  if (v.class_info.trim().length > LIMITS.classInfo) e.class_info = `Skróć ten opis (najwyżej ${LIMITS.classInfo} znaków).`;
  if (v.message.trim().length > LIMITS.message) e.message = `Skróć wiadomość (najwyżej ${LIMITS.message} znaków).`;
  if (kind === "book" && !v.consent) e.consent = "Zaznacz zgodę — bez niej nie mogę przyjąć rezerwacji.";
  return e;
}

const declension = (n: number) => (n === 1 ? "błąd" : n < 5 ? "błędy" : "błędów");

export default function DetailsForm({
  kind,
  value,
  onChange,
  onSubmit,
  onBusy,
}: {
  kind: "book" | "ask";
  value: Details;
  onChange: (p: Partial<Details>) => void;
  /** zwraca "handled", gdy rodzic sam obsłużył odpowiedź (np. 409 → wybór innego terminu) */
  onSubmit: (website: string, signal: AbortSignal) => Promise<"ok" | "handled">;
  onBusy?: (b: boolean) => void;
}) {
  const [errors, setErrors] = React.useState<Errors>({});
  const [sending, setSending] = React.useState(false);
  const [serverMsg, setServerMsg] = React.useState<string | null>(null);
  const [say, setSay] = React.useState("");
  const busy = React.useRef(false);
  const formRef = React.useRef<HTMLFormElement>(null);
  const id = React.useId().replace(/:/g, "");
  const f = (k: string) => `${id}-${k}`;

  const set = (p: Partial<Details>, keys: Key[]) => {
    onChange(p);
    setErrors((o) => {
      if (!keys.some((k) => o[k]) && !(o.contact && keys.some((k) => k === "email" || k === "phone"))) return o;
      const n = { ...o };
      keys.forEach((k) => delete n[k]);
      if (keys.some((k) => k === "email" || k === "phone")) delete n.contact;
      return n;
    });
  };

  const focusFirst = (bad: Errors) => {
    const k = ORDER.find((x) => bad[x]);
    if (!k) return;
    window.requestAnimationFrame(() => {
      const target = k === "contact" ? "phone" : k;
      formRef.current?.querySelector<HTMLElement>(`[data-f="${target}"]`)?.focus();
    });
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy.current) return;
    const website = String(new FormData(e.currentTarget).get("website") || "");
    const bad = validate(value, kind);
    setServerMsg(null);
    if (Object.keys(bad).length) {
      setErrors(bad);
      const n = Object.keys(bad).length;
      const k = ORDER.find((x) => bad[x])!;
      setSay(`Formularz zawiera ${n} ${declension(n)}. ${LABEL[k]}: ${bad[k]}`);
      focusFirst(bad);
      return;
    }
    setErrors({});
    busy.current = true;
    setSending(true);
    onBusy?.(true);
    setSay(kind === "book" ? "Rezerwuję termin…" : "Wysyłam wiadomość…");
    const ctl = new AbortController();
    const timer = window.setTimeout(() => ctl.abort(), TIMEOUT_MS);
    try {
      await onSubmit(website, ctl.signal);
    } catch (err) {
      const alt = " Wpisane dane zostały zachowane.";
      if (err instanceof ApiError && err.fields.length) {
        const known = [...new Set(err.fields.map((x) => FIELD_OF[x]).filter(Boolean))] as Key[];
        if (known.length) {
          const n: Errors = {};
          known.forEach((k) => { n[k] = k === "email" ? err.message.includes("e-mail") ? err.message : "Serwer nie przyjął tego adresu e-mail — sprawdź go." : `Serwer nie przyjął tego pola — sprawdź ${LABEL[k].toLowerCase()}.`; });
          setErrors(n);
          focusFirst(n);
        }
        setServerMsg((known.length ? "Popraw zaznaczone pole i wyślij ponownie." : err.message) + alt);
      } else if ((err as Error).name === "AbortError") {
        setServerMsg("Serwer odpowiada zbyt długo, więc nie mam potwierdzenia, że wiadomość dotarła." + alt + " Spróbuj jeszcze raz albo zadzwoń.");
      } else if (err instanceof ApiError && err.status === 429) {
        setServerMsg("Za dużo prób w krótkim czasie. Spróbuj za kilka minut albo zadzwoń." + alt);
      } else {
        setServerMsg((err as Error).message + alt);
      }
      setSay("");
    } finally {
      window.clearTimeout(timer);
      busy.current = false;
      setSending(false);
      onBusy?.(false);
    }
  };

  const errKeys = ORDER.filter((k) => errors[k]);
  const desc = (...ids: (string | false | undefined)[]) => ids.filter(Boolean).join(" ") || undefined;
  const contactErr = errors.contact;

  return (
    <form ref={formRef} className="kcf" onSubmit={submit} noValidate aria-busy={sending} aria-label={kind === "book" ? "Dane do rezerwacji" : "Dane kontaktowe"}>
      {errKeys.length > 1 ? (
        <div className="kcf__summary" role="alert">
          <b>Sprawdź {errKeys.length} pola:</b>
          <ul>
            {errKeys.map((k) => (
              <li key={k}>
                <a href={`#${f(k === "contact" ? "phone" : k)}`} onClick={(ev) => { ev.preventDefault(); formRef.current?.querySelector<HTMLElement>(`[data-f="${k === "contact" ? "phone" : k}"]`)?.focus(); }}>{LABEL[k]}</a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="kcf__field">
        <label htmlFor={f("name")}>{kind === "book" ? "Imię ucznia" : "Imię"} <span aria-hidden="true">*</span></label>
        <input
          id={f("name")} data-f="name" className="kcf__input" name="name" autoComplete="name" maxLength={LIMITS.name[1]} value={value.name}
          aria-required="true" aria-invalid={errors.name ? true : undefined} aria-describedby={desc(errors.name && f("name-err"))}
          onChange={(e) => set({ name: e.target.value }, ["name"])}
        />
        {errors.name ? <em className="kcf__err" id={f("name-err")}>{errors.name}</em> : null}
      </div>

      <div className="kcf__two" role="group" aria-labelledby={f("contact-legend")}>
        <p className="kcf__legend" id={f("contact-legend")}>
          {kind === "book" ? "Gdzie wysłać potwierdzenie?" : "Jak się z Tobą skontaktować? Wystarczy jedno."}
        </p>
        {contactErr ? <em className="kcf__err kcf__err--wide" id={f("contact-err")}>{contactErr}</em> : null}
        <div className="kcf__field">
          <label htmlFor={f("email")}>E-mail{kind === "book" ? <span aria-hidden="true"> *</span> : null}</label>
          <input
            id={f("email")} data-f="email" className="kcf__input" name="email" type="email" inputMode="email" autoComplete="email" maxLength={254}
            placeholder="np. imie@poczta.pl" value={value.email}
            aria-required={kind === "book" ? true : undefined}
            aria-invalid={errors.email || contactErr ? true : undefined}
            aria-describedby={desc(errors.email && f("email-err"), contactErr && f("contact-err"))}
            onChange={(e) => set({ email: e.target.value }, ["email"])}
          />
          {errors.email ? <em className="kcf__err" id={f("email-err")}>{errors.email}</em> : null}
        </div>
        <div className="kcf__field">
          <label htmlFor={f("phone")}>Telefon{kind === "book" ? " (opcjonalnie)" : ""}</label>
          <input
            id={f("phone")} data-f="phone" className="kcf__input" name="phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={30}
            placeholder="np. 600 123 456" value={value.phone}
            aria-invalid={errors.phone || contactErr ? true : undefined}
            aria-describedby={desc(errors.phone && f("phone-err"), contactErr && f("contact-err"))}
            onChange={(e) => set({ phone: e.target.value }, ["phone"])}
          />
          {errors.phone ? <em className="kcf__err" id={f("phone-err")}>{errors.phone}</em> : null}
        </div>
      </div>

      <div className="kcf__field">
        <label htmlFor={f("class_info")}>Klasa (opcjonalnie)</label>
        <input
          id={f("class_info")} data-f="class_info" className="kcf__input" name="class_info" maxLength={LIMITS.classInfo} value={value.class_info}
          placeholder="np. 8 klasa, matura rozszerzona"
          aria-invalid={errors.class_info ? true : undefined} aria-describedby={desc(errors.class_info && f("class_info-err"))}
          onChange={(e) => set({ class_info: e.target.value }, ["class_info"])}
        />
        {errors.class_info ? <em className="kcf__err" id={f("class_info-err")}>{errors.class_info}</em> : null}
      </div>

      <div className="kcf__field">
        <label htmlFor={f("message")}>Wiadomość (opcjonalnie)</label>
        <textarea
          id={f("message")} data-f="message" className="kcf__input kcf__area" name="message" maxLength={LIMITS.message} value={value.message}
          aria-invalid={errors.message ? true : undefined} aria-describedby={desc(f("message-help"), errors.message && f("message-err"))}
          onChange={(e) => set({ message: e.target.value }, ["message"])}
        />
        <small className="kcf__help" id={f("message-help")}>
          Możesz napisać, z jakim tematem potrzebujesz pomocy.
          {value.message.length > LIMITS.message - 400 ? ` Zostało ${LIMITS.message - value.message.length} znaków.` : ""}
        </small>
        {errors.message ? <em className="kcf__err" id={f("message-err")}>{errors.message}</em> : null}
      </div>

      {/* Pułapka na boty: poza ekranem, bez fokusu i niewidoczna dla czytników. */}
      <div className="hp" aria-hidden="true" inert>
        <label>Nie wypełniaj tego pola<input name="website" tabIndex={-1} autoComplete="off" defaultValue="" /></label>
      </div>

      {kind === "book" ? (
        <div className="kcf__consent">
          <label className="check">
            <input
              type="checkbox" data-f="consent" checked={value.consent}
              aria-invalid={errors.consent ? true : undefined} aria-describedby={desc(errors.consent && f("consent-err"))}
              onChange={(e) => set({ consent: e.target.checked }, ["consent"])}
            />
            <span className="box"><svg viewBox="0 0 24 24"><path d="M5 12l5 5 9-11" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
            <span>
              Zgadzam się na przetwarzanie moich danych w celu umówienia i obsługi lekcji.{" "}
              <a href="/polityka-prywatnosci" target="_blank" rel="noopener noreferrer">Polityka prywatności<span className="sr-only"> (otwiera się w nowej karcie)</span></a>
            </span>
          </label>
          {errors.consent ? <em className="kcf__err" id={f("consent-err")}>{errors.consent}</em> : null}
        </div>
      ) : (
        <p className="kcf__privacy">
          Imię i kontakt wykorzystam wyłącznie, żeby odpowiedzieć na to zapytanie i ustalić zajęcia. Nie wysyłam reklam.{" "}
          <a href="/polityka-prywatnosci" target="_blank" rel="noopener noreferrer">Polityka prywatności<span className="sr-only"> (otwiera się w nowej karcie)</span></a>
        </p>
      )}

      {serverMsg ? (
        <div className="kcf__server" role="alert">
          <p>{serverMsg}</p>
          <p className="kcf__alt">Możesz też zadzwonić: <a href={PHONE_TEL}>{PHONE_DISPLAY}</a> albo napisać na <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">WhatsAppie<span className="sr-only"> (otwiera się w nowej karcie)</span></a>.</p>
        </div>
      ) : null}

      <p className="sr-only" role="status" aria-live="polite">{say}</p>

      <button type="submit" className="kc-send kc-send--big" aria-disabled={sending || undefined} onPointerDown={ripple}>
        <span>{sending ? (kind === "book" ? "Rezerwuję termin…" : "Wysyłam wiadomość…") : kind === "book" ? "Zarezerwuj termin" : "Wyślij zapytanie"}</span>
        {sending ? <i className="spinner" aria-hidden="true" /> : (
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.4 20.4 21 12 3.4 3.6l2.2 7.1L14 12l-8.4 1.3z" /></svg>
        )}
      </button>
    </form>
  );
}
