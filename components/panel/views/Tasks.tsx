"use client";

import React from "react";
import type { List, Offer } from "@/lib/types";
import { publicApi } from "@/lib/api";
import { fmtLong, warsawDay } from "@/lib/time";
import { ChalkRing, Slate } from "@/components/hero/Chalkboard";
import { Toggle, usePanel, usePanelApi, useLoad } from "../ui";
import { Blank, Ink, LoadError, SaveLine, SideBoard, Skel, SureButton, useAutosave } from "./kit";
import "@/components/sections/daily.css";
import "./tasks.css";

/* Zadania dnia jako zeszyt: spis treści z numerami i kropkowaną prowadnicą do daty,
   edycja rozwija się w miejscu (autozapis z Cofnij), obok tablica — tak, jak zobaczy uczeń. */

export type Task = {
  id: number; title: string; body: string; hint: string | null; answer: string; solution: string | null;
  level_key: string | null; publish_on: string | null; active: boolean; version: number;
};
type Draft = Omit<Task, "id" | "version"> & { id?: number; version?: number };
const BLANK: Draft = { title: "", body: "", hint: null, answer: "", solution: null, level_key: null, publish_on: null, active: true };
const MONTH_SHORT = ["sty", "lut", "mar", "kwi", "maj", "cze", "lip", "sie", "wrz", "paź", "lis", "gru"];
const shortDate = (d: string) => `${Number(d.slice(8, 10))} ${MONTH_SHORT[Number(d.slice(5, 7)) - 1]}`;
const pad = (n: number) => String(n).padStart(2, "0");

/* jak na stronie (DailyTask): rozwiązanie dzielone na kroki po liniach i zdaniach */
function steps(text: string): string[] {
  return text.split(/\n+|(?<=[.!?])\s+(?=[A-ZĄĆĘŁŃÓŚŹŻ0-9(])/).map((s) => s.trim()).filter(Boolean);
}

export function StarterButton({ kind, onDone }: { kind: "quiz" | "tasks"; onDone: () => void }) {
  const call = usePanelApi();
  const { toast } = usePanel();
  const [busy, setBusy] = React.useState(false);
  return (
    <button type="button" className="ed-tb ed-tb--accent" disabled={busy} onClick={async () => {
      setBusy(true);
      try {
        const r = await call<{ added: number; skipped: number }>("/korki/panel/starter-pack", { body: { kind } });
        toast(r.added ? `Dodano ${r.added} z zestawu startowego.` : "Zestaw startowy jest już wczytany.");
        onDone();
      } catch { /* tost */ } finally {
        setBusy(false);
      }
    }}>
      {busy ? <i className="spinner" /> : null}
      {kind === "tasks" ? "Wczytaj zestaw startowy (16 zadań z matematyki)" : "Wczytaj zestaw startowy (12 pytań z matematyki)"}
    </button>
  );
}

function LevelSelect({ value, levels, onChange, any = "dowolny poziom", label }: { value: string | null; levels: Offer["levels"]; onChange: (v: string | null) => void; any?: string; label: string }) {
  const known = !value || levels.some((l) => l.key === value);
  return (
    <span className="tk-select">
      <select value={value || ""} onChange={(e) => onChange(e.target.value || null)} aria-label={label}>
        <option value="">{any}</option>
        {levels.map((l) => <option key={l.key} value={l.key}>{l.name}</option>)}
        {!known ? <option value={value || ""}>{value} (poza ofertą)</option> : null}
      </select>
      <svg viewBox="0 0 12 8" aria-hidden="true"><path d="M1 1.5l5 5 5-5" /></svg>
    </span>
  );
}

function TaskFields({ d, set, levels }: { d: Draft; set: (p: Partial<Draft>) => void; levels: Offer["levels"] }) {
  return (
    <dl className="tk-dl">
      <div className="tk-dl__wide">
        <dt>Tytuł</dt>
        <dd><Ink className="tk-title" value={d.title} onChange={(v) => set({ title: v })} label="Tytuł zadania" placeholder="np. Procent z procentu" maxLength={160} invalid={!d.title.trim()} /></dd>
      </div>
      <div className="tk-dl__wide">
        <dt>Treść</dt>
        <dd><Ink multiline className="tk-body" value={d.body} onChange={(v) => set({ body: v })} label="Treść zadania" placeholder="Zapis zwykłym tekstem: x², √2, π, ≤" maxLength={6000} invalid={!d.body.trim()} /></dd>
      </div>
      <div>
        <dt>Odpowiedź</dt>
        <dd>
          <Ink className="tk-mono" value={d.answer} onChange={(v) => set({ answer: v })} label="Odpowiedź" placeholder="np. 0,5|1/2" maxLength={400} invalid={!d.answer.trim()} />
          <p className="ed-note">Warianty rozdziel „|”. Liczby porównuję z tolerancją.</p>
        </dd>
      </div>
      <div>
        <dt>Poziom</dt>
        <dd><LevelSelect value={d.level_key} levels={levels} onChange={(v) => set({ level_key: v })} label="Poziom zadania" /></dd>
      </div>
      <div>
        <dt>Dzień</dt>
        <dd className="tk-date">
          <input type="date" value={d.publish_on || ""} onChange={(e) => set({ publish_on: e.target.value || null })} aria-label="Dzień publikacji" />
          {d.publish_on ? <button type="button" className="ed-tb ed-tb--quiet" onClick={() => set({ publish_on: null })}>w rotacji</button> : <span className="ed-note">puste = w rotacji</span>}
        </dd>
      </div>
      <div>
        <dt>Na stronie</dt>
        <dd><Toggle on={d.active} onChange={(v) => set({ active: v })} label={d.active ? "Widoczne" : "Ukryte"} /></dd>
      </div>
      <div className="tk-dl__wide">
        <dt>Podpowiedź</dt>
        <dd><Ink multiline value={d.hint || ""} onChange={(v) => set({ hint: v || null })} label="Podpowiedź" placeholder="opcjonalnie — jedno zdanie naprowadzające" maxLength={2000} /></dd>
      </div>
      <div className="tk-dl__wide">
        <dt>Rozwiązanie</dt>
        <dd><Ink multiline value={d.solution || ""} onChange={(v) => set({ solution: v || null })} label="Rozwiązanie krok po kroku" placeholder="opcjonalnie — każdy krok w nowej linii" maxLength={6000} /></dd>
      </div>
    </dl>
  );
}

const body = (d: Draft) => ({ title: d.title, body: d.body, hint: d.hint, answer: d.answer, solution: d.solution, level_key: d.level_key, publish_on: d.publish_on || null, active: d.active });

/* Istniejące zadanie: autozapis PATCH z `version`; puste pole wymagane nie idzie na serwer. */
function TaskEditor({ task, levels, onSynced, onDeleted, onClose, onDraft }: {
  task: Task; levels: Offer["levels"]; onSynced: (t: Task) => void; onDeleted: () => void; onClose: () => void; onDraft: (d: Draft) => void;
}) {
  const call = usePanelApi();
  const first = React.useRef(true);
  const doc = useAutosave<Task>({
    load: async () => {
      if (first.current) { first.current = false; return { value: task, version: task.version }; }
      const l = await call<List<Task>>("/korki/panel/tasks?limit=500", { quiet: true });
      const t = l.rows.find((x) => x.id === task.id);
      if (!t) throw new Error("To zadanie zostało usunięte.");
      onSynced(t);
      return { value: t, version: t.version };
    },
    save: async (v, version) => {
      const r = await call<Task>(`/korki/panel/tasks/${task.id}`, { method: "PATCH", body: { ...body(v), version }, quiet: true });
      onSynced(r);
      return { value: r, version: r.version };
    },
    clean: (d, saved) => ({
      ...d,
      title: d.title.trim() ? d.title : saved?.title ?? d.title,
      body: d.body.trim() ? d.body : saved?.body ?? d.body,
      answer: d.answer.trim() ? d.answer : saved?.answer ?? d.answer,
      version: 0,
    }),
    delay: 1000,
    conflict: "Ktoś zmienił to zadanie w innym oknie — pokazuję najnowszą wersję.",
  });
  const d = doc.draft;
  React.useEffect(() => { if (d) onDraft(d); }, [d, onDraft]);
  if (!d) return <Skel rows={4} />;
  return (
    <div className="tk-editor">
      <TaskFields d={d} levels={levels} set={(p) => doc.set((x) => ({ ...x, ...p }))} />
      <div className="tk-editor__foot">
        <SaveLine state={doc.state} canUndo={doc.canUndo} onUndo={doc.undo} onRetry={doc.retry} onRestore={doc.restoreMine} />
        <SureButton label="Usuń zadanie" aria={d.title} onConfirm={async () => {
          try { await call(`/korki/panel/tasks/${task.id}`, { method: "DELETE" }); onDeleted(); } catch { /* tost */ }
        }} />
        <button type="button" className="ed-tb ed-tb--quiet" onClick={() => { doc.flush(); onClose(); }}>Zwiń</button>
      </div>
    </div>
  );
}

function NewTask({ levels, onCreated, onCancel, onDraft }: { levels: Offer["levels"]; onCreated: (t: Task) => void; onCancel: () => void; onDraft: (d: Draft) => void }) {
  const call = usePanelApi();
  const { toast } = usePanel();
  const [d, setD] = React.useState<Draft>({ ...BLANK });
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => { onDraft(d); }, [d, onDraft]);
  const ready = d.title.trim() && d.body.trim() && d.answer.trim();
  return (
    <form className="tk-editor tk-editor--new" onSubmit={async (e) => {
      e.preventDefault();
      if (!ready) return;
      setBusy(true);
      try {
        const t = await call<Task>("/korki/panel/tasks", { body: body(d) });
        toast("Zadanie dopisane do zeszytu.");
        onCreated(t);
      } catch { /* tost */ } finally { setBusy(false); }
    }}>
      <p className="ed-kicker">Nowe zadanie</p>
      <TaskFields d={d} levels={levels} set={(p) => setD((x) => ({ ...x, ...p }))} />
      <div className="tk-editor__foot">
        <span className="ed-note">{ready ? "Gotowe do zapisu." : "Tytuł, treść i odpowiedź są potrzebne."}</span>
        <button type="button" className="ed-tb ed-tb--quiet" onClick={onCancel}>Anuluj</button>
        <button type="submit" className="ed-btn" disabled={!ready || busy}>{busy ? <i className="spinner" /> : "Dopisz do zeszytu"}</button>
      </div>
    </form>
  );
}

function TaskBoard({ t, levels, todayId }: { t: Draft | null; levels: Offer["levels"]; todayId: number | null }) {
  const [hint, setHint] = React.useState(false);
  const [sol, setSol] = React.useState(false);
  const id = t?.id ?? "new";
  React.useEffect(() => { setHint(false); setSol(false); }, [id]);
  const level = levels.find((l) => l.key === t?.level_key)?.name;
  const answer = t?.answer.split("|").map((s) => s.trim()).filter(Boolean)[0];
  const solSteps = t?.solution ? steps(t.solution) : [];
  const tray = t ? (
    <div className="dt__tray">
      {t.hint ? <button type="button" className="ck-btn" onClick={() => setHint((v) => !v)} aria-pressed={hint}>{hint ? "Schowaj podpowiedź" : "Podpowiedź"}</button> : null}
      <button type="button" className="ck-btn" onClick={() => setSol((v) => !v)} aria-pressed={sol}>{sol ? "Zetrzyj rozwiązanie" : "Pokaż rozwiązanie"}</button>
    </div>
  ) : null;
  return (
    <>
      <div className="tk-board__bar">
        <p className="ed-kicker">Tak to widać na tablicy</p>
        {t?.id && t.id === todayId ? <span className="tk-today">dziś na stronie</span> : null}
      </div>
      <div className="tk-board">
        <Slate className="dt" label="Podgląd zadania na tablicy" tray={tray}>
          {!t ? (
            <div className="dt__empty">
              <p className="dt__empty-big ck">Dziś tablica jest jeszcze czysta</p>
              <p className="ck-soft dt__empty-sub">Tak wygląda sekcja, gdy nie ma żadnego zadania.</p>
            </div>
          ) : (
            <div className="dt__task" key={id}>
              <div className="dt__head">
                <p className="ck-label">Zadanie dnia{level ? ` · ${level}` : ""}</p>
                <p className="dt__date ck">{t.publish_on ? fmtLong(`${t.publish_on}T12:00:00Z`) : "w rotacji"}</p>
              </div>
              <h3 className="dt__title ck cw">{t.title || "Tytuł zadania"}</h3>
              <p className="dt__body ck cf" style={{ "--cw-d": 200 } as React.CSSProperties}>{t.body || "Treść zadania…"}</p>
              {hint && t.hint ? (
                <p className="dt__hint ck cw">
                  <svg viewBox="0 0 20 40" preserveAspectRatio="none" aria-hidden="true"><path d="M16 2 C 6 6, 8 18, 3 20 C 8 22, 6 34, 16 38" /></svg>
                  <span>{t.hint}</span>
                </p>
              ) : null}
              {sol ? (
                <div className="dt__sol">
                  {solSteps.length ? (
                    <ol className="dt__steps">{solSteps.map((s, i) => <li key={i} className="ck cw" style={{ "--cw-d": 120 + i * 380, "--cw-t": "520ms" } as React.CSSProperties}>{s}</li>)}</ol>
                  ) : <p className="ck ck-soft">Bez rozwiązania krok po kroku — uczeń zobaczy samą odpowiedź.</p>}
                  <p className="dt__final ck cf" style={{ "--cw-d": 200 + solSteps.length * 380 } as React.CSSProperties}>
                    Odp.: <span className="dt__ans ck-choice is-on">{answer || "?"}<ChalkRing v={typeof id === "number" ? id : 7} /></span>
                  </p>
                </div>
              ) : (
                <p className="dt__final ck tk-odp">Odp.: <span aria-hidden="true" /></p>
              )}
            </div>
          )}
        </Slate>
      </div>
      <p className="ed-note">Uczeń wpisuje wynik; podpowiedź i rozwiązanie odkrywa sam. {t?.publish_on ? "To zadanie ma swój dzień — pokaże się tylko wtedy." : "Zadania w rotacji wypełniają dni bez zaplanowanego zadania."}</p>
    </>
  );
}

type Filter = "all" | "rot" | "plan" | "off";

export default function TasksView() {
  const { data, loading, reload, setData } = useLoad<List<Task>>("/korki/panel/tasks?limit=500");
  const offer = useLoad<{ value: Offer }>("/korki/panel/settings/offer");
  const levels = offer.data?.value.levels || [];
  const [open, setOpen] = React.useState<number | "new" | null>(null);
  const [filter, setFilter] = React.useState<Filter>("all");
  const [q, setQ] = React.useState("");
  const [live, setLive] = React.useState<Draft | null>(null);
  const [todayId, setTodayId] = React.useState<number | null>(null);
  const today = warsawDay();

  React.useEffect(() => {
    let alive = true;
    publicApi.dailyTask().then((t) => { if (alive) setTodayId(t?.id ?? null); }).catch(() => { /* bez podświetlenia */ });
    return () => { alive = false; };
  }, [data?.total]);

  const rows = data?.rows || [];
  const synced = React.useCallback((t: Task) => setData((d) => (d ? { ...d, rows: d.rows.map((x) => (x.id === t.id ? t : x)) } : d)), [setData]);
  const onDraft = React.useCallback((d: Draft) => setLive(d), []);
  const counts = {
    all: rows.length,
    rot: rows.filter((t) => t.active && !t.publish_on).length,
    plan: rows.filter((t) => t.publish_on && t.publish_on >= today).length,
    off: rows.filter((t) => !t.active).length,
  };
  const needle = q.trim().toLowerCase();
  const shown = rows
    .map((t, i) => ({ t, n: i + 1 }))
    .filter(({ t }) => (filter === "all" ? true : filter === "rot" ? t.active && !t.publish_on : filter === "plan" ? !!t.publish_on && t.publish_on >= today : !t.active))
    .filter(({ t }) => !needle || `${t.title} ${t.body}`.toLowerCase().includes(needle));
  const preview: Draft | null = open != null && live ? live : rows.find((t) => t.id === todayId) || rows[0] || null;

  if (loading && !data) return <div className="pn-page ed tk"><Skel rows={10} /></div>;
  if (!data) return <div className="pn-page ed tk"><LoadError what="zadań" onRetry={reload} /></div>;

  return (
    <div className="pn-page ed tk">
      <div className="ed-split">
        <div className="ed-doc">
          <header className="ed-doc__head tk-head">
            <div>
              <p className="ed-kicker">Zeszyt zadań · {rows.length} {rows.length === 1 ? "zadanie" : rows.length % 10 >= 2 && rows.length % 10 <= 4 && (rows.length % 100 < 10 || rows.length % 100 >= 20) ? "zadania" : "zadań"}</p>
              <p className="ed-doc__lede">Kliknij tytuł, żeby edytować w miejscu. Zmiany zapisują się same.</p>
            </div>
            <button type="button" className="ed-btn" onClick={() => { setOpen("new"); setLive(null); }} disabled={open === "new"}>+ Nowe zadanie</button>
          </header>

          {open === "new" ? (
            <NewTask levels={levels} onDraft={onDraft} onCancel={() => setOpen(null)} onCreated={(t) => { setData((d) => (d ? { rows: [...d.rows, t], total: d.total + 1 } : d)); setOpen(t.id); }} />
          ) : null}

          {rows.length === 0 && open !== "new" ? (
            <Blank art="page" kicker="Zeszyt jest pusty" title="Bez zadań sekcja „Zadanie dnia” stoi pusta" body="Wczytaj gotowy zestaw z matematyki albo dopisz pierwsze własne zadanie." onArt={() => setOpen("new")}>
              <StarterButton kind="tasks" onDone={reload} />
              <button type="button" className="ed-tb" onClick={() => setOpen("new")}>Napisz własne</button>
            </Blank>
          ) : rows.length ? (
            <>
              <div className="tk-tools">
                <div className="ed-seg" role="tablist" aria-label="Pokaż">
                  {([["all", "Wszystkie"], ["rot", "W rotacji"], ["plan", "Zaplanowane"], ["off", "Ukryte"]] as const).map(([k, l]) => (
                    <button key={k} type="button" role="tab" aria-selected={filter === k} onClick={() => setFilter(k)}>{l} <b className="tk-count">{counts[k]}</b></button>
                  ))}
                </div>
                <input className="ed-ink tk-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Szukaj w zeszycie…" aria-label="Szukaj zadań" />
              </div>
              <ol className="tk-toc">
                {shown.map(({ t, n }) => {
                  const isOpen = open === t.id;
                  const level = levels.find((l) => l.key === t.level_key)?.name || t.level_key;
                  return (
                    <li key={t.id} className={`tk-entry ${isOpen ? "is-open" : ""} ${t.active ? "" : "is-off"}`}>
                      <button type="button" className="tk-entry__b" aria-expanded={isOpen} onClick={() => { setOpen(isOpen ? null : t.id); setLive(isOpen ? null : t); }}>
                        <span className="tk-entry__n">{pad(n)}</span>
                        <span className="tk-entry__t">{t.title}</span>
                        <span className="tk-entry__lead" aria-hidden="true" />
                        <span className={`tk-entry__d ${t.id === todayId ? "is-today" : ""}`}>{t.id === todayId ? "dziś" : t.publish_on ? shortDate(t.publish_on) : "rotacja"}</span>
                        <span className="tk-entry__m">{[level || "dowolny poziom", `odp. ${t.answer}`, t.active ? null : "ukryte"].filter(Boolean).join(" · ")}</span>
                      </button>
                      {isOpen ? (
                        <TaskEditor key={t.id} task={t} levels={levels} onSynced={synced} onDraft={onDraft}
                          onClose={() => setOpen(null)}
                          onDeleted={() => { setOpen(null); setData((d) => (d ? { rows: d.rows.filter((x) => x.id !== t.id), total: d.total - 1 } : d)); }} />
                      ) : null}
                    </li>
                  );
                })}
              </ol>
              {!shown.length ? <p className="ed-mute tk-none">Nic tu nie pasuje{needle ? ` do „${q}”` : ""}.</p> : null}
              <div className="tk-foot"><StarterButton kind="tasks" onDone={reload} /></div>
            </>
          ) : null}
        </div>

        <SideBoard label="Podgląd na tablicy">
          <TaskBoard t={preview} levels={levels} todayId={todayId} />
        </SideBoard>
      </div>
    </div>
  );
}
