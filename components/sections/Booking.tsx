"use client";

import React from "react";
import Mascot from "../Mascot";
import type { Booking as BookingT, BookingRules, Offer, Slots } from "@/lib/types";
import { ApiError, publicApi } from "@/lib/api";
import { lessonPrice, zl } from "@/lib/pricing";
import { addDays, dayToDate, fmtDate, fmtDayShort, fmtLong, fmtTime, partOfDay, warsawDay } from "@/lib/time";
import { ripple, scrollToTarget, useHandoff, useReveal } from "@/lib/motion";
import "./booking.css";

const WINDOW = 14;
const MODES: Record<string, string> = { online: "Online", stationary: "Stacjonarnie" };
const PARTS = ["rano", "popołudnie", "wieczór"] as const;

type Step = 0 | 1 | 2 | 3;

function uuid() {
  try { return crypto.randomUUID(); } catch { return `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
}

export default function Booking({ offer, rules }: { offer: Offer; rules: BookingRules }) {
  const root = useReveal<HTMLElement>();
  const levels = offer.levels.filter((l) => l.active);
  const durations = offer.durations.length ? offer.durations : [60];
  const modes = offer.modes.length ? offer.modes : ["online"];

  const [step, setStep] = React.useState<Step>(0);
  const [levelKey, setLevelKey] = React.useState<string | undefined>(levels[0]?.key);
  const [subjectKey, setSubjectKey] = React.useState<string | undefined>(offer.subjects[0]?.key);
  const [duration, setDuration] = React.useState(durations.includes(60) ? 60 : durations[0]);
  const [mode, setMode] = React.useState(modes[0]);
  const [weekly, setWeekly] = React.useState(1);

  const [from, setFrom] = React.useState(() => warsawDay());
  const [slots, setSlots] = React.useState<Slots | null>(null);
  const [reload, setReload] = React.useState(0);
  const [slotsErr, setSlotsErr] = React.useState<string | null>(null);
  const [day, setDay] = React.useState<string | null>(null);
  const [slot, setSlot] = React.useState<string | null>(null);

  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState<(BookingT & { token: string }) | null>(null);
  const clientId = React.useRef<string>("");
  const [flash, setFlash] = React.useState(false);

  useHandoff((h) => {
    if (h.level_key && levels.some((l) => l.key === h.level_key)) setLevelKey(h.level_key);
    if (h.duration && durations.includes(h.duration)) setDuration(h.duration);
    if (h.weekly) setWeekly(h.weekly);
    if (h.source === "pricing") {
      setStep((s) => (s === 3 ? s : 1));
      setFlash(true);
      window.setTimeout(() => setFlash(false), 1400);
    }
  });

  const today = warsawDay();
  const horizonEnd = addDays(today, Math.max(1, rules.horizon_days));

  /* Terminy dociągamy przy wejściu w krok 2 i przy zmianie okna / długości. */
  React.useEffect(() => {
    if (step !== 1) return;
    const ctrl = new AbortController();
    setSlots(null);
    setSlotsErr(null);
    publicApi.slots(duration, from, WINDOW, ctrl.signal)
      .then((s) => {
        setSlots(s);
        const first = s.days.find((d) => d.slots.length);
        setDay((cur) => (cur && s.days.some((d) => d.date === cur && d.slots.length) ? cur : first?.date ?? null));
      })
      .catch((e) => { if ((e as Error).name !== "AbortError") setSlotsErr((e as Error).message); });
    return () => ctrl.abort();
  }, [step, duration, from, reload]);

  React.useEffect(() => { setSlot(null); }, [duration, from]);

  const level = levels.find((l) => l.key === levelKey);
  const price = lessonPrice(level, duration);
  const daySlots = slots?.days.find((d) => d.date === day)?.slots || [];
  const totalFree = slots?.days.reduce((n, d) => n + d.slots.length, 0) ?? 0;

  const go = (s: Step) => {
    setError(null);
    setStep(s);
    const el = root.current?.querySelector<HTMLElement>(".bk__card");
    if (el && el.getBoundingClientRect().top < 0) scrollToTarget(el, -100);
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!slot) return go(1);
    const f = new FormData(e.currentTarget);
    if (!f.get("consent")) return setError("Zaznacz zgodę na przetwarzanie danych — bez niej nie mogę przyjąć rezerwacji.");
    if (!clientId.current) clientId.current = uuid();
    setBusy(true);
    setError(null);
    try {
      const b = await publicApi.book({
        client_id: clientId.current,
        starts_at: slot,
        duration_minutes: duration,
        level_key: levelKey ?? null,
        subject_key: subjectKey ?? null,
        mode,
        weekly_lessons: weekly,
        student_name: String(f.get("student_name") || "").trim(),
        email: String(f.get("email") || "").trim(),
        phone: String(f.get("phone") || "").trim() || null,
        message: String(f.get("message") || "").trim() || null,
        consent: true,
        website: String(f.get("website") || ""),
      });
      setDone(b);
      clientId.current = "";
      setStep(3);
    } catch (err) {
      const ae = err as ApiError;
      if (ae.status === 409) {
        setSlot(null);
        setStep(1);
        setReload((n) => n + 1);
        clientId.current = "";
      }
      setError(ae.message);
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setDone(null);
    setSlot(null);
    setStep(0);
  };

  if (!rules.enabled) {
    return (
      <section id="rezerwacja" ref={root} className="section booking">
        <div className="wrap">
          <div className="bk__off card">
            <Mascot mood="think" size={120} say="Kalendarz jest teraz zamknięty — napisz, a umówimy się ręcznie." side="left" />
            <button type="button" className="btn btn--primary" onClick={() => scrollToTarget("#kontakt")}>Napisz wiadomość</button>
          </div>
        </div>
      </section>
    );
  }

  const stepsLabels = ["Lekcja", "Termin", "Dane"];
  const days = slots?.days || [];
  const canPrev = from > today;
  const canNext = addDays(from, WINDOW) < horizonEnd;

  return (
    <section id="rezerwacja" ref={root} className="section booking">
      <div className="wrap">
        <div className="booking__head">
          <span className="eyebrow" data-reveal>Rezerwacja</span>
          <h2 className="h-section" data-reveal>Zarezerwuj <span className="text-sea">swój termin</span></h2>
          <p className="lead" data-reveal>Trzy kroki i gotowe. {rules.auto_confirm ? "Termin potwierdza się od razu," : "Krzysztof potwierdzi termin,"} a na maila przyjdzie potwierdzenie i przypomnienie dzień wcześniej.</p>
        </div>

        <div className={`bk ${flash ? "is-flash" : ""}`} data-reveal>
          <div className="bk__card card">
            {step < 3 ? (
              <ol className="bk__progress" style={{ "--s": step } as React.CSSProperties}>
                {stepsLabels.map((l, i) => (
                  <li key={l} className={i < step ? "is-done" : i === step ? "is-now" : ""}>
                    <button type="button" onClick={() => i < step && go(i as Step)} disabled={i >= step}>
                      <span>{i < step ? "✓" : i + 1}</span>{l}
                    </button>
                  </li>
                ))}
                <span className="bk__progress-bar" aria-hidden="true" />
              </ol>
            ) : null}

            <div className="bk__steps" data-step={step}>
              {/* ── krok 1 ─────────────────────────────────────────── */}
              <div className="bk__step" aria-hidden={step !== 0} inert={step !== 0}>
                {levels.length ? (
                  <fieldset className="bk__group">
                    <legend>Poziom</legend>
                    <div className="bk__chips" role="radiogroup">
                      {levels.map((l) => (
                        <button key={l.key} type="button" role="radio" aria-checked={l.key === levelKey} className="chip" onClick={() => setLevelKey(l.key)}>{l.name}</button>
                      ))}
                    </div>
                  </fieldset>
                ) : null}
                {offer.subjects.length > 1 ? (
                  <fieldset className="bk__group">
                    <legend>Przedmiot</legend>
                    <div className="bk__chips" role="radiogroup">
                      {offer.subjects.map((s) => (
                        <button key={s.key} type="button" role="radio" aria-checked={s.key === subjectKey} className="chip" onClick={() => setSubjectKey(s.key)}>{s.name}</button>
                      ))}
                    </div>
                  </fieldset>
                ) : null}
                <fieldset className="bk__group">
                  <legend>Długość lekcji</legend>
                  <div className="bk__chips" role="radiogroup">
                    {durations.map((d) => (
                      <button key={d} type="button" role="radio" aria-checked={d === duration} className="chip" onClick={() => setDuration(d)}>
                        {d} min{lessonPrice(level, d) != null ? <small className="bk__chipprice">{zl(lessonPrice(level, d)!)}</small> : null}
                      </button>
                    ))}
                  </div>
                </fieldset>
                {modes.length > 1 ? (
                  <fieldset className="bk__group">
                    <legend>Forma</legend>
                    <div className="bk__chips" role="radiogroup">
                      {modes.map((m) => (
                        <button key={m} type="button" role="radio" aria-checked={m === mode} className="chip" onClick={() => setMode(m)}>
                          {m === "online" ? "💻 " : "📍 "}{MODES[m] || m}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                ) : null}
                <fieldset className="bk__group">
                  <legend>Ile spotkań w tygodniu planujesz?</legend>
                  <div className="bk__chips" role="radiogroup">
                    {[1, 2, 3, 4].map((n) => (
                      <button key={n} type="button" role="radio" aria-checked={weekly === n} className="chip" onClick={() => setWeekly(n)}>{n === 4 ? "4+" : n}</button>
                    ))}
                  </div>
                </fieldset>
                <div className="bk__foot">
                  <button type="button" className="btn btn--primary" onClick={() => go(1)} onPointerDown={ripple}>Wybierz termin →</button>
                </div>
              </div>

              {/* ── krok 2 ─────────────────────────────────────────── */}
              <div className="bk__step" aria-hidden={step !== 1} inert={step !== 1}>
                <div className="bk__cal-head">
                  <button type="button" className="bk__arrow" onClick={() => setFrom(addDays(from, -WINDOW) < today ? today : addDays(from, -WINDOW))} disabled={!canPrev} aria-label="Wcześniejsze dni">←</button>
                  <span className="bk__range">{fmtDate(dayToDate(from))} – {fmtDate(dayToDate(addDays(from, WINDOW - 1)))}</span>
                  <button type="button" className="bk__arrow" onClick={() => setFrom(addDays(from, WINDOW))} disabled={!canNext} aria-label="Późniejsze dni">→</button>
                </div>

                {slotsErr ? (
                  <div className="bk__empty">
                    <p className="form-error">{slotsErr}</p>
                    <button type="button" className="btn" onClick={() => setReload((n) => n + 1)}>Spróbuj ponownie</button>
                  </div>
                ) : !slots ? (
                  <div className="bk__days bk__days--skeleton" aria-busy="true">
                    {Array.from({ length: 7 }).map((_, i) => <span key={i} />)}
                  </div>
                ) : (
                  <>
                    <div className="bk__days" role="listbox" aria-label="Dzień">
                      {days.map((d) => {
                        const dt = dayToDate(d.date);
                        const n = d.slots.length;
                        return (
                          <button
                            key={d.date}
                            type="button"
                            role="option"
                            aria-selected={day === d.date}
                            className={`bk__day ${n ? "" : "is-off"}`}
                            disabled={!n}
                            onClick={() => { setDay(d.date); setSlot(null); }}
                          >
                            <small>{fmtDayShort(dt)}</small>
                            <b>{dt.getUTCDate()}</b>
                            <i className="bk__dots" aria-label={`${n} wolnych`}>{Array.from({ length: Math.min(4, n) }).map((_, k) => <em key={k} />)}</i>
                          </button>
                        );
                      })}
                    </div>

                    {totalFree === 0 ? (
                      <div className="bk__empty">
                        <Mascot mood="sad" size={96} say="W tych dniach wszystko zajęte — zerknij dalej albo napisz." side="left" />
                        <div className="bk__row">
                          {canNext ? <button type="button" className="btn" onClick={() => setFrom(addDays(from, WINDOW))}>Następne dni →</button> : null}
                          <button type="button" className="btn btn--ghost" onClick={() => scrollToTarget("#kontakt")}>Napisz wiadomość</button>
                        </div>
                      </div>
                    ) : day ? (
                      <div className="bk__slots" key={day}>
                        <p className="bk__dayname">{fmtLong(`${day}T12:00:00Z`)}</p>
                        {PARTS.map((p) => {
                          const list = daySlots.filter((s) => partOfDay(s) === p);
                          if (!list.length) return null;
                          return (
                            <div key={p} className="bk__part">
                              <span>{p}</span>
                              <div className="bk__times">
                                {list.map((s, i) => (
                                  <button key={s} type="button" className={`bk__time ${slot === s ? "is-sel" : ""}`} style={{ "--k": i } as React.CSSProperties} onClick={() => setSlot(s)} aria-pressed={slot === s}>
                                    {fmtTime(s)}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </>
                )}
                {error && step === 1 ? <p className="form-error" role="alert">{error}</p> : null}
                <div className="bk__foot">
                  <button type="button" className="btn btn--ghost" onClick={() => go(0)}>← Wstecz</button>
                  <button type="button" className="btn btn--primary" disabled={!slot} onClick={() => go(2)} onPointerDown={ripple}>Dalej →</button>
                </div>
              </div>

              {/* ── krok 3 ─────────────────────────────────────────── */}
              <div className="bk__step" aria-hidden={step !== 2} inert={step !== 2}>
                <form className="bk__form" onSubmit={submit} noValidate={false}>
                  <div className="bk__grid2">
                    <label className="field"><span>Imię i nazwisko ucznia</span><input className="input" name="student_name" required minLength={2} maxLength={80} autoComplete="name" /></label>
                    <label className="field"><span>E-mail</span><input className="input" name="email" type="email" required maxLength={120} autoComplete="email" /></label>
                    <label className="field"><span>Telefon (opcjonalnie)</span><input className="input" name="phone" type="tel" maxLength={30} autoComplete="tel" /></label>
                    <label className="field bk__full"><span>Z czym potrzebujesz pomocy? (opcjonalnie)</span><textarea className="input" name="message" maxLength={1500} placeholder="np. funkcje kwadratowe, sprawdzian za 2 tygodnie" /></label>
                  </div>
                  <input className="hp" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
                  <label className="check">
                    <input type="checkbox" name="consent" value="1" />
                    <span className="box"><svg viewBox="0 0 24 24"><path d="M5 12l5 5 9-11" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
                    <span>Zgadzam się na przetwarzanie moich danych w celu umówienia i obsługi lekcji. Szczegóły w <a href="/polityka-prywatnosci" target="_blank">polityce prywatności</a>.</span>
                  </label>
                  {error && step === 2 ? <p className="form-error" role="alert">{error}</p> : null}
                  <div className="bk__foot">
                    <button type="button" className="btn btn--ghost" onClick={() => go(1)}>← Termin</button>
                    <button type="submit" className="btn btn--primary" disabled={busy} onPointerDown={ripple}>
                      {busy ? <i className="spinner" /> : "Zarezerwuj"}
                    </button>
                  </div>
                </form>
              </div>

              {/* ── sukces ─────────────────────────────────────────── */}
              <div className="bk__step bk__done" aria-hidden={step !== 3} inert={step !== 3}>
                {done ? (
                  <>
                    <Mascot mood="happy" size={130} side="left" say={done.status === "confirmed" ? "Termin potwierdzony — do zobaczenia!" : "Mam Twoją prośbę — potwierdzenie przyjdzie mailem."} />
                    <div className="bk__ticket">
                      <div className="bk__ticket-top">
                        <span className={`bk__status bk__status--${done.status}`}>{done.status === "confirmed" ? "Potwierdzona" : "Czeka na potwierdzenie"}</span>
                        <h3 className="h-card">{fmtLong(done.starts_at)}</h3>
                        <p className="bk__ticket-time">{fmtTime(done.starts_at)} · {done.duration_minutes} min · {MODES[mode] || mode}</p>
                      </div>
                      <div className="bk__ticket-cut" aria-hidden="true" />
                      <div className="bk__ticket-bot">
                        <a className="btn btn--sm" href={publicApi.icsUrl(done.token)}>📅 Dodaj do kalendarza</a>
                        <a className="btn btn--sm btn--ghost" href={`/rezerwacja/${done.token}`}>Zarządzaj rezerwacją</a>
                      </div>
                    </div>
                    <p className="muted">Szczegóły i link do zmiany wysłałem na {done.email}.</p>
                    <button type="button" className="bk__again" onClick={reset}>Zarezerwuj kolejną lekcję</button>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          {/* podsumowanie, które idzie za Tobą przez kroki */}
          {step < 3 ? (
            <aside className="bk__sum card" aria-live="polite">
              <span className="bk__sum-label">Twoja lekcja</span>
              <dl>
                <div><dt>Poziom</dt><dd>{level?.name || "—"}</dd></div>
                {offer.subjects.length ? <div><dt>Przedmiot</dt><dd>{offer.subjects.find((s) => s.key === subjectKey)?.name || "—"}</dd></div> : null}
                <div><dt>Długość</dt><dd>{duration} min</dd></div>
                <div><dt>Forma</dt><dd>{MODES[mode] || mode}</dd></div>
                <div className={slot ? "is-set" : ""}><dt>Termin</dt><dd>{slot ? <>{fmtLong(slot)}, {fmtTime(slot)}</> : "wybierz w kroku 2"}</dd></div>
              </dl>
              {price != null ? (
                <div className="bk__sum-price"><span>Cena lekcji</span><strong>{zl(price)}</strong></div>
              ) : null}
              <p className="bk__sum-fine muted">Płatność ustalamy bezpośrednio — rezerwacja niczego nie pobiera.</p>
            </aside>
          ) : null}
        </div>
      </div>
    </section>
  );
}
