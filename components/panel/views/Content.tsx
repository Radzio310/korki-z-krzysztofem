"use client";

import React from "react";
import { EMPTY_CONTENT, type Content } from "@/lib/types";
import { Empty, Field, SaveBar, useSettingsDoc } from "../ui";

type ListKey = "about_facts" | "faq" | "timeline";

export default function ContentView() {
  const { draft, setDraft, loading, dirty, busy, save, reset } = useSettingsDoc<Content>("content");
  if (loading && !draft) return <div className="pn-card is-skel" style={{ height: 420 }} />;
  if (!draft) return <Empty title="Nie udało się wczytać treści" body="Odśwież stronę za chwilę." />;

  const c = { ...draft, contact: { ...EMPTY_CONTENT.contact, ...(draft.contact || {}) }, about_facts: draft.about_facts || [], faq: draft.faq || [], timeline: draft.timeline || [] };
  const set = (patch: Partial<Content>) => setDraft({ ...c, ...patch });
  const txt = (k: keyof Content) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set({ [k]: e.target.value || null } as Partial<Content>);
  const contact = (k: keyof Content["contact"]) => (e: React.ChangeEvent<HTMLInputElement>) => set({ contact: { ...c.contact, [k]: e.target.value.trim() || null } });

  function listEditor<T extends Record<string, string>>(key: ListKey, fields: { k: keyof T; label: string; area?: boolean; max: number }[], blank: T, addLabel: string, limit = 12) {
    const list = c[key] as unknown as T[];
    const upd = (i: number, k: keyof T, v: string) => set({ [key]: list.map((x, j) => (j === i ? { ...x, [k]: v } : x)) } as Partial<Content>);
    return (
      <div className="pn-items">
        {list.map((item, i) => (
          <div key={i} className="pn-item">
            <span className="pn-item__n">{i + 1}</span>
            <div className="pn-item__fields">
              {fields.map((f) => (
                <Field key={String(f.k)} label={f.label} wide={f.area}>
                  {f.area
                    ? <textarea className="input" value={item[f.k] || ""} maxLength={f.max} onChange={(e) => upd(i, f.k, e.target.value)} />
                    : <input className="input" value={item[f.k] || ""} maxLength={f.max} onChange={(e) => upd(i, f.k, e.target.value)} />}
                </Field>
              ))}
            </div>
            <div className="pn-item__tools">
              <button type="button" onClick={() => { if (i === 0) return; const n = [...list]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; set({ [key]: n } as Partial<Content>); }} disabled={i === 0} aria-label="W górę">↑</button>
              <button type="button" className="pn-x" onClick={() => set({ [key]: list.filter((_, j) => j !== i) } as Partial<Content>)} aria-label="Usuń">×</button>
            </div>
          </div>
        ))}
        {list.length < limit ? <button type="button" className="pn-add" onClick={() => set({ [key]: [...list, { ...blank }] } as Partial<Content>)}>{addLabel}</button> : null}
      </div>
    );
  }

  return (
    <div className="pn-stack">
      <section className="pn-card">
        <header className="pn-card__head"><h2>Nagłówek strony</h2><span className="muted">Puste pola = tekst domyślny.</span></header>
        <div className="pn-pad pn-form">
          <Field label="Tytuł" hint="Domyślnie: „Korki z Krzysztofem”. Litery tańczą pod kursorem — krótszy tytuł działa lepiej."><input className="input" value={c.hero_title || ""} onChange={txt("hero_title")} maxLength={60} /></Field>
          <Field label="Podtytuł" hint="Domyślnie: „Matematyka, która…” z obracającym się słowem."><input className="input" value={c.hero_subtitle || ""} onChange={txt("hero_subtitle")} maxLength={160} /></Field>
        </div>
      </section>

      <section className="pn-card">
        <header className="pn-card__head"><h2>O mnie</h2></header>
        <div className="pn-pad pn-form">
          <Field label="Tytuł sekcji" hint="Domyślnie: „Cześć, jestem Krzysztof.”"><input className="input" value={c.about_title || ""} onChange={txt("about_title")} maxLength={80} /></Field>
          <Field label="Kilka zdań o sobie" wide><textarea className="input" value={c.about_body || ""} onChange={txt("about_body")} maxLength={1500} rows={5} placeholder="Doświadczenie, podejście, z czym pomagasz najczęściej." /></Field>
          <Field label="Adres zdjęcia (URL)" hint="Link do zdjęcia (np. z Dysku Google udostępnionego publicznie albo z innego hostingu). Bez zdjęcia pokazuje się animowany monogram.">
            <input className="input" value={c.photo_url || ""} onChange={txt("photo_url")} maxLength={500} placeholder="https://…" inputMode="url" />
          </Field>
          {c.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="pn-photo" src={c.photo_url} alt="Podgląd zdjęcia" />
          ) : null}
          <h3 className="pn-sub">Liczby w liczniku</h3>
          <p className="pn-hint">np. „8 lat” — „uczę matematyki”, „120+” — „uczniów”. Liczba dolicza się animacją. Tylko prawdziwe dane.</p>
          {listEditor<{ value: string; label: string }>("about_facts", [{ k: "value", label: "Wartość", max: 16 }, { k: "label", label: "Podpis", max: 60 }], { value: "", label: "" }, "+ liczba", 4)}
        </div>
      </section>

      <section className="pn-card">
        <header className="pn-card__head"><h2>Kontakt</h2></header>
        <div className="pn-pad pn-grid3">
          <Field label="E-mail"><input className="input" type="email" value={c.contact.email || ""} onChange={contact("email")} maxLength={120} /></Field>
          <Field label="Telefon"><input className="input" value={c.contact.phone || ""} onChange={contact("phone")} maxLength={30} /></Field>
          <Field label="Miasto"><input className="input" value={c.contact.city || ""} onChange={contact("city")} maxLength={60} /></Field>
          <Field label="Okolica / dzielnice"><input className="input" value={c.contact.area || ""} onChange={contact("area")} maxLength={120} /></Field>
          <Field label="Facebook (URL)"><input className="input" value={c.contact.facebook || ""} onChange={contact("facebook")} maxLength={300} /></Field>
          <Field label="Instagram (URL)"><input className="input" value={c.contact.instagram || ""} onChange={contact("instagram")} maxLength={300} /></Field>
        </div>
      </section>

      <section className="pn-card">
        <header className="pn-card__head"><h2>Jak to działa — kroki</h2><span className="muted">Puste = 5 kroków domyślnych.</span></header>
        <div className="pn-pad">{listEditor<{ title: string; body: string }>("timeline", [{ k: "title", label: "Tytuł", max: 60 }, { k: "body", label: "Opis", area: true, max: 300 }], { title: "", body: "" }, "+ krok", 8)}</div>
      </section>

      <section className="pn-card">
        <header className="pn-card__head"><h2>Częste pytania</h2></header>
        <div className="pn-pad">{listEditor<{ q: string; a: string }>("faq", [{ k: "q", label: "Pytanie", max: 160 }, { k: "a", label: "Odpowiedź", area: true, max: 1200 }], { q: "", a: "" }, "+ pytanie", 16)}</div>
      </section>
      <SaveBar dirty={dirty} busy={busy} onSave={save} onReset={reset} />
    </div>
  );
}
