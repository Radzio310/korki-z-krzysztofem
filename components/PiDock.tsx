"use client";

import React from "react";
import Mascot, { type MascotMood } from "./Mascot";
import { scrollToTarget } from "@/lib/motion";
import "./pidock.css";

/* Pi w rogu: pojawia się po nagłówku, podpowiada jednym zdaniem, co da się zrobić w sekcji,
   którą właśnie oglądasz, a po kliknięciu rozkłada skróty do najważniejszych akcji. */
const HINTS: Record<string, { say: string; mood: MascotMood }> = {
  "o-mnie": { say: "Przesuń kursor po zdjęciu — ono to lubi.", mood: "idle" },
  wspolpraca: { say: "Kliknij numer kroku, a przeskoczę do niego.", mood: "wave" },
  quiz: { say: "60 sekund i będę wiedzieć, od czego zacząć.", mood: "think" },
  cennik: { say: "Przesuń suwak — cena przeliczy się na żywo.", mood: "wow" },
  zadanie: { say: "Masz minutkę? Rozwiąż dzisiejsze zadanie.", mood: "think" },
  opinie: { say: "Przeciągnij karty w bok, żeby czytać dalej.", mood: "idle" },
  rezerwacja: { say: "Trzy kroki i termin jest Twój.", mood: "happy" },
  kontakt: { say: "Napisz — odpowiadam na każdą wiadomość.", mood: "wave" },
};

const ACTIONS = [
  { id: "rezerwacja", label: "Zarezerwuj", icon: "📅" },
  { id: "quiz", label: "Quiz 60 s", icon: "⏱️" },
  { id: "cennik", label: "Policz cenę", icon: "🧮" },
  { id: "kontakt", label: "Napisz", icon: "✉️" },
];

export default function PiDock() {
  const [visible, setVisible] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [section, setSection] = React.useState<string | null>(null);
  const [bubble, setBubble] = React.useState(false);
  const shown = React.useRef(new Set<string>());

  React.useEffect(() => {
    const on = () => setVisible(window.scrollY > innerHeight * 1.2);
    on();
    window.addEventListener("scroll", on, { passive: true });
    const ids = Object.keys(HINTS);
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) setSection(e.target.id); });
    }, { rootMargin: "-45% 0px -45% 0px" });
    ids.forEach((id) => { const el = document.getElementById(id); if (el) io.observe(el); });
    return () => { window.removeEventListener("scroll", on); io.disconnect(); };
  }, []);

  /* Dymek pokazuje się raz na sekcję, na kilka sekund — podpowiada, nie gada bez końca. */
  React.useEffect(() => {
    if (!section || !visible || open || shown.current.has(section)) return;
    shown.current.add(section);
    setBubble(true);
    const t = window.setTimeout(() => setBubble(false), 4200);
    return () => window.clearTimeout(t);
  }, [section, visible, open]);

  const hint = section ? HINTS[section] : null;
  return (
    <div className={`dock ${visible ? "is-visible" : ""} ${open ? "is-open" : ""}`}>
      <div className="dock__menu" role="menu" aria-hidden={!open}>
        {ACTIONS.map((a, i) => (
          <button
            key={a.id}
            type="button"
            role="menuitem"
            tabIndex={open ? 0 : -1}
            style={{ "--i": i } as React.CSSProperties}
            onClick={() => { setOpen(false); scrollToTarget(`#${a.id}`); }}
          >
            <span aria-hidden="true">{a.icon}</span>{a.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="dock__pi"
        onClick={() => { setOpen((v) => !v); setBubble(false); }}
        aria-expanded={open}
        aria-label={open ? "Zamknij skróty" : "Skróty: rezerwacja, quiz, cennik, kontakt"}
      >
        <Mascot mood={open ? "happy" : hint?.mood || "idle"} size={78} say={bubble && hint && !open ? hint.say : undefined} side="right" />
      </button>
    </div>
  );
}
