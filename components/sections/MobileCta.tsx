"use client";

import React from "react";
import { WHATSAPP_URL } from "@/lib/contact";
import { scrollToTarget } from "@/lib/motion";

/* Stały dolny pasek na telefonie: „Zapytaj o zajęcia” + „WhatsApp”.
   Chowa się, gdy w widoku jest formularz (#kontakt) albo stopka, więc nie zasłania pól ani komunikatów.
   Na szerokich ekranach jest ukryty w CSS (contact.css). */
export default function MobileCta() {
  const [hidden, setHidden] = React.useState(false);

  React.useEffect(() => {
    const targets = [document.getElementById("kontakt"), document.querySelector("footer")].filter(Boolean) as Element[];
    if (!targets.length || typeof IntersectionObserver === "undefined") return;
    const seen = new Set<Element>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) seen.add(e.target);
          else seen.delete(e.target);
        }
        setHidden(seen.size > 0);
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, []);

  const go = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    scrollToTarget("#kontakt");
    window.setTimeout(() => document.getElementById("kontakt")?.focus({ preventScroll: true }), 900);
  };

  return (
    <div className={`mcta ${hidden ? "is-hidden" : ""}`} role="region" aria-label="Szybki kontakt">
      <a className="btn btn--primary mcta__main" href="#kontakt" onClick={go}>Zapytaj o zajęcia</a>
      <a className="btn mcta__wa" href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp (otwiera się w nowej karcie)">
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14.2c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.2-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.8s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.3.5-.4.4c-.1.2-.3.3-.1.6.2.3.7 1.2 1.5 1.9 1 .9 1.8 1.2 2.1 1.3.3.1.4.1.6-.1l.8-1c.2-.2.4-.2.6-.1l1.9.9c.2.1.4.2.5.3.1.2.1.8-.1 1.4Z" /></svg>
        WhatsApp
      </a>
    </div>
  );
}
