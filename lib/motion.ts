"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type Lenis from "lenis";
import React from "react";

let registered = false;
export function ensureGsap() {
  if (!registered && typeof window !== "undefined") {
    gsap.registerPlugin(ScrollTrigger);
    /* Pasek adresu na telefonie zmienia wysokość okna w trakcie przewijania — bez tego każda
       taka zmiana przeliczałaby wszystkie sceny (refresh = odczyt układu całej strony). */
    ScrollTrigger.config({ ignoreMobileResize: true });
    registered = true;
  }
  return { gsap, ScrollTrigger };
}

export const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Jedna instancja Lenisa na stronę. Sekcje proszą o przewinięcie przez `scrollToTarget`,
   więc nikt nie woła `window.scrollTo` obok płynnego przewijania. */
let lenisRef: Lenis | null = null;
export const setLenis = (l: Lenis | null) => { lenisRef = l; };
export const getLenis = () => lenisRef;

export function scrollToTarget(target: string | HTMLElement, offset = -80) {
  const el = typeof target === "string" ? document.querySelector<HTMLElement>(target) : target;
  if (!el) return;
  if (lenisRef) lenisRef.scrollTo(el, { offset, duration: 1.4 });
  else window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + offset, behavior: reducedMotion() ? "auto" : "smooth" });
}

/* Wejście elementów `[data-reveal]` w obrębie korzenia — jeden obserwator na sekcję. */
export function useReveal<T extends HTMLElement>() {
  const ref = React.useRef<T>(null);
  React.useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const items = root.querySelectorAll<HTMLElement>("[data-reveal]");
    if (reducedMotion()) {
      items.forEach((i) => (i.dataset.in = "1"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            (e.target as HTMLElement).dataset.in = "1";
            io.unobserve(e.target);
          }
        });
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.08 },
    );
    items.forEach((i) => io.observe(i));
    return () => io.disconnect();
  }, []);
  return ref;
}

/* Fala z miejsca kliknięcia na przycisku — drobiazg, który robi „żywy” interfejs. */
export function ripple(e: React.PointerEvent<HTMLElement>) {
  const btn = e.currentTarget;
  if (reducedMotion()) return;
  const r = btn.getBoundingClientRect();
  const s = Math.max(r.width, r.height);
  const span = document.createElement("span");
  span.className = "ripple";
  span.style.width = span.style.height = `${s}px`;
  span.style.left = `${e.clientX - r.left - s / 2}px`;
  span.style.top = `${e.clientY - r.top - s / 2}px`;
  btn.appendChild(span);
  window.setTimeout(() => span.remove(), 720);
}

/* Magnetyczne przyciąganie elementu do kursora. */
export function useMagnet<T extends HTMLElement>(strength = 0.28) {
  const ref = React.useRef<T>(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion() || !matchMedia("(pointer: fine)").matches) return;
    const { gsap } = ensureGsap();
    const xTo = gsap.quickTo(el, "x", { duration: 0.6, ease: "elastic.out(1, 0.5)" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.6, ease: "elastic.out(1, 0.5)" });
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * strength);
      yTo((e.clientY - (r.top + r.height / 2)) * strength);
    };
    const leave = () => { xTo(0); yTo(0); };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
    };
  }, [strength]);
  return ref;
}

/* Kanał zdarzeń między sekcjami: quiz → kalkulator → rezerwacja przekazują sobie wybór. */
export type Handoff = {
  level_key?: string; subject_key?: string; duration?: number; weekly?: number; source?: string;
  /** "contact" = formularz „Zapytaj o zajęcia” (bez kasowania wpisanej wiadomości); brak = rezerwacja */
  target?: "contact" | "booking";
};
const HANDOFF = "kk:handoff";
export function emitHandoff(detail: Handoff) {
  window.dispatchEvent(new CustomEvent<Handoff>(HANDOFF, { detail }));
}
export function useHandoff(cb: (h: Handoff) => void) {
  const cbRef = React.useRef(cb);
  React.useEffect(() => { cbRef.current = cb; });
  React.useEffect(() => {
    const on = (e: Event) => cbRef.current((e as CustomEvent<Handoff>).detail);
    window.addEventListener(HANDOFF, on);
    return () => window.removeEventListener(HANDOFF, on);
  }, []);
}
