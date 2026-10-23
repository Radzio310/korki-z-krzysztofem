"use client";

import React from "react";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";
import Avatar from "./chat/Avatar";
import Ticket from "./chat/Ticket";
import type { Booking } from "@/lib/types";
import { publicApi } from "@/lib/api";
import { levelLabel, modeLabel, subjectLabel } from "@/lib/contact";
import { ripple } from "@/lib/motion";
import "./chat/chat.css";
import "./manage.css";

/* Strona z linku w mailu: ten sam bilet co w czacie (bez drukowania — pieczęć spada od razu),
   Krzysztof mówi w dymku, co dalej. Odwołanie: dwa kroki w miejscu, bez systemowego okna;
   po odwołaniu pieczęć zmienia się na „Odwołana”. */

const SAY: Record<Booking["status"], string> = {
  pending: "Mam Twoją rezerwację. Potwierdzę termin i dam znać mailem.",
  confirmed: "Termin potwierdzony. Do zobaczenia na lekcji!",
  cancelled: "Ta lekcja jest odwołana. Wybierz nowy termin, kiedy zechcesz.",
  done: "Ta lekcja już się odbyła. Umówimy kolejną?",
  no_show: "Tej lekcji nie udało się odbyć. Umówmy kolejną.",
};

export default function ManageBooking({ token }: { token: string }) {
  const [b, setB] = React.useState<Booking | null>(null);
  const [loadErr, setLoadErr] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [confirm, setConfirm] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [retry, setRetry] = React.useState(0);
  const reasonRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    setLoadErr(null);
    publicApi.booking(token).then(setB).catch((e) => setLoadErr((e as Error).message));
  }, [token, retry]);

  React.useEffect(() => { if (confirm) reasonRef.current?.focus(); }, [confirm]);

  const cancel = async () => {
    if (busy) return;
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

  return (
    <main className="mg">
      <header className="mg__top wrap">
        <a href="/" className="mg__brand"><Logo size={34} /> Korki <em>z</em> Krzysztofem</a>
        <ThemeToggle />
      </header>

      <section className="wrap mg__body" aria-live="polite">
        {!b && !loadErr ? (
          <div className="mg__col" aria-busy="true">
            <div className="kc-row kc-row--bot is-tail">
              <Avatar size={36} typing className="kc-row__av" />
              <span className="kc-b kc-b--bot kc-typing"><i /><i /><i /></span>
            </div>
            <div className="mg__skel" aria-label="Wczytuję rezerwację" />
          </div>
        ) : !b ? (
          <div className="mg__col">
            <div className="kc-row kc-row--bot is-tail">
              <Avatar size={36} className="kc-row__av" />
              <div className="kc-b kc-b--bot mg__say">
                <p><b>Nie znajduję tej rezerwacji.</b> Sprawdź, czy link z maila skopiował się w całości.</p>
                <p className="mg__muted">{loadErr}</p>
              </div>
            </div>
            <div className="mg__row">
              <button type="button" className="btn btn--sm" onClick={() => setRetry((n) => n + 1)}>Spróbuj ponownie</button>
              <a className="btn btn--primary btn--sm" href="/#rezerwacja" onPointerDown={ripple}>Zarezerwuj termin</a>
            </div>
          </div>
        ) : (
          <div className="mg__col">
            <div className="kc-row kc-row--bot is-tail" key={b.status}>
              <Avatar size={36} className="kc-row__av" />
              <p className="kc-b kc-b--bot mg__say">{SAY[b.status]}</p>
            </div>

            <div className="mg__ticket">
              <Ticket
                key={b.status}
                data={{
                  id: b.id, status: b.status, starts_at: b.starts_at, ends_at: b.ends_at, duration_minutes: b.duration_minutes,
                  student_name: b.student_name,
                  subject: b.subject_key ? subjectLabel(b.subject_key) : null,
                  level: b.level_key ? levelLabel(b.level_key) : null,
                  mode: b.mode ? modeLabel(b.mode) : null,
                  price_grosze: b.price_grosze, token,
                }}
                actions={
                  <>
                    {b.status !== "cancelled" ? (
                      <a className="is-main" href={publicApi.icsUrl(token)} download>
                        <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4M12 13v5M9.5 15.5h5" /></svg>
                        Dodaj do kalendarza
                      </a>
                    ) : null}
                    <a href="/#rezerwacja">Nowy termin</a>
                  </>
                }
              />
            </div>

            {b.tutor_note ? (
              <div className="kc-row kc-row--bot is-tail">
                <Avatar size={36} className="kc-row__av" />
                <p className="kc-b kc-b--bot mg__say"><small className="mg__label">Notatka od Krzysztofa</small>{b.tutor_note}</p>
              </div>
            ) : null}

            {canCancel ? (
              confirm ? (
                <div className="mg__confirm" role="group" aria-labelledby="mg-c-title">
                  <p id="mg-c-title" className="mg__confirm-title">Odwołać tę lekcję?</p>
                  <label className="kcf__field">
                    <span className="mg__label">Powód (opcjonalnie — pomoże Krzysztofowi)</span>
                    <textarea ref={reasonRef} className="kcf__input kcf__area" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
                  </label>
                  <div className="mg__row">
                    <button type="button" className="btn btn--sm btn--ghost" onClick={() => setConfirm(false)}>Zostaw lekcję</button>
                    <button type="button" className="btn btn--sm mg__danger" onClick={cancel} aria-disabled={busy || undefined} onPointerDown={ripple}>
                      {busy ? <><i className="spinner" aria-hidden="true" /> Odwołuję…</> : "Tak, odwołuję"}
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" className="mg__cancel" onClick={() => setConfirm(true)}>Nie mogę przyjść — odwołaj lekcję</button>
              )
            ) : null}
            {error ? <p className="form-error" role="alert">{error}</p> : null}
          </div>
        )}
      </section>
    </main>
  );
}
