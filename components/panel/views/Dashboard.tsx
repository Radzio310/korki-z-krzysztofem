"use client";

import React from "react";
import type { Booking, ContactMessage, List, Offer, Content, Review } from "@/lib/types";
import { fmtTime, warsawDay, addDays } from "@/lib/time";
import { subjectLabel } from "@/lib/contact";
import { ApiError } from "@/lib/api";
import { Empty, Skeleton, usePanel, usePanelApi, useLoad, useUndoable } from "../ui";
import type { TabId } from "../PanelApp";
import { BookingSheet, STATUS, dayTitle, groupByDay, modeName, plural, useBookingPatch, useOfferNames } from "./Bookings";

type Overview = {
  counts: { bookings_pending: number; bookings_upcoming: number; reviews_pending: number; messages_unread: number; tasks_active: number; quiz_active: number };
};
type Me = { login: string; email_configured: boolean; notify_email_configured: boolean };
type Avail = { rules: unknown[]; time_off: unknown[] };

const HORIZON = 14;
const short = (t: string, n = 110) => (t.length > n ? `${t.slice(0, n).trimEnd()}…` : t);
const dayShort = (iso: string) => {
  const t = dayTitle(warsawDay(new Date(iso)));
  return t.title === "Dziś" || t.title === "Jutro" ? t.title.toLowerCase() : `${t.title} ${t.date}`;
};

/* ── znikanie wiersza: przejście, potem usunięcie z drzewa ── */
function useLeave() {
  const [phase, setPhase] = React.useState<"in" | "out" | "gone">("in");
  const leave = React.useCallback(() => { setPhase("out"); window.setTimeout(() => setPhase((p) => (p === "out" ? "gone" : p)), 260); }, []);
  const back = React.useCallback(() => setPhase("in"), []);
  return { phase, leave, back, cls: phase === "out" ? "is-leaving" : "" };
}

/* ═══ Do zrobienia ═══════════════════════════════════════════════════════════ */

function TodoBooking({ b, onChange }: { b: Booking; onChange: () => void }) {
  const names = useOfferNames();
  const later = useUndoable();
  const { patch, busy } = useBookingPatch(b, onChange);
  const { phase, leave, back, cls } = useLeave();
  const [open, setOpen] = React.useState(false);
  if (phase === "gone") return null;
  const confirm = async () => { leave(); if (!(await patch({ status: "confirmed" }, "ok", `Potwierdzone: ${b.student_name} — uczeń dostał maila.`))) back(); };
  const reject = () => {
    leave();
    later({ msg: `Odrzucono: ${b.student_name}.`, run: () => { void patch({ status: "cancelled", cancel_reason: null }, "cancel", "Rezerwacja odrzucona — uczeń dostał maila."); }, undo: back });
  };
  return (
    <article className={`pn-line pn-line--stack pn-todo ${cls}`}>
      <div className="pn-line__lead"><span className="pn-todo__kind pn-todo__kind--bk">Rezerwacja</span></div>
      <div className="pn-line__main">
        <button type="button" className="pn-line__title pn-todo__open" onClick={() => setOpen(true)} aria-haspopup="dialog">{b.student_name}</button>
        <span className="pn-line__meta">
          <b className="pn-time">{dayShort(b.starts_at)}, {fmtTime(b.starts_at)}</b>
          {new Date(b.starts_at).getTime() < Date.now() ? <span className="pn-todo__late"> · termin minął</span> : null}
          {" · "}{[`${b.duration_minutes} min`, names.subject(b.subject_key), names.level(b.level_key), modeName(b.mode)].filter(Boolean).join(" · ")}
        </span>
      </div>
      <div className="pn-line__trail">
        <button type="button" className="pn-tbtn pn-tbtn--danger" onClick={reject} disabled={!!busy}>Odrzuć</button>
        <button type="button" className="pn-btn pn-btn--sm" onClick={confirm} disabled={!!busy}>{busy === "ok" ? <i className="spinner" /> : "Potwierdź"}</button>
      </div>
      <BookingSheet b={b} open={open} onClose={() => setOpen(false)} onChange={onChange} />
    </article>
  );
}

function TodoMessage({ m, onChange }: { m: ContactMessage; onChange: () => void }) {
  const call = usePanelApi();
  const { toast, refresh } = usePanel();
  const { phase, leave, back, cls } = useLeave();
  if (phase === "gone") return null;
  const mark = async (read: boolean) => {
    try { await call(`/korki/panel/messages/${m.id}`, { method: "PATCH", body: { read } }); refresh?.(); return true; } catch { return false; }
  };
  const done = async () => {
    leave();
    if (!(await mark(true))) return back();
    toast(`Przeczytane: ${m.name}.`, "ok", { label: "Cofnij", run: async () => { if (await mark(false)) { back(); onChange(); } } });
  };
  const digits = m.phone?.replace(/[^\d+]/g, "");
  const reply = m.email ? `mailto:${m.email}?subject=${encodeURIComponent("Re: Korki z Krzysztofem")}` : digits ? `tel:${digits}` : null;
  const about = [...(m.subjects || []).map(subjectLabel), m.class_info].filter(Boolean).join(" · ");
  return (
    <article className={`pn-line pn-line--stack pn-todo ${cls}`}>
      <div className="pn-line__lead"><span className="pn-todo__kind pn-todo__kind--msg">Zapytanie</span></div>
      <div className="pn-line__main">
        <span className="pn-line__title">{m.name}</span>
        <span className="pn-line__meta">{about ? <b>{about}</b> : null}{about && m.message ? " · " : ""}{m.message ? short(m.message) : about ? "" : "bez wiadomości"}</span>
      </div>
      <div className="pn-line__trail">
        <button type="button" className="pn-tbtn pn-tbtn--mute" onClick={done}>Przeczytane</button>
        {reply ? <a className="pn-btn pn-btn--sm pn-btn--line" href={reply} onClick={() => { void mark(true).then(() => leave()); }}>{m.email ? "Odpisz" : "Zadzwoń"}</a> : null}
      </div>
    </article>
  );
}

function TodoReview({ r, onChange }: { r: Review; onChange: () => void }) {
  const call = usePanelApi();
  const { toast, refresh } = usePanel();
  const later = useUndoable();
  const { phase, leave, back, cls } = useLeave();
  if (phase === "gone") return null;
  const patch = async (body: Record<string, unknown>) => {
    try { await call(`/korki/panel/reviews/${r.id}`, { method: "PATCH", body: { ...body, version: r.version } }); refresh?.(); return true; }
    catch (e) { if ((e as ApiError).status === 409) onChange(); return false; }
  };
  const publish = async () => { leave(); if (await patch({ status: "approved" })) toast(`Opublikowana opinia: ${r.author_name}.`); else back(); };
  const reject = () => { leave(); later({ msg: `Odrzucono opinię: ${r.author_name}.`, run: () => { void patch({ status: "rejected" }); }, undo: back }); };
  return (
    <article className={`pn-line pn-line--stack pn-todo ${cls}`}>
      <div className="pn-line__lead"><span className="pn-todo__kind pn-todo__kind--rv">Opinia</span></div>
      <div className="pn-line__main">
        <span className="pn-line__title">{r.author_name}{r.rating ? <span className="pn-todo__stars" aria-label={`${r.rating} na 5`}>{"★".repeat(r.rating)}</span> : null}</span>
        <span className="pn-line__meta pn-todo__quote">„{short(r.body, 160)}”</span>
      </div>
      <div className="pn-line__trail">
        <button type="button" className="pn-tbtn pn-tbtn--danger" onClick={reject}>Odrzuć</button>
        <button type="button" className="pn-btn pn-btn--sm" onClick={publish}>Opublikuj</button>
      </div>
    </article>
  );
}

/* ═══ Oś dnia ═══════════════════════════════════════════════════════════════ */

function useNow(step = 60_000) {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => { const t = window.setInterval(() => setNow(Date.now()), step); return () => window.clearInterval(t); }, [step]);
  return now;
}

function AxisItem({ b, now, onChange }: { b: Booking; now: number; onChange: () => void }) {
  const names = useOfferNames();
  const [open, setOpen] = React.useState(false);
  const start = new Date(b.starts_at).getTime();
  const end = b.ends_at ? new Date(b.ends_at).getTime() : start + b.duration_minutes * 60_000;
  const live = (b.status === "confirmed" || b.status === "pending") && now >= start && now < end;
  const past = now >= end;
  const state = live ? "live" : past ? "past" : b.status;
  return (
    <li className={`pn-axis__item is-${state}`}>
      <button type="button" className="pn-axis__btn" onClick={() => setOpen(true)} aria-haspopup="dialog">
        <span className="pn-axis__time"><b className="pn-time">{fmtTime(b.starts_at)}</b><small>{fmtTime(new Date(end).toISOString())}</small></span>
        <span className="pn-axis__node" aria-hidden="true" />
        <span className="pn-axis__body">
          <span className="pn-axis__name">{b.student_name}</span>
          <span className="pn-axis__meta">{[names.subject(b.subject_key), names.level(b.level_key), modeName(b.mode), `${b.duration_minutes} min`].filter(Boolean).join(" · ")}</span>
        </span>
        <span className={`pn-status pn-status--${live ? "ok" : b.status}`}>{live ? "Trwa teraz" : STATUS[b.status]}</span>
      </button>
      <BookingSheet b={b} open={open} onClose={() => setOpen(false)} onChange={onChange} />
    </li>
  );
}

function Axis({ rows, onChange }: { rows: Booking[]; onChange: () => void }) {
  const now = useNow();
  const today = warsawDay(new Date(now));
  const groups = groupByDay(rows);
  if (!groups.length || groups[0].day !== today) groups.unshift({ day: today, rows: [] });
  const nowLabel = fmtTime(new Date(now).toISOString());
  return (
    <div className="pn-axis">
      {groups.map((g) => {
        const t = dayTitle(g.day);
        const isToday = g.day === today;
        /* „teraz” wstawiamy między lekcje: przed pierwszą, która jeszcze się nie zaczęła */
        const nowAt = isToday ? g.rows.findIndex((b) => new Date(b.starts_at).getTime() > now) : -2;
        const nowRow = (
          <li key="now" className="pn-axis__now" aria-label={`Teraz ${nowLabel}`}>
            <span className="pn-axis__time"><b>teraz</b><small>{nowLabel}</small></span>
            <span className="pn-axis__node" aria-hidden="true" />
            <span className="pn-axis__rule" aria-hidden="true" />
          </li>
        );
        return (
          <section key={g.day} className={`pn-axis__day ${isToday ? "is-today" : ""}`}>
            <h3 className="pn-daygroup__head"><b>{t.title}</b><span>{t.date}</span>{g.rows.length ? <em>{g.rows.length} {plural(g.rows.length, "lekcja", "lekcje", "lekcji")}</em> : null}</h3>
            <ol className="pn-axis__list">
              {g.rows.map((b, i) => (
                <React.Fragment key={`${b.id}-${b.version}`}>
                  {i === nowAt ? nowRow : null}
                  <AxisItem b={b} now={now} onChange={onChange} />
                </React.Fragment>
              ))}
              {isToday && (nowAt === -1 || !g.rows.length) ? nowRow : null}
              {isToday && !g.rows.length ? <li className="pn-axis__free">Dziś bez lekcji.</li> : null}
            </ol>
          </section>
        );
      })}
    </div>
  );
}

/* ═══ widok ═════════════════════════════════════════════════════════════════ */

export default function Dashboard({ go }: { go: (t: TabId) => void }) {
  const today = warsawDay();
  const { data, loading, reload } = useLoad<Overview>("/korki/panel/overview");
  const me = useLoad<Me>("/korki/panel/me");
  const offer = useLoad<{ value: Offer }>("/korki/panel/settings/offer");
  const content = useLoad<{ value: Content }>("/korki/panel/settings/content");
  const avail = useLoad<Avail>("/korki/panel/availability");
  const pending = useLoad<List<Booking>>("/korki/panel/bookings?status=pending&order=asc&limit=20");
  const msgs = useLoad<List<ContactMessage>>("/korki/panel/messages?limit=40");
  const revs = useLoad<List<Review>>("/korki/panel/reviews?status=pending&limit=20");
  const axis = useLoad<List<Booking>>(`/korki/panel/bookings?status=pending,confirmed,done,no_show&from=${today}&to=${addDays(today, HORIZON - 1)}&order=asc&limit=80`);

  const reloadAll = React.useCallback(() => { reload(); pending.reload(); msgs.reload(); revs.reload(); axis.reload(); }, [reload, pending, msgs, revs, axis]);
  const reloadTodo = React.useCallback(() => { reload(); pending.reload(); axis.reload(); }, [reload, pending, axis]);

  const c = data?.counts;
  const unread = (msgs.data?.rows || []).filter((m) => !m.read);
  const todoLoading = (pending.loading && !pending.data) || (msgs.loading && !msgs.data) || (revs.loading && !revs.data);
  const todoCount = (pending.data?.rows.length || 0) + unread.length + (revs.data?.rows.length || 0);

  /* zdanie dnia: z prawdziwej osi, nie z liczników */
  const lessons = (axis.data?.rows || []).filter((b) => b.status !== "no_show");
  const todays = lessons.filter((b) => warsawDay(new Date(b.starts_at)) === today);
  const nowMs = Date.now();
  const nextToday = todays.find((b) => new Date(b.starts_at).getTime() > nowMs);
  const nextLater = lessons.find((b) => new Date(b.starts_at).getTime() > nowMs && warsawDay(new Date(b.starts_at)) !== today);
  let lede: React.ReactNode = null;
  if (axis.data) {
    if (todays.length && nextToday) lede = <>Dziś {todays.length} {plural(todays.length, "lekcja", "lekcje", "lekcji")}. Najbliższa o <b>{fmtTime(nextToday.starts_at)}</b> — {nextToday.student_name}.</>;
    else if (todays.length) lede = <>Dzisiejsze lekcje za Tobą.{nextLater ? <> Następna: {dayShort(nextLater.starts_at)} o <b>{fmtTime(nextLater.starts_at)}</b>.</> : null}</>;
    else if (nextLater) lede = <>Dziś wolne. Następna lekcja: {dayShort(nextLater.starts_at)} o <b>{fmtTime(nextLater.starts_at)}</b>.</>;
    else lede = <>Przez najbliższe dwa tygodnie nie ma lekcji w kalendarzu.</>;
  }

  /* lista „na start”: każdy punkt prowadzi tam, gdzie się go załatwia */
  const o = offer.data?.value;
  const ct = content.data?.value;
  const checklist: { done: boolean; label: string; tab: TabId }[] = [
    { done: !!avail.data && avail.data.rules.length > 0, label: "Ustaw godziny dostępności", tab: "kalendarz" },
    { done: !!o && o.levels.some((l) => Object.values(l.prices || {}).some((p) => p > 0)), label: "Dodaj poziomy i ceny", tab: "oferta" },
    { done: !!o && o.subjects.length > 0, label: "Wpisz przedmioty", tab: "oferta" },
    { done: !!ct?.about_body, label: "Napisz kilka zdań o sobie", tab: "strona" },
    { done: !!ct?.photo_url, label: "Dodaj swoje zdjęcie", tab: "strona" },
    { done: !!ct?.contact?.email || !!ct?.contact?.phone, label: "Uzupełnij dane kontaktowe", tab: "strona" },
    { done: !!c && c.quiz_active > 0, label: "Wczytaj albo dodaj pytania quizu", tab: "quiz" },
    { done: !!c && c.tasks_active > 0, label: "Wczytaj albo dodaj zadania dnia", tab: "zadania" },
  ];
  const ready = !!(offer.data && content.data && avail.data && c);
  const doneCount = checklist.filter((x) => x.done).length;

  const upcomingN = axis.data ? lessons.filter((b) => (b.status === "confirmed" || b.status === "pending") && new Date(b.starts_at).getTime() > nowMs).length : undefined;
  const figs: { k: string; v: number | undefined; tab: TabId; hot?: boolean }[] = [
    { k: "do potwierdzenia", v: c?.bookings_pending, tab: "rezerwacje", hot: !!c?.bookings_pending },
    { k: `${plural(upcomingN ?? 0, "lekcja", "lekcje", "lekcji")} przed Tobą`, v: upcomingN, tab: "rezerwacje" },
    { k: "nowe zapytania", v: c?.messages_unread, tab: "wiadomosci", hot: !!c?.messages_unread },
    { k: "opinie do akceptacji", v: c?.reviews_pending, tab: "opinie", hot: !!c?.reviews_pending },
  ];

  if (!loading && !data) {
    return <Empty title="Nie udało się wczytać panelu" body="Serwer nie odpowiada albo nie ma połączenia z internetem." action={<button type="button" className="pn-tbtn pn-tbtn--accent" onClick={reloadAll}>Spróbuj ponownie</button>} />;
  }

  return (
    <div className="pn-page pn-today">
      {me.data && (!me.data.email_configured || !me.data.notify_email_configured) ? (
        <p className="pn-alert" role="status">
          <span><b>Maile nie wychodzą w pełni.</b>{" "}
          {!me.data.email_configured ? "Serwer nie ma klucza Brevo (BREVO_API_KEY, BREVO_FROM_EMAIL). " : ""}
          {!me.data.notify_email_configured ? "Brakuje adresu na powiadomienia (KORKI_NOTIFY_EMAIL) — nowe rezerwacje widzisz tylko tutaj." : ""}</span>
        </p>
      ) : null}

      <header className="pn-today__top">
        <p className="pn-today__lede" aria-live="polite">{lede || <span className="pn-skel" style={{ width: "min(520px, 80%)", height: 30 }} />}</p>
        <div className="pn-figs">
          {figs.map((f) => (
            <button key={f.k} type="button" className={`pn-fig ${f.hot ? "is-hot" : ""}`} onClick={() => go(f.tab)}>
              <span className="pn-num">{f.v ?? "–"}</span>
              <span className="pn-fig__k">{f.k}</span>
            </button>
          ))}
        </div>
      </header>

      <section className="pn-section" aria-labelledby="todo-h">
        <div className="pn-section__head">
          <h2 id="todo-h" className="pn-h2">Do zrobienia</h2>
          {todoCount ? <span className="pn-section__meta">{todoCount}</span> : null}
        </div>
        {todoLoading ? <Skeleton rows={2} /> : todoCount ? (
          <div className="pn-rows">
            {pending.data?.rows.map((b) => <TodoBooking key={`${b.id}-${b.version}`} b={b} onChange={reloadTodo} />)}
            {unread.slice(0, 8).map((m) => <TodoMessage key={m.id} m={m} onChange={msgs.reload} />)}
            {revs.data?.rows.slice(0, 8).map((r) => <TodoReview key={`${r.id}-${r.version}`} r={r} onChange={revs.reload} />)}
          </div>
        ) : (
          <div className="pn-todo__clear">
            <svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="17" /><path d="M12.5 20.5l5 5 10-11" /></svg>
            <p><b>Nic nie czeka.</b> Nowe rezerwacje, zapytania i opinie pojawią się tutaj — z przyciskiem do załatwienia od ręki.</p>
          </div>
        )}
        {unread.length > 8 ? <button type="button" className="pn-tbtn pn-tbtn--accent" onClick={() => go("wiadomosci")}>Wszystkie zapytania ({unread.length}) →</button> : null}
      </section>

      <section className="pn-section" aria-labelledby="axis-h">
        <div className="pn-section__head">
          <h2 id="axis-h" className="pn-h2">Rozkład</h2>
          <span className="pn-section__meta">najbliższe {HORIZON} dni</span>
          <button type="button" className="pn-tbtn pn-tbtn--mute" onClick={() => go("rezerwacje")}>Wszystkie rezerwacje →</button>
        </div>
        {axis.loading && !axis.data ? <Skeleton rows={3} /> : !axis.data ? (
          <Empty art="calendar" title="Nie udało się wczytać rozkładu" action={<button type="button" className="pn-tbtn pn-tbtn--accent" onClick={axis.reload}>Spróbuj ponownie</button>} />
        ) : !lessons.length ? (
          <>
            <Axis rows={[]} onChange={reloadTodo} />
            <Empty
              art="calendar"
              title="Kalendarz czeka na pierwszą lekcję"
              body={avail.data && !avail.data.rules.length ? "Ustaw godziny dostępności — dopiero wtedy uczniowie zobaczą wolne terminy na stronie." : "Wolne terminy są na stronie. Gdy ktoś zarezerwuje, lekcja stanie tutaj w rozkładzie."}
              action={avail.data && !avail.data.rules.length ? <button type="button" className="pn-btn" onClick={() => go("kalendarz")}>Ustaw dostępność</button> : <a className="pn-tbtn pn-tbtn--accent" href="/#rezerwacja" target="_blank" rel="noopener">Zobacz kalendarz na stronie ↗</a>}
            />
          </>
        ) : (
          <Axis rows={axis.data.rows} onChange={reloadTodo} />
        )}
      </section>

      {ready && doneCount < checklist.length ? (
        <section className="pn-section" aria-labelledby="start-h">
          <div className="pn-section__head">
            <h2 id="start-h" className="pn-h2">Na start</h2>
            <span className="pn-section__meta">{doneCount} z {checklist.length} gotowe</span>
          </div>
          <div className="pn-progress" aria-hidden="true"><span style={{ transform: `scaleX(${doneCount / checklist.length})` }} /></div>
          <ol className="pn-rows pn-start">
            {checklist.map((x, i) => (
              <li key={x.label} className={x.done ? "is-done" : ""}>
                <button type="button" className="pn-line pn-line--tap" onClick={() => go(x.tab)} disabled={x.done}>
                  <span className="pn-line__lead pn-time">{String(i + 1).padStart(2, "0")}</span>
                  <span className="pn-line__main"><span className="pn-line__title">{x.label}</span></span>
                  <span className="pn-line__trail">{x.done ? <span className="pn-status pn-status--ok">Gotowe</span> : <span className="pn-start__go" aria-hidden="true">→</span>}</span>
                </button>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}
