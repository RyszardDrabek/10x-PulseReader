# Przykładowe Konfiguracje Narzędzi Testowych

## 1. Vitest Configuration

### vitest.config.ts
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', '.astro', 'tests/e2e'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules',
        'src/__tests__',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        'dist',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
```

### src/__tests__/setup.ts
```typescript
import { afterAll, afterEach, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import { server } from './mocks/server';
import '@testing-library/jest-dom/vitest';

// MSW Setup
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  cleanup();
});
afterAll(() => server.close());

// Supabase test client setup
import { createClient } from '@supabase/supabase-js';

export const supabaseTest = createClient(
  process.env.SUPABASE_URL || 'http://127.0.0.1:54321',
  process.env.SUPABASE_ANON_KEY || 'test-key'
);

// Global test utilities
export const resetTestDatabase = async () => {
  await supabaseTest.from('app.articles').delete().neq('id', '');
  await supabaseTest.from('app.profiles').delete().neq('user_id', '');
};
```

### package.json scripts
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest --watch"
  }
}
```

---

## 2. Playwright Configuration

### playwright.config.ts
```typescript
import { defineConfig, devices } from '@playwright/test';

const PORT = process.env.PORT || 3000;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results.json' }],
    ['github'], // dla GitHub Actions
  ],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 13'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

### tests/e2e/auth.spec.ts (przykład)
```typescript
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should register new user', async ({ page }) => {
    await page.goto('/register');
    
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'SecurePass123!');
    await page.fill('input[name="confirmPassword"]', 'SecurePass123!');
    
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL('/verify-email');
    await expect(page.locator('text=Check your email')).toBeVisible();
  });

  test('should login existing user', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('input[name="email"]', 'existing@example.com');
    await page.fill('input[name="password"]', 'Password123!');
    
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL('/');
    await expect(page.locator('nav >> text=Logout')).toBeVisible();
  });
});
```

### package.json scripts
```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug",
    "test:e2e:report": "playwright show-report"
  }
}
```

---

## 3. MSW v2 Configuration

### src/__tests__/mocks/server.ts
```typescript
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

### src/__tests__/mocks/browser.ts
```typescript
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);
```

### src/__tests__/mocks/handlers.ts
```typescript
import { http, HttpResponse } from 'msw';

export const handlers = [
  // RSS Feed Mock
  http.get('https://feeds.bbci.co.uk/news/rss.xml', () => {
    return HttpResponse.xml(`
      <?xml version="1.0" encoding="UTF-8"?>
      <rss version="2.0">
        <channel>
          <title>BBC News</title>
          <item>
            <title>Breaking: AI reaches new milestone</title>
            <link>https://bbc.com/news/technology-12345</link>
            <description>Artificial intelligence has achieved...</description>
            <pubDate>Sun, 17 Nov 2025 10:00:00 GMT</pubDate>
          </item>
        </channel>
      </rss>
    `);
  }),

  // OpenRouter AI Mock
  http.post('https://openrouter.ai/api/v1/chat/completions', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      id: 'chatcmpl-test',
      choices: [{
        message: {
          role: 'assistant',
          content: JSON.stringify({
            sentiment: 'positive',
            topics: ['technology', 'artificial-intelligence'],
            confidence: 0.92,
          }),
        },
      }],
    });
  }),

  // Supabase Mock (opcjonalnie, jeśli nie używasz lokalnej instancji)
  http.get('http://127.0.0.1:54321/rest/v1/articles', () => {
    return HttpResponse.json({
      data: [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          title: 'Test Article',
          link: 'https://example.com/test',
          publication_date: '2025-11-17T10:00:00Z',
          sentiment: 'positive',
        },
      ],
    });
  }),
];
```

---

## 4. k6 Load Testing

### tests/load/articles.load.js
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const articleLoadTime = new Trend('article_load_time');

export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Warm-up
    { duration: '1m', target: 50 },   // Ramp-up
    { duration: '3m', target: 50 },   // Sustained load
    { duration: '30s', target: 0 },   // Ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.05'], // <5% błędów
    errors: ['rate<0.1'],
    article_load_time: ['p(95)<400'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  // Test 1: Get articles (anonymous)
  const articlesRes = http.get(`${BASE_URL}/api/articles?limit=20&offset=0`);
  
  check(articlesRes, {
    'status is 200': (r) => r.status === 200,
    'has articles': (r) => JSON.parse(r.body).data.length > 0,
    'response time < 500ms': (r) => r.timings.duration < 500,
  }) || errorRate.add(1);

  articleLoadTime.add(articlesRes.timings.duration);

  sleep(1);

  // Test 2: Filter by sentiment
  const filteredRes = http.get(`${BASE_URL}/api/articles?sentiment=positive&limit=20`);
  
  check(filteredRes, {
    'filtered status is 200': (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(1);

  // Test 3: Pagination
  const paginatedRes = http.get(`${BASE_URL}/api/articles?limit=20&offset=20`);
  
  check(paginatedRes, {
    'paginated status is 200': (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(2);
}

// Scenarios (advanced)
export const scenarios = {
  read_heavy: {
    executor: 'constant-vus',
    vus: 30,
    duration: '2m',
    exec: 'default',
  },
  spike_test: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '10s', target: 100 }, // Spike
      { duration: '1m', target: 100 },  // Sustain
      { duration: '10s', target: 0 },   // Cool down
    ],
    startTime: '3m',
  },
};
```

### Uruchomienie
```bash
# Lokalne
k6 run tests/load/articles.load.js

# Z custom URL
k6 run --env BASE_URL=https://staging.pulsereader.com tests/load/articles.load.js

# Z outputem do JSON
k6 run --out json=results.json tests/load/articles.load.js
```

---

## 5. GitHub Actions CI/CD

### .github/workflows/test.yml
```yaml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

env:
  NODE_VERSION: '22.14.0'

jobs:
  unit-tests:
    name: Unit & Integration Tests
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: supabase/postgres:15.1.0.117
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Start Supabase local
        run: |
          npx supabase start
          npx supabase db reset

      - name: Run unit tests
        run: npm run test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/lcov.info
          fail_ci_if_error: true

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-results
          path: |
            coverage/
            test-results.json

  e2e-tests:
    name: E2E Tests
    runs-on: ubuntu-latest
    needs: unit-tests
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Start Supabase local
        run: npx supabase start

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload Playwright report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30

  security-scan:
    name: Security Scan
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4

      - name: Run Snyk scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high

      - name: Run Trivy scan
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'

      - name: Upload Trivy results
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: 'trivy-results.sarif'

  performance:
    name: Performance Tests
    runs-on: ubuntu-latest
    if: github.event_name == 'push'
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Install k6
        run: |
          curl https://github.com/grafana/k6/releases/download/v0.48.0/k6-v0.48.0-linux-amd64.tar.gz -L | tar xvz
          sudo cp k6-v0.48.0-linux-amd64/k6 /usr/bin

      - name: Start application
        run: |
          npm ci
          npm run build
          npm run preview &
          sleep 10

      - name: Run k6 load tests
        run: k6 run tests/load/articles.load.js

      - name: Lighthouse CI
        uses: treosh/lighthouse-ci-action@v12
        with:
          urls: |
            http://localhost:4321
            http://localhost:4321/login
          uploadArtifacts: true
          budgetPath: ./lighthouse-budget.json
```

---

## 6. Lighthouse Budget

### lighthouse-budget.json
```json
{
  "budgets": [
    {
      "path": "/*",
      "timings": [
        {
          "metric": "first-contentful-paint",
          "budget": 2000
        },
        {
          "metric": "largest-contentful-paint",
          "budget": 2500
        },
        {
          "metric": "time-to-interactive",
          "budget": 3500
        },
        {
          "metric": "cumulative-layout-shift",
          "budget": 0.1
        }
      ],
      "resourceCounts": [
        {
          "resourceType": "script",
          "budget": 10
        },
        {
          "resourceType": "stylesheet",
          "budget": 5
        },
        {
          "resourceType": "image",
          "budget": 20
        }
      ],
      "resourceSizes": [
        {
          "resourceType": "script",
          "budget": 300
        },
        {
          "resourceType": "stylesheet",
          "budget": 100
        },
        {
          "resourceType": "total",
          "budget": 1000
        }
      ]
    }
  ]
}
```

---

## 7. Historia Configuration (Component Library)

### histoire.config.ts
```typescript
import { defineConfig } from 'histoire';
import { HstReact } from '@histoire/plugin-react';

export default defineConfig({
  plugins: [HstReact()],
  setupFile: './src/histoire.setup.ts',
  tree: {
    groups: [
      {
        id: 'ui',
        title: 'UI Components',
      },
      {
        id: 'features',
        title: 'Feature Components',
      },
    ],
  },
  theme: {
    title: 'PulseReader Components',
    colors: {
      primary: { 50: '#eff6ff', 500: '#3b82f6', 900: '#1e3a8a' },
    },
  },
});
```

### src/components/ui/button.story.tsx (przykład)
```tsx
import { Button } from './button';

export default {
  title: 'UI/Button',
  component: Button,
};

export const Primary = () => <Button>Click me</Button>;

export const Variants = () => (
  <div className="flex gap-2">
    <Button variant="default">Default</Button>
    <Button variant="destructive">Destructive</Button>
    <Button variant="outline">Outline</Button>
    <Button variant="ghost">Ghost</Button>
    <Button variant="link">Link</Button>
  </div>
);

export const Sizes = () => (
  <div className="flex items-center gap-2">
    <Button size="sm">Small</Button>
    <Button size="default">Default</Button>
    <Button size="lg">Large</Button>
  </div>
);
```

---

## 8. Test Data Builders

### src/__tests__/fixtures/builders.ts
```typescript
import { randomUUID } from 'crypto';
import type { ArticleEntity, UserProfile } from '@/types';

export class ArticleBuilder {
  private article: Partial<ArticleEntity> = {};

  static create() {
    return new ArticleBuilder();
  }

  withDefaults(): this {
    this.article = {
      id: randomUUID(),
      title: 'Test Article',
      link: `https://example.com/${randomUUID()}`,
      description: 'Test description',
      sourceId: randomUUID(),
      publicationDate: new Date().toISOString(),
      sentiment: 'neutral',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return this;
  }

  withTitle(title: string): this {
    this.article.title = title;
    return this;
  }

  withSentiment(sentiment: 'positive' | 'neutral' | 'negative'): this {
    this.article.sentiment = sentiment;
    return this;
  }

  withSource(sourceId: string): this {
    this.article.sourceId = sourceId;
    return this;
  }

  build(): ArticleEntity {
    if (!this.article.id) {
      this.withDefaults();
    }
    return this.article as ArticleEntity;
  }
}

export class ProfileBuilder {
  private profile: Partial<UserProfile> = {};

  static create() {
    return new ProfileBuilder();
  }

  withDefaults(): this {
    this.profile = {
      userId: randomUUID(),
      mood: 'neutral',
      blocklist: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return this;
  }

  withMood(mood: 'positive' | 'neutral' | 'negative'): this {
    this.profile.mood = mood;
    return this;
  }

  withBlocklist(items: string[]): this {
    this.profile.blocklist = items;
    return this;
  }

  build(): UserProfile {
    if (!this.profile.userId) {
      this.withDefaults();
    }
    return this.profile as UserProfile;
  }
}

// Usage:
// const article = ArticleBuilder.create()
//   .withDefaults()
//   .withTitle('Custom Title')
//   .withSentiment('positive')
//   .build();
```

---

## 9. Custom Test Utilities

### src/__tests__/utils/test-utils.tsx
```tsx
import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Custom render with providers
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  const queryClient = createTestQueryClient();

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  return render(ui, { wrapper: Wrapper, ...options });
}

// Re-export everything
export * from '@testing-library/react';
export { renderWithProviders as render };
```

### Użycie:
```typescript
import { render, screen } from '@/__tests__/utils/test-utils';
import { ArticleList } from '@/components/ArticleList';

test('renders article list', () => {
  render(<ArticleList />);
  expect(screen.getByText('Articles')).toBeInTheDocument();
});
```

---

## 10. Snyk Configuration

### .snyk
```yaml
version: v1.25.0
language-settings:
  javascript:
    ignoreUnfixed: true
exclude:
  global:
    - node_modules/**
    - dist/**
    - .astro/**
```

---

## Podsumowanie Instalacji

```bash
# 1. Core testing
npm install -D vitest @vitest/ui @vitest/coverage-v8 happy-dom

# 2. React testing
npm install -D @testing-library/react @testing-library/user-event @testing-library/jest-dom

# 3. E2E
npm install -D @playwright/test

# 4. Mocking
npm install -D msw

# 5. Historia (optional)
npm install -D histoire @histoire/plugin-react

# 6. k6 (system install)
# https://k6.io/docs/get-started/installation/

# 7. Utilities
npm install -D @faker-js/faker
```

**Total size:** ~150MB (dev dependencies)

