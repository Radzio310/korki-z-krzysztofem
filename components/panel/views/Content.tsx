"use client";

import React from "react";
import { EMPTY_CONTENT, type Content } from "@/lib/types";
import { ABOUT, FAQ, HERO, STEPS } from "@/content";
import { usePanelApi } from "../ui";
import { Blank, Grip, Ink, LoadError, PreviewPane, SaveLine, Skel, SureButton, moveItem, useAutosave, useReorder } from "./kit";
import "./content.css";

/* Treści strony jako dokument w kolejności strony: nagłówek, kroki, o mnie, pytania, kontakt.
   Puste pole = tekst domyślny (widać go szarym w polu). Autozapis z Cofnij, obok żywy podgląd. */

const URL_OK = /^(https?:\/\/|\/)\S+$/;
const MAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function normalize(c: Content): Content {
  return {
    ...EMPTY_CONTENT,
    ...c,
    contact: { ...EMPTY_CONTENT.contact, ...(c.contact || {}) },
    about_facts: c.about_facts || [],
    faq: c.faq || [],
    timeline: c.timeline || [],
  };
}

/* Na serwer: bez niedokończonych pozycji list i bez błędnych adresów (wtedy zostaje ostatni dobry). */
function cleanContent(c: Content, saved: Content | null): Content {
  const prev = saved ? normalize(saved) : EMPTY_CONTENT;
  const url = (v: string | null, old: string | null) => (!v || !v.trim() ? null : URL_OK.test(v.trim()) ? v.trim() : old);
  const n = normalize(c);
  return {
    ...n,
    photo_url: url(n.photo_url, prev.photo_url),
    contact: {
      ...n.contact,
      email: !n.contact.email?.trim() ? null : MAIL_OK.test(n.contact.email.trim()) ? n.contact.email.trim() : prev.contact.email,
      facebook: url(n.contact.facebook, prev.contact.facebook),
      instagram: url(n.contact.instagram, prev.contact.instagram),
    },
    about_facts: n.about_facts.filter((f) => f.value.trim() && f.label.trim()),
    faq: n.faq.filter((f) => f.q.trim() && f.a.trim()),
    timeline: n.timeline.filter((t) => t.title.trim() && t.body.trim()),
  };
}

type FieldDef<T> = { k: keyof T & string; label: string; placeholder: string; max: number; multiline?: boolean; cls: string };

/* Lista w dokumencie: numer, pola w miejscu, przeciąganie, usuwanie w dwóch krokach. */
function Items<T extends Record<string, string>>({ list, onChange, fields, blank, addLabel, limit, name, numbered = true, missing }: {
  list: T[]; onChange: (l: T[]) => void; fields: FieldDef<T>[]; blank: T; addLabel: string; limit: number; name: (t: T, i: number) => string; numbered?: boolean; missing: string;
}) {
  const [fresh, setFresh] = React.useState<number | null>(null);
  const { listRef, handle } = useReorder((from, to) => onChange(moveItem(list, from, to)));
  const upd = (i: number, k: keyof T, v: string) => onChange(list.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  return (
    <div className="ct-items">
      <div ref={listRef} className="ct-list">
        {list.map((item, i) => {
          const partial = fields.some((f) => !item[f.k]?.trim()) && fields.some((f) => item[f.k]?.trim());
          return (
            <div key={i} data-row="" className="ct-item">
              <button type="button" className="ed-grip" {...handle(i, name(item, i))}><Grip /></button>
              {numbered ? <span className="ct-item__n" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span> : null}
              <div className="ct-item__f">
                {fields.map((f, fi) => (
                  <Ink
                    key={f.k}
                    className={f.cls}
                    value={item[f.k] || ""}
                    multiline={f.multiline}
                    label={`${f.label} ${i + 1}`}
                    placeholder={f.placeholder}
                    maxLength={f.max}
                    autoFocus={fresh === i && fi === 0}
                    onBlur={() => setFresh(null)}
                    onChange={(v) => upd(i, f.k, v)}
                  />
                ))}
                {partial ? <p className="ct-miss">{missing}</p> : null}
              </div>
              <SureButton className="ct-item__x" aria={name(item, i)} onConfirm={() => onChange(list.filter((_, j) => j !== i))} />
            </div>
          );
        })}
      </div>
      {list.length < limit ? (
        <button type="button" className="ed-tb ed-tb--accent" onClick={() => { onChange([...list, { ...blank }]); setFresh(list.length); }}>{addLabel}</button>
      ) : <p className="ed-note">To już maksimum ({limit}).</p>}
    </div>
  );
}

function Photo({ url }: { url: string }) {
  const [state, setState] = React.useState<"load" | "ok" | "bad">("load");
  React.useEffect(() => setState("load"), [url]);
  if (!URL_OK.test(url.trim())) return <p className="ct-miss">Adres musi zaczynać się od https:// — do tego czasu zostaje poprzednie zdjęcie.</p>;
  return (
    <figure className={`ct-photo is-${state}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="Podgląd zdjęcia" onLoad={() => setState("ok")} onError={() => setState("bad")} />
      <figcaption>{state === "bad" ? "Nie mogę wczytać zdjęcia z tego adresu — sprawdź, czy link jest publiczny." : state === "load" ? "Wczytuję zdjęcie…" : "Tak wejdzie w koło portretu."}</figcaption>
    </figure>
  );
}

export default function ContentView() {
  const call = usePanelApi();
  const doc = useAutosave<Content>({
    load: async () => {
      const d = await call<{ value: Content; version: number }>("/korki/panel/settings/content", { quiet: true });
      return { value: normalize(d.value), version: d.version };
    },
    save: async (value, version) => {
      const d = await call<{ value: Content; version: number }>("/korki/panel/settings/content", { method: "PUT", body: { value, version }, quiet: true });
      return { value: normalize(d.value), version: d.version };
    },
    clean: cleanContent,
    conflict: "Ktoś zmienił treści w innym oknie — pokazuję najnowszą wersję.",
  });
  const [focus, setFocus] = React.useState("top");
  const c = doc.draft;
  const payload = React.useMemo(() => ({ view: "content" as const, content: c ? cleanContent(c, null) : undefined, focus }), [c, focus]);

  if (doc.loading && !c) return <div className="pn-page ed ct"><Skel rows={10} /></div>;
  if (!c) return <div className="pn-page ed ct"><LoadError what="treści strony" msg={doc.failed} onRetry={doc.reload} /></div>;

  const set = (patch: Partial<Content>) => doc.set((d) => ({ ...d, ...patch }));
  const txt = (k: "hero_title" | "hero_subtitle" | "about_title" | "about_body" | "photo_url") => (v: string) => set({ [k]: v || null } as Partial<Content>);
  const contact = (k: keyof Content["contact"]) => (v: string) => doc.set((d) => ({ ...d, contact: { ...d.contact, [k]: v || null } }));
  const badMail = !!c.contact.email?.trim() && !MAIL_OK.test(c.contact.email.trim());
  const badUrl = (v: string | null) => !!v?.trim() && !URL_OK.test(v.trim());

  return (
    <div className="pn-page ed ct">
      <div className="ed-split">
        <article className="ed-doc" aria-label="Treści strony">
          <header className="ed-doc__head">
            <div>
              <p className="ed-kicker">Strona w kolejności · edytujesz w miejscu</p>
              <p className="ed-doc__lede">Puste pole = tekst domyślny (widać go szarym).</p>
            </div>
            <SaveLine state={doc.state} canUndo={doc.canUndo} onUndo={doc.undo} onRetry={doc.retry} onRestore={doc.restoreMine} />
          </header>

          <section className="ed-sec" onFocusCapture={() => setFocus("top")} aria-labelledby="ct-hero">
            <div className="ed-sec__head"><p className="ed-kicker" id="ct-hero">01 · Nagłówek strony</p></div>
            <Ink className="ct-hero" multiline value={c.hero_title || ""} onChange={txt("hero_title")} label="Tytuł strony" placeholder={HERO.title} maxLength={200} />
            <Ink className="ct-lead" multiline value={c.hero_subtitle || ""} onChange={txt("hero_subtitle")} label="Tekst pod tytułem" placeholder={HERO.lead} maxLength={400} />
            <p className="ed-note">Litery tytułu reagują na kursor — krótszy tytuł działa lepiej.</p>
          </section>

          <section className="ed-sec" onFocusCapture={() => setFocus("#jak-pracuje")} aria-labelledby="ct-steps">
            <div className="ed-sec__head"><p className="ed-kicker" id="ct-steps">02 · Jak pracuję — kroki</p></div>
            {c.timeline.length === 0 ? (
              <Blank
                art="page"
                title="Na stronie są kroki domyślne"
                body={`Strona pokazuje ${STEPS.length} kroki: ${STEPS.map((s) => `„${s.title}”`).join(", ")}. Wstaw je, żeby poprawić słowa, albo napisz własne.`}
                onArt={() => set({ timeline: STEPS.map((s) => ({ ...s })) })}
              >
                <button type="button" className="ed-btn" onClick={() => set({ timeline: STEPS.map((s) => ({ ...s })) })}>Wstaw kroki ze strony</button>
                <button type="button" className="ed-tb ed-tb--accent" onClick={() => set({ timeline: [{ title: "", body: "" }] })}>Napisz od zera</button>
              </Blank>
            ) : (
              <Items<{ title: string; body: string }>
                list={c.timeline}
                onChange={(timeline) => set({ timeline })}
                fields={[
                  { k: "title", label: "Tytuł kroku", placeholder: "Tytuł kroku", max: 80, cls: "ct-t" },
                  { k: "body", label: "Opis kroku", placeholder: "Co się dzieje w tym kroku", max: 500, multiline: true, cls: "ct-b" },
                ]}
                blank={{ title: "", body: "" }}
                addLabel="+ krok"
                limit={8}
                name={(t, i) => t.title || `krok ${i + 1}`}
                missing="Dopisz tytuł i opis — do tego czasu kroku nie ma na stronie."
              />
            )}
          </section>

          <section className="ed-sec" onFocusCapture={() => setFocus("#o-mnie")} aria-labelledby="ct-about">
            <div className="ed-sec__head"><p className="ed-kicker" id="ct-about">03 · O mnie</p></div>
            <Ink className="ct-h2" multiline value={c.about_title || ""} onChange={txt("about_title")} label="Tytuł sekcji O mnie" placeholder={ABOUT.title} maxLength={120} />
            <Ink className="ct-body" multiline value={c.about_body || ""} onChange={txt("about_body")} label="Tekst o sobie" placeholder={ABOUT.body.replace(/[{}]/g, "")} maxLength={4000} />
            <p className="ed-note">Własny tekst zastępuje domyślny opis razem z „równaniem” (spokojnie + w praktyce + indywidualnie).</p>

            <div className="ct-row">
              <span className="ct-row__k">Zdjęcie</span>
              <div className="ct-row__v">
                <Ink value={c.photo_url || ""} onChange={txt("photo_url")} label="Adres zdjęcia" placeholder="https://… (bez zdjęcia: animowany monogram)" maxLength={500} inputMode="url" invalid={badUrl(c.photo_url)} />
                {c.photo_url?.trim() ? <Photo url={c.photo_url.trim()} /> : <p className="ed-note">Link do zdjęcia, np. z Dysku Google udostępnionego publicznie.</p>}
              </div>
            </div>

            <div className="ct-row">
              <span className="ct-row__k">Liczby</span>
              <div className="ct-row__v">
                {c.about_facts.length === 0 ? <p className="ed-mute">Bez liczb sekcja ich nie pokazuje. Tylko prawdziwe dane — np. „8 lat” · „uczę matematyki”.</p> : null}
                <Items<{ value: string; label: string }>
                  list={c.about_facts}
                  onChange={(about_facts) => set({ about_facts })}
                  fields={[
                    { k: "value", label: "Liczba", placeholder: "120+", max: 40, cls: "ct-fact" },
                    { k: "label", label: "Podpis liczby", placeholder: "uczniów", max: 80, cls: "ct-fact-l" },
                  ]}
                  blank={{ value: "", label: "" }}
                  addLabel="+ liczba"
                  limit={4}
                  numbered={false}
                  name={(f, i) => f.value || `liczba ${i + 1}`}
                  missing="Liczba i podpis razem — inaczej nie trafi na stronę."
                />
              </div>
            </div>
          </section>

          <section className="ed-sec" onFocusCapture={() => setFocus("#faq")} aria-labelledby="ct-faq">
            <div className="ed-sec__head"><p className="ed-kicker" id="ct-faq">04 · Częste pytania</p></div>
            {c.faq.length === 0 ? (
              <Blank
                art="page"
                title="Na stronie są pytania domyślne"
                body={`Strona pokazuje ${FAQ.length} pytań o przedmioty, poziomy i formę zajęć. Wstaw je, żeby poprawić, albo zacznij od własnych — własna lista zastępuje domyślną w całości.`}
                onArt={() => set({ faq: FAQ.map(({ q, a }) => ({ q, a })) })}
              >
                <button type="button" className="ed-btn" onClick={() => set({ faq: FAQ.map(({ q, a }) => ({ q, a })) })}>Wstaw pytania ze strony</button>
                <button type="button" className="ed-tb ed-tb--accent" onClick={() => set({ faq: [{ q: "", a: "" }] })}>Napisz od zera</button>
              </Blank>
            ) : (
              <Items<{ q: string; a: string }>
                list={c.faq}
                onChange={(faq) => set({ faq })}
                fields={[
                  { k: "q", label: "Pytanie", placeholder: "Pytanie", max: 200, cls: "ct-q" },
                  { k: "a", label: "Odpowiedź", placeholder: "Odpowiedź", max: 2000, multiline: true, cls: "ct-a" },
                ]}
                blank={{ q: "", a: "" }}
                addLabel="+ pytanie"
                limit={20}
                name={(f, i) => f.q || `pytanie ${i + 1}`}
                missing="Dopisz odpowiedź — do tego czasu pytania nie ma na stronie."
              />
            )}
          </section>

          <section className="ed-sec" aria-labelledby="ct-contact">
            <div className="ed-sec__head">
              <p className="ed-kicker" id="ct-contact">05 · Kontakt</p>
              <span className="ed-note">E-mail trafia do opisu strony dla wyszukiwarek.</span>
            </div>
            <dl className="ct-dl">
              {([
                ["email", "E-mail", "adres@…", 120, badMail, "Ten adres nie wygląda na e-mail — zostaje poprzedni."],
                ["phone", "Telefon", "+48 882 418 481", 40, false, ""],
                ["city", "Miasto", "Mysłowice", 120, false, ""],
                ["area", "Okolica", "i online", 200, false, ""],
                ["facebook", "Facebook", "https://facebook.com/…", 500, badUrl(c.contact.facebook), "Adres musi zaczynać się od https://"],
                ["instagram", "Instagram", "https://instagram.com/…", 500, badUrl(c.contact.instagram), "Adres musi zaczynać się od https://"],
              ] as const).map(([k, label, ph, max, bad, why]) => (
                <div key={k}>
                  <dt>{label}</dt>
                  <dd>
                    <Ink value={c.contact[k] || ""} onChange={contact(k)} label={label} placeholder={ph} maxLength={max} invalid={bad} inputMode={k === "email" ? "email" : k === "phone" ? "tel" : undefined} />
                    {bad ? <p className="ct-miss">{why}</p> : null}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        </article>

        <PreviewPane payload={payload} />
      </div>
    </div>
  );
}
