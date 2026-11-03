"use client";

import Lenis from "lenis";
import React from "react";
import { ensureGsap, reducedMotion, setLenis } from "@/lib/motion";

/* Lenis napędza przewijanie, GSAP ticker napędza Lenisa — jedna pętla klatek
   dla płynnego scrolla i wszystkich scen ScrollTriggera.
   - lerp 0.1 zamiast stałego czasu: przewijanie dogania kółko proporcjonalnie, bez „gumy”
     przy szybkich ruchach i bez kumulowania opóźnienia na słabym sprzęcie;
   - syncTouch wyłączony: na dotyku zostaje natywny, systemowy scroll (najpłynniejszy, jaki jest);
   - autoRaf wyłączony: jedyną pętlą jest ticker GSAP;
   - ScrollTrigger dostaje aktualizację tylko od Lenisa (bez drugiego nasłuchu na `scroll`). */
export default function SmoothScroll() {
  React.useEffect(() => {
    const { gsap, ScrollTrigger } = ensureGsap();
    if (reducedMotion()) return;
    const lenis = new Lenis({
      lerp: 0.1,
      smoothWheel: true,
      syncTouch: false,
      wheelMultiplier: 1,
      touchMultiplier: 1,
      autoRaf: false,
    });
    setLenis(lenis);
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    /* `prioritize`: Lenis przewija i karmi ScrollTriggera NA POCZĄTKU klatki, zanim GSAP
       zapisze style tweenów. Inaczej odczyt pozycji przewijania po zapisach wymuszał
       synchroniczne przeliczenie stylów i układu w każdej klatce (zmierzone w profilu). */
    gsap.ticker.add(tick, false, true);
    /* Po zgubionej klatce GSAP nie „nadrabia” skokiem — przewijanie zostaje ciągłe. */
    gsap.ticker.lagSmoothing(500, 33);

    /* Kotwice w obrębie strony przez Lenisa (z offsetem na nawigację). */
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute("href");
      if (!id || id === "#") return;
      const el = document.querySelector<HTMLElement>(id);
      if (!el) return;
      e.preventDefault();
      lenis.scrollTo(el, { offset: -80, duration: 1.4 });
      history.replaceState(null, "", id);
    };
    document.addEventListener("click", onClick);

    return () => {
      document.removeEventListener("click", onClick);
      gsap.ticker.remove(tick);
      lenis.destroy();
      setLenis(null);
    };
  }, []);
  return null;
}
