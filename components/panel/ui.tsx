"use client";

import React from "react";
import { createPortal } from "react-dom";
import { api, ApiError } from "@/lib/api";

/* ── sesja panelu ─────────────────────────────────────────────────────────── */
export type Session = { token: string; expires_at: string };
const KEY = "kk-panel";

export function loadSession(): Session | null {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || "null") as Session | null;
    if (!s?.token || new Date(s.expires_at).getTime() < Date.now()) return null;
    return s;
  } catch {
    return null;
  }
}
export function saveSession(s: Session | null) {
  try {
    if (s) localStorage.setItem(KEY, JSON.stringify(s));
    else localStorage.removeItem(KEY);
  } catch { /* tryb prywatny — sesja żyje do odświeżenia */ }
}

export type ToastAction = { label: string; run: () => void };
type Ctx = {
  token: string;
  logout: () => void;
  toast: (msg: string, kind?: "ok" | "err", action?: ToastAction) => void;
  /* odświeża liczniki w powłoce (kropki na szynie / pasku) — wołaj po zmianie statusu */
  refresh?: () => void;
};
export const PanelCtx = React.createContext<Ctx | null>(null);
export const usePanel = () => {
  const c = React.useContext(PanelCtx);
  if (!c) throw new Error("PanelCtx");
  return c;
};

/* Zapytanie panelu: 401 wylogowuje, błąd idzie do tostu i dalej (żeby widok mógł zareagować). */
export function usePanelApi() {
  const { token, logout, toast } = usePanel();
  return React.useCallback(
    async <T,>(path: string, opts: { method?: string; body?: unknown; quiet?: boolean } = {}): Promise<T> => {
      try {
        return await api<T>(path, { ...opts, token });
      } catch (e) {
        const err = e as ApiError;
        if (err.status === 401) logout();
        if (!opts.quiet) toast(err.message, "err");
        throw e;
      }
    },
    [token, logout, toast],
  );
}

/* Odczyt z odświeżaniem: { data, loading, reload }. */
export function useLoad<T>(path: string | null) {
  const call = usePanelApi();
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [n, setN] = React.useState(0);
  React.useEffect(() => {
    if (!path) return;
    let alive = true;
    setLoading(true);
    call<T>(path, { quiet: true })
      .then((d) => { if (alive) setData(d); })
      .catch(() => { if (alive) setData(null); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [path, n, call]);
  return { data, setData, loading, reload: () => setN((x) => x + 1) };
}

/* ── klocki ───────────────────────────────────────────────────────────────── */
export function Toggle({ on, onChange, label, hint }: { on: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <button type="button" className="pn-toggle" role="switch" aria-checked={on} onClick={() => onChange(!on)}>
      <span className="pn-toggle__track"><span className="pn-toggle__dot" /></span>
      <span className="pn-toggle__text">
        <b>{label}</b>
        {hint ? <small>{hint}</small> : null}
      </span>
    </button>
  );
}

export function Field({ label, children, hint, wide }: { label: string; children: React.ReactNode; hint?: string; wide?: boolean }) {
  return (
    <label className={`field pn-field ${wide ? "pn-field--wide" : ""}`}>
      <span>{label}</span>
      {children}
      {hint ? <small className="pn-hint">{hint}</small> : null}
    </label>
  );
}

type EmptyArt = "target" | "calendar" | "inbox" | "star";
const EMPTY_ART: Record<EmptyArt, React.ReactNode> = {
  target: <><path className="s" d="M4 62h112" /><g className="o"><circle className="d" cx="60" cy="30" r="20" /><circle className="d" cx="60" cy="30" r="11" /><circle className="d" cx="60" cy="30" r="2.5" /></g><path className="d" d="M96 8 64 28M96 8l-1 8M96 8l-8 1" /></>,
  calendar: <><path className="s" d="M4 66h112" /><g className="o"><rect className="d" x="34" y="12" width="52" height="44" rx="6" /><path className="d" d="M34 24h52M46 6v10M74 6v10" /></g><path className="d" d="M48 40l7 7 14-14" /></>,
  inbox: <><path className="s" d="M4 64h112" /><g className="o"><path className="d" d="M30 18h60v34H30z" /><path className="d" d="M31 19l29 22 29-22" /></g><path className="d" d="M96 10q8 6 2 14" /></>,
  star: <><path className="s" d="M4 64h112" /><g className="o"><path className="d" d="M60 8l7 14 15 2-11 11 3 15-14-7-14 7 3-15-11-11 15-2z" /></g></>,
};
export function Empty({ title, body, action, art = "target" }: { title: string; body?: string; action?: React.ReactNode; art?: EmptyArt }) {
  return (
    <div className="pn-empty">
      <div className="pn-empty__art" aria-hidden="true"><svg viewBox="0 0 120 72">{EMPTY_ART[art]}</svg></div>
      <b>{title}</b>
      {body ? <p>{body}</p> : null}
      {action}
    </div>
  );
}

export function Confirm({ label, onConfirm, danger = true, small = true }: { label: string; onConfirm: () => void; danger?: boolean; small?: boolean }) {
  const [armed, setArmed] = React.useState(false);
  React.useEffect(() => {
    if (!armed) return;
    const t = window.setTimeout(() => setArmed(false), 3500);
    return () => window.clearTimeout(t);
  }, [armed]);
  return (
    <button
      type="button"
      className={`pn-tbtn pn-confirm ${armed && danger ? "pn-tbtn--danger" : "pn-tbtn--mute"}`}
      data-armed={armed ? "1" : "0"}
      data-small={small ? "1" : undefined}
      onClick={() => (armed ? (setArmed(false), onConfirm()) : setArmed(true))}
      aria-live="polite"
    >
      {/* obie etykiety w jednej komórce siatki — szerokość przycisku się nie zmienia */}
      <span aria-hidden={armed}>{label}</span>
      <span aria-hidden={!armed}>Na pewno?</span>
    </button>
  );
}

export function SaveBar({ dirty, busy, onSave, onReset }: { dirty: boolean; busy: boolean; onSave: () => void; onReset: () => void }) {
  return (
    <div className={`pn-savebar ${dirty ? "is-dirty" : ""}`} aria-hidden={!dirty}>
      <span>Masz niezapisane zmiany</span>
      <button type="button" className="btn btn--sm btn--ghost" onClick={onReset} disabled={busy} tabIndex={dirty ? 0 : -1}>Cofnij</button>
      <button type="button" className="btn btn--sm btn--primary" onClick={onSave} disabled={busy} tabIndex={dirty ? 0 : -1}>{busy ? <i className="spinner" /> : "Zapisz"}</button>
    </div>
  );
}

/* Dokument ustawień z wersją: edycja lokalna, zapis z `version`, konflikt → odświeżenie. */
export function useSettingsDoc<T>(key: "offer" | "content" | "booking") {
  const call = usePanelApi();
  const { toast } = usePanel();
  const { data, loading, reload } = useLoad<{ key: string; value: T; version: number }>(`/korki/panel/settings/${key}`);
  const [draft, setDraft] = React.useState<T | null>(null);
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => { if (data) setDraft(structuredClone(data.value)); }, [data]);
  const dirty = !!data && !!draft && JSON.stringify(data.value) !== JSON.stringify(draft);
  const save = async () => {
    if (!data || !draft) return;
    setBusy(true);
    try {
      await call(`/korki/panel/settings/${key}`, { method: "PUT", body: { value: draft, version: data.version } });
      toast("Zapisane — strona pokaże zmiany w ciągu minuty.");
      reload();
    } catch (e) {
      if ((e as ApiError).status === 409) reload();
    } finally {
      setBusy(false);
    }
  };
  const reset = () => data && setDraft(structuredClone(data.value));
  return { draft, setDraft, loading, dirty, busy, save, reset };
}

export const slug = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ł/g, "l").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40) || "poziom";

export const gr = (zl: string) => {
  const v = parseFloat(zl.replace(",", "."));
  return Number.isFinite(v) && v > 0 ? Math.round(v * 100) : 0;
};
export const toZl = (g: number | undefined) => (g ? String(g / 100).replace(".", ",") : "");

/* ══ prymitywy nowego języka ════════════════════════════════════════════════ */

/* Zakładki z podkreśleniem (zamiast chipów). */
export function Tabs<K extends string>({ items, value, onChange, label }: { items: { id: K; label: string; count?: number }[]; value: K; onChange: (id: K) => void; label: string }) {
  return (
    <div className="pn-tabs" role="tablist" aria-label={label}>
      {items.map((t) => (
        <button key={t.id} type="button" role="tab" aria-selected={value === t.id} onClick={() => onChange(t.id)}>
          {t.label}{t.count ? <b>{t.count}</b> : null}
        </button>
      ))}
    </div>
  );
}

/* Szkielet ładowania: kilka wierszy w liniach, bez pudełek. */
export function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="pn-rows" aria-busy="true" aria-label="Wczytuję">
      {Array.from({ length: rows }).map((_, i) => <span key={i} className="pn-skel--row" style={{ opacity: 1 - i * 0.22 }} />)}
    </div>
  );
}

/* Edycja w miejscu: wygląda jak tekst, staje się polem po kliknięciu.
   onChange na każdą zmianę — debounce robi autozapis. Esc przywraca wartość sprzed edycji, Enter kończy (jednoliniowe). */
export function InlineEdit({
  value, onChange, label, placeholder, multiline = false, numeric = false, suffix, className = "", maxLength,
}: {
  value: string; onChange: (v: string) => void; label: string; placeholder?: string; multiline?: boolean; numeric?: boolean; suffix?: string; className?: string; maxLength?: number;
}) {
  const before = React.useRef(value);
  const common = {
    "aria-label": label,
    placeholder,
    maxLength,
    value,
    className: `pn-edit ${numeric ? "pn-edit--num" : ""} ${className}`,
    onFocus: () => { before.current = value; },
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (e.key === "Escape") { onChange(before.current); (e.currentTarget as HTMLElement).blur(); }
      if (e.key === "Enter" && !multiline) (e.currentTarget as HTMLElement).blur();
    },
  };
  const field = multiline ? (
    <textarea {...common} rows={2} onChange={(e) => onChange(e.target.value)} />
  ) : (
    <input {...common} inputMode={numeric ? "decimal" : undefined} onChange={(e) => onChange(e.target.value)} />
  );
  return suffix ? <span className="pn-edit__wrap">{field}<span className="pn-edit__suffix">{suffix}</span></span> : field;
}

/* ── arkusz: od dołu na telefonie (przeciągnij w dół, by zamknąć), z prawej na webie ── */
export function Sheet({
  open, onClose, title, kicker, children, foot, wide = false,
}: { open: boolean; onClose: () => void; title: string; kicker?: string; children: React.ReactNode; foot?: React.ReactNode; wide?: boolean }) {
  const [mounted, setMounted] = React.useState(open);
  const [out, setOut] = React.useState(false);
  const ref = React.useRef<HTMLElement>(null);
  const back = React.useRef<HTMLElement | null>(null);
  const closeRef = React.useRef(onClose);
  closeRef.current = onClose;
  const id = React.useId();

  React.useEffect(() => {
    if (open) { setMounted(true); setOut(false); return; }
    if (!mounted) return;
    setOut(true);
    const t = window.setTimeout(() => { setMounted(false); setOut(false); }, 260);
    return () => window.clearTimeout(t);
  }, [open, mounted]);

  React.useEffect(() => {
    if (!mounted) return;
    back.current = document.activeElement as HTMLElement | null;
    const el = ref.current;
    el?.focus({ preventScroll: true });
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
      if (e.key === "Tab" && el) {
        const f = el.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([disabled]),textarea,select,[tabindex]:not([tabindex="-1"])');
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("keydown", key);
      document.body.style.overflow = prev;
      back.current?.focus?.({ preventScroll: true });
    };
  }, [mounted]);

  /* przeciąganie w dół (tylko telefon): transform bez transition, puszczenie > 90 px zamyka */
  const drag = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el || !window.matchMedia("(max-width: 900px)").matches) return;
    if ((e.target as HTMLElement).closest("button,a,input,textarea,select")) return;
    const y0 = e.clientY, t0 = performance.now();
    let dy = 0;
    el.style.animation = "none";
    el.style.transition = "none";
    const move = (ev: PointerEvent) => { dy = Math.max(0, ev.clientY - y0); el.style.transform = `translateY(${dy}px)`; };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      const fast = dy / Math.max(1, performance.now() - t0) > 0.6;
      el.style.transition = "transform 280ms cubic-bezier(.16,1,.3,1)";
      if (dy > 90 || (fast && dy > 24)) {
        el.style.transform = "translateY(100%)";
        window.setTimeout(() => closeRef.current(), 200);
      } else {
        el.style.transform = "";
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };

  if (!mounted || typeof document === "undefined") return null;
  return createPortal(
    <>
      <div className={`pn-sheet-scrim ${out ? "is-out" : ""}`} onClick={onClose} aria-hidden="true" />
      <section
        ref={ref}
        className={`pn-sheet ${wide ? "pn-sheet--wide" : ""} ${out ? "is-out" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        tabIndex={-1}
      >
        <div className="pn-sheet__grab" onPointerDown={drag} aria-hidden="true" />
        <header className="pn-sheet__head" onPointerDown={drag}>
          <div>
            {kicker ? <span className="pn-kicker">{kicker}</span> : null}
            <h2 id={id}>{title}</h2>
          </div>
          <button type="button" className="pn-icon" onClick={onClose} aria-label="Zamknij">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </header>
        <div className="pn-sheet__body">{children}</div>
        {foot ? <footer className="pn-sheet__foot">{foot}</footer> : null}
      </section>
    </>,
    document.body,
  );
}

/* „Na pewno?” jako arkusz — dla działań, których nie da się cofnąć. */
export function Ask({
  open, title, body, confirm, danger = false, busy = false, onConfirm, onClose,
}: { open: boolean; title: string; body?: React.ReactNode; confirm: string; danger?: boolean; busy?: boolean; onConfirm: () => void; onClose: () => void }) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      kicker="Na pewno?"
      title={title}
      foot={
        <>
          <button type="button" className="pn-tbtn pn-tbtn--mute" onClick={onClose}>Zostaw</button>
          <button type="button" className={`pn-btn ${danger ? "pn-btn--danger" : ""}`} onClick={onConfirm} disabled={busy}>
            {busy ? <i className="spinner" /> : confirm}
          </button>
        </>
      }
    >
      <div className="pn-ask">{typeof body === "string" ? <p>{body}</p> : body}</div>
    </Sheet>
  );
}

/* ── działanie z „Cofnij”: wykonuje się po kilku sekundach, chyba że ktoś cofnie ──
   Kolejka żyje poza komponentem: przejście do innej zakładki nie gubi decyzji,
   a zamknięcie karty wysyła zaległe od razu. */
const pending = new Map<number, () => void>();
let flushBound = false;
function bindFlush() {
  if (flushBound || typeof window === "undefined") return;
  flushBound = true;
  window.addEventListener("pagehide", () => { pending.forEach((run) => run()); pending.clear(); });
}
export function useUndoable() {
  const { toast } = usePanel();
  return React.useCallback(
    ({ msg, run, undo, delay = 5000 }: { msg: string; run: () => unknown; undo?: () => void; delay?: number }) => {
      bindFlush();
      const key = performance.now() + Math.random();
      const fire = () => { if (pending.delete(key)) void run(); };
      pending.set(key, fire);
      const t = window.setTimeout(fire, delay);
      toast(msg, "ok", {
        label: "Cofnij",
        run: () => { window.clearTimeout(t); pending.delete(key); undo?.(); },
      });
    },
    [toast],
  );
}

/* ── autozapis dokumentu ustawień ───────────────────────────────────────── */
export type SaveStateKind = "idle" | "saving" | "saved" | "error" | "conflict";

export function SaveState({ state, onUndo, canUndo = false }: { state: SaveStateKind; onUndo?: () => void; canUndo?: boolean }) {
  const text: Record<SaveStateKind, string> = {
    idle: "Zmiany zapisują się same",
    saving: "Zapisuję…",
    saved: "Zapisane · strona za ok. minutę",
    error: "Nie zapisało się — spróbuję przy następnej zmianie",
    conflict: "Wczytałem nowszą wersję",
  };
  return (
    <span className="pn-savestate" data-state={state}>
      <i aria-hidden="true" />
      <span role="status" aria-live="polite">{text[state]}</span>
      {canUndo && onUndo && state !== "saving" ? <button type="button" className="pn-tbtn pn-tbtn--accent" onClick={onUndo}>Cofnij</button> : null}
    </span>
  );
}

/* Dokument z `version`: każda zmiana → zapis po `delay` ms ciszy. 409 → wczytanie najnowszej wersji i tost.
   `undo()` cofa ostatnią porcję zmian (od ostatniego zapisu) i od razu zapisuje. */
export function useAutosaveDoc<T>(key: "offer" | "content" | "booking", delay = 900) {
  const call = usePanelApi();
  const { toast } = usePanel();
  const { data, loading, reload } = useLoad<{ key: string; value: T; version: number }>(`/korki/panel/settings/${key}`);
  const [draft, setDraftState] = React.useState<T | null>(null);
  const [state, setState] = React.useState<SaveStateKind>("idle");
  const [undoDepth, setUndoDepth] = React.useState(0);
  const draftRef = React.useRef<T | null>(null);
  const version = React.useRef(0);
  const savedJson = React.useRef("");
  const history = React.useRef<T[]>([]);
  const batch = React.useRef(false);
  const timer = React.useRef<number | undefined>(undefined);
  const inflight = React.useRef(false);

  React.useEffect(() => {
    if (!data) return;
    version.current = data.version;
    savedJson.current = JSON.stringify(data.value);
    const v = structuredClone(data.value);
    draftRef.current = v;
    setDraftState(v);
  }, [data]);

  const save = React.useCallback(async (): Promise<void> => {
    window.clearTimeout(timer.current);
    batch.current = false;
    const d = draftRef.current;
    if (!d) return;
    const json = JSON.stringify(d);
    if (json === savedJson.current) { setState((s) => (s === "saving" ? "saved" : s)); return; }
    if (inflight.current) { timer.current = window.setTimeout(() => void save(), 300); return; }
    inflight.current = true;
    setState("saving");
    try {
      const r = await call<{ value: T; version: number }>(`/korki/panel/settings/${key}`, { method: "PUT", body: { value: d, version: version.current }, quiet: true });
      version.current = r.version;
      savedJson.current = json;
      setState(JSON.stringify(draftRef.current) === json ? "saved" : "saving");
    } catch (e) {
      const err = e as ApiError;
      if (err.status === 409) {
        setState("conflict");
        history.current = [];
        setUndoDepth(0);
        toast("Ktoś zmienił te ustawienia w międzyczasie — wczytałem najnowszą wersję.", "err");
        reload();
      } else {
        setState("error");
        toast(err.message, "err");
      }
    } finally {
      inflight.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [call, key, toast]);

  const setDraft = React.useCallback((next: T | ((prev: T) => T)) => {
    const prev = draftRef.current;
    if (!prev) return;
    const v = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
    if (!batch.current) {
      history.current = [...history.current.slice(-29), prev];
      setUndoDepth(history.current.length);
      batch.current = true;
    }
    draftRef.current = v;
    setDraftState(v);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void save(), delay);
  }, [delay, save]);

  const undo = React.useCallback(() => {
    const prev = history.current.pop();
    setUndoDepth(history.current.length);
    if (!prev) return;
    batch.current = false;
    draftRef.current = prev;
    setDraftState(prev);
    void save();
  }, [save]);

  /* wyjście z widoku z niezapisaną zmianą → zapis od razu */
  const saveRef = React.useRef(save);
  saveRef.current = save;
  React.useEffect(() => () => { if (batch.current) void saveRef.current(); }, []);

  return { draft, setDraft, loading, state, undo, canUndo: undoDepth > 0, flush: save, reload };
}
