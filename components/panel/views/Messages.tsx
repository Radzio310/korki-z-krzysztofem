"use client";

import React from "react";
import type { ContactMessage, List } from "@/lib/types";
import { fmtLong, fmtTime } from "@/lib/time";
import { levelLabel, modeLabel, prettyPhone, subjectLabel } from "@/lib/contact";
import { Empty, Skeleton, Tabs, usePanel, usePanelApi, useLoad } from "../ui";
import { Icon } from "../icons";
import "./messages.css";

const digits = (p: string) => p.replace(/[^\d+]/g, "");
const waNumber = (p: string) => {
  const d = p.replace(/\D/g, "");
  return d.length === 9 ? `48${d}` : d;
};

function Letter({ m, inNew, onChange }: { m: ContactMessage; inNew: boolean; onChange: () => void }) {
  const call = usePanelApi();
  const { toast, refresh } = usePanel();
  const [leaving, setLeaving] = React.useState(false);
  const mark = async (read: boolean) => {
    try { await call(`/korki/panel/messages/${m.id}`, { method: "PATCH", body: { read } }); refresh?.(); return true; } catch { return false; }
  };
  const toggle = async () => {
    const read = !m.read;
    if (inNew && read) setLeaving(true);
    if (!(await mark(read))) { setLeaving(false); return; }
    window.setTimeout(onChange, inNew && read ? 240 : 0);
    if (read) toast(`Przeczytane: ${m.name}.`, "ok", { label: "Cofnij", run: async () => { if (await mark(false)) onChange(); } });
  };
  const about = [
    ...(m.subjects || []).map((s) => subjectLabel(s)),
    m.level ? levelLabel(m.level) : "",
    m.mode ? modeLabel(m.mode) : "",
    m.class_info || "",
  ].filter(Boolean);
  const replyHref = m.email ? `mailto:${m.email}?subject=${encodeURIComponent("Re: Korki z Krzysztofem")}` : m.phone ? `tel:${digits(m.phone)}` : null;

  return (
    <article className={`pn-letter ${m.read ? "" : "is-new"} ${leaving ? "is-leaving" : ""}`} aria-label={`${m.read ? "" : "Nowe: "}${m.name}`}>
      <header className="pn-letter__head">
        <b>{m.name}</b>
        <time dateTime={m.created_at}>{fmtLong(m.created_at)}, {fmtTime(m.created_at)}</time>
      </header>
      {about.length ? <p className="pn-letter__about">{about.map((t, i) => <span key={i}>{t}</span>)}</p> : null}
      <p className={`pn-letter__body ${m.message ? "" : "is-none"}`}>{m.message || "Bez dodatkowej wiadomości — tylko dane do kontaktu."}</p>
      <div className="pn-letter__contact">
        {m.phone ? <a href={`tel:${digits(m.phone)}`}>{prettyPhone(m.phone)}</a> : null}
        {m.phone ? <a href={`https://wa.me/${waNumber(m.phone)}`} target="_blank" rel="noopener noreferrer">WhatsApp</a> : null}
        {m.email ? <a href={`mailto:${m.email}`}>{m.email}</a> : null}
      </div>
      <div className="pn-letter__acts">
        {replyHref ? (
          <a className="pn-btn pn-btn--sm" href={replyHref} onClick={() => { if (!m.read) void mark(true).then(onChange); }}>{m.email ? "Odpisz mailem" : "Zadzwoń"}</a>
        ) : null}
        <button type="button" className="pn-tbtn pn-tbtn--mute" onClick={toggle}>{m.read ? "Oznacz jako nowe" : "Oznacz jako przeczytane"}</button>
      </div>
    </article>
  );
}

export default function Messages() {
  const { data, loading, reload } = useLoad<List<ContactMessage>>("/korki/panel/messages?limit=100");
  const unread = (data?.rows || []).filter((m) => !m.read);
  const [tab, setTab] = React.useState<"new" | "all">("new");
  /* brak nowych przy pierwszym wczytaniu → od razu „Wszystkie” */
  const decided = React.useRef(false);
  React.useEffect(() => {
    if (!data || decided.current) return;
    decided.current = true;
    if (!data.rows.some((m) => !m.read)) setTab("all");
  }, [data]);
  const rows = tab === "new" ? unread : data?.rows || [];

  return (
    <div className="pn-page">
      <div className="pn-bar">
        <Tabs label="Filtr wiadomości" value={tab} onChange={setTab} items={[{ id: "new", label: "Nowe", count: unread.length }, { id: "all", label: "Wszystkie", count: data?.total }]} />
        <button type="button" className="pn-icon" onClick={reload} aria-label="Odśwież"><Icon name="odswiez" /></button>
      </div>
      {loading && !data ? (
        <Skeleton rows={3} />
      ) : !data ? (
        <Empty art="inbox" title="Nie udało się wczytać wiadomości" body="Sprawdź połączenie i spróbuj jeszcze raz." action={<button type="button" className="pn-tbtn pn-tbtn--accent" onClick={reload}>Spróbuj ponownie</button>} />
      ) : !rows.length ? (
        <Empty
          art="inbox"
          title={tab === "new" && data.rows.length ? "Wszystko przeczytane" : "Skrzynka jest pusta"}
          body={tab === "new" && data.rows.length ? "Nowe zapytania pojawią się tutaj i na „Dziś”." : "Zapytania z formularza „Zapytaj o zajęcia” pojawią się tutaj i przyjdą na Twojego maila."}
          action={tab === "new" && data.rows.length ? <button type="button" className="pn-tbtn pn-tbtn--accent" onClick={() => setTab("all")}>Pokaż wszystkie</button> : undefined}
        />
      ) : (
        <div className="pn-rows">{rows.map((m) => <Letter key={`${m.id}-${m.read}`} m={m} inNew={tab === "new"} onChange={reload} />)}</div>
      )}
    </div>
  );
}
