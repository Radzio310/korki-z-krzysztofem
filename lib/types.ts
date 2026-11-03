/* Typy API — jedyne miejsce. Kształty 1:1 z docs/KONTRAKT_API.md. */

export type Level = {
  key: string;
  name: string;
  description?: string | null;
  prices: Record<string, number>;
  active: boolean;
};

export type Subject = { key: string; name: string };

export type Discount = { min_weekly_minutes: number; percent: number; label?: string | null };

export type Offer = {
  subjects: Subject[];
  durations: number[];
  levels: Level[];
  discounts: Discount[];
  weeks_per_month: number;
  modes: string[];
  notes?: string | null;
};

export type Fact = { value: string; label: string };
export type Faq = { q: string; a: string };
export type TimelineStep = { title: string; body: string };

export type Content = {
  hero_title: string | null;
  hero_subtitle: string | null;
  about_title: string | null;
  about_body: string | null;
  about_facts: Fact[];
  photo_url: string | null;
  contact: {
    email: string | null;
    phone: string | null;
    city: string | null;
    area: string | null;
    facebook: string | null;
    instagram: string | null;
  };
  faq: Faq[];
  timeline: TimelineStep[];
};

export type BookingRules = {
  enabled: boolean;
  auto_confirm: boolean;
  min_notice_hours: number;
  horizon_days: number;
  slot_step_minutes: number;
  buffer_minutes: number;
  timezone: string;
};

export type Site = {
  offer: Offer;
  content: Content;
  booking: BookingRules;
  reviews_summary: { count: number; average: number | null };
};

export type SlotDay = { date: string; slots: string[] };
export type Slots = { timezone: string; duration: number; enabled?: boolean; days: SlotDay[] };

/* POST /korki/public/bookings */
export type BookingRequest = {
  client_id: string;
  starts_at: string;
  duration_minutes: number;
  level_key: string | null;
  subject_key: string | null;
  mode: string | null;
  weekly_lessons: number;
  student_name: string;
  email: string;
  phone: string | null;
  message: string | null;
  consent: true;
  /** pułapka na boty — zawsze pusty string od człowieka */
  website: string;
};
export type BookingCreated = {
  id: number;
  token: string;
  status: BookingStatus;
  starts_at: string;
  ends_at: string;
  duration_minutes: number;
  price_grosze: number | null;
};

export type BookingStatus = "pending" | "confirmed" | "cancelled" | "done" | "no_show";

export type Booking = {
  id: number;
  token?: string;
  status: BookingStatus;
  starts_at: string;
  ends_at?: string;
  duration_minutes: number;
  level_key: string | null;
  subject_key: string | null;
  mode: string | null;
  weekly_lessons: number | null;
  student_name: string;
  email: string;
  phone: string | null;
  message: string | null;
  price_grosze: number | null;
  created_at: string;
  confirmed_at: string | null;
  cancelled_at: string | null;
  cancelled_by: "student" | "tutor" | null;
  tutor_note: string | null;
  cancel_reason?: string | null;
  can_cancel?: boolean;
  version: number;
};

export type Review = {
  id: number;
  author_name: string;
  author_label: string | null;
  rating: number | null;
  body: string;
  featured: boolean;
  status?: "pending" | "approved" | "rejected";
  source?: "form" | "manual";
  created_at: string;
  version?: number;
};

export type DailyTask = {
  id: number;
  title: string;
  body: string;
  hint: string | null;
  level_key: string | null;
  date: string;
};

export type TaskCheck = { correct: boolean; solution: string | null; answer?: string | null };

export type QuizQuestion = { id: number; level_key: string | null; prompt: string; options: string[] };

export type QuizResult = {
  score: number;
  total: number;
  seconds: number;
  level_key_recommended: string | null;
  results: { id: number; correct: boolean; correct_index: number; explanation: string | null }[];
};

/* ── Kontakt: POST /korki/public/contact (docs/KONTRAKT_API.md) ───────────── */
export type ContactSubject = "matematyka" | "chemia";
export type ContactLevel = "sp_1_4" | "sp_5_8" | "liceum" | "inny";
export type ContactMode = "stationary" | "online" | "any";

export type ContactRequest = {
  name: string;
  subjects: ContactSubject[];
  level: ContactLevel;
  mode: ContactMode;
  email?: string;
  phone?: string;
  class_info?: string;
  message?: string;
  consent?: boolean;
  /** pułapka na boty — zawsze pusty string od człowieka */
  website: string;
};
export type ContactResponse = { ok: true; request_id: string };

/** Wiadomość z formularza w panelu (GET /korki/panel/messages). Starsze wiadomości nie mają nowych pól. */
export type ContactMessage = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  message: string | null;
  subjects?: string[] | null;
  level?: string | null;
  mode?: string | null;
  class_info?: string | null;
  read: boolean;
  created_at: string;
};

export type List<T> = { rows: T[]; total: number };

export const EMPTY_OFFER: Offer = {
  subjects: [],
  durations: [45, 60, 90, 120],
  levels: [],
  discounts: [],
  weeks_per_month: 4,
  modes: [],
  notes: null,
};

export const EMPTY_CONTENT: Content = {
  hero_title: null,
  hero_subtitle: null,
  about_title: null,
  about_body: null,
  about_facts: [],
  photo_url: null,
  contact: { email: null, phone: null, city: null, area: null, facebook: null, instagram: null },
  faq: [],
  timeline: [],
};

export const DEFAULT_BOOKING: BookingRules = {
  enabled: true,
  auto_confirm: false,
  min_notice_hours: 12,
  horizon_days: 28,
  slot_step_minutes: 15,
  buffer_minutes: 15,
  timezone: "Europe/Warsaw",
};
