# Podpięcie domeny korkizkrzysztofem.pl z Hostingera do Vercela

Instrukcja dla agenta (Chat) i właściciela. Stan na 03.11.2026.

## 0. Najważniejsze, zanim zaczniesz

- **Domena zostaje zarejestrowana w Hostingerze.** Nie robimy transferu rejestracji ani nie zmieniamy serwerów nazw (nameserverów). Zmieniamy tylko **4 rekordy DNS strony WWW** w strefie DNS Hostingera.
- **Poczta zostaje na Hostingerze.** NIE ruszaj rekordów `MX`, `TXT` (SPF `v=spf1 include:_spf.mail.hostinger.com ~all`), DKIM (`hostingermail-*._domainkey`, CNAME/TXT), `_dmarc`, `autodiscover`, `autoconfig` ani żadnych innych rekordów niż wymienione w kroku 3.
- **Vercel jest już przygotowany:** projekt `korki-z-krzysztofem` (zespół `radeks-projects-2ddf8251`) ma dodane domeny `korkizkrzysztofem.pl` i `www.korkizkrzysztofem.pl`, własność jest potwierdzona (rekord TXT weryfikacji nie jest potrzebny). Brakuje tylko DNS.
- Nowa strona już działa pod https://korki-z-krzysztofem.vercel.app. Stara (WordPress) działa pod domeną do chwili zmiany DNS.
- Nie wpisuj adresów IP z pamięci ani z innych poradników — użyj dokładnie wartości z kroku 3 (podał je Vercel dla tego projektu).

## 1. Kopia zapasowa (5 minut, obowiązkowo)

1. hPanel Hostingera → **Domeny** → `korkizkrzysztofem.pl` → **DNS / Serwery nazw** → **Rekordy DNS**.
2. Zrób zrzut ekranu całej listy rekordów (przewiń do końca) albo użyj „Eksportuj”, jeśli jest dostępne. To jest plan powrotu.
3. Dla porządku: obecne rekordy strony (odczyt 03.11.2026):
   - `@` A → `77.37.53.6`, `91.108.98.201` (Hostinger, mogą się różnić — liczy się to, co widzisz w hPanelu)
   - `@` AAAA → `2a02:4780:32:546f:c7f7:4eb8:7175:91f3`, `2a02:4780:23:77a2:7186:4ef5:8b32:f68d`
   - `www` CNAME → `www.korkizkrzysztofem.pl.cdn.hstgr.net`
   - `MX` → `mx1.hostinger.com` (5), `mx2.hostinger.com` (10) — zostają
4. Kopii plików i bazy WordPressa nie trzeba do samej zmiany DNS, ale jeśli hosting ma wygasnąć (11.11.2026), zrób ją teraz w hPanelu → Strony → Kopie zapasowe.

## 2. Wyłącz CDN Hostingera dla tej strony

hPanel → **Strony** → korkizkrzysztofem.pl → **Wydajność** (Performance) → **CDN** → wyłącz.
Powód: CDN Hostingera utrzymuje rekord `www` → `…cdn.hstgr.net` i może go odtworzyć po zmianie.

## 3. Zmień rekordy DNS (hPanel → Domeny → korkizkrzysztofem.pl → Rekordy DNS)

Usuń (tylko te):

| Typ | Nazwa | Wartość |
|---|---|---|
| A | `@` | każdy istniejący rekord A dla `@` (adresy Hostingera) |
| AAAA | `@` | **oba** rekordy AAAA (`2a02:4780:…`) — inaczej część odwiedzających (IPv6) zostanie na starej stronie |
| CNAME | `www` | `www.korkizkrzysztofem.pl.cdn.hstgr.net` |
| A / AAAA | `www` | jeśli istnieją |

Dodaj:

| Typ | Nazwa | Wartość | TTL |
|---|---|---|---|
| A | `@` | `216.150.1.1` | 300 (albo najniższy dostępny) |
| A | `@` | `216.150.16.1` | 300 |
| CNAME | `www` | `cf8df772a0f0b35b.vercel-dns-016.com` | 300 |

Uwagi:
- Jeśli hPanel nie pozwala dodać dwóch rekordów A dla `@`, wystarczy jeden: `216.150.1.1`. Wartość zapasowa podana przez Vercel to `76.76.21.21`.
- W polu CNAME wpisz wartość bez kropki na końcu, jeśli hPanel jej nie akceptuje.
- Nie dodawaj żadnych rekordów AAAA dla Vercela.

## 4. Przekierowanie www → bez www (w Vercelu)

Vercel → projekt **korki-z-krzysztofem** → **Settings → Domains** → przy `www.korkizkrzysztofem.pl` → **Edit** → „Redirect to” `korkizkrzysztofem.pl`, kod **308 (Permanent)** → Save.
Domeną główną (kanoniczną) ma być `https://korkizkrzysztofem.pl` (bez www) — tak jest ustawione w kodzie strony (canonical, sitemap).

## 5. Poczekaj i sprawdź (zwykle 5–30 minut, maks. kilka godzin)

1. Vercel → Settings → Domains: obie domeny mają mieć zielony status „Valid Configuration”. Certyfikat HTTPS Vercel wystawi sam.
2. Z terminala (opcjonalnie):
   ```
   nslookup korkizkrzysztofem.pl 8.8.8.8          → 216.150.1.1 / 216.150.16.1, brak adresów 2a02:4780
   nslookup -type=CNAME www.korkizkrzysztofem.pl 8.8.8.8   → cf8df772a0f0b35b.vercel-dns-016.com
   nslookup -type=MX korkizkrzysztofem.pl 8.8.8.8 → nadal mx1/mx2.hostinger.com
   vercel domains verify korkizkrzysztofem.pl     → status ok
   ```
3. W przeglądarce (okno prywatne): `https://korkizkrzysztofem.pl` pokazuje nową stronę; `http://` i `https://www.` przekierowują na `https://korkizkrzysztofem.pl`.
4. Wyślij testowego maila na skrzynkę w domenie (jeśli jest używana) — poczta ma działać jak wcześniej.

## 6. Po przełączeniu — 3 zmiany konfiguracji (robi Radek albo Claude)

1. **Vercel → Settings → Environment Variables:** usuń `KORKI_NOINDEX` (Production). Bez tego strona ma `noindex` i nie trafi do Google.
2. **Railway → projekt Communio → serwis Communio_serwer → Variables:** `KORKI_SITE_URL` = `https://korkizkrzysztofem.pl` (linki w mailach i logo w mailach prowadzą wtedy na domenę).
3. **Vercel → Deployments → ostatnie wdrożenie Production → Redeploy** (zmiana zmiennej wymaga nowego wdrożenia).

Potem sprawdź: `https://korkizkrzysztofem.pl/robots.txt` ma `Allow: /` i link do sitemap; panel `https://korkizkrzysztofem.pl/panel` działa (login bez zmian).

## 7. Google Search Console (po przełączeniu)

Zachowaj istniejącą weryfikację domeny (rekord TXT `google-site-verification`, jeśli jest w DNS — nie usuwaj). Zgłoś nową mapę: `https://korkizkrzysztofem.pl/sitemap.xml`. Stare adresy WordPressa (`/hello-world/`, `/category/…`) zwracają teraz 404 — to zamierzone.

## 8. Plan powrotu (gdyby coś poszło źle)

W hPanelu przywróć rekordy z kroku 1: usuń dwa A `216.150.…` i CNAME `www → …vercel-dns-016.com`, dodaj z powrotem A/AAAA Hostingera i CNAME `www → www.korkizkrzysztofem.pl.cdn.hstgr.net`, włącz CDN. Stary WordPress działa, dopóki trwa hosting (do 11.11.2026) — dlatego nie wyłączaj hostingu przed sprawdzeniem nowej strony.

## Czego NIE robić

- Nie zmieniaj nameserverów na `ns1/ns2.vercel-dns.com` — wtedy trzeba by odtworzyć w Vercelu całą pocztę (MX, SPF, DKIM).
- Nie usuwaj rekordów MX, SPF, DKIM, DMARC ani TXT weryfikacyjnych.
- Nie anuluj domeny w Hostingerze — wygaśnięcie hostingu nie oznacza wygaśnięcia domeny, ale sprawdź w hPanelu datę ważności domeny i odnowienie.
