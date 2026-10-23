"use client";

import React from "react";
import Avatar from "../chat/Avatar";
import Calendar, { slotLabel } from "../chat/Calendar";
import DetailsForm, { EMPTY_DETAILS, type Details } from "../chat/DetailsForm";
import Ticket from "../chat/Ticket";
import { CalendarGlyph, CallBack, Clock, Either, Flask, Laptop, Pencil, Pi, Pin } from "../chat/glyphs";
import {
  EMPTY_ANSWERS, LEVEL_CHOICES, MODE_CHOICES, PATH_CHOICES, SUBJECT_CHOICES,
  botLines, isAnswered, keyOf, levelText, modeText, modeTicket, resultLines, stepsFor, subjectsText,
  type Answers, type Path, type Result, type StepKey,
} from "../chat/model";
import Channels from "../ui/Channels";
import MobileCta from "./MobileCta";
import type { BookingRules, BookingRequest, ContactRequest, Offer } from "@/lib/types";
import { ApiError, publicApi } from "@/lib/api";
import { PHONE_DISPLAY, PHONE_TEL, WHATSAPP_URL, asLevel, asSubject, normalizePhone } from "@/lib/contact";
import { lessonPrice, zl } from "@/lib/pricing";
import { getLenis, reducedMotion, useHandoff, useReveal } from "@/lib/motion";
import "../chat/chat.css";

/* „Zapytaj o zajęcia / Zarezerwuj termin” jako jedna rozmowa z Krzysztofem.
   Krzysztof pyta (najpierw „pisze…”), odpowiadasz stukając duże dymki-wybory; wybrany
   dymek przelatuje na Twoją stronę rozmowy (FLIP na transform). Na rozwidleniu: kalendarz
   w dymku → dane → bilet z drukarki, albo dane → prośba o kontakt. Stuknięcie w Twój
   wcześniejszy dymek otwiera ten krok do zmiany. */

type Item =
  | { t: "bot"; key: string; text: string }
  | { t: "me"; key: string; step: StepKey; text: string; editable: boolean }
  | { t: "note"; key: string; text: string }
  | { t: "widget"; key: string; step: StepKey }
  | { t: "result"; key: string };

const uuid = () => {
  try { return crypto.randomUUID(); } catch { return `k${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`; }
};

export default function Chat({ offer, rules }: { offer: Offer; rules: BookingRules }) {
  const root = useReveal<HTMLElement>();
  const durations = offer.durations.length ? offer.durations : [60];
  const activeLevels = offer.levels.filter((l) => l.active);

  const [a, setA] = React.useState<Answers>(EMPTY_ANSWERS);
  const [details, setDetails] = React.useState<Details>(EMPTY_DETAILS);
  const [editing, setEditing] = React.useState<StepKey | null>(null);
  const [result, setResult] = React.useState<Result | null>(null);
  const [closed, setClosed] = React.useState(!rules.enabled);
  const [conflict, setConflict] = React.useState<string | null>(null);
  const [reload, setReload] = React.useState(0);
  const [weekly, setWeekly] = React.useState(1);
  const [note, setNote] = React.useState<{ id: number; text: string } | null>(null);
  const [revealed, setRevealed] = React.useState<string[]>([]);
  const [live, setLive] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [announce, setAnnounce] = React.useState("");
  const [restartArm, setRestartArm] = React.useState(false);

  const logRef = React.useRef<HTMLDivElement>(null);
  const winRef = React.useRef<HTMLDivElement>(null);
  const engaged = React.useRef(false);
  const kbd = React.useRef(false);
  const flip = React.useRef<{ key: string; rect: DOMRect } | null>(null);
  const clientId = React.useRef("");
  const levelHint = React.useRef<string | null>(null);

  /* ── transkrypt ──────────────────────────────────────────────────────── */
  const open = !closed;
  const items: Item[] = [];
  let openStep: StepKey | null = null;
  for (const step of stepsFor(a)) {
    botLines(step, a, { open, conflict }).forEach((text, i) => items.push({ t: "bot", key: `${step}:${i}:${keyOf(text)}`, text }));
    if (isAnswered(a, step, !!result) && editing !== step) {
      if (step !== "details") items.push({ t: "me", key: `me:${step}`, step, text: answerText(step), editable: !result });
      continue;
    }
    if (note) items.push({ t: "note", key: `note:${note.id}`, text: note.text });
    items.push({ t: "widget", key: `w:${step}:${step === "slot" ? reload : 0}`, step });
    openStep = step;
    break;
  }
  if (result) {
    items.push({ t: "me", key: "me:details", step: "details", text: result.kind === "book" ? `${result.name} · ${result.email}` : `${result.name} · ${result.contact}`, editable: false });
    resultLines(result).forEach((text, i) => items.push({ t: "bot", key: `res:${i}:${keyOf(text)}`, text }));
    items.push({ t: "result", key: "result" });
  }

  function answerText(step: StepKey): string {
    switch (step) {
      case "subjects": return subjectsText(a.subjects || []);
      case "level": return a.level ? levelText(a.level) : "";
      case "mode": return a.mode ? modeText(a.mode) : "";
      case "path": return PATH_CHOICES.find((p) => p.v === a.path)?.label || "";
      case "duration": return `${a.duration} minut`;
      case "slot": return a.slot && a.duration ? slotLabel(a.slot, a.duration) : "";
      default: return "";
    }
  }

  /* pierwszy dymek Krzysztofa, którego jeszcze „nie napisał” */
  const pendingIdx = items.findIndex((it) => it.t === "bot" && !revealed.includes(it.key));
  const shown = pendingIdx === -1 ? items : items.slice(0, pendingIdx);
  const pending = pendingIdx === -1 ? null : (items[pendingIdx] as Extract<Item, { t: "bot" }>);
  const typing = !!pending || sending;

  /* rozmowa startuje, gdy czat wejdzie w widok */
  React.useEffect(() => {
    const el = winRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setLive(true); io.disconnect(); } }, { rootMargin: "0px 0px -15% 0px" });
    io.observe(el);
    const down = () => { kbd.current = false; };
    const key = () => { kbd.current = true; };
    window.addEventListener("pointerdown", down, true);
    window.addEventListener("keydown", key, true);
    return () => { io.disconnect(); window.removeEventListener("pointerdown", down, true); window.removeEventListener("keydown", key, true); };
  }, []);

  React.useEffect(() => {
    if (!pending || !live) return;
    const delay = reducedMotion() ? 0 : 420 + Math.min(900, pending.text.length * 16);
    const t = window.setTimeout(() => {
      setRevealed((r) => (r.includes(pending.key) ? r : [...r, pending.key]));
      setAnnounce(pending.text);
    }, delay);
    return () => window.clearTimeout(t);
  }, [pending, live]);

  /* wybrany dymek przelatuje z miejsca wyboru na swoje miejsce w rozmowie */
  React.useLayoutEffect(() => {
    const f = flip.current;
    if (!f || reducedMotion()) { flip.current = null; return; }
    const el = logRef.current?.querySelector<HTMLElement>(`[data-flip="${f.key}"]`);
    if (!el) return;
    flip.current = null;
    const r = el.getBoundingClientRect();
    const dx = f.rect.left - r.left;
    const dy = f.rect.top - r.top;
    const sx = f.rect.width / Math.max(1, r.width);
    const sy = f.rect.height / Math.max(1, r.height);
    el.style.transformOrigin = "0 0";
    el.style.transition = "none";
    el.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
    el.getBoundingClientRect();
    el.style.transition = "transform 560ms var(--ease-out)";
    el.style.transform = "";
    const end = () => { el.style.transition = ""; el.style.transformOrigin = ""; el.removeEventListener("transitionend", end); };
    el.addEventListener("transitionend", end);
  });

  /* po każdym nowym elemencie: strona dojeżdża tak, żeby był widoczny (tylko po interakcji) */
  const lastKey = shown[shown.length - 1]?.key;
  React.useEffect(() => {
    if (!engaged.current) return;
    const raf = window.requestAnimationFrame(() => {
      const log = logRef.current;
      const last = log?.lastElementChild as HTMLElement | null;
      if (!last) return;
      const r = last.getBoundingClientRect();
      const over = r.bottom - (window.innerHeight - 28);
      if (over <= 0) return;
      const by = Math.min(over, Math.max(0, r.top - 96));
      if (by < 6) return;
      const lenis = getLenis();
      if (lenis) lenis.scrollTo(window.scrollY + by, { duration: reducedMotion() ? 0 : 0.9 });
      else window.scrollBy({ top: by, behavior: reducedMotion() ? "auto" : "smooth" });
    });
    return () => window.cancelAnimationFrame(raf);
  }, [lastKey, typing]);

  /* fokus na nowym widżecie: przyciski zawsze, pole tekstowe tylko przy klawiaturze */
  const widgetKey = shown.find((it) => it.t === "widget" || it.t === "result")?.key;
  React.useEffect(() => {
    if (!engaged.current || !widgetKey) return;
    const t = window.setTimeout(() => {
      const w = logRef.current?.querySelector<HTMLElement>(`[data-w="${widgetKey}"]`);
      const isForm = !!w?.querySelector("form");
      if (isForm && !kbd.current) return;
      const target = w?.querySelector<HTMLElement>(isForm ? "input" : "button:not([disabled]), a");
      target?.focus({ preventScroll: true });
    }, 60);
    return () => window.clearTimeout(t);
  }, [widgetKey]);

  /* ── odpowiedzi ──────────────────────────────────────────────────────── */
  const answer = (step: StepKey, patch: Partial<Answers>, e?: React.MouseEvent<HTMLElement>) => {
    engaged.current = true;
    if (e) flip.current = { key: `me:${step}`, rect: e.currentTarget.getBoundingClientRect() };
    setA((o) => {
      const n = { ...o, ...patch };
      if (patch.duration != null && patch.duration !== o.duration) n.slot = null;
      return n;
    });
    if (step === "slot") setConflict(null);
    setEditing(null);
    setNote(null);
  };

  const edit = (step: StepKey) => {
    if (result) return;
    engaged.current = true;
    setEditing(step);
  };

  const restart = () => {
    if (!restartArm && !result) {
      setRestartArm(true);
      window.setTimeout(() => setRestartArm(false), 2600);
      return;
    }
    engaged.current = true;
    setRestartArm(false);
    setA(EMPTY_ANSWERS);
    setResult(null);
    setEditing(null);
    setConflict(null);
    setNote(null);
    setRevealed([]);
    clientId.current = "";
  };

  /* poziom do rezerwacji: klucz z oferty z panelu (serwer sprawdza go z listą aktywnych) */
  const offerLevel = (lvl: Answers["level"]) => {
    if (!lvl) return null;
    const hint = levelHint.current;
    if (hint && activeLevels.some((l) => l.key === hint) && asLevel(hint) === lvl) return hint;
    return activeLevels.find((l) => l.key === lvl)?.key ?? activeLevels.find((l) => asLevel(l.key) === lvl)?.key ?? null;
  };
  const priceLevel = activeLevels.find((l) => l.key === offerLevel(a.level));

  /* ── przekazanie z oferty / kalkulatora ──────────────────────────────── */
  useHandoff((h) => {
    const from = h.source === "pricing" ? "kalkulatora" : h.source === "plan" ? "planu" : h.source === "offer" ? "oferty" : h.source === "quiz" ? "quizu" : "strony";
    if (h.target === "contact") {
      const sub = asSubject(h.subject_key);
      const lvl = asLevel(h.level_key);
      if (!sub && !lvl) return;
      if (lvl && h.level_key) levelHint.current = h.level_key;
      if (result) { setResult(null); setRevealed([]); }
      setA((o) => ({
        ...o,
        subjects: sub ? (o.subjects?.includes(sub) ? o.subjects : [...(o.subjects || []), sub]) : o.subjects,
        level: lvl || o.level,
      }));
      const parts = [sub ? subjectsText([sub]) : "", lvl ? levelText(lvl) : ""].filter(Boolean).join(" · ");
      setNote({ id: Date.now(), text: `Uzupełnione z ${from}: ${parts}` });
      setAnnounce(`Czat uzupełniony z ${from}: ${parts}. Wpisane dane zostały bez zmian.`);
    } else {
      const lvl = asLevel(h.level_key);
      const dur = h.duration && durations.includes(h.duration) ? h.duration : null;
      if (!lvl && !dur) return;
      if (lvl && h.level_key) levelHint.current = h.level_key;
      if (h.weekly) setWeekly(Math.max(1, Math.min(7, h.weekly)));
      if (result) { setResult(null); setRevealed([]); }
      setA((o) => ({
        ...o,
        level: lvl || o.level,
        duration: dur ?? o.duration,
        slot: dur && dur !== o.duration ? null : o.slot,
        path: open ? "book" : o.path,
      }));
      const parts = [lvl ? levelText(lvl) : "", dur ? `${dur} min` : "", h.weekly && h.weekly > 1 ? `${h.weekly}× w tygodniu` : ""].filter(Boolean).join(" · ");
      setNote({ id: Date.now(), text: `Uzupełnione z ${from}: ${parts}` });
      setAnnounce(`Czat uzupełniony z ${from}: ${parts}.`);
    }
    setEditing(null);
  });

  /* link z maila „Nowy termin” (/#rezerwacja) od razu wybiera ścieżkę rezerwacji */
  React.useEffect(() => {
    const on = () => {
      if (window.location.hash === "#rezerwacja" && open) setA((o) => (o.path ? o : { ...o, path: "book" }));
    };
    on();
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, [open]);

  /* ── wysyłka ─────────────────────────────────────────────────────────── */
  const submit = async (website: string, signal: AbortSignal): Promise<"ok" | "handled"> => {
    engaged.current = true;
    const name = details.name.trim();
    const email = details.email.trim();
    const phone = details.phone.trim() ? normalizePhone(details.phone.trim()) : null;
    const subjects = a.subjects || [];
    if (a.path === "book") {
      if (!a.slot || !a.duration) { setEditing("slot"); return "handled"; }
      const extra = [
        subjects.length > 1 ? `Przedmioty: ${subjectsText(subjects)}.` : "",
        a.level === "inny" ? "Poziom: inny." : "",
        a.mode === "any" ? "Forma: obojętnie." : "",
        details.class_info.trim() ? `Klasa: ${details.class_info.trim()}.` : "",
      ].filter(Boolean).join(" ");
      const message = [extra, details.message.trim()].filter(Boolean).join("\n\n") || null;
      const subjectKey = subjects.length === 1 && (!offer.subjects.length || offer.subjects.some((s) => s.key === subjects[0])) ? subjects[0] : null;
      const mode = a.mode && a.mode !== "any" && (!offer.modes.length || offer.modes.includes(a.mode)) ? a.mode : null;
      if (!clientId.current) clientId.current = uuid();
      const body: BookingRequest = {
        client_id: clientId.current, starts_at: a.slot, duration_minutes: a.duration,
        level_key: offerLevel(a.level), subject_key: subjectKey, mode, weekly_lessons: weekly,
        student_name: name, email, phone, message, consent: true, website,
      };
      try {
        const b = await publicApi.book(body, signal);
        clientId.current = "";
        setResult({ kind: "book", id: b.id, token: b.token, status: b.status, starts_at: b.starts_at, ends_at: b.ends_at, duration: b.duration_minutes, price: b.price_grosze, name, email });
        setDetails(EMPTY_DETAILS);
        return "ok";
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) {
          clientId.current = "";
          if (/wyłącz/i.test(err.message)) {
            setClosed(true);
            setA((o) => ({ ...o, path: "ask", slot: null }));
            setNote({ id: Date.now(), text: err.message });
          } else {
            setConflict(`Ups — ${err.message.charAt(0).toLowerCase()}${err.message.slice(1)}`);
            setA((o) => ({ ...o, slot: null }));
            setReload((n) => n + 1);
          }
          return "handled";
        }
        throw err;
      }
    }
    const body: ContactRequest = {
      name, subjects, level: a.level || "inny", mode: a.mode || "any",
      ...(email ? { email } : {}),
      ...(phone ? { phone } : {}),
      ...(details.class_info.trim() ? { class_info: details.class_info.trim() } : {}),
      ...(details.message.trim() ? { message: details.message.trim() } : {}),
      website,
    };
    const res = await publicApi.contact(body, signal);
    setResult({ kind: "ask", requestId: res?.request_id || null, name, contact: phone ? PHONE_FMT(phone) : email });
    setDetails(EMPTY_DETAILS);
    return "ok";
  };

  /* ── widżety ─────────────────────────────────────────────────────────── */
  const choice = (step: StepKey, k: number, active: boolean, label: string, sub: string, glyph: React.ReactNode, onPick: (e: React.MouseEvent<HTMLElement>) => void, main = false) => (
    <button
      key={label}
      type="button"
      className={`kc-opt ${main ? "kc-opt--main" : ""} ${active ? "is-current" : ""}`}
      style={{ "--k": k } as React.CSSProperties}
      aria-pressed={editing === step ? active : undefined}
      onClick={onPick}
    >
      <span className="kc-opt__glyph">{glyph}</span>
      <span className="kc-opt__txt"><b>{label}</b>{sub ? <small>{sub}</small> : null}</span>
    </button>
  );

  const widget = (step: StepKey, key: string) => {
    switch (step) {
      case "subjects":
        return (
          <div className="kc-row kc-row--me" data-w={key} role="group" aria-label="Przedmiot">
            <div className="kc-choices">
              {SUBJECT_CHOICES.map((c, i) => choice(step, i, (a.subjects || []).join() === c.v.join(), c.label, c.sub,
                c.glyph === "pi" ? <Pi /> : c.glyph === "flask" ? <Flask /> : <span className="kc-opt__duo"><Pi /><Flask /></span>,
                (e) => answer(step, { subjects: c.v }, e)))}
            </div>
          </div>
        );
      case "level":
        return (
          <div className="kc-row kc-row--me" data-w={key} role="group" aria-label="Poziom">
            <div className="kc-choices kc-choices--grid">
              {LEVEL_CHOICES.map((c, i) => choice(step, i, a.level === c.v, c.label, c.sub, <span className="kc-opt__badge">{c.badge}</span>, (e) => answer(step, { level: c.v }, e)))}
            </div>
          </div>
        );
      case "mode":
        return (
          <div className="kc-row kc-row--me" data-w={key} role="group" aria-label="Forma zajęć">
            <div className="kc-choices">
              {MODE_CHOICES.map((c, i) => choice(step, i, a.mode === c.v, c.label, c.sub, c.glyph === "pin" ? <Pin /> : c.glyph === "laptop" ? <Laptop /> : <Either />, (e) => answer(step, { mode: c.v }, e)))}
            </div>
          </div>
        );
      case "path":
        return (
          <div className="kc-row kc-row--me" data-w={key} role="group" aria-label="Co dalej">
            <div className="kc-choices">
              {PATH_CHOICES.filter((c) => open || c.v === "ask").map((c, i) =>
                choice(step, i, a.path === c.v, c.label, c.sub, c.v === "book" ? <CalendarGlyph /> : <CallBack />, (e) => answer(step, { path: c.v as Path }, e), c.v === "book"))}
            </div>
          </div>
        );
      case "duration":
        return (
          <div className="kc-row kc-row--me" data-w={key} role="group" aria-label="Długość lekcji">
            <div className="kc-choices kc-choices--grid">
              {durations.map((d, i) => {
                const p = lessonPrice(priceLevel, d);
                return choice(step, i, a.duration === d, `${d} min`, p != null ? zl(p) : d < 60 ? "krócej" : d === 60 ? "godzina" : d === 90 ? "półtorej godziny" : `${d / 60} godziny`, <Clock minutes={d} />, (e) => answer(step, { duration: d }, e));
              })}
            </div>
          </div>
        );
      case "slot":
        return (
          <div className="kc-row kc-row--bot kc-row--wide" data-w={key}>
            <div className="kc-b kc-b--bot kc-b--card">
              <Calendar
                duration={a.duration || 60}
                days={rules.horizon_days || 28}
                selected={a.slot}
                reload={reload}
                onPick={(slot) => answer("slot", { slot })}
                onFallback={() => answer("path", { path: "ask" })}
              />
            </div>
          </div>
        );
      case "details":
        return (
          <div className="kc-row kc-row--me kc-row--wide" data-w={key}>
            <div className="kc-b kc-b--form">
              <DetailsForm kind={a.path === "book" ? "book" : "ask"} value={details} onChange={(p) => setDetails((o) => ({ ...o, ...p }))} onSubmit={submit} onBusy={setSending} />
            </div>
          </div>
        );
    }
  };

  const resultView = () => {
    if (!result) return null;
    if (result.kind === "book") {
      return (
        <div className="kc-row kc-row--bot kc-row--wide" data-w="result">
          <div className="kc-ticket">
            <Ticket
              print
              data={{
                id: result.id, token: result.token, status: result.status, starts_at: result.starts_at, ends_at: result.ends_at,
                duration_minutes: result.duration, student_name: result.name, subject: a.subjects ? subjectsText(a.subjects) : null,
                level: a.level ? levelText(a.level) : null, mode: modeTicket(a.mode), price_grosze: result.price,
              }}
              actions={
                <>
                  <a className="is-main" href={`/rezerwacja/${encodeURIComponent(result.token)}`}>
                    Zarządzaj rezerwacją
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                  </a>
                  <a href={publicApi.icsUrl(result.token)} download>
                    <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4M12 13v5M9.5 15.5h5" /></svg>
                    Dodaj do kalendarza
                  </a>
                </>
              }
            />
            <p className="kc-ticket__fine">Link do biletu wysłałem też na {result.email}. Płatność ustalamy bezpośrednio — rezerwacja niczego nie pobiera.</p>
            <button type="button" className="kc-again" onClick={restart}>Nowa rozmowa</button>
          </div>
        </div>
      );
    }
    return (
      <div className="kc-row kc-row--bot" data-w="result">
        <div className="kc-b kc-b--bot kc-b--done">
          {result.requestId ? <p className="kc-done__id">Numer zgłoszenia: <b>{result.requestId}</b></p> : null}
          <p>Wolisz porozmawiać od razu? Zadzwoń <a href={PHONE_TEL}>{PHONE_DISPLAY}</a> albo napisz na <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">WhatsAppie<span className="sr-only"> (otwiera się w nowej karcie)</span></a>.</p>
          <button type="button" className="kc-again" onClick={restart}>Nowa rozmowa</button>
        </div>
      </div>
    );
  };

  const steps = stepsFor(a);
  const done = steps.filter((s) => isAnswered(a, s, !!result)).length;

  return (
    <>
      <section id="kontakt" ref={root} className="section kc" tabIndex={-1} aria-labelledby="kc-title">
        <div className="wrap kc__grid">
          <div className="kc__side">
            <span className="eyebrow" data-reveal>Kontakt i zapisy</span>
            <h2 className="h-section" id="kc-title" data-reveal>Zapytaj albo <span className="text-sea">zarezerwuj</span></h2>
            <p className="lead" data-reveal>Kilka stuknięć: przedmiot, poziom i forma. Potem wybierasz wolny termin w kalendarzu albo zostawiasz kontakt, a Krzysztof się odezwie.</p>
            <div className="kc__direct" data-reveal>
              <p className="kc__direct-h">Wolisz od razu porozmawiać?</p>
              <Channels variant="section" />
              <a className="kc__phone" href={PHONE_TEL}>
                <small>Zadzwoń</small>
                <span>{PHONE_DISPLAY}</span>
              </a>
            </div>
          </div>

          <div className="kc__chat" id="rezerwacja">
            <div className="kc__window" ref={winRef}>
              <header className="kc__head">
                <Avatar size={46} typing={typing} />
                <div className="kc__who">
                  <b>Krzysztof</b>
                  <span className={`kc__status ${typing ? "is-typing" : ""}`}>
                    <span className="kc__status-a">korepetycje · matematyka i chemia</span>
                    <span className="kc__status-b" aria-hidden="true">pisze<i>.</i><i>.</i><i>.</i></span>
                  </span>
                </div>
                <div className="kc__tools">
                  <span className="kc__progress" aria-hidden="true">
                    {steps.map((s, i) => <i key={s} className={i < done ? "is-on" : ""} style={{ "--k": i } as React.CSSProperties} />)}
                  </span>
                  <span className="sr-only">Krok {Math.min(done + 1, steps.length)} z {steps.length}</span>
                  {done > 0 || result ? (
                    <button type="button" className={`kc__restart ${restartArm ? "is-armed" : ""}`} onClick={restart} aria-label={restartArm ? "Na pewno zacząć od nowa? Stuknij ponownie" : "Zacznij rozmowę od nowa"}>
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v5h5" /></svg>
                      <span aria-hidden="true">{restartArm ? "Na pewno?" : ""}</span>
                    </button>
                  ) : null}
                </div>
              </header>

              <div className="kc__log" ref={logRef} role="log" aria-live="off" aria-label="Rozmowa z Krzysztofem">
                {shown.map((it, idx) => {
                  if (it.t === "bot") {
                    const tail = shown[idx + 1]?.t !== "bot" && !(idx === shown.length - 1 && pending);
                    return (
                      <div key={it.key} className={`kc-row kc-row--bot ${tail ? "is-tail" : ""}`}>
                        {tail ? <Avatar size={30} className="kc-row__av" /> : <span className="kc-row__av kc-row__av--gap" />}
                        <p className="kc-b kc-b--bot">{it.text}</p>
                      </div>
                    );
                  }
                  if (it.t === "me") {
                    return (
                      <div key={it.key} className="kc-row kc-row--me">
                        {it.editable ? (
                          <button type="button" className="kc-b kc-b--me" data-flip={it.key} onClick={() => edit(it.step)} aria-label={`${it.text}. Zmień tę odpowiedź`}>
                            {it.text}
                            <span className="kc-b__edit"><Pencil /></span>
                          </button>
                        ) : (
                          <p className="kc-b kc-b--me" data-flip={it.key}>{it.text}</p>
                        )}
                      </div>
                    );
                  }
                  if (it.t === "note") return <p key={it.key} className="kc-note" role="status">{it.text}</p>;
                  if (it.t === "widget") return <React.Fragment key={it.key}>{widget(it.step, it.key)}</React.Fragment>;
                  return <React.Fragment key={it.key}>{resultView()}</React.Fragment>;
                })}
                {typing ? (
                  <div className="kc-row kc-row--bot is-tail kc-row--typing" aria-hidden="true">
                    <Avatar size={30} className="kc-row__av" />
                    <span className="kc-b kc-b--bot kc-typing"><i /><i /><i /></span>
                  </div>
                ) : null}
              </div>
              <p className="sr-only" aria-live="polite" role="status">{announce}</p>
              {editing && openStep ? <p className="kc__editing" role="status">Zmieniasz odpowiedź — reszta rozmowy wróci po wyborze.</p> : null}
            </div>

            {/* Bez JavaScriptu czat nie działa — zostaje jasna alternatywa (kanały obok to zwykłe linki). */}
            <div className="kc__nojs">
              <p><b>Czat potrzebuje JavaScriptu.</b> Zadzwoń <a href={PHONE_TEL}>{PHONE_DISPLAY}</a> albo napisz na <a href={WHATSAPP_URL}>WhatsAppie</a>, Messengerze lub Instagramie — linki są obok.</p>
            </div>
          </div>
        </div>
      </section>
      <MobileCta />
    </>
  );
}

const PHONE_FMT = (p: string) => {
  const m = /^\+48(\d{3})(\d{3})(\d{3})$/.exec(p);
  return m ? `${m[1]} ${m[2]} ${m[3]}` : p;
};
