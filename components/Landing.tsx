"use client";

import React from "react";
import type { Site } from "@/lib/types";
import { DEFAULT_BOOKING, EMPTY_CONTENT, EMPTY_OFFER } from "@/lib/types";
import SmoothScroll from "./SmoothScroll";
import Nav from "./Nav";
import Cursor from "./Cursor";
import PiDock from "./PiDock";
import Footer from "./Footer";
import Hero from "./hero/Hero";
import Marquee from "./sections/Marquee";
import About from "./sections/About";
import Timeline from "./sections/Timeline";
import Quiz from "./sections/Quiz";
import Pricing from "./sections/Pricing";
import DailyTask from "./sections/DailyTask";
import Reviews from "./sections/Reviews";
import Booking from "./sections/Booking";
import Contact from "./sections/Contact";

const TOPICS = ["Równania", "Funkcje", "Geometria", "Procenty", "Trygonometria", "Ciągi", "Prawdopodobieństwo", "Pochodne", "Ułamki", "Logarytmy"];

/* Ustawienia z panelu nadpisują wartości domyślne pole po polu — brakujące pole nigdy nie wywraca strony. */
function merge(site: Site | null) {
  const offer = { ...EMPTY_OFFER, ...(site?.offer || {}) };
  const content = { ...EMPTY_CONTENT, ...(site?.content || {}), contact: { ...EMPTY_CONTENT.contact, ...(site?.content?.contact || {}) } };
  const booking = { ...DEFAULT_BOOKING, ...(site?.booking || {}) };
  const reviews = site?.reviews_summary || { count: 0, average: null };
  return { offer, content, booking, reviews };
}

export default function Landing({ site }: { site: Site | null }) {
  const { offer, content, booking, reviews } = merge(site);
  const activeLevels = offer.levels.filter((l) => l.active);
  const topics = [...offer.subjects.map((s) => s.name), ...activeLevels.map((l) => l.name)];
  const tape = topics.length >= 4 ? topics : [...topics, ...TOPICS];

  return (
    <main className="landing">
      <SmoothScroll />
      <Cursor />
      <div className="grain" aria-hidden="true" />
      <Nav />
      <Hero title={content.hero_title} subtitle={content.hero_subtitle} modes={offer.modes} />
      <Marquee items={tape} />
      <About content={content} />
      <Timeline steps={content.timeline || []} />
      <Quiz levels={activeLevels} />
      <Pricing offer={offer} />
      <DailyTask levels={activeLevels} />
      <Reviews summary={reviews} />
      <Booking offer={offer} rules={booking} />
      <Contact content={content} />
      <Footer />
      <PiDock />
    </main>
  );
}
