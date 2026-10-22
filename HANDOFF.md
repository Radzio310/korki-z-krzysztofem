# HANDOFF — Korki z Krzysztofem (nowa strona)

Przekazanie pracy z sesji w chmurze do **lokalnej sesji Claude Code na komputerze Radka**.
Przeczytaj ten plik w całości, zanim cokolwiek zrobisz.

---

## 0. TL;DR dla nowej sesji

1. Folder roboczy to **`C:\Users\radek\Desktop\PROJECTS\KORKI_Z_KRZYSZTOFEM`**. Leży w nim
   **instrukcja i materiały** od właściciela (instrukcja „od Chata”, grafiki z opiniami, ewentualnie
   zdjęcia, teksty, stara wersja strony). Sesja w chmurze **nigdy ich nie widziała**.
2. Pobierz repo `https://github.com/Radzio310/korki-z-krzysztofem` (gałąź
   `claude/korki-krzysztofem-redesign-9xf0k4`) do tego folderu, **zachowując materiały** (procedura w §2).
3. Usuń z folderu stary stan (starą stronę, śmieci po poprzednich próbach), ale **nigdy instrukcji
   i materiałów**: one idą do `_materialy/`.
4. Przeczytaj instrukcję z `_materialy/`, porównaj ją z tym, co już jest zbudowane (§4–§6), i
   **dokończ całość** (§8). Nie zadawaj właścicielowi pytań: decyzje są w §3, resztę rozstrzygaj sam,
   bezpiecznie i odwracalnie.
5. Serwer to moduł `korki` w repo **Communio_serwer** (§6). Sprawdź jego stan, zanim zaczniesz.

---

## 1. Kontekst

Radek chce nowej wersji strony **Korki z Krzysztofem** (korepetycje; obecna strona:
`https://korkizkrzysztofem.pl`): „trzydzieści razy genialniej”, świetnie animowanej, żywej,
z ciekawym scrollowaniem, zaskakującej, z klikalnymi elementami na każdym kroku. Inspiracje to
**catchapp.com.pl**, **bazaapp.online**, style **Communio** i **BAZY**. Ma być zachwyt.

Maile i backend idą przez **serwer Communio** (`Communio_serwer`, FastAPI na Railway). Maile
wysyła Brevo, z tego samego konta co Communio i BAZA, pod osobną nazwą nadawcy.

### Dlaczego jest ten handoff

Sesja w chmurze nie miała dostępu do Twojego dysku ani do `korkizkrzysztofem.pl` (blokował go
proxy). Zbudowała więc **cały szkielet i wszystkie funkcje bez treści z instrukcji**: ceny,
teksty i opinie są edytowalne w panelu, a brak danych to pusty stan. Twoim zadaniem jest wlać
w to instrukcję i materiały i doprowadzić do końca.

---

## 2. Przygotowanie folderu (krok po kroku, Windows / PowerShell)

> Zasada nadrzędna: **niczego z materiałów nie kasujesz**. Najpierw przenosisz, potem klonujesz.

```powershell
cd C:\Users\radek\Desktop\PROJECTS\KORKI_Z_KRZYSZTOFEM

# 1) obejrzyj, co tu jest
Get-ChildItem -Force

# 2) wszystko, co jest instrukcją albo materiałem (md/txt/docx/pdf, grafiki, zdjęcia, teksty), przenieś do _materialy\
New-Item -ItemType Directory -Force _materialy | Out-Null
#    przenoś ręcznie, plik po pliku albo folder po folderze, np.:
#    Move-Item .\INSTRUKCJA.md .\_materialy\
#    Move-Item .\grafiki .\_materialy\

# 3) stary kod strony (jeśli jest: index.html, css, js, node_modules, stare repo .git) przenieś do _stare\
#    i NIE usuwaj go od razu, tylko po skończonej pracy i za zgodą w PR
New-Item -ItemType Directory -Force _stare | Out-Null

# 4) w pustym już (poza _materialy i _stare) folderze podepnij repo
git init
git remote add origin https://github.com/Radzio310/korki-z-krzysztofem.git
git fetch origin
git checkout -b claude/korki-krzysztofem-redesign-9xf0k4 origin/claude/korki-krzysztofem-redesign-9xf0k4

# 5) _materialy i _stare nie trafiają do repo bez decyzji: dopisz je do .git/info/exclude
Add-Content .git\info\exclude "_stare/"
#    _materialy/ dodaj do repo TYLKO jeśli to nie są dane wrażliwe (np. grafiki opinii mogą zostać
#    w repo jako źródło; prywatne dane kontaktowe uczniów nie)

npm install
npm run build
```

Jeśli `git checkout` zgłosi konflikt z istniejącym plikiem, to znaczy, że coś zostało poza
`_materialy` i `_stare`. Przenieś to i powtórz.

**Gdy gałąź jest już scalona do `main`** (sprawdź na GitHubie), pracuj na `main` albo utwórz nową
gałąź od `main`.

---

## 3. Decyzje właściciela (zebrane w kwestionariuszu, obowiązują)

| Temat | Decyzja |
|---|---|
| Repo | nowe repo `Radzio310/korki-z-krzysztofem` |
| Technologia | **Next.js** (App Router), wersja 16 |
| Animacje | **GSAP + ScrollTrigger + Lenis** |
| Hosting | **Vercel** |
| Motyw | **ciemny domyślnie + równorzędny jasny**, z przełącznikiem |
| Kolory | **„niebieski genialny morski”, jak na starej stronie, ale genialnie ulepszony.** Paletę wyprowadź ze starej strony `korkizkrzysztofem.pl` (sesja w chmurze nie miała dostępu, więc paleta „morska głębia” w `app/globals.css` jest jej propozycją do korekty) |
| Efekt startowy | **żywa tablica**: zadanie rozwiązuje się przy przewijaniu, tytuł składa się z kredy |
| Postać | **zdjęcia Krzysztofa + maskotka** (zrobiona: Pi, ośmiornica w okularach z kredą) |
| Zapisy | **kalendarz wolnych terminów**: Krzysztof ustawia dostępność, uczeń klika slot, maile z potwierdzeniem i przypomnieniem |
| Kalkulator | **poziom (podstawówka, liceum, matura rozszerzona itd.) × godziny tygodniowo**, z przelicznikiem na 45, 60, 90, 120 min itd. |
| Interakcje | quiz poziomu 60 s, zadanie dnia, klikana oś współpracy, kalkulator |
| Panel | **na stronie, login i hasło ustawiane na serwerze**, tam całe zarządzanie |
| Konto ucznia | **brak** (uczeń działa przez maile i link z tokenem) |
| Opinie | **prawdziwe + formularz**: opinie **przepisz z grafik** z materiałów, nowe przez formularz z akceptacją w panelu |
| Ceny i pakiety | **konfigurowalne w panelu** |
| Treści | z instrukcji w folderze, braki uzupełnij ze strony `korkizkrzysztofem.pl` |
| Antyspam | pole-pułapka + limit zapytań |
| Wdrożenie serwera | **scalaj z `main` sam** (Railway wdraża z `main`), potem sprawdź `/health` po ok. 5 min |
| Styl pracy | bez pytań do właściciela, do samego końca, w każdej funkcji przebijaj samego siebie |

---

## 4. Co jest zbudowane (front, to repo)

**Stos:** Next.js 16.4 (Turbopack), React 19.2, TypeScript, GSAP 3.15 (+ScrollTrigger), Lenis 1.3,
fonty z `@fontsource` (Bricolage Grotesque Variable z osiami wght/wdth, Manrope, Caveat dla kredy).
Bez Tailwinda: zwykły CSS z tokenami. `npm run build` i `npx tsc --noEmit` przechodzą.

> Uwaga: Next 16 ma zmiany łamiące (asynchroniczne `params`, `proxy` zamiast `middleware`,
> Turbopack domyślnie). Przy wątpliwościach czytaj `node_modules/next/dist/docs/`.

### Mapa plików

```
app/
  layout.tsx            fonty, metadata, skrypt motywu przed malowaniem (bez mignięcia)
  globals.css           TOKENY (kolory, ruch, typografia, odstępy) + klocki: .btn .card .chip .input .check
  page.tsx              strona główna (SSR z /korki/public/site, revalidate 60 s, JSON-LD)
  panel/page.tsx        panel Krzysztofa (klient)
  rezerwacja/[token]/   podgląd i odwołanie rezerwacji z linku w mailu
  polityka-prywatnosci/ polityka (opisuje tylko to, co strona naprawdę robi; dane administratora do uzupełnienia)
  opengraph-image.tsx   karta do udostępniania; icon.svg; not-found.tsx
components/
  Landing.tsx           składa sekcje; scala ustawienia z panelu z domyślnymi
  SmoothScroll.tsx      Lenis napędzany tickerem GSAP + kotwice
  Nav.tsx               szklana pigułka, pierścień postępu wokół logo, płynąca pigułka aktywnej sekcji, menu rozlewające się kołem
  ThemeToggle.tsx       zmiana motywu kołem z miejsca kliknięcia (View Transitions)
  Mascot.tsx            Pi: oczy za kursorem, mruganie, nastroje idle/happy/think/wow/wave/sad, dymek
  PiDock.tsx            Pi w rogu: podpowiedź raz na sekcję + skróty (rezerwacja, quiz, cennik, kontakt)
  Cursor.tsx            kursor-kreda (tylko precyzyjny wskaźnik)
  Footer.tsx            żywe fale (klik = kręgi na wodzie), wielki napis
  hero/                 Hero (scena przypięta do scrolla), Chalkboard (kreda, parabola, rysowanie palcem/myszką, gąbka), KineticTitle (litery „oddychają” pod kursorem)
  sections/             Marquee, About, Timeline, Quiz, Pricing, DailyTask, Reviews, Booking, Contact (+ pliki .css)
  ui/                   Sheet (arkusz), Stars, RollingNumber (cyfry jak bębny)
  panel/                PanelApp (logowanie, powłoka, tosty), ui.tsx (sesja, useLoad, useSettingsDoc, Toggle, SaveBar…), views/*
lib/
  api.ts                klient API (publiczny + błędy po polsku, walidacja FastAPI → zdanie)
  types.ts              JEDYNE typy API (zgodne z docs/KONTRAKT_API.md)
  pricing.ts            ta sama reguła ceny co serwer (cena za długość albo proporcja z 60 min)
  time.ts               strefa Europe/Warsaw, formatowanie
  motion.ts             GSAP, Lenis, useReveal, ripple, useMagnet, kanał „handoff” między sekcjami
docs/KONTRAKT_API.md    kontrakt API strona ↔ serwer (źródło prawdy)
```

### Przepływ (ciągłość między sekcjami)

Wynik quizu → przycisk „Zobacz cenę dla tego poziomu” ustawia poziom w kalkulatorze (rozbłysk
karty) → „Zarezerwuj ten wariant” przenosi poziom, długość i liczbę spotkań do rezerwacji i od
razu otwiera krok 2 (termin). Mechanizm: `emitHandoff` / `useHandoff` w `lib/motion.ts`.

### Zasady, których pilnuje kod

- **Zero zmyślonych danych.** Domyślne teksty są neutralne. Ceny, opis, zdjęcie, kontakt i opinie
  pochodzą wyłącznie z panelu. Brak danych to pusty stan z Pi i prawdziwą akcją.
- Pi mówi w 1. osobie, jednym zdaniem. Reszta interfejsu jest bezosobowa.
- Kolory tylko z tokenów `app/globals.css`. Wyjątki: SVG maskotki i logo oraz karta OG.
- Każda animacja ma wariant `prefers-reduced-motion` (bez przypinania, wszystko od razu widoczne).
- Bez natywnych `alert/confirm`: potwierdzenia to dwuklik „Na pewno?” albo arkusz.

---

## 5. Panel (`/panel`)

Logowanie: `POST /korki/panel/login`, token Bearer (12 h) w `localStorage` (`kk-panel`).
Zakładki: Pulpit (liczniki + lista „na start”), Rezerwacje, Dostępność (okna tygodniowe, wolne,
zasady rezerwacji), Oferta i ceny (przedmioty, długości, poziomy z cenami, rabaty), Treści strony
(nagłówek, „O mnie”, zdjęcie przez URL, liczby, kontakt, kroki, FAQ), Opinie (akceptacja +
ręczne przepisywanie z grafik), Zadania dnia, Quiz (oba z przyciskiem „zestaw startowy z
matematyki”), Wiadomości.

Ustawienia `offer`/`content`/`booking` są dokumentami JSON z `version`: zapis z nieaktualną
wersją dostaje 409, a panel się odświeża.

---

## 6. Serwer: moduł `korki` w Communio_serwer

- Repo: `https://github.com/Radzio310/Communio_serwer`. Lokalnie zwykle
  `C:\Users\radek\Desktop\PROJECTS\Communio_serwer` (sprawdź). **Przeczytaj jego `CLAUDE.md`.**
- Praca sesji w chmurze leży na gałęzi **`claude/korki-krzysztofem-redesign-9xf0k4`** tego repo
  (commit `1c9ef37`, wypchnięty, **niescalony** do `main`). Stan bramek przy oddaniu: 102 nowe testy
  `test_korki_*` zielone, `test_authz_coverage` i `test_migrations` zielone, jedna głowa Alembic
  `a5c7e9b1d3f8` (down: `c2a4e6f8b0d1`). W pełnym `pytest` 8 porażek **przedistniejących**, nie
  od modułu: `test_ai_costs::test_kazde_narzedzie_modelu_ma_swoja_funkcje`, 5× `test_people.py`
  (SQLite parser stack overflow), `test_group_cover.py::test_zywiol_…`, oraz niestabilny
  `test_song_import_save.py::test_kilka_spiewnikow_…` (przecieka stan innego testu).
- Odstępstwa od pierwotnego kontraktu są wpisane w `docs/KONTRAKT_API.md` (m.in. błędy walidacji
  jako 400 ze zdaniem po polsku, `offer.modes` domyślnie puste, `price_grosze` po rabacie pakietu,
  podgląd ucznia z `can_cancel`, limit per IP z ostatniego wpisu `X-Forwarded-For`).
  Najpierw sprawdź, czy gałąź istnieje i czy jest już scalona do `main`:
  ```bash
  git fetch origin
  git log --oneline origin/main | head          # czy jest commit z modułem korki?
  git log --oneline origin/claude/korki-krzysztofem-redesign-9xf0k4 | head
  ```
  Jeśli gałąź nie jest scalona: przejrzyj ją, odpal bramki (niżej) i scal do `main` (zgoda
  właściciela w §3). Jeśli gałęzi nie ma, moduł trzeba zbudować od nowa według
  `docs/KONTRAKT_API.md` (w tym repo); opis budowy jest w §6.2.

### 6.1 Co zawiera moduł

```
app/korki_*.py            settings (domyślne dokumenty, walidacja), slots (wolne terminy w Europe/Warsaw),
                          bookings, pricing, mail (szablony HTML+tekst, Brevo), reminders (24 h przed),
                          daily (zadanie dnia + sprawdzanie), quiz (wynik + rekomendacja), starter (zestaw
                          startowy z matematyki), ics, auth (login panelu, osobny JWT), schemas, api
routers/korki_public.py   /korki/public/*  (site, slots, bookings, reviews, daily-task, quiz, contact)
routers/korki_panel.py    /korki/panel/*   (login, me, overview, bookings, settings, availability, reviews, tasks, quiz, starter-pack, messages)
migrations/versions/a5c7e9b1d3f8_korki_z_krzysztofem.py   tabele korki_*
scripts/korki_admin_hash.py                               hash hasła do panelu
tests/test_korki_*.py                                     testy (sloty, rezerwacje, panel, zadania/quiz, starter)
app/mailer.py             + opcjonalne `from_name` w OutgoingEmail (wstecznie zgodne)
app/scheduler.py          + krok przypomnień
tests/test_authz_coverage.py  + bramka dziedzinowa "korki" i publiczne zapisy z powodami
```

### 6.2 Zasady serwera (z CLAUDE.md Communio_serwer, skrót)

- Każda zmiana schematu przez migrację Alembic, **jedna głowa**. Python **3.10** na produkcji.
- Identyfikatory w bazie po angielsku, `snake_case`. Polskie napisy wybiera klient.
- Każdy zapis ma deklarację w `tests/test_authz_coverage.py` (bramka `korki` albo powód w
  `ZAPISY_BEZ_ZDOLNOSCI`).
- Nowa funkcja → wpis w `app/data/funkcje.md`.
- Bramki: `python -m pytest`, `alembic upgrade head` na czystej bazie, `python -c "import main"`.
  Na bazie (przed modułem) jeden test już padał: `tests/test_ai_costs.py::test_kazde_narzedzie_modelu_ma_swoja_funkcje`
  (nie nasz).
- Push do `main` = wdrożenie na Railway; po ok. 5 min sprawdź `GET /health` (200).

### 6.3 Zmienne na Railway (serwis Communio)

| Zmienna | Wartość |
|---|---|
| `KORKI_ADMIN_LOGIN` | login Krzysztofa |
| `KORKI_ADMIN_PASSWORD_HASH` | `python scripts/korki_admin_hash.py` → wklej wynik |
| `KORKI_NOTIFY_EMAIL` | skrzynka Krzysztofa |
| `KORKI_SITE_URL` | `https://korkizkrzysztofem.pl` |
| `KORKI_FROM_NAME` | opcjonalnie (domyślnie „Korki z Krzysztofem”) |
| `CORS_ORIGINS` | jeśli ustawione, dopisz domenę strony (i adres podglądu Vercel) |

Adres API produkcji: `https://communioserwer-production.up.railway.app` (wpisany jako domyślny
w `lib/api.ts`, nadpisywany przez `NEXT_PUBLIC_KORKI_API`).

---

## 7. Przegląd wizualny (zrzuty z sesji w chmurze)

Działa i wygląda dobrze: nagłówek z tablicą (kreda pisze kroki, parabola się rysuje), kinetyczny
tytuł, taśma tematów, „O mnie” z monogramem fali (gdy brak zdjęcia), przypięta pozioma oś
współpracy z animowanymi scenkami, start quizu, jasny motyw z białą tablicą i markerem.

Poprawione po przeglądzie: kropki pierwiastków na osi, kursor w rogu przed ruchem myszy, za dużo
Pi naraz w zadaniu dnia, dymek Pi zasłaniający tablicę na telefonie.

**Do sprawdzenia lokalnie z prawdziwym serwerem** (w chmurze API było niedostępne, więc
oglądane były tylko puste stany): quiz w trakcie i scena wyniku, kalkulator z cenami, zadanie
dnia z konfetti, taśma opinii, krok 2 rezerwacji z dniami i godzinami, bilet po rezerwacji,
strona `/rezerwacja/[token]`, wszystkie zakładki panelu.

---

## 8. Do zrobienia (kolejność)

1. **§2:** folder, repo, `npm install`, `npm run build`.
2. **Przeczytaj instrukcję z `_materialy/`** i wypisz różnice względem §4–§5 (sekcje, teksty,
   funkcje, styl). Instrukcja wygrywa z obecnym stanem, a §3 wygrywa z instrukcją tylko tam, gdzie
   właściciel zdecydował inaczej później (kwestionariusz był po napisaniu instrukcji).
3. **Kolory ze starej strony:** otwórz `https://korkizkrzysztofem.pl`, wyciągnij paletę i fonty,
   „genialnie ulepsz” i przepisz tokeny w `app/globals.css` (`--sea-*`, `--ocean-*`, `--accent*`
   w obu motywach, plus kolory tablicy). Zachowaj kontrast AA w obu motywach.
4. **Treści:** przenieś teksty z instrukcji i starej strony do dokumentu `content` i `offer`
   (przez panel albo seedem przez API panelu; **nie** wpisuj ich na sztywno w komponenty, chyba że
   instrukcja każe). Ceny i pakiety wpisz tylko, jeśli są w materiałach albo na starej stronie.
5. **Opinie z grafik:** przepisz słowo w słowo (imię/podpis, treść, ocena jeśli jest) przez
   `POST /korki/panel/reviews` (pojawiają się od razu jako opublikowane). Grafiki mogą też trafić
   na stronę jako dowód (np. kliknięcie opinii otwiera oryginał), jeśli instrukcja tego chce.
6. **Zdjęcia Krzysztofa:** jeśli są w materiałach, umieść w `public/` (zoptymalizuj, WebP) i ustaw
   `photo_url` (np. `/krzysztof.webp`). Rozważ zdjęcie także w scenie nagłówka.
7. **Serwer (§6):** scal moduł do `main`, ustaw zmienne na Railway, sprawdź `/health` i
   `GET /korki/public/site`. W panelu: zestawy startowe quizu i zadań (albo własne z instrukcji),
   dostępność, oferta.
8. **Test od końca do końca lokalnie:** serwer `uvicorn main:app --port 8000` (SQLite), strona z
   `NEXT_PUBLIC_KORKI_API=http://localhost:8000`. Przejdź: rezerwacja → mail (przy braku Brevo
   lokalnie maile się logują/pomijają) → panel potwierdza → `/rezerwacja/[token]` → odwołanie.
   Zrób zrzuty (Playwright) desktop + telefon, oba motywy, każda sekcja z danymi.
9. **Przebij samego siebie** tam, gdzie instrukcja chce więcej: np. przejście sekcji „obiekt w
   obiekt” (tablica z nagłówka zamienia się w kartę zadania dnia), mikrodźwięki kredy (wyłączone
   domyślnie), wykres postępu ucznia, galeria grafik opinii. Każdy nowy ruch z wariantem
   ograniczonego ruchu.
10. **Wdrożenie:** Vercel (zmienne z README), domena `korkizkrzysztofem.pl` dopiero po akceptacji
    właściciela (stara strona żyje do tego czasu; podgląd na adresie Vercel).
11. Uzupełnij `polityka-prywatnosci` (administrator: imię i nazwisko, e-mail) z materiałów.
12. Commity po polsku, push na gałąź, PR do `main` z opisem ryzyk.

## 9. Pułapki

- Pliki z polskimi znakami edytuj narzędziami Write/Edit. Heredoc w Bashu i `Set-Content`
  w PowerShellu psują kodowanie.
- `localStorage` zawsze w `try/catch` (tryb prywatny).
- ScrollTrigger: po zmianie wysokości treści (np. wczytane opinie) może być potrzebne
  `ScrollTrigger.refresh()`. Przypięte sekcje: Hero i Timeline (tylko ≥ 900 px).
- Lenis jest zatrzymywany przy otwartym arkuszu i menu (`getLenis()?.stop()`); nowe nakładki
  muszą robić to samo.
- Kalkulator i serwer liczą cenę tą samą regułą (`lib/pricing.ts` ↔ `app/korki_pricing.py`).
  Zmieniasz jedno, zmieniasz oba.
- Klucze poziomów (`level_key`) łączą ofertę, quiz i zadania. Zestaw startowy używa:
  `podstawowka`, `liceum`, `matura_rozszerzona`. Najprościej nazwać poziomy w ofercie tymi
  kluczami albo przepiąć pytania w panelu.
