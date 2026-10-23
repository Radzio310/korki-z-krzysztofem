"use client";

import React from "react";
import Logo from "../Logo";
import type { BookingStatus } from "@/lib/types";
import { zl } from "@/lib/pricing";
import { fmtTime, TZ } from "@/lib/time";
import { reducedMotion } from "@/lib/motion";
import "./ticket.css";

/* Bilet na lekcję. W czacie „drukuje się” ze szczeliny (przesuw z przystankami jak
   w drukarce paragonów), potem odrywa się od drukarki i spada pieczęć statusu.
   Na stronie rezerwacji (/rezerwacja/[token]) ten sam bilet, bez drukowania. */

export type TicketData = {
  id: number;
  token?: string;
  status: BookingStatus;
  starts_at: string;
  ends_at?: string | null;
  duration_minutes: number;
  student_name?: string | null;
  subject?: string | null;
  level?: string | null;
  mode?: string | null;
  price_grosze?: number | null;
};

export const STATUS_LABEL: Record<BookingStatus, string> = {
  pending: "Czeka na potwierdzenie",
  confirmed: "Potwierdzona",
  cancelled: "Odwołana",
  done: "Odbyta",
  no_show: "Nieodbyta",
};

/* pieczęć: krótko, żeby zmieściła się w kółku także na telefonie */
const STAMP: Record<BookingStatus, string> = {
  pending: "Przyjęta",
  confirmed: "Potwierdzona",
  cancelled: "Odwołana",
  done: "Odbyta",
  no_show: "Nieodbyta",
};

const weekdayFmt = new Intl.DateTimeFormat("pl-PL", { timeZone: TZ, weekday: "long" });
const dayMonthFmt = new Intl.DateTimeFormat("pl-PL", { timeZone: TZ, day: "numeric", month: "long" });
const yearFmt = new Intl.DateTimeFormat("pl-PL", { timeZone: TZ, year: "numeric" });

/* Kreski „kodu” liczone z tokenu rezerwacji — ozdoba, ale z prawdziwych danych. */
function bars(seed: string) {
  const out: { x: number; w: number }[] = [];
  let x = 0;
  for (let i = 0; i < 34; i++) {
    const c = seed.charCodeAt(i % seed.length) || 7;
    const w = 1 + ((c * (i + 3)) % 3);
    out.push({ x, w });
    x += w + 1 + ((c >> (i % 4)) % 2);
  }
  return { out, width: x };
}

export default function Ticket({
  data,
  print = false,
  actions,
  className = "",
}: {
  data: TicketData;
  print?: boolean;
  actions?: React.ReactNode;
  className?: string;
}) {
  const [phase, setPhase] = React.useState<"print" | "torn">(print ? "print" : "torn");

  React.useEffect(() => {
    if (!print) return;
    if (reducedMotion()) { setPhase("torn"); return; }
    const t = window.setTimeout(() => setPhase("torn"), 1900);
    return () => window.clearTimeout(t);
  }, [print]);

  const start = new Date(data.starts_at);
  const end = data.ends_at ? new Date(data.ends_at) : new Date(start.getTime() + data.duration_minutes * 60000);
  const code = bars(data.token || String(data.id || "korki"));
  const nr = String(data.id || 0).padStart(5, "0");
  const status = data.status;

  return (
    <div className={`tkw ${print ? "tkw--print" : ""} is-${phase} ${className}`}>
      {print ? (
        <div className="tkw__printer" aria-hidden="true">
          <span className="tkw__led" />
          <span className="tkw__slot" />
        </div>
      ) : null}
      <div className="tkw__feed">
        <article className="tk" data-status={status} aria-label={`Bilet na lekcję: ${weekdayFmt.format(start)}, ${dayMonthFmt.format(start)}, ${fmtTime(data.starts_at)}. Status: ${STATUS_LABEL[status]}.`}>
          <svg className="tk__edge" viewBox="0 0 200 8" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 8 L0 4 L5 0 L10 4 L15 0 L20 4 L25 0 L30 4 L35 0 L40 4 L45 0 L50 4 L55 0 L60 4 L65 0 L70 4 L75 0 L80 4 L85 0 L90 4 L95 0 L100 4 L105 0 L110 4 L115 0 L120 4 L125 0 L130 4 L135 0 L140 4 L145 0 L150 4 L155 0 L160 4 L165 0 L170 4 L175 0 L180 4 L185 0 L190 4 L195 0 L200 4 L200 8 Z" />
          </svg>

          <header className="tk__head">
            <span className="tk__brand"><Logo size={26} /> Korki <em>z</em> Krzysztofem</span>
            <span className="tk__nr">Bilet nr {nr}</span>
          </header>

          <div className="tk__when">
            <span className="tk__weekday">{weekdayFmt.format(start)}</span>
            <strong className="tk__date">{dayMonthFmt.format(start)} <small>{yearFmt.format(start)}</small></strong>
            <span className="tk__time">
              <b>{fmtTime(data.starts_at)}</b>
              <svg viewBox="0 0 40 12" aria-hidden="true"><path d="M1 6h34M30 1l6 5-6 5" /></svg>
              <b>{fmtTime(end.toISOString())}</b>
              <span className="tk__dur">{data.duration_minutes} min</span>
            </span>
          </div>

          <div className="tk__perf" aria-hidden="true" />

          <dl className="tk__grid">
            {data.student_name ? <div><dt>Uczeń</dt><dd>{data.student_name}</dd></div> : null}
            {data.subject ? <div><dt>Przedmiot</dt><dd>{data.subject}</dd></div> : null}
            {data.level ? <div><dt>Poziom</dt><dd>{data.level}</dd></div> : null}
            {data.mode ? <div><dt>Forma</dt><dd>{data.mode}</dd></div> : null}
            {data.price_grosze != null ? <div><dt>Cena lekcji</dt><dd>{zl(data.price_grosze)}</dd></div> : null}
            <div><dt>Status</dt><dd>{STATUS_LABEL[status]}</dd></div>
          </dl>

          <div className="tk__foot">
            <svg className="tk__code" viewBox={`0 0 ${code.width} 24`} preserveAspectRatio="none" aria-hidden="true">
              {code.out.map((b, i) => <rect key={i} x={b.x} y="0" width={b.w} height="24" />)}
            </svg>
            {actions ? <div className="tk__actions">{actions}</div> : null}
          </div>

          <span className="tk__stamp" aria-hidden="true">
            <span className="tk__stamp-ring"><small>Korki</small>{STAMP[status]}<small>{nr}</small></span>
          </span>
        </article>
      </div>
    </div>
  );
}
