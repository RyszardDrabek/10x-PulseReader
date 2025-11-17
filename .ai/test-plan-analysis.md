# Analiza Planu Testów - Rekomendacje Technologiczne

## Podsumowanie Wykonawcze

**Stack projektu:** Astro 5, React 19, TypeScript 5, Tailwind 4, Supabase, Shadcn/ui  
**Integracje:** Supabase Auth, Supabase PostgreSQL, OpenRouter.ai (AI), RSS feeds  
**Data analizy:** Listopad 2025

---

## ✅ Co jest Dobre (Akceptuję)

### 1. **Vitest jako framework testowy (Sekcja 6)**
**Plan:** Vitest dla unit/integration tests  
**Status:** ✅ **ZGADZAM SIĘ**

**Uzasadnienie:**
- Natywna integracja z Vite (Astro 5 używa Vite)
- Lepszy niż Jest dla projektów Astro/ESM
- Szybkie wykonanie, hot reload
- Kompatybilny z React Testing Library
- Aktualnie utrzymywany (Jest jest przestarzały dla nowych projektów)

**Implementacja:**
```json
{
  "devDependencies": {
    "vitest": "^2.1.0",
    "@vitest/ui": "^2.1.0",
    "happy-dom": "^15.0.0"
  }
}
```

### 2. **Playwright dla E2E (Sekcja 6)**
**Plan:** Playwright (cross-browser: Chrome, Firefox)  
**Status:** ✅ **ZGADZAM SIĘ**

**Uzasadnienie:**
- Najlepsze narzędzie E2E w 2025 (wyprzedziło Cypress)
- Cross-browser (Chrome, Firefox, Safari/WebKit)
- Szybsze niż Selenium/Cypress
- Doskonałe DevTools, trace viewer
- Oficjalnie wspierane przez Microsoft

### 3. **React Testing Library (Sekcja 6)**
**Plan:** React Testing Library  
**Status:** ✅ **ZGADZAM SIĘ**

**Uzasadnienie:**
- Standard de facto dla React 19
- Testowanie zgodne z "user behavior" (nie implementacja)
- Integracja z Vitest

### 4. **GitHub Actions dla CI/CD (Sekcja 6)**
**Plan:** GitHub Actions  
**Status:** ✅ **ZGADZAM SIĘ**

**Uzasadnienie:**
- Darmowe dla public repos, tanie dla private
- Natywna integracja z GitHub
- Szerokie wsparcie community

### 5. **Zod dla walidacji (Sekcja 3)**
**Plan:** Zod dla walidacji w testach  
**Status:** ✅ **ZGADZAM SIĘ**

**Uzasadnienie:**
- Projekt już używa Zod (brak dodatkowej zależności)
- Type-safe, doskonałe błędy walidacyjne

---

## ⚠️ Co Warto Zmienić (Rekomendacje)

### 1. **OWASP ZAP → Snyk/Trivy (Sekcja 6)**
**Plan:** OWASP ZAP dla testów bezpieczeństwa  
**Status:** ⚠️ **PROPONUJĘ ZMIANĘ**

**Problem:**
- OWASP ZAP jest ciężki, wymaga Java
- Trudny w automatyzacji CI/CD
- Overkill dla MVP

**Rekomendacja: Snyk + Trivy**
```yaml
# GitHub Actions
- name: Snyk Security Scan
  uses: snyk/actions/node@master
  env:
    SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

- name: Trivy vulnerability scanner
  uses: aquasecurity/trivy-action@master
  with:
    scan-type: 'fs'
    scan-ref: '.'
```

**Zalety:**
- **Snyk:** Skanowanie zależności npm, integracja z GitHub
- **Trivy:** Lekki, szybki, wykrywa CVE w dependencies
- Łatwa automatyzacja (GitHub Actions)
- Darmowe dla open-source

**Dodatkowe narzędzie:** `npm audit` (wbudowane, zero konfiguracji)

---

### 2. **Artillery → k6 (Sekcja 6)**
**Plan:** Artillery dla load tests  
**Status:** ⚠️ **PROPONUJĘ ZMIANĘ**

**Problem:**
- Artillery jest mniej popularny, gorsze wsparcie
- Konfiguracja YAML jest mniej intuicyjna

**Rekomendacja: k6 (Grafana k6)**
```javascript
// load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 50 },  // ramp-up
    { duration: '3m', target: 50 },  // steady
    { duration: '1m', target: 0 },   // ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% < 500ms
  },
};

export default function () {
  const res = http.get('http://localhost:3000/api/articles');
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(1);
}
```

**Zalety:**
- Napisany w Go (szybki, lekki)
- Scripting w JavaScript (łatwy dla zespołu)
- Lepsze metryki, grafana integracja
- Darmowy i open-source
- Aktywna społeczność (Grafana Labs)

---

### 3. **Percy → Playwright Visual Comparisons (Sekcja 6)**
**Plan:** Percy dla visual diffs  
**Status:** ⚠️ **PROPONUJĘ ZMIANĘ**

**Problem:**
- Percy jest płatny ($99/miesiąc dla zespołu)
- Wymaga zewnętrznego serwisu

**Rekomendacja: Playwright Visual Comparisons (built-in)**
```typescript
// visual.spec.ts
import { test, expect } from '@playwright/test';

test('homepage visual regression', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await expect(page).toHaveScreenshot('homepage.png', {
    maxDiffPixels: 100, // tolerancja 100px różnicy
  });
});
```

**Zalety:**
- **Darmowe** (wbudowane w Playwright)
- Automatyczne generowanie baseline
- Pixel-by-pixel comparison
- Przechowywanie w repo (nie trzeba zewnętrznego serwisu)

**Alternatywa (jeśli potrzeba UI):** **Argos CI** (darmowy dla open-source)

---

### 4. **Allure → GitHub Actions Native Reporting (Sekcja 6)**
**Plan:** Allure dla agregacji wyników  
**Status:** ⚠️ **PROPONUJĘ UPROSZCZENIE**

**Problem:**
- Allure wymaga Java, dodatkowej konfiguracji
- Hosting raportów wymaga osobnego serwera

**Rekomendacja: GitHub Actions + Vitest UI + Playwright HTML Reporter**
```yaml
# .github/workflows/test.yml
- name: Run tests
  run: npm test -- --reporter=json --outputFile=test-results.json

- name: Upload test results
  uses: actions/upload-artifact@v4
  with:
    name: test-results
    path: test-results.json

- name: Playwright Test
  run: npx playwright test --reporter=html

- name: Upload Playwright Report
  uses: actions/upload-artifact@v4
  with:
    name: playwright-report
    path: playwright-report/
```

**Zalety:**
- Brak Java dependency
- Natywne HTML raporty (Vitest UI, Playwright)
- Przechowywanie artifacts w GitHub
- Integracja z GitHub Checks (✅/❌ w PR)

**Dla lokalnego developmentu:**
- `npm run test:ui` (Vitest UI - interaktywny dashboard)
- `npx playwright show-report` (HTML report)

---

### 5. **Storybook → Historia (Sekcja 6)**
**Plan:** Storybook dla komponentów Shadcn  
**Status:** ⚠️ **PROPONUJĘ ALTERNATYWĘ**

**Problem:**
- Storybook jest ciężki dla Astro (Vite conflicts)
- Shadcn/ui nie wymaga Storybook (komponenty są proste)

**Rekomendacja: Historia (Astro-native)**
```bash
npm install -D @histoire/plugin-react histoire
```

**Historia config:**
```typescript
// histoire.config.ts
import { defineConfig } from 'histoire';
import { HstReact } from '@histoire/plugin-react';

export default defineConfig({
  plugins: [HstReact()],
  setupFile: './src/histoire.setup.ts',
  tree: {
    groups: [
      { id: 'ui', title: 'UI Components' },
      { id: 'features', title: 'Features' },
    ],
  },
});
```

**Zalety:**
- Zaprojektowane dla Vite/Astro (brak konfliktów)
- Lżejsze niż Storybook (szybszy start)
- Lepsze TypeScript support
- Podobny UX do Storybook

**Alternatywa (minimalna):** Testowanie komponentów bezpośrednio w Vitest z `@testing-library/react`

---

### 6. **MSW v1 → MSW v2 (Sekcja 5)**
**Plan:** MSW dla mock serwery  
**Status:** ✅ **ZGADZAM SIĘ, ale uwaga na wersję**

**Uwaga:** Upewnij się, że używasz **MSW v2** (wydana 2024):
```json
{
  "devDependencies": {
    "msw": "^2.6.0"
  }
}
```

**Przykład mock dla RSS:**
```typescript
// src/__mocks__/rss.handlers.ts
import { http, HttpResponse } from 'msw';

export const rssHandlers = [
  http.get('https://feeds.bbci.co.uk/news/rss.xml', () => {
    return HttpResponse.xml(`
      <?xml version="1.0"?>
      <rss version="2.0">
        <channel>
          <item>
            <title>Test Article</title>
            <link>https://bbc.com/test</link>
            <pubDate>2025-11-17T10:00:00Z</pubDate>
          </item>
        </channel>
      </rss>
    `);
  }),
];
```

---

### 7. **Dodatkowe Narzędzie: Supabase Test Helpers**
**Plan:** Mock Supabase client  
**Status:** ⚠️ **BRAKUJE W PLANIE**

**Rekomendacja:** Użyj **Supabase Local Development** + **Supabase Test Helpers**

**Setup:**
```bash
# 1. Supabase local
npx supabase start

# 2. Test helpers
npm install -D @supabase/supabase-js vitest-mock-extended
```

**Przykład:**
```typescript
// src/__tests__/setup.ts
import { createClient } from '@supabase/supabase-js';

export const supabaseTest = createClient(
  'http://localhost:54321',
  'test-anon-key'
);

// Seed data przed testami
beforeAll(async () => {
  await supabaseTest.from('app.articles').delete().neq('id', '');
  await supabaseTest.from('app.articles').insert(testArticles);
});
```

**Zalety:**
- Prawdziwa baza (PostgreSQL), nie mock
- Izolacja testów (personal test DB)
- Reset między testami (truncate tables)

---

### 8. **Lighthouse CI → WebPageTest API (Alternatywa)**
**Plan:** Lighthouse CI dla performance  
**Status:** ✅ **ZGADZAM SIĘ**, ale dodaj alternatywę

**Rekomendacja:** Lighthouse CI (główne) + **WebPageTest API** (dodatkowe)

**Lighthouse CI (GitHub Actions):**
```yaml
- name: Lighthouse CI
  uses: treosh/lighthouse-ci-action@v12
  with:
    urls: |
      http://localhost:3000
      http://localhost:3000/login
    uploadArtifacts: true
    budgetPath: ./lighthouse-budget.json
```

**WebPageTest API (opcjonalne, dla dogłębnej analizy):**
- Testy z różnych lokalizacji geograficznych
- Prawdziwe urządzenia mobilne
- Darmowe dla 200 testów/miesiąc

---

## 📊 Porównanie Kosztów

| Narzędzie | Plan Oryginalny | Rekomendacja | Koszt (MVP) |
|-----------|-----------------|--------------|-------------|
| Unit/Integration | Vitest | ✅ Vitest | Darmowe |
| E2E | Playwright | ✅ Playwright | Darmowe |
| Bezpieczeństwo | OWASP ZAP | ⚠️ Snyk + Trivy | Darmowe (open-source) |
| Load Testing | Artillery | ⚠️ k6 | Darmowe |
| Visual Regression | Percy | ⚠️ Playwright Snapshots | Darmowe (vs $99/m) |
| Raportowanie | Allure | ⚠️ GitHub Actions | Darmowe (vs hosting) |
| Component Testing | Storybook | ⚠️ Historia | Darmowe |

**Oszczędność:** ~$200/miesiąc (Percy + hosting Allure)

---

## 🏗️ Rekomendowana Struktura Projektu

```
10x-PulseReader/
├── src/
│   ├── __tests__/               # Setup, helpers
│   │   ├── setup.ts             # Vitest global setup
│   │   ├── supabase.helpers.ts  # Supabase test utils
│   │   └── fixtures/            # Test data
│   ├── components/
│   │   └── __tests__/           # Component tests
│   ├── lib/
│   │   ├── services/
│   │   │   └── __tests__/       # Service unit tests
│   │   └── validation/
│   │       └── __tests__/       # Schema tests
│   └── pages/
│       └── api/
│           └── __tests__/       # API integration tests
├── tests/
│   ├── e2e/                     # Playwright E2E
│   │   ├── auth.spec.ts
│   │   ├── articles.spec.ts
│   │   └── homepage.spec.ts
│   ├── load/                    # k6 load tests
│   │   └── articles.load.js
│   └── visual/                  # Visual regression
│       └── snapshots.spec.ts
├── .github/
│   └── workflows/
│       ├── test.yml             # CI pipeline
│       └── security.yml         # Security scans
├── vitest.config.ts
├── playwright.config.ts
└── k6.config.js
```

---

## 🎯 Zaktualizowany Harmonogram (Faza 1-4)

### Faza 1 (Tydzień 1-2): Setup + Unit Tests
- ✅ Instalacja: Vitest, Happy-DOM, React Testing Library
- ✅ Konfiguracja: `vitest.config.ts`, setup files
- ✅ Testy jednostkowe: Auth, ArticleService, Validators
- ✅ Pokrycie: 70% coverage

**Estymacja:** 40 godzin

### Faza 2 (Tydzień 3-4): Integration + E2E
- ✅ Instalacja: Playwright, MSW v2
- ✅ Supabase local setup (test DB)
- ✅ Testy integracyjne: API endpoints, Database
- ✅ E2E: Krytyczne user flows (auth, feed)
- ✅ Pokrycie: 80% unit + 60% E2E

**Estymacja:** 50 godzin

### Faza 3 (Tydzień 5): Performance + Security
- ✅ Instalacja: k6, Snyk, Trivy
- ✅ Load tests: API endpoints (50 concurrent users)
- ✅ Security scans: Dependencies + SAST
- ✅ Visual regression: Key pages
- ✅ GitHub Actions: Full CI pipeline

**Estymacja:** 30 godzin

### Faza 4 (Tydzień 6): Stabilizacja
- ✅ Code review testów
- ✅ Dokumentacja: README, contributing
- ✅ Monitoring: GitHub Insights setup
- ✅ Buffer na bugfixy

**Estymacja:** 20 godzin

**TOTAL:** 140 godzin (vs 160-240 w oryginalnym planie)

---

## 📋 Checklist Implementacji

### Krok 1: Instalacja Dependencies
```bash
# Testing core
npm install -D vitest @vitest/ui happy-dom @testing-library/react @testing-library/user-event

# E2E
npm install -D @playwright/test

# Mocking
npm install -D msw

# Load testing
npm install -D k6

# Coverage
npm install -D @vitest/coverage-v8
```

### Krok 2: Konfiguracja
- [ ] `vitest.config.ts`
- [ ] `playwright.config.ts`
- [ ] `src/__tests__/setup.ts`
- [ ] `.github/workflows/test.yml`

### Krok 3: Pierwsze Testy
- [ ] Unit: `ArticleService.test.ts`
- [ ] Integration: `GET /api/articles.test.ts`
- [ ] E2E: `auth.spec.ts`

### Krok 4: CI/CD
- [ ] GitHub Actions workflow
- [ ] Coverage reporting
- [ ] PR checks

---

## 🎓 Najlepsze Praktyki (Dodatkowe)

### 1. Test Isolation
```typescript
// ✅ Good: Izolowane testy
beforeEach(async () => {
  await resetDatabase();
});

// ❌ Bad: Testy zależne od siebie
test('create article', async () => { /* ... */ });
test('get article', async () => { /* zakłada, że poprzedni test stworzył article */ });
```

### 2. Test Data Builders
```typescript
// src/__tests__/fixtures/article.builder.ts
export const buildArticle = (overrides = {}) => ({
  id: randomUUID(),
  title: 'Test Article',
  link: 'https://example.com/test',
  sourceId: testSourceId,
  publicationDate: new Date().toISOString(),
  ...overrides,
});
```

### 3. Custom Matchers
```typescript
// src/__tests__/matchers.ts
expect.extend({
  toBeValidArticleDto(received) {
    const schema = z.object({ id: z.string().uuid(), ... });
    const result = schema.safeParse(received);
    return {
      pass: result.success,
      message: () => result.success ? '' : result.error.message,
    };
  },
});

// Użycie
expect(article).toBeValidArticleDto();
```

---

## 🚀 Szybki Start (10 minut)

```bash
# 1. Instalacja
npm install -D vitest @vitest/ui happy-dom @playwright/test

# 2. Konfiguracja minimalna
cat > vitest.config.ts << 'EOF'
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
EOF

# 3. Pierwszy test
mkdir -p src/__tests__
cat > src/__tests__/example.test.ts << 'EOF'
import { describe, it, expect } from 'vitest';

describe('Example', () => {
  it('should pass', () => {
    expect(1 + 1).toBe(2);
  });
});
EOF

# 4. Uruchomienie
npm test
```

---

## 📈 Metryki Sukcesu (Zaktualizowane)

| Metryka | Target | Tool |
|---------|--------|------|
| Unit Coverage | >80% | Vitest |
| E2E Coverage | >70% | Playwright |
| Build Time (CI) | <5min | GitHub Actions |
| Test Execution | <2min | Vitest |
| Security Issues | 0 high/critical | Snyk + Trivy |
| Performance (p95) | <500ms | k6 |
| Visual Regressions | 0 | Playwright |

---

## 🔗 Przydatne Linki

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [k6 Documentation](https://k6.io/docs/)
- [MSW v2 Migration](https://mswjs.io/docs/migrations/1.x-to-2.x)
- [Snyk for GitHub](https://snyk.io/platform/github-security/)
- [Historia Docs](https://histoire.dev/)
- [Supabase Test Helpers](https://supabase.com/docs/guides/cli/local-development#test-helpers)

---

## ✅ Podsumowanie Rekomendacji

### ZAAKCEPTOWANE (6/9):
1. ✅ Vitest (unit/integration)
2. ✅ Playwright (E2E)
3. ✅ React Testing Library
4. ✅ GitHub Actions (CI/CD)
5. ✅ Zod (walidacja)
6. ✅ Lighthouse CI (performance)

### ZMIENIONE (3/9):
1. ⚠️ OWASP ZAP → **Snyk + Trivy** (bezpieczeństwo)
2. ⚠️ Artillery → **k6** (load testing)
3. ⚠️ Percy → **Playwright Snapshots** (visual regression)

### UPROSZCZONE (2/9):
1. ⚠️ Allure → **GitHub Actions Native**
2. ⚠️ Storybook → **Historia** (lub brak)

### DODANE:
1. ➕ MSW v2 (API mocking)
2. ➕ Supabase Local + Test Helpers
3. ➕ Test data builders pattern

---

## 🎯 Następne Kroki

1. **Przegląd zespołowy:** Omówienie propozycji
2. **Proof of Concept:** Implementacja 1 testu każdego typu
3. **Aktualizacja planu:** Dostosowanie harmonogramu
4. **Kick-off:** Start Fazy 1

**Data docelowa startu:** Grudzień 2025

