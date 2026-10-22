"use client";

import React from "react";
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

type Ctx = {
  token: string;
  logout: () => void;
  toast: (msg: string, kind?: "ok" | "err") => void;
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

export function Empty({ title, body, action }: { title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="pn-empty">
      <div className="pn-empty__art" aria-hidden="true">
        <svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="34" /><path d="M24 44 Q40 56 56 44" /><circle cx="31" cy="34" r="3.5" /><circle cx="49" cy="34" r="3.5" /></svg>
      </div>
      <b>{title}</b>
      {body ? <p className="muted">{body}</p> : null}
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
      className={`btn ${small ? "btn--sm" : ""} ${armed && danger ? "pn-danger" : "btn--ghost"}`}
      onClick={() => (armed ? (setArmed(false), onConfirm()) : setArmed(true))}
    >
      {armed ? "Na pewno?" : label}
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
