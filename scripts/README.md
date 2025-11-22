# Database Seed Scripts

Ten katalog zawiera skrypty do wypełniania bazy danych danymi testowymi dla rozwoju aplikacji PulseReader.

## Wymagania

- Supabase uruchomiony lokalnie (`supabase start`)
- Zmienne środowiskowe skonfigurowane w pliku `.env`:
  ```env
  SUPABASE_URL=http://127.0.0.1:54321
  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
  ```

## Użycie

### Podstawowe seedowanie

Uruchom skrypt seed, aby wypełnić bazę danych danymi testowymi:

```bash
npm run seed
```

Skrypt utworzy:

- **4 testowych użytkowników** z profilami
- **6 źródeł RSS**
- **12 tematów**
- **15 artykułów** z przypisanymi tematami

### Reset i seedowanie

Aby najpierw wyczyścić istniejące dane testowe, a następnie wypełnić bazę od nowa:

```bash
npm run seed:reset
```

## Dane testowe

### Użytkownicy testowi

Wszyscy użytkownicy mają hasło: `Test123!@#`

| Email                        | Imię             | Nastrój  | Blocklist               |
| ---------------------------- | ---------------- | -------- | ----------------------- |
| anna.kowalska@example.com    | Anna Kowalska    | positive | wojna, konflikt, kryzys |
| piotr.nowak@example.com      | Piotr Nowak      | neutral  | sport, piłka            |
| maria.wisniewska@example.com | Maria Wiśniewska | negative | (pusta)                 |
| jan.kowalczyk@example.com    | Jan Kowalczyk    | null     | polityka, wybory        |

### Źródła RSS

- Wyborcza - Najważniejsze
- Rzeczpospolita - Główne
- BBC News - World
- Reuters - World News
- TechCrunch
- The Guardian - Technology

### Tematy

- Technologia
- Polityka
- Gospodarka
- Sport
- Zdrowie
- Nauka
- Kultura
- Świat
- Biznes
- Edukacja
- Środowisko
- Społeczeństwo

### Artykuły

Skrypt tworzy 15 realistycznych artykułów z różnymi sentymentami (positive, neutral, negative) i przypisanymi tematami. Artykuły mają daty publikacji rozłożone w czasie (od 2 do 15 dni temu).

## Struktura skryptu

Skrypt `seed.ts` wykonuje następujące kroki w kolejności:

1. **Czyszczenie danych** (tylko z flagą `--reset`)
   - Usuwa istniejące relacje article_topics
   - Usuwa istniejące artykuły
   - Usuwa istniejące tematy
   - Usuwa istniejące profile
   - Usuwa istniejące źródła RSS
   - Usuwa testowych użytkowników z auth

2. **Tworzenie użytkowników**
   - Tworzy użytkowników w Supabase Auth
   - Automatycznie potwierdza ich emaile (`email_confirm: true`)

3. **Tworzenie profili**
   - Tworzy profile dla każdego użytkownika
   - Ustawia preferencje nastroju i blocklistę

4. **Tworzenie źródeł RSS**
   - Sprawdza, czy źródło już istnieje (po URL)
   - Tworzy tylko nowe źródła

5. **Tworzenie tematów**
   - Sprawdza, czy temat już istnieje (case-insensitive)
   - Tworzy tylko nowe tematy

6. **Tworzenie artykułów**
   - Sprawdza, czy artykuł już istnieje (po link)
   - Tworzy artykuły z przypisanymi tematami

## Bezpieczeństwo

⚠️ **UWAGA**: Skrypt używa `SUPABASE_SERVICE_ROLE_KEY`, który ma pełne uprawnienia do bazy danych. Używaj go tylko w środowisku deweloperskim!

## Rozwiązywanie problemów

### Błąd: "Missing required environment variables"

Upewnij się, że plik `.env` zawiera:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### Błąd: "Failed to create user"

- Sprawdź, czy Supabase jest uruchomiony: `supabase status`
- Sprawdź, czy użytkownik o tym emailu już nie istnieje
- Użyj `npm run seed:reset`, aby wyczyścić istniejących użytkowników

### Błąd: "Foreign key constraint violation"

Skrypt wykonuje operacje w odpowiedniej kolejności, aby uniknąć naruszeń kluczy obcych. Jeśli wystąpi błąd:

1. Użyj `npm run seed:reset`, aby wyczyścić wszystkie dane
2. Uruchom ponownie `npm run seed`

### Duplikaty danych

Skrypt automatycznie sprawdza, czy dane już istnieją przed ich utworzeniem. Jeśli chcesz wymusić ponowne utworzenie:

1. Użyj `npm run seed:reset`, aby wyczyścić dane
2. Uruchom `npm run seed`

## Rozszerzanie danych testowych

Aby dodać więcej danych testowych, edytuj plik `scripts/seed.ts`:

1. Dodaj użytkowników do tablicy `TEST_USERS`
2. Dodaj źródła RSS do tablicy `RSS_SOURCES`
3. Dodaj tematy do tablicy `TOPICS`
4. Dodaj artykuły do tablicy `TEST_ARTICLES`

Pamiętaj o zachowaniu relacji:

- Artykuły muszą odnosić się do istniejących źródeł RSS (`sourceIndex`)
- Artykuły muszą mieć przypisane istniejące tematy (`topicIndices`)

## Integracja z CI/CD

Skrypty seed mogą być używane w pipeline CI/CD do przygotowania środowiska testowego:

```yaml
# Przykład dla GitHub Actions
- name: Seed database
  run: |
    npm run seed:reset
  env:
    SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```
