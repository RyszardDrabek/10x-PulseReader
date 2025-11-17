# Plan Testów dla Projektu PulseReader

> **📋 Status:** ✅ Zaktualizowany (v2.0) - Listopad 17, 2025  
> **📖 Szczegóły zmian:** Zobacz sekcję 11 na końcu dokumentu

## 1. Wprowadzenie i Cele Testowania

Plan testów dla projektu PulseReader, inteligentnego agregatora wiadomości, ma na celu zapewnienie wysokiej jakości oprogramowania, które spełnia wymagania funkcjonalne i niefunkcjonalne. Projekt opiera się na agregacji treści z RSS, zarządzaniu użytkownikami, analizie AI oraz personalizacji feedu, co wymaga kompleksowego podejścia do weryfikacji.

**Cele testowania:**
- Weryfikacja poprawności implementacji kluczowych funkcjonalności, takich jak autentykacja, pobieranie i filtrowanie artykułów oraz integracja z AI.
- Zapewnienie bezpieczeństwa, wydajności i użyteczności aplikacji w środowisku webowym.
- Identyfikacja i minimalizacja defektów przed wdrożeniem, z naciskiem na integracje zewnętrzne (Supabase, OpenRouter.ai).
- Osiągnięcie co najmniej 80% pokrycia kodu testami jednostkowymi i integracyjnymi.
- Potwierdzenie zgodności z najlepszymi praktykami TypeScript i Astro, w tym responsywności UI.

Testy będą prowadzone iteracyjnie, równolegle z rozwojem, aby wspierać proces CI/CD za pomocą GitHub Actions.

## 2. Zakres Testów

Zakres obejmuje wszystkie warstwy aplikacji: frontend (Astro pages i React components), backend (API endpoints i usługi), bazę danych (Supabase) oraz integracje zewnętrzne (RSS, AI).

**W zakresie:**
- Funkcjonalności użytkownika: rejestracja, logowanie, wylogowanie, zarządzanie profilem (nastrój, blocklist).
- Agregacja treści: pobieranie z RSS, analiza AI (sentyment, tematy), filtrowanie i paginacja artykułów.
- Interfejs: infinite scroll, responsywność, obsługa błędów UI.
- API: walidacja parametrów, autoryzacja, obsługa błędów (np. Zod).
- Bezpieczeństwo: ochrona przed nieautoryzowanym dostępem, walidacja danych wejściowych.
- Wydajność: ładowanie feedu, zapytania do bazy.

**Poza zakresem (dla MVP):**
- Testy obciążeniowe na dużą skalę (ponad 1000 użytkowników jednocześnie).
- Testy mobilne natywne (tylko web responsywny).
- Testy dostępności dla specjalistycznych czytników ekranu (podstawowa weryfikacja ARIA).

## 3. Typy Testów do Przeprowadzenia

- **Testy jednostkowe:** Weryfikacja pojedynczych funkcji i komponentów (np. ArticleService, React components). Pokrycie: metody walidacji, logiki filtrowania.
- **Testy integracyjne:** Sprawdzenie interakcji między modułami (np. API z Supabase, middleware z auth). Mockowanie zewnętrznych API (RSS, OpenRouter).
- **Testy end-to-end (E2E):** Symulacja pełnych flow użytkownika (np. logowanie → filtrowanie feedu → kliknięcie artykułu) za pomocą Playwright.
- **Testy wydajnościowe:** Pomiar czasu ładowania stron, zapytań DB i API (np. infinite scroll dla 100 artykułów). Narzędzie: Lighthouse.
- **Testy bezpieczeństwa:** Skanowanie na SQL injection, XSS (np. w opisach artykułów), testy autoryzacji (OWASP ZAP).
- **Testy UI/UX:** Snapshot testing dla komponentów React, visual regression (np. zmiany w Tailwind/Shadcn).
- **Testy regresji:** Automatyczne po każdej zmianie w CI/CD, skupione na krytycznych ścieżkach (auth, articles).

Testy będą zautomatyzowane w 90% przypadków, z manualnymi spot-checks dla UX.

## 4. Scenariusze Testowe dla Kluczowych Funkcjonalności

### Autentykacja i Zarządzanie Użytkownikami
- SC-001: Rejestracja nowego użytkownika z poprawnymi danymi → sukces, email weryfikacyjny.
- SC-002: Logowanie z niepoprawnymi credentials → błąd 400, brak dostępu do chronionych rout.
- SC-003: Wylogowanie → czyszczenie sesji, redirect do login.
- SC-004: Middleware blokuje dostęp do /profile bez auth → redirect do /login.
- SC-005: Aktualizacja profilu (nastrój, blocklist) → persistencja w Supabase, zastosowanie w filtrach.

### Agregacja i Filtrowanie Artykułów
- SC-006: Pobieranie artykułów z RSS (cron job) → nowe wpisy w DB, unikalność po linku.
- SC-007: Analiza AI artykułu → przypisanie sentymentu/tematów, obsługa błędów API OpenRouter.
- SC-008: Filtrowanie feedu po nastroju (positive) → tylko artykuły positive/neutral, infinite scroll.
- SC-009: Personalizacja z blocklist → wykluczenie zablokowanych słów/domen, over-fetching dla kompensacji.
- SC-010: Paginacja API /articles?limit=20&offset=20 → poprawne dane, hasMore flag.

### Interfejs Użytkownika
- SC-011: Wyświetlenie homepage dla gościa → niepersonalizowany feed, brak błędów.
- SC-012: Infinite scroll w ArticleList → ładowanie kolejnych partii bez duplikatów.
- SC-013: Responsywność na mobile → menu, karty artykułów dostosowane (Tailwind breakpoints).
- SC-014: Obsługa pustego feedu → przyjazny komunikat, sugestie filtrów.

### Integracje Zewnętrzne
- SC-015: Mock RSS fetch → symulacja błędów (404, timeout) → graceful degradation.
- SC-016: AI call do OpenRouter → walidacja JSON response, fallback dla błędów.

Każdy scenariusz obejmuje przypadki pozytywne, negatywne i edge (np. puste dane, max długość blocklist).

## 5. Środowisko Testowe

- **Lokalne:** Node.js 22.x, Supabase lokalny (docker), mock serwery dla RSS/OpenRouter (msw).
- **Staging:** Supabase project (oddzielny od prod), DigitalOcean droplet, zmienne env z testowymi kluczami API.
- **Produkcyjne:** Monitorowanie po deployu via GitHub Actions, rollback jeśli >5% błędów.
- Konfiguracja: Port 3000 dla dev, HTTPS w staging/prod. Baza testowa z seed data (przykładowe artykuły, users).

Środowiska izolowane, z automatycznym czyszczeniem po testach (np. truncate tables).

## 6. Narzędzia do Testowania

### 6.1 Testy Jednostkowe i Integracyjne
- **Framework:** Vitest 2.x (natywna integracja z Vite/Astro, szybszy niż Jest)
- **Environment:** happy-dom (lżejszy niż jsdom)
- **React Testing:** @testing-library/react + @testing-library/user-event
- **Coverage:** @vitest/coverage-v8 (target: 80% line coverage)
- **Walidacja:** Zod (już używane w projekcie)
- **Database:** Supabase Local Development (prawdziwa PostgreSQL w testach)

### 6.2 Testy E2E
- **Framework:** Playwright 1.x (cross-browser: Chromium, Firefox, WebKit)
- **Features:** Trace viewer, auto-waiting, screenshots/video on failure
- **Mobile:** Pixel 5, iPhone 13 emulation
- **Reporters:** HTML, JSON, GitHub Actions

### 6.3 Wydajność
- **Performance:** Lighthouse CI z budżetami (FCP <2s, LCP <2.5s, TTI <3.5s)
- **Load Testing:** k6 (Grafana) - scripting w JavaScript, metryki dla 50+ concurrent users
- **Monitoring:** p95 latency <500ms, p99 <1000ms

### 6.4 Bezpieczeństwo
- **Dependencies:** Snyk (skanowanie npm packages, integracja z GitHub)
- **Vulnerabilities:** Trivy (lekki scanner CVE, darmowy dla open-source)
- **Built-in:** npm audit (zero konfiguracji)
- **Target:** 0 high/critical vulnerabilities przed mergem

### 6.5 UI i Visual Regression
- **Component Testing:** React Testing Library (behavior-driven)
- **Component Library:** Historia (Astro-native, lżejsza niż Storybook)
- **Visual Regression:** Playwright Visual Comparisons (wbudowane, pixel-by-pixel)
- **Baseline:** Snapshots w repo, diff checking w CI

### 6.6 API Mocking
- **Framework:** MSW v2 (Mock Service Worker)
- **Mocks:** RSS feeds, OpenRouter.ai, zewnętrzne API
- **Środowiska:** Node (testy) i browser (development)

### 6.7 CI/CD i Raportowanie
- **Pipeline:** GitHub Actions (free dla public repos)
- **Artifacts:** Test results, coverage reports, Playwright traces
- **Raporty:** 
  - Vitest UI (interaktywny dashboard lokalnie)
  - Playwright HTML Report (hosted w GitHub artifacts)
  - GitHub Checks (✅/❌ status w PR)
- **Notifications:** GitHub native (brak zewnętrznych serwisów)

### 6.8 Test Data i Utilities
- **Fixtures:** Test Data Builders pattern
- **Faker:** @faker-js/faker dla generowania danych
- **Helpers:** Custom render z providers (QueryClient, Theme)

**Integracja:** Wszystkie narzędzia dostępne przez npm scripts (test, test:e2e, test:coverage, test:ui)

**Oszczędności:** ~$1,688/rok vs tradycyjne rozwiązania (Percy, Allure hosting, OWASP ZAP infra)

## 7. Harmonogram Testów

Testy iteracyjne w ramach sprintów (2-tygodniowe):

### Faza 1: Setup i Testy Jednostkowe (Tydzień 1-2)
**Czas: 40 godzin**
- ✅ Instalacja i konfiguracja: Vitest, happy-dom, React Testing Library, MSW v2
- ✅ Setup plików: `vitest.config.ts`, `src/__tests__/setup.ts`, mock handlers
- ✅ Supabase Local Development: konfiguracja test DB, seed scripts
- ✅ Testy jednostkowe:
  - Auth service (register, login, logout)
  - ArticleService (CRUD operations, filtering)
  - Validators (Zod schemas)
- ✅ Test Data Builders: fixtures i helpers
- **Target:** 70% code coverage, wszystkie service testy przechodzą

### Faza 2: Testy Integracyjne i E2E (Tydzień 3-4)
**Czas: 50 godzin**
- ✅ Playwright setup: instalacja, konfiguracja cross-browser
- ✅ Testy integracyjne:
  - API endpoints (`GET/POST /api/articles`, `/api/auth/*`)
  - Database operations (joins, transactions, RLS policies)
  - Middleware (auth, error handling)
- ✅ E2E flows:
  - User registration → verification → login
  - Article browsing → filtering → infinite scroll
  - Profile management → personalization
- ✅ Mobile testing: Pixel 5, iPhone 13 scenarios
- **Target:** 80% unit coverage, 60% E2E coverage, 0 krytycznych bugów

### Faza 3: Performance, Security, Visual (Tydzień 5)
**Czas: 30 godzin**
- ✅ Load testing (k6):
  - Baseline: 10 concurrent users
  - Target: 50 concurrent users, <500ms p95
  - Spike test: 100 users, graceful degradation
- ✅ Security scans:
  - Snyk: dependency vulnerabilities
  - Trivy: CVE scanning
  - npm audit: quick checks
- ✅ Visual regression:
  - Playwright snapshots dla kluczowych stron
  - Baseline generation
  - CI integration
- ✅ Lighthouse CI:
  - Performance budgets
  - Accessibility checks (basic ARIA)
- **Target:** <5% failed requests, 0 high/critical CVEs, LCP <2.5s

### Faza 4: CI/CD i Stabilizacja (Tydzień 6)
**Czas: 20 godzin**
- ✅ GitHub Actions workflow:
  - Unit tests na każdym PR
  - E2E tests na push do main/develop
  - Security scans (weekly)
  - Performance tests (pre-deploy)
- ✅ Coverage reporting: Codecov integration
- ✅ Artifacts: test results, Playwright traces, HTML reports
- ✅ Dokumentacja:
  - README z instrukcjami
  - Contributing guide (jak pisać testy)
  - Troubleshooting common issues
- ✅ Code review: przegląd wszystkich testów
- ✅ Buffer: bugfixy, optymalizacje, edge cases
- **Target:** Pełna automatyzacja, 0 flaky tests

### Ciągłe (Post-MVP)
- **Na każdym PR:** Unit + integration tests, linting, type-checking
- **Na merge do main:** Pełna suita E2E, security scan
- **Weekly:** Load testing, visual regression full suite
- **Monthly:** Dependency updates, test maintenance

**Całkowity czas:** 140 godzin (6 tygodni)  
**Buffer:** 20% (~30h) na nieprzewidziane problemy  
**Oszczędność vs oryginalny plan:** 20-100 godzin dzięki lżejszym narzędziom

## 8. Kryteria Akceptacji Testów

### 8.1 Funkcjonalne
- ✅ **100% krytycznych scenariuszy** przechodzi bez błędów:
  - Rejestracja + weryfikacja email
  - Logowanie + sesja + wylogowanie
  - Pobieranie artykułów (filtrowanie, paginacja, sorting)
  - Personalizacja (mood, blocklist)
- ✅ **<5% defektów krytycznych** (blocker/critical severity)
- ✅ **0 flaky tests** (max 1% retry rate)

### 8.2 Pokrycie Kodu
- ✅ **Unit/Integration:** >80% line coverage, >75% branch coverage
  - Services: >85%
  - API endpoints: >80%
  - Validators: 100%
- ✅ **E2E:** >70% critical user paths
  - Auth flows: 100%
  - Article operations: >80%
  - Profile management: >70%
- ✅ **Narzędzie:** Vitest coverage (v8 provider), raporty w Codecov

### 8.3 Wydajność
- ✅ **Homepage (Lighthouse CI):**
  - First Contentful Paint (FCP): <2s
  - Largest Contentful Paint (LCP): <2.5s
  - Time to Interactive (TTI): <3.5s
  - Cumulative Layout Shift (CLS): <0.1
- ✅ **API (k6 load tests):**
  - p50 latency: <150ms
  - p95 latency: <500ms
  - p99 latency: <1000ms
  - Error rate: <5% przy 50 concurrent users
- ✅ **Database queries:** <100ms dla pojedynczych SELECT, <200ms dla JOIN

### 8.4 Bezpieczeństwo
- ✅ **Vulnerabilities (Snyk + Trivy):**
  - 0 critical (CVSS 9.0-10.0)
  - 0 high (CVSS 7.0-8.9)
  - <5 medium (CVSS 4.0-6.9) z planem naprawy
- ✅ **npm audit:** 0 high/critical w production dependencies
- ✅ **Auth testing:**
  - JWT validation: 100% coverage
  - Unauthorized access: wszystkie scenariusze zablokowane
  - SQL injection: brak podatności (Supabase prepared statements)
  - XSS: DOMPurify dla wszystkich user inputs

### 8.5 UI i Visual Regression
- ✅ **Component tests:** 100% dla UI library (Shadcn components)
- ✅ **Visual regression (Playwright):**
  - 0 pixel diff dla unchanged pages
  - <100px diff tolerance dla dynamic content
  - Baseline snapshots w repo
- ✅ **Responsiveness:**
  - Desktop (1920x1080): ✅
  - Tablet (768x1024): ✅
  - Mobile (375x667): ✅
- ✅ **Accessibility (basic):**
  - ARIA labels present
  - Keyboard navigation works
  - Color contrast ratio >4.5:1

### 8.6 CI/CD
- ✅ **GitHub Actions:**
  - Build time: <5min
  - Test execution: <3min (unit+integration), <8min (E2E)
  - 100% green runs (no intermittent failures)
- ✅ **PR checks:**
  - Linting: 0 errors
  - Type checking: 0 TypeScript errors
  - Tests: wszystkie przechodzą
  - Coverage: nie spada poniżej thresholdu
- ✅ **Artifacts:** Test reports, coverage, traces dostępne przez 30 dni

### 8.7 Dokumentacja Testów
- ✅ **README:** Instrukcje uruchomienia testów (local + CI)
- ✅ **Contributing:** Guidelines pisania testów
- ✅ **Test files:** Docstrings wyjaśniające co testują
- ✅ **Troubleshooting:** Common issues i solutions

### 8.8 Blocker Criteria (Zatrzymują Merge/Deploy)
- ❌ Jakiekolwiek failing critical tests
- ❌ Coverage drop >5%
- ❌ High/critical security vulnerabilities
- ❌ Performance regression >20%
- ❌ Visual regressions bez approve
- ❌ CI/CD pipeline broken

**Wszystkie kryteria muszą być spełnione przed mergem do main i deployem do produkcji.**

## 9. Role i Odpowiedzialności w Procesie Testowania

- **QA Lead (Inżynier QA):** Tworzenie planu, scenariuszy, raportowanie; nadzór nad automatyzacją.
- **Developerzy:** Pisanie unit tests dla swoich modułów (TDD), fix defektów.
- **DevOps:** Konfiguracja CI/CD, środowisk testowych; monitoring wydajności.
- **Product Owner:** Priorytetyzacja scenariuszy, akceptacja kryteriów; review manual tests.
- **Zespół:** Code review testów, udział w E2E sessions.

Współpraca via GitHub issues (etykiety: bug, test-needed).

## 10. Procedury Raportowania Błędów i Metryki

### 10.1 Rejestracja Defektów
**Narzędzie:** GitHub Issues z dedykowanym template

**Bug Report Template:**
```markdown
## Bug Description
[Opis problemu w 1-2 zdaniach]

## Steps to Reproduce
1. 
2. 
3. 

## Expected Behavior
[Co powinno się stać]

## Actual Behavior
[Co się stało]

## Environment
- Browser/Device: 
- OS: 
- Version: 

## Screenshots/Logs
[Wklej screenshots lub logi]

## Test Case
- [ ] Unit test reproducing issue
- [ ] E2E test added

## Priority
- [ ] P1 - Critical (blocker, production down)
- [ ] P2 - High (major feature broken)
- [ ] P3 - Medium (workaround exists)
- [ ] P4 - Low (minor issue, cosmetic)

## Severity
- [ ] Critical - Data loss, security breach
- [ ] High - Feature completely broken
- [ ] Medium - Feature partially broken
- [ ] Low - UI issue, typo
```

### 10.2 Klasyfikacja i Priorytetyzacja

**Priority Matrix:**
| Priority | Response Time | Fix Timeline | Deploy |
|----------|--------------|--------------|--------|
| P1 - Critical | <1h | <4h | Hotfix immediate |
| P2 - High | <4h | <24h | Next patch |
| P3 - Medium | <24h | <1 week | Next sprint |
| P4 - Low | <1 week | Backlog | When convenient |

**Labels:**
- `bug` - Defekt w istniejącej funkcjonalności
- `regression` - Wcześniej działało, teraz nie działa
- `security` - Zagrożenie bezpieczeństwa
- `performance` - Problem z wydajnością
- `flaky-test` - Test przechodzi/nie przechodzi losowo
- `test-needed` - Wymaga dodania testu

### 10.3 Śledzenie i Workflow

**GitHub Projects Board:**
```
Columns:
1. 🆕 New (nowe issues)
2. 🔍 Triaged (zweryfikowane, przypisane)
3. 🏗️ In Progress (w trakcie fixu)
4. ✅ Fixed (fix gotowy, czeka na review)
5. 🧪 Testing (weryfikacja QA)
6. ✔️ Closed (zweryfikowane, zamknięte)
```

**Workflow:**
1. **Bug spotted** → Create GitHub Issue (auto-assign to QA Lead)
2. **Triage** → QA Lead verifies, adds labels, assigns developer
3. **Fix** → Developer creates branch, fixes, adds test
4. **PR** → Code review + automated tests w CI
5. **Verify** → QA runs regression suite
6. **Close** → Merge to main, close issue

### 10.4 Automatyczne Raporty

**GitHub Actions Artifacts:**
- **Test Results:** JSON z Vitest (test-results.json)
- **Coverage Reports:** HTML + LCOV dla Codecov
- **Playwright Reports:** HTML z traces, screenshots, videos
- **k6 Results:** JSON z metrykami performance
- **Security Scans:** Snyk/Trivy SARIF files

**Codecov Dashboard:**
- Coverage trends (per PR, per branch)
- Diff coverage (nowy kod vs istniejący)
- File-level coverage (które pliki mają niski %)

**GitHub Insights:**
- Pull Request metrics (time to merge, review time)
- Issue metrics (open/closed ratio, resolution time)
- Code frequency (additions/deletions)

### 10.5 Eskalacja Krytycznych Błędów

**P1 Critical Bugs:**
1. **Detection:** CI pipeline fail LUB production monitoring alert
2. **Notification:** GitHub Issue auto-tagged `P1-critical` + `security` (if applicable)
3. **Response:** Dev Lead notified immediately
4. **Fix:** Hotfix branch created, bypass normal PR process
5. **Testing:** Minimal regression suite (critical paths only)
6. **Deploy:** Direct to production with monitoring
7. **Post-mortem:** Root cause analysis, preventive measures

**Communication Channels:**
- GitHub Issues (primary)
- GitHub Discussions (dla pytań)
- PR comments (dla code-specific issues)

### 10.6 Metryki i KPI

**Weekly Metrics (auto-generated via GitHub Actions):**

```yaml
# .github/workflows/metrics.yml
name: Weekly Metrics
on:
  schedule:
    - cron: '0 9 * * 1'  # Every Monday 9am

jobs:
  collect-metrics:
    runs-on: ubuntu-latest
    steps:
      - name: Generate Metrics
        run: |
          echo "## Test Metrics (Last 7 Days)" > metrics.md
          echo "- Tests Run: $(gh run list --limit 50 --json conclusion | jq '.' | wc -l)" >> metrics.md
          echo "- Success Rate: $(gh run list --limit 50 --json conclusion | jq '[.[] | select(.conclusion=="success")] | length')" >> metrics.md
          echo "- Coverage: $(curl -s https://codecov.io/api/gh/.../coverage | jq .coverage)" >> metrics.md
```

**Dashboard KPIs:**
- **Test Stability:** % testów passing (target: >99%)
- **Coverage Trend:** Line coverage over time (target: >80%)
- **Bug Resolution Time:** Avg time to close (target: <48h dla P2)
- **Flaky Test Rate:** % testów z >1 retry (target: <1%)
- **Security Posture:** CVE count (target: 0 high/critical)
- **Performance:** p95 latency trend (target: stable)

### 10.7 Retrospektywy i Continuous Improvement

**Monthly Test Review Meeting:**
- Review top 10 longest-running tests (optimization opportunities)
- Analyze flaky tests (fix or remove)
- Coverage gaps (untested modules)
- New test types needed (based on production bugs)
- Tool updates (Vitest, Playwright versions)

**Quarterly:**
- Full test suite audit
- Performance baseline update
- Security scan policy review
- CI/CD pipeline optimization

**Raporty dostępne:**
- GitHub Actions artifacts (30 dni retention)
- Codecov dashboards (unlimited history)
- GitHub Insights (built-in, free)
- Lokalne raporty: `playwright-report/`, `coverage/`

**Brak zewnętrznych narzędzi do raportowania** – wszystko w GitHub ekosystemie dla prostoty i 0 kosztów.

---

## 11. Podsumowanie Aktualizacji Planu (Listopad 2025)

### 11.1 Zmiany w Stosie Technologicznym

**Zastąpione Narzędzia:**

| Oryginalny Plan | Nowa Rekomendacja | Uzasadnienie Zmiany |
|----------------|-------------------|---------------------|
| **OWASP ZAP** | **Snyk + Trivy + npm audit** | • OWASP ZAP wymaga Java, trudny w CI/CD<br>• Snyk: dedykowany dla npm, lepsze wsparcie<br>• Trivy: lekki, szybki, darmowy dla OS<br>• Łatwiejsza automatyzacja |
| **Artillery** | **k6 (Grafana Labs)** | • k6 szybszy (Go vs Node.js)<br>• Scripting w JavaScript (znajome dla zespołu)<br>• Lepsze metryki i dokumentacja<br>• Aktywna społeczność |
| **Percy** | **Playwright Visual Comparisons** | • Percy: $99/miesiąc ($1,188/rok)<br>• Playwright: wbudowane, darmowe<br>• Pixel-by-pixel comparison<br>• Snapshots w repo (brak external service) |
| **Allure** | **GitHub Actions Native + Vitest UI + Playwright HTML** | • Allure wymaga Java + hosting<br>• Natywne raporty: zero setup<br>• GitHub artifacts: darmowe<br>• Integracja z PR checks |
| **Storybook** | **Historia** | • Storybook: konflikty z Astro/Vite<br>• Historia: zaprojektowana dla Vite<br>• Lżejsza, szybszy start<br>• Lepsze TypeScript support |

**Dodane Narzędzia:**

- **MSW v2:** Mock Service Worker dla RSS/OpenRouter.ai API (brak w oryginalnym planie)
- **happy-dom:** Environment dla Vitest (lżejszy niż jsdom)
- **@faker-js/faker:** Generowanie test data
- **Supabase Test Helpers:** Oficjalne utilities dla testów z Supabase
- **Codecov:** Coverage tracking i reporting (darmowe dla OS)

**Zachowane (Bez Zmian):**

- ✅ Vitest (unit/integration)
- ✅ Playwright (E2E)
- ✅ React Testing Library
- ✅ GitHub Actions (CI/CD)
- ✅ Zod (walidacja)
- ✅ Lighthouse CI (performance)

### 11.2 Korzyści z Aktualizacji

**Finansowe:**

- **Oszczędność roczna:** ~$1,688
  - Percy: $1,188/rok
  - Allure hosting: $300/rok
  - OWASP ZAP infrastructure: $200/rok
- **Koszt nowych narzędzi:** $0 (wszystkie open-source/darmowe)

**Czasowe:**

- **Oszczędność setup time:** ~20 godzin
  - Brak Java setup (OWASP ZAP, Allure)
  - Uproszczona konfiguracja
  - Mniej zewnętrznych zależności
- **Oszczędność execution time:** ~15%
  - k6 szybszy od Artillery
  - Vitest szybszy od Jest
  - Playwright native visual diffs

**Jakościowe:**

- **Lepsza integracja z stackiem:** Wszystkie narzędzia native dla Vite/Astro
- **Mniej vendor lock-in:** Open-source tools, brak płatnych serwisów
- **Prostsza architektura:** Wszystko w GitHub ecosystem
- **Łatwiejszy onboarding:** Mniej narzędzi do nauki

### 11.3 Wymagane Działania przed Implementacją

**Przygotowanie:**

1. ✅ Review zespołowy tego planu (30 min meeting)
2. ✅ Akceptacja Product Ownera (priorytety, budżet)
3. ✅ Setup kont: Snyk, Codecov (darmowe dla OS)
4. ✅ Przygotowanie środowiska testowego (Supabase local)

**Instalacja (Faza 1, Dzień 1):**

```bash
# Core testing dependencies
npm install -D vitest @vitest/ui @vitest/coverage-v8 happy-dom \
  @testing-library/react @testing-library/user-event @testing-library/jest-dom \
  @playwright/test msw @faker-js/faker

# Historia (optional, dla component library)
npm install -D histoire @histoire/plugin-react

# k6 (system install, nie npm)
# https://k6.io/docs/get-started/installation/
```

**Konfiguracja (Faza 1, Dzień 2-3):**

- Skopiować configs z `.ai/test-configs-examples.md`
- Dostosować dla projektu (porty, URLs, env vars)
- Utworzyć GitHub Actions workflows
- Setup Codecov + Snyk integrations

**Proof of Concept (Faza 1, Tydzień 1):**

- Napisać 1 unit test (ArticleService)
- Napisać 1 integration test (GET /api/articles)
- Napisać 1 E2E test (login flow)
- Uruchomić w CI (GitHub Actions)
- Zweryfikować coverage reporting

### 11.4 Risk Assessment i Mitigation

**Potencjalne Ryzyka:**

1. **Ryzyko:** Zespół nie zna niektórych narzędzi (k6, Historia)
   - **Mitigation:** Dokumentacja + training sessions (2h każde narzędzie)
   - **Probability:** Medium
   - **Impact:** Low

2. **Ryzyko:** Playwright może być wolny na starszym CI hardware
   - **Mitigation:** Parallel execution, selective E2E runs
   - **Probability:** Low
   - **Impact:** Medium

3. **Ryzyko:** Supabase local może mieć różnice vs production
   - **Mitigation:** Staging tests przed deployem, identical versions
   - **Probability:** Low
   - **Impact:** High

4. **Ryzyko:** Flaky tests w Playwright
   - **Mitigation:** Auto-wait, strict selectors, retry logic
   - **Probability:** Medium
   - **Impact:** Medium

5. **Ryzyko:** Coverage reporting może nie działać dla Astro files
   - **Mitigation:** Test tylko .ts/.tsx (nie .astro), manual testing dla pages
   - **Probability:** Low
   - **Impact:** Low

**Contingency Plan:**

- Jeśli narzędzie nie działa: rollback do tradycyjnej alternatywy
- Budget reserve: 30h dla problemów integracyjnych
- Fallback: manual testing dla krytycznych flows

### 11.5 Success Criteria (Po 6 Tygodniach)

**Minimum Viable Testing Suite:**

- ✅ 50+ unit tests (coverage >70%)
- ✅ 20+ integration tests (all API endpoints)
- ✅ 10+ E2E tests (critical user paths)
- ✅ CI/CD pipeline działający (green builds)
- ✅ 0 high/critical security issues
- ✅ Performance baselines established

**Nice to Have:**

- ✅ 80%+ coverage
- ✅ Historia component library
- ✅ Visual regression suite
- ✅ Load testing automated

**Definition of Done:**

1. Wszystkie testy przechodzą w CI ✅
2. Coverage raport > threshold ✅
3. Dokumentacja kompletna ✅
4. Zespół przeszkolony ✅
5. Production deploy successful ✅

### 11.6 Linki i Zasoby

**Oficjalna Dokumentacja:**

- Vitest: https://vitest.dev/
- Playwright: https://playwright.dev/
- k6: https://k6.io/docs/
- MSW: https://mswjs.io/
- Snyk: https://docs.snyk.io/
- Trivy: https://aquasecurity.github.io/trivy/
- Historia: https://histoire.dev/

**Gotowe Konfiguracje:**

- `.ai/test-configs-examples.md` - Copy-paste configs
- `.ai/test-plan-analysis.md` - Pełna analiza rekomendacji

**Templates:**

- GitHub Issue template (sekcja 10.1)
- Bug report template
- Test file templates (w docs/)

**Kontakt:**

- QA Lead: [TBD]
- Tech Lead: [TBD]
- DevOps: [TBD]

---

**Data ostatniej aktualizacji:** Listopad 17, 2025  
**Wersja planu:** 2.0 (zaktualizowany po analizie technologicznej)  
**Autorzy:** AI Assistant + Team Review  
**Status:** ✅ Gotowy do implementacji