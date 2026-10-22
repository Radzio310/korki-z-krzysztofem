"use client";

import React from "react";

/* Tablica: kroki rozwiązania pisane kredą (sterowane z zewnątrz zmienną `--w` każdej linii),
   wykres paraboli rysowany kreską i płótno, po którym gość może pisać sam.
   Na jasnym motywie ta sama tablica jest białą tablicą z markerem. */

export const BOARD_LINES = [
  { id: "l0", text: "Rozwiąż:  x² − 5x + 6 = 0", kind: "task" },
  { id: "l1", text: "Δ = 25 − 24 = 1   →   √Δ = 1", kind: "step" },
  { id: "l2", text: "x₁ = (5 − 1) : 2 = 2", kind: "step" },
  { id: "l3", text: "x₂ = (5 + 1) : 2 = 3", kind: "step" },
] as const;

type Tool = "chalk" | "gold" | "sponge";

export default function Chalkboard({ boardRef }: { boardRef?: React.Ref<HTMLDivElement> }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const [tool, setTool] = React.useState<Tool>("chalk");
  const [drew, setDrew] = React.useState(false);
  const [wiping, setWiping] = React.useState(false);
  const toolRef = React.useRef<Tool>("chalk");
  toolRef.current = tool;

  /* Płótno w rozdzielczości ekranu; po zmianie rozmiaru przerysowujemy zachowany obraz. */
  React.useEffect(() => {
    const c = canvasRef.current;
    const wrap = wrapRef.current;
    if (!c || !wrap) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const fit = () => {
      const r = wrap.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      let snapshot: HTMLCanvasElement | null = null;
      if (c.width && c.height) {
        snapshot = document.createElement("canvas");
        snapshot.width = c.width; snapshot.height = c.height;
        snapshot.getContext("2d")?.drawImage(c, 0, 0);
      }
      c.width = Math.round(r.width * dpr);
      c.height = Math.round(r.height * dpr);
      c.style.width = `${r.width}px`;
      c.style.height = `${r.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (snapshot) ctx.drawImage(snapshot, 0, 0, snapshot.width / dpr, snapshot.height / dpr);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);

    let drawing = false;
    let last: { x: number; y: number } | null = null;
    const ink = () => {
      const s = getComputedStyle(wrap);
      return toolRef.current === "gold" ? s.getPropertyValue("--board-accent").trim() : s.getPropertyValue("--board-ink").trim();
    };
    const pos = (e: PointerEvent) => {
      const r = c.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const down = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      drawing = true;
      last = pos(e);
      c.setPointerCapture(e.pointerId);
      setDrew(true);
    };
    const move = (e: PointerEvent) => {
      if (!drawing || !last) return;
      const p = pos(e);
      const t = toolRef.current;
      if (t === "sponge") {
        ctx.save();
        ctx.globalCompositeOperation = "destination-out";
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, 34, 22, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        const color = ink();
        const dist = Math.hypot(p.x - last.x, p.y - last.y);
        const w = Math.max(2.4, 5 - dist * 0.06);
        ctx.strokeStyle = color;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.globalAlpha = 0.9;
        ctx.lineWidth = w;
        ctx.beginPath();
        ctx.moveTo(last.x, last.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        /* pył kredy: kilka drobin obok kreski */
        ctx.fillStyle = color;
        for (let i = 0; i < 3; i++) {
          ctx.globalAlpha = Math.random() * 0.35;
          ctx.fillRect(p.x + (Math.random() - 0.5) * 7, p.y + (Math.random() - 0.5) * 7, 1.2, 1.2);
        }
        ctx.globalAlpha = 1;
      }
      last = p;
    };
    const up = () => { drawing = false; last = null; };
    c.addEventListener("pointerdown", down);
    c.addEventListener("pointermove", move);
    c.addEventListener("pointerup", up);
    c.addEventListener("pointercancel", up);
    return () => {
      ro.disconnect();
      c.removeEventListener("pointerdown", down);
      c.removeEventListener("pointermove", move);
      c.removeEventListener("pointerup", up);
      c.removeEventListener("pointercancel", up);
    };
  }, []);

  const wipe = () => {
    const c = canvasRef.current;
    if (!c) return;
    setWiping(true);
    window.setTimeout(() => {
      c.getContext("2d")?.clearRect(0, 0, c.width, c.height);
      setWiping(false);
      setDrew(false);
    }, 520);
  };

  return (
    <div className="board" ref={boardRef}>
      <div className="board__frame">
        <div className="board__surface" ref={wrapRef}>
          <svg className="board__defs" aria-hidden="true">
            <filter id="chalk-rough" x="-5%" y="-20%" width="110%" height="140%">
              <feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves="2" seed="4" result="n" />
              <feDisplacementMap in="SourceGraphic" in2="n" scale="2.2" />
            </filter>
          </svg>

          <div className="board__lines" aria-label="Przykładowe zadanie rozwiązywane krok po kroku">
            {BOARD_LINES.map((l, i) => (
              <p key={l.id} className={`board__line board__line--${l.kind}`} data-line={i}>
                <span className="board__ink">{l.text}</span>
                <span className="board__tip" aria-hidden="true" />
              </p>
            ))}
            <p className="board__line board__line--answer" data-line={BOARD_LINES.length}>
              <span className="board__ink">Odp.: x ∈ {"{"}2, 3{"}"}</span>
              <span className="board__tip" aria-hidden="true" />
              <svg className="board__circle" viewBox="0 0 220 70" preserveAspectRatio="none" aria-hidden="true">
                <path pathLength={1} d="M18 40 C 10 12, 120 4, 196 18 C 226 26, 214 58, 150 64 C 80 70, 12 62, 22 34" />
              </svg>
            </p>
          </div>

          <svg className="board__graph" viewBox="0 0 200 160" aria-hidden="true">
            <path className="board__axis" pathLength={1} d="M10 120 H 192 M 30 150 V 8" />
            <path className="board__parab" pathLength={1} d="M52.4 46 Q 100 208 147.6 46" />
            <circle className="board__root board__root--a" cx="86" cy="120" r="0" />
            <circle className="board__root board__root--b" cx="114" cy="120" r="0" />
            <text className="board__lbl" x="80" y="140">2</text>
            <text className="board__lbl" x="109" y="140">3</text>
          </svg>

          <canvas ref={canvasRef} className={`board__canvas tool-${tool} ${wiping ? "is-wiping" : ""}`} aria-label="Tablica do rysowania — pisz palcem albo myszką" role="img" />
          {!drew ? <span className="board__hint chalk" aria-hidden="true">pisz po mnie ✎</span> : null}
        </div>
        <div className="board__tray" role="toolbar" aria-label="Przybory do tablicy">
          <button type="button" className="board__tool" aria-pressed={tool === "chalk"} onClick={() => setTool("chalk")} title="Kreda">
            <span className="board__stick board__stick--white" /> <span className="sr-only">Biała kreda</span>
          </button>
          <button type="button" className="board__tool" aria-pressed={tool === "gold"} onClick={() => setTool("gold")} title="Kolorowa kreda">
            <span className="board__stick board__stick--gold" /> <span className="sr-only">Kolorowa kreda</span>
          </button>
          <button type="button" className="board__tool" aria-pressed={tool === "sponge"} onClick={() => setTool("sponge")} title="Gąbka — wycieraj">
            <span className="board__sponge" /> <span className="sr-only">Gąbka</span>
          </button>
          <button type="button" className="board__clear" onClick={wipe} disabled={!drew}>
            Wytrzyj wszystko
          </button>
        </div>
      </div>
    </div>
  );
}
