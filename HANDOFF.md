# HANDOFF — Korki z Krzysztofem (23.10.2026)

Poprzedni handoff z chmury jest w historii gita (commit 98121fe). Decyzje właściciela: pamięć `korki-decyzje-runda2`.

## Zrobione
- **Strona** (gałąź `claude/korki-krzysztofem-redesign-9xf0k4`, PR #2 do `main`): commity 4291c5c (treści, paleta, SEO, formularz), 939b1de (runda 2: Mini-Krzysztof, czat zapisu, tablica, opinie „Wielki głos”), f45b4f1 (płynność, noindex), vercel.json.
- **Podgląd:** https://korki-z-krzysztofem.vercel.app (projekt Vercel `korki-z-krzysztofem`; zmienne: `NEXT_PUBLIC_KORKI_API`, `NEXT_PUBLIC_SITE_URL`, `KORKI_NOINDEX=1`).
- **Serwer:** moduł `korki` w Communio_serwer, `main` = c7e690c (+ maile z marką 4097c03), Railway działa, `/health` 200. Wersja z chmury zachowana na gałęzi `claude/korki-chmura-1c9ef37`. Worktree: `PROJECTS\COMMUNIO\srv-korki`.
- **Railway (Communio_serwer):** `KORKI_ADMIN_LOGIN`, `KORKI_ADMIN_PASSWORD_HASH`, `KORKI_SITE_URL=https://korki-z-krzysztofem.vercel.app`. Hasło panelu: `_materialy\PANEL-DOSTEP.txt` (poza repo).
- **Produkcja:** 9 opinii z grafik (migracja), zestaw startowy quizu (12) i zadań dnia (16).
- **Materiały:** `_materialy\` (instrukcja, grafiki, zip, `opinie-z-grafik.json` — dosłowna transkrypcja). Wyłączone z gita przez `.git/info/exclude`.

## Otwarte
1. `KORKI_NOTIFY_EMAIL` (skrzynka Krzysztofa) — brak adresu, ustawić na Railway.
2. Dostępność terminów w panelu → Dostępność (Krzysztof); bez niej czat oferuje tylko zapytanie.
3. ~~Test dostawy maila~~ — zrobiony 23.10: rezerwacja testowa (id 1, odwołana) → „Rezerwacja przyjęta” i „Odwołanie lekcji przyjęte” w skrzynce odbiorczej Gmaila w ~30 s, link prowadzi na stronę Vercela. Od 23.10 nadawca `korki@catchapp.com.pl` (Railway `KORKI_FROM_EMAIL`, serwer bdf1c6d) — sprawdzone rezerwacją testową id 2 (odwołana), oba maile w skrzynce odbiorczej.
4. Przełączenie domeny (instrukcja §14): Vercel → Domains, rekordy WWW w Hostingerze bez ruszania MX/SPF/DKIM; potem usunąć `KORKI_NOINDEX`, zmienić `KORKI_SITE_URL` na `https://korkizkrzysztofem.pl`.
5. Płynność na słabym sprzęcie: przy CPU 4× ~25–32 kl./s; dalszy zysk = mniej warstw kompozytora.
6. Lighthouse i a11y (instrukcja §13/§17) — nie mierzone.
7. Polityka prywatności: okres przechowywania (`RETENTION_MONTHS` w `app/polityka-prywatnosci/page.tsx`).

## Decyzje właściciela (22.10)
Mini-Krzysztof zamiast ośmiornicy; opinie „Wielki głos”; zapytanie + rezerwacja jednym czatem jak catchapp.com.pl; quiz/zadanie/plan na tablicy; zero animacji szerokości liter; bez typowych siatek kafelków; menu mobilne w prawym rogu.

## Do sprawdzenia na telefonie
Płynność całego przewijania; czat: kalendarz i pola z klawiaturą (iOS); wachlarz kanałów „+”; linijka długości lekcji kciukiem; przeciąganie opinii; dok Mini-Krzysztofa nie zasłania treści; żywy środek paska nawigacji na 360 px.

## Lokalnie
Serwer: `scratchpad\serwer.ps1` (SQLite, :8000, login `krzysztof` / `haslo-lokalne-1`); strona: `.env.local` z `NEXT_PUBLIC_KORKI_API=http://127.0.0.1:8000`, `npm run dev`.
