"use client";

import React from "react";
import type { Booking, BookingStatus, List, Offer } from "@/lib/types";
import { fmtLong, fmtTime, warsawDay, addDays } from "@/lib/time";
import { zl } from "@/lib/pricing";
import { levelLabel, prettyPhone, subjectLabel } from "@/lib/contact";
import { ApiError } from "@/lib/api";
import { Empty, Sheet, Skeleton, Tabs, usePanel, usePanelApi, useLoad, useUndoable } from "../ui";
import { Icon } from "../icons";

export const STATUS: Record<BookingStatus, string> = {
  pending: "Do potwierdzenia",
  confirmed: "Potwierdzona",
  done: "Odbyta",
  no_show: "Nieobecność",
  cancelled: "Odwołana",
};

const FILTERS = [
  { id: "upcoming", label: "Nadchodzące", q: "status=pending,confirmed&order=asc&from=TODAY" },
  { id: "pending", label: "Do potwierdzenia", q: "status=pending&order=asc" },
  { id: "past", label: "Historia", q: "status=done,no_show,cancelled&order=desc" },
  { id: "all", label: "Wszystkie", q: "order=desc" },
] as const;
type FilterId = (typeof FILTERS)[number]["id"];

/* ── nazwy z oferty (poziom/przedmiot): jedno zapytanie na wejście do widoku ── */
let offerCache: Promise<Offer | null> | null = null;
export function resetOfferNames() { offerCache = null; }
export function useOfferNames() {
  const call = usePanelApi();
  const [offer, setOffer] = React.useState<Offer | null>(null);
  React.useEffect(() => {
    let alive = true;
    offerCache ??= call<{ value: Offer }>("/korki/panel/settings/offer", { quiet: true }).then((r) => r.value).catch(() => { offerCache = null; return null; });
    offerCache.then((o) => { if (alive) setOffer(o); });
    return () => { alive = false; };
  }, [call]);
  return React.useMemo(() => ({
    level: (k: string | null) => (k ? offer?.levels.find((l) => l.key === k)?.name || levelLabel(k) : null),
    subject: (k: string | null) => (k ? offer?.subjects.find((s) => s.key === k)?.name || subjectLabel(k) : null),
  }), [offer]);
}
export const plural = (n: number, one: string, few: string, many: string) =>
  n === 1 ? one : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? few : many;
export const modeName = (m: string | null) => (m === "online" ? "online" : m === "stationary" ? "stacjonarnie" : null);

/* ── dni: „Dziś”, „Jutro”, potem nazwa dnia ── */
export const bookingDay = (iso: string) => warsawDay(new Date(iso));
export function dayTitle(day: string): { title: string; date: string } {
  const today = warsawDay();
  const date = fmtLong(`${day}T12:00:00Z`);
  if (day === today) return { title: "Dziś", date };
  if (day === addDays(today, 1)) return { title: "Jutro", date };
  if (day === addDays(today, -1)) return { title: "Wczoraj", date };
  const [wd, ...rest] = date.split(" ");
  return { title: wd.replace(",", ""), date: rest.join(" ") };
}
export function groupByDay(rows: Booking[]) {
  const out: { day: string; rows: Booking[] }[] = [];
  for (const b of rows) {
    const d = bookingDay(b.starts_at);
    const last = out[out.length - 1];
    if (last && last.day === d) last.rows.push(b);
    else out.push({ day: d, rows: [b] });
  }
  return out;
}

/* ── zmiana statusu: wspólna dla wiersza, arkusza i „Dziś” ── */
export function useBookingPatch(b: Booking, onChange: () => void) {
  const call = usePanelApi();
  const { toast, refresh } = usePanel();
  const [busy, setBusy] = React.useState<string | null>(null);
  const patch = React.useCallback(async (body: Record<string, unknown>, label: string, msg: string) => {
    setBusy(label);
    try {
      await call(`/korki/panel/bookings/${b.id}`, { method: "PATCH", body: { ...body, version: b.version } });
      toast(msg);
      onChange();
      refresh?.();
      return true;
    } catch (e) {
      if ((e as ApiError).status === 409) onChange();
      return false;
    } finally {
      setBusy(null);
    }
  }, [b.id, b.version, call, toast, onChange, refresh]);
  return { patch, busy };
}

/* Odrzucenie jednym gestem: wiersz znika od razu, PATCH idzie po 5 s, chyba że „Cofnij”. */
export function useReject(b: Booking, onChange: () => void) {
  const later = useUndoable();
  const { patch } = useBookingPatch(b, onChange);
  const [gone, setGone] = React.useState(false);
  const reject = () => {
    setGone(true);
    later({
      msg: `Odrzucono: ${b.student_name}. Uczeń dostanie maila.`,
      run: () => { void patch({ status: "cancelled", cancel_reason: null }, "cancel", "Rezerwacja odrzucona — mail wysłany."); },
      undo: () => setGone(false),
    });
  };
  return { gone, reject };
}

function meta(b: Booking, names: ReturnType<typeof useOfferNames>) {
  return [names.subject(b.subject_key), names.level(b.level_key), modeName(b.mode), b.price_grosze != null ? zl(b.price_grosze) : null].filter(Boolean).join(" · ");
}

/* Wiersz rezerwacji. Stary podpis ({ b, onChange, compact }) zostaje. */
export function BookingRow({ b, onChange, compact = false, showDate = false }: { b: Booking; onChange: () => void; compact?: boolean; showDate?: boolean }) {
  const names = useOfferNames();
  const [open, setOpen] = React.useState(false);
  const { patch, busy } = useBookingPatch(b, onChange);
  const { gone, reject } = useReject(b, onChange);
  const end = b.ends_at ? fmtTime(b.ends_at) : null;
  if (gone) return null;
  return (
    <>
      <article className={`pn-line pn-line--tap pn-line--stack pn-bk pn-bk--${b.status}`} onClick={() => setOpen(true)}>
        <div className="pn-line__lead pn-bk__time">
          <span className="pn-time">{fmtTime(b.starts_at)}</span>
          <small>{showDate ? fmtLong(b.starts_at).split(",")[0] : end ? `do ${end}` : `${b.duration_minutes} min`}</small>
        </div>
        <div className="pn-line__main">
          <button type="button" className="pn-line__title pn-bk__name" onClick={(e) => { e.stopPropagation(); setOpen(true); }} aria-haspopup="dialog">{b.student_name}</button>
          <span className="pn-line__meta">{meta(b, names) || `${b.duration_minutes} min`}</span>
        </div>
        <div className="pn-line__trail" onClick={(e) => e.stopPropagation()}>
          {b.status === "pending" && !compact ? (
            <>
              <button type="button" className="pn-tbtn pn-tbtn--danger" onClick={reject} disabled={!!busy}>Odrzuć</button>
              <button type="button" className="pn-btn pn-btn--sm" disabled={!!busy} onClick={() => patch({ status: "confirmed" }, "ok", "Potwierdzone — uczeń dostał maila.")}>
                {busy === "ok" ? <i className="spinner" /> : "Potwierdź"}
              </button>
            </>
          ) : (
            <span className={`pn-status pn-status--${b.status}`}>{STATUS[b.status]}</span>
          )}
        </div>
      </article>
      <BookingSheet b={b} open={open} onClose={() => setOpen(false)} onChange={onChange} />
    </>
  );
}

/* Arkusz rezerwacji: wszystkie dane + działania. Odwołanie ma krok „Na pewno?” z powodem. */
export function BookingSheet({ b, open, onClose, onChange }: { b: Booking; open: boolean; onClose: () => void; onChange: () => void }) {
  const names = useOfferNames();
  const { patch, busy } = useBookingPatch(b, onChange);
  const [note, setNote] = React.useState(b.tutor_note || "");
  const [reason, setReason] = React.useState("");
  const [asking, setAsking] = React.useState(false);
  React.useEffect(() => { if (open) { setNote(b.tutor_note || ""); setAsking(false); setReason(""); } }, [open, b.tutor_note]);
  const past = new Date(b.starts_at).getTime() < Date.now();
  const live = b.status === "pending" || b.status === "confirmed";
  const act = async (body: Record<string, unknown>, label: string, msg: string) => {
    if (await patch(body, label, msg)) onClose();
  };
  const phone = b.phone?.replace(/[^\d+]/g, "");
  const wa = b.phone ? (() => { const d = b.phone.replace(/\D/g, ""); return d.length === 9 ? `48${d}` : d; })() : null;

  const foot = asking ? (
    <>
      <button type="button" className="pn-tbtn pn-tbtn--mute" onClick={() => setAsking(false)}>Zostaw</button>
      <button type="button" className="pn-btn pn-btn--danger" disabled={!!busy} onClick={() => act({ status: "cancelled", cancel_reason: reason.trim() || null, tutor_note: note }, "cancel", "Odwołane — uczeń dostał maila.")}>
        {busy === "cancel" ? <i className="spinner" /> : b.status === "pending" ? "Odrzuć i wyślij maila" : "Odwołaj i wyślij maila"}
      </button>
    </>
  ) : (
    <>
      {note !== (b.tutor_note || "") ? (
        <button type="button" className="pn-tbtn pn-tbtn--accent" disabled={!!busy} onClick={() => patch({ tutor_note: note }, "note", "Notatka zapisana.")}>{busy === "note" ? <i className="spinner" /> : "Zapisz notatkę"}</button>
      ) : null}
      {live ? <button type="button" className="pn-tbtn pn-tbtn--danger" onClick={() => setAsking(true)}>{b.status === "pending" ? "Odrzuć" : "Odwołaj"}</button> : null}
      {live && past ? (
        <>
          <button type="button" className="pn-tbtn pn-tbtn--mute" disabled={!!busy} onClick={() => act({ status: "no_show" }, "ns", "Oznaczone jako nieobecność.")}>Nieobecność</button>
          <button type="button" className="pn-btn pn-btn--line" disabled={!!busy} onClick={() => act({ status: "done" }, "done", "Oznaczone jako odbyta.")}>Odbyta</button>
        </>
      ) : null}
      {b.status === "pending" ? (
        <button type="button" className="pn-btn" disabled={!!busy} onClick={() => act({ status: "confirmed", tutor_note: note }, "ok", "Potwierdzone — uczeń dostał maila.")}>{busy === "ok" ? <i className="spinner" /> : "Potwierdź"}</button>
      ) : null}
    </>
  );

  return (
    <Sheet open={open} onClose={onClose} kicker={STATUS[b.status]} title={b.student_name} foot={foot}>
      {asking ? (
        <div className="pn-form pn-ask">
          <p>{b.status === "pending" ? "Uczeń dostanie maila, że termin nie jest potwierdzony." : "Uczeń dostanie maila o odwołaniu lekcji."} Tego nie da się cofnąć.</p>
          <label>
            <span className="pn-label">Powód (trafi do maila, opcjonalnie)</span>
            <textarea className="pn-area" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={1000} autoFocus placeholder="np. choroba — zaproponuję nowy termin" />
          </label>
        </div>
      ) : (
        <div className="pn-form">
          <dl className="pn-dl">
            <div><dt>Termin</dt><dd><b className="pn-time">{fmtTime(b.starts_at)}{b.ends_at ? `–${fmtTime(b.ends_at)}` : ""}</b> · {fmtLong(b.starts_at)}</dd></div>
            <div><dt>Lekcja</dt><dd>{[`${b.duration_minutes} min`, names.subject(b.subject_key), names.level(b.level_key), modeName(b.mode)].filter(Boolean).join(" · ")}</dd></div>
            {b.weekly_lessons ? <div><dt>W tygodniu</dt><dd>{b.weekly_lessons}× w tygodniu</dd></div> : null}
            {b.price_grosze != null ? <div><dt>Cena lekcji</dt><dd>{zl(b.price_grosze)}</dd></div> : null}
            <div><dt>E-mail</dt><dd><a href={`mailto:${b.email}`}>{b.email}</a></dd></div>
            {b.phone ? <div><dt>Telefon</dt><dd><a href={`tel:${phone}`}>{prettyPhone(b.phone)}</a>{wa ? <> · <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer">WhatsApp</a></> : null}</dd></div> : null}
            {b.message ? <div><dt>Wiadomość</dt><dd>{b.message}</dd></div> : null}
            {b.cancel_reason ? <div><dt>Powód odwołania</dt><dd>{b.cancel_reason}</dd></div> : null}
            <div><dt>Zgłoszona</dt><dd>{fmtLong(b.created_at)}, {fmtTime(b.created_at)}</dd></div>
            {b.token ? <div><dt>Strona ucznia</dt><dd><a href={`/rezerwacja/${b.token}`} target="_blank" rel="noopener">Otwórz rezerwację ↗</a></dd></div> : null}
          </dl>
          <label>
            <span className="pn-label">Notatka dla ucznia — widzi ją na stronie rezerwacji</span>
            <textarea className="pn-area" value={note} onChange={(e) => setNote(e.target.value)} maxLength={4000} placeholder="np. link do spotkania online, co przygotować" />
          </label>
        </div>
      )}
    </Sheet>
  );
}

/* Lista pogrupowana po dniach — nagłówek dnia jak w rozkładzie. */
export function DayGroups({ rows, onChange, compact = false }: { rows: Booking[]; onChange: () => void; compact?: boolean }) {
  return (
    <div className="pn-days">
      {groupByDay(rows).map((g) => {
        const t = dayTitle(g.day);
        return (
          <section key={g.day} className="pn-daygroup" aria-label={`${t.title} ${t.date}`}>
            <h3 className="pn-daygroup__head"><b>{t.title}</b><span>{t.date}</span><em>{g.rows.length} {plural(g.rows.length, "lekcja", "lekcje", "lekcji")}</em></h3>
            <div className="pn-rows">{g.rows.map((b) => <BookingRow key={`${b.id}-${b.version}`} b={b} onChange={onChange} compact={compact} />)}</div>
          </section>
        );
      })}
    </div>
  );
}

export default function Bookings() {
  const [f, setF] = React.useState<FilterId>("upcoming");
  const [page, setPage] = React.useState(0);
  React.useEffect(() => resetOfferNames(), []);
  const limit = 30;
  const q = FILTERS.find((x) => x.id === f)!.q.replace("TODAY", warsawDay());
  const { data, loading, reload } = useLoad<List<Booking>>(`/korki/panel/bookings?${q}&limit=${limit}&offset=${page * limit}`);
  const pend = useLoad<List<Booking>>("/korki/panel/bookings?status=pending&limit=1");
  const change = React.useCallback(() => { reload(); pend.reload(); }, [reload, pend]);

  return (
    <div className="pn-page">
      <div className="pn-bar">
        <Tabs
          label="Filtr rezerwacji"
          value={f}
          onChange={(id) => { setF(id); setPage(0); }}
          items={FILTERS.map((x) => ({ id: x.id, label: x.label, count: x.id === "pending" ? pend.data?.total : undefined }))}
        />
        <button type="button" className="pn-icon" onClick={change} aria-label="Odśwież"><Icon name="odswiez" /></button>
      </div>
      {loading && !data ? (
        <Skeleton rows={4} />
      ) : !data ? (
        <Empty title="Nie udało się wczytać rezerwacji" body="Sprawdź połączenie i spróbuj jeszcze raz." action={<button type="button" className="pn-tbtn pn-tbtn--accent" onClick={reload}>Spróbuj ponownie</button>} art="calendar" />
      ) : !data.rows.length ? (
        <Empty
          art="calendar"
          title={f === "pending" ? "Nic nie czeka na potwierdzenie" : f === "past" ? "Historia jest jeszcze pusta" : "Brak rezerwacji"}
          body={f === "pending" ? "Gdy ktoś zarezerwuje termin, pojawi się tutaj i na „Dziś”. Dostaniesz też maila." : f === "past" ? "Odbyte, odwołane i nieobecności trafią tutaj." : "Uczniowie rezerwują w kalendarzu na stronie — upewnij się, że dostępność jest ustawiona, bez niej kalendarz jest pusty."}
        />
      ) : (
        <>
          <DayGroups rows={data.rows} onChange={change} />
          {data.total > limit ? (
            <div className="pn-pager">
              <button type="button" className="pn-tbtn" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>← {f === "upcoming" || f === "pending" ? "Wcześniejsze" : "Nowsze"}</button>
              <span className="pn-mute">{page * limit + 1}–{Math.min(data.total, (page + 1) * limit)} z {data.total}</span>
              <button type="button" className="pn-tbtn" disabled={(page + 1) * limit >= data.total} onClick={() => setPage((p) => p + 1)}>{f === "upcoming" || f === "pending" ? "Późniejsze" : "Starsze"} →</button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
