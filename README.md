# Korki z Krzysztofem

Strona korepetycji: żywa tablica w nagłówku, quiz poziomu w 60 sekund, kalkulator pakietu,
zadanie dnia, opinie, rezerwacja terminów z mailami i panel do zarządzania wszystkim.

- **Front:** Next.js 16 (App Router), React 19, GSAP + ScrollTrigger, Lenis. Ten katalog.
- **Serwer:** moduł `korki` w [`Radzio310/Communio_serwer`](https://github.com/Radzio310/Communio_serwer)
  (FastAPI, ścieżki `/korki/*`). Maile idą przez Brevo, z tego samego konta co Communio.
- **Kontrakt API:** [`docs/KONTRAKT_API.md`](docs/KONTRAKT_API.md), wspólne źródło prawdy dla obu stron.

## Uruchomienie lokalnie

```bash
npm install
cp .env.example .env.local   # adres serwera i strony
npm run dev                  # http://localhost:3000
npm run typecheck
npm run build
```

`NEXT_PUBLIC_KORKI_API` wskazuje serwer Communio. Lokalnie odpal serwer
(`uvicorn main:app --port 8000` w `Communio_serwer`) i ustaw `NEXT_PUBLIC_KORKI_API=http://localhost:8000`.

## Wdrożenie (Vercel)

1. Import repo w Vercel (framework: Next.js, bez zmian w ustawieniach builda).
2. Zmienne środowiskowe:
   - `NEXT_PUBLIC_KORKI_API=https://communioserwer-production.up.railway.app`
   - `NEXT_PUBLIC_SITE_URL=https://korkizkrzysztofem.pl`
3. Domena `korkizkrzysztofem.pl` → Vercel (rekordy DNS z panelu Vercel).

Na serwerze Communio (Railway) ustaw:

| Zmienna | Co to |
|---|---|
| `KORKI_ADMIN_LOGIN` | login do `/panel` |
| `KORKI_ADMIN_PASSWORD_HASH` | hash hasła: `python scripts/korki_admin_hash.py` w repo serwera |
| `KORKI_NOTIFY_EMAIL` | skrzynka Krzysztofa na powiadomienia o rezerwacjach i wiadomościach |
| `KORKI_SITE_URL` | `https://korkizkrzysztofem.pl` (linki w mailach) |
| `KORKI_FROM_NAME` | opcjonalnie, domyślnie „Korki z Krzysztofem” |
| `CORS_ORIGINS` | jeśli jest ustawione, dopisz `https://korkizkrzysztofem.pl` |

## Panel (`/panel`)

Logowanie loginem i hasłem z serwera. Zakładki:

- **Pulpit:** liczniki, najbliższe lekcje i lista „na start”, która prowadzi do brakujących ustawień.
- **Rezerwacje:** potwierdzanie, odwoływanie (mail do ucznia), notatka dla ucznia, odbyta / nieobecność.
- **Dostępność:** okna godzinowe w tygodniu, wolne i urlopy, zasady (wyprzedzenie, horyzont, przerwy, autopotwierdzanie).
- **Oferta i ceny:** przedmioty, długości lekcji, poziomy z cenami za każdą długość, rabaty za pakiet.
- **Treści strony:** nagłówek, „O mnie”, zdjęcie, liczby, kontakt, kroki współpracy, FAQ.
- **Opinie:** akceptacja opinii z formularza i ręczne przepisywanie (np. z grafik).
- **Zadania dnia / Quiz:** własne zadania i pytania albo zestaw startowy z matematyki jednym kliknięciem.
- **Wiadomości:** formularz kontaktowy.

## Zasady

- Zero zmyślonych danych: ceny, opis, zdjęcie, opinie i kontakt pochodzą z panelu. Gdy ich brak,
  strona pokazuje pusty stan z Pi i prawdziwą akcją.
- Pi (ośmiornica w okularach) mówi w 1. osobie, jednym zdaniem. Reszta interfejsu jest bezosobowa.
- Kolory, odstępy i ruch tylko z tokenów (`app/globals.css`). Każda animacja ma wariant
  `prefers-reduced-motion`.
