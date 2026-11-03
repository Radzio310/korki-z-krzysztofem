"use client";

import React from "react";
import type { List, Offer } from "@/lib/types";
import { ChalkRing, Slate } from "@/components/hero/Chalkboard";
import { Toggle, usePanel, usePanelApi, useLoad } from "../ui";
import { Blank, Grip, Ink, LoadError, SaveLine, SideBoard, Skel, SureButton, moveItem, useAutosave, useReorder } from "./kit";
import { StarterButton } from "./Tasks";
import "@/components/sections/quiz.css";
import "./tasks.css";

/* Quiz jako zeszyt w rozdziałach (poziomy z oferty, w kolejności trudności). Pytanie rozwija się
   do edycji w miejscu, kolejność w rozdziale — przeciąganiem, obok tablica jak w quizie na stronie. */

type Q = { id: number; level_key: string | null; prompt: string; options: string[]; correct_index: number; explanation: string | null; sort: number; active: boolean; version: number };
type Draft = Omit<Q, "id" | "version"> & { id?: number; version?: number };
const LETTERS = "ABCDEF";

const optsOk = (o: string[]) => o.length >= 2 && o.every((x) => x.trim()) && new Set(o.map((x) => x.trim())).size === o.length;
const body = (d: Draft) => ({ level_key: d.level_key, prompt: d.prompt, options: d.options, correct_index: d.correct_index, explanation: d.explanation, sort: d.sort, active: d.active });

function QFields({ d, set, levels }: { d: Draft; set: (p: Partial<Draft>) => void; levels: Offer["levels"] }) {
  const known = !d.level_key || levels.some((l) => l.key === d.level_key);
  const dupe = (o: string, i: number) => !!o.trim() && d.options.findIndex((x) => x.trim() === o.trim()) !== i;
  return (
    <dl className="tk-dl">
      <div>
        <dt>Poziom</dt>
        <dd>
          <span className="tk-select">
            <select value={d.level_key || ""} onChange={(e) => set({ level_key: e.target.value || null })} aria-label="Poziom pytania">
              <option value="">— wybierz —</option>
              {levels.map((l) => <option key={l.key} value={l.key}>{l.name}</option>)}
              {!known ? <option value={d.level_key || ""}>{d.level_key} (poza ofertą)</option> : null}
            </select>
            <svg viewBox="0 0 12 8" aria-hidden="true"><path d="M1 1.5l5 5 5-5" /></svg>
          </span>
        </dd>
      </div>
      <div>
        <dt>Na stronie</dt>
        <dd><Toggle on={d.active} onChange={(v) => set({ active: v })} label={d.active ? "W quizie" : "Ukryte"} /></dd>
      </div>
      <div className="tk-dl__wide">
        <dt>Pytanie</dt>
        <dd><Ink multiline className="tk-title" value={d.prompt} onChange={(v) => set({ prompt: v })} label="Treść pytania" placeholder="np. Ile to jest 15% z 80?" maxLength={1000} invalid={!d.prompt.trim()} /></dd>
      </div>
      <div className="tk-dl__wide">
        <dt>Odpowiedzi</dt>
        <dd>
          <ol className="qa-opts">
            {d.options.map((o, i) => (
              <li key={i} className={d.correct_index === i ? "is-ok" : ""}>
                <button type="button" className="qa-mark" aria-pressed={d.correct_index === i} onClick={() => set({ correct_index: i })} aria-label={`Odpowiedź ${LETTERS[i]} jest poprawna`}>
                  <span>{LETTERS[i]}</span>
                  <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10.5l4 4 8-9" /></svg>
                </button>
                <Ink value={o} onChange={(v) => set({ options: d.options.map((x, k) => (k === i ? v : x)) })} label={`Odpowiedź ${LETTERS[i]}`} placeholder={`odpowiedź ${LETTERS[i]}`} maxLength={200} invalid={!o.trim() || dupe(o, i)} />
                {d.options.length > 2 ? (
                  <button type="button" className="qa-x" onClick={() => {
                    const options = d.options.filter((_, k) => k !== i);
                    const ci = d.correct_index === i ? 0 : d.correct_index > i ? d.correct_index - 1 : d.correct_index;
                    set({ options, correct_index: ci });
                  }} aria-label={`Usuń odpowiedź ${LETTERS[i]}`}>
                    <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" /></svg>
                  </button>
                ) : <span />}
              </li>
            ))}
          </ol>
          <div className="qa-opts__foot">
            {d.options.length < 6 ? <button type="button" className="ed-tb ed-tb--accent" onClick={() => set({ options: [...d.options, ""] })}>+ odpowiedź</button> : null}
            <span className="ed-note">Litera z ptaszkiem = poprawna. Odpowiedzi muszą się różnić.</span>
          </div>
        </dd>
      </div>
      <div className="tk-dl__wide">
        <dt>Wyjaśnienie</dt>
        <dd><Ink multiline value={d.explanation || ""} onChange={(v) => set({ explanation: v || null })} label="Wyjaśnienie" placeholder="jedno zdanie do omówienia po quizie (opcjonalnie)" maxLength={1000} /></dd>
      </div>
    </dl>
  );
}

function QEditor({ q, levels, onSynced, onDeleted, onClose, onDraft }: {
  q: Q; levels: Offer["levels"]; onSynced: (q: Q) => void; onDeleted: () => void; onClose: () => void; onDraft: (d: Draft) => void;
}) {
  const call = usePanelApi();
  const first = React.useRef(true);
  const doc = useAutosave<Q>({
    load: async () => {
      if (first.current) { first.current = false; return { value: q, version: q.version }; }
      const l = await call<List<Q>>("/korki/panel/quiz?limit=500", { quiet: true });
      const x = l.rows.find((r) => r.id === q.id);
      if (!x) throw new Error("To pytanie zostało usunięte.");
      onSynced(x);
      return { value: x, version: x.version };
    },
    save: async (v, version) => {
      const r = await call<Q>(`/korki/panel/quiz/${q.id}`, { method: "PATCH", body: { ...body(v), version }, quiet: true });
      onSynced(r);
      return { value: r, version: r.version };
    },
    /* niepełne pytanie nie idzie na serwer — zostaje ostatnia dobra wersja tych pól */
    clean: (d, saved) => {
      const ok = optsOk(d.options) && d.correct_index < d.options.length;
      return {
        ...d,
        prompt: d.prompt.trim() ? d.prompt : saved?.prompt ?? d.prompt,
        options: ok ? d.options : saved?.options ?? d.options,
        correct_index: ok ? d.correct_index : saved?.correct_index ?? 0,
        level_key: d.level_key ?? saved?.level_key ?? null,
        version: 0,
      };
    },
    delay: 1000,
    conflict: "Ktoś zmienił to pytanie w innym oknie — pokazuję najnowszą wersję.",
  });
  const d = doc.draft;
  React.useEffect(() => { if (d) onDraft(d); }, [d, onDraft]);
  if (!d) return <Skel rows={4} />;
  const incomplete = !optsOk(d.options) || !d.prompt.trim();
  return (
    <div className="tk-editor">
      <QFields d={d} levels={levels} set={(p) => doc.set((x) => ({ ...x, ...p }))} />
      {incomplete ? <p className="tk-miss">Pytanie i wszystkie odpowiedzi muszą być wpisane (i różne) — do tego czasu na stronie zostaje poprzednia wersja.</p> : null}
      <div className="tk-editor__foot">
        <SaveLine state={doc.state} canUndo={doc.canUndo} onUndo={doc.undo} onRetry={doc.retry} onRestore={doc.restoreMine} />
        <SureButton label="Usuń pytanie" aria={d.prompt} onConfirm={async () => {
          try { await call(`/korki/panel/quiz/${q.id}`, { method: "DELETE" }); onDeleted(); } catch { /* tost */ }
        }} />
        <button type="button" className="ed-tb ed-tb--quiet" onClick={() => { doc.flush(); onClose(); }}>Zwiń</button>
      </div>
    </div>
  );
}

function NewQ({ levels, level, onCreated, onCancel, onDraft, sort }: { levels: Offer["levels"]; level: string | null; onCreated: (q: Q) => void; onCancel: () => void; onDraft: (d: Draft) => void; sort: number }) {
  const call = usePanelApi();
  const { toast } = usePanel();
  const [d, setD] = React.useState<Draft>({ level_key: level, prompt: "", options: ["", "", "", ""], correct_index: 0, explanation: null, sort, active: true });
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => { onDraft(d); }, [d, onDraft]);
  const ready = !!d.level_key && !!d.prompt.trim() && optsOk(d.options);
  return (
    <form className="tk-editor tk-editor--new" onSubmit={async (e) => {
      e.preventDefault();
      if (!ready) return;
      setBusy(true);
      try {
        const q = await call<Q>("/korki/panel/quiz", { body: body(d) });
        toast("Pytanie dopisane do quizu.");
        onCreated(q);
      } catch { /* tost */ } finally { setBusy(false); }
    }}>
      <p className="ed-kicker">Nowe pytanie</p>
      <QFields d={d} levels={levels} set={(p) => setD((x) => ({ ...x, ...p }))} />
      <div className="tk-editor__foot">
        <span className="ed-note">{ready ? "Gotowe do zapisu." : "Poziom, pytanie i co najmniej dwie różne odpowiedzi."}</span>
        <button type="button" className="ed-tb ed-tb--quiet" onClick={onCancel}>Anuluj</button>
        <button type="submit" className="ed-btn" disabled={!ready || busy}>{busy ? <i className="spinner" /> : "Dopisz do quizu"}</button>
      </div>
    </form>
  );
}

function QuizBoard({ d, levels, n, total }: { d: Draft | null; levels: Offer["levels"]; n: number; total: number }) {
  const [reveal, setReveal] = React.useState(true);
  const level = levels.find((l) => l.key === d?.level_key)?.name || d?.level_key;
  const id = d?.id ?? 0;
  return (
    <>
      <div className="tk-board__bar"><p className="ed-kicker">Tak to widać w quizie</p></div>
      <div className="tk-board qa-board">
        <Slate className="quiz" label="Podgląd pytania na tablicy" tray={d ? (
          <div className="dt__tray"><button type="button" className="ck-btn" aria-pressed={reveal} onClick={() => setReveal((v) => !v)}>{reveal ? "Zetrzyj zaznaczenie" : "Zaznacz poprawną"}</button></div>
        ) : null}>
          {!d ? (
            <div className="dt__empty"><p className="dt__empty-big ck">Quiz czeka na pytania</p><p className="ck-soft dt__empty-sub">Bez pytań sekcja pokazuje zaproszenie do rezerwacji.</p></div>
          ) : (
            <div className="qz__sheet" key={id}>
              <p className="qz__count ck">Pytanie {n}<span className="ck-soft"> / {total}</span></p>
              {level ? <p className="ck-label">{level}</p> : null}
              <p className="qz__q ck cw">{d.prompt || "Treść pytania…"}</p>
              <div className="qz__opts">
                {d.options.map((o, i) => (
                  <span key={i} className={`qz__opt ck-choice ${reveal && d.correct_index === i ? "is-on" : ""}`}>
                    <span className="qz__key" aria-hidden="true">{i + 1}</span>
                    <span className="qz__otxt ck">{o || "…"}</span>
                    <ChalkRing v={id + i} />
                  </span>
                ))}
              </div>
              {reveal && d.explanation ? <p className="ck ck-soft qa-expl">{d.explanation}</p> : null}
            </div>
          )}
        </Slate>
      </div>
      <p className="ed-note">Kolejność: rozdziały idą od najłatwiejszego poziomu w ofercie, w rozdziale — jak na liście.</p>
    </>
  );
}

/* Rozdział (poziom): wiersze z przeciąganiem; puszczenie przelicza `sort` i zapisuje zmienione. */
function Chapter({ title, items, open, onOpen, render, onReorder }: {
  title: string; items: Q[]; open: number | "new" | null; onOpen: (q: Q | null) => void; render: (q: Q) => React.ReactNode; onReorder: (list: Q[]) => void;
}) {
  const { listRef, handle } = useReorder((from, to) => onReorder(moveItem(items, from, to)));
  return (
    <section className="qa-ch">
      <h3 className="qa-ch__t">{title} <span>{items.length}</span></h3>
      <div ref={listRef} className="qa-list">
        {items.map((q, i) => {
          const isOpen = open === q.id;
          return (
            <div key={q.id} data-row="" className={`tk-entry qa-entry ${isOpen ? "is-open" : ""} ${q.active ? "" : "is-off"}`}>
              <div className="qa-entry__row">
                <button type="button" className="ed-grip" {...handle(i, q.prompt)}><Grip /></button>
                <button type="button" className="tk-entry__b" aria-expanded={isOpen} onClick={() => onOpen(isOpen ? null : q)}>
                  <span className="tk-entry__n">{i + 1}.</span>
                  <span className="tk-entry__t">{q.prompt}</span>
                  <span className="tk-entry__lead" aria-hidden="true" />
                  <span className="tk-entry__d">{LETTERS[q.correct_index]} ✓</span>
                  <span className="tk-entry__m">{q.options.map((o, k) => `${LETTERS[k]}) ${o}`).join(" · ")}{q.active ? "" : " · ukryte"}</span>
                </button>
              </div>
              {isOpen ? render(q) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function QuizView() {
  const call = usePanelApi();
  const { toast } = usePanel();
  const { data, loading, reload, setData } = useLoad<List<Q>>("/korki/panel/quiz?limit=500");
  const offer = useLoad<{ value: Offer }>("/korki/panel/settings/offer");
  const levels = React.useMemo(() => offer.data?.value.levels || [], [offer.data]);
  const [open, setOpen] = React.useState<number | "new" | null>(null);
  const [lvl, setLvl] = React.useState<string>("all");
  const [live, setLive] = React.useState<Draft | null>(null);
  const rows = React.useMemo(() => data?.rows || [], [data]);
  const synced = React.useCallback((q: Q) => setData((d) => (d ? { ...d, rows: d.rows.map((x) => (x.id === q.id ? q : x)) } : d)), [setData]);
  const onDraft = React.useCallback((d: Draft) => setLive(d), []);

  /* rozdziały: poziomy z oferty (kolejność trudności), potem klucze spoza oferty */
  const chapters = React.useMemo(() => {
    const keys = [...levels.map((l) => l.key), ...[...new Set(rows.map((q) => q.level_key || ""))].filter((k) => !levels.some((l) => l.key === k))];
    return keys
      .map((k) => ({ key: k, title: levels.find((l) => l.key === k)?.name || (k ? `${k} (poza ofertą)` : "Bez poziomu"), items: rows.filter((q) => (q.level_key || "") === k) }))
      .filter((c) => c.items.length);
  }, [levels, rows]);
  const unknown = chapters.filter((c) => c.key && !levels.some((l) => l.key === c.key));
  const shownCh = lvl === "all" ? chapters : chapters.filter((c) => c.key === lvl);
  const flat = chapters.flatMap((c) => c.items);
  const openQ = typeof open === "number" ? flat.find((q) => q.id === open) : null;
  const preview: Draft | null = open != null && live ? live : flat[0] || null;
  const pos = openQ ? flat.indexOf(openQ) + 1 : 1;

  const reorder = async (list: Q[]) => {
    const changed = list.map((q, i) => ({ q, sort: (i + 1) * 10 })).filter(({ q, sort }) => q.sort !== sort);
    setData((d) => (d ? { ...d, rows: d.rows.map((x) => { const k = list.findIndex((y) => y.id === x.id); return k >= 0 ? { ...x, sort: (k + 1) * 10 } : x; }).sort((a, b) => a.sort - b.sort) } : d));
    try {
      for (const { q, sort } of changed) await call(`/korki/panel/quiz/${q.id}`, { method: "PATCH", body: { sort, version: q.version }, quiet: true });
      toast("Kolejność zapisana.");
    } catch {
      toast("Nie udało się zapisać kolejności — wczytuję listę od nowa.", "err");
    }
    reload();
  };

  if (loading && !data) return <div className="pn-page ed tk"><Skel rows={10} /></div>;
  if (!data) return <div className="pn-page ed tk"><LoadError what="pytań quizu" onRetry={reload} /></div>;

  const maxSort = Math.max(0, ...rows.filter((q) => (q.level_key || "") === (lvl === "all" ? levels[0]?.key || "" : lvl)).map((q) => q.sort));
  const editor = (q: Q) => (
    <QEditor key={q.id} q={q} levels={levels} onSynced={synced} onDraft={onDraft} onClose={() => setOpen(null)}
      onDeleted={() => { setOpen(null); toast("Pytanie usunięte."); setData((d) => (d ? { rows: d.rows.filter((x) => x.id !== q.id), total: d.total - 1 } : d)); }} />
  );

  return (
    <div className="pn-page ed tk">
      <div className="ed-split">
        <div className="ed-doc">
          <header className="ed-doc__head tk-head">
            <div>
              <p className="ed-kicker">Quiz · {rows.length} {rows.length === 1 ? "pytanie" : rows.length % 10 >= 2 && rows.length % 10 <= 4 && (rows.length % 100 < 10 || rows.length % 100 >= 20) ? "pytania" : "pytań"} w {chapters.length} {chapters.length === 1 ? "rozdziale" : "rozdziałach"}</p>
              <p className="ed-doc__lede">Kliknij pytanie, żeby edytować w miejscu. Kropki po lewej — zmiana kolejności.</p>
            </div>
            <button type="button" className="ed-btn" onClick={() => { setOpen("new"); setLive(null); }} disabled={open === "new"}>+ Nowe pytanie</button>
          </header>

          {unknown.length && levels.length ? (
            <p className="tk-miss tk-warn" role="note">
              Część pytań ma poziom, którego nie ma w ofercie ({unknown.map((c) => c.key).join(", ")}). Quiz je pokaże, ale poleca tylko poziomy z oferty — dodaj poziom o tym kluczu w Ofercie albo zmień poziom pytań.
            </p>
          ) : null}

          {open === "new" ? (
            <NewQ levels={levels} level={lvl === "all" ? levels[0]?.key || null : lvl} sort={maxSort + 10} onDraft={onDraft} onCancel={() => setOpen(null)}
              onCreated={(q) => { setData((d) => (d ? { rows: [...d.rows, q], total: d.total + 1 } : d)); setOpen(q.id); }} />
          ) : null}

          {rows.length === 0 && open !== "new" ? (
            <Blank art="board" kicker="Quiz jest pusty" title="Bez pytań quiz na stronie tylko zaprasza na lekcję" body="Zestaw startowy dodaje 12 pytań z matematyki z kluczami poziomów: podstawowka, liceum, matura_rozszerzona." onArt={() => setOpen("new")}>
              <StarterButton kind="quiz" onDone={reload} />
              <button type="button" className="ed-tb" onClick={() => setOpen("new")}>Napisz własne</button>
            </Blank>
          ) : rows.length ? (
            <>
              {chapters.length > 1 ? (
                <div className="tk-tools">
                  <div className="ed-seg qa-seg" role="tablist" aria-label="Rozdział">
                    <button type="button" role="tab" aria-selected={lvl === "all"} onClick={() => setLvl("all")}>Wszystkie <b className="tk-count">{rows.length}</b></button>
                    {chapters.map((c) => <button key={c.key} type="button" role="tab" aria-selected={lvl === c.key} onClick={() => setLvl(c.key)}>{c.title.split(" (")[0]} <b className="tk-count">{c.items.length}</b></button>)}
                  </div>
                </div>
              ) : null}
              {shownCh.map((c) => (
                <Chapter key={c.key} title={c.title} items={c.items} open={open} render={editor}
                  onOpen={(q) => { setOpen(q ? q.id : null); setLive(q); }}
                  onReorder={reorder} />
              ))}
              <div className="tk-foot"><StarterButton kind="quiz" onDone={reload} /></div>
            </>
          ) : null}
        </div>

        <SideBoard label="Podgląd w quizie">
          <QuizBoard d={preview} levels={levels} n={pos} total={flat.length} />
        </SideBoard>
      </div>
    </div>
  );
}
