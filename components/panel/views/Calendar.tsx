"use client";

import React from "react";
import type { Booking, BookingRules, List } from "@/lib/types";
import { addDays, dayToDate, fmtTime, warsawDay } from "@/lib/time";
import { Toggle, usePanelApi } from "../ui";
import { Blank, Ink, LoadError, SaveLine, Skel, SureButton, useAutosave, useMedia } from "./kit";
import "./calendar.css";

/* Dostępność: tydzień malowany przeciąganiem (myszą od razu, palcem po krótkim przytrzymaniu —
   zwykłe przesunięcie palcem dalej przewija), wolne i urlopy na miesiącu, na wierzchu zajęte lekcje.
   Zapis = PUT /korki/panel/availability (serwer i tak scala stykające się okna). */

type Rule = { weekday: number; start: string; end: string };
type Off = { starts_on: string; ends_on: string; note: string | null };
type Avail = { rules: Rule[]; time_off: Off[] };

const DAYS = ["Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota", "Niedziela"];
const DSHORT = ["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"];
const DLOW = ["pon", "wt", "śr", "czw", "pt", "sob", "nd"];
const MONTH = ["styczeń", "luty", "marzec", "kwiecień", "maj", "czerwiec", "lipiec", "sierpień", "wrzesień", "październik", "listopad", "grudzień"];
const MONTH_GEN = ["stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca", "lipca", "sierpnia", "września", "października", "listopada", "grudnia"];
const DAY_MIN = 1440;
const GRID_MAX = 23 * 60 + 30;

const pad = (n: number) => String(n).padStart(2, "0");
const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + (m || 0); };
const fmt = (m: number) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
const hrs = (min: number) => { const h = min / 60; return Number.isInteger(h) ? `${h} h` : `${h.toFixed(1).replace(".", ",")} h`; };

function toMasks(rules: Rule[]) {
  const m = Array.from({ length: 7 }, () => new Uint8Array(DAY_MIN));
  for (const r of rules) {
    const a = Math.max(0, toMin(r.start));
    const b = Math.min(DAY_MIN, toMin(r.end));
    if (r.weekday >= 0 && r.weekday < 7) m[r.weekday].fill(1, a, b);
  }
  return m;
}
function toRules(m: Uint8Array[]): Rule[] {
  const out: Rule[] = [];
  m.forEach((day, d) => {
    let t = 0;
    while (t < DAY_MIN) {
      if (!day[t]) { t++; continue; }
      const s = t;
      while (t < DAY_MIN && day[t]) t++;
      out.push({ weekday: d, start: fmt(s), end: fmt(Math.min(t, DAY_MIN - 1)) });
    }
  });
  return out;
}
const canon = (a: Avail): Avail => ({
  rules: toRules(toMasks(a.rules)),
  time_off: a.time_off
    .map(({ starts_on, ends_on, note }) => ({ starts_on, ends_on, note: note || null }))
    .sort((x, y) => x.starts_on.localeCompare(y.starts_on) || x.ends_on.localeCompare(y.ends_on)),
});

const wdOf = (day: string) => (dayToDate(day).getUTCDay() + 6) % 7;
const mondayOf = (day: string) => addDays(day, -wdOf(day));
const dNum = (day: string) => Number(day.slice(8, 10));
const mIdx = (day: string) => Number(day.slice(5, 7)) - 1;
const isOff = (offs: Off[], day: string) => offs.some((o) => o.starts_on <= day && day <= o.ends_on);
const span = (a: string, b: string) => Math.round((dayToDate(b).getTime() - dayToDate(a).getTime()) / 864e5) + 1;
function rangeLabel(a: string, b: string) {
  if (a === b) return `${dNum(a)} ${MONTH_GEN[mIdx(a)]}`;
  if (a.slice(0, 7) === b.slice(0, 7)) return `${dNum(a)}–${dNum(b)} ${MONTH_GEN[mIdx(b)]}`;
  return `${dNum(a)} ${MONTH_GEN[mIdx(a)]} – ${dNum(b)} ${MONTH_GEN[mIdx(b)]}`;
}
const daysWord = (n: number) => (n === 1 ? "dzień" : "dni");

/* lekcje (zajęte) z panelu */
type Lesson = { id: number; day: string; start: number; end: number; name: string; pending: boolean };
function useLessons(from: string, to: string) {
  const call = usePanelApi();
  const [rows, setRows] = React.useState<Lesson[]>([]);
  React.useEffect(() => {
    let alive = true;
    call<List<Booking>>(`/korki/panel/bookings?status=pending,confirmed&from=${from}&to=${to}&order=asc&limit=200`, { quiet: true })
      .then((d) => {
        if (!alive) return;
        setRows(d.rows.map((b) => {
          const day = warsawDay(new Date(b.starts_at));
          const start = toMin(fmtTime(b.starts_at));
          return { id: b.id, day, start, end: Math.min(DAY_MIN, start + b.duration_minutes), name: b.student_name, pending: b.status === "pending" };
        }));
      })
      .catch(() => { if (alive) setRows([]); });
    return () => { alive = false; };
  }, [call, from, to]);
  return rows;
}

function useNow() {
  const [now, setNow] = React.useState<{ day: string; min: number } | null>(null);
  React.useEffect(() => {
    const tick = () => { const d = new Date(); setNow({ day: warsawDay(d), min: toMin(fmtTime(d.toISOString())) }); };
    tick();
    const t = window.setInterval(tick, 60_000);
    return () => window.clearInterval(t);
  }, []);
  return now;
}

/* ── malowanie tygodnia ────────────────────────────────────────────────────── */

type Cell = { d: number; s: number };

function WeekPainter({ rules, offs, onRules, weekStart, step, range, lessons, now }: {
  rules: Rule[]; offs: Off[]; onRules: (r: Rule[]) => void; weekStart: string; step: number; range: [number, number]; lessons: Lesson[]; now: { day: string; min: number } | null;
}) {
  const masks = React.useMemo(() => toMasks(rules), [rules]);
  const [live, setLive] = React.useState<Uint8Array[] | null>(null);
  const [cursor, setCursor] = React.useState<Cell>({ d: 0, s: 0 });
  const view = live || masks;
  const [g0, g1] = range;
  const rows = Math.round((g1 - g0) / step);
  const total = g1 - g0;
  const root = React.useRef<HTMLDivElement>(null);
  const stroke = React.useRef<{ anchor: Cell; mode: 0 | 1; base: Uint8Array[]; last: string; out: Uint8Array[] } | null>(null);
  const hold = React.useRef<{ id: number; x: number; y: number; cell: Cell; t: number } | null>(null);
  const days = Array.from({ length: 7 }, (_, d) => addDays(weekStart, d));

  const cellState = (m: Uint8Array, s: number) => {
    const a = g0 + s * step;
    let n = 0;
    for (let t = a; t < a + step; t++) n += m[t];
    return n === 0 ? 0 : n === step ? 2 : 1;
  };

  const paint = (to: Cell) => {
    const st = stroke.current;
    if (!st) return;
    const key = `${to.d}:${to.s}`;
    if (key === st.last) return;
    st.last = key;
    const out = st.base.map((m) => m.slice());
    const [d0, d1] = [Math.min(st.anchor.d, to.d), Math.max(st.anchor.d, to.d)];
    const [s0, s1] = [Math.min(st.anchor.s, to.s), Math.max(st.anchor.s, to.s)];
    for (let d = d0; d <= d1; d++) out[d].fill(st.mode, g0 + s0 * step, g0 + (s1 + 1) * step);
    st.out = out;
    setLive(out);
  };
  const begin = (cell: Cell) => {
    const mode: 0 | 1 = cellState(masks[cell.d], cell.s) === 2 ? 0 : 1;
    stroke.current = { anchor: cell, mode, base: masks, last: "", out: masks };
    setCursor(cell);
    paint(cell);
  };
  const end = () => {
    const st = stroke.current;
    stroke.current = null;
    if (!st) return;
    setLive(null);
    onRules(toRules(st.out));
  };

  const locate = (x: number, y: number): Cell | null => {
    const el = (document.elementFromPoint(x, y) as HTMLElement | null)?.closest<HTMLElement>("[data-day]");
    if (!el || !root.current?.contains(el)) return null;
    const r = el.getBoundingClientRect();
    const s = Math.max(0, Math.min(rows - 1, Math.floor(((y - r.top) / r.height) * rows)));
    return { d: Number(el.dataset.day), s };
  };

  /* Palec: przytrzymanie zaczyna malowanie, a wtedy blokujemy przewijanie (touchmove bez passive). */
  React.useEffect(() => {
    const el = root.current;
    if (!el) return;
    const stop = (e: TouchEvent) => { if (stroke.current) e.preventDefault(); };
    el.addEventListener("touchmove", stop, { passive: false });
    return () => el.removeEventListener("touchmove", stop);
  }, []);

  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const cell = locate(e.clientX, e.clientY);
    if (!cell) return;
    const target = e.currentTarget;
    if (e.pointerType === "touch") {
      const id = e.pointerId;
      const t = window.setTimeout(() => {
        if (!hold.current) return;
        hold.current = null;
        try { target.setPointerCapture(id); } catch { /* palec już zszedł */ }
        navigator.vibrate?.(8);
        begin(cell);
      }, 240);
      hold.current = { id, x: e.clientX, y: e.clientY, cell, t };
      return;
    }
    e.preventDefault();
    target.setPointerCapture(e.pointerId);
    begin(cell);
  };
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const h = hold.current;
    if (h && Math.hypot(e.clientX - h.x, e.clientY - h.y) > 8) { window.clearTimeout(h.t); hold.current = null; return; }
    if (!stroke.current) return;
    const cell = locate(e.clientX, e.clientY);
    if (cell) paint(cell);
  };
  const onUp = () => {
    const h = hold.current;
    if (h) { window.clearTimeout(h.t); hold.current = null; begin(h.cell); }
    end();
  };
  const onCancel = () => {
    const h = hold.current;
    if (h) { window.clearTimeout(h.t); hold.current = null; }
    end();
  };

  /* Klawiatura: strzałki chodzą po siatce, spacja przełącza, Shift+strzałka ciągnie stan dalej. */
  const focusCell = (c: Cell) => requestAnimationFrame(() => root.current?.querySelector<HTMLElement>(`[data-cell="${c.d}:${c.s}"]`)?.focus());
  const onKey = (e: React.KeyboardEvent) => {
    const c = cursor;
    const mv: Record<string, Cell> = {
      ArrowUp: { d: c.d, s: Math.max(0, c.s - 1) }, ArrowDown: { d: c.d, s: Math.min(rows - 1, c.s + 1) },
      ArrowLeft: { d: Math.max(0, c.d - 1), s: c.s }, ArrowRight: { d: Math.min(6, c.d + 1), s: c.s },
    };
    if (mv[e.key]) {
      e.preventDefault();
      const n = mv[e.key];
      if (e.shiftKey) {
        const on = cellState(masks[c.d], c.s) === 2 ? 1 : 0;
        const out = masks.map((m) => m.slice());
        out[n.d].fill(on, g0 + n.s * step, g0 + (n.s + 1) * step);
        onRules(toRules(out));
      }
      setCursor(n);
      focusCell(n);
    } else if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      const out = masks.map((m) => m.slice());
      out[c.d].fill(cellState(masks[c.d], c.s) === 2 ? 0 : 1, g0 + c.s * step, g0 + (c.s + 1) * step);
      onRules(toRules(out));
    }
  };

  const hours: number[] = [];
  for (let m = Math.ceil(g0 / 60) * 60; m < g1; m += 60) hours.push(m);
  const runs = toRules(view);

  /* Telefon: dzień po dniu. Pasek 7 dni skacze do kolumny, a przewijanie podświetla dzień w pasku. */
  const scroller = React.useRef<HTMLDivElement>(null);
  const [seen, setSeen] = React.useState(0);
  const colLeft = (d: number) => {
    const el = scroller.current;
    const col = el?.querySelector<HTMLElement>(`[data-day="${d}"]`);
    return el && col ? col.getBoundingClientRect().left - el.getBoundingClientRect().left + el.scrollLeft : 0;
  };
  const jump = (d: number) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTo({ left: colLeft(d), behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };
  React.useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    let raf = 0;
    const on = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const w = el.querySelector<HTMLElement>('[data-day="0"]')?.offsetWidth || 1;
        setSeen(Math.max(0, Math.min(6, Math.round(el.scrollLeft / w))));
      });
    };
    el.addEventListener("scroll", on, { passive: true });
    return () => { el.removeEventListener("scroll", on); cancelAnimationFrame(raf); };
  }, []);
  /* Nowy tydzień: na telefonie startujemy od dziś (w bieżącym tygodniu) albo od poniedziałku. */
  const todayIdx = now ? days.indexOf(now.day) : -1;
  React.useEffect(() => {
    const el = scroller.current;
    if (!el || el.scrollWidth <= el.clientWidth + 4) return;
    el.scrollTo({ left: colLeft(Math.max(0, todayIdx)) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart, todayIdx >= 0]);

  return (
    <>
    <div className="cal-strip" role="group" aria-label="Dzień tygodnia">
      {days.map((day, d) => (
        <button key={day} type="button" className={`${seen === d ? "is-on" : ""} ${now?.day === day ? "is-today" : ""} ${isOff(offs, day) ? "is-off" : ""}`} aria-pressed={seen === d} onClick={() => jump(d)} aria-label={`${DAYS[d]} ${dNum(day)}.${pad(mIdx(day) + 1)}`}>
          <span>{DSHORT[d]}</span><b>{dNum(day)}</b>
        </button>
      ))}
    </div>
    <div className={`cal-frame cal-grid--s${step}`} style={{ "--rows": rows } as React.CSSProperties}>
    {/* Oś godzin stoi poza przewijaniem w poziomie (przyklejenie w komórce siatki nie ma gdzie jechać). */}
    <div className="cal-axiscol" aria-hidden="true">
      <span className="cal-corner" />
      <div className="cal-axis">
        {hours.map((m) => <span key={m} style={{ top: `${((m - g0) / total) * 100}%` }}>{fmt(m)}</span>)}
      </div>
    </div>
    <div className="cal-scroll" ref={scroller}>
      <div className="cal-grid">
        {days.map((day, d) => {
          const mins = runs.filter((r) => r.weekday === d).reduce((a, r) => a + toMin(r.end) - toMin(r.start), 0);
          const off = isOff(offs, day);
          const today = now?.day === day;
          return (
            <div key={day} className={`cal-dh ${today ? "is-today" : ""} ${off ? "is-off" : ""}`}>
              <span className="cal-dh__full">{DLOW[d]} {dNum(day)}.{pad(mIdx(day) + 1)}{today ? " · dziś" : ""}</span>
              <span className="cal-dh__w">{DSHORT[d]}</span>
              <span className="cal-dh__n">{dNum(day)}</span>
              <span className="cal-dh__h">{off ? "wolne" : mins ? hrs(mins) : "—"}</span>
            </div>
          );
        })}


        <div
          ref={root}
          className={`cal-cols ${live ? "is-painting" : ""}`}
          role="group"
          aria-label="Tydzień do malowania: przeciągnij, żeby zaznaczyć godziny; strzałki i spacja z klawiatury"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onCancel}
          onKeyDown={onKey}
          onContextMenu={(e) => e.preventDefault()}
        >
          {days.map((day, d) => {
            const off = isOff(offs, day);
            const dayRuns = runs.filter((r) => r.weekday === d);
            return (
              <div key={day} data-day={d} className={`cal-col ${off ? "is-off" : ""} ${now?.day === day ? "is-today" : ""}`}>
                {Array.from({ length: rows }, (_, s) => {
                  const st = cellState(view[d], s);
                  const a = g0 + s * step;
                  const first = st === 2 && (s === 0 || cellState(view[d], s - 1) !== 2);
                  const last = st === 2 && (s === rows - 1 || cellState(view[d], s + 1) !== 2);
                  const cur = cursor.d === d && cursor.s === s;
                  return (
                    <div
                      key={s}
                      data-cell={`${d}:${s}`}
                      role="button"
                      aria-pressed={st === 2}
                      aria-label={`${DAYS[d]} ${fmt(a)}–${fmt(a + step)}${st === 2 ? ", dostępny" : st === 1 ? ", częściowo" : ""}`}
                      tabIndex={cur ? 0 : -1}
                      onFocus={() => setCursor({ d, s })}
                      className={`cal-c ${a % 60 === 0 ? "is-hour" : ""} ${st === 2 ? "is-on" : st === 1 ? "is-part" : ""} ${first ? "is-first" : ""} ${last ? "is-last" : ""}`}
                    />
                  );
                })}
                {dayRuns.map((r) => {
                  const a = Math.max(g0, toMin(r.start));
                  const b = Math.min(g1, toMin(r.end));
                  if (b <= a) return null;
                  return (
                    <span key={r.start} className="cal-run" style={{ top: `${((a - g0) / total) * 100}%` }} aria-hidden="true">
                      {r.start}–{r.end}
                    </span>
                  );
                })}
                {lessons.filter((l) => l.day === day).map((l) => {
                  const a = Math.max(g0, l.start);
                  const b = Math.min(g1, l.end);
                  if (b <= a) return null;
                  return (
                    <span
                      key={l.id}
                      className={`cal-lesson ${l.pending ? "is-pending" : ""}`}
                      style={{ top: `${((a - g0) / total) * 100}%`, height: `${((b - a) / total) * 100}%` }}
                      title={`${fmt(l.start)} ${l.name}${l.pending ? " (czeka na potwierdzenie)" : ""}`}
                    >
                      <b>{fmt(l.start)}</b> {l.name}
                    </span>
                  );
                })}
                {now?.day === day && now.min > g0 && now.min < g1 ? <span className="cal-now" style={{ top: `${((now.min - g0) / total) * 100}%` }} aria-hidden="true" /> : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
    </div>
    </>
  );
}

/* Okno godzin w tekście: dokładna edycja (i dostęp bez myszy). Zapis, gdy koniec jest po początku. */
function TimeRange({ rule, onChange, onRemove, day }: { rule: Rule; onChange: (r: Rule) => void; onRemove: () => void; day: string }) {
  const [a, setA] = React.useState(rule.start);
  const [b, setB] = React.useState(rule.end);
  React.useEffect(() => { setA(rule.start); setB(rule.end); }, [rule.start, rule.end]);
  const bad = !!a && !!b && toMin(b) <= toMin(a);
  const commit = (s: string, e: string) => { if (s && e && toMin(e) > toMin(s)) onChange({ ...rule, start: s, end: e }); };
  return (
    <span className={`cal-tr ${bad ? "is-bad" : ""}`}>
      <input type="time" step={300} value={a} aria-label={`${day}: od`} onChange={(e) => { setA(e.target.value); commit(e.target.value, b); }} />
      <span aria-hidden="true">–</span>
      <input type="time" step={300} value={b} aria-label={`${day}: do`} aria-invalid={bad || undefined} onChange={(e) => { setB(e.target.value); commit(a, e.target.value); }} />
      <button type="button" className="cal-tr__x" onClick={onRemove} aria-label={`Usuń okno ${rule.start}–${rule.end}, ${day}`}>
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" /></svg>
      </button>
    </span>
  );
}

/* ── wolne i urlopy: miesiąc ───────────────────────────────────────────────── */

function MonthOff({ offs, onOffs, now }: { offs: Off[]; onOffs: (o: Off[]) => void; now: { day: string } | null }) {
  const today = now?.day || warsawDay();
  const [month, setMonth] = React.useState(today.slice(0, 7));
  const [anchor, setAnchor] = React.useState<string | null>(null);
  const [hover, setHover] = React.useState<string | null>(null);
  const [sel, setSel] = React.useState<number | null>(null);
  const [past, setPast] = React.useState(false);
  const first = `${month}-01`;
  const gridStart = mondayOf(first);
  const nextMonth = (() => { const [y, m] = month.split("-").map(Number); return m === 12 ? `${y + 1}-01` : `${y}-${pad(m + 1)}`; })();
  const prevMonth = (() => { const [y, m] = month.split("-").map(Number); return m === 1 ? `${y - 1}-12` : `${y}-${pad(m - 1)}`; })();
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const weeks = cells[35].slice(0, 7) === month ? 6 : 5;
  const lessons = useLessons(cells[0], cells[weeks * 7 - 1]);
  const lessonsAll = useLessons(today, addDays(today, 400));

  React.useEffect(() => {
    if (!anchor) return;
    const on = (e: KeyboardEvent) => { if (e.key === "Escape") setAnchor(null); };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [anchor]);

  const offAt = (day: string) => offs.findIndex((o) => o.starts_on <= day && day <= o.ends_on);
  const pick = (day: string) => {
    if (!anchor) {
      const i = offAt(day);
      if (i >= 0) { setSel(i); return; }
      setSel(null);
      setAnchor(day);
      return;
    }
    const [a, b] = anchor <= day ? [anchor, day] : [day, anchor];
    setAnchor(null);
    setHover(null);
    /* Nowe wolne pochłania te, które w całości przykrywa — zostaje jedno, czytelne. */
    const kept = offs.filter((o) => !(o.starts_on >= a && o.ends_on <= b));
    const next = [...kept, { starts_on: a, ends_on: b, note: null }].sort((x, y) => x.starts_on.localeCompare(y.starts_on));
    onOffs(next);
    setSel(next.findIndex((o) => o.starts_on === a && o.ends_on === b));
  };
  const pend = anchor && hover ? (anchor <= hover ? [anchor, hover] : [hover, anchor]) : anchor ? [anchor, anchor] : null;
  const chosen = sel != null ? offs[sel] : null;
  const clash = chosen ? lessonsAll.filter((l) => chosen.starts_on <= l.day && l.day <= chosen.ends_on) : [];
  const upcoming = offs.map((o, i) => ({ o, i })).filter(({ o }) => o.ends_on >= today);
  const gone = offs.map((o, i) => ({ o, i })).filter(({ o }) => o.ends_on < today);

  return (
    <div className="cal-month">
      <div className="cal-month__cal">
        <div className="cal-mbar">
          <button type="button" className="cal-arrow" onClick={() => setMonth(prevMonth)} aria-label="Poprzedni miesiąc">‹</button>
          <p className="cal-mbar__t" aria-live="polite">{MONTH[Number(month.slice(5)) - 1]} {month.slice(0, 4)}</p>
          <button type="button" className="cal-arrow" onClick={() => setMonth(nextMonth)} aria-label="Następny miesiąc">›</button>
        </div>
        <div className="cal-mgrid" role="group" aria-label="Kalendarz wolnego: stuknij dzień początku i dzień końca">
          {DSHORT.map((d) => <span key={d} className="cal-mgrid__w" aria-hidden="true">{d}</span>)}
          {cells.slice(0, weeks * 7).map((day) => {
            const inMonth = day.slice(0, 7) === month;
            const oi = offAt(day);
            const off = oi >= 0;
            const o = off ? offs[oi] : null;
            const inPend = pend && pend[0] <= day && day <= pend[1];
            const n = lessons.filter((l) => l.day === day).length;
            return (
              <button
                key={day}
                type="button"
                className={[
                  "cal-md", inMonth ? "" : "is-out", day < today ? "is-past" : "", day === today ? "is-today" : "",
                  off ? "is-off" : "", o && o.starts_on === day ? "is-s" : "", o && o.ends_on === day ? "is-e" : "",
                  inPend ? "is-pend" : "", sel === oi && off ? "is-sel" : "",
                ].join(" ")}
                onClick={() => pick(day)}
                onPointerEnter={() => anchor && setHover(day)}
                onFocus={() => anchor && setHover(day)}
                aria-label={`${dNum(day)} ${MONTH_GEN[mIdx(day)]}${off ? ", wolne" : ""}${n ? `, lekcje: ${n}` : ""}`}
                aria-pressed={off}
              >
                <span>{dNum(day)}</span>
                {n ? <i className="cal-md__dots" aria-hidden="true">{Array.from({ length: Math.min(3, n) }, (_, k) => <b key={k} />)}</i> : null}
              </button>
            );
          })}
        </div>
        <p className="ed-note cal-month__hint" aria-live="polite">
          {anchor ? <>Początek: <b>{rangeLabel(anchor, anchor)}</b>. Stuknij dzień końca (ten sam dzień = jeden dzień wolnego). Esc anuluje.</> : "Stuknij dzień początku, potem dzień końca. Stuknięcie w wolne pokazuje je obok."}
        </p>
      </div>

      <div className="cal-month__side">
        {chosen ? (
          <div className="cal-offed" key={`${chosen.starts_on}-${chosen.ends_on}`}>
            <p className="ed-kicker">Wolne</p>
            <p className="cal-offed__t">{rangeLabel(chosen.starts_on, chosen.ends_on)}</p>
            <p className="ed-mute">{span(chosen.starts_on, chosen.ends_on)} {daysWord(span(chosen.starts_on, chosen.ends_on))} — w tym czasie kalendarz na stronie nie pokaże terminów.</p>
            <Ink value={chosen.note || ""} label="Notatka do wolnego (tylko dla Ciebie)" placeholder="Notatka tylko dla Ciebie, np. wyjazd" maxLength={200}
              onChange={(v) => onOffs(offs.map((x, k) => (k === sel ? { ...x, note: v || null } : x)))} />
            {clash.length ? (
              <p className="cal-clash" role="status">
                W tym czasie {clash.length === 1 ? "jest lekcja" : `są lekcje (${clash.length})`}: {clash.slice(0, 3).map((l) => `${dNum(l.day)}.${pad(mIdx(l.day) + 1)} ${fmt(l.start)} ${l.name}`).join(", ")}{clash.length > 3 ? "…" : ""}. Wolne ich nie odwołuje — zrób to w Rezerwacjach.
              </p>
            ) : null}
            <div className="cal-offed__act">
              <SureButton label="Usuń wolne" sure="Na pewno? Usuń" aria={rangeLabel(chosen.starts_on, chosen.ends_on)} onConfirm={() => { onOffs(offs.filter((_, k) => k !== sel)); setSel(null); }} />
              <button type="button" className="ed-tb ed-tb--quiet" onClick={() => setSel(null)}>Zamknij</button>
            </div>
          </div>
        ) : upcoming.length === 0 ? (
          <Blank art="week" title="Bez zaplanowanego wolnego" body="Zaznacz urlop albo dzień wolny na kalendarzu obok — terminy z tych dni znikną ze strony." />
        ) : null}

        {upcoming.length ? (
          <div className="cal-offs">
            <p className="ed-kicker">Zaplanowane wolne</p>
            <ul>
              {upcoming.map(({ o, i }) => (
                <li key={`${o.starts_on}-${o.ends_on}`}>
                  <button type="button" className={`cal-offs__b ${sel === i ? "is-on" : ""}`} onClick={() => { setSel(i); setMonth(o.starts_on.slice(0, 7)); }}>
                    <b>{rangeLabel(o.starts_on, o.ends_on)}</b>
                    <span>{span(o.starts_on, o.ends_on)} {daysWord(span(o.starts_on, o.ends_on))}{o.note ? ` · ${o.note}` : ""}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {gone.length ? (
          <div className="cal-offs cal-offs--gone">
            <button type="button" className="ed-tb ed-tb--quiet" aria-expanded={past} onClick={() => setPast((v) => !v)}>Minione ({gone.length})</button>
            {past ? (
              <ul>
                {gone.map(({ o, i }) => (
                  <li key={`${o.starts_on}-${o.ends_on}`}>
                    <span className="cal-offs__g">{rangeLabel(o.starts_on, o.ends_on)}{o.note ? ` · ${o.note}` : ""}</span>
                    <SureButton aria={rangeLabel(o.starts_on, o.ends_on)} onConfirm={() => onOffs(offs.filter((_, k) => k !== i))} />
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ── zasady rezerwacji ─────────────────────────────────────────────────────── */

function NumField({ value, onChange, min, max, label, unit }: { value: number; onChange: (v: number) => void; min: number; max: number; label: string; unit: string }) {
  const [t, setT] = React.useState(String(value));
  const [focus, setFocus] = React.useState(false);
  React.useEffect(() => { if (!focus) setT(String(value)); }, [value, focus]);
  const n = Number(t);
  const bad = t === "" || !Number.isFinite(n) || n < min || n > max;
  return (
    <span className="cal-num">
      <input className="ed-ink" inputMode="numeric" value={t} aria-label={label} aria-invalid={bad || undefined}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        onChange={(e) => { const v = e.target.value.replace(/\D/g, "").slice(0, 4); setT(v); const x = Number(v); if (v !== "" && x >= min && x <= max) onChange(x); }} />
      <span>{unit}</span>
      {bad ? <em className="cal-num__bad">od {min} do {max}</em> : null}
    </span>
  );
}

function Rules() {
  const call = usePanelApi();
  const doc = useAutosave<BookingRules>({
    load: async () => { const d = await call<{ value: BookingRules; version: number }>("/korki/panel/settings/booking", { quiet: true }); return { value: d.value, version: d.version }; },
    save: async (value, version) => { const d = await call<{ value: BookingRules; version: number }>("/korki/panel/settings/booking", { method: "PUT", body: { value, version }, quiet: true }); return { value: d.value, version: d.version }; },
    delay: 700,
    conflict: "Ktoś zmienił zasady w innym oknie — pokazuję najnowsze.",
  });
  const r = doc.draft;
  const set = <K extends keyof BookingRules>(k: K, v: BookingRules[K]) => doc.set((d) => ({ ...d, [k]: v }));
  return (
    <section className="ed-sec" aria-labelledby="cal-rules">
      <div className="ed-sec__head">
        <h2 className="ed-h" id="cal-rules">Zasady rezerwacji</h2>
        {r ? <SaveLine state={doc.state} canUndo={doc.canUndo} onUndo={doc.undo} onRetry={doc.retry} onRestore={doc.restoreMine} /> : null}
      </div>
      {!r ? (doc.loading ? <Skel rows={4} /> : <LoadError what="zasad rezerwacji" msg={doc.failed} onRetry={doc.reload} />) : (
        <dl className="cal-dl">
          <div>
            <dt>Rezerwacje online</dt>
            <dd><Toggle on={r.enabled} onChange={(v) => set("enabled", v)} label={r.enabled ? "Włączone" : "Wyłączone"} hint="Wyłączone — na stronie zamiast kalendarza jest prośba o wiadomość." /></dd>
          </div>
          <div>
            <dt>Potwierdzanie</dt>
            <dd><Toggle on={r.auto_confirm} onChange={(v) => set("auto_confirm", v)} label={r.auto_confirm ? "Od razu, automatycznie" : "Ręcznie, w Rezerwacjach"} hint="Automatycznie — termin jest potwierdzony od razu po zapisie ucznia." /></dd>
          </div>
          <div>
            <dt>Najwcześniej</dt>
            <dd><NumField value={r.min_notice_hours} min={0} max={720} label="Minimalne wyprzedzenie w godzinach" unit="godz. od teraz" onChange={(v) => set("min_notice_hours", v)} /></dd>
          </div>
          <div>
            <dt>Najdalej</dt>
            <dd><NumField value={r.horizon_days} min={1} max={365} label="Horyzont w dniach" unit="dni naprzód" onChange={(v) => set("horizon_days", v)} /></dd>
          </div>
          <div>
            <dt>Przerwa</dt>
            <dd><NumField value={r.buffer_minutes} min={0} max={240} label="Przerwa między lekcjami w minutach" unit="min między lekcjami" onChange={(v) => set("buffer_minutes", v)} /></dd>
          </div>
          <div>
            <dt>Terminy co</dt>
            <dd>
              <div className="ed-seg" role="group" aria-label="Krok terminów w minutach">
                {[15, 30, 60].map((s) => <button key={s} type="button" aria-pressed={r.slot_step_minutes === s} onClick={() => set("slot_step_minutes", s)}>{s} min</button>)}
              </div>
            </dd>
          </div>
        </dl>
      )}
    </section>
  );
}

/* ── widok ─────────────────────────────────────────────────────────────────── */

const STEP_KEY = "kk-panel-step";

export default function Calendar() {
  const call = usePanelApi();
  const doc = useAutosave<Avail>({
    load: async () => ({ value: canon(await call<Avail>("/korki/panel/availability", { quiet: true })) }),
    save: async (value) => ({ value: canon(await call<Avail>("/korki/panel/availability", { method: "PUT", body: value, quiet: true })) }),
    clean: (v) => ({ rules: v.rules, time_off: v.time_off.filter((o) => o.starts_on && o.ends_on && o.ends_on >= o.starts_on) }),
    delay: 800,
  });
  const now = useNow();
  const today = now?.day || warsawDay();
  const [weekStart, setWeekStart] = React.useState(() => mondayOf(warsawDay()));
  const [step, setStep] = React.useState(30);
  const [wide, setWide] = React.useState(false);
  const lessons = useLessons(weekStart, addDays(weekStart, 6));
  const phone = useMedia("(max-width: 720px)");

  React.useEffect(() => {
    try { if (localStorage.getItem(STEP_KEY) === "15") setStep(15); } catch { /* bez pamięci */ }
  }, []);
  const pickStep = (s: number) => { setStep(s); try { localStorage.setItem(STEP_KEY, String(s)); } catch { /* bez pamięci */ } };

  const a = doc.draft;
  const setRules = React.useCallback((rules: Rule[]) => doc.set((d) => ({ ...d, rules })), [doc]);
  const setOffs = React.useCallback((time_off: Off[]) => doc.set((d) => ({ ...d, time_off })), [doc]);

  if (doc.loading && !a) return <div className="pn-page ed cal"><Skel rows={10} /></div>;
  if (!a) return <div className="pn-page ed cal"><LoadError what="dostępności" msg={doc.failed} onRetry={doc.reload} /></div>;

  /* Zakres siatki: 7–22, szerzej gdy są okna poza nim albo po „Pokaż całą dobę”. */
  const starts = a.rules.map((r) => toMin(r.start));
  const ends = a.rules.map((r) => toMin(r.end));
  const g0 = wide ? 6 * 60 : Math.min(7 * 60, ...starts.map((m) => Math.floor(m / 60) * 60));
  const g1 = wide ? GRID_MAX : Math.min(GRID_MAX, Math.max(22 * 60, ...ends.map((m) => Math.ceil(m / 60) * 60)));
  const totalMin = a.rules.reduce((s, r) => s + toMin(r.end) - toMin(r.start), 0);
  const daysOn = new Set(a.rules.map((r) => r.weekday)).size;
  const weekEnd = addDays(weekStart, 6);
  const thisWeek = weekStart === mondayOf(today);
  const weekLabel = rangeLabel(weekStart, weekEnd);
  const copyToWeekdays = (wd: number) => {
    const src = a.rules.filter((r) => r.weekday === wd);
    setRules([...a.rules.filter((r) => r.weekday > 4), ...[0, 1, 2, 3, 4].flatMap((d) => src.map((r) => ({ ...r, weekday: d })))].filter((r, i, arr) => arr.findIndex((x) => x.weekday === r.weekday && x.start === r.start && x.end === r.end) === i).sort((x, y) => x.weekday - y.weekday || x.start.localeCompare(y.start)));
  };
  const replaceRule = (old: Rule, next: Rule) => setRules(canon({ rules: a.rules.map((r) => (r === old ? next : r)), time_off: [] }).rules);
  const addWindow = (wd: number) => {
    const same = a.rules.filter((r) => r.weekday === wd);
    const last = same[same.length - 1];
    const s = last ? Math.min(toMin(last.end) + 60, GRID_MAX - 60) : 16 * 60;
    const e = Math.min(s + 120, GRID_MAX);
    if (e <= s) return;
    setRules(canon({ rules: [...a.rules, { weekday: wd, start: fmt(s), end: fmt(e) }], time_off: [] }).rules);
  };

  return (
    <div className="pn-page ed cal">
      <header className="ed-doc__head cal-top">
        <div>
          <p className="ed-kicker">Tydzień · maluj godziny</p>
          <p className="ed-doc__lede">{phone ? "Przytrzymaj palec i przeciągnij, żeby zaznaczyć godziny. Po zaznaczonym — zetrzeć." : "Przeciągnij po siatce, żeby zaznaczyć godziny. Przeciągnij po zaznaczonym, żeby zetrzeć."}</p>
        </div>
        <SaveLine state={doc.state} canUndo={doc.canUndo} onUndo={doc.undo} onRetry={doc.retry} idle="Zmiany zapisują się same · kalendarz na stronie widzi je od razu" />
      </header>

      <section className="ed-sec cal-week" aria-labelledby="cal-week-h">
        <div className="cal-bar">
          <div className="cal-wnav">
            <button type="button" className="cal-arrow" onClick={() => setWeekStart(addDays(weekStart, -7))} aria-label="Poprzedni tydzień">‹</button>
            <h2 className="ed-h cal-wnav__t" id="cal-week-h" aria-live="polite">{weekLabel}</h2>
            <button type="button" className="cal-arrow" onClick={() => setWeekStart(addDays(weekStart, 7))} aria-label="Następny tydzień">›</button>
            {!thisWeek ? <button type="button" className="ed-tb ed-tb--accent" onClick={() => setWeekStart(mondayOf(today))}>Ten tydzień</button> : null}
          </div>
          <p className="cal-sum">{totalMin ? <><b>{hrs(totalMin)}</b> tygodniowo · {daysOn} {daysOn === 1 ? "dzień" : "dni"}</> : "Nic jeszcze nie zaznaczono"}</p>
        </div>
        <div className="cal-bar cal-bar--sub">
          <div className="ed-seg" role="group" aria-label="Dokładność siatki">
            <button type="button" aria-pressed={step === 30} onClick={() => pickStep(30)}>co 30 min</button>
            <button type="button" aria-pressed={step === 15} onClick={() => pickStep(15)}>co 15 min</button>
          </div>
          <button type="button" className="ed-tb ed-tb--quiet" aria-pressed={wide} onClick={() => setWide((v) => !v)}>{wide ? "Zwykłe godziny" : "Wcześniej i później"}</button>
          <ul className="cal-legend" aria-label="Legenda">
            <li><i className="lg-on" />przyjmuję</li>
            <li><i className="lg-lesson" />lekcja</li>
            <li><i className="lg-pend" />czeka</li>
            <li><i className="lg-off" />wolne</li>
          </ul>
        </div>

        {!a.rules.length ? (
          <p className="cal-first" role="note">Strona nie pokazuje jeszcze żadnych terminów — czat oferuje tylko zapytanie. Zaznacz godziny, w których przyjmujesz, np. przeciągnij od Pn 16:00 do Pt 20:00.</p>
        ) : null}

        <WeekPainter rules={a.rules} offs={a.time_off} onRules={setRules} weekStart={weekStart} step={step} range={[g0, g1]} lessons={lessons} now={now} />

        <details className="cal-text">
          <summary>Godziny w tekście <span className="ed-note">— dokładna edycja co do minuty, kopiowanie na dni robocze</span></summary>
          <dl className="cal-dl cal-dl--days">
            {DAYS.map((d, wd) => {
              const list = a.rules.filter((r) => r.weekday === wd);
              return (
                <div key={d}>
                  <dt>{d}</dt>
                  <dd>
                    {list.length ? list.map((r) => <TimeRange key={`${r.start}-${r.end}`} rule={r} day={d} onChange={(n) => replaceRule(r, n)} onRemove={() => setRules(a.rules.filter((x) => x !== r))} />) : <span className="ed-note">wolne</span>}
                    <span className="cal-dl__act">
                      <button type="button" className="ed-tb ed-tb--accent" onClick={() => addWindow(wd)}>+ okno</button>
                      {list.length && wd < 5 ? <button type="button" className="ed-tb ed-tb--quiet" onClick={() => copyToWeekdays(wd)}>kopiuj na pon–pt</button> : null}
                    </span>
                  </dd>
                </div>
              );
            })}
          </dl>
        </details>
      </section>

      <section className="ed-sec" aria-labelledby="cal-off-h">
        <div className="ed-sec__head"><h2 className="ed-h" id="cal-off-h">Wolne i urlopy</h2><span className="ed-note">Kropki na dniach to lekcje.</span></div>
        <MonthOff offs={a.time_off} onOffs={setOffs} now={now} />
      </section>

      <Rules />
    </div>
  );
}
