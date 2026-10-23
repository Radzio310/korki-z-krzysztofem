"use client";

import React from "react";
import type { ContactMessage, List } from "@/lib/types";
import { fmtLong, fmtTime } from "@/lib/time";
import { levelLabel, modeLabel, prettyPhone, subjectLabel } from "@/lib/contact";
import { Empty, usePanelApi, useLoad } from "../ui";
import "./messages.css";

const digits = (p: string) => p.replace(/[^\d+]/g, "");
const waNumber = (p: string) => {
  const d = p.replace(/\D/g, "");
  return d.length === 9 ? `48${d}` : d;
};

export default function Messages() {
  const call = usePanelApi();
  const { data, loading, reload } = useLoad<List<ContactMessage>>("/korki/panel/messages?limit=100");
  const mark = async (m: ContactMessage, read: boolean) => {
    try { await call(`/korki/panel/messages/${m.id}`, { method: "PATCH", body: { read } }); reload(); } catch { /* tost */ }
  };
  if (loading && !data) return <div className="pn-card is-skel" style={{ height: 200 }} />;
  if (!data?.rows.length) return <Empty title="Brak wiadomości" body="Zapytania z formularza „Zapytaj o zajęcia” pojawią się tutaj i przyjdą na Twojego maila." />;
  return (
    <div className="pn-list">
      {data.rows.map((m) => {
        const tags = [
          ...(m.subjects || []).map((s) => subjectLabel(s)),
          m.level ? levelLabel(m.level) : "",
          m.mode ? modeLabel(m.mode) : "",
        ].filter(Boolean);
        return (
          <article key={m.id} className={`pn-review ${m.read ? "" : "is-new"}`}>
            <header>
              {!m.read ? <span className="pn-dot" aria-label="nowa" /> : null}
              <b>{m.name}</b>
              <small className="muted">{fmtLong(m.created_at)}, {fmtTime(m.created_at)}</small>
            </header>
            {tags.length || m.class_info ? (
              <div className="pn-msg__tags">
                {tags.map((t, i) => <span key={i}>{t}</span>)}
                {m.class_info ? <span className="is-plain">{m.class_info}</span> : null}
              </div>
            ) : null}
            {m.message ? <p>{m.message}</p> : <p className="muted pn-msg__none">Bez dodatkowej wiadomości.</p>}
            <p className="pn-msg__links">
              {m.phone ? <a href={`tel:${digits(m.phone)}`}>{prettyPhone(m.phone)}</a> : null}
              {m.phone ? <a href={`https://wa.me/${waNumber(m.phone)}`} target="_blank" rel="noopener noreferrer">WhatsApp</a> : null}
              {m.email ? <a href={`mailto:${m.email}`}>{m.email}</a> : null}
            </p>
            <div className="pn-bk__actions">
              {m.email ? (
                <a className="btn btn--sm btn--primary" href={`mailto:${m.email}?subject=${encodeURIComponent("Re: Korki z Krzysztofem")}`} onClick={() => !m.read && mark(m, true)}>Odpowiedz mailem</a>
              ) : m.phone ? (
                <a className="btn btn--sm btn--primary" href={`tel:${digits(m.phone)}`} onClick={() => !m.read && mark(m, true)}>Zadzwoń</a>
              ) : null}
              <button type="button" className="btn btn--sm btn--ghost" onClick={() => mark(m, !m.read)}>{m.read ? "Oznacz jako nowe" : "Oznacz jako przeczytane"}</button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
