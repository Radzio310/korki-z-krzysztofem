"use client";

import React from "react";
import Mascot, { type MascotMood } from "./Mascot";
import { scrollToTarget } from "@/lib/motion";
import "./pidock.css";

/* Dok Mini-Krzysztofa w prawym dolnym rogu. Pojawia się po nagłówku, raz na sekcję podpowiada
   jednym zdaniem, co da się tu zrobić, a po stuknięciu rozkłada skróty.
   Zasada nadrzędna: dymek NIGDY nie zasłania treści. Pokazuje się tylko wtedy, gdy obok doku
   jest wolny margines strony (szeroki ekran) i pod dymkiem nie leży żaden tekst, obraz, pole
   ani tablica (sprawdzane punktami pod dymkiem). W przeciwnym razie zamiast dymka zapala się
   kropka na postaci, a podpowiedź czeka w menu skrótów. Przy kontakcie i stopce dok się chowa —
   tam Krzysztof jest już w treści. */

const HINTS: Record<string, { say: string; mood: MascotMood }> = {
  oferta: { say: "Przełącz Matematyka | Chemia i wybierz poziom.", mood: "wave" },
  korzysci: { say: "Odhacz, na czym Ci zależy.", mood: "idle" },
  "jak-pracuje": { say: "Tak wygląda nasza współpraca, krok po kroku.", mood: "think" },
  "o-mnie": { say: "Stuknij w portret, a się wynurzę.", mood: "happy" },
  opinie: { say: "Przeciągnij albo stuknij inicjały: kolejna opinia.", mood: "idle" },
  zadanie: { say: "Masz minutkę? Rozwiąż dzisiejsze zadanie.", mood: "think" },
  quiz: { say: "60 sekund i będę wiedzieć, od czego zacząć.", mood: "think" },
  cennik: { say: "Ułóż plan: długość i liczba spotkań.", mood: "wow" },
  rezerwacja: { say: "Wybierz termin, który Ci pasuje.", mood: "happy" },
  faq: { say: "Stuknij pytanie, a odpowiedź się pojawi.", mood: "idle" },
};

const Ico = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
    <path d={d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const ACTIONS = [
  { id: "kontakt", label: "Zapytaj o zajęcia", d: "M4 6h16v10H8l-4 4z" },
  { id: "oferta", label: "Oferta", d: "M4 5h7a2 2 0 0 1 2 2v12a2 2 0 0 0-2-2H4zM20 5h-7a2 2 0 0 0-2 2v12a2 2 0 0 1 2-2h7z" },
  { id: "quiz", label: "Quiz 60 s", d: "M12 8v5l3 2M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17z" },
  { id: "rezerwacja", label: "Zarezerwuj", d: "M4 7h16v13H4zM4 11h16M9 4v5M15 4v5" },
];

/* Elementy, których dymek nie może przykryć. */
const SOLID = "p, h1, h2, h3, h4, li, dt, dd, blockquote, figure, img, picture, canvas, video, input, textarea, select, label, button, a, table, [role='radio'], [role='tab'], .board, .board__canvas, .slate, .slate__frame, .slate__surface, .kc__window, .fqc, .card, [data-dock-avoid]";

function bubbleIsSafe(dock: HTMLElement, bubble: HTMLElement) {
  const r = bubble.getBoundingClientRect();
  if (!r.width) return false;
  const pts: [number, number][] = [];
  for (const fx of [0.04, 0.5, 0.96]) for (const fy of [0.08, 0.5, 0.92]) pts.push([r.left + r.width * fx, r.top + r.height * fy]);
  for (const [x, y] of pts) {
    for (const el of document.elementsFromPoint(x, y)) {
      if (dock.contains(el)) continue;
      if ((el as HTMLElement).closest?.(SOLID)) return false;
    }
  }
  return true;
}

/* Czy postać w spoczynku (prawy dolny róg) nie leży na treści? Prostokąt liczony z pudełka
   kontenera, bez transformu wysunięcia. */
function restIsFree(dock: HTMLElement, btn: HTMLElement) {
  const c = dock.getBoundingClientRect();
  const w = btn.offsetWidth, h = btn.offsetHeight;
  if (!w || !h) return true;
  const left = c.right - w, top = c.bottom - h;
  for (const fx of [0.15, 0.5, 0.85]) for (const fy of [0.15, 0.5, 0.85]) {
    for (const el of document.elementsFromPoint(left + w * fx, top + h * fy)) {
      if (dock.contains(el)) continue;
      if ((el as HTMLElement).closest?.(SOLID)) return false;
    }
  }
  return true;
}

export default function PiDock() {
  const [visible, setVisible] = React.useState(false);
  const [away, setAway] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [section, setSection] = React.useState<string | null>(null);
  const [bubble, setBubble] = React.useState<"off" | "probe" | "on">("off");
  const [badge, setBadge] = React.useState(false);
  const shown = React.useRef(new Set<string>());
  const dockRef = React.useRef<HTMLDivElement>(null);
  const bubbleRef = React.useRef<HTMLDivElement>(null);
  const btnRef = React.useRef<HTMLButtonElement>(null);
  /* „Języczek”: gdy w spoczynku postać leżałaby na treści, chowa się za krawędź i zostaje
     tylko wąski uchwyt — stuknięcie wysuwa ją i otwiera skróty. */
  const [tab, setTab] = React.useState(false);

  /* Przy przewijaniu postać zjeżdża za krawędź (klasa na kontenerze, bez renderu Reacta);
     po zatrzymaniu wraca — o ile ma wolne miejsce. */
  React.useEffect(() => {
    const d = dockRef.current;
    if (!d) return;
    let t = 0;
    const settle = () => {
      d.classList.remove("is-moving");
      const b = btnRef.current;
      if (b) setTab(!restIsFree(d, b));
    };
    const on = () => {
      if (!d.classList.contains("is-moving")) d.classList.add("is-moving");
      window.clearTimeout(t);
      t = window.setTimeout(settle, 650);
    };
    window.addEventListener("scroll", on, { passive: true });
    t = window.setTimeout(settle, 900);
    return () => { window.removeEventListener("scroll", on); window.clearTimeout(t); };
  }, []);

  /* Widoczność: po pierwszym ekranie, ale nie przy kontakcie i stopce. Bez nasłuchu scrolla —
     same IntersectionObservery (zero pracy w klatce przewijania). */
  React.useEffect(() => {
    const top = document.getElementById("top");
    const ioTop = new IntersectionObserver(([e]) => setVisible(!e.isIntersecting), { rootMargin: "0px 0px -20% 0px" });
    if (top) ioTop.observe(top); else setVisible(true);

    const ends = [document.getElementById("kontakt"), document.querySelector("footer")].filter(Boolean) as Element[];
    const seen = new Set<Element>();
    const ioEnd = new IntersectionObserver((entries) => {
      entries.forEach((e) => (e.isIntersecting ? seen.add(e.target) : seen.delete(e.target)));
      setAway(seen.size > 0);
    }, { rootMargin: "0px 0px -15% 0px" });
    ends.forEach((el) => ioEnd.observe(el));

    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) setSection(e.target.id); });
    }, { rootMargin: "-45% 0px -45% 0px" });
    Object.keys(HINTS).forEach((id) => { const el = document.getElementById(id); if (el) io.observe(el); });
    return () => { ioTop.disconnect(); ioEnd.disconnect(); io.disconnect(); };
  }, []);

  /* Raz na sekcję: najpierw próbny (niewidoczny) dymek, pomiar, potem decyzja: dymek albo kropka. */
  React.useEffect(() => {
    if (!section || !visible || away || open || tab || shown.current.has(section)) return;
    shown.current.add(section);
    setBubble("probe");
  }, [section, visible, away, open, tab]);

  React.useLayoutEffect(() => {
    if (bubble !== "probe") return;
    const d = dockRef.current, b = bubbleRef.current;
    if (d && b && bubbleIsSafe(d, b)) {
      setBubble("on");
    } else {
      setBubble("off");
      setBadge(true);
    }
  }, [bubble]);

  React.useEffect(() => {
    if (bubble !== "on") return;
    const t = window.setTimeout(() => setBubble("off"), 4600);
    /* przewinięcie pod dymek treści = dymek znika od razu */
    const check = () => { const d = dockRef.current, b = bubbleRef.current; if (d && b && !bubbleIsSafe(d, b)) setBubble("off"); };
    const iv = window.setInterval(check, 400);
    return () => { window.clearTimeout(t); window.clearInterval(iv); };
  }, [bubble]);

  React.useEffect(() => { if (away) { setOpen(false); setBubble("off"); } }, [away]);

  React.useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const out = (e: PointerEvent) => { if (!dockRef.current?.contains(e.target as Node)) setOpen(false); };
    window.addEventListener("keydown", key);
    window.addEventListener("pointerdown", out);
    return () => { window.removeEventListener("keydown", key); window.removeEventListener("pointerdown", out); };
  }, [open]);

  const hint = section ? HINTS[section] : null;
  const show = visible && !away;
  return (
    <div ref={dockRef} className={`dock ${show ? "is-visible" : ""} ${open ? "is-open" : ""} ${tab && !open ? "is-tab" : ""}`} inert={!show}>
      <div className="dock__menu" role="menu" aria-hidden={!open} aria-label="Skróty">
        {hint ? <p className="dock__hint" style={{ "--i": ACTIONS.length } as React.CSSProperties}>{hint.say}</p> : null}
        {ACTIONS.map((a, i) => (
          <button
            key={a.id}
            type="button"
            role="menuitem"
            tabIndex={open ? 0 : -1}
            style={{ "--i": i } as React.CSSProperties}
            onClick={() => { setOpen(false); scrollToTarget(`#${a.id}`); }}
          >
            <Ico d={a.d} />{a.label}
          </button>
        ))}
      </div>

      {bubble !== "off" && hint && !open ? (
        <div ref={bubbleRef} className={`dock__bubble ${bubble === "on" ? "is-on" : ""}`} role="status" aria-live="polite">
          {hint.say}
        </div>
      ) : null}

      <button
        type="button"
        className="dock__tab"
        tabIndex={tab && !open ? 0 : -1}
        aria-hidden={!(tab && !open)}
        aria-label={hint ? `Podpowiedź: ${hint.say} Otwórz skróty` : "Otwórz skróty"}
        onClick={() => { setOpen(true); setBubble("off"); setBadge(false); }}
      >
        <span aria-hidden="true" />
      </button>
      <button
        ref={btnRef}
        type="button"
        className="dock__mk"
        onClick={() => { setOpen((v) => !v); setBubble("off"); setBadge(false); }}
        aria-expanded={open}
        aria-label={open ? "Zamknij skróty" : badge && hint ? `Podpowiedź: ${hint.say} Otwórz skróty` : "Skróty: kontakt, oferta, quiz, rezerwacja"}
      >
        <Mascot mood={open ? "happy" : hint?.mood || "idle"} size={84} side="right" />
        {badge && !open ? <span className="dock__badge" aria-hidden="true" /> : null}
      </button>
    </div>
  );
}
