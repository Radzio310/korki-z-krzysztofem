"use client";

import React from "react";
import Stars from "../../ui/Stars";
import type { List, Review } from "@/lib/types";
import { fmtLong } from "@/lib/time";
import { ApiError } from "@/lib/api";
import { Confirm, Empty, Sheet, Skeleton, Tabs, Toggle, usePanel, usePanelApi, useLoad, useUndoable } from "../ui";
import { Icon } from "../icons";

type Status = "pending" | "approved" | "rejected";
/* panel dostaje też e-mail autora (kontrakt: GET /korki/panel/reviews) */
type PanelReview = Review & { email?: string | null };
const TABS: { id: Status; label: string }[] = [
  { id: "pending", label: "Do akceptacji" },
  { id: "approved", label: "Opublikowane" },
  { id: "rejected", label: "Odrzucone" },
];

/* Ręczne dodanie (przepisana z grafiki albo wiadomości) — w arkuszu, nie na stałe na ekranie. */
function ManualSheet({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const call = usePanelApi();
  const { toast, refresh } = usePanel();
  const [rating, setRating] = React.useState(0);
  const [featured, setFeatured] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const formId = React.useId();
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    setBusy(true);
    try {
      await call("/korki/panel/reviews", {
        body: {
          author_name: String(f.get("author_name") || "").trim(),
          author_label: String(f.get("author_label") || "").trim() || null,
          body: String(f.get("body") || "").trim(),
          rating: rating || null,
          featured,
        },
      });
      toast("Opinia dodana i opublikowana.");
      form.reset();
      setRating(0);
      setFeatured(false);
      refresh?.();
      onDone();
    } catch { /* tost */ } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet
      open={open}
      onClose={onClose}
      kicker="Opinie"
      title="Przepisz opinię"
      wide
      foot={
        <>
          <button type="button" className="pn-tbtn pn-tbtn--mute" onClick={onClose}>Anuluj</button>
          <button type="submit" form={formId} className="pn-btn" disabled={busy}>{busy ? <i className="spinner" /> : "Dodaj i opublikuj"}</button>
        </>
      }
    >
      <form id={formId} className="pn-compose" onSubmit={submit}>
        <p className="pn-mute">Np. z grafiki, SMS-a albo wiadomości. Trafi od razu na stronę.</p>
        <div className="pn-compose__grid">
          <label><span className="pn-label">Imię / podpis</span><input className="pn-input" name="author_name" required maxLength={80} /></label>
          <label><span className="pn-label">Kto to (opcjonalnie)</span><input className="pn-input" name="author_label" maxLength={120} placeholder="np. mama ucznia 8 klasy" /></label>
        </div>
        <div>
          <span className="pn-label">Ocena (opcjonalnie)</span>
          <span className="pn-stars"><Stars value={rating} onChange={setRating} size={28} />{rating ? <button type="button" className="pn-tbtn pn-tbtn--mute" onClick={() => setRating(0)}>bez oceny</button> : null}</span>
        </div>
        <label><span className="pn-label">Treść — słowo w słowo</span><textarea className="pn-area" name="body" required maxLength={4000} rows={5} /></label>
        <Toggle on={featured} onChange={setFeatured} label="Wyróżnij" hint="Wyróżnione stoją na początku taśmy opinii." />
      </form>
    </Sheet>
  );
}

function Row({ r, onChange }: { r: PanelReview; onChange: () => void }) {
  const call = usePanelApi();
  const { toast, refresh } = usePanel();
  const later = useUndoable();
  const [busy, setBusy] = React.useState(false);
  const [leaving, setLeaving] = React.useState(false);
  const patch = async (body: Record<string, unknown>, msg?: string) => {
    setBusy(true);
    try {
      await call(`/korki/panel/reviews/${r.id}`, { method: "PATCH", body: { ...body, version: r.version } });
      if (msg) toast(msg);
      refresh?.();
      onChange();
      return true;
    } catch (e) {
      if ((e as ApiError).status === 409) onChange();
      return false;
    } finally {
      setBusy(false);
    }
  };
  /* zmiana statusu wyprowadza opinię z bieżącej zakładki */
  const move = async (status: Status, msg: string) => { setLeaving(true); if (!(await patch({ status }, msg))) setLeaving(false); };
  const reject = () => {
    setLeaving(true);
    later({ msg: `Odrzucono opinię: ${r.author_name}.`, run: () => { void patch({ status: "rejected" }); }, undo: () => setLeaving(false) });
  };
  const del = async () => {
    try {
      await call(`/korki/panel/reviews/${r.id}`, { method: "DELETE" });
      toast("Opinia usunięta.");
      refresh?.();
      onChange();
    } catch { /* tost */ }
  };
  return (
    <article className={`pn-letter ${r.featured ? "is-featured" : ""} ${leaving ? "is-leaving" : ""}`}>
      <header className="pn-letter__head">
        <b>{r.author_name}</b>
        {r.author_label ? <span className="pn-mute">{r.author_label}</span> : null}
        {r.rating ? <Stars value={r.rating} size={15} /> : null}
        <time dateTime={r.created_at}>{fmtLong(r.created_at)} · {r.source === "manual" ? "dodana ręcznie" : "z formularza"}</time>
      </header>
      <p className="pn-letter__quote">{r.body}</p>
      {r.email ? <p className="pn-mute">Kontakt autora: <a className="pn-link" href={`mailto:${r.email}`}>{r.email}</a></p> : null}
      <div className="pn-letter__acts">
        {r.status !== "approved" ? <button type="button" className="pn-btn pn-btn--sm" disabled={busy} onClick={() => move("approved", "Opublikowana — jest już na stronie.")}>Opublikuj</button> : null}
        {r.status === "pending" ? <button type="button" className="pn-tbtn pn-tbtn--danger" disabled={busy} onClick={reject}>Odrzuć</button> : null}
        {r.status === "approved" ? (
          <>
            <button type="button" className="pn-tbtn" disabled={busy} onClick={() => patch({ featured: !r.featured }, r.featured ? "Bez wyróżnienia." : "Wyróżniona — stoi na początku taśmy.")}>{r.featured ? "Zdejmij wyróżnienie" : "Wyróżnij"}</button>
            <button type="button" className="pn-tbtn pn-tbtn--mute" disabled={busy} onClick={() => move("rejected", "Ukryta — nie ma jej już na stronie.")}>Ukryj ze strony</button>
          </>
        ) : null}
        <Confirm label="Usuń na zawsze" onConfirm={del} />
      </div>
    </article>
  );
}

export default function ReviewsView() {
  const [tab, setTab] = React.useState<Status>("pending");
  const [adding, setAdding] = React.useState(false);
  const { data, loading, reload } = useLoad<List<PanelReview>>(`/korki/panel/reviews?status=${tab}`);
  const pend = useLoad<List<Review>>("/korki/panel/reviews?status=pending&limit=1");
  const change = () => { reload(); pend.reload(); };
  return (
    <div className="pn-page">
      <div className="pn-bar">
        <Tabs label="Status opinii" value={tab} onChange={setTab} items={TABS.map((t) => ({ ...t, count: t.id === "pending" ? pend.data?.total : undefined }))} />
        <button type="button" className="pn-tbtn pn-tbtn--accent" onClick={() => setAdding(true)}>+ Przepisz opinię</button>
        <button type="button" className="pn-icon" onClick={change} aria-label="Odśwież"><Icon name="odswiez" /></button>
      </div>
      {loading && !data ? <Skeleton rows={3} /> : !data ? (
        <Empty art="star" title="Nie udało się wczytać opinii" action={<button type="button" className="pn-tbtn pn-tbtn--accent" onClick={reload}>Spróbuj ponownie</button>} />
      ) : !data.rows.length ? (
        <Empty
          art="star"
          title={tab === "pending" ? "Nic nie czeka na akceptację" : tab === "approved" ? "Na stronie nie ma jeszcze opinii" : "Brak odrzuconych"}
          body={tab === "pending" ? "Nowe opinie z formularza na stronie pojawią się tutaj i na „Dziś”." : tab === "approved" ? "Przepisz opinie, które już masz — z wiadomości albo grafik. Pojawią się na stronie od razu." : undefined}
          action={tab === "approved" ? <button type="button" className="pn-btn" onClick={() => setAdding(true)}>Przepisz pierwszą opinię</button> : undefined}
        />
      ) : (
        <div className="pn-rows">{data.rows.map((r) => <Row key={`${r.id}-${r.version}`} r={r} onChange={change} />)}</div>
      )}
      <ManualSheet open={adding} onClose={() => setAdding(false)} onDone={() => { setAdding(false); setTab("approved"); change(); }} />
    </div>
  );
}
