"use client";

import React from "react";
import ThemeToggle from "../ThemeToggle";
import { api, ApiError } from "@/lib/api";
import { reducedMotion } from "@/lib/motion";
import { PanelCtx, Sheet, loadSession, saveSession, useLoad, type Session, type ToastAction } from "./ui";
import { Icon, Mark, type IconName } from "./icons";
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

/* Kolejność = kolejność na szynie. `kicker` stoi nad tytułem widoku. */
export const TABS = [
  { id: "pulpit", label: "Dziś", icon: "dzis", kicker: "" },
  { id: "rezerwacje", label: "Rezerwacje", icon: "rezerwacje", kicker: "Lekcje" },
  { id: "kalendarz", label: "Dostępność", icon: "dostepnosc", kicker: "Lekcje" },
  { id: "wiadomosci", label: "Wiadomości", icon: "wiadomosci", kicker: "Uczniowie" },
  { id: "opinie", label: "Opinie", icon: "opinie", kicker: "Uczniowie" },
  { id: "oferta", label: "Oferta i ceny", icon: "oferta", kicker: "Strona" },
  { id: "strona", label: "Treści strony", icon: "strona", kicker: "Strona" },
  { id: "zadania", label: "Zadania dnia", icon: "zadania", kicker: "Strona · codziennie" },
  { id: "quiz", label: "Quiz", icon: "quiz", kicker: "Strona · test poziomu" },
] as const satisfies readonly { id: string; label: string; icon: IconName; kicker: string }[];
export type TabId = (typeof TABS)[number]["id"];

const PHONE_TABS: TabId[] = ["pulpit", "rezerwacje", "kalendarz"];

type Counts = { bookings_pending: number; bookings_upcoming: number; reviews_pending: number; messages_unread: number; tasks_active: number; quiz_active: number };

/* ── logowanie ───────────────────────────────────────────────────────────── */

/* Wzory kredą: każdy element ma własne opóźnienie i czas, potem co kilka sekund
   jeden losowy „pisze się” od nowa. pathLength=100 — długość jest wspólna dla wszystkich. */
const CHALK: { d: string; dl: number; dd: number }[] = [
  { d: "M120 210 a92 92 0 1 0 184 0 a92 92 0 1 0 -184 0", dl: 0.2, dd: 2.6 },
  { d: "M212 210 L290 168", dl: 1.4, dd: 0.8 },
  { d: "M520 120 L700 120 L520 260 Z", dl: 0.6, dd: 2.2 },
  { d: "M520 238 h22 v22", dl: 1.9, dd: 0.6 },
  { d: "M90 560 L90 760 M70 740 L330 740", dl: 0.9, dd: 1.6 },
  { d: "M110 590 Q200 900 300 590", dl: 1.6, dd: 1.8 },
  { d: "M470 520 l60 -35 l60 35 v70 l-60 35 l-60 -35 Z", dl: 1.1, dd: 2.2 },
  { d: "M490 532 l40 -23 M590 541 v48 M490 578 l40 23", dl: 2.4, dd: 1.2 },
  { d: "M40 860 C 140 800, 240 920, 340 860 S 540 800, 640 860 S 760 900, 820 850", dl: 0.4, dd: 3.2 },
  { d: "M640 330 a40 40 0 1 1 0 0.1", dl: 2.8, dd: 1.4 },
];
const CHALK_TEXT: { x: number; y: number; t: string; dl: number }[] = [
  { x: 560, y: 320, t: "a² + b² = c²", dl: 2.2 },
  { x: 150, y: 360, t: "P = πr²", dl: 2.8 },
  { x: 380, y: 680, t: "C₆H₆", dl: 3.2 },
  { x: 640, y: 470, t: "∫ f(x) dx", dl: 3.6 },
  { x: 220, y: 520, t: "y = x²", dl: 3.0 },
];

function Chalk() {
  const ref = React.useRef<SVGSVGElement>(null);
  React.useEffect(() => {
    if (reducedMotion()) return;
    let t: number;
    const tick = () => {
      const paths = ref.current?.querySelectorAll<SVGPathElement>(".c");
      if (paths?.length) {
        const p = paths[Math.floor(Math.random() * paths.length)];
        p.classList.remove("is-redraw");
        void p.getBoundingClientRect();
        p.classList.add("is-redraw");
      }
      t = window.setTimeout(tick, 5200 + Math.random() * 4800);
    };
    t = window.setTimeout(tick, 6500);
    return () => window.clearTimeout(t);
  }, []);
  return (
    <svg ref={ref} className="pn-login__chalk" viewBox="0 0 800 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {CHALK.map((c, i) => (
        <path key={i} className="c" d={c.d} pathLength={100} style={{ "--len": 100, "--dl": `${c.dl}s`, "--dd": `${c.dd}s` } as React.CSSProperties} />
      ))}
      {CHALK_TEXT.map((c) => (
        <text key={c.t} x={c.x} y={c.y} style={{ "--dl": `${c.dl}s` } as React.CSSProperties}>{c.t}</text>
      ))}
    </svg>
  );
}

function greeting() {
  const h = Number(new Intl.DateTimeFormat("pl-PL", { timeZone: "Europe/Warsaw", hour: "2-digit", hour12: false }).format(new Date()));
  if (h < 5 || h >= 21) return "Dobry wieczór";
  if (h < 12) return "Dzień dobry";
  if (h < 18) return "Dzień dobry";
  return "Dobry wieczór";
}

function loginError(e: unknown): string {
  const err = e as ApiError;
  if (err.status === 401) return "Login albo hasło się nie zgadza. Sprawdź wielkość liter i spróbuj jeszcze raz.";
  if (err.status === 429) return "Za dużo prób pod rząd — odczekaj minutę i spróbuj ponownie.";
  return err.message || "Coś poszło nie tak — spróbuj ponownie.";
}

function Login({ onIn }: { onIn: (s: Session) => void }) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [shake, setShake] = React.useState(0);
  const [show, setShow] = React.useState(false);
  const [phase, setPhase] = React.useState<"form" | "in">("form");
  const [hello, setHello] = React.useState("Dzień dobry");
  React.useEffect(() => setHello(greeting()), []);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const s = await api<Session>("/korki/panel/login", { body: { login: String(f.get("login") || "").trim(), password: String(f.get("password") || "") } });
      saveSession(s);
      setPhase("in");
      /* orbita domyka się w koło, dopiero potem wjeżdża panel */
      window.setTimeout(() => onIn(s), reducedMotion() ? 0 : 820);
    } catch (err) {
      setError(loginError(err));
      setShake((n) => n + 1);
      setBusy(false);
    }
  };

  return (
    <main className={`pn-login ${phase === "in" ? "is-in" : ""}`}>
      <section className="pn-login__art">
        <div className="pn-login__tex" aria-hidden="true" />
        <Chalk />
        <div className="pn-login__brand">
          <div className="pn-login__logo">
            <svg className="pn-login__orbit" viewBox="0 0 132 132" aria-hidden="true">
              <g className="spin"><circle className="o2" cx="66" cy="66" r="64" /></g>
              {/* długość okręgu r=64 ≈ 402 — łuk 380 domyka się do pełnego koła po zalogowaniu */}
              <circle className="o1" cx="66" cy="66" r="64" />
            </svg>
            <Mark size={112} />
          </div>
          <p className="pn-login__name">Korki<em>z</em>Krzysztofem</p>
          <p className="pn-login__lead">Rezerwacje, dostępność, oferta i treści strony — w jednym spokojnym miejscu.</p>
        </div>
      </section>

      <section className="pn-login__form-side">
        <form key={shake} className={`pn-login__form ${shake ? "is-shake" : ""}`} onSubmit={submit} noValidate>
          <div>
            <span className="pn-kicker">{hello}, Krzysztof</span>
          </div>
          <h1>Zaloguj się do panelu</h1>
          <p>Wpisz dane, które dostałeś od Radka.</p>
          <label>
            <span className="pn-label">Login</span>
            <input className="pn-input" name="login" autoComplete="username" autoCapitalize="none" spellCheck={false} required autoFocus aria-invalid={!!error} />
          </label>
          <label className="pn-login__pass">
            <span className="pn-label">Hasło</span>
            <input className="pn-input" name="password" type={show ? "text" : "password"} autoComplete="current-password" required aria-invalid={!!error} />
            <button type="button" onClick={() => setShow((v) => !v)} aria-pressed={show} aria-label={show ? "Ukryj hasło" : "Pokaż hasło"}>{show ? "Ukryj" : "Pokaż"}</button>
          </label>
          {error ? <p className="pn-login__err" role="alert">{error}</p> : null}
          <button className="pn-btn pn-login__submit" type="submit" disabled={busy}>
            {busy ? <i className="spinner" /> : <>Zaloguj się <span aria-hidden="true">→</span></>}
          </button>
          <div className="pn-login__foot">
            <a href="/">← Wróć na stronę</a>
            <a href="/polityka-prywatnosci">Prywatność</a>
          </div>
        </form>
      </section>
    </main>
  );
}

/* ── powłoka ─────────────────────────────────────────────────────────────── */

const dayFmt = new Intl.DateTimeFormat("pl-PL", { timeZone: "Europe/Warsaw", weekday: "long", day: "numeric", month: "long" });

function Shell({ tab, go, logout, tick }: { tab: TabId; go: (t: TabId) => void; logout: () => void; tick: number }) {
  const overview = useLoad<{ counts: Counts }>("/korki/panel/overview");
  const reloadCounts = overview.reload;
  React.useEffect(() => { if (tick) reloadCounts(); }, [tick]); // eslint-disable-line react-hooks/exhaustive-deps
  const c = overview.data?.counts;
  const dot: Partial<Record<TabId, boolean>> = {
    rezerwacje: !!c?.bookings_pending,
    wiadomosci: !!c?.messages_unread,
    opinie: !!c?.reviews_pending,
  };
  const [more, setMore] = React.useState(false);
  const [stuck, setStuck] = React.useState(false);
  const [today, setToday] = React.useState("");

  React.useEffect(() => {
    setToday(dayFmt.format(new Date()));
    const on = () => setStuck(window.scrollY > 6);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  const cur = TABS.find((t) => t.id === tab)!;
  const idx = TABS.findIndex((t) => t.id === tab);
  const phoneIdx = PHONE_TABS.includes(tab) ? PHONE_TABS.indexOf(tab) : 3;
  const moreTabs = TABS.filter((t) => !PHONE_TABS.includes(t.id));
  const moreDot = moreTabs.some((t) => dot[t.id]);

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
    <div className="pn pn-enter">
      <aside className="pn-rail" aria-label="Nawigacja panelu">
        <a href="/" className="pn-rail__logo" target="_blank" rel="noopener" aria-label="Korki z Krzysztofem — otwórz stronę"><Mark size={52} /></a>
        <nav className="pn-rail__nav">
          <span className="pn-rail__ind" style={{ transform: `translateY(${idx * 56}px)` }} aria-hidden="true" />
          {TABS.map((t) => (
            <button key={t.id} type="button" className={`pn-rail__btn ${tab === t.id ? "is-on" : ""}`} onClick={() => go(t.id)} aria-current={tab === t.id ? "page" : undefined} aria-label={t.label}>
              <Icon name={t.icon} />
              {dot[t.id] ? <span className="pn-badge" aria-hidden="true" /> : null}
              <span className="pn-rail__tip" aria-hidden="true">{t.label}</span>
            </button>
          ))}
        </nav>
        <div className="pn-rail__foot">
          <ThemeToggle />
          <button type="button" className="pn-rail__btn" onClick={logout} aria-label="Wyloguj">
            <Icon name="wyloguj" />
            <span className="pn-rail__tip" aria-hidden="true">Wyloguj</span>
          </button>
        </div>
      </aside>

      <div className="pn-main">
        <header className={`pn-head ${stuck ? "is-stuck" : ""}`}>
          <div className="pn-head__in">
            <Mark size={38} className="pn-head__mark" />
            <div className="pn-head__titles">
              <span className="pn-kicker">{tab === "pulpit" ? today : cur.kicker}</span>
              <h1>{cur.label}</h1>
            </div>
            <div className="pn-head__aside">
              <a className="pn-tbtn pn-tbtn--mute" href="/" target="_blank" rel="noopener">Zobacz stronę <Icon name="strona_ext" size={16} /></a>
            </div>
          </div>
        </header>
        <div className="pn-view" key={tab}>{View}</div>
      </div>

      <nav className="pn-tabbar" aria-label="Nawigacja panelu">
        <span className="pn-tabbar__ind" style={{ transform: `translateX(${phoneIdx * 100}%)` }} aria-hidden="true" />
        {PHONE_TABS.map((id) => {
          const t = TABS.find((x) => x.id === id)!;
          return (
            <button key={id} type="button" className={tab === id ? "is-on" : ""} onClick={() => go(id)} aria-current={tab === id ? "page" : undefined}>
              <Icon name={t.icon} />
              {dot[id] ? <span className="pn-badge" aria-hidden="true" /> : null}
              {t.label}
            </button>
          );
        })}
        <button type="button" className={phoneIdx === 3 ? "is-on" : ""} onClick={() => setMore(true)} aria-haspopup="dialog">
          <Icon name="wiecej" />
          {moreDot ? <span className="pn-badge" aria-hidden="true" /> : null}
          {phoneIdx === 3 ? cur.label.split(" ")[0] : "Więcej"}
        </button>
      </nav>

      <Sheet open={more} onClose={() => setMore(false)} kicker="Panel" title="Więcej">
        <div className="pn-more">
          {moreTabs.map((t) => (
            <button key={t.id} type="button" className={`pn-more__btn ${tab === t.id ? "is-on" : ""}`} onClick={() => { setMore(false); go(t.id); }}>
              <Icon name={t.icon} />
              {t.label}
              {dot[t.id] ? <span className="pn-badge" aria-label="nowe" /> : null}
            </button>
          ))}
          <div className="pn-more__foot">
            <ThemeToggle />
            <a className="pn-tbtn" href="/" target="_blank" rel="noopener">Zobacz stronę <Icon name="strona_ext" size={16} /></a>
            <button type="button" className="pn-tbtn pn-tbtn--danger" onClick={logout}>Wyloguj</button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}

type Toast = { id: number; msg: string; kind: "ok" | "err"; action?: ToastAction };

export default function PanelApp() {
  const [session, setSession] = React.useState<Session | null | undefined>(undefined);
  const [tab, setTab] = React.useState<TabId>("pulpit");
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const [tick, setTick] = React.useState(0);

  React.useEffect(() => {
    setSession(loadSession());
    const h = window.location.hash.replace("#", "") as TabId;
    if (TABS.some((t) => t.id === h)) setTab(h);
  }, []);

  const go = React.useCallback((t: TabId) => {
    setTab(t);
    history.replaceState(null, "", `#${t}`);
    window.scrollTo({ top: 0 });
  }, []);

  const drop = React.useCallback((id: number) => setToasts((ts) => ts.filter((t) => t.id !== id)), []);
  const toast = React.useCallback((msg: string, kind: "ok" | "err" = "ok", action?: ToastAction) => {
    const id = performance.now() + Math.random();
    setToasts((ts) => [...ts.slice(-2), { id, msg, kind, action }]);
    window.setTimeout(() => drop(id), action ? 5200 : 3800);
  }, [drop]);
  const logout = React.useCallback(() => { saveSession(null); setSession(null); }, []);
  const refresh = React.useCallback(() => setTick((n) => n + 1), []);

  const ctx = React.useMemo(() => (session ? { token: session.token, logout, toast, refresh } : null), [session, logout, toast, refresh]);

  if (session === undefined) return <main className="pn-boot"><Mark size={64} /></main>;

  return (
    <>
      {!session || !ctx ? (
        <Login onIn={setSession} />
      ) : (
        <PanelCtx.Provider value={ctx}>
          <Shell tab={tab} go={go} logout={logout} tick={tick} />
        </PanelCtx.Provider>
      )}
      <div className="pn-toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`pn-toast pn-toast--${t.kind}`} role={t.kind === "err" ? "alert" : "status"}>
            <i aria-hidden="true" />
            <span>{t.msg}</span>
            {t.action ? <button type="button" onClick={() => { t.action!.run(); drop(t.id); }}>{t.action.label}</button> : null}
          </div>
        ))}
      </div>
    </>
  );
}
