"use client";

import Lenis from "lenis";
import React from "react";
import { ensureGsap, reducedMotion, setLenis } from "@/lib/motion";

/* Lenis napędza przewijanie, GSAP ticker napędza Lenisa — jedna pętla klatek
   dla płynnego scrolla i wszystkich scen ScrollTriggera. */
export default function SmoothScroll() {
  React.useEffect(() => {
    const { gsap, ScrollTrigger } = ensureGsap();
    if (reducedMotion()) return;
    const lenis = new Lenis({ duration: 1.15, easing: (t) => 1 - Math.pow(1 - t, 4), smoothWheel: true, touchMultiplier: 1.2 });
    setLenis(lenis);
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

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
