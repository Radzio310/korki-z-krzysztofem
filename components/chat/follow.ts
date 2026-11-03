import { getLenis, reducedMotion } from "@/lib/motion";

/* Dociąga stronę tak, żeby element był w całości widoczny (ale nie wyżej niż jego górna krawędź
   pod nawigacją). Jedno przewinięcie przez Lenisa — bez nasłuchu scrolla. */
export function followInView(el: HTMLElement | null | undefined, bottomPad = 28) {
  if (!el) return;
  window.requestAnimationFrame(() => {
    const r = el.getBoundingClientRect();
    const over = r.bottom - (window.innerHeight - bottomPad);
    if (over <= 0) return;
    const by = Math.min(over, Math.max(0, r.top - 96));
    if (by < 6) return;
    const lenis = getLenis();
    if (lenis) lenis.scrollTo(window.scrollY + by, { duration: reducedMotion() ? 0 : 0.9 });
    else window.scrollBy({ top: by, behavior: reducedMotion() ? "auto" : "smooth" });
  });
}

/* FLIP: element startuje z prostokąta `from` i płynie na swoje miejsce (transform). */
export function flipFrom(el: HTMLElement | null | undefined, from: DOMRect) {
  if (!el || reducedMotion()) return;
  const r = el.getBoundingClientRect();
  el.style.transformOrigin = "0 0";
  el.style.transition = "none";
  el.style.transform = `translate(${from.left - r.left}px, ${from.top - r.top}px) scale(${from.width / Math.max(1, r.width)}, ${from.height / Math.max(1, r.height)})`;
  el.getBoundingClientRect();
  el.style.transition = "transform 560ms var(--ease-out)";
  el.style.transform = "";
  const end = () => { el.style.transition = ""; el.style.transformOrigin = ""; el.removeEventListener("transitionend", end); };
  el.addEventListener("transitionend", end);
}
