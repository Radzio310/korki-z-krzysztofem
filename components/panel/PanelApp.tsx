"use client";

import React from "react";
import Logo from "../Logo";
import Mascot from "../Mascot";
import ThemeToggle from "../ThemeToggle";
import { api } from "@/lib/api";
import { PanelCtx, loadSession, saveSession, type Session } from "./ui";
import Dashboard from "./views/Dashboard";
import Bookings from "./views/Bookings";
import Calendar from "./views/Calendar";
import OfferView from "./views/Offer";
import ContentView from "./views/Content";
import ReviewsView from "./views/Reviews";
import TasksView from "./views/Tasks";
import QuizView from "./views/QuizAdmin";
import Messages from "./views/Messages";
import "./panel.css";

export const TABS = [
  { id: "pulpit", label: "Pulpit", icon: "◎" },
  { id: "rezerwacje", label: "Rezerwacje", icon: "📅" },
  { id: "kalendarz", label: "Dostępność", icon: "🕒" },
  { id: "oferta", label: "Oferta i ceny", icon: "💰" },
  { id: "strona", label: "Treści strony", icon: "✏️" },
  { id: "opinie", label: "Opinie", icon: "⭐" },
  { id: "zadania", label: "Zadania dnia", icon: "🧩" },
  { id: "quiz", label: "Quiz", icon: "⏱️" },
  { id: "wiadomosci", label: "Wiadomości", icon: "✉️" },
] as const;
export type TabId = (typeof TABS)[number]["id"];

function Login({ onIn }: { onIn: (s: Session) => void }) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [shake, setShake] = React.useState(0);
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const s = await api<Session>("/korki/panel/login", { body: { login: String(f.get("login") || ""), password: String(f.get("password") || "") } });
      saveSession(s);
      onIn(s);
    } catch (err) {
      setError((err as Error).message);
      setShake((n) => n + 1);
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="pn-login">
      <div className="pn-login__sea" aria-hidden="true" />
      <form key={shake} className={`pn-login__card card ${shake ? "is-shake" : ""}`} onSubmit={submit}>
        <Mascot mood={error ? "sad" : "wave"} size={110} say={error ? "Hmm, coś się nie zgadza — spróbuj jeszcze raz." : "Cześć, Krzysztof! Zaloguj się do panelu."} side="left" />
        <div className="pn-login__brand"><Logo size={36} /> <b>Panel</b></div>
        <label className="field"><span>Login</span><input className="input" name="login" autoComplete="username" required autoFocus /></label>
        <label className="field"><span>Hasło</span><input className="input" name="password" type="password" autoComplete="current-password" required /></label>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <button className="btn btn--primary" type="submit" disabled={busy}>{busy ? <i className="spinner" /> : "Zaloguj"}</button>
        <a href="/" className="pn-login__back">← Wróć na stronę</a>
      </form>
    </main>
  );
}

export default function PanelApp() {
  const [session, setSession] = React.useState<Session | null | undefined>(undefined);
  const [tab, setTab] = React.useState<TabId>("pulpit");
  const [toasts, setToasts] = React.useState<{ id: number; msg: string; kind: "ok" | "err" }[]>([]);
  const [menu, setMenu] = React.useState(false);

  React.useEffect(() => {
    setSession(loadSession());
    const h = window.location.hash.replace("#", "") as TabId;
    if (TABS.some((t) => t.id === h)) setTab(h);
  }, []);

  const go = React.useCallback((t: TabId) => {
    setTab(t);
    setMenu(false);
    history.replaceState(null, "", `#${t}`);
    window.scrollTo({ top: 0 });
  }, []);

  const toast = React.useCallback((msg: string, kind: "ok" | "err" = "ok") => {
    const id = performance.now();
    setToasts((ts) => [...ts.slice(-3), { id, msg, kind }]);
    window.setTimeout(() => setToasts((ts) => ts.filter((t) => t.id !== id)), 3800);
  }, []);
  const logout = React.useCallback(() => { saveSession(null); setSession(null); }, []);

  const ctx = React.useMemo(() => (session ? { token: session.token, logout, toast } : null), [session, logout, toast]);

  if (session === undefined) return <main className="pn-boot"><i className="spinner" /></main>;
  if (!session || !ctx) return <Login onIn={setSession} />;

  const View = {
    pulpit: <Dashboard go={go} />,
    rezerwacje: <Bookings />,
    kalendarz: <Calendar />,
    oferta: <OfferView />,
    strona: <ContentView />,
    opinie: <ReviewsView />,
    zadania: <TasksView />,
    quiz: <QuizView />,
    wiadomosci: <Messages />,
  }[tab];

  return (
    <PanelCtx.Provider value={ctx}>
      <div className="pn">
        <aside className={`pn-side ${menu ? "is-open" : ""}`}>
          <a href="/" className="pn-side__brand" target="_blank" rel="noopener"><Logo size={32} /> <span>Korki <em>z</em> Krzysztofem</span></a>
          <nav>
            {TABS.map((t) => (
              <button key={t.id} type="button" className={tab === t.id ? "is-on" : ""} onClick={() => go(t.id)}>
                <span aria-hidden="true">{t.icon}</span>{t.label}
              </button>
            ))}
          </nav>
          <div className="pn-side__foot">
            <ThemeToggle />
            <button type="button" className="btn btn--sm btn--ghost" onClick={logout}>Wyloguj</button>
          </div>
        </aside>
        <div className="pn-main">
          <header className="pn-top">
            <button type="button" className="pn-burger" onClick={() => setMenu((v) => !v)} aria-label="Menu">☰</button>
            <h1>{TABS.find((t) => t.id === tab)?.label}</h1>
            <a className="btn btn--sm" href="/" target="_blank" rel="noopener">Zobacz stronę ↗</a>
          </header>
          <div className="pn-view" key={tab}>{View}</div>
        </div>
        {menu ? <div className="pn-scrim" onClick={() => setMenu(false)} /> : null}
        <div className="pn-toasts" aria-live="polite">
          {toasts.map((t) => <div key={t.id} className={`pn-toast pn-toast--${t.kind}`}>{t.kind === "ok" ? "✓" : "!"} {t.msg}</div>)}
        </div>
      </div>
    </PanelCtx.Provider>
  );
}
