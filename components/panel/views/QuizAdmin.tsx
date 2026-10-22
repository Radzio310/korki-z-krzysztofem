"use client";

import React from "react";
import type { List, Offer } from "@/lib/types";
import { ApiError } from "@/lib/api";
import { Confirm, Empty, Field, Toggle, usePanel, usePanelApi, useLoad } from "../ui";
import { StarterButton } from "./Tasks";

type Q = { id: number; level_key: string; prompt: string; options: string[]; correct_index: number; explanation: string | null; sort: number; active: boolean; version: number };
type Draft = Omit<Q, "id" | "version"> & { id?: number; version?: number };

function Editor({ value, levels, onClose, onSaved }: { value: Draft; levels: Offer["levels"]; onClose: () => void; onSaved: () => void }) {
  const call = usePanelApi();
  const { toast } = usePanel();
  const [d, setD] = React.useState<Draft>(value);
  const [busy, setBusy] = React.useState(false);
  const set = (p: Partial<Draft>) => setD({ ...d, ...p });
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!d.level_key) return toast("Wybierz poziom pytania.", "err");
    setBusy(true);
    const body = { level_key: d.level_key, prompt: d.prompt, options: d.options, correct_index: d.correct_index, explanation: d.explanation, sort: d.sort, active: d.active };
    try {
      if (d.id) await call(`/korki/panel/quiz/${d.id}`, { method: "PATCH", body: { ...body, version: d.version } });
      else await call("/korki/panel/quiz", { body });
      toast("Pytanie zapisane.");
      onSaved();
    } catch (err) {
      if ((err as ApiError).status === 409) onSaved();
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="pn-card pn-pad pn-form pn-editor" onSubmit={save}>
      <h2 className="pn-sub">{d.id ? "Edycja pytania" : "Nowe pytanie"}</h2>
      <div className="pn-grid3">
        <Field label="Poziom">
          <select className="input" value={d.level_key} onChange={(e) => set({ level_key: e.target.value })} required>
            <option value="">— wybierz —</option>
            {levels.map((l) => <option key={l.key} value={l.key}>{l.name}</option>)}
            {d.level_key && !levels.some((l) => l.key === d.level_key) ? <option value={d.level_key}>{d.level_key}</option> : null}
          </select>
        </Field>
        <Field label="Kolejność" hint="Mniejsza = wcześniej w obrębie poziomu."><input className="input" type="number" value={d.sort} onChange={(e) => set({ sort: Number(e.target.value) || 0 })} /></Field>
      </div>
      <Field label="Pytanie" wide><textarea className="input" value={d.prompt} onChange={(e) => set({ prompt: e.target.value })} required maxLength={2000} rows={2} /></Field>
      <fieldset className="pn-opts">
        <legend>Odpowiedzi — zaznacz poprawną</legend>
        {d.options.map((o, i) => (
          <div key={i} className={`pn-opt ${d.correct_index === i ? "is-ok" : ""}`}>
            <button type="button" className="pn-opt__mark" onClick={() => set({ correct_index: i })} aria-pressed={d.correct_index === i} aria-label={`Odpowiedź ${i + 1} poprawna`}>{d.correct_index === i ? "✓" : i + 1}</button>
            <input className="input" value={o} onChange={(e) => set({ options: d.options.map((x, k) => (k === i ? e.target.value : x)) })} required maxLength={300} />
            {d.options.length > 2 ? (
              <button type="button" className="pn-x" onClick={() => {
                const options = d.options.filter((_, k) => k !== i);
                const ci = d.correct_index === i ? 0 : d.correct_index > i ? d.correct_index - 1 : d.correct_index;
                set({ options, correct_index: ci });
              }} aria-label="Usuń odpowiedź">×</button>
            ) : null}
          </div>
        ))}
        {d.options.length < 6 ? <button type="button" className="pn-add" onClick={() => set({ options: [...d.options, ""] })}>+ odpowiedź</button> : null}
      </fieldset>
      <Field label="Wyjaśnienie (jedno zdanie, pokazuje się w omówieniu)" wide><input className="input" value={d.explanation || ""} onChange={(e) => set({ explanation: e.target.value || null })} maxLength={2000} /></Field>
      <Toggle on={d.active} onChange={(v) => set({ active: v })} label="Aktywne" />
      <div className="pn-bk__actions">
        <button type="button" className="btn btn--sm btn--ghost" onClick={onClose}>Anuluj</button>
        <button type="submit" className="btn btn--sm btn--primary" disabled={busy}>{busy ? <i className="spinner" /> : "Zapisz"}</button>
      </div>
    </form>
  );
}

export default function QuizView() {
  const call = usePanelApi();
  const { toast } = usePanel();
  const { data, loading, reload } = useLoad<List<Q>>("/korki/panel/quiz");
  const offer = useLoad<{ value: Offer }>("/korki/panel/settings/offer");
  const [edit, setEdit] = React.useState<Draft | null>(null);
  const levels = offer.data?.value.levels || [];
  const unknown = (data?.rows || []).filter((q) => !levels.some((l) => l.key === q.level_key));

  return (
    <div className="pn-stack">
      <div className="pn-toolbar">
        <button type="button" className="btn btn--sm btn--primary" onClick={() => setEdit({ level_key: levels[0]?.key || "", prompt: "", options: ["", "", "", ""], correct_index: 0, explanation: null, sort: 0, active: true })}>+ Nowe pytanie</button>
        <StarterButton kind="quiz" onDone={reload} />
      </div>
      {unknown.length && levels.length ? (
        <div className="pn-alert">Część pytań ma poziom, którego nie ma w ofercie ({[...new Set(unknown.map((q) => q.level_key))].join(", ")}). Quiz je pokaże, ale rekomendacja poziomu bierze pod uwagę tylko poziomy z oferty — dodaj poziom o tym kluczu albo zmień poziom pytań.</div>
      ) : null}
      {edit ? <Editor key={edit.id ?? "new"} value={edit} levels={levels} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload(); }} /> : null}
      {loading && !data ? <div className="pn-card is-skel" style={{ height: 200 }} /> : !data?.rows.length ? (
        <Empty title="Brak pytań" body="Bez pytań quiz na stronie pokazuje pusty stan z przyciskiem rezerwacji. Zestaw startowy używa kluczy poziomów: podstawowka, liceum, matura_rozszerzona." />
      ) : (
        <div className="pn-list">
          {data.rows.map((q) => (
            <article key={`${q.id}-${q.version}`} className={`pn-review ${q.active ? "" : "is-off"}`}>
              <header>
                <span className="pn-pill">{levels.find((l) => l.key === q.level_key)?.name || q.level_key}</span>
                {!q.active ? <span className="pn-pill pn-pill--cancelled">ukryte</span> : null}
              </header>
              <p><b>{q.prompt}</b></p>
              <ol className="pn-qopts">{q.options.map((o, i) => <li key={i} className={i === q.correct_index ? "is-ok" : ""}>{o}</li>)}</ol>
              <div className="pn-bk__actions">
                <button type="button" className="btn btn--sm" onClick={() => setEdit({ ...q })}>Edytuj</button>
                <button type="button" className="btn btn--sm btn--ghost" onClick={async () => {
                  try { await call(`/korki/panel/quiz/${q.id}`, { method: "PATCH", body: { active: !q.active, version: q.version } }); reload(); } catch { /* tost */ }
                }}>{q.active ? "Ukryj" : "Pokaż"}</button>
                <Confirm label="Usuń" onConfirm={async () => {
                  try { await call(`/korki/panel/quiz/${q.id}`, { method: "DELETE" }); toast("Usunięte."); reload(); } catch { /* tost */ }
                }} />
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
