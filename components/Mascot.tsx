"use client";

import React from "react";
import "./mascot.css";

/* Mini-Krzysztof — przewodnik po stronie, narysowany ze zdjęcia: jasnobrązowe włosy zaczesane
   do góry, wąsik i bródka, czarny golf, beżowy płaszcz, czarna rękawiczka i biały kubek
   w różowe kropki, z którego paruje. Mówi w 1. osobie, jednym zdaniem.
   Życie w spoczynku: mruga, zerka, kiwa głową i popija z kubka — każde w swoim losowym
   rytmie (nigdy jedna pętla). Oczy i głowa idą za kursorem. Stuknięcie = machnięcie ręką.
   Ruch wyłącznie transform/opacity na grupach SVG; reduce motion = postać stoi. */

export type MascotMood = "idle" | "happy" | "think" | "wow" | "wave" | "sad";

type Props = {
  mood?: MascotMood;
  say?: React.ReactNode;
  size?: number;
  side?: "left" | "right";
  className?: string;
  follow?: boolean;
};

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

export default function Mascot({ mood = "idle", say, size = 140, side = "right", className = "", follow = true }: Props) {
  const ref = React.useRef<HTMLDivElement>(null);
  const moodRef = React.useRef(mood);
  React.useEffect(() => { moodRef.current = mood; }, [mood]);

  /* Oczy i głowa za kursorem — tylko gdy postać jest na ekranie. */
  React.useEffect(() => {
    const el = ref.current;
    if (!follow || !el) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    let onScreen = false;
    const io = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; });
    io.observe(el);
    const onMove = (e: PointerEvent) => {
      if (!onScreen || raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height * 0.42;
        const dx = Math.max(-1, Math.min(1, (e.clientX - cx) / 420));
        const dy = Math.max(-1, Math.min(1, (e.clientY - cy) / 420));
        el.style.setProperty("--eye-x", `${(dx * 1.7).toFixed(2)}px`);
        el.style.setProperty("--eye-y", `${(dy * 1.5).toFixed(2)}px`);
        el.style.setProperty("--tilt", `${(dx * 5).toFixed(2)}deg`);
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [follow]);

  /* Mikroruchy w losowych odstępach: mrugnięcie, zerknięcie, kiwnięcie, łyk z kubka. */
  React.useEffect(() => {
    const el = ref.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timers: number[] = [];
    const later = (fn: () => void, ms: number) => { timers.push(window.setTimeout(fn, ms)); };
    const pulse = (cls: string, ms: number) => {
      el.classList.remove(cls);
      void el.offsetWidth;
      el.classList.add(cls);
      later(() => el.classList.remove(cls), ms);
    };
    const blink = () => {
      pulse("is-blink", 170);
      if (Math.random() < 0.22) later(() => pulse("is-blink", 170), 260); // czasem podwójne
      later(blink, rnd(2400, 6200));
    };
    const glance = () => {
      if (!matchMedia("(pointer: fine)").matches) {
        el.style.setProperty("--eye-x", `${rnd(-1.6, 1.6).toFixed(2)}px`);
        el.style.setProperty("--eye-y", `${rnd(-1, 1).toFixed(2)}px`);
      }
      later(glance, rnd(2600, 5200));
    };
    const nod = () => {
      if (moodRef.current !== "sad") pulse("is-nod", 900);
      later(nod, rnd(7000, 15000));
    };
    const sip = () => {
      const m = moodRef.current;
      if (m === "idle" || m === "think") pulse("is-sip", 2300);
      later(sip, rnd(9000, 17000));
    };
    later(blink, rnd(900, 2600));
    later(glance, rnd(1500, 3500));
    later(nod, rnd(4000, 9000));
    later(sip, rnd(5000, 11000));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);

  const poke = () => {
    const el = ref.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    el.classList.remove("is-poke");
    void el.offsetWidth;
    el.classList.add("is-poke");
    window.setTimeout(() => el.classList.remove("is-poke"), 1300);
  };

  return (
    <div
      ref={ref}
      className={`pi mk pi--${mood} pi--${side} ${className}`}
      style={{ "--size": `${size}px` } as React.CSSProperties}
      onPointerDown={poke}
    >
      {say ? (
        <div className="pi__bubble" role="status" aria-live="polite">
          <span>{say}</span>
        </div>
      ) : null}
      <MiniKrzysztof />
    </div>
  );
}

/* Sama postać. viewBox 140×150 (jak dawniej), więc stare rozmiary i dymki pasują.
   Barwy z tokenów --mk-* (klasy w mascot.css), żadnego koloru w atrybutach. */
function MiniKrzysztof() {
  return (
    <svg className="pi__svg mk__svg" viewBox="0 0 140 150" aria-hidden="true">
      <ellipse className="mk-ground" cx="70" cy="147" rx="40" ry="3.2" />

      <g className="mk__body">
        {/* reka machajaca (widoczna w nastroju wave/happy i po stuknieciu) */}
        <g className="mk__wave">
          <path className="mk-coat-sh" d="M44 117 C30 114 20 103 20 91 L33 89 C33 98 37 104 48 108 Z" />
          <rect className="mk-coat-hi" x="19" y="87" width="15" height="5" rx="2" transform="rotate(-4 26 89)" />
          <path className="mk-glove" d="M20 88 C17 82 19 75 25 74 C31 73 35 79 33 86 C32 90 23 91 20 88 Z" />
          <path className="mk-glove" d="M21.5 78 C19.5 73 21.5 69 24.5 70 C26.5 71 26.5 75 25.5 78 Z" />
        </g>

        {/* plaszcz */}
        <path className="mk-coat" d="M14 150 C14 127 27 112 50 106 L60 102 L80 102 L90 106 C113 112 126 127 126 150 Z" />
        <path className="mk-coat-sh" d="M14 150 C14 132 20 121 31 113 C27 124 26 137 28 150 Z" />
        <path className="mk-coat-sh" d="M126 150 C126 132 120 121 109 113 C113 124 114 137 112 150 Z" />
        {/* golf widoczny w rozpietym plaszczu */}
        <path className="mk-knit" d="M58 102 L82 102 L75 150 L65 150 Z" />
        {/* klapy */}
        <path className="mk-coat-hi" d="M59 101 L45 114 L52 118 L48 122 L66 147 L64 118 Z" />
        <path className="mk-coat-hi" d="M81 101 L95 114 L88 118 L92 122 L74 147 L76 118 Z" />
        <path className="mk-seam" d="M59 101 L45 114 L52 118 L48 122 L66 147" />
        <path className="mk-seam" d="M81 101 L95 114 L88 118 L92 122 L74 147" />
        <circle className="mk-button" cx="79" cy="140" r="2.1" />

        {/* golf pod szyja */}
        <rect className="mk-knit" x="57" y="86" width="26" height="20" rx="7" />
        <path className="mk-knit-hi" d="M59 92 Q70 95 81 92 M59 97 Q70 100 81 97" />

        {/* glowa: kiwniecie i przechyl za kursorem */}
        <g className="mk__head">
          <ellipse className="mk-skin" cx="46.5" cy="66" rx="4.4" ry="6.2" />
          <ellipse className="mk-skin" cx="93.5" cy="66" rx="4.4" ry="6.2" />
          <ellipse className="mk-skin-sh" cx="46.8" cy="66.5" rx="2" ry="3.4" />
          <ellipse className="mk-skin-sh" cx="93.2" cy="66.5" rx="2" ry="3.4" />
          <path className="mk-skin" d="M47 60 C47 37 93 37 93 60 C93 80 84 94 70 94 C56 94 47 80 47 60 Z" />
          {/* zarost na zuchwie */}
          <path className="mk-stubble" d="M49 74 C52 88 61 94 70 94 C79 94 88 88 91 74 C87 84 79 89 70 89 C61 89 53 84 49 74 Z" />
          <ellipse className="mk-blush" cx="55" cy="77" rx="4.6" ry="2.4" />
          <ellipse className="mk-blush" cx="85" cy="77" rx="4.6" ry="2.4" />

          {/* oczy: zrenice za kursorem, powieki do mrugania */}
          <g className="mk__eyes">
            <ellipse className="mk-eyewhite" cx="60" cy="66" rx="4.4" ry="5" />
            <ellipse className="mk-eyewhite" cx="80" cy="66" rx="4.4" ry="5" />
            <g className="mk__pupils">
              <circle className="mk-pupil" cx="60" cy="66.6" r="2.8" />
              <circle className="mk-pupil" cx="80" cy="66.6" r="2.8" />
              <circle className="mk-glint" cx="61" cy="65.4" r=".95" />
              <circle className="mk-glint" cx="81" cy="65.4" r=".95" />
            </g>
            <g className="mk__lids">
              <ellipse className="mk-skin" cx="60" cy="66" rx="5" ry="5.6" />
              <ellipse className="mk-skin" cx="80" cy="66" rx="5" ry="5.6" />
            </g>
            {/* oczy-usmiechy (happy) */}
            <path className="mk__smileeyes mk-ink" d="M55.6 67 Q60 62.4 64.4 67 M75.6 67 Q80 62.4 84.4 67" />
          </g>
          <g className="mk__brows">
            <path className="mk__brow mk__brow--l mk-brow" d="M54.5 57.6 Q60 54.6 65 56.6" />
            <path className="mk__brow mk__brow--r mk-brow" d="M75 56.6 Q80 54.6 85.5 57.6" />
          </g>

          <path className="mk-nose" d="M70.6 68 Q73.2 73.4 69.6 74.4" />
          {/* wasik */}
          <path className="mk-beard" d="M62 79.4 C64.6 76.6 67.8 76.8 70 78 C72.2 76.8 75.4 76.6 78 79.4 C75 78.6 72.4 79.4 70 79.8 C67.6 79.4 65 78.6 62 79.4 Z" />
          {/* usta — CSS pokazuje jeden wariant */}
          <path className="mk__mouth mk__mouth--smile mk-ink" d="M64.6 82.4 Q70 86.4 75.4 82.4" />
          <path className="mk__mouth mk__mouth--open mk-mouth" d="M64 81.6 Q70 91 76 81.6 Z" />
          <ellipse className="mk__mouth mk__mouth--o mk-mouth" cx="70" cy="84.4" rx="2.5" ry="3.1" />
          <path className="mk__mouth mk__mouth--flat mk-ink" d="M65.4 84.6 Q70 82 74.6 84.6" />
          {/* brodka */}
          <path className="mk-beard" d="M66 88.4 C67 92.6 73 92.6 74 88.4 C72 89.6 68 89.6 66 88.4 Z" />

          {/* wlosy: objetosc z tylu, potem grzywka zaczesana do gory */}
          <path className="mk-hair" d="M46 64 C40 40 52 24 70 23 C88 22 100 37 94 64 C93 56 92 52 89 49 C80 47 60 47 51 49 C48 52 47 57 46 64 Z" />
          <path className="mk-hair" d="M48 52 C44 33 56 17 74 16 C88 15 99 22 98 33 C94 29 88 28 83 30 C89 33 93 40 93 50 C86 45 76 44 66 46 C59 47 53 49 48 52 Z" />
          <path className="mk-hair" d="M47 56 L51 55 L50 68 L47.5 66 Z M93 56 L89 55 L90 68 L92.5 66 Z" />
          <path className="mk-hair-hi" d="M57 40 C59 30 67 23 79 21 M66 40 C68 33 75 28 85 27" />
          <path className="mk-hair-dk" d="M53 49 C58 47 64 46 70 46" />
        </g>

        {/* reka z kubkiem: lyk w losowych odstepach */}
        <g className="mk__mug">
          <path className="mk-coat-sh" d="M103 111 C116 115 121 128 115 139 L104 137 C108 129 106 122 99 120 Z" />
          <rect className="mk-mug" x="91" y="110" width="17" height="18" rx="3" />
          <path className="mk-mug-sh" d="M104 110 L108 110 L108 125 C108 127 107 128 105 128 L104 128 Z" />
          <path className="mk-handle" d="M108 114 C114 114 114 124 108 124" />
          <circle className="mk-dot" cx="95" cy="114.5" r="1.1" />
          <circle className="mk-dot" cx="100" cy="118" r="1" />
          <circle className="mk-dot" cx="96" cy="122" r=".9" />
          <circle className="mk-dot" cx="103" cy="114" r=".8" />
          <path className="mk-glove" d="M88 122 C88 117 93 116 97 118 C102 120 105 124 103 128 C101 132 92 132 89 128 Z" />
          <g className="mk__steam">
            <path className="mk__curl mk-steam" d="M95 107 c -1.6 -2.4 1.6 -4 0 -6.6 s 1.4 -4 0 -6" />
            <path className="mk__curl mk-steam" d="M99.5 107.4 c 1.4 -2.2 -1.4 -4 0 -6.2 s -1.2 -3.6 0 -5.6" />
            <path className="mk__curl mk-steam" d="M104 107 c -1.2 -2 1.2 -3.4 0 -5.4 s 1 -3 0 -4.6" />
          </g>
        </g>

        {/* mysli (think) */}
        <g className="mk__think">
          <circle className="mk-thought" cx="102" cy="38" r="2" />
          <circle className="mk-thought" cx="109" cy="29" r="3" />
          <circle className="mk-thought" cx="119" cy="18" r="4.4" />
        </g>
        {/* iskry (wow / happy) */}
        <g className="mk__spark">
          <path className="mk-spark" d="M28 40 l2 -6 l2 6 l6 2 l-6 2 l-2 6 l-2 -6 l-6 -2 z" />
          <path className="mk-spark" d="M110 50 l1.4 -4 l1.4 4 l4 1.4 l-4 1.4 l-1.4 4 l-1.4 -4 l-4 -1.4 z" />
        </g>
      </g>
    </svg>
  );
}
