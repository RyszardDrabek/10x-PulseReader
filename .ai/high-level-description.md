# Aplikacja - Pules Reader (MVP)

### Główny problem

Otrzymywanie wartościowych i dopasowanych informacji w świecie przeładowanym treściami jest trudne. Tradycyjne agregatory nie uwzględniają indywidualnych preferencji, nastroju ani jakości źródeł. PulseReader rozwiązuje ten problem, umożliwiając użytkownikowi pełną kontrolę nad tym, skąd i jakie wiadomości otrzymuje. Dzięki inteligentnym filtrom można ograniczyć dostęp do mało wiarygodnych portali, wykluczyć niechciane tematy i dostosować przekaz do aktualnego nastroju — tak, by codzienna dawka informacji była naprawdę wartościowa.

### Najmniejszy zestaw funkcjonalności

1. Pobieranie treści z RSS

- Integracja z kilkoma kanałami RSS (np. Wyborcza, Rzeczpospolita, BBC, Reuters).
- Zapisywanie podstawowych danych: title, description, link, pubDate.

2. Prosty system kont użytkowników

- Rejestracja, logowanie.
- Przechowywanie preferencji (tematy, źródła do blokowania, nastrój).

3. Filtrowanie treści

- Reguły po stronie aplikacji: blokowanie domen, słowa kluczowe (np. „technologia”, „sport”).

4. Integracja z AI (darmowy model przez OpenRouter)

- Analiza nastroju (pozytywny/neutralny/negatywny).
- Klasyfikacja tematyki (np. technologia, polityka, kultura).
- Zwracanie wyników w formacie JSON.

5. Interfejs użytkownika (web/mobile)

- Lista artykułów z możliwością kliknięcia w pełny link.
- Proste opcje filtrowania (tematy, nastrój, źródła).

### Co NIE wchodzi w zakres MVP

- Pełne treści artykułów – aplikacja prezentuje tylko tytuł, opis i link do źródła.
- Zaawansowane rekomendacje AI – brak systemu uczenia preferencji na podstawie zachowań użytkownika.
- Funkcje społecznościowe – brak możliwości komentowania, oceniania czy udostępniania treści między użytkownikami.
- Powiadomienia push / e-mail – brak systemu alertów o nowych artykułach.
- Integracja z płatnymi API newsowymi – tylko darmowe źródła (RSS, NewsAPI Free, itp.).
- Zaawansowana moderacja treści – brak ręcznego zatwierdzania lub edycji artykułów przez administratora.
- Obsługa multimediów – brak analizy obrazów, wideo czy audio w artykułach.
- Wielojęzyczność interfejsu – aplikacja dostępna tylko w jednym języku na start.
- Historia czytania / zapisane artykuły – brak funkcji archiwizacji lub „czytaj później”.

### Kryteria sukcesu

- 80% nowych użytkowników uzupełnia preferencje (tematy, nastrój, źródła) w ciągu pierwszych 7 dni.
- 70% aktywnych użytkowników korzysta z funkcji filtrowania co najmniej raz w tygodniu.
