# Kontrakt API — Korki z Krzysztofem

Serwer: moduł `korki` w `Radzio310/Communio_serwer` (FastAPI). Wszystkie ścieżki pod `/korki`.
Ten plik jest **źródłem prawdy** dla strony (`web/`) i serwera. Zmiana kształtu = zmiana tutaj.

## Zasady ogólne

- Odpowiedź listy: `{ "rows": [...], "total": N }`. Rekord: obiekt. Błąd: `{ "detail": "zdanie po polsku" }`.
- Błąd walidacji danych (złe pole, brak pola) → **400** `{ "detail": "Sprawdź pole „e-mail”.", "errors": [ { "loc": ["body","email"], "type", "msg" } ] }`
  — `detail` do pokazania, `errors[].loc` do podświetlenia pola. (422 oznacza wyłącznie brak konfiguracji serwera.)
- Chwile (`*_at`, `starts_at`) w ISO 8601 **UTC ze strefą**, zawsze w zapisie `YYYY-MM-DDTHH:MM:SSZ`
  (ten sam co sloty — napis terminu rezerwacji da się porównać z napisem slotu). Strona przelicza do `Europe/Warsaw`.
- Daty kalendarzowe (`date`, `starts_on`) jako `YYYY-MM-DD` w czasie Warszawy.
- Kwoty w **groszach** (int), waluta `PLN`.
- Formularze publiczne niosą pole-pułapkę `website` (musi być puste; wypełnione → udajemy sukces, nic nie zapisujemy)
  oraz `consent: true` (zgoda RODO, bez niej 400). Limit tempa per IP.
- Panel: nagłówek `Authorization: Bearer <token>` z `POST /korki/panel/login`. Brak/wygasły → 401.
- Zapisy rekordów z polem `version` (int): klient odsyła ostatnio widziane `version`; różne → **409**
  z `detail` po polsku, klient odświeża.

## Ustawienia (edytowalne w panelu)

Trzy dokumenty JSON, każdy z `version`:

### `offer` — przedmioty, poziomy, ceny, pakiety
```json
{
  "subjects": [ { "key": "matematyka", "name": "Matematyka" } ],
  "durations": [45, 60, 90, 120],
  "levels": [
    {
      "key": "podstawowka", "name": "Szkoła podstawowa", "description": "…",
      "prices": { "45": 6000, "60": 8000, "90": 11500, "120": 15000 },
      "active": true
    }
  ],
  "discounts": [ { "min_weekly_minutes": 180, "percent": 5, "label": "Pakiet stały" } ],
  "weeks_per_month": 4,
  "modes": ["online", "stationary"],
  "notes": "np. dojazd dopłata…"
}
```
Domyślnie (nic nie zapisano): `subjects`, `levels`, `discounts`, `modes` puste, `durations` `[45,60,90,120]`,
`weeks_per_month` 4, `notes` `null` — zero zmyślonych danych. Pusta lista `modes` = forma lekcji nieustalona
(`mode` w rezerwacji dowolne z `online`/`stationary` albo `null`). `GET /public/site` pomija poziomy z `active: false`.
Cena lekcji: `prices[str(duration)]`; gdy brak — proporcjonalnie z ceny za 60 min (zaokrąglenie do pełnej złotówki).
Kalkulator: `cena_lekcji × lekcji_w_tygodniu × weeks_per_month`, rabat = najwyższy próg, który
`duration × lekcji_w_tygodniu` osiąga.

### `content` — teksty strony
```json
{
  "hero_title": null, "hero_subtitle": null,
  "about_title": null, "about_body": null, "about_facts": [ { "value": "…", "label": "…" } ],
  "photo_url": null,
  "contact": { "email": null, "phone": null, "city": null, "area": null, "facebook": null, "instagram": null },
  "faq": [ { "q": "…", "a": "…" } ],
  "timeline": [ { "title": "…", "body": "…" } ]
}
```
`null` = brak treści → strona pokazuje pusty stan albo neutralny tekst domyślny, nigdy zmyślony fakt.

### `booking` — zasady rezerwacji
```json
{
  "enabled": true, "auto_confirm": false,
  "min_notice_hours": 12, "horizon_days": 28,
  "slot_step_minutes": 15, "buffer_minutes": 15,
  "timezone": "Europe/Warsaw"
}
```

## Publiczne

| Metoda | Ścieżka | Opis |
|---|---|---|
| GET | `/korki/public/site` | `{ offer, content, booking, reviews_summary: {count, average} }` — wszystko na start strony |
| GET | `/korki/public/slots?duration=60&from=YYYY-MM-DD&days=14` | `{ timezone, duration, enabled, days: [ { date, slots: ["…Z"] } ] }` (`days` 1–62, `from` domyślnie dziś; `duration` spoza `offer.durations` → 400) |
| POST | `/korki/public/bookings` | rezerwacja (niżej) → 201 |
| GET | `/korki/public/bookings/{token}` | podgląd własnej rezerwacji (link z maila) |
| POST | `/korki/public/bookings/{token}/cancel` | odwołanie przez ucznia (`{ reason? }`), idempotentne |
| GET | `/korki/public/bookings/{token}/ics` | plik kalendarza `text/calendar` |
| GET | `/korki/public/reviews?limit=&offset=` | zaakceptowane opinie, wyróżnione najpierw |
| POST | `/korki/public/reviews` | `{ author_name, author_label?, body (10–2000), rating? 1–5, email?, consent, website }` → `pending` (202 `{ ok, status: "pending" }`) |
| GET | `/korki/public/daily-task` | `{ id, date, title, body, hint, level_key }` (bez odpowiedzi i rozwiązania) albo `null` |
| POST | `/korki/public/daily-task/{id}/check` | `{ answer, reveal? }` → `{ correct, solution, answer }` — `solution` i `answer` są `null`, chyba że `correct` albo `reveal: true` |
| GET | `/korki/public/quiz` | `{ rows: [ { id, level_key, prompt, options[] } ], total }` bez poprawnych, poziomami w kolejności `offer.levels` |
| POST | `/korki/public/quiz/score` | `{ answers: [ { id, choice } ], seconds }` → wynik |
| POST | `/korki/public/contact` | `{ name, email, phone?, message (5–4000), consent, website }` → 202 `{ ok: true }` |

### POST `/korki/public/bookings`
```json
{
  "client_id": "uuid z przeglądarki (idempotencja)",
  "starts_at": "2026-10-23T13:00:00Z", "duration_minutes": 60,
  "level_key": "liceum", "subject_key": "matematyka", "mode": "online",
  "weekly_lessons": 1,
  "student_name": "…", "email": "…", "phone": "…", "message": "…",
  "consent": true, "website": ""
}
```
→ `201 { id, token, status: "pending"|"confirmed", starts_at, ends_at, duration_minutes, price_grosze }`.
Ten sam `client_id` → ta sama rezerwacja (200). Termin zajęty / poza dostępnością → **409**
`"Ten termin właśnie ktoś zajął — wybierz inny."`. Maile: uczeń (przyjęcie albo potwierdzenie),
Krzysztof (nowa rezerwacja).

Doprecyzowania serwera:
- `client_id`: 8–64 znaki `[A-Za-z0-9_-]` (UUID bez zmian przechodzi). `starts_at` musi mieć strefę.
- `duration_minutes` spoza `offer.durations`, `level_key` spoza aktywnych poziomów (gdy lista niepusta),
  `subject_key` spoza `offer.subjects` (gdy niepusta), `mode` spoza `offer.modes` (gdy niepusta) → **400**.
- `booking.enabled: false` → **409** `"Rezerwacje są chwilowo wyłączone."`.
- `price_grosze` = cena JEDNEJ lekcji po rabacie wynikającym z `duration × weekly_lessons`; `null`, gdy poziom nie ma ceny.
- `weekly_lessons` 1–7, `student_name` 2–120, `phone` ≤ 40 (cyfry, spacje, `+ - ( )`), `message` ≤ 4000.
- Pułapka wypełniona → 201 z udawanym rekordem (`id: 0`), nic nie zapisujemy i nie wysyłamy.

Rezerwacja (rekord): `{ id, token?, status, starts_at, ends_at, duration_minutes, level_key, subject_key,
mode, weekly_lessons, student_name, email, phone, message, price_grosze, created_at, confirmed_at,
cancelled_at, cancelled_by: "student"|"tutor"|null, tutor_note, version }` (panel dostaje też `cancel_reason`
i `reminder_sent_at`).
Statusy: `pending` → `confirmed` → `done` | `no_show`; `pending|confirmed` → `cancelled`. Inne przejście → 409.

Podgląd ucznia (`GET /public/bookings/{token}`, też odpowiedź `…/cancel`): rekord BEZ `token`, `email`, `phone`,
`message`, `tutor_note`, `cancel_reason`, `reminder_sent_at`, za to z `can_cancel: bool`. Odwołanie lekcji już
rozpoczętej albo `done`/`no_show` → 409; ponowne odwołanie odwołanej → 200 bez zmian. Odwołanie przez ucznia
wysyła mail do ucznia i do Krzysztofa. `.ics`: `UID:korki-{id}@{host KORKI_SITE_URL}`, czasy w UTC (`…Z`),
`SEQUENCE` = `version`, `STATUS` TENTATIVE/CONFIRMED/CANCELLED.

Przypomnienie 24 h: do `confirmed` z `reminder_sent_at = null`, raz. Potwierdzenie na mniej niż dobę przed
lekcją od razu ustawia `reminder_sent_at` (mail z potwierdzeniem jest wtedy przypomnieniem).

### POST `/korki/public/quiz/score`
→ `{ score, total, seconds, level_key_recommended, results: [ { id, correct, correct_index, explanation } ] }`.
Rekomendacja: najwyższy poziom, w którym trafność ≥ 60%, w kolejności poziomów z `offer.levels`
(poziomy pytań spoza oferty idą za nimi). Żaden nie osiąga 60% → najniższy poziom, na który padła odpowiedź;
`null` tylko bez żadnej odpowiedzi na istniejące pytanie. Powtórzone i nieznane `id` są pomijane;
`total` = liczba ocenionych odpowiedzi.

## Panel (Bearer)

| Metoda | Ścieżka | Opis |
|---|---|---|
| POST | `/korki/panel/login` | `{ login, password }` → `{ token, expires_at }` (limit 10/min, token 12 h; zmiana hasła na serwerze wylogowuje) |
| GET | `/korki/panel/me` | `{ login, email_configured, notify_email_configured }` |
| GET | `/korki/panel/overview` | `{ counts: { bookings_pending, bookings_upcoming, reviews_pending, messages_unread, tasks_active, quiz_active }, upcoming: [rezerwacja ×5], recent_bookings: [×5], recent_messages: [×5] }` |
| GET | `/korki/panel/bookings?status=&from=&to=&order=&limit=&offset=` | lista; `status` jeden albo kilka po przecinku, `from`/`to` daty (włącznie), `order` `asc`/`desc` (domyślnie `asc` z `from`, inaczej `desc`) |
| PATCH | `/korki/panel/bookings/{id}` | `{ status?, tutor_note?, cancel_reason?, version }` → mail do ucznia przy potwierdzeniu/odwołaniu (`cancel_reason` trafia do maila) |
| GET | `/korki/panel/settings/{key}` | `key ∈ offer, content, booking` → `{ key, value, version, updated_at }` |
| PUT | `/korki/panel/settings/{key}` | `{ value, version }` |
| GET | `/korki/panel/availability` | `{ rules: [ { id, weekday 0=pon, start: "16:00", end: "20:00" } ], time_off: [ { id, starts_on, ends_on, note } ] }` |
| PUT | `/korki/panel/availability` | ten sam kształt (bez `id`), zastępuje całość |
| GET | `/korki/panel/reviews?status=&limit=&offset=` | lista: `{ id, author_name, author_label, body, rating, email, status, featured, source: "form"|"manual", created_at, updated_at, approved_at, version }` |
| POST | `/korki/panel/reviews` | `{ author_name, author_label?, body, rating?, featured? }` ręczne dodanie (np. przepisana z grafiki) → 201 `approved` |
| PATCH | `/korki/panel/reviews/{id}` | `{ status?, featured?, author_name?, author_label?, body?, rating?, version }` |
| DELETE | `/korki/panel/reviews/{id}` | usunięcie → 204 |
| GET/POST | `/korki/panel/tasks` | zadania dnia (`title, body, hint, answer, solution, level_key, publish_on?, active`); rekord + `id, created_at, updated_at, version`; POST → 201 |
| PATCH/DELETE | `/korki/panel/tasks/{id}` | edycja (pola opcjonalne, `version` opcjonalne — gdy jest, musi się zgadzać) / usunięcie → 204 |
| GET/POST | `/korki/panel/quiz` | pytania quizu (`level_key, prompt, options[2..6], correct_index, explanation, sort, active`); POST → 201 |
| PATCH/DELETE | `/korki/panel/quiz/{id}` | edycja (jak zadania, `version` opcjonalne) / usunięcie → 204 |
| POST | `/korki/panel/starter-pack` | `{ kind: "quiz"|"tasks" }` → `{ kind, added, skipped, total }` — zestaw startowy z matematyki (12 pytań, 16 zadań; pomija duplikaty po `prompt`/`title`) |
| GET | `/korki/panel/messages?limit=&offset=` | `{ id, name, email, phone, message, read, read_at, created_at }`, najnowsze najpierw |
| PATCH | `/korki/panel/messages/{id}` | `{ read: bool }` → rekord |

Odpowiedź zadania dnia (`answer`): warianty rozdzielone `|` (np. `x=5|5`). Sprawdzanie: bez spacji, przecinek → kropka,
małe litery, minus typograficzny → `-`; liczby (także ułamek `a/b`) z tolerancją 1e-6. Dwie liczby w wyniku
rozdzielaj średnikiem (`-3;5`), bo przecinek jest separatorem dziesiętnym.

Limity tempa (per adres): rezerwacje 10/godz., opinie 5/godz., kontakt 5/godz., sprawdzanie zadania
i quiz 60/min, podgląd/odwołanie/ics po tokenie 60/min łącznie, logowanie 10/min. Przekroczenie → 429.

## Konfiguracja serwera (zmienne środowiskowe)

| Zmienna | Znaczenie |
|---|---|
| `KORKI_ADMIN_LOGIN` | login do panelu |
| `KORKI_ADMIN_PASSWORD_HASH` | bcrypt hasła (`python scripts/korki_admin_hash.py`) |
| `KORKI_NOTIFY_EMAIL` | skrzynka Krzysztofa na powiadomienia |
| `KORKI_SITE_URL` | adres strony do linków w mailach (np. `https://korkizkrzysztofem.pl`) |
| `KORKI_FROM_NAME` | nazwa nadawcy, domyślnie „Korki z Krzysztofem” |
| `BREVO_API_KEY`, `BREVO_FROM_EMAIL` | wspólne z Communio |

Bez `KORKI_ADMIN_*` logowanie do panelu oddaje 422 „Panel nie jest jeszcze skonfigurowany na serwerze”.
