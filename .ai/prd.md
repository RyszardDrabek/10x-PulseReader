# Dokument wymagań produktu (PRD) - PulseReader

## 1. Przegląd produktu
PulseReader to inteligentny agregator wiadomości zaprojektowany, aby dostarczać użytkownikom spersonalizowany i wartościowy strumień treści. Aplikacja umożliwia filtrowanie artykułów z różnych źródeł RSS na podstawie nastroju użytkownika, preferowanych tematów oraz zdefiniowanej listy blokowanych słów kluczowych i domen. Dzięki wykorzystaniu AI do analizy sentymentu i kategoryzacji tematycznej, PulseReader ma na celu zwalczanie przeładowania informacyjnego i zapewnienie doświadczenia czytelniczego dopasowanego do indywidualnych potrzeb.

## 2. Problem użytkownika
W świecie przesyconym treściami, odnalezienie wartościowych i naprawdę istotnych informacji jest znaczącym wyzwaniem. Tradycyjne agregatory wiadomości często ignorują indywidualne preferencje użytkownika, jego aktualny nastrój czy wiarygodność źródeł. Prowadzi to do zmęczenia informacyjnego oraz konsumpcji treści o niskiej jakości lub niepożądanych. PulseReader rozwiązuje ten problem, dając użytkownikowi pełną kontrolę nad swoim feedem informacyjnym, co gwarantuje, że konsumowane treści są zgodne z jego zainteresowaniami i stanem umysłu.

## 3. Wymagania funkcjonalne
- FR-001: Agregacja Treści
  - System automatycznie pobiera artykuły z predefiniowanych w bazie danych źródeł RSS (m.in. Wyborcza, Rzeczpospolita, BBC, Reuters).
  - Proces pobierania jest uruchamiany cyklicznie co 15 minut za pomocą zadania cron.
  - Zapisywane są kluczowe dane artykułu: tytuł, opis, link do źródła i data publikacji.
  - Artykuły starsze niż 30 dni są automatycznie usuwane z bazy danych w ramach polityki retencji.
- FR-002: Zarządzanie Kontami Użytkowników
  - Użytkownicy mogą rejestrować się przy użyciu adresu e-mail i hasła.
  - Uwierzytelnianie jest obsługiwane przez usługę Supabase Auth.
  - Po rejestracji wymagane jest potwierdzenie adresu e-mail przez użytkownika.
  - Preferencje użytkownika (nastrój, lista blokowania) są przechowywane w dedykowanej tabeli `profiles`, powiązanej z kontem użytkownika.
- FR-003: Integracja z AI
  - Treści pobranych artykułów są analizowane w tle przez model AI za pośrednictwem OpenRouter.
  - Analiza klasyfikuje nastrój artykułu (pozytywny, neutralny, negatywny) oraz jego tematykę.
  - W przypadku błędu analizy lub przekroczenia limitów API, artykuły są zapisywane w bazie bez tagów, a aplikacja kontynuuje działanie bez zakłóceń.
- FR-004: Personalizacja i Filtrowanie
  - Zalogowani użytkownicy mogą ustawić swój preferowany nastrój za pomocą interfejsu graficznego (np. emotikony).
  - Użytkownicy mogą zarządzać jedną, ujednoliconą listą blokowania, która obsługuje słowa kluczowe i fragmenty URL.
  - Mechanizm filtrowania jest niewrażliwy na wielkość liter.
- FR-005: Interfejs Użytkownika
  - Aplikacja webowa jest w pełni responsywna, zapewniając spójne doświadczenie na różnych urządzeniach.
  - Główny widok prezentuje listę artykułów w formie nieskończonego przewijania (infinite scroll).
  - Interfejs czytelnie informuje użytkownika o aktualnie aktywnych filtrach.
  - W przypadku braku wyników po zastosowaniu filtrów, wyświetlany jest przyjazny komunikat.

## 4. Granice produktu
Następujące funkcjonalności znajdują się poza zakresem wersji MVP (Minimum Viable Product):
- Wyświetlanie pełnych treści artykułów w aplikacji.
- Zaawansowane systemy rekomendacji AI oparte na zachowaniu użytkownika.
- Funkcje społecznościowe (komentarze, oceny, udostępnianie).
- Powiadomienia push lub e-mail o nowych artykułach.
- Integracja z płatnymi, komercyjnymi API newsowymi.
- Ręczna moderacja lub edycja treści przez administratorów.
- Obsługa i analiza multimediów (obrazów, wideo) w artykułach.
- Wielojęzyczność interfejsu użytkownika.
- Funkcje takie jak historia czytania czy "zapisz na później".
- Szczegółowe logowanie błędów związanych z procesem autentykacji.

## 5. Historyjki użytkowników

- ID: US-001
- Tytuł: Przeglądanie treści jako gość
- Opis: Jako niezalogowany użytkownik (gość), chcę przeglądać niefiltrowaną listę najnowszych artykułów, aby ocenić wartość aplikacji przed założeniem konta.
- Kryteria akceptacji:
  1. Strona główna aplikacji wyświetla listę artykułów posortowanych chronologicznie (od najnowszych).
  2. Gość widzi wszystkie artykuły, bez zastosowanych jakichkolwiek filtrów personalizacyjnych.
  3. Gość może przewijać listę artykułów w dół (infinite scroll).
  4. Przyciski i opcje personalizacji są widoczne, ale nieaktywne, z zachętą do rejestracji/logowania.

- ID: US-002
- Tytuł: Rejestracja nowego konta
- Opis: Jako nowy użytkownik, chcę móc założyć konto za pomocą adresu e-mail i hasła, aby uzyskać dostęp do funkcji personalizacji.
- Kryteria akceptacji:
  1. Formularz rejestracji zawiera pola na adres e-mail i hasło.
  2. System waliduje poprawność formatu adresu e-mail w czasie rzeczywistym.
  3. System wymaga, aby hasło miało bezpieczną minimalną długość (np. 8 znaków) i informuje o tym użytkownika.
  4. Po pomyślnym przesłaniu formularza, konto użytkownika jest tworzone w Supabase Auth ze statusem "oczekuje na weryfikację".
  5. Na podany adres e-mail wysyłana jest wiadomość z linkiem weryfikacyjnym.
  6. Użytkownik widzi na ekranie komunikat informujący o konieczności sprawdzenia skrzynki i weryfikacji adresu e-mail.

- ID: US-003
- Tytuł: Logowanie do aplikacji
- Opis: Jako zarejestrowany użytkownik, chcę móc zalogować się na swoje konto, aby uzyskać dostęp do spersonalizowanego widoku treści.
- Kryteria akceptacji:
  1. Formularz logowania zawiera pola na adres e-mail i hasło.
  2. Po pomyślnym uwierzytelnieniu, użytkownik jest przekierowywany do spersonalizowanego widoku głównego.
  3. Sesja użytkownika jest utrzymywana między wizytami w aplikacji.
  4. W przypadku podania błędnych danych, użytkownik otrzymuje czytelny komunikat o błędzie.
  5. Użytkownik z niezweryfikowanym adresem e-mail nie może się zalogować i otrzymuje stosowny komunikat.

- ID: US-004
- Tytuł: Wylogowywanie z aplikacji
- Opis: Jako zalogowany użytkownik, chcę mieć możliwość bezpiecznego wylogowania się z aplikacji.
- Kryteria akceptacji:
  1. W interfejsie użytkownika dostępny jest przycisk "Wyloguj".
  2. Po kliknięciu przycisku sesja użytkownika jest kończona.
  3. Użytkownik jest przekierowywany do widoku dla gościa.

- ID: US-005
- Tytuł: Ustawianie preferencji nastroju
- Opis: Jako zalogowany użytkownik, chcę móc ustawić swój preferowany nastrój, aby aplikacja filtrowała artykuły i pokazywała mi te dopasowane do moich obecnych preferencji.
- Kryteria akceptacji:
  1. W panelu ustawień dostępny jest interfejs do wyboru nastroju (np. klikalne emotikony reprezentujące nastrój pozytywny, neutralny, negatywny).
  2. Wybrany nastrój jest zapisywany w profilu użytkownika w bazie danych.
  3. Wybór jest trwały i zostaje zachowany między sesjami.
  4. Zmiana nastroju natychmiastowo aktualizuje listę wyświetlanych artykułów.

- ID: US-006
- Tytuł: Zarządzanie listą blokowania
- Opis: Jako zalogowany użytkownik, chcę móc dodawać i usuwać słowa kluczowe oraz fragmenty URL do mojej listy blokowania, aby unikać niechcianych treści.
- Kryteria akceptacji:
  1. W panelu ustawień znajduje się pole tekstowe do wprowadzania nowych pozycji na listę blokowania.
  2. Pod polem tekstowym wyświetlana jest lista aktualnie zablokowanych pozycji.
  3. Użytkownik może dodać nową pozycję, która jest zapisywana w jego profilu.
  4. Użytkownik może usunąć dowolną pozycję ze swojej listy blokowania.
  5. Dodanie lub usunięcie pozycji natychmiastowo aktualizuje listę wyświetlanych artykułów.
  6. Filtrowanie na podstawie listy działa dla tytułu i opisu artykułu oraz dla jego źródłowego URL.

- ID: US-007
- Tytuł: Przeglądanie spersonalizowanej listy artykułów
- Opis: Jako zalogowany użytkownik, chcę widzieć listę artykułów przefiltrowaną zgodnie z moimi zapisanymi preferencjami (nastrój, lista blokowania).
- Kryteria akceptacji:
  1. Domyślnie, po zalogowaniu, widok artykułów uwzględnia wszystkie zapisane filtry.
  2. Interfejs wyraźnie informuje, jakie filtry są aktywne (np. "Nastrój: Pozytywny", "Aktywne filtry: 3").
  3. Użytkownik ma możliwość tymczasowego wyłączenia filtrów, aby zobaczyć pełną listę artykułów.


- ID: US-008
- Tytuł: Wyświetlanie informacji o braku wyników
- Opis: Jako użytkownik, chcę otrzymać jasny komunikat, gdy moje kryteria filtrowania są tak restrykcyjne, że nie ma żadnych pasujących artykułów.
- Kryteria akceptacji:
  1. Jeśli po zastosowaniu filtrów lista artykułów jest pusta, system wyświetla komunikat, np. "Brak artykułów spełniających Twoje kryteria. Spróbuj złagodzić filtry."
  2. Komunikat jest przyjazny i widoczny w centralnej części ekranu.

- ID: US-009
- Tytuł: Otwieranie pełnego artykułu w źródle
- Opis: Jako użytkownik, chcę móc kliknąć na artykuł na liście, aby otworzyć jego pełną wersję na oryginalnej stronie internetowej.
- Kryteria akceptacji:
  1. Każdy element na liście artykułów jest klikalny.
  2. Kliknięcie w artykuł otwiera jego oryginalny link w nowej karcie przeglądarki (`target="_blank"`).

## 6. Metryki sukcesu
- MS-001: Adopcja personalizacji
  - Cel: 50% nowo zarejestrowanych użytkowników przynajmniej raz ustawiło swoje preferencje (nastrój lub dodało element do listy blokowania) w ciągu pierwszych 7 dni od rejestracji.
  - Sposób mierzenia: Stosunek liczby użytkowników, którzy mają zapisane niestandardowe preferencje w tabeli `profiles`, do całkowitej liczby użytkowników zarejestrowanych w danym okresie.
- MS-002: Aktywne korzystanie z filtrów
  - Cel: 70% aktywnych użytkowników korzysta z aplikacji z włączonymi, niestandardowymi filtrami.
  - Definicja "aktywnego użytkownika": Użytkownik, który zalogował się co najmniej raz w ciągu ostatnich 7 dni.
  - Sposób mierzenia: Analiza sesji aktywnych użytkowników w celu sprawdzenia, czy ich widok był filtrowany na podstawie osobistych preferencji (nastrój lub lista blokowania).
