import type { Metadata } from "next";
import Logo from "@/components/Logo";
import { PHONE_DISPLAY, PHONE_TEL } from "@/lib/contact";
import "./privacy.css";

export const metadata: Metadata = {
  title: "Polityka prywatności",
  description: "Jakie dane zbiera strona Korki z Krzysztofem, po co, komu je przekazuje i jakie masz prawa.",
  alternates: { canonical: "/polityka-prywatnosci" },
};

/* ──────────────────────────────────────────────────────────────────────────
   DO POTWIERDZENIA PRZEZ WŁAŚCICIELA (Krzysztof Witkowicz) PRZED PUBLIKACJĄ

   1. OKRES PRZECHOWYWANIA DANYCH. Strona NIE podaje wymyślonych liczb. Gdy
      RETENTION_MONTHS === null, polityka mówi ogólnie „tak długo, jak potrzeba”.
      Po ustaleniu terminu wpisz tu liczbę miesięcy (np. 12) — tekst uzupełni się sam.
      Okres musi zgadzać się z tym, co faktycznie robi serwer (Railway) i panel.
   2. Adres do korespondencji w sprawie danych: na razie telefon (poniżej). Jeśli ma być
      też e-mail, dopisz go w sekcji 1. Nie ma tu NIP-u ani adresu — nie wymyślamy ich.
   3. Podstawy prawne (art. 6 RODO) to propozycja zgodna z tym, co robi strona; potwierdź
      z prawnikiem/doradcą, jeśli prowadzisz działalność gospodarczą i masz inne wymagania.
   ────────────────────────────────────────────────────────────────────────── */
const RETENTION_MONTHS: number | null = null;

const keepText = (what: string) =>
  RETENTION_MONTHS
    ? `${what} przechowuję do ${RETENTION_MONTHS} miesięcy od ostatniego kontaktu, a potem usuwam.`
    : `${what} przechowuję tak długo, jak jest to potrzebne do odpowiedzi i organizacji zajęć, a potem usuwam.`;

/* Polityka opisuje WYŁĄCZNIE to, co strona naprawdę robi z danymi. */
export default function Page() {
  return (
    <main className="pp">
      <div className="pp__wrap">
        <a href="/" className="pp__back"><Logo size={30} /> Wróć na stronę</a>
        <h1 className="h-section">Polityka prywatności</h1>
        <p className="lead">Krótko i po ludzku: zbieram tylko to, co potrzebne do odpowiedzi na zapytanie i umówienia zajęć.</p>

        <h2>1. Administrator danych</h2>
        <p>Administratorem danych jest Krzysztof Witkowicz, prowadzący korepetycje pod nazwą „Korki z Krzysztofem”. Kontakt w sprawach danych osobowych: telefon <a href={PHONE_TEL}>{PHONE_DISPLAY}</a> albo wiadomość z formularza na stronie głównej.</p>

        <h2>2. Jakie dane i po co</h2>
        <ul>
          <li><b>Formularz „Zapytaj o zajęcia”</b> — imię, wybrany przedmiot (matematyka, chemia), poziom nauki, forma zajęć (stacjonarnie, online, obojętnie), e-mail i/lub telefon, opcjonalnie klasa lub szczegóły i treść wiadomości. Cel: odpowiedź na zapytanie i ustalenie zajęć (art. 6 ust. 1 lit. b i f RODO). Nie wymagam zgody marketingowej i nie wysyłam reklam.</li>
          <li><b>Rezerwacja lekcji</b> — imię i nazwisko ucznia, e-mail, opcjonalnie telefon i opis potrzeb, wybrany termin, poziom i forma lekcji. Cel: umówienie i przeprowadzenie lekcji, wysłanie potwierdzenia i przypomnienia (art. 6 ust. 1 lit. b RODO).</li>
          <li><b>Opinie</b> — imię lub inicjał, opcjonalny opis (np. „maturzystka”), ocena i treść. Publikowane dopiero po mojej akceptacji, na podstawie Twojej zgody (art. 6 ust. 1 lit. a RODO), którą możesz wycofać.</li>
          <li><b>Ochrona przed nadużyciami</b> — serwer używa adresu IP technicznie, do ograniczania liczby zapytań i blokowania spamu (art. 6 ust. 1 lit. f RODO). Ukryte pole w formularzach służy wyłącznie do odsiewania botów.</li>
          <li><b>Quiz i zadanie dnia</b> — odpowiedzi nie są przypisywane do osoby. Seria rozwiązanych zadań jest zapisywana wyłącznie w Twojej przeglądarce (localStorage).</li>
        </ul>
        <p>Podanie danych jest dobrowolne, ale bez imienia, poziomu i kontaktu (e-mail lub telefon) nie mogę odpowiedzieć na zapytanie. Nie pytam o datę urodzenia ani o inne dane dziecka, które nie są potrzebne.</p>

        <h2>3. Komu przekazuję dane</h2>
        <p>Dane są przechowywane na serwerze aplikacji (hosting Railway) i w bazie danych tego serwera. Wiadomości e-mail (potwierdzenia, powiadomienia o zapytaniach) wysyła dostawca poczty transakcyjnej Brevo. Strona jest serwowana przez Vercel, który jak każdy hosting może przetwarzać techniczne dzienniki połączeń. Nie sprzedaję danych, nie używam ich do reklam ani do profilowania.</p>

        <h2>4. Jak długo</h2>
        <p>{keepText("Dane z zapytań i rezerwacji")} Opinie są publikowane do czasu wycofania zgody lub usunięcia na Twoją prośbę.</p>

        <h2>5. Twoje prawa</h2>
        <p>Masz prawo dostępu do danych, ich sprostowania, usunięcia, ograniczenia przetwarzania, przeniesienia, sprzeciwu oraz wycofania zgody w dowolnym momencie. Skontaktuj się ze mną, korzystając z danych z punktu 1. Przysługuje Ci też skarga do Prezesa Urzędu Ochrony Danych Osobowych.</p>

        <h2>6. Pliki cookie i śledzenie</h2>
        <p>Strona nie używa ciasteczek reklamowych ani analitycznych i nie osadza widżetów społecznościowych ani map. W pamięci przeglądarki zapisuje jedynie wybrany motyw (jasny/ciemny) i serię zadania dnia. Linki do Facebooka, Instagrama i WhatsAppa to zwykłe odnośniki — dane trafiają do tych serwisów dopiero po kliknięciu.</p>
      </div>
    </main>
  );
}
