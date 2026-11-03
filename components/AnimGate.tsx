"use client";

import React from "react";
import { reducedMotion } from "@/lib/motion";

/* Animacje spoczynkowe (połysk, para z kubka, fale, kropki pisania…) to ~80 nieskończonych
   pętli CSS na całej stronie. Każda działająca pętla to praca głównego wątku w klatce, także
   wtedy, gdy jej nie widać — a przewijanie ma tych klatek nie tracić.
   Tu: sekcje poza ekranem (z zapasem) mają swoje nieskończone animacje wstrzymane, a po wjeździe
   w ekran ruszają od miejsca, w którym stanęły. Nic poza `Animation.pause()/play()` — żadnej
   zmiany klas ani stylów, więc przełączenie nie przelicza stylów całego poddrzewa. */
export default function AnimGate() {
  React.useEffect(() => {
    if (reducedMotion() || typeof IntersectionObserver === "undefined") return;
    const held = new Map<Element, Animation[]>();

    const hold = (el: Element) => {
      if (held.has(el)) return;
      const list = el.getAnimations({ subtree: true }).filter((a) => {
        const t = a.effect?.getTiming();
        return t?.iterations === Infinity && a.playState === "running";
      });
      list.forEach((a) => a.pause());
      held.set(el, list);
    };
    const release = (el: Element) => {
      const list = held.get(el);
      if (!list) return;
      held.delete(el);
      list.forEach((a) => { if (a.playState === "paused") a.play(); });
    };

    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => (e.isIntersecting ? release(e.target) : hold(e.target))),
      { rootMargin: "300px 0px" },
    );
    const targets = Array.from(document.querySelectorAll("main > *, body > footer"));
    targets.forEach((t) => io.observe(t));
    return () => {
      io.disconnect();
      held.forEach((_, el) => release(el));
    };
  }, []);
  return null;
}
