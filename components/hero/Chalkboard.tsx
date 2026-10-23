"use client";

import React from "react";
import Mascot, { type MascotMood } from "../Mascot";
import { reducedMotion } from "@/lib/motion";
import "./board.css";

/* Żywa tablica. Dwie rzeczy w jednym pliku:
   1) `Chalkboard` — tablica „Jak pracuję”: rozwiązanie pisane kredą (sterowane z zewnątrz zmienną
      `--w` każdej linii), parabola rysowana kreską i płótno, po którym gość pisze sam.
      Treść tablicy to JEDEN rysunek SVG z viewBoxem — skaluje się w całości, więc na każdej
      szerokości nic się nie ucina ani nie nachodzi. Znaki spoza kroju kredy (Δ, √) są rysowane
      ścieżką, nie podstawiane z innego fontu.
   2) Klocki tablic w sekcjach (quiz, zadanie dnia, plan): `Slate`, `ChalkRing`, `Guide`,
      `chalkDust`. Na jasnym motywie wszystko to biała tablica z markerem (tokeny --board-*). */

export const BOARD_LINES = [
  { id: "l0", text: "Rozwiąż: x² − 5x + 6 = 0", kind: "task" },
  { id: "l1", text: "Δ = 25 − 24 = 1, √Δ = 1", kind: "step" },
  { id: "l2", text: "x₁ = (5 − 1) : 2 = 2", kind: "step" },
  { id: "l3", text: "x₂ = (5 + 1) : 2 = 3", kind: "step" },
] as const;

/* Pseudolosowość z ziarnem — ten sam „ręczny” rysunek na serwerze i w przeglądarce. */
export function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Owal kredą: zaczyna się, okrąża i trochę zachodzi na początek — jak ręka nauczyciela. */
export function roughLoop(cx: number, cy: number, rx: number, ry: number, seed = 1) {
  const r = seeded(seed);
  const a0 = -Math.PI * 0.92;
  const steps = 12;
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps + 2; i++) {
    const t = a0 + (i / steps) * Math.PI * 2;
    const k = 1 + (i / steps) * 0.07 + (r() - 0.5) * 0.05;
    pts.push([cx + Math.cos(t) * rx * k, cy + Math.sin(t) * ry * k]);
  }
  /* Catmull-Rom → krzywe Béziera: gładka, ale nieidealna linia */
  const f = (n: number) => n.toFixed(1);
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    d += ` C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)}, ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)}, ${f(p2[0])} ${f(p2[1])}`;
  }
  return d;
}

type Layout = {
  w: number; h: number; x: number;
  ys: number[]; fs: number[];
  sqrtX: number;
  graph: { x: number; y: number; s: number };
};
const WIDE: Layout = {
  w: 640, h: 440, x: 40,
  ys: [74, 134, 186, 238, 304], fs: [34, 30, 30, 30, 32],
  sqrtX: 300,
  graph: { x: 418, y: 250, s: 1 },
};
const TALL: Layout = {
  w: 400, h: 440, x: 24,
  ys: [50, 102, 146, 190, 246], fs: [28, 26, 26, 26, 28],
  sqrtX: 228,
  graph: { x: 200, y: 272, s: 0.95 },
};
const TALL_Q = "(max-width: 599px)";

/* Delta jako trójkąt kredą (krój kredy nie ma greckich liter). Rysowane od linii bazowej. */
function Delta({ x, y, fs }: { x: number; y: number; fs: number }) {
  const s = fs / 30;
  return <path className="board__glyph" transform={`translate(${x} ${y}) scale(${s})`} d="M1.5 0.5 L9.5 -20 L17.8 -0.4 Z M3 0.3 L16 0.6" />;
}

type Tool = "chalk" | "gold" | "sponge";

export default function Chalkboard({ boardRef }: { boardRef?: React.Ref<HTMLDivElement> }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const svgRef = React.useRef<SVGSVGElement>(null);
  const [tool, setTool] = React.useState<Tool>("chalk");
  const [drew, setDrew] = React.useState(false);
  const [wiping, setWiping] = React.useState(false);
  const [tall, setTall] = React.useState(false);
  const [lens, setLens] = React.useState<number[]>([330, 300, 250, 250, 260]);
  const toolRef = React.useRef<Tool>("chalk");
  toolRef.current = tool;
  const uid = React.useId().replace(/:/g, "");
  const L = tall ? TALL : WIDE;

  /* Układ: wąska tablica pisze w dwóch „kolumnach” jedna pod drugą. */
  React.useEffect(() => {
    const mq = window.matchMedia(TALL_Q);
    const on = () => setTall(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  /* Długość każdej linii (do końcówki kredy i obwódki odpowiedzi) — mierzona po wczytaniu kroju. */
  React.useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    let alive = true;
    const measure = () => {
      if (!alive) return;
      const next = Array.from(svg.querySelectorAll<SVGGElement>(".board__ink")).map((g) => {
        try { return Math.round(g.getBBox().width); } catch { return 0; }
      });
      if (next.every((n) => n > 0)) setLens((prev) => (prev.join() === next.join() ? prev : next));
    };
    measure();
    document.fonts?.ready.then(measure).catch(() => {});
    return () => { alive = false; };
  }, [tall]);

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
    }, reducedMotion() ? 0 : 520);
  };

  const dust = React.useMemo(() => {
    const r = seeded(7);
    return Array.from({ length: 46 }, () => ({ x: r() * 48, y: r() * 48, s: 0.6 + r() * 1.3 }));
  }, []);

  const x = L.x;
  const ans = lens[4] || 260;
  const ansFs = L.fs[4];

  /* Jedna linia tablicy: tusz (przycinany) + końcówka kredy, która jedzie za pisaniem. */
  const line = (i: number, kind: string, ink: React.ReactNode) => (
    <g key={i} className={`board__line board__line--${kind}`} data-line={i} style={{ "--len": lens[i] || 200 } as React.CSSProperties}>
      <g className="board__ink">{ink}</g>
      <g className="board__tip" aria-hidden="true">
        <g transform={`translate(${x} ${L.ys[i] - L.fs[i] * 0.32})`}>
          <rect x={-2} y={-3} width={17} height={6.5} rx={3.2} transform="rotate(-24)" />
        </g>
      </g>
    </g>
  );

  return (
    <div className="board" ref={boardRef}>
      <div className="board__frame">
        <div className={`board__surface ${tall ? "is-tall" : ""}`} ref={wrapRef}>
          <svg
            ref={svgRef}
            className="board__svg"
            viewBox={`0 0 ${L.w} ${L.h}`}
            role="img"
            aria-label="Przykładowe zadanie rozwiązywane krok po kroku: równanie kwadratowe, delta, dwa pierwiastki i wykres paraboli"
          >
            <defs>
              <pattern id={`dust${uid}`} width="48" height="48" patternUnits="userSpaceOnUse">
                {dust.map((d, i) => <rect key={i} x={d.x} y={d.y} width={d.s} height={d.s * 0.8} />)}
              </pattern>
            </defs>

            {line(0, "task", (
              <text x={x} y={L.ys[0]} style={{ fontSize: L.fs[0] }}>Rozwiąż:  x² − 5x + 6 = 0</text>
            ))}
            {line(1, "step", (
              <>
                <Delta x={x} y={L.ys[1]} fs={L.fs[1]} />
                <text x={x + L.fs[1] * 0.78} y={L.ys[1]} style={{ fontSize: L.fs[1] }}>= 25 − 24 = 1</text>
                <path
                  className="board__glyph"
                  transform={`translate(${L.sqrtX} ${L.ys[1]}) scale(${L.fs[1] / 30})`}
                  d="M0 -9 L5 -11 L11 1 L18 -26 L44 -26"
                />
                <Delta x={L.sqrtX + 19 * (L.fs[1] / 30)} y={L.ys[1]} fs={L.fs[1]} />
                <text x={L.sqrtX + 48 * (L.fs[1] / 30)} y={L.ys[1]} style={{ fontSize: L.fs[1] }}>= 1</text>
              </>
            ))}
            {line(2, "step", (
              <text x={x} y={L.ys[2]} style={{ fontSize: L.fs[2] }}>
                x<tspan className="board__sub" dy={L.fs[2] * 0.22}>1</tspan>
                <tspan dy={-L.fs[2] * 0.22}> = (5 − 1) : 2 = 2</tspan>
              </text>
            ))}
            {line(3, "step", (
              <text x={x} y={L.ys[3]} style={{ fontSize: L.fs[3] }}>
                x<tspan className="board__sub" dy={L.fs[3] * 0.22}>2</tspan>
                <tspan dy={-L.fs[3] * 0.22}> = (5 + 1) : 2 = 3</tspan>
              </text>
            ))}
            {line(4, "answer", (
              <text x={x} y={L.ys[4]} style={{ fontSize: ansFs }}>Odp.:  x = 2  lub  x = 3</text>
            ))}
            <g className="board__circle" aria-hidden="true">
              <path pathLength={1} d={roughLoop(x + ans / 2, L.ys[4] - ansFs * 0.3, ans / 2 + 16, ansFs * 0.78, 3)} />
            </g>

            <g className="board__graph" transform={`translate(${L.graph.x} ${L.graph.y}) scale(${L.graph.s})`} aria-hidden="true">
              <path className="board__axis" pathLength={1} d="M10 120 H 192 M 30 150 V 8" />
              <path className="board__parab" pathLength={1} d="M52.4 46 Q 100 208 147.6 46" />
              <circle className="board__root board__root--a" cx="86" cy="120" r="0" />
              <circle className="board__root board__root--b" cx="114" cy="120" r="0" />
              <text className="board__lbl" x="80" y="142">2</text>
              <text className="board__lbl" x="109" y="142">3</text>
            </g>

            <rect className="board__dust" width={L.w} height={L.h} fill={`url(#dust${uid})`} aria-hidden="true" />
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

/* ── klocki tablic w sekcjach ──────────────────────────────────────────────── */

/* Rama + powierzchnia + półka. Półka (`tray`) to miejsce na przybory i przyciski akcji. */
export function Slate({
  className = "", children, tray, label, dustRef, surfaceRef,
}: {
  className?: string;
  children: React.ReactNode;
  tray?: React.ReactNode;
  label?: string;
  dustRef?: React.Ref<HTMLCanvasElement>;
  surfaceRef?: React.Ref<HTMLDivElement>;
}) {
  return (
    <div className={`slate ${className}`}>
      <div className="slate__frame">
        <div className="slate__surface" ref={surfaceRef} role={label ? "group" : undefined} aria-label={label}>
          {children}
          <canvas ref={dustRef} className="slate__fx" aria-hidden="true" />
        </div>
        {tray ? <div className="slate__tray">{tray}</div> : null}
      </div>
    </div>
  );
}

/* Kółko kredą wokół odpowiedzi: dorysowuje się po najechaniu (szkic) i przy wyborze (pełne). */
/* Obwódka kredą wokół prostokąta (x, y, w, h): zaokrąglony „prostokąt z ręki”, który zawsze leży
   NA lub POZA brzegiem — więc obejmuje cały tekst, także złamany na kilka linii. Koniec zachodzi
   na początek jak przy rysowaniu jednym ruchem. */
export function roughRect(x: number, y: number, w: number, h: number, seed = 1) {
  const r = seeded(seed);
  const j = () => (r() - 0.2) * 2.2; /* przesunięcie głównie na zewnątrz */
  const rad = Math.min(h / 2, 22);
  const c = rad * 0.29;
  const R = x + w, B = y + h;
  const top = [0.1, 0.38, 0.66, 0.9].map((t) => [x + w * t, y - j()] as [number, number]);
  const bot = [0.9, 0.62, 0.34, 0.1].map((t) => [x + w * t, B + j()] as [number, number]);
  const pts: [number, number][] = [
    ...top,
    [R - c + j() * 0.5, y + c - j() * 0.5],
    [R + j(), y + h / 2],
    [R - c + j() * 0.5, B - c + j() * 0.5],
    ...bot,
    [x + c - j() * 0.5, B - c + j() * 0.5],
    [x - j(), y + h / 2],
    [x + c - j() * 0.5, y + c - j() * 0.5],
    [x + w * 0.16, y - 3 - r() * 2],
    [x + w * 0.3, y - 1.5 - r() * 3],
  ];
  const f = (n: number) => n.toFixed(1);
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    d += ` C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)}, ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)}, ${f(p2[0])} ${f(p2[1])}`;
  }
  return d;
}

/* Kółko kredą wokół wyboru. Mierzy rzeczywisty box rodzica (ResizeObserver, wymiary układu —
   bez wpływu transformów) i rysuje obwódkę w pikselach, więc nic się nie rozciąga ani nie ucina.
   Dorysowuje się po najechaniu (szkic) i przy wyborze (pełne). */
const RING_PAD = 7;
export function ChalkRing({ v = 0, className = "" }: { v?: number; className?: string }) {
  const ref = React.useRef<SVGSVGElement>(null);
  const [box, setBox] = React.useState<{ w: number; h: number } | null>(null);
  React.useEffect(() => {
    const host = ref.current?.parentElement;
    if (!host) return;
    const read = () => {
      const w = host.offsetWidth, h = host.offsetHeight;
      setBox((b) => (b && b.w === w && b.h === h ? b : { w, h }));
    };
    read();
    const ro = new ResizeObserver(read);
    ro.observe(host);
    return () => ro.disconnect();
  }, []);
  const W = (box?.w ?? 0) + RING_PAD * 2;
  const H = (box?.h ?? 0) + RING_PAD * 2;
  return (
    <svg
      ref={ref}
      className={`ring ${className}`}
      style={{ left: -RING_PAD, top: -RING_PAD, width: W, height: H }}
      viewBox={`0 0 ${Math.max(1, W)} ${Math.max(1, H)}`}
      aria-hidden="true"
    >
      {box ? <path pathLength={1} d={roughRect(RING_PAD - 2, RING_PAD - 2, box.w + 4, box.h + 4, 17 + Math.abs(v) * 7)} /> : null}
    </svg>
  );
}

/* Przewodnik obok tablicy — postać bez własnego dymka (dymek nad postacią zasłaniał tablicę),
   zdanie stoi obok w stałym miejscu, więc zmiana tekstu nie przesuwa układu. */
export function Guide({ mood = "idle", say, size = 96, className = "" }: { mood?: MascotMood; say: string; size?: number; className?: string }) {
  return (
    <div className={`guide ${className}`}>
      <Mascot mood={mood} size={size} side="right" className="guide__pi" />
      <p className="guide__say" role="status" aria-live="polite">
        <span key={say}>{say}</span>
      </p>
    </div>
  );
}

/* Pył kredy: chmurka drobin z miejsca odpowiedzi, opada i znika. Jedna klatka = kilkaset prostokątów
   1–3 px na małym płótnie nad tablicą; bez tego przy „reduce motion”. */
export function chalkDust(canvas: HTMLCanvasElement | null, from?: Element | null) {
  if (!canvas || reducedMotion()) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const r = canvas.getBoundingClientRect();
  if (!r.width || !r.height) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(r.width * dpr);
  canvas.height = Math.round(r.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const s = getComputedStyle(canvas);
  const inkC = s.getPropertyValue("--board-ink").trim() || "white";
  const accC = s.getPropertyValue("--board-accent").trim() || inkC;
  const markC = s.getPropertyValue("--board-mark").trim() || inkC;
  let ox = r.width / 2, oy = r.height / 2;
  if (from) {
    const f = from.getBoundingClientRect();
    ox = f.left + f.width / 2 - r.left;
    oy = f.top + f.height / 2 - r.top;
  }
  const parts = Array.from({ length: 170 }, (_, i) => {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.5;
    const sp = Math.random() * 7 + 1.5;
    const big = i % 9 === 0;
    return {
      x: ox + (Math.random() - 0.5) * 40, y: oy + (Math.random() - 0.5) * 16,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1.5,
      s: big ? Math.random() * 2.6 + 2 : Math.random() * 1.6 + 0.6,
      c: i % 11 === 0 ? accC : i % 7 === 0 ? markC : inkC,
      life: 70 + Math.random() * 50,
      rot: Math.random() * 3,
    };
  });
  let f = 0;
  const tick = () => {
    ctx.clearRect(0, 0, r.width, r.height);
    for (const p of parts) {
      if (f > p.life) continue;
      p.vy += 0.14; p.vx *= 0.965; p.vy *= 0.985;
      p.x += p.vx; p.y += p.vy;
      ctx.globalAlpha = Math.max(0, 1 - f / p.life) * 0.9;
      ctx.fillStyle = p.c;
      ctx.fillRect(p.x, p.y, p.s, p.s * (0.6 + (p.rot % 1) * 0.6));
    }
    ctx.globalAlpha = 1;
    if (++f < 125) requestAnimationFrame(tick);
    else ctx.clearRect(0, 0, r.width, r.height);
  };
  requestAnimationFrame(tick);
}
