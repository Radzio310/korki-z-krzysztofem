"use client";

import React from "react";
import type { List } from "@/lib/types";
import { fmtLong, fmtTime } from "@/lib/time";
import { Empty, usePanelApi, useLoad } from "../ui";

type Msg = { id: number; name: string; email: string; phone: string | null; message: string; read: boolean; created_at: string };

export default function Messages() {
  const call = usePanelApi();
  const { data, loading, reload } = useLoad<List<Msg>>("/korki/panel/messages?limit=100");
  const mark = async (m: Msg, read: boolean) => {
    try { await call(`/korki/panel/messages/${m.id}`, { method: "PATCH", body: { read } }); reload(); } catch { /* tost */ }
  };
  if (loading && !data) return <div className="pn-card is-skel" style={{ height: 200 }} />;
  if (!data?.rows.length) return <Empty title="Brak wiadomości" body="Wiadomości z formularza kontaktowego pojawią się tutaj i przyjdą na Twojego maila." />;
  return (
    <div className="pn-list">
      {data.rows.map((m) => (
        <article key={m.id} className={`pn-review ${m.read ? "" : "is-new"}`}>
          <header>
            {!m.read ? <span className="pn-dot" aria-label="nowa" /> : null}
            <b>{m.name}</b>
            <small className="muted">{fmtLong(m.created_at)}, {fmtTime(m.created_at)}</small>
          </header>
          <p>{m.message}</p>
          <p className="muted"><a href={`mailto:${m.email}`}>{m.email}</a>{m.phone ? <> · <a href={`tel:${m.phone}`}>{m.phone}</a></> : null}</p>
          <div className="pn-bk__actions">
            <a className="btn btn--sm btn--primary" href={`mailto:${m.email}?subject=${encodeURIComponent("Re: Korki z Krzysztofem")}`} onClick={() => !m.read && mark(m, true)}>Odpowiedz mailem</a>
            <button type="button" className="btn btn--sm btn--ghost" onClick={() => mark(m, !m.read)}>{m.read ? "Oznacz jako nowe" : "Oznacz jako przeczytane"}</button>
          </div>
        </article>
      ))}
    </div>
  );
}
