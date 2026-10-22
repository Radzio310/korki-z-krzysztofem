"use client";

import React from "react";
import type { List, Offer } from "@/lib/types";
import { ApiError } from "@/lib/api";
import { Confirm, Empty, Field, Toggle, usePanel, usePanelApi, useLoad } from "../ui";

type Task = {
  id: number; title: string; body: string; hint: string | null; answer: string; solution: string | null;
  level_key: string | null; publish_on: string | null; active: boolean; version: number;
};
type Draft = Omit<Task, "id" | "version"> & { id?: number; version?: number };
const BLANK: Draft = { title: "", body: "", hint: null, answer: "", solution: null, level_key: null, publish_on: null, active: true };

export function StarterButton({ kind, onDone }: { kind: "quiz" | "tasks"; onDone: () => void }) {
  const call = usePanelApi();
  const { toast } = usePanel();
  const [busy, setBusy] = React.useState(false);
  return (
    <button type="button" className="btn btn--sm" disabled={busy} onClick={async () => {
      setBusy(true);
      try {
        const r = await call<{ added: number; skipped: number }>("/korki/panel/starter-pack", { body: { kind } });
        toast(r.added ? `Dodano ${r.added} z zestawu startowego.` : "Zestaw startowy jest już wczytany.");
        onDone();
      } catch { /* tost */ } finally {
        setBusy(false);
      }
    }}>{busy ? <i className="spinner" /> : "Wczytaj zestaw startowy (matematyka)"}</button>
  );
}

function Editor({ value, levels, onClose, onSaved }: { value: Draft; levels: Offer["levels"]; onClose: () => void; onSaved: () => void }) {
  const call = usePanelApi();
  const { toast } = usePanel();
  const [d, setD] = React.useState<Draft>(value);
  const [busy, setBusy] = React.useState(false);
  const set = (p: Partial<Draft>) => setD({ ...d, ...p });
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const body = { title: d.title, body: d.body, hint: d.hint, answer: d.answer, solution: d.solution, level_key: d.level_key, publish_on: d.publish_on || null, active: d.active };
    try {
      if (d.id) await call(`/korki/panel/tasks/${d.id}`, { method: "PATCH", body: { ...body, version: d.version } });
      else await call("/korki/panel/tasks", { body });
      toast("Zadanie zapisane.");
      onSaved();
    } catch (err) {
      if ((err as ApiError).status === 409) onSaved();
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="pn-card pn-pad pn-form pn-editor" onSubmit={save}>
      <h2 className="pn-sub">{d.id ? "Edycja zadania" : "Nowe zadanie"}</h2>
      <div className="pn-grid3">
        <Field label="Tytuł"><input className="input" value={d.title} onChange={(e) => set({ title: e.target.value })} required maxLength={160} placeholder="np. Procent z procentu" /></Field>
        <Field label="Poziom">
          <select className="input" value={d.level_key || ""} onChange={(e) => set({ level_key: e.target.value || null })}>
            <option value="">— dowolny —</option>
            {levels.map((l) => <option key={l.key} value={l.key}>{l.name}</option>)}
          </select>
        </Field>
        <Field label="Dzień publikacji (opcjonalnie)" hint="Puste = w rotacji."><input className="input" type="date" value={d.publish_on || ""} onChange={(e) => set({ publish_on: e.target.value || null })} /></Field>
      </div>
      <Field label="Treść zadania" wide><textarea className="input" value={d.body} onChange={(e) => set({ body: e.target.value })} required maxLength={6000} rows={4} placeholder="Zapis zwykłym tekstem: x², √2, π, ≤" /></Field>
      <div className="pn-grid3">
        <Field label="Odpowiedź" hint="Warianty rozdziel „|”, np. 0,5|1/2. Liczby porównuję z tolerancją."><input className="input" value={d.answer} onChange={(e) => set({ answer: e.target.value })} required maxLength={300} /></Field>
        <Field label="Podpowiedź (opcjonalnie)" wide><input className="input" value={d.hint || ""} onChange={(e) => set({ hint: e.target.value || null })} maxLength={2000} /></Field>
      </div>
      <Field label="Rozwiązanie krok po kroku (opcjonalnie)" wide><textarea className="input" value={d.solution || ""} onChange={(e) => set({ solution: e.target.value || null })} maxLength={6000} rows={4} /></Field>
      <Toggle on={d.active} onChange={(v) => set({ active: v })} label="Aktywne" />
      <div className="pn-bk__actions">
        <button type="button" className="btn btn--sm btn--ghost" onClick={onClose}>Anuluj</button>
        <button type="submit" className="btn btn--sm btn--primary" disabled={busy}>{busy ? <i className="spinner" /> : "Zapisz"}</button>
      </div>
    </form>
  );
}

export default function TasksView() {
  const call = usePanelApi();
  const { toast } = usePanel();
  const { data, loading, reload } = useLoad<List<Task>>("/korki/panel/tasks?limit=200");
  const offer = useLoad<{ value: Offer }>("/korki/panel/settings/offer");
  const [edit, setEdit] = React.useState<Draft | null>(null);
  const levels = offer.data?.value.levels || [];

  return (
    <div className="pn-stack">
      <div className="pn-toolbar">
        <button type="button" className="btn btn--sm btn--primary" onClick={() => setEdit({ ...BLANK })}>+ Nowe zadanie</button>
        <StarterButton kind="tasks" onDone={reload} />
      </div>
      {edit ? <Editor key={edit.id ?? "new"} value={edit} levels={levels} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload(); }} /> : null}
      {loading && !data ? <div className="pn-card is-skel" style={{ height: 200 }} /> : !data?.rows.length ? (
        <Empty title="Brak zadań" body="Bez zadań sekcja „Zadanie dnia” pokazuje pusty stan. Wczytaj zestaw startowy albo dodaj własne." />
      ) : (
        <div className="pn-list">
          {data.rows.map((t) => (
            <article key={`${t.id}-${t.version}`} className={`pn-review ${t.active ? "" : "is-off"}`}>
              <header>
                <b>{t.title}</b>
                {t.publish_on ? <span className="pn-pill pn-pill--confirmed">{t.publish_on}</span> : <span className="pn-pill">rotacja</span>}
                {!t.active ? <span className="pn-pill pn-pill--cancelled">ukryte</span> : null}
                {t.level_key ? <small className="muted">{levels.find((l) => l.key === t.level_key)?.name || t.level_key}</small> : null}
              </header>
              <p>{t.body}</p>
              <p className="muted">Odpowiedź: <b>{t.answer}</b></p>
              <div className="pn-bk__actions">
                <button type="button" className="btn btn--sm" onClick={() => setEdit({ ...t })}>Edytuj</button>
                <button type="button" className="btn btn--sm btn--ghost" onClick={async () => {
                  try { await call(`/korki/panel/tasks/${t.id}`, { method: "PATCH", body: { active: !t.active, version: t.version } }); reload(); } catch { /* tost */ }
                }}>{t.active ? "Ukryj" : "Pokaż"}</button>
                <Confirm label="Usuń" onConfirm={async () => {
                  try { await call(`/korki/panel/tasks/${t.id}`, { method: "DELETE" }); toast("Usunięte."); reload(); } catch { /* tost */ }
                }} />
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
