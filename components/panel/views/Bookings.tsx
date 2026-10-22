"use client";

import React from "react";
import type { Booking, BookingStatus, List } from "@/lib/types";
import { fmtLong, fmtTime } from "@/lib/time";
import { zl } from "@/lib/pricing";
import { ApiError } from "@/lib/api";
import { Empty, usePanel, usePanelApi, useLoad } from "../ui";

const LABEL: Record<BookingStatus, string> = {
  pending: "Do potwierdzenia",
  confirmed: "Potwierdzona",
  done: "Odbyta",
  no_show: "Nieobecność",
  cancelled: "Odwołana",
};

const FILTERS: { id: string; label: string; q: string }[] = [
  { id: "upcoming", label: "Nadchodzące", q: "status=pending,confirmed&order=asc" },
  { id: "pending", label: "Do potwierdzenia", q: "status=pending&order=asc" },
  { id: "past", label: "Historia", q: "status=done,no_show,cancelled&order=desc" },
  { id: "all", label: "Wszystkie", q: "order=desc" },
];

export function BookingRow({ b, onChange, compact = false }: { b: Booking; onChange: () => void; compact?: boolean }) {
  const call = usePanelApi();
  const { toast } = usePanel();
  const [open, setOpen] = React.useState(false);
  const [note, setNote] = React.useState(b.tutor_note || "");
  const [reason, setReason] = React.useState("");
  const [busy, setBusy] = React.useState<string | null>(null);
  const past = new Date(b.starts_at).getTime() < Date.now();

  const patch = async (body: Record<string, unknown>, label: string, msg: string) => {
    setBusy(label);
    try {
      await call(`/korki/panel/bookings/${b.id}`, { method: "PATCH", body: { ...body, version: b.version } });
      toast(msg);
      onChange();
    } catch (e) {
      if ((e as ApiError).status === 409) onChange();
    } finally {
      setBusy(null);
    }
  };

  return (
    <article className={`pn-bk pn-bk--${b.status} ${open ? "is-open" : ""}`}>
      <button type="button" className="pn-bk__main" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className="pn-bk__date">
          <b>{fmtTime(b.starts_at)}</b>
          <small>{fmtLong(b.starts_at)}</small>
        </span>
        <span className="pn-bk__who">
          <b>{b.student_name}</b>
          <small>{[b.level_key, `${b.duration_minutes} min`, b.mode === "online" ? "online" : b.mode === "stationary" ? "stacjonarnie" : null].filter(Boolean).join(" · ")}</small>
        </span>
        <span className={`pn-pill pn-pill--${b.status}`}>{LABEL[b.status]}</span>
      </button>
      {open || !compact ? (
        <div className={`pn-bk__more ${open ? "" : "is-collapsed"}`}>
          <div className="pn-bk__grid">
            <div><small>E-mail</small><a href={`mailto:${b.email}`}>{b.email}</a></div>
            {b.phone ? <div><small>Telefon</small><a href={`tel:${b.phone}`}>{b.phone}</a></div> : null}
            {b.price_grosze != null ? <div><small>Cena lekcji</small><span>{zl(b.price_grosze)}</span></div> : null}
            {b.weekly_lessons ? <div><small>Planowane spotkania</small><span>{b.weekly_lessons}× w tygodniu</span></div> : null}
            {b.message ? <div className="pn-bk__wide"><small>Wiadomość</small><p>{b.message}</p></div> : null}
            {b.cancel_reason ? <div className="pn-bk__wide"><small>Powód odwołania</small><p>{b.cancel_reason}</p></div> : null}
          </div>
          <label className="field">
            <span>Notatka dla ucznia (widzi ją na stronie rezerwacji)</span>
            <textarea className="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={4000} placeholder="np. link do spotkania online, co przygotować" />
          </label>
          {b.status === "pending" || b.status === "confirmed" ? (
            <label className="field">
              <span>Powód odwołania (trafi do maila, jeśli odwołasz)</span>
              <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={1000} />
            </label>
          ) : null}
          <div className="pn-bk__actions">
            {note !== (b.tutor_note || "") ? (
              <button type="button" className="btn btn--sm" disabled={!!busy} onClick={() => patch({ tutor_note: note }, "note", "Notatka zapisana.")}>{busy === "note" ? <i className="spinner" /> : "Zapisz notatkę"}</button>
            ) : null}
            {b.status === "pending" ? (
              <button type="button" className="btn btn--sm btn--primary" disabled={!!busy} onClick={() => patch({ status: "confirmed", tutor_note: note }, "ok", "Potwierdzone — uczeń dostał maila.")}>{busy === "ok" ? <i className="spinner" /> : "Potwierdź"}</button>
            ) : null}
            {(b.status === "confirmed" || b.status === "pending") && past ? (
              <>
                <button type="button" className="btn btn--sm" disabled={!!busy} onClick={() => patch({ status: "done" }, "done", "Oznaczone jako odbyta.")}>Odbyta</button>
                <button type="button" className="btn btn--sm btn--ghost" disabled={!!busy} onClick={() => patch({ status: "no_show" }, "ns", "Oznaczone jako nieobecność.")}>Nieobecność</button>
              </>
            ) : null}
            {b.status === "pending" || b.status === "confirmed" ? (
              <button type="button" className="btn btn--sm btn--ghost pn-danger-text" disabled={!!busy} onClick={() => patch({ status: "cancelled", cancel_reason: reason || null }, "cancel", "Odwołane — uczeń dostał maila.")}>{busy === "cancel" ? <i className="spinner" /> : "Odwołaj"}</button>
            ) : null}
          </div>
        </div>
      ) : null}
    </article>
  );
}

export default function Bookings() {
  const [f, setF] = React.useState(FILTERS[0]);
  const [page, setPage] = React.useState(0);
  const limit = 30;
  const { data, loading, reload } = useLoad<List<Booking>>(`/korki/panel/bookings?${f.q}&limit=${limit}&offset=${page * limit}`);

  return (
    <div className="pn-stack">
      <div className="pn-filters" role="tablist">
        {FILTERS.map((x) => (
          <button key={x.id} type="button" role="tab" aria-selected={f.id === x.id} className="chip" aria-pressed={f.id === x.id} onClick={() => { setF(x); setPage(0); }}>{x.label}</button>
        ))}
        <button type="button" className="btn btn--sm btn--ghost pn-refresh" onClick={reload} aria-label="Odśwież">↻</button>
      </div>
      {loading && !data ? (
        <div className="pn-list">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="pn-bk is-skel" />)}</div>
      ) : !data?.rows.length ? (
        <Empty title="Pusto" body={f.id === "pending" ? "Nic nie czeka na potwierdzenie." : "Nie ma tu jeszcze żadnych rezerwacji. Upewnij się, że dostępność jest ustawiona — bez niej kalendarz na stronie jest pusty."} />
      ) : (
        <>
          <div className="pn-list">{data.rows.map((b) => <BookingRow key={`${b.id}-${b.version}`} b={b} onChange={reload} />)}</div>
          {data.total > limit ? (
            <div className="pn-pager">
              <button type="button" className="btn btn--sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>← Nowsze</button>
              <span className="muted">{page * limit + 1}–{Math.min(data.total, (page + 1) * limit)} z {data.total}</span>
              <button type="button" className="btn btn--sm" disabled={(page + 1) * limit >= data.total} onClick={() => setPage((p) => p + 1)}>Starsze →</button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
