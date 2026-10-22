"use client";

import React from "react";
import type { Content, Site } from "@/lib/types";
import { DEFAULT_BOOKING, EMPTY_CONTENT, EMPTY_OFFER } from "@/lib/types";
import { CONTACT, DEFAULT_LEVELS, SUBJECTS, TOPICS } from "@/content";
import SmoothScroll from "./SmoothScroll";
import Nav from "./Nav";
import Cursor from "./Cursor";
import PiDock from "./PiDock";
import Footer from "./Footer";
import Hero from "./hero/Hero";
import Marquee from "./sections/Marquee";
import Offer from "./sections/Offer";
import Benefits from "./sections/Benefits";
import Timeline from "./sections/Timeline";
import About from "./sections/About";
import Reviews from "./sections/Reviews";
import DailyTask from "./sections/DailyTask";
import Quiz from "./sections/Quiz";
import Pricing from "./sections/Pricing";
import Booking from "./sections/Booking";
import Faq from "./sections/Faq";
import Contact from "./sections/Contact";

const pick = (v: string | null | undefined, fallback: string | null) => (v && v.trim() ? v : fallback);

/* Ustawienia z panelu nadpisują wartości domyślne (content/) pole po polu —
   brakujące pole nigdy nie wywraca strony. Poziomy i przedmioty z panelu zastępują
   domyślne w całości (serwer waliduje rezerwację względem własnej listy). */
function merge(site: Site | null) {
  const so = site?.offer;
  const offer = {
    ...EMPTY_OFFER,
    ...(so || {}),
    levels: so?.levels?.length ? so.levels : DEFAULT_LEVELS,
    subjects: so?.subjects?.length ? so.subjects : SUBJECTS,
  };
  const sc = site?.content;
  const contact: Content["contact"] = {
    email: sc?.contact?.email ?? null,
    phone: pick(sc?.contact?.phone, CONTACT.phoneDisplay),
    city: pick(sc?.contact?.city, CONTACT.city),
    area: pick(sc?.contact?.area, CONTACT.area),
    facebook: pick(sc?.contact?.facebook, CONTACT.facebook),
    instagram: pick(sc?.contact?.instagram, CONTACT.instagram),
  };
  const content: Content = { ...EMPTY_CONTENT, ...(sc || {}), contact };
  const booking = { ...DEFAULT_BOOKING, ...(site?.booking || {}) };
  const reviews = site?.reviews_summary || { count: 0, average: null };
  return { offer, content, booking, reviews };
}

/* Bez JS: wszystko, co wchodzi animacją, jest od razu widoczne. */
const NOSCRIPT = "<style>[data-reveal],.kt__c,.of__card,.of__chem{opacity:1!important;transform:none!important;animation:none!important}.board__line{--w:1!important}</style>";

export default function Landing({ site }: { site: Site | null }) {
  const { offer, content, booking, reviews } = merge(site);
  const activeLevels = offer.levels.filter((l) => l.active);

  return (
    <>
      <a className="skip" href="#main">Przejdź do treści</a>
      <noscript dangerouslySetInnerHTML={{ __html: NOSCRIPT }} />
      <SmoothScroll />
      <Cursor />
      <div className="grain" aria-hidden="true" />
      <Nav />
      <main id="main" className="landing" tabIndex={-1}>
        <Hero title={content.hero_title} subtitle={content.hero_subtitle} />
        <Marquee items={TOPICS} />
        <Offer levels={activeLevels} />
        <Benefits />
        <Timeline steps={content.timeline || []} />
        <About content={content} />
        <Reviews summary={reviews} />
        <DailyTask levels={activeLevels} />
        <Quiz levels={activeLevels} />
        <Pricing offer={offer} />
        <Booking offer={offer} rules={booking} />
        <Faq items={content.faq || []} />
        <Contact content={{ ...content, faq: [] }} />
      </main>
      <Footer />
      <PiDock />
    </>
  );
}
