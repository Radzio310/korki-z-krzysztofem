"use client";

import React from "react";
import { createPortal } from "react-dom";
import { getLenis } from "@/lib/motion";
import "./sheet.css";

/* Arkusz: na telefonie wjeżdża od dołu, na komputerze wyrasta z miejsca kliknięcia.
   Esc i tło zamykają, fokus wraca tam, skąd przyszedł. */
export default function Sheet({ open, onClose, title, children, wide = false }: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const [mounted, setMounted] = React.useState(false);
  const [show, setShow] = React.useState(false);
  const panel = React.useRef<HTMLDivElement>(null);
  const back = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (open) {
      back.current = document.activeElement as HTMLElement;
      setShow(true);
      getLenis()?.stop();
      document.body.style.overflow = "hidden";
      const t = window.setTimeout(() => panel.current?.querySelector<HTMLElement>("input, textarea, button")?.focus(), 80);
      return () => window.clearTimeout(t);
    }
    getLenis()?.start();
    document.body.style.overflow = "";
    back.current?.focus?.();
    const t = window.setTimeout(() => setShow(false), 420);
    return () => window.clearTimeout(t);
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const on = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && panel.current) {
        const f = panel.current.querySelectorAll<HTMLElement>("a, button, input, textarea, select, [tabindex]:not([tabindex='-1'])");
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [open, onClose]);

  if (!mounted || (!open && !show)) return null;
  return createPortal(
    <div className={`sh ${open ? "is-open" : ""}`} role="presentation">
      <div className="sh__scrim" onClick={onClose} />
      <div ref={panel} className={`sh__panel ${wide ? "sh__panel--wide" : ""}`} role="dialog" aria-modal="true" aria-label={title} data-lenis-prevent>
        <div className="sh__grip" aria-hidden="true" />
        <header className="sh__head">
          <h2 className="h-card">{title}</h2>
          <button type="button" className="sh__close" onClick={onClose} aria-label="Zamknij">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>
          </button>
        </header>
        <div className="sh__body">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
