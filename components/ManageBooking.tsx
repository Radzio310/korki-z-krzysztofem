"use client";

import React from "react";
import Logo from "./Logo";
import Mascot from "./Mascot";
import ThemeToggle from "./ThemeToggle";
import type { Booking } from "@/lib/types";
import { publicApi } from "@/lib/api";
import { fmtLong, fmtTime } from "@/lib/time";
import { zl } from "@/lib/pricing";
import { ripple } from "@/lib/motion";
import "./sections/booking.css";
import "./manage.css";

const STATUS: Record<Booking["status"], { label: string; say: string }> = {
  pending: { label: "Czeka na potwierdzenie", say: "Krzysztof wkrótce potwierdzi termin — dam znać mailem." },
  confirmed: { label: "Potwierdzona", say: "Wszystko gotowe — do zobaczenia na lekcji!" },
  cancelled: { label: "Odwołana", say: "Ta lekcja jest odwołana. Wybierz nowy termin, kiedy zechcesz." },
  done: { label: "Odbyta", say: "Ta lekcja już się odbyła — mam nadzieję, że było warto!" },
  no_show: { label: "Nieodbyta", say: "Tej lekcji nie udało się odbyć — umówmy kolejną." },
};

export default function ManageBooking({ token }: { token: string }) {
  const [b, setB] = React.useState<Booking | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [confirm, setConfirm] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    publicApi.booking(token).then(setB).catch((e) => setError((e as Error).message));
  }, [token]);

  const cancel = async () => {
    setBusy(true);
    setError(null);
    try {
      setB(await publicApi.cancel(token, reason.trim() || undefined));
      setConfirm(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const upcoming = b && new Date(b.starts_at).getTime() > Date.now();
  const canCancel = b && (b.can_cancel ?? ((b.status === "pending" || b.status === "confirmed") && upcoming));
  const st = b ? STATUS[b.status] : null;

  return (
    <main className="mg">
      <header className="mg__top wrap">
        <a href="/" className="mg__brand"><Logo size={34} /> Korki <em>z</em> Krzysztofem</a>
        <ThemeToggle />
      </header>
      <section className="wrap mg__body">
        {!b && !error ? (
          <div className="mg__loading"><i className="spinner" /> Wczytuję rezerwację…</div>
        ) : !b ? (
          <div className="mg__card card">
            <Mascot mood="sad" size={120} say="Nie znajduję tej rezerwacji — sprawdź link z maila." side="left" />
            <p className="form-error">{error}</p>
            <a className="btn btn--primary" href="/#rezerwacja">Zarezerwuj termin</a>
          </div>
        ) : (
          <div className="mg__card card">
            <Mascot mood={b.status === "confirmed" ? "happy" : b.status === "pending" ? "think" : "idle"} size={120} say={st?.say} side="left" />
            <div className="bk__ticket">
              <div className="bk__ticket-top">
                <span className={`bk__status bk__status--${b.status}`}>{st?.label}</span>
                <h1 className="h-card">{fmtLong(b.starts_at)}</h1>
                <p className="bk__ticket-time">{fmtTime(b.starts_at)} · {b.duration_minutes} min{b.mode ? ` · ${b.mode === "online" ? "online" : "stacjonarnie"}` : ""}</p>
                <dl className="mg__dl">
                  <div><dt>Uczeń</dt><dd>{b.student_name}</dd></div>
                  {b.price_grosze != null ? <div><dt>Cena lekcji</dt><dd>{zl(b.price_grosze)}</dd></div> : null}
                  {b.tutor_note ? <div><dt>Notatka od Krzysztofa</dt><dd>{b.tutor_note}</dd></div> : null}
                </dl>
              </div>
              <div className="bk__ticket-cut" aria-hidden="true" />
              <div className="bk__ticket-bot">
                {b.status !== "cancelled" ? <a className="btn btn--sm" href={publicApi.icsUrl(token)}>📅 Dodaj do kalendarza</a> : null}
                <a className="btn btn--sm btn--ghost" href="/#rezerwacja">Nowy termin</a>
              </div>
            </div>

            {canCancel ? (
              confirm ? (
                <div className="mg__confirm">
                  <label className="field"><span>Powód (opcjonalnie — pomoże Krzysztofowi)</span>
                    <textarea className="input" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
                  </label>
                  <div className="mg__row">
                    <button type="button" className="btn btn--ghost" onClick={() => setConfirm(false)}>Zostaw lekcję</button>
                    <button type="button" className="btn mg__danger" onClick={cancel} disabled={busy} onPointerDown={ripple}>
                      {busy ? <i className="spinner" /> : "Tak, odwołuję"}
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" className="mg__cancel" onClick={() => setConfirm(true)}>Nie mogę przyjść — odwołaj lekcję</button>
              )
            ) : null}
            {error ? <p className="form-error">{error}</p> : null}
          </div>
        )}
      </section>
    </main>
  );
}
