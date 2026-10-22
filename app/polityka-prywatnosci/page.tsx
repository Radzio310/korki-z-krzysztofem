import type { Metadata } from "next";
import Logo from "@/components/Logo";
import "./privacy.css";

export const metadata: Metadata = { title: "Polityka prywatności" };

/* Wzór polityki opisujący WYŁĄCZNIE to, co strona naprawdę robi z danymi.
   Dane administratora uzupełnia właściciel (oznaczone w treści). */
export default function Page() {
  return (
    <main className="pp">
      <div className="pp__wrap">
        <a href="/" className="pp__back"><Logo size={30} /> Wróć na stronę</a>
        <h1 className="h-section">Polityka prywatności</h1>
        <p className="lead">Krótko i po ludzku: zbieram tylko to, co potrzebne do umówienia lekcji i odpowiedzi na wiadomość.</p>

        <h2>1. Administrator danych</h2>
        <p>Administratorem danych jest prowadzący korepetycje „Korki z Krzysztofem”. Kontakt: adres e-mail podany w sekcji „Kontakt” na stronie głównej.</p>

        <h2>2. Jakie dane i po co</h2>
        <ul>
          <li><b>Rezerwacja lekcji</b> — imię i nazwisko ucznia, e-mail, opcjonalnie telefon i opis potrzeb, wybrany termin, poziom i forma lekcji. Cel: umówienie i przeprowadzenie lekcji, wysłanie potwierdzenia i przypomnienia (art. 6 ust. 1 lit. b RODO).</li>
          <li><b>Formularz kontaktowy</b> — imię, e-mail, opcjonalnie telefon i treść wiadomości. Cel: odpowiedź (art. 6 ust. 1 lit. a i f RODO).</li>
          <li><b>Opinie</b> — imię lub inicjał, opcjonalny opis (np. „maturzystka”), ocena i treść. Publikowane dopiero po akceptacji, na podstawie zgody (art. 6 ust. 1 lit. a RODO).</li>
          <li><b>Quiz i zadanie dnia</b> — odpowiedzi nie są przypisywane do osoby. Seria rozwiązanych zadań jest zapisywana wyłącznie w Twojej przeglądarce (localStorage).</li>
        </ul>

        <h2>3. Komu przekazuję dane</h2>
        <p>Dane są przechowywane na serwerze aplikacji (hosting Railway) i w bazie danych tego serwera. Wiadomości e-mail wysyła dostawca poczty transakcyjnej Brevo. Strona jest serwowana przez Vercel. Nie sprzedaję danych ani nie używam ich do reklam.</p>

        <h2>4. Jak długo</h2>
        <p>Dane rezerwacji — przez czas współpracy i do 12 miesięcy po ostatniej lekcji. Wiadomości — do 12 miesięcy. Opinie — do wycofania zgody.</p>

        <h2>5. Twoje prawa</h2>
        <p>Masz prawo dostępu do danych, ich sprostowania, usunięcia, ograniczenia przetwarzania, przeniesienia, sprzeciwu oraz wycofania zgody w dowolnym momencie. Napisz na adres z sekcji „Kontakt”. Przysługuje Ci też skarga do Prezesa UODO.</p>

        <h2>6. Pliki cookie</h2>
        <p>Strona nie używa ciasteczek reklamowych ani analitycznych. W pamięci przeglądarki zapisuje jedynie wybrany motyw (jasny/ciemny) i serię zadania dnia.</p>
      </div>
    </main>
  );
}
