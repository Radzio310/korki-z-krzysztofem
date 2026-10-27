"use client";

import React from "react";
import { createPortal } from "react-dom";
import type { ApiError } from "@/lib/api";
import { Sheet, usePanel } from "../ui";
import "./kit.css";

/* Wspólne klocki widoków edycji (Oferta, Treści, Dostępność, Zadania, Quiz):
   autozapis z Cofnij, edycja w miejscu, przeciąganie kolejności, żywy podgląd strony. */

/* ── autozapis ─────────────────────────────────────────────────────────────── */

export type SaveKind = "idle" | "pending" | "saving" | "saved" | "error" | "conflict";
export type SaveState = { kind: SaveKind; at?: Date; msg?: string };
type Doc<T> = { value: T; version?: number };

/**
 * Dokument edytowany na żywo: zmiana → po `delay` ms zapis (jeden naraz, kolejne doganiają),
 * 409 → wczytuję najnowszą wersję i mówię o tym (z „Wstaw moją zmianę”), Cofnij = poprzedni
 * zapisany stan (stos), wyjście z widoku z niezapisaną zmianą = zapis od razu.
 * `clean(draft, saved)` decyduje, co idzie na serwer (np. bez niedokończonych pozycji).
 */
export function useAutosave<T>(opts: {
  load: () => Promise<Doc<T>>;
  save: (value: T, version: number | undefined) => Promise<Doc<T>>;
  clean?: (draft: T, saved: T | null) => T;
  delay?: number;
  conflict?: string;
}) {
  const { toast } = usePanel();
  const o = React.useRef(opts);
  o.current = opts;
  const [draft, setDraftState] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [failed, setFailed] = React.useState<string | null>(null);
  const [state, setState] = React.useState<SaveState>({ kind: "idle" });
  const [undoDepth, setUndoDepth] = React.useState(0);
  const s = React.useRef({
    base: "", saved: null as T | null, version: undefined as number | undefined, draft: null as T | null,
    timer: 0, saving: false, again: false, stack: [] as T[], skipPush: false, lost: null as T | null, alive: true,
  });

  const clean = React.useCallback((v: T) => (o.current.clean ? o.current.clean(v, s.current.saved) : v), []);

  const fetchDoc = React.useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    setFailed(null);
    try {
      const d = await o.current.load();
      const st = s.current;
      st.version = d.version;
      st.saved = d.value;
      st.base = JSON.stringify(clean(d.value));
      st.draft = d.value;
      if (st.alive) setDraftState(d.value);
      return true;
    } catch (e) {
      if (s.current.alive) setFailed((e as Error).message || "Nie udało się wczytać.");
      return false;
    } finally {
      if (s.current.alive) setLoading(false);
    }
  }, [clean]);

  React.useEffect(() => {
    s.current.alive = true;
    fetchDoc();
    return () => { s.current.alive = false; };
  }, [fetchDoc]);

  const flush = React.useCallback(async (): Promise<void> => {
    const st = s.current;
    window.clearTimeout(st.timer);
    if (!st.draft) return;
    if (st.saving) { st.again = true; return; }
    const value = clean(st.draft);
    const json = JSON.stringify(value);
    if (json === st.base) {
      if (st.alive) setState((x) => (x.kind === "pending" ? { kind: "saved", at: x.at } : x));
      return;
    }
    st.saving = true;
    if (st.alive) setState((x) => ({ kind: "saving", at: x.at }));
    const prev = st.saved;
    try {
      const res = await o.current.save(value, st.version);
      st.version = res.version;
      /* Bazą jest to, co wysłałem — serwer normalizuje (sortuje, przycina), a porównanie z jego
         wersją dawałoby wieczną „zmianę”. */
      st.base = json;
      st.saved = value;
      if (!st.skipPush && prev) {
        st.stack.push(prev);
        if (st.stack.length > 30) st.stack.shift();
      }
      st.skipPush = false;
      if (st.alive) {
        setUndoDepth(st.stack.length);
        setState({ kind: "saved", at: new Date() });
      }
    } catch (e) {
      const err = e as ApiError;
      st.again = false;
      st.skipPush = false;
      if (err.status === 409) {
        st.lost = st.draft;
        st.stack = [];
        await fetchDoc(true);
        if (st.alive) {
          setUndoDepth(0);
          const msg = o.current.conflict || "Ktoś zmienił to w innym oknie — pokazuję najnowszą wersję.";
          setState({ kind: "conflict", msg });
          toast(msg, "err");
        }
      } else if (st.alive) {
        setState({ kind: "error", msg: err.message || "Nie udało się zapisać." });
      }
    } finally {
      st.saving = false;
      if (st.again) { st.again = false; void flush(); }
    }
  }, [clean, fetchDoc, toast]);

  const set = React.useCallback((next: T | ((d: T) => T)) => {
    const st = s.current;
    if (!st.draft) return;
    const v = typeof next === "function" ? (next as (d: T) => T)(st.draft) : next;
    st.draft = v;
    setDraftState(v);
    window.clearTimeout(st.timer);
    if (JSON.stringify(clean(v)) === st.base) {
      setState((x) => (x.kind === "pending" ? { kind: x.at ? "saved" : "idle", at: x.at } : x));
      return;
    }
    setState((x) => ({ kind: "pending", at: x.at }));
    st.timer = window.setTimeout(() => void flush(), o.current.delay ?? 900);
  }, [clean, flush]);

  /* Cofnij: najpierw porzuca niezapisaną porcję, potem schodzi po stosie zapisanych stanów. */
  const undo = React.useCallback(() => {
    const st = s.current;
    if (!st.draft) return;
    window.clearTimeout(st.timer);
    if (JSON.stringify(clean(st.draft)) !== st.base && st.saved) {
      st.draft = st.saved;
      setDraftState(st.saved);
      setState((x) => ({ kind: x.at ? "saved" : "idle", at: x.at }));
      return;
    }
    const prev = st.stack.pop();
    if (!prev) return;
    setUndoDepth(st.stack.length);
    st.skipPush = true;
    st.draft = prev;
    setDraftState(prev);
    void flush();
  }, [clean, flush]);

  const restoreMine = React.useCallback(() => {
    const lost = s.current.lost;
    s.current.lost = null;
    if (lost) set(lost);
  }, [set]);

  /* Wyjście z widoku / zamknięcie karty: niezapisana zmiana idzie od razu. */
  React.useEffect(() => {
    const st = s.current;
    const dirty = () => !!st.draft && (st.saving || JSON.stringify(clean(st.draft)) !== st.base);
    const onLeave = (e: BeforeUnloadEvent) => {
      if (!dirty()) return;
      void flush();
      e.preventDefault();
    };
    const onHide = () => { if (document.visibilityState === "hidden" && dirty()) void flush(); };
    window.addEventListener("beforeunload", onLeave);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("beforeunload", onLeave);
      document.removeEventListener("visibilitychange", onHide);
      if (st.draft && !st.saving && JSON.stringify(clean(st.draft)) !== st.base) {
        window.clearTimeout(st.timer);
        o.current.save(clean(st.draft), st.version).catch(() => { /* tost pokaże usePanelApi */ });
      }
    };
  }, [clean, flush]);

  return {
    draft, set, loading, failed, state, undo, canUndo: undoDepth > 0 || state.kind === "pending",
    flush, retry: () => void flush(), reload: () => fetchDoc(), restoreMine, hasLost: () => !!s.current.lost,
  };
}

/* Wysokość przyklejonego nagłówka powłoki → --ed-top (żeby nasze przyklejone paski stały pod nim). */
export function useShellTop() {
  React.useEffect(() => {
    const head = document.querySelector<HTMLElement>(".pn-head");
    const root = document.documentElement;
    if (!head) return;
    const upd = () => root.style.setProperty("--ed-top", `${Math.round(head.getBoundingClientRect().height)}px`);
    upd();
    const ro = new ResizeObserver(upd);
    ro.observe(head);
    return () => ro.disconnect();
  }, []);
}

const hhmm = (d: Date) => d.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });

/* Linia stanu zapisu. Czytnik ekranu słyszy tylko zdarzenia (zapisane / błąd / konflikt). */
export function SaveLine({ state, canUndo, onUndo, onRetry, onRestore, idle = "Zmiany zapisują się same" }: {
  state: SaveState; canUndo: boolean; onUndo: () => void; onRetry: () => void; onRestore?: () => void; idle?: string;
}) {
  useShellTop();
  const k = state.kind;
  const text =
    k === "pending" ? "Zmiana czeka na zapis…"
    : k === "saving" ? "Zapisuję…"
    : k === "saved" ? `Zapisane ${state.at ? hhmm(state.at) : ""}`
    : k === "error" ? `Nie zapisałem: ${state.msg}`
    : k === "conflict" ? state.msg
    : idle;
  const live = k === "saved" ? "Zapisane." : k === "error" ? `Błąd zapisu: ${state.msg}` : k === "conflict" ? state.msg : "";
  return (
    <div className={`ed-save ed-save--${k}`}>
      <span className="ed-save__dot" aria-hidden="true" />
      <span className="ed-save__txt">{text}</span>
      {k === "error" ? <button type="button" className="ed-tb ed-tb--accent" onClick={onRetry}>Spróbuj ponownie</button> : null}
      {k === "conflict" && onRestore ? <button type="button" className="ed-tb ed-tb--accent" onClick={onRestore}>Wstaw moją zmianę</button> : null}
      {canUndo && k !== "error" && k !== "conflict" ? <button type="button" className="ed-tb" onClick={onUndo}>Cofnij</button> : null}
      <span className="sr-only" aria-live="polite">{live}</span>
    </div>
  );
}

/* ── edycja w miejscu ──────────────────────────────────────────────────────── */

type InkProps = {
  value: string;
  onChange: (v: string) => void;
  label: string;
  placeholder?: string;
  multiline?: boolean;
  className?: string;
  maxLength?: number;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  type?: string;
  invalid?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  autoFocus?: boolean;
  id?: string;
  describedBy?: string;
};

/* Tekst, który jest polem: wygląda jak zwykły tekst dokumentu, linia przerywana zdradza edycję. */
export function Ink({ value, onChange, label, placeholder, multiline, className = "", maxLength, inputMode, type, invalid, onFocus, onBlur, autoFocus, id, describedBy }: InkProps) {
  const ref = React.useRef<HTMLTextAreaElement>(null);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value, multiline]);
  const common = {
    className: `ed-ink ${className}`,
    value,
    "aria-label": label,
    placeholder,
    maxLength,
    "aria-invalid": invalid || undefined,
    "aria-describedby": describedBy,
    onFocus,
    onBlur,
    autoFocus,
    id,
    spellCheck: true,
  };
  if (multiline) return <textarea ref={ref} rows={1} {...common} onChange={(e) => onChange(e.target.value)} />;
  return <input type={type || "text"} inputMode={inputMode} {...common} onChange={(e) => onChange(e.target.value)} />;
}

/* Przycisk „Usuń” w dwóch krokach (bez okien systemowych): drugi klik w ciągu 3,5 s potwierdza. */
export function SureButton({ label = "Usuń", sure = "Na pewno? Usuń", onConfirm, className = "", aria }: { label?: string; sure?: string; onConfirm: () => void; className?: string; aria?: string }) {
  const [armed, setArmed] = React.useState(false);
  React.useEffect(() => {
    if (!armed) return;
    const t = window.setTimeout(() => setArmed(false), 3500);
    return () => window.clearTimeout(t);
  }, [armed]);
  return (
    <button
      type="button"
      className={`ed-tb ${armed ? "ed-tb--danger is-armed" : "ed-tb--quiet"} ${className}`}
      aria-label={armed ? `${sure}${aria ? ` — ${aria}` : ""}` : aria ? `${label}: ${aria}` : label}
      onClick={() => (armed ? (setArmed(false), onConfirm()) : setArmed(true))}
    >
      {armed ? sure : label}
    </button>
  );
}

/* ── przeciąganie kolejności ───────────────────────────────────────────────── */

/**
 * Uchwyt przeciągania dla listy wierszy oznaczonych `data-row` w kontenerze `listRef`.
 * Wiersz jedzie za palcem/myszą (transform), sąsiedzi się rozsuwają, puszczenie = `onMove(from, to)`.
 * Klawiatura: strzałki na uchwycie przesuwają o jedno miejsce, fokus idzie za wierszem.
 */
export function useReorder(onMove: (from: number, to: number) => void) {
  const listRef = React.useRef<HTMLDivElement>(null);
  const cb = React.useRef(onMove);
  cb.current = onMove;
  const drag = React.useRef<{ from: number; to: number; y0: number; rows: HTMLElement[]; tops: number[]; mids: number[]; step: number } | null>(null);

  const rows = () => Array.from(listRef.current?.querySelectorAll<HTMLElement>(":scope > [data-row]") || []);
  const focusHandle = (i: number) => requestAnimationFrame(() => rows()[i]?.querySelector<HTMLElement>("[data-handle]")?.focus());

  const handle = (i: number, name: string) => ({
    "data-handle": "",
    "aria-label": `Przesuń: ${name || "pozycja"}. Strzałki w górę i w dół zmieniają kolejność.`,
    title: "Przeciągnij, żeby zmienić kolejność",
    onKeyDown: (e: React.KeyboardEvent) => {
      const n = rows().length;
      if (e.key === "ArrowUp" && i > 0) { e.preventDefault(); cb.current(i, i - 1); focusHandle(i - 1); }
      if (e.key === "ArrowDown" && i < n - 1) { e.preventDefault(); cb.current(i, i + 1); focusHandle(i + 1); }
    },
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      const list = rows();
      if (list.length < 2) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      const rects = list.map((r) => r.getBoundingClientRect());
      const step = rects[1] ? rects[1].top - rects[0].top - rects[0].height + rects[i].height : rects[i].height;
      drag.current = { from: i, to: i, y0: e.clientY, rows: list, tops: rects.map((r) => r.top), mids: rects.map((r) => r.top + r.height / 2), step };
      list.forEach((r, k) => { r.classList.toggle("is-dragging", k === i); r.classList.toggle("is-shifting", k !== i); });
    },
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
      const d = drag.current;
      if (!d) return;
      const dy = e.clientY - d.y0;
      d.rows[d.from].style.transform = `translate3d(0, ${dy}px, 0)`;
      const centre = d.mids[d.from] + dy;
      let to = d.from;
      d.mids.forEach((m, k) => {
        if (k < d.from && centre < m) to = Math.min(to, k);
        if (k > d.from && centre > m) to = Math.max(to, k);
      });
      d.to = to;
      d.rows.forEach((r, k) => {
        if (k === d.from) return;
        const shift = d.from < to && k > d.from && k <= to ? -d.step : d.from > to && k < d.from && k >= to ? d.step : 0;
        r.style.transform = shift ? `translate3d(0, ${shift}px, 0)` : "";
      });
    },
    onPointerUp: () => finish(),
    onPointerCancel: () => finish(true),
  });

  const finish = (cancel = false) => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    d.rows.forEach((r) => { r.style.transform = ""; r.classList.remove("is-dragging", "is-shifting"); });
    if (!cancel && d.to !== d.from) { cb.current(d.from, d.to); focusHandle(d.to); }
  };

  return { listRef, handle };
}

export function moveItem<T>(list: T[], from: number, to: number): T[] {
  const next = [...list];
  const [it] = next.splice(from, 1);
  next.splice(to, 0, it);
  return next;
}

export function Grip() {
  return (
    <svg viewBox="0 0 12 20" width="12" height="20" aria-hidden="true">
      {[4, 10, 16].map((y) => <g key={y}><circle cx="3" cy={y} r="1.5" /><circle cx="9" cy={y} r="1.5" /></g>)}
    </svg>
  );
}

/* ── małe rzeczy ───────────────────────────────────────────────────────────── */

export function useMedia(query: string) {
  const [on, setOn] = React.useState(false);
  React.useEffect(() => {
    const m = matchMedia(query);
    const upd = () => setOn(m.matches);
    upd();
    m.addEventListener("change", upd);
    return () => m.removeEventListener("change", upd);
  }, [query]);
  return on;
}

function useTheme() {
  const [t, setT] = React.useState("dark");
  React.useEffect(() => {
    const el = document.documentElement;
    const upd = () => setT(el.dataset.theme || "dark");
    upd();
    const mo = new MutationObserver(upd);
    mo.observe(el, { attributes: true, attributeFilter: ["data-theme"] });
    return () => mo.disconnect();
  }, []);
  return t;
}

export function Skel({ rows = 6, wide = false }: { rows?: number; wide?: boolean }) {
  return (
    <div className={`ed-skel ${wide ? "ed-skel--wide" : ""}`} aria-busy="true" aria-label="Wczytuję">
      {Array.from({ length: rows }, (_, i) => <span key={i} style={{ "--i": i } as React.CSSProperties} />)}
    </div>
  );
}

export function LoadError({ what, onRetry, msg }: { what: string; onRetry: () => void; msg?: string | null }) {
  return (
    <div className="ed-fail" role="alert">
      <p className="ed-fail__big">Nie udało się wczytać {what}.</p>
      <p className="ed-mute">{msg || "Serwer nie odpowiada albo nie ma internetu."}</p>
      <button type="button" className="ed-tb ed-tb--accent" onClick={onRetry}>Spróbuj ponownie</button>
    </div>
  );
}

/* Pusty stan: rysunek kreską (linie wjeżdżają po kolei, ołówek/kursor żyje w nieregularnym rytmie)
   i zdanie, co zrobić. Stuknięcie w rysunek robi to samo co główna akcja. */
export function Blank({ art = "page", kicker, title, body, children, onArt }: {
  art?: "page" | "tag" | "week" | "board"; kicker?: string; title: string; body?: React.ReactNode; children?: React.ReactNode; onArt?: () => void;
}) {
  return (
    <div className="ed-blank">
      <button type="button" className={`ed-blank__art ed-blank__art--${art}`} onClick={onArt} tabIndex={-1} aria-hidden="true" disabled={!onArt}>
        <BlankArt kind={art} />
      </button>
      <div className="ed-blank__copy">
        {kicker ? <p className="ed-kicker">{kicker}</p> : null}
        <h3 className="ed-blank__title">{title}</h3>
        {body ? <p className="ed-mute">{body}</p> : null}
        {children ? <div className="ed-blank__act">{children}</div> : null}
      </div>
    </div>
  );
}

function BlankArt({ kind }: { kind: "page" | "tag" | "week" | "board" }) {
  if (kind === "tag") {
    return (
      <svg viewBox="0 0 120 120">
        <path className="ba-stroke" d="M22 58 L58 22 L96 22 L96 60 L60 96 Z" />
        <circle className="ba-dot" cx="82" cy="36" r="5" />
        <path className="ba-line" style={{ "--d": 1 } as React.CSSProperties} d="M44 66 L66 44" />
        <path className="ba-line" style={{ "--d": 2 } as React.CSSProperties} d="M52 74 L74 52" />
        <g className="ba-pen"><path d="M70 104 L100 74 L108 82 L78 112 L68 114 Z" /><path d="M96 78 L104 86" /></g>
      </svg>
    );
  }
  if (kind === "week") {
    return (
      <svg viewBox="0 0 120 120">
        <rect className="ba-stroke" x="14" y="22" width="92" height="80" rx="6" />
        <path className="ba-stroke" d="M14 38 H106" />
        {[0, 1, 2, 3, 4, 5].map((i) => <path key={i} className="ba-line ba-line--v" style={{ "--d": i } as React.CSSProperties} d={`M${27 + i * 13.2} 44 V96`} />)}
        <rect className="ba-fill" style={{ "--d": 2 } as React.CSSProperties} x="35" y="54" width="9" height="22" rx="2" />
        <rect className="ba-fill" style={{ "--d": 4 } as React.CSSProperties} x="61" y="62" width="9" height="16" rx="2" />
        <g className="ba-pen"><path d="M78 98 L102 74 L110 82 L86 106 L76 108 Z" /></g>
      </svg>
    );
  }
  if (kind === "board") {
    return (
      <svg viewBox="0 0 120 120">
        <rect className="ba-stroke" x="10" y="20" width="100" height="70" rx="5" />
        <path className="ba-line" style={{ "--d": 0 } as React.CSSProperties} d="M24 40 H70" />
        <path className="ba-line" style={{ "--d": 1 } as React.CSSProperties} d="M24 54 H90" />
        <path className="ba-line" style={{ "--d": 2 } as React.CSSProperties} d="M24 68 H56" />
        <path className="ba-stroke" d="M30 98 H90" />
        <g className="ba-pen"><rect x="76" y="62" width="22" height="8" rx="3" transform="rotate(-24 87 66)" /></g>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 120 120">
      <path className="ba-stroke" d="M24 14 H86 L98 26 V106 H24 Z" />
      <path className="ba-stroke" d="M86 14 V26 H98" />
      {[0, 1, 2, 3].map((i) => <path key={i} className="ba-line" style={{ "--d": i } as React.CSSProperties} d={`M36 ${44 + i * 14} H${i === 3 ? 66 : 86}`} />)}
      <path className="ba-caret" d="M70 82 V94" />
      <g className="ba-pen"><path d="M74 108 L104 78 L112 86 L82 116 L72 118 Z" /></g>
    </svg>
  );
}

/* ── żywy podgląd strony ───────────────────────────────────────────────────── */

export type PreviewPayload = { view: "offer" | "content"; offer?: unknown; content?: unknown; focus?: string };
type Device = "phone" | "desk";
const DEVICE_W: Record<Device, number> = { phone: 390, desk: 1280 };

/* Strona w ramce (`/panel/podglad`) dostaje szkic przez postMessage — widać zmianę, zanim się zapisze,
   a szerokość ramki uruchamia prawdziwe układy telefonu i komputera. */
export function PreviewFrame({ payload, device }: { payload: PreviewPayload; device: Device }) {
  const box = React.useRef<HTMLDivElement>(null);
  const frame = React.useRef<HTMLIFrameElement>(null);
  const [size, setSize] = React.useState({ w: 0, h: 0 });
  const [ready, setReady] = React.useState(false);
  const theme = useTheme();
  const last = React.useRef(0);

  React.useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  React.useEffect(() => {
    const on = (e: MessageEvent) => {
      if (e.origin !== location.origin || e.source !== frame.current?.contentWindow) return;
      if ((e.data as { type?: string })?.type === "kk-preview-ready") setReady(true);
    };
    window.addEventListener("message", on);
    return () => window.removeEventListener("message", on);
  }, []);

  /* Wysyłka najwyżej co 200 ms (pisanie w polu nie przerysowuje strony przy każdej literze). */
  React.useEffect(() => {
    if (!ready) return;
    const send = () => {
      last.current = performance.now();
      frame.current?.contentWindow?.postMessage({ type: "kk-preview", ...payload, theme }, location.origin);
    };
    const wait = Math.max(0, 200 - (performance.now() - last.current));
    const t = window.setTimeout(send, wait);
    return () => window.clearTimeout(t);
  }, [ready, payload, theme]);

  const devW = DEVICE_W[device];
  const scale = size.w ? Math.min(1, size.w / devW) : 1;
  return (
    <div ref={box} className={`ed-frame ed-frame--${device}`}>
      {!ready ? <div className="ed-frame__wait"><i className="spinner" /> Wczytuję podgląd…</div> : null}
      <iframe
        ref={frame}
        title="Podgląd strony"
        src={`/panel/podglad?v=${payload.view}`}
        className={ready ? "is-ready" : ""}
        style={{ width: devW, height: size.h ? size.h / scale : "100%", transform: `scale(${scale})` }}
      />
    </div>
  );
}

/* Pływający przycisk podglądu idzie do <body>: powłoka animuje widok transformem (fill: both),
   a to zamyka `position: fixed` w jego pudełku. Wysokość dolnego paska bierzemy z --pn-tab-h. */
function Peek({ onClick, icon, label }: { onClick: () => void; icon: React.ReactNode; label: string }) {
  const [tab, setTab] = React.useState<string | null>(null);
  React.useEffect(() => {
    const shell = document.querySelector<HTMLElement>(".pn");
    const bar = shell ? getComputedStyle(shell).getPropertyValue("--pn-tab-h").trim() : "";
    setTab(matchMedia("(max-width: 900px)").matches ? bar || "0px" : "0px");
  }, []);
  if (tab == null) return null;
  return createPortal(
    <button type="button" className="ed ed-peek" style={{ "--ed-tab": tab } as React.CSSProperties} onClick={onClick} aria-haspopup="dialog">{icon}{label}</button>,
    document.body,
  );
}

/* Boczny podgląd (tablica zadania / pytania): na webie przyklejony obok listy, na telefonie arkusz. */
export function SideBoard({ label, children }: { label: string; children: React.ReactNode }) {
  useShellTop();
  const narrow = useMedia("(max-width: 1099px)");
  const [open, setOpen] = React.useState(false);
  if (narrow) {
    return (
      <>
        <Peek onClick={() => setOpen(true)} label={label} icon={<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8M12 17v4" /></svg>} />
        <Sheet open={open} onClose={() => setOpen(false)} title={label} wide>
          <div className="ed-boardsheet">{children}</div>
        </Sheet>
      </>
    );
  }
  return <aside className="ed-board" aria-label={label}>{children}</aside>;
}

const DEVICE_KEY = "kk-panel-preview";

export function PreviewPane({ payload, note }: { payload: PreviewPayload; note?: string }) {
  const narrow = useMedia("(max-width: 1099px)");
  const [device, setDevice] = React.useState<Device>("desk");
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    try { if (localStorage.getItem(DEVICE_KEY) === "phone") setDevice("phone"); } catch { /* bez pamięci */ }
  }, []);
  const pick = (d: Device) => {
    setDevice(d);
    try { localStorage.setItem(DEVICE_KEY, d); } catch { /* bez pamięci */ }
  };

  if (narrow) {
    return (
      <>
        <Peek onClick={() => setOpen(true)} label="Podgląd strony" icon={<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>} />
        <Sheet open={open} onClose={() => setOpen(false)} title="Tak to widać na stronie" wide>
          <div className="ed-sheetframe">{open ? <PreviewFrame payload={payload} device="phone" /> : null}</div>
        </Sheet>
      </>
    );
  }
  return (
    <aside className="ed-preview" aria-label="Podgląd strony">
      <div className="ed-preview__bar">
        <p className="ed-kicker">Tak to widać na stronie</p>
        <div className="ed-seg" role="group" aria-label="Szerokość podglądu">
          <button type="button" aria-pressed={device === "phone"} onClick={() => pick("phone")}>Telefon</button>
          <button type="button" aria-pressed={device === "desk"} onClick={() => pick("desk")}>Komputer</button>
        </div>
      </div>
      <PreviewFrame payload={payload} device={device} />
      <p className="ed-preview__note">{note || "Podgląd pokazuje zmiany od razu. Strona publiczna odświeża się do minuty po zapisie."} <a href="/" target="_blank" rel="noopener" className="ed-link">Otwórz stronę ↗</a></p>
    </aside>
  );
}
