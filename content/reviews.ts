/* Dziewięć opinii ze starej strony — DOSŁOWNA transkrypcja grafik (_materialy/opinie-z-grafik.json).
   Literówek i braku polskich znaków nie poprawiamy: tekst ma się zgadzać z oryginałem.
   Używane, gdy API nie zwraca opinii. `key` = dosłowny fragment cytatu podkreślany kredą
   (musi być podciągiem `quote`; jeśli nie jest, podkreślenia po prostu nie ma). */

export type FallbackReview = {
  id: string;
  author: string;
  context: string;
  quote: string;
  key?: string;
};

export const REVIEWS_HEAD = {
  eyebrow: "Opinie",
  title: "Nie wierz mi na słowo, zobacz co mówią moi uczniowie",
  add: "Dodaj opinię",
  prev: "Poprzednia opinia",
  next: "Następna opinia",
  pick: "Wybierz opinię",
  hintDrag: "przeciągnij",
};

export const FALLBACK_REVIEWS: FallbackReview[] = [
  { id: "julia", author: "Julia", context: "Maturzystka", quote: "Polecam Pana Krzysztofa, który w prosty sposób wyjaśnia trudne zagadnienia i motywuje do nauki. Dzięki jego pomocy zdałam maturę ze świetnym wynikiem!", key: "w prosty sposób wyjaśnia trudne zagadnienia" },
  { id: "amelia", author: "Amelia", context: "uczennica szkoły podstawowej", quote: "Pan Krzysiu/Krzysztof znakomicie prowadzi zajęcia. Potrafi bezbłędnie, z cierpliwością wytłumaczyć zadanie. Dzięki wspólnym spotkaniom poradziłam sobie z materiałem, który był dla mnie niezrozumiały.", key: "z cierpliwością wytłumaczyć zadanie" },
  { id: "uczen", author: "Jeden z uczniów", context: "", quote: "Bardzo dobry korepetytor. Wymagajacy ale z bardzo dobrym podejsciem do ucznia. Z duzym zaangazowaniem i pasja prowadzi zajecia a zagadnienia tlumaczy w sposob cierpliwy i zrozumialy. Serdecznie polecam", key: "z bardzo dobrym podejsciem do ucznia" },
  { id: "jadzia", author: "Jadzia", context: "uczennica liceum", quote: "Krzysztof to świetny korepetytor z bardzo profesjonalnym podejściem. Bardzo cierpliwie i dokładnie tłumaczy zadania, pozostawiając bez żadnych wątpliwości. Dzięki jego pomocy w rok przygotowałam się do egzaminu ósmoklasisty i zdałam go z bardzo wysokim wynikiem. Mogę zagwarantować że pomoże każdemu :)", key: "Bardzo cierpliwie i dokładnie tłumaczy zadania" },
  { id: "dorota", author: "pani Dorota", context: "rodzic", quote: "Polecam lekcje z Panem Krzysztofem - przygotowywal syna do egzaminu 8 klasisty i super wynik 100%. Obecnie rowniez korzystamy ze wsparcia z rozszerzona matematyka w liceum. Nauczyciel zaangazowany i z dobrym podejsciem do uczniow. Polecam wszystkim", key: "Nauczyciel zaangazowany i z dobrym podejsciem do uczniow" },
  { id: "szymon", author: "Szymon", context: "licealista", quote: "Pan Krzysztof to fantastyczny nauczyciel !!! Posiada ogromną wiedzę matematyczną, którą w przystępny i jasny sposób dzieli się z innymi. Co ważne, cierpliwość to Jego drugie imię. Polecamy z całego serca.", key: "cierpliwość to Jego drugie imię" },
  { id: "hania", author: "Hania", context: "8. klasa", quote: "Pan Krzysztof świetnie potrafi wytłumaczyć dane zagadnienie, jest spokojny i ma dużo cierpliwości. W trakcie lekcji dostosowuje sie do indywidualnych potrzeb ucznia i ma doskonale podejście do młodzieży!", key: "jest spokojny i ma dużo cierpliwości" },
  { id: "bartosz", author: "Bartosz", context: "3LO", quote: "Pan jest świetnym nauczycielem matematyki, który w prosty i zrozumiały sposób wyjaśnia nawet najtrudniejsze zagadnienia. Dzięki jego cierpliwości i indywidualnemu podejściu nauka staje się efektywna i przyjemna.", key: "w prosty i zrozumiały sposób wyjaśnia nawet najtrudniejsze zagadnienia" },
  { id: "rodzic", author: "Rodzic ucznia", context: "", quote: "Serdecznie polecam Pana Krzysztofa. Prowadzi korepetycje u moich dzieci i jesteśmy bardzo zadowoleni. Zajęcia na poziomie, świetnie przekazywana wiedza i umiejętne podejście.", key: "świetnie przekazywana wiedza i umiejętne podejście" },
];
