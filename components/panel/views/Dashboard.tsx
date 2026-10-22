"use client";

import React from "react";
import Mascot from "../../Mascot";
import type { Booking, Offer, Content } from "@/lib/types";
import { fmtLong, fmtTime } from "@/lib/time";
import { useLoad } from "../ui";
import type { TabId } from "../PanelApp";
import { BookingRow } from "./Bookings";

type Overview = {
  counts: { bookings_pending: number; bookings_upcoming: number; reviews_pending: number; messages_unread: number; tasks_active: number; quiz_active: number };
  upcoming: Booking[];
  recent_bookings: Booking[];
  recent_messages: { id: number; name: string; email: string; message: string; read: boolean; created_at: string }[];
};
type Me = { login: string; email_configured: boolean; notify_email_configured: boolean };
type Avail = { rules: unknown[]; time_off: unknown[] };

export default function Dashboard({ go }: { go: (t: TabId) => void }) {
  const { data, loading, reload } = useLoad<Overview>("/korki/panel/overview");
  const me = useLoad<Me>("/korki/panel/me");
  const offer = useLoad<{ value: Offer }>("/korki/panel/settings/offer");
  const content = useLoad<{ value: Content }>("/korki/panel/settings/content");
  const avail = useLoad<Avail>("/korki/panel/availability");

  const c = data?.counts;
  const tiles: { k: string; v: number; tab: TabId; hot?: boolean }[] = c
    ? [
        { k: "Do potwierdzenia", v: c.bookings_pending, tab: "rezerwacje", hot: c.bookings_pending > 0 },
        { k: "Potwierdzone lekcje", v: c.bookings_upcoming, tab: "rezerwacje" },
        { k: "Opinie do akceptacji", v: c.reviews_pending, tab: "opinie", hot: c.reviews_pending > 0 },
        { k: "Nowe wiadomości", v: c.messages_unread, tab: "wiadomosci", hot: c.messages_unread > 0 },
      ]
    : [];

  /* Lista „na start”: każdy punkt prowadzi do miejsca, w którym się go załatwia. */
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
  const doneCount = checklist.filter((x) => x.done).length;
  const allDone = doneCount === checklist.length;

  return (
    <div className="pn-dash">
      {me.data && (!me.data.email_configured || !me.data.notify_email_configured) ? (
        <div className="pn-alert">
          <b>Maile nie wychodzą w pełni.</b>{" "}
          {!me.data.email_configured ? "Serwer nie ma klucza Brevo (BREVO_API_KEY, BREVO_FROM_EMAIL). " : ""}
          {!me.data.notify_email_configured ? "Brakuje adresu na powiadomienia (KORKI_NOTIFY_EMAIL) — nowe rezerwacje widzisz tylko tutaj." : ""}
        </div>
      ) : null}

      <div className="pn-tiles">
        {loading && !c ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="pn-tile is-skel" />) : tiles.map((t) => (
          <button key={t.k} type="button" className={`pn-tile ${t.hot ? "is-hot" : ""}`} onClick={() => go(t.tab)}>
            <strong>{t.v}</strong>
            <span>{t.k}</span>
          </button>
        ))}
      </div>

      {!allDone ? (
        <section className="pn-card pn-check">
          <div className="pn-check__head">
            <Mascot mood="think" size={84} say={`${doneCount} z ${checklist.length} gotowe — jeszcze chwila i strona jest kompletna.`} side="left" />
            <div className="pn-progress"><span style={{ width: `${(doneCount / checklist.length) * 100}%` }} /></div>
          </div>
          <ul>
            {checklist.map((x) => (
              <li key={x.label} className={x.done ? "is-done" : ""}>
                <button type="button" onClick={() => go(x.tab)} disabled={x.done}>
                  <i aria-hidden="true">{x.done ? "✓" : ""}</i>{x.label}{!x.done ? <em>→</em> : null}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="pn-cols">
        <section className="pn-card">
          <header className="pn-card__head"><h2>Najbliższe lekcje</h2><button type="button" className="btn btn--sm btn--ghost" onClick={() => go("rezerwacje")}>Wszystkie</button></header>
          {data?.upcoming?.length ? (
            <div className="pn-list">{data.upcoming.map((b) => <BookingRow key={b.id} b={b} onChange={reload} compact />)}</div>
          ) : (
            <p className="muted pn-pad">Brak zaplanowanych lekcji. Gdy ktoś zarezerwuje termin, zobaczysz go tutaj i dostaniesz maila.</p>
          )}
        </section>
        <section className="pn-card">
          <header className="pn-card__head"><h2>Ostatnie wiadomości</h2><button type="button" className="btn btn--sm btn--ghost" onClick={() => go("wiadomosci")}>Wszystkie</button></header>
          {data?.recent_messages?.length ? (
            <ul className="pn-msgs">
              {data.recent_messages.map((m) => (
                <li key={m.id} className={m.read ? "" : "is-new"}>
                  <b>{m.name}</b> <small className="muted">{fmtLong(m.created_at)}, {fmtTime(m.created_at)}</small>
                  <p>{m.message.length > 140 ? `${m.message.slice(0, 140)}…` : m.message}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted pn-pad">Cisza w skrzynce. Wiadomości z formularza kontaktowego trafią tutaj i na Twojego maila.</p>
          )}
        </section>
      </div>
    </div>
  );
}
