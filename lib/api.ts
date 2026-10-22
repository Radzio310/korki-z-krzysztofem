import type {
  Booking, DailyTask, List, QuizQuestion, QuizResult, Review, Site, Slots, TaskCheck,
} from "./types";

export const API_BASE = (process.env.NEXT_PUBLIC_KORKI_API || "https://communioserwer-production.up.railway.app").replace(/\/$/, "");

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const FALLBACK: Record<number, string> = {
  400: "Coś w formularzu się nie zgadza — sprawdź pola.",
  401: "Sesja wygasła — zaloguj się ponownie.",
  404: "Nie znaleziono.",
  409: "Ktoś był szybszy — odśwież i spróbuj ponownie.",
  422: "Coś w formularzu się nie zgadza — sprawdź pola.",
  429: "Za dużo prób — spróbuj za chwilę.",
};

type Opts = { method?: string; body?: unknown; token?: string | null; signal?: AbortSignal };

export async function api<T>(path: string, opts: Opts = {}): Promise<T> {
  const headers: Record<string, string> = { accept: "application/json" };
  if (opts.body !== undefined) headers["content-type"] = "application/json";
  if (opts.token) headers.authorization = `Bearer ${opts.token}`;
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: opts.method || (opts.body !== undefined ? "POST" : "GET"),
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: opts.signal,
      cache: "no-store",
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new ApiError(0, "Brak połączenia z serwerem — sprawdź internet i spróbuj ponownie.");
  }
  if (res.status === 204) return undefined as T;
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const detail = (data as { detail?: unknown } | null)?.detail;
    let msg = typeof detail === "string" ? detail : FALLBACK[res.status] || "Coś poszło nie tak — spróbuj ponownie.";
    /* błąd walidacji FastAPI: lista pól — pokazujemy pierwsze zdanie, bez technicznego przedrostka */
    if (Array.isArray(detail) && detail.length) {
      const first = detail[0] as { msg?: string };
      msg = first?.msg ? first.msg.replace(/^Value error,\s*/i, "") : FALLBACK[400];
      if (/email/i.test(msg)) msg = "Podaj poprawny adres e-mail.";
      else if (/^(Field required|String should|Input should|value is not|List should)/i.test(msg)) msg = FALLBACK[400];
    }
    throw new ApiError(res.status, msg);
  }
  return data as T;
}

/* Serwerowy odczyt strony startowej: krótki cache, a gdy serwer milczy — null (strona i tak się renderuje). */
export async function fetchSite(): Promise<Site | null> {
  try {
    const res = await fetch(`${API_BASE}/korki/public/site`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return (await res.json()) as Site;
  } catch {
    return null;
  }
}

export const publicApi = {
  site: () => api<Site>("/korki/public/site"),
  slots: (duration: number, from: string, days: number, signal?: AbortSignal) =>
    api<Slots>(`/korki/public/slots?duration=${duration}&from=${from}&days=${days}`, { signal }),
  book: (body: Record<string, unknown>) => api<Booking & { token: string }>("/korki/public/bookings", { body }),
  booking: (token: string) => api<Booking>(`/korki/public/bookings/${encodeURIComponent(token)}`),
  cancel: (token: string, reason?: string) =>
    api<Booking>(`/korki/public/bookings/${encodeURIComponent(token)}/cancel`, { body: { reason: reason || null } }),
  icsUrl: (token: string) => `${API_BASE}/korki/public/bookings/${encodeURIComponent(token)}/ics`,
  reviews: (limit = 24) => api<List<Review>>(`/korki/public/reviews?limit=${limit}`),
  addReview: (body: Record<string, unknown>) => api<unknown>("/korki/public/reviews", { body }),
  dailyTask: () => api<DailyTask | null>("/korki/public/daily-task"),
  checkTask: (id: number, answer: string, reveal = false) =>
    api<TaskCheck>(`/korki/public/daily-task/${id}/check`, { body: { answer, reveal } }),
  quiz: () => api<List<QuizQuestion>>("/korki/public/quiz"),
  score: (answers: { id: number; choice: number }[], seconds: number) =>
    api<QuizResult>("/korki/public/quiz/score", { body: { answers, seconds } }),
  contact: (body: Record<string, unknown>) => api<unknown>("/korki/public/contact", { body }),
};
