"use client";

import React from "react";
import Stars from "../../ui/Stars";
import type { List, Review } from "@/lib/types";
import { fmtLong } from "@/lib/time";
import { ApiError } from "@/lib/api";
import { Confirm, Empty, Field, Toggle, usePanel, usePanelApi, useLoad } from "../ui";

const TABS = [
  { id: "pending", label: "Do akceptacji" },
  { id: "approved", label: "Opublikowane" },
  { id: "rejected", label: "Odrzucone" },
] as const;

function ManualForm({ onDone }: { onDone: () => void }) {
  const call = usePanelApi();
  const { toast } = usePanel();
  const [rating, setRating] = React.useState(0);
  const [featured, setFeatured] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
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
      onDone();
    } catch { /* tost */ } finally {
      setBusy(false);
    }
  };
  return (
    <form className="pn-card pn-pad pn-form" onSubmit={submit}>
      <h2 className="pn-sub">Przepisz opinię (np. z grafiki albo wiadomości)</h2>
      <div className="pn-grid3">
        <Field label="Imię / podpis"><input className="input" name="author_name" required maxLength={80} /></Field>
        <Field label="Kto to (opcjonalnie)"><input className="input" name="author_label" maxLength={120} placeholder="np. mama ucznia 8 klasy" /></Field>
        <Field label="Ocena (opcjonalnie)"><span className="pn-stars"><Stars value={rating} onChange={setRating} size={26} />{rating ? <button type="button" className="pn-link" onClick={() => setRating(0)}>bez oceny</button> : null}</span></Field>
      </div>
      <Field label="Treść — słowo w słowo" wide><textarea className="input" name="body" required maxLength={4000} rows={4} /></Field>
      <Toggle on={featured} onChange={setFeatured} label="Wyróżnij" hint="Wyróżnione stoją na początku taśmy." />
      <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? <i className="spinner" /> : "Dodaj opinię"}</button>
    </form>
  );
}

function Row({ r, onChange }: { r: Review; onChange: () => void }) {
  const call = usePanelApi();
  const { toast } = usePanel();
  const [busy, setBusy] = React.useState(false);
  const patch = async (body: Record<string, unknown>, msg: string) => {
    setBusy(true);
    try {
      await call(`/korki/panel/reviews/${r.id}`, { method: "PATCH", body: { ...body, version: r.version } });
      toast(msg);
      onChange();
    } catch (e) {
      if ((e as ApiError).status === 409) onChange();
    } finally {
      setBusy(false);
    }
  };
  const del = async () => {
    try {
      await call(`/korki/panel/reviews/${r.id}`, { method: "DELETE" });
      toast("Opinia usunięta.");
      onChange();
    } catch { /* tost */ }
  };
  return (
    <article className={`pn-review ${r.featured ? "is-featured" : ""}`}>
      <header>
        <b>{r.author_name}</b>{r.author_label ? <small className="muted"> · {r.author_label}</small> : null}
        {r.rating ? <Stars value={r.rating} size={16} /> : null}
        <small className="muted pn-review__date">{fmtLong(r.created_at)} · {r.source === "manual" ? "dodana ręcznie" : "z formularza"}</small>
      </header>
      <p>{r.body}</p>
      <div className="pn-bk__actions">
        {r.status !== "approved" ? <button type="button" className="btn btn--sm btn--primary" disabled={busy} onClick={() => patch({ status: "approved" }, "Opublikowana.")}>Opublikuj</button> : null}
        {r.status !== "rejected" ? <button type="button" className="btn btn--sm btn--ghost" disabled={busy} onClick={() => patch({ status: "rejected" }, "Odrzucona.")}>Odrzuć</button> : null}
        {r.status === "approved" ? <button type="button" className="btn btn--sm" disabled={busy} onClick={() => patch({ featured: !r.featured }, r.featured ? "Bez wyróżnienia." : "Wyróżniona.")}>{r.featured ? "★ Wyróżniona" : "☆ Wyróżnij"}</button> : null}
        <Confirm label="Usuń" onConfirm={del} />
      </div>
    </article>
  );
}

export default function ReviewsView() {
  const [tab, setTab] = React.useState<(typeof TABS)[number]["id"]>("pending");
  const { data, loading, reload } = useLoad<List<Review>>(`/korki/panel/reviews?status=${tab}`);
  return (
    <div className="pn-stack">
      <ManualForm onDone={() => { setTab("approved"); reload(); }} />
      <div className="pn-filters" role="tablist">
        {TABS.map((t) => <button key={t.id} type="button" role="tab" className="chip" aria-pressed={tab === t.id} aria-selected={tab === t.id} onClick={() => setTab(t.id)}>{t.label}</button>)}
      </div>
      {loading && !data ? <div className="pn-card is-skel" style={{ height: 160 }} /> : !data?.rows.length ? (
        <Empty title={tab === "pending" ? "Nic nie czeka" : "Pusto"} body={tab === "pending" ? "Nowe opinie z formularza na stronie pojawią się tutaj do akceptacji." : undefined} />
      ) : (
        <div className="pn-list">{data.rows.map((r) => <Row key={`${r.id}-${r.version}`} r={r} onChange={reload} />)}</div>
      )}
    </div>
  );
}
