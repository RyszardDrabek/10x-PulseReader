# Schemat Bazy Danych - PulseReader

## 1. Przestrzeń nazw (Schema)

Wszystkie tabele aplikacji będą utworzone w dedykowanym schemacie `app`, co oddziela je od obiektów systemowych Supabase i ułatwia zarządzanie uprawnieniami.

```sql
CREATE SCHEMA IF NOT EXISTS app;
```

## 2. Typy wyliczeniowe (ENUMs)

### app.user_mood

Typ wyliczeniowy reprezentujący preferowany nastrój użytkownika.

```sql
CREATE TYPE app.user_mood AS ENUM ('positive', 'neutral', 'negative');
```

### app.article_sentiment

Typ wyliczeniowy reprezentujący sentyment artykułu wynikający z analizy AI.

```sql
CREATE TYPE app.article_sentiment AS ENUM ('positive', 'neutral', 'negative');
```

## 3. Tabele

### app.profiles

Przechowuje preferencje użytkownika, powiązane relacją 1-do-1 z tabelą `auth.users` z Supabase Auth.

| Kolumna    | Typ           | Ograniczenia                                                  | Opis                                                   |
| ---------- | ------------- | ------------------------------------------------------------- | ------------------------------------------------------ |
| id         | UUID          | PRIMARY KEY, DEFAULT gen_random_uuid()                        | Unikalny identyfikator profilu                         |
| user_id    | UUID          | UNIQUE, NOT NULL, REFERENCES auth.users(id) ON DELETE CASCADE | Identyfikator użytkownika z Supabase Auth              |
| mood       | app.user_mood | DEFAULT NULL                                                  | Preferowany nastrój użytkownika do filtrowania treści  |
| blocklist  | TEXT[]        | DEFAULT '{}'                                                  | Tablica słów kluczowych i fragmentów URL do blokowania |
| created_at | TIMESTAMPTZ   | NOT NULL, DEFAULT now()                                       | Data utworzenia profilu                                |
| updated_at | TIMESTAMPTZ   | NOT NULL, DEFAULT now()                                       | Data ostatniej aktualizacji profilu                    |

**Uwagi:**

- `user_id` jest kluczem obcym z ograniczeniem `UNIQUE`, co zapewnia relację 1-do-1
- `ON DELETE CASCADE` automatycznie usuwa profil przy usunięciu użytkownika
- `blocklist` przechowuje zarówno słowa kluczowe jak i fragmenty URL w jednej tablicy
- `mood` może być NULL - użytkownik nie musi ustawiać preferencji nastroju

### app.rss_sources

Przechowuje listę predefiniowanych źródeł RSS, z których pobierane są artykuły.

| Kolumna    | Typ         | Ograniczenia                           | Opis                                      |
| ---------- | ----------- | -------------------------------------- | ----------------------------------------- |
| id         | UUID        | PRIMARY KEY, DEFAULT gen_random_uuid() | Unikalny identyfikator źródła             |
| name       | TEXT        | NOT NULL                               | Nazwa źródła (np. "Wyborcza", "BBC News") |
| url        | TEXT        | UNIQUE, NOT NULL                       | URL feedu RSS                             |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now()                | Data dodania źródła                       |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT now()                | Data ostatniej aktualizacji               |

**Uwagi:**

- `url` ma ograniczenie `UNIQUE` zapobiegające duplikacji źródeł
- Tabela będzie wstępnie wypełniona danymi (seeded) podczas migracji

### app.articles

Główna tabela przechowująca artykuły pobrane ze źródeł RSS wraz z wynikami analizy AI.

| Kolumna          | Typ                   | Ograniczenia                                               | Opis                                         |
| ---------------- | --------------------- | ---------------------------------------------------------- | -------------------------------------------- |
| id               | UUID                  | PRIMARY KEY, DEFAULT gen_random_uuid()                     | Unikalny identyfikator artykułu              |
| source_id        | UUID                  | NOT NULL, REFERENCES app.rss_sources(id) ON DELETE CASCADE | Identyfikator źródła RSS                     |
| title            | TEXT                  | NOT NULL                                                   | Tytuł artykułu                               |
| description      | TEXT                  | NULL                                                       | Opis lub fragment artykułu z feedu RSS       |
| link             | TEXT                  | UNIQUE, NOT NULL                                           | URL do pełnego artykułu na stronie źródłowej |
| publication_date | TIMESTAMPTZ           | NOT NULL                                                   | Data publikacji artykułu                     |
| sentiment        | app.article_sentiment | DEFAULT NULL                                               | Sentyment wynikający z analizy AI            |
| created_at       | TIMESTAMPTZ           | NOT NULL, DEFAULT now()                                    | Data pobrania artykułu do systemu            |
| updated_at       | TIMESTAMPTZ           | NOT NULL, DEFAULT now()                                    | Data ostatniej aktualizacji                  |

**Uwagi:**

- `link` ma ograniczenie `UNIQUE` zapobiegające duplikacji tego samego artykułu
- `sentiment` może być NULL - artykuły mogą być zapisane bez analizy AI w przypadku błędu
- `ON DELETE CASCADE` zapewnia usunięcie artykułów przy usunięciu źródła
- Artykuły starsze niż 30 dni będą automatycznie usuwane przez zadanie cron

### app.topics

Słownik tematów generowanych przez AI do kategoryzacji artykułów.

| Kolumna    | Typ         | Ograniczenia                           | Opis                                         |
| ---------- | ----------- | -------------------------------------- | -------------------------------------------- |
| id         | UUID        | PRIMARY KEY, DEFAULT gen_random_uuid() | Unikalny identyfikator tematu                |
| name       | TEXT        | NOT NULL                               | Nazwa tematu (np. "polityka", "technologia") |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now()                | Data utworzenia tematu                       |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT now()                | Data ostatniej aktualizacji                  |

**Uwagi:**

- Unikalność nazwy jest wymuszana przez case-insensitive indeks na `lower(name)`
- Tematy są tworzone dynamicznie przez AI podczas analizy artykułów

### app.article_topics

Tabela łącząca realizująca relację wiele-do-wielu między artykułami a tematami.

| Kolumna    | Typ         | Ograniczenia                                            | Opis                                |
| ---------- | ----------- | ------------------------------------------------------- | ----------------------------------- |
| article_id | UUID        | NOT NULL, REFERENCES app.articles(id) ON DELETE CASCADE | Identyfikator artykułu              |
| topic_id   | UUID        | NOT NULL, REFERENCES app.topics(id) ON DELETE CASCADE   | Identyfikator tematu                |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now()                                 | Data przypisania tematu do artykułu |

**Klucz główny:** (article_id, topic_id)

**Uwagi:**

- Złożony klucz główny zapobiega duplikacji przypisań
- `ON DELETE CASCADE` zapewnia czyszczenie powiązań przy usunięciu artykułu lub tematu

## 4. Relacje między tabelami

```
auth.users (1) ──────── (1) app.profiles
                              [user_id → auth.users.id]

app.rss_sources (1) ──── (N) app.articles
                              [source_id → rss_sources.id]

app.articles (N) ──────── (N) app.topics
         │                            │
         └──── app.article_topics ────┘
              [article_id → articles.id]
              [topic_id → topics.id]
```

### Kardynalność:

- **auth.users ↔ app.profiles**: 1-do-1 (wymuszony przez UNIQUE na user_id)
- **app.rss_sources → app.articles**: 1-do-wielu (jedno źródło ma wiele artykułów)
- **app.articles ↔ app.topics**: wiele-do-wielu (przez app.article_topics)

## 5. Indeksy

### Indeksy dla wydajności zapytań

```sql
-- Indeks na datę publikacji dla sortowania i filtrowania chronologicznego
CREATE INDEX idx_articles_publication_date
ON app.articles(publication_date DESC);

-- Indeks na sentyment dla filtrowania według nastroju
CREATE INDEX idx_articles_sentiment
ON app.articles(sentiment)
WHERE sentiment IS NOT NULL;

-- Indeks na source_id dla szybkiego wyszukiwania artykułów ze źródła
CREATE INDEX idx_articles_source_id
ON app.articles(source_id);

-- Case-insensitive unikalny indeks na nazwę tematu
CREATE UNIQUE INDEX idx_topics_name_lower
ON app.topics(lower(name));

-- Indeks na article_id w tabeli łączącej dla szybkiego wyszukiwania tematów artykułu
CREATE INDEX idx_article_topics_article_id
ON app.article_topics(article_id);

-- Indeks na topic_id w tabeli łączącej dla szybkiego wyszukiwania artykułów danego tematu
CREATE INDEX idx_article_topics_topic_id
ON app.article_topics(topic_id);

-- Indeks na user_id w profiles dla szybkiego wyszukiwania profilu użytkownika
CREATE INDEX idx_profiles_user_id
ON app.profiles(user_id);
```

## 6. Triggery

### Automatyczna aktualizacja kolumny updated_at

Funkcja triggera:

```sql
CREATE OR REPLACE FUNCTION app.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

Triggery dla wszystkich głównych tabel:

```sql
-- Trigger dla profiles
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON app.profiles
FOR EACH ROW EXECUTE FUNCTION app.update_updated_at_column();

-- Trigger dla rss_sources
CREATE TRIGGER update_rss_sources_updated_at
BEFORE UPDATE ON app.rss_sources
FOR EACH ROW EXECUTE FUNCTION app.update_updated_at_column();

-- Trigger dla articles
CREATE TRIGGER update_articles_updated_at
BEFORE UPDATE ON app.articles
FOR EACH ROW EXECUTE FUNCTION app.update_updated_at_column();

-- Trigger dla topics
CREATE TRIGGER update_topics_updated_at
BEFORE UPDATE ON app.topics
FOR EACH ROW EXECUTE FUNCTION app.update_updated_at_column();
```

## 7. Row-Level Security (RLS)

### app.profiles

**Włączenie RLS:**

```sql
ALTER TABLE app.profiles ENABLE ROW LEVEL SECURITY;
```

**Polityki:**

```sql
-- Użytkownicy mogą odczytać tylko swój profil
CREATE POLICY "Users can view their own profile"
ON app.profiles FOR SELECT
USING (auth.uid() = user_id);

-- Użytkownicy mogą wstawić tylko swój profil
CREATE POLICY "Users can insert their own profile"
ON app.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Użytkownicy mogą aktualizować tylko swój profil
CREATE POLICY "Users can update their own profile"
ON app.profiles FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Użytkownicy mogą usunąć tylko swój profil
CREATE POLICY "Users can delete their own profile"
ON app.profiles FOR DELETE
USING (auth.uid() = user_id);
```

### app.articles

**Włączenie RLS:**

```sql
ALTER TABLE app.articles ENABLE ROW LEVEL SECURITY;
```

**Polityki:**

```sql
-- Wszyscy użytkownicy (włącznie z gośćmi) mogą odczytywać artykuły
CREATE POLICY "Articles are viewable by everyone"
ON app.articles FOR SELECT
USING (true);

-- Tylko service_role może wstawiać artykuły
CREATE POLICY "Service role can insert articles"
ON app.articles FOR INSERT
WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Tylko service_role może aktualizować artykuły
CREATE POLICY "Service role can update articles"
ON app.articles FOR UPDATE
USING (auth.jwt()->>'role' = 'service_role');

-- Tylko service_role może usuwać artykuły
CREATE POLICY "Service role can delete articles"
ON app.articles FOR DELETE
USING (auth.jwt()->>'role' = 'service_role');
```

### app.rss_sources

**Włączenie RLS:**

```sql
ALTER TABLE app.rss_sources ENABLE ROW LEVEL SECURITY;
```

**Polityki:**

```sql
-- Wszyscy mogą odczytywać źródła RSS
CREATE POLICY "RSS sources are viewable by everyone"
ON app.rss_sources FOR SELECT
USING (true);

-- Tylko service_role może zarządzać źródłami
CREATE POLICY "Service role can manage RSS sources"
ON app.rss_sources FOR ALL
USING (auth.jwt()->>'role' = 'service_role');
```

### app.topics i app.article_topics

**Włączenie RLS:**

```sql
ALTER TABLE app.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.article_topics ENABLE ROW LEVEL SECURITY;
```

**Polityki:**

```sql
-- Wszyscy mogą odczytywać tematy
CREATE POLICY "Topics are viewable by everyone"
ON app.topics FOR SELECT
USING (true);

-- Tylko service_role może zarządzać tematami
CREATE POLICY "Service role can manage topics"
ON app.topics FOR ALL
USING (auth.jwt()->>'role' = 'service_role');

-- Wszyscy mogą odczytywać powiązania artykuł-temat
CREATE POLICY "Article topics are viewable by everyone"
ON app.article_topics FOR SELECT
USING (true);

-- Tylko service_role może zarządzać powiązaniami
CREATE POLICY "Service role can manage article topics"
ON app.article_topics FOR ALL
USING (auth.jwt()->>'role' = 'service_role');
```

## 8. Polityka retencji danych (pg_cron)

Automatyczne usuwanie artykułów starszych niż 30 dni przy użyciu rozszerzenia pg_cron.

**Włączenie rozszerzenia:**

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

**Zadanie cron:**

```sql
-- Uruchamiane codziennie o 2:00 AM
SELECT cron.schedule(
    'delete-old-articles',
    '0 2 * * *',
    $$DELETE FROM app.articles WHERE publication_date < now() - INTERVAL '30 days'$$
);
```

**Uwagi:**

- Zadanie uruchamia się raz dziennie w nocy, aby minimalizować wpływ na wydajność
- Usuwanie kaskadowe automatycznie usuwa powiązane rekordy z `app.article_topics`

## 9. Początkowe dane (Seed Data)

### Źródła RSS

Następujące źródła RSS zostaną załadowane podczas migracji:

```sql
INSERT INTO app.rss_sources (name, url) VALUES
('Wyborcza - Najważniejsze', 'https://rss.gazeta.pl/pub/rss/najnowsze_wyborcza.xml'),
('Rzeczpospolita - Główne', 'https://www.rp.pl/rss_main'),
('BBC News - World', 'http://feeds.bbci.co.uk/news/world/rss.xml'),
('Reuters - World News', 'https://rss.app/feeds/SdI37Q5uDrVQuAOr.xml');
```

## 10. Dodatkowe uwagi projektowe

### Normalizacja

- Schemat jest znormalizowany do 3NF (Third Normal Form)
- Tematy są wydzielone do osobnej tabeli, co pozwala na wielokrotne użycie i łatwe zarządzanie
- Brak denormalizacji w MVP - optymalizacje wydajnościowe będą rozważane w kolejnych wersjach

### Bezpieczeństwo

- RLS zapewnia izolację danych użytkowników na poziomie bazy danych
- Separacja uprawnień: użytkownicy końcowi vs. procesy backendowe (service_role)
- Kaskadowe usuwanie zapewnia integralność danych przy usuwaniu powiązanych rekordów

### Skalowalność

- Indeksy są zoptymalizowane pod typowe zapytania w aplikacji
- Polityka retencji zapobiega nieograniczonemu wzrostowi tabeli articles
- UUID jako klucze główne zapewniają możliwość przyszłej dystrybucji danych

### Typy danych

- TIMESTAMPTZ używany dla wszystkich dat - automatyczna konwersja stref czasowych
- TEXT zamiast VARCHAR - PostgreSQL optymalizuje TEXT tak samo jak VARCHAR
- TEXT[] dla blocklist - prostota implementacji i elastyczność

### Wartości NULL

- `sentiment` może być NULL - aplikacja działa nawet gdy analiza AI zawiedzie
- `mood` może być NULL - użytkownik nie musi ustawiać preferencji
- `description` może być NULL - nie wszystkie feedy RSS zawierają opisy

### Wydajność zapytań

- Indeks DESC na publication_date wspiera sortowanie chronologiczne (najnowsze najpierw)
- Partial index na sentiment (WHERE IS NOT NULL) oszczędza miejsce dla nieprzetworzonej części
- Indeksy na kluczach obcych wspierają JOIN i wyszukiwanie powiązanych danych
