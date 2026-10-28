"use client";

import React from "react";
import type { Content, Level, Offer as OfferT } from "@/lib/types";
import { EMPTY_CONTENT, EMPTY_OFFER } from "@/lib/types";
import { CONTACT, DEFAULT_LEVELS, SUBJECTS } from "@/content";
import { reducedMotion } from "@/lib/motion";
import Hero from "../../hero/Hero";
import Offer from "../../sections/Offer";
import Pricing from "../../sections/Pricing";
import Timeline from "../../sections/Timeline";
import About from "../../sections/About";
import Faq from "../../sections/Faq";

/* Żywy podgląd w ramce panelu: prawdziwe sekcje strony, zasilane szkicem z panelu (postMessage
   z tego samego originu). Te same reguły scalania co `components/Landing.tsx`. */

type Msg = { type: "kk-preview"; view: "offer" | "content"; offer?: OfferT; content?: Content; theme?: string; focus?: string };

const pick = (v: string | null | undefined, fallback: string | null) => (v && v.trim() ? v : fallback);

function mergeOffer(so?: OfferT): OfferT {
  return {
    ...EMPTY_OFFER,
    ...(so || {}),
    levels: so?.levels?.length ? so.levels : DEFAULT_LEVELS,
    subjects: so?.subjects?.length ? so.subjects : SUBJECTS,
  };
}

function mergeContent(sc?: Content): Content {
  const contact: Content["contact"] = {
    email: sc?.contact?.email ?? null,
    phone: pick(sc?.contact?.phone, CONTACT.phoneDisplay),
    city: pick(sc?.contact?.city, CONTACT.city),
    area: pick(sc?.contact?.area, CONTACT.area),
    facebook: pick(sc?.contact?.facebook, CONTACT.facebook),
    instagram: pick(sc?.contact?.instagram, CONTACT.instagram),
  };
  return { ...EMPTY_CONTENT, ...(sc || {}), contact };
}

/* W podglądzie wszystko, co normalnie wjeżdża przy przewijaniu, jest od razu widoczne. */
const STYLE = "[data-reveal]{opacity:1!important;transform:none!important}html{scrollbar-width:none}html::-webkit-scrollbar{display:none}";

export default function PreviewHost() {
  const [msg, setMsg] = React.useState<Msg | null>(null);

  React.useEffect(() => {
    const on = (e: MessageEvent) => {
      if (e.origin !== location.origin || e.source !== window.parent) return;
      const d = e.data as Msg;
      if (d?.type !== "kk-preview") return;
      if (d.theme === "light" || d.theme === "dark") document.documentElement.dataset.theme = d.theme;
      setMsg(d);
    };
    window.addEventListener("message", on);
    window.parent?.postMessage({ type: "kk-preview-ready" }, location.origin);
    return () => window.removeEventListener("message", on);
  }, []);

  /* Panel mówi, którą część edytujesz — ramka przewija się do niej. */
  const focus = msg?.focus;
  React.useEffect(() => {
    if (!focus) return;
    const t = window.setTimeout(() => {
      if (focus === "top") return window.scrollTo({ top: 0, behavior: reducedMotion() ? "auto" : "smooth" });
      document.querySelector(focus)?.scrollIntoView({ block: "start", behavior: reducedMotion() ? "auto" : "smooth" });
    }, 60);
    return () => window.clearTimeout(t);
  }, [focus, msg?.view]);

  if (!msg) return <style dangerouslySetInnerHTML={{ __html: STYLE }} />;

  let body: React.ReactNode = null;
  if (msg.view === "offer") {
    const offer = mergeOffer(msg.offer);
    const active: Level[] = offer.levels.filter((l) => l.active);
    /* Sekcje trzymają wybór (poziom, długość) w stanie — przy zmianie listy zaczynają od nowa. */
    const shape = `${active.map((l) => l.key).join(",")}|${offer.durations.join(",")}`;
    body = (
      <>
        <Offer key={`o-${shape}`} levels={active} />
        <Pricing key={`p-${shape}`} offer={offer} />
      </>
    );
  } else {
    const content = mergeContent(msg.content);
    body = (
      <>
        <Hero title={content.hero_title} subtitle={content.hero_subtitle} />
        <Timeline key={`t-${(content.timeline || []).length}`} steps={content.timeline || []} />
        <About content={content} />
        <Faq key={`f-${(content.faq || []).length}`} items={content.faq || []} />
      </>
    );
  }
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLE }} />
      <main id="main" className="landing">{body}</main>
    </>
  );
}
