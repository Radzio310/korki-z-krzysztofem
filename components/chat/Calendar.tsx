"use client";

import React from "react";
import type { Slots } from "@/lib/types";
import { publicApi } from "@/lib/api";
import { addDays, dayToDate, fmtTime, partOfDay, TZ, warsawDay } from "@/lib/time";

/* Kalendarz w dymku: dni z kropkami wolnych terminów (z /korki/public/slots), wybrany dzień
   podświetla jedna „kula”, która przeskakuje między kafelkami (transform). Godziny jako
   pigułki pogrupowane porą dnia; godzina z kilkoma startami rozwija minuty.
   Najbliższy wolny termin bierzesz jednym stuknięciem. */

const wdShort = new Intl.DateTimeFormat("pl-PL", { timeZone: TZ, weekday: "short" });
const wdLong = new Intl.DateTimeFormat("pl-PL", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" });
const monthFmt = new Intl.DateTimeFormat("pl-PL", { timeZone: TZ, month: "long" });
const monthShort = new Intl.DateTimeFormat("pl-PL", { timeZone: TZ, month: "short" });
const hourFmt = new Intl.DateTimeFormat("pl-PL", { timeZone: TZ, hour: "2-digit", hourCycle: "h23" });

const WEEK = ["pn", "wt", "śr", "cz", "pt", "sb", "nd"];
const PARTS = ["rano", "popołudnie", "wieczór"] as const;

export const slotLabel = (iso: string, duration: number) => {
  const end = new Date(new Date(iso).getTime() + duration * 60000).toISOString();
  return `${wdShort.format(new Date(iso)).replace(".", "")} ${wdLong.format(new Date(iso)).split(", ")[1] || ""}, ${fmtTime(iso)}–${fmtTime(end)}`;
};

const plural = (n: number, one: string, few: string, many: string) => {
  if (n === 1) return one;
  const d = n % 10, t = n % 100;
  return d >= 2 && d <= 4 && (t < 12 || t > 14) ? few : many;
};

type Props = {
  duration: number;
  days: number;
  selected: string | null;
  reload: number;
  onPick: (slot: string) => void;
  onFallback: () => void;
};

export default function Calendar({ duration, days: horizon, selected, reload, onPick, onFallback }: Props) {
  const [data, setData] = React.useState<Slots | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [retry, setRetry] = React.useState(0);
  const [day, setDay] = React.useState<string | null>(null);
  const [slot, setSlot] = React.useState<string | null>(selected);
  const gridRef = React.useRef<HTMLDivElement>(null);
  const today = warsawDay();

  React.useEffect(() => {
    const ctl = new AbortController();
    setData(null);
    setErr(null);
    publicApi.slots(duration, today, Math.max(1, Math.min(62, horizon + 1)), ctl.signal)
      .then((s) => {
        setData(s);
        const keep = selected && s.days.some((d) => d.slots.includes(selected));
        const first = s.days.find((d) => d.slots.length);
        setDay(keep ? s.days.find((d) => d.slots.includes(selected!))!.date : first?.date ?? null);
        if (!keep) setSlot(null);
      })
      .catch((e) => { if ((e as Error).name !== "AbortError") setErr((e as Error).message); });
    return () => ctl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration, horizon, reload, retry]);

  if (err) {
    return (
      <div className="kcal kcal--state" role="alert">
        <p><b>Nie mogę wczytać kalendarza.</b> {err}</p>
        <div className="kcal__row">
          <button type="button" className="kc-pill" onClick={() => setRetry((n) => n + 1)}>Spróbuj ponownie</button>
          <button type="button" className="kc-pill kc-pill--ghost" onClick={onFallback}>Zostaw kontakt — oddzwonię</button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="kcal kcal--loading" aria-busy="true" aria-label="Wczytuję wolne terminy">
        <div className="kcal__near kcal__skel" />
        <div className="kcal__grid">
          {Array.from({ length: 28 }).map((_, i) => <span key={i} className="kcal__skelday" style={{ "--k": i } as React.CSSProperties} />)}
        </div>
      </div>
    );
  }

  const all = data.days;
  const free = all.reduce((n, d) => n + d.slots.length, 0);
  const freeDays = all.filter((d) => d.slots.length).length;
  if (data.enabled === false || !free) {
    return (
      <div className="kcal kcal--state">
        <p>
          <b>{data.enabled === false ? "Kalendarz jest teraz zamknięty." : "W najbliższych tygodniach nie mam wolnego terminu na tę długość lekcji."}</b>{" "}
          Zostaw kontakt — ustalimy termin razem.
        </p>
        <div className="kcal__row">
          <button type="button" className="kc-pill" onClick={onFallback}>Zostaw kontakt — oddzwonię</button>
        </div>
      </div>
    );
  }

  /* siatka od poniedziałku tygodnia pierwszego dnia do niedzieli tygodnia ostatniego */
  const first = all[0].date;
  const last = all[all.length - 1].date;
  const lead = (dayToDate(first).getUTCDay() + 6) % 7;
  const start = addDays(first, -lead);
  const tail = 6 - ((dayToDate(last).getUTCDay() + 6) % 7);
  const total = lead + all.length + tail;
  const byDate = new Map(all.map((d) => [d.date, d.slots]));
  const cells = Array.from({ length: total }, (_, i) => addDays(start, i));
  const nearest = all.find((d) => d.slots.length)!.slots[0];
  const months = [...new Set([first, last].map((d) => monthFmt.format(dayToDate(d))))];

  const selIdx = day ? cells.indexOf(day) : -1;
  const daySlots = (day && byDate.get(day)) || [];

  /* godziny: pierwsza wolna minuta w każdej godzinie */
  const hours = new Map<string, string[]>();
  daySlots.forEach((s) => {
    const h = hourFmt.format(new Date(s));
    hours.set(h, [...(hours.get(h) || []), s]);
  });
  const selHour = slot && daySlots.includes(slot) ? hourFmt.format(new Date(slot)) : null;

  const pickDay = (d: string) => {
    setDay(d);
    setSlot(null);
  };

  const onKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const iso = (e.target as HTMLElement).dataset?.day;
    if (!iso) return;
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (!step) return;
    e.preventDefault();
    let i = cells.indexOf(iso) + step;
    while (i >= 0 && i < cells.length) {
      if ((byDate.get(cells[i]) || []).length) {
        gridRef.current?.querySelector<HTMLButtonElement>(`[data-day="${cells[i]}"]`)?.focus();
        return;
      }
      i += step > 0 ? 1 : -1;
    }
  };
  const roving = day && (byDate.get(day) || []).length ? day : all.find((d) => d.slots.length)!.date;

  return (
    <div className="kcal">
      <button type="button" className="kcal__near" onClick={() => onPick(nearest)}>
        <span className="kcal__near-ico" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M13 2 4 14h7l-1 8 9-12h-7z" /></svg>
        </span>
        <span className="kcal__near-txt">
          <small>Najbliższy wolny termin</small>
          <b>{slotLabel(nearest, duration)}</b>
        </span>
        <span className="kcal__near-go">Biorę</span>
      </button>

      <div className="kcal__head">
        <b>{months.join(" / ")}</b>
        <small>{freeDays} {plural(freeDays, "dzień", "dni", "dni")} z wolnymi terminami</small>
      </div>

      <div className="kcal__week" aria-hidden="true">{WEEK.map((w) => <span key={w}>{w}</span>)}</div>
      <div className="kcal__grid" ref={gridRef} onKeyDown={onKey} role="group" aria-label="Dni z wolnymi terminami. Strzałki przenoszą między dniami.">
        {selIdx >= 0 ? (
          <span className="kcal__ball" aria-hidden="true" style={{ transform: `translate(${(selIdx % 7) * 100}%, ${Math.floor(selIdx / 7) * 100}%)` }} />
        ) : null}
        {cells.map((c) => {
          const list = byDate.get(c);
          const n = list?.length ?? 0;
          const out = list === undefined;
          const dt = dayToDate(c);
          const dots = n === 0 ? 0 : n <= 8 ? 1 : n <= 24 ? 2 : 3;
          const isFirstOfMonth = dt.getUTCDate() === 1;
          if (out) return <span key={c} className="kcal__day is-out" aria-hidden="true"><b>{dt.getUTCDate()}</b></span>;
          return (
            <button
              key={c}
              type="button"
              data-day={c}
              className={`kcal__day ${n ? "" : "is-off"} ${c === today ? "is-today" : ""} ${c === day ? "is-sel" : ""}`}
              disabled={!n}
              tabIndex={c === roving ? 0 : -1}
              aria-pressed={c === day}
              aria-label={`${wdLong.format(dt)}${n ? `, ${n} ${plural(n, "wolny termin", "wolne terminy", "wolnych terminów")}` : ", brak wolnych terminów"}`}
              onClick={() => pickDay(c)}
            >
              {isFirstOfMonth ? <small className="kcal__mon">{monthShort.format(dt).replace(".", "")}</small> : null}
              <b>{dt.getUTCDate()}</b>
              <i className="kcal__dots" aria-hidden="true">{Array.from({ length: dots }).map((_, k) => <em key={k} />)}</i>
            </button>
          );
        })}
      </div>

      {day ? (
        <div className="kcal__hours" key={day}>
          <p className="kcal__dayname">{wdLong.format(dayToDate(day))}</p>
          {PARTS.map((p) => {
            const hs = [...hours.entries()].filter(([, l]) => partOfDay(l[0]) === p);
            if (!hs.length) return null;
            return (
              <div key={p} className="kcal__part">
                <span className="kcal__partname">{p}</span>
                <div className="kcal__pills">
                  {hs.map(([h, l], i) => (
                    <button
                      key={h}
                      type="button"
                      className={`kcal__pill ${selHour === h ? "is-sel" : ""}`}
                      style={{ "--k": i } as React.CSSProperties}
                      aria-pressed={selHour === h}
                      onClick={() => setSlot(l[0])}
                    >
                      {fmtTime(l[0])}
                    </button>
                  ))}
                </div>
                {selHour && hs.some(([h]) => h === selHour) && (hours.get(selHour)?.length || 0) > 1 ? (
                  <div className="kcal__mins" role="group" aria-label="Dokładna godzina">
                    {hours.get(selHour)!.map((s, i) => (
                      <button key={s} type="button" className={`kcal__min ${slot === s ? "is-sel" : ""}`} style={{ "--k": i } as React.CSSProperties} aria-pressed={slot === s} onClick={() => setSlot(s)}>
                        {fmtTime(s)}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      <div className="kcal__send" data-on={slot ? "1" : undefined}>
        <button type="button" className="kc-send" disabled={!slot} onClick={() => slot && onPick(slot)}>
          <span>{slot ? <>Wybieram: <b>{slotLabel(slot, duration)}</b></> : "Wybierz godzinę"}</span>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h14M13 6l6 6-6 6" /></svg>
        </button>
      </div>
    </div>
  );
}
