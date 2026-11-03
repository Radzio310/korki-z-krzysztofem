"use client";

import React from "react";
import type { Discount, Level, Offer } from "@/lib/types";
import { DEFAULT_LEVELS } from "@/content";
import { hasAnyPrice, lessonPrice } from "@/lib/pricing";
import { gr, slug, toZl, usePanelApi } from "../ui";
import { Blank, Grip, Ink, LoadError, PreviewPane, SaveLine, Skel, SureButton, moveItem, useAutosave, useReorder } from "./kit";
import "./offer.css";

/* Oferta i ceny jako dokument: cennik w liniach, każda liczba i nazwa edytowalna w miejscu,
   autozapis z Cofnij, obok żywy podgląd sekcji „Oferta” i „Cennik” ze strony. */

const DURATION_CHOICES = [30, 45, 60, 75, 90, 120, 150, 180];
const MODES = [{ k: "online", label: "Online" }, { k: "stationary", label: "Stacjonarnie" }];

function uniqueKey(base: string, taken: string[]) {
  const root = slug(base);
  let k = root;
  let n = 2;
  while (taken.includes(k)) k = `${root}_${n++}`;
  return k;
}

/* Na serwer idą tylko pozycje z nazwą i kluczem (klucz nadaje się po wpisaniu nazwy). */
function cleanOffer(o: Offer): Offer {
  return {
    ...o,
    subjects: o.subjects.filter((s) => s.name.trim() && s.key),
    levels: o.levels.filter((l) => l.name.trim() && l.key),
    discounts: o.discounts.filter((d) => d.min_weekly_minutes >= 1),
  };
}

/* Klucz w trakcie pisania: tylko a–z, 0–9 i _ (jak na serwerze), bez obcinania podkreśleń na końcu. */
const keyChars = (v: string) =>
  v.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ł/g, "l").replace(/[^a-z0-9_]+/g, "_").slice(0, 40);

const hours = (min: number) => {
  const h = min / 60;
  return Number.isInteger(h) ? `${h} h` : `${h.toFixed(2).replace(/0$/, "").replace(".", ",")} h`;
};

function PriceCell({ cents, derived, onChange, label, dur }: { cents: number | undefined; derived: number | null; onChange: (g: number) => void; label: string; dur: number }) {
  const [text, setText] = React.useState(toZl(cents));
  const [focus, setFocus] = React.useState(false);
  React.useEffect(() => { if (!focus) setText(toZl(cents)); }, [cents, focus]);
  return (
    <label className={`of-price ${cents ? "is-own" : ""}`}>
      <span className="of-price__d">{dur} min</span>
      <span className="of-price__lead" aria-hidden="true" />
      <span className="of-price__val">
        <input
          className="of-price__in"
          inputMode="decimal"
          value={text}
          placeholder={derived ? toZl(derived) : "—"}
          aria-label={label}
          onFocus={(e) => { setFocus(true); e.currentTarget.select(); }}
          onBlur={() => setFocus(false)}
          onChange={(e) => {
            const t = e.target.value.replace(/[^\d,.]/g, "").slice(0, 8);
            setText(t);
            onChange(gr(t));
          }}
        />
        <span className="of-price__zl" aria-hidden="true">zł</span>
      </span>
    </label>
  );
}

export default function OfferView() {
  const call = usePanelApi();
  const doc = useAutosave<Offer>({
    load: async () => {
      const d = await call<{ value: Offer; version: number }>("/korki/panel/settings/offer", { quiet: true });
      return { value: d.value, version: d.version };
    },
    save: async (value, version) => {
      const d = await call<{ value: Offer; version: number }>("/korki/panel/settings/offer", { method: "PUT", body: { value, version }, quiet: true });
      return { value: d.value, version: d.version };
    },
    clean: cleanOffer,
    conflict: "Ktoś zmienił ofertę w innym oknie — pokazuję najnowszą wersję.",
  });
  const [focus, setFocus] = React.useState("#oferta");
  const [justAdded, setJustAdded] = React.useState<string | null>(null);
  const o = doc.draft;
  const set = doc.set;

  const levelsReorder = useReorder((from, to) => set((d) => ({ ...d, levels: moveItem(d.levels, from, to) })));
  const payload = React.useMemo(() => ({ view: "offer" as const, offer: o ? cleanOffer(o) : undefined, focus }), [o, focus]);

  if (doc.loading && !o) return <div className="pn-page ed of"><Skel rows={9} /></div>;
  if (!o) return <div className="pn-page ed of"><LoadError what="cennika" msg={doc.failed} onRetry={doc.reload} /></div>;

  const durations = [...o.durations].sort((a, b) => a - b);
  const choices = [...new Set([...DURATION_CHOICES, ...o.durations])].sort((a, b) => a - b);
  const setLevel = (i: number, patch: Partial<Level>) => set((d) => ({ ...d, levels: d.levels.map((l, k) => (k === i ? { ...l, ...patch } : l)) }));
  const setDisc = (i: number, patch: Partial<Discount>) => set((d) => ({ ...d, discounts: d.discounts.map((x, k) => (k === i ? { ...x, ...patch } : x)) }));
  const priced = hasAnyPrice(cleanOffer(o));
  const keyCount = (k: string) => o.levels.filter((l) => l.key === k).length;

  const addLevel = () => {
    set((d) => ({ ...d, levels: [...d.levels, { key: "", name: "", description: null, prices: {}, active: true }] }));
    setJustAdded(`lvl-${o.levels.length}`);
  };
  const addSubject = () => {
    set((d) => ({ ...d, subjects: [...d.subjects, { key: "", name: "" }] }));
    setJustAdded(`sub-${o.subjects.length}`);
  };

  return (
    <div className="pn-page ed of">
      <div className="ed-split">
        <article className="ed-doc" aria-label="Cennik">
          <header className="ed-doc__head">
            <div>
              <p className="ed-kicker">Dokument · edytujesz w miejscu</p>
              <p className="ed-doc__lede">Kliknij w nazwę albo cenę i pisz.</p>
            </div>
            <SaveLine state={doc.state} canUndo={doc.canUndo} onUndo={doc.undo} onRetry={doc.retry} onRestore={doc.restoreMine} />
          </header>

          {/* ── przedmioty i forma ─────────────────────────────────────────── */}
          <section className="ed-sec" onFocusCapture={() => setFocus("#oferta")} aria-labelledby="of-what">
            <dl className="of-facts">
              <div>
                <dt id="of-what">Przedmioty</dt>
                <dd>
                  <ul className="of-subjects">
                    {o.subjects.map((s, i) => (
                      <li key={i}>
                        <input
                          className="ed-ink of-subject"
                          value={s.name}
                          size={Math.max(6, s.name.length + 1)}
                          maxLength={80}
                          placeholder="np. Fizyka"
                          aria-label={`Przedmiot ${i + 1}`}
                          autoFocus={justAdded === `sub-${i}`}
                          onChange={(e) => set((d) => ({ ...d, subjects: d.subjects.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)) }))}
                          onBlur={() => {
                            setJustAdded(null);
                            if (!s.key && s.name.trim()) set((d) => ({ ...d, subjects: d.subjects.map((x, k) => (k === i ? { ...x, key: uniqueKey(x.name, d.subjects.map((y) => y.key)) } : x)) }));
                          }}
                        />
                        <button type="button" className="of-x" onClick={() => set((d) => ({ ...d, subjects: d.subjects.filter((_, k) => k !== i) }))} aria-label={`Usuń przedmiot ${s.name || i + 1}`}>
                          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" /></svg>
                        </button>
                      </li>
                    ))}
                    <li><button type="button" className="ed-tb ed-tb--accent" onClick={addSubject}>+ przedmiot</button></li>
                  </ul>
                  {!o.subjects.length ? <p className="ed-note">Bez listy strona pokazuje Matematykę i Chemię. Wybór przedmiotu pojawia się w rezerwacji, gdy przedmiotów jest więcej niż jeden.</p> : null}
                </dd>
              </div>
              <div>
                <dt>Forma lekcji</dt>
                <dd className="of-checks" role="group" aria-label="Forma lekcji">
                  {MODES.map((m) => {
                    const on = o.modes.includes(m.k);
                    return (
                      <button key={m.k} type="button" className="of-check" aria-pressed={on} onClick={() => set((d) => ({ ...d, modes: on ? d.modes.filter((x) => x !== m.k) : [...d.modes, m.k] }))}>
                        <span className="of-check__box" aria-hidden="true"><svg viewBox="0 0 20 20"><path d="M4 10.5l4 4 8-9" /></svg></span>
                        {m.label}
                      </button>
                    );
                  })}
                  {!o.modes.length ? <span className="ed-note">Nie wybrano — w rezerwacji forma jest dowolna.</span> : null}
                </dd>
              </div>
              <div>
                <dt>Długości lekcji</dt>
                <dd>
                  <div className="of-durs" role="group" aria-label="Dostępne długości lekcji (minuty)">
                    {choices.map((d) => {
                      const on = o.durations.includes(d);
                      return (
                        <button
                          key={d}
                          type="button"
                          className="of-dur"
                          aria-pressed={on}
                          aria-label={`${d} minut`}
                          onClick={() => {
                            if (on && o.durations.length === 1) return;
                            set((x) => ({ ...x, durations: on ? x.durations.filter((y) => y !== d) : [...x.durations, d].sort((a, b) => a - b) }));
                          }}
                        >
                          {d}
                        </button>
                      );
                    })}
                    <span className="of-durs__unit">min</span>
                  </div>
                  <p className="ed-note">Kalkulator i rezerwacja pokazują tylko zaznaczone. Co najmniej jedna zostaje.</p>
                </dd>
              </div>
            </dl>
          </section>

          {/* ── cennik ─────────────────────────────────────────────────────── */}
          <section className="ed-sec" onFocusCapture={() => setFocus("#cennik")} aria-labelledby="of-price-h">
            <div className="ed-sec__head">
              <h2 className="ed-h" id="of-price-h">Poziomy i ceny</h2>
              <span className={`of-state ${priced ? "is-on" : ""}`}>
                <span aria-hidden="true" />{priced ? "Na stronie: kalkulator z cenami" : "Na stronie: „cena ustalana indywidualnie”"}
              </span>
            </div>

            {o.levels.length === 0 ? (
              <Blank
                art="tag"
                kicker="Cennik jest pusty"
                title="Dopisz pierwszy poziom"
                body="Teraz strona pokazuje trzy domyślne poziomy bez cen. Możesz wstawić je tutaj i od razu wpisać ceny."
                onArt={() => set((d) => ({ ...d, levels: DEFAULT_LEVELS.map((l) => ({ ...l })) }))}
              >
                <button type="button" className="ed-btn" onClick={() => set((d) => ({ ...d, levels: DEFAULT_LEVELS.map((l) => ({ ...l })) }))}>Wstaw poziomy ze strony</button>
                <button type="button" className="ed-tb ed-tb--accent" onClick={addLevel}>Pusty poziom</button>
              </Blank>
            ) : (
              <div className="of-table" style={{ "--cols": durations.length } as React.CSSProperties}>
                <div className="of-thead" aria-hidden="true">
                  <span />
                  <span>Poziom</span>
                  {durations.map((d) => <span key={d} className="of-thead__d">{d} min</span>)}
                </div>
                <div className="of-rows" ref={levelsReorder.listRef}>
                  {o.levels.map((l, i) => {
                    const dup = l.key && keyCount(l.key) > 1;
                    return (
                      <div key={i} data-row="" className={`of-row ${l.active ? "" : "is-off"}`}>
                        <button type="button" className="ed-grip" {...levelsReorder.handle(i, l.name)}><Grip /></button>
                        <div className="of-name">
                          <Ink
                            className="of-name__t"
                            multiline
                            value={l.name}
                            label={`Nazwa poziomu ${i + 1}`}
                            placeholder="Nazwa poziomu, np. Liceum — podstawa"
                            maxLength={120}
                            autoFocus={justAdded === `lvl-${i}`}
                            onChange={(v) => setLevel(i, { name: v })}
                            onBlur={() => {
                              setJustAdded(null);
                              if (!l.key && l.name.trim()) set((d) => ({ ...d, levels: d.levels.map((x, k) => (k === i ? { ...x, key: uniqueKey(x.name, d.levels.map((y) => y.key)) } : x)) }));
                            }}
                          />
                          <Ink
                            className="of-name__d"
                            multiline
                            value={l.description || ""}
                            label={`Opis poziomu ${l.name}`}
                            placeholder="Dopisz, dla kogo (opcjonalnie)"
                            maxLength={400}
                            onChange={(v) => setLevel(i, { description: v || null })}
                          />
                          <div className="of-meta">
                            <label className="of-key" title="Stały identyfikator — łączy poziom z pytaniami quizu i zadaniami">
                              <span>klucz</span>
                              <input
                                className="ed-ink"
                                value={l.key}
                                size={Math.max(6, l.key.length + 1)}
                                placeholder="nadam po nazwie"
                                aria-label={`Klucz poziomu ${l.name}`}
                                aria-invalid={dup || undefined}
                                maxLength={40}
                                onChange={(e) => setLevel(i, { key: keyChars(e.target.value) })}
                              />
                            </label>
                            <button type="button" className="ed-tb ed-tb--quiet" aria-pressed={!l.active} onClick={() => setLevel(i, { active: !l.active })}>
                              {l.active ? "Ukryj na stronie" : "Pokaż na stronie"}
                            </button>
                            <SureButton aria={l.name || `poziom ${i + 1}`} onConfirm={() => set((d) => ({ ...d, levels: d.levels.filter((_, k) => k !== i) }))} />
                          </div>
                          {dup ? <p className="of-warn" role="alert">Ten klucz ma już inny poziom — zmień go, inaczej zapis się nie uda.</p> : null}
                          {!l.active ? <p className="of-hidden">Ukryty — nie widać go na stronie ani w rezerwacji.</p> : null}
                        </div>
                        <div className="of-prices">
                          {durations.map((d) => {
                            const own = l.prices?.[String(d)];
                            const derived = lessonPrice({ ...l, prices: { ...l.prices, [String(d)]: 0 } }, d);
                            return (
                              <PriceCell
                                key={d}
                                dur={d}
                                cents={own}
                                derived={derived}
                                label={`Cena: ${l.name || "poziom"}, ${d} minut`}
                                onChange={(g) => {
                                  const prices = { ...l.prices };
                                  if (g) prices[String(d)] = g; else delete prices[String(d)];
                                  setLevel(i, { prices });
                                }}
                              />
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="of-tfoot">
                  <button type="button" className="ed-tb ed-tb--accent" onClick={addLevel}>+ poziom</button>
                  <p className="ed-note">Puste pole liczy się z ceny za 60 min (podpowiedź szarym). Kolejność poziomów to kolejność trudności — quiz poleca poziom według niej; przeciągnij za kropki.</p>
                </div>
              </div>
            )}
          </section>

          {/* ── rabaty i kalkulator ────────────────────────────────────────── */}
          <section className="ed-sec" onFocusCapture={() => setFocus("#cennik")} aria-labelledby="of-disc-h">
            <div className="ed-sec__head"><h2 className="ed-h" id="of-disc-h">Rabaty za stały plan</h2></div>
            {o.discounts.length === 0 ? <p className="ed-mute">Bez rabatów. Próg liczy się od łącznego czasu lekcji w tygodniu — np. 2 × 90 min = 3 h.</p> : null}
            <ol className="of-disc">
              {o.discounts.map((d, i) => (
                <li key={i} className="of-disc__row">
                  <span>Od</span>
                  <input className="ed-ink of-num" inputMode="numeric" value={d.min_weekly_minutes || ""} aria-label={`Próg ${i + 1}: minut tygodniowo`} placeholder="180"
                    onChange={(e) => setDisc(i, { min_weekly_minutes: Math.min(10000, Number(e.target.value.replace(/\D/g, "")) || 0) })} />
                  <span>min tygodniowo{d.min_weekly_minutes >= 60 ? <em className="of-disc__h"> ({hours(d.min_weekly_minutes)})</em> : null} — rabat</span>
                  <input className="ed-ink of-num" inputMode="numeric" value={d.percent || ""} aria-label={`Próg ${i + 1}: rabat w procentach`} placeholder="5"
                    onChange={(e) => setDisc(i, { percent: Math.min(90, Number(e.target.value.replace(/\D/g, "")) || 0) })} />
                  <span>%</span>
                  <input className="ed-ink of-disc__label" value={d.label || ""} aria-label={`Próg ${i + 1}: nazwa`} placeholder="nazwa, np. Pakiet stały" maxLength={60}
                    onChange={(e) => setDisc(i, { label: e.target.value || null })} />
                  <SureButton aria={`próg ${i + 1}`} onConfirm={() => set((x) => ({ ...x, discounts: x.discounts.filter((_, k) => k !== i) }))} />
                </li>
              ))}
            </ol>
            <div>
              <button type="button" className="ed-tb ed-tb--accent" onClick={() => set((x) => ({ ...x, discounts: [...x.discounts, { min_weekly_minutes: 180, percent: 5, label: "Pakiet stały" }] }))}>+ próg rabatowy</button>
            </div>

            <dl className="of-facts of-facts--tight">
              <div>
                <dt>Miesiąc w kalkulatorze</dt>
                <dd className="of-step">
                  <button type="button" className="of-step__b" onClick={() => set((x) => ({ ...x, weeks_per_month: Math.max(1, x.weeks_per_month - 1) }))} disabled={o.weeks_per_month <= 1} aria-label="Mniej tygodni">−</button>
                  <output className="of-step__v" aria-live="polite">{o.weeks_per_month}</output>
                  <button type="button" className="of-step__b" onClick={() => set((x) => ({ ...x, weeks_per_month: Math.min(6, x.weeks_per_month + 1) }))} disabled={o.weeks_per_month >= 6} aria-label="Więcej tygodni">+</button>
                  <span>{o.weeks_per_month === 1 ? "tydzień" : o.weeks_per_month < 5 ? "tygodnie" : "tygodni"}</span>
                </dd>
              </div>
              <div>
                <dt>Dopisek pod wyliczeniem</dt>
                <dd>
                  <Ink multiline value={o.notes || ""} label="Dopisek pod ceną" placeholder="np. dojazd do ucznia +20 zł" maxLength={1000} onChange={(v) => set((x) => ({ ...x, notes: v || null }))} />
                </dd>
              </div>
            </dl>
          </section>
        </article>

        <PreviewPane payload={payload} />
      </div>
    </div>
  );
}
