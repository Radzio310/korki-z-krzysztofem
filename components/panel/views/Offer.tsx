"use client";

import React from "react";
import type { Level, Offer } from "@/lib/types";
import { lessonPrice, zl } from "@/lib/pricing";
import { Empty, Field, SaveBar, Toggle, gr, slug, toZl, useSettingsDoc } from "../ui";

const DURATION_CHOICES = [30, 45, 60, 75, 90, 120, 150, 180];
const MODE_LABEL: Record<string, string> = { online: "Online", stationary: "Stacjonarnie" };

function uniqueKey(base: string, taken: string[]) {
  let k = slug(base);
  let n = 2;
  while (taken.includes(k)) k = `${slug(base)}_${n++}`;
  return k;
}

export default function OfferView() {
  const { draft, setDraft, loading, dirty, busy, save, reset } = useSettingsDoc<Offer>("offer");
  if (loading && !draft) return <div className="pn-card is-skel" style={{ height: 420 }} />;
  if (!draft) return <Empty title="Nie udało się wczytać oferty" body="Odśwież stronę za chwilę." />;

  const o = draft;
  const set = (patch: Partial<Offer>) => setDraft({ ...o, ...patch });
  const setLevel = (i: number, patch: Partial<Level>) => set({ levels: o.levels.map((l, k) => (k === i ? { ...l, ...patch } : l)) });
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= o.levels.length) return;
    const next = [...o.levels];
    [next[i], next[j]] = [next[j], next[i]];
    set({ levels: next });
  };
  const durations = [...o.durations].sort((a, b) => a - b);

  return (
    <div className="pn-stack">
      <section className="pn-card">
        <header className="pn-card__head"><h2>Przedmioty</h2><span className="muted">Pokazują się na taśmie i w rezerwacji (gdy jest ich więcej niż jeden).</span></header>
        <div className="pn-pad pn-tags">
          {o.subjects.map((s, i) => (
            <span key={s.key} className="pn-tag">
              <input className="pn-tag__in" value={s.name} onChange={(e) => set({ subjects: o.subjects.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)) })} aria-label="Nazwa przedmiotu" />
              <button type="button" onClick={() => set({ subjects: o.subjects.filter((_, k) => k !== i) })} aria-label={`Usuń ${s.name}`}>×</button>
            </span>
          ))}
          <form className="pn-tag pn-tag--new" onSubmit={(e) => {
            e.preventDefault();
            const inp = e.currentTarget.elements.namedItem("n") as HTMLInputElement;
            const name = inp.value.trim();
            if (!name) return;
            set({ subjects: [...o.subjects, { key: uniqueKey(name, o.subjects.map((s) => s.key)), name }] });
            inp.value = "";
          }}>
            <input name="n" className="pn-tag__in" placeholder="+ np. Matematyka" aria-label="Nowy przedmiot" />
          </form>
        </div>
      </section>

      <section className="pn-card">
        <header className="pn-card__head"><h2>Długości lekcji i forma</h2></header>
        <div className="pn-pad pn-form">
          <Field label="Dostępne długości (min)" hint="Kalkulator i rezerwacja pokażą tylko zaznaczone.">
            <div className="pn-seg">
              {DURATION_CHOICES.map((d) => (
                <button key={d} type="button" className="chip" aria-pressed={o.durations.includes(d)} onClick={() => {
                  const has = o.durations.includes(d);
                  if (has && o.durations.length === 1) return;
                  set({ durations: has ? o.durations.filter((x) => x !== d) : [...o.durations, d].sort((a, b) => a - b) });
                }}>{d}</button>
              ))}
            </div>
          </Field>
          <Field label="Forma lekcji">
            <div className="pn-seg">
              {Object.keys(MODE_LABEL).map((m) => (
                <button key={m} type="button" className="chip" aria-pressed={o.modes.includes(m)} onClick={() => {
                  const has = o.modes.includes(m);
                  if (has && o.modes.length === 1) return;
                  set({ modes: has ? o.modes.filter((x) => x !== m) : [...o.modes, m] });
                }}>{MODE_LABEL[m]}</button>
              ))}
            </div>
          </Field>
        </div>
      </section>

      <section className="pn-card">
        <header className="pn-card__head">
          <h2>Poziomy i ceny</h2>
          <button type="button" className="btn btn--sm btn--primary" onClick={() => set({ levels: [...o.levels, { key: uniqueKey("nowy poziom", o.levels.map((l) => l.key)), name: "Nowy poziom", description: null, prices: {}, active: true }] })}>+ Poziom</button>
        </header>
        {o.levels.length === 0 ? (
          <Empty title="Brak poziomów" body="Dodaj np. „Szkoła podstawowa”, „Liceum — podstawa”, „Matura rozszerzona” i wpisz ceny. Kolejność poziomów to kolejność trudności — quiz poleca poziom według niej." />
        ) : (
          <div className="pn-levels">
            {o.levels.map((l, i) => (
              <div key={i} className={`pn-level ${l.active ? "" : "is-off"}`}>
                <div className="pn-level__head">
                  <div className="pn-level__order">
                    <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="W górę">↑</button>
                    <button type="button" onClick={() => move(i, 1)} disabled={i === o.levels.length - 1} aria-label="W dół">↓</button>
                  </div>
                  <Field label="Nazwa"><input className="input" value={l.name} onChange={(e) => setLevel(i, { name: e.target.value })} maxLength={60} /></Field>
                  <Field label="Klucz" hint="Stały identyfikator (quiz, zadania)."><input className="input" value={l.key} onChange={(e) => setLevel(i, { key: slug(e.target.value) })} maxLength={40} /></Field>
                  <Toggle on={l.active} onChange={(v) => setLevel(i, { active: v })} label={l.active ? "Widoczny" : "Ukryty"} />
                </div>
                <Field label="Opis (opcjonalnie)" wide><input className="input" value={l.description || ""} onChange={(e) => setLevel(i, { description: e.target.value || null })} maxLength={200} placeholder="np. klasy 4–8, przygotowanie do egzaminu ósmoklasisty" /></Field>
                <div className="pn-prices">
                  {durations.map((d) => {
                    const own = l.prices?.[String(d)];
                    const derived = lessonPrice({ ...l, prices: { ...l.prices, [String(d)]: 0 } }, d);
                    return (
                      <label key={d} className="pn-price">
                        <span>{d} min</span>
                        <div className="pn-price__in">
                          <input
                            className="input"
                            inputMode="decimal"
                            value={toZl(own)}
                            placeholder={derived ? zl(derived).replace(" zł", "") : "—"}
                            onChange={(e) => {
                              const g = gr(e.target.value);
                              const prices = { ...l.prices };
                              if (g) prices[String(d)] = g; else delete prices[String(d)];
                              setLevel(i, { prices });
                            }}
                          />
                          <em>zł</em>
                        </div>
                      </label>
                    );
                  })}
                </div>
                <p className="pn-hint">Puste pole liczy się proporcjonalnie z ceny za 60 min (podpowiedź w polu).</p>
                <button type="button" className="pn-link pn-danger-text" onClick={() => set({ levels: o.levels.filter((_, k) => k !== i) })}>Usuń poziom</button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="pn-card">
        <header className="pn-card__head">
          <h2>Rabaty za pakiet</h2>
          <button type="button" className="btn btn--sm" onClick={() => set({ discounts: [...o.discounts, { min_weekly_minutes: 180, percent: 5, label: "Pakiet stały" }] })}>+ Próg</button>
        </header>
        <div className="pn-pad pn-form">
          {o.discounts.length === 0 ? <p className="muted">Brak rabatów. Próg liczy się od łącznego czasu lekcji w tygodniu.</p> : null}
          {o.discounts.map((d, i) => (
            <div key={i} className="pn-row">
              <Field label="Od minut tygodniowo"><input className="input" type="number" min={30} step={15} value={d.min_weekly_minutes} onChange={(e) => set({ discounts: o.discounts.map((x, k) => (k === i ? { ...x, min_weekly_minutes: Number(e.target.value) || 0 } : x)) })} /></Field>
              <Field label="Rabat %"><input className="input" type="number" min={1} max={50} value={d.percent} onChange={(e) => set({ discounts: o.discounts.map((x, k) => (k === i ? { ...x, percent: Math.max(0, Math.min(50, Number(e.target.value) || 0)) } : x)) })} /></Field>
              <Field label="Nazwa"><input className="input" value={d.label || ""} onChange={(e) => set({ discounts: o.discounts.map((x, k) => (k === i ? { ...x, label: e.target.value || null } : x)) })} maxLength={40} /></Field>
              <button type="button" className="pn-x" onClick={() => set({ discounts: o.discounts.filter((_, k) => k !== i) })} aria-label="Usuń próg">×</button>
            </div>
          ))}
          <div className="pn-grid3">
            <Field label="Tygodni w miesiącu (do kalkulatora)"><input className="input" type="number" min={1} max={5} step={0.25} value={o.weeks_per_month} onChange={(e) => set({ weeks_per_month: Math.max(1, Math.min(5, Number(e.target.value) || 4)) })} /></Field>
            <Field label="Dopisek pod ceną (opcjonalnie)" wide><input className="input" value={o.notes || ""} onChange={(e) => set({ notes: e.target.value || null })} maxLength={200} placeholder="np. dojazd do ucznia +20 zł" /></Field>
          </div>
        </div>
      </section>
      <SaveBar dirty={dirty} busy={busy} onSave={save} onReset={reset} />
    </div>
  );
}
