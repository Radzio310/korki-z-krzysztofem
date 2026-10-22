"use client";

import React from "react";
import type { BookingRules } from "@/lib/types";
import { warsawDay } from "@/lib/time";
import { Field, SaveBar, Toggle, usePanel, usePanelApi, useLoad, useSettingsDoc } from "../ui";

type Rule = { weekday: number; start: string; end: string };
type Off = { starts_on: string; ends_on: string; note: string | null };
type Avail = { rules: (Rule & { id?: number })[]; time_off: (Off & { id?: number })[] };

const DAYS = ["Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota", "Niedziela"];
const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + (m || 0); };

function Availability() {
  const call = usePanelApi();
  const { toast } = usePanel();
  const { data, reload } = useLoad<Avail>("/korki/panel/availability");
  const [rules, setRules] = React.useState<Rule[]>([]);
  const [off, setOff] = React.useState<Off[]>([]);
  const [busy, setBusy] = React.useState(false);

  const strip = React.useCallback((d: Avail) => {
    setRules(d.rules.map(({ weekday, start, end }) => ({ weekday, start, end })));
    setOff(d.time_off.map(({ starts_on, ends_on, note }) => ({ starts_on, ends_on, note: note || null })));
  }, []);
  React.useEffect(() => { if (data) strip(data); }, [data, strip]);

  const original = data ? JSON.stringify({ r: data.rules.map(({ weekday, start, end }) => ({ weekday, start, end })), o: data.time_off.map(({ starts_on, ends_on, note }) => ({ starts_on, ends_on, note: note || null })) }) : "";
  const dirty = !!data && JSON.stringify({ r: rules, o: off }) !== original;
  const invalid = rules.find((r) => toMin(r.end) <= toMin(r.start));

  const save = async () => {
    if (invalid) return toast(`${DAYS[invalid.weekday]}: koniec musi być po początku.`, "err");
    setBusy(true);
    try {
      await call("/korki/panel/availability", { method: "PUT", body: { rules, time_off: off } });
      toast("Dostępność zapisana — kalendarz na stronie już ją pokazuje.");
      reload();
    } catch { /* tost pokazał błąd */ } finally {
      setBusy(false);
    }
  };

  const add = (weekday: number) => {
    const same = rules.filter((r) => r.weekday === weekday).sort((a, b) => toMin(a.end) - toMin(b.end));
    const last = same[same.length - 1];
    const start = last ? last.end : "16:00";
    const endMin = Math.min(23 * 60 + 45, toMin(start) + 120);
    const end = `${String(Math.floor(endMin / 60)).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}`;
    setRules([...rules, { weekday, start, end }]);
  };
  const copyToWeekdays = (weekday: number) => {
    const src = rules.filter((r) => r.weekday === weekday);
    const rest = rules.filter((r) => r.weekday > 4 || r.weekday === weekday);
    const copies = [0, 1, 2, 3, 4].filter((d) => d !== weekday).flatMap((d) => src.map((r) => ({ ...r, weekday: d })));
    setRules([...rest, ...copies]);
    toast("Skopiowane na dni robocze — pamiętaj o zapisie.");
  };

  if (!data) return <div className="pn-card pn-pad is-skel" style={{ height: 320 }} />;

  return (
    <section className="pn-card">
      <header className="pn-card__head"><h2>Godziny w tygodniu</h2><span className="muted">Czas warszawski. Kalendarz na stronie tnie te okna na terminy.</span></header>
      <div className="pn-week">
        {DAYS.map((d, wd) => {
          const list = rules.map((r, i) => ({ r, i })).filter((x) => x.r.weekday === wd);
          return (
            <div key={d} className={`pn-day ${list.length ? "is-on" : ""}`}>
              <div className="pn-day__name">
                <b>{d}</b>
                {list.length ? <button type="button" className="pn-link" onClick={() => copyToWeekdays(wd)}>kopiuj na pon–pt</button> : <small className="muted">wolne</small>}
              </div>
              <div className="pn-day__ranges">
                {list.map(({ r, i }) => (
                  <div key={i} className={`pn-range ${toMin(r.end) <= toMin(r.start) ? "is-bad" : ""}`}>
                    <input className="input" type="time" step={900} value={r.start} onChange={(e) => setRules(rules.map((x, k) => (k === i ? { ...x, start: e.target.value } : x)))} aria-label={`${d} od`} />
                    <span>–</span>
                    <input className="input" type="time" step={900} value={r.end} onChange={(e) => setRules(rules.map((x, k) => (k === i ? { ...x, end: e.target.value } : x)))} aria-label={`${d} do`} />
                    <button type="button" className="pn-x" onClick={() => setRules(rules.filter((_, k) => k !== i))} aria-label="Usuń okno">×</button>
                  </div>
                ))}
                <button type="button" className="pn-add" onClick={() => add(wd)}>+ okno</button>
              </div>
            </div>
          );
        })}
      </div>

      <header className="pn-card__head"><h2>Wolne i urlopy</h2></header>
      <div className="pn-offs">
        {off.map((o, i) => (
          <div key={i} className="pn-off">
            <Field label="Od"><input className="input" type="date" value={o.starts_on} onChange={(e) => setOff(off.map((x, k) => (k === i ? { ...x, starts_on: e.target.value } : x)))} /></Field>
            <Field label="Do"><input className="input" type="date" value={o.ends_on} min={o.starts_on} onChange={(e) => setOff(off.map((x, k) => (k === i ? { ...x, ends_on: e.target.value } : x)))} /></Field>
            <Field label="Notatka (tylko dla Ciebie)"><input className="input" value={o.note || ""} onChange={(e) => setOff(off.map((x, k) => (k === i ? { ...x, note: e.target.value || null } : x)))} maxLength={200} /></Field>
            <button type="button" className="pn-x" onClick={() => setOff(off.filter((_, k) => k !== i))} aria-label="Usuń wolne">×</button>
          </div>
        ))}
        <button type="button" className="pn-add" onClick={() => { const t = warsawDay(); setOff([...off, { starts_on: t, ends_on: t, note: null }]); }}>+ dodaj wolne</button>
      </div>
      <SaveBar dirty={dirty} busy={busy} onSave={save} onReset={() => data && strip(data)} />
    </section>
  );
}

function Rules() {
  const { draft, setDraft, dirty, busy, save, reset } = useSettingsDoc<BookingRules>("booking");
  if (!draft) return <div className="pn-card is-skel" style={{ height: 240 }} />;
  const set = <K extends keyof BookingRules>(k: K, v: BookingRules[K]) => setDraft({ ...draft, [k]: v });
  const num = (k: keyof BookingRules, min: number, max: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Math.max(min, Math.min(max, Number(e.target.value) || 0));
    set(k, v as never);
  };
  return (
    <section className="pn-card">
      <header className="pn-card__head"><h2>Zasady rezerwacji</h2></header>
      <div className="pn-pad pn-form">
        <Toggle on={draft.enabled} onChange={(v) => set("enabled", v)} label="Rezerwacje online włączone" hint="Wyłączone — na stronie zamiast kalendarza pojawi się prośba o wiadomość." />
        <Toggle on={draft.auto_confirm} onChange={(v) => set("auto_confirm", v)} label="Potwierdzaj automatycznie" hint="Włączone — termin jest od razu potwierdzony. Wyłączone — potwierdzasz w zakładce Rezerwacje." />
        <div className="pn-grid3">
          <Field label="Minimalne wyprzedzenie (godz.)" hint="Najwcześniejszy termin od teraz."><input className="input" type="number" min={0} max={336} value={draft.min_notice_hours} onChange={num("min_notice_hours", 0, 336)} /></Field>
          <Field label="Horyzont (dni)" hint="Jak daleko w przód widać terminy."><input className="input" type="number" min={1} max={180} value={draft.horizon_days} onChange={num("horizon_days", 1, 180)} /></Field>
          <Field label="Przerwa między lekcjami (min)"><input className="input" type="number" min={0} max={120} step={5} value={draft.buffer_minutes} onChange={num("buffer_minutes", 0, 120)} /></Field>
          <Field label="Krok siatki terminów (min)" hint="Co ile minut zaczyna się możliwy termin.">
            <div className="pn-seg">
              {[15, 30, 60].map((s) => <button key={s} type="button" className="chip" aria-pressed={draft.slot_step_minutes === s} onClick={() => set("slot_step_minutes", s)}>{s}</button>)}
            </div>
          </Field>
        </div>
      </div>
      <SaveBar dirty={dirty} busy={busy} onSave={save} onReset={reset} />
    </section>
  );
}

export default function Calendar() {
  return (
    <div className="pn-stack">
      <Availability />
      <Rules />
    </div>
  );
}
