# Testing Guide

This project implements a comprehensive testing strategy using modern testing tools as specified in the tech stack.

## 🧪 Testing Stack

### Unit & Integration Testing

- **Vitest 2.x** - Fast, modern test runner built on Vite
- **Happy DOM** - Lightweight DOM environment for React component testing
- **Testing Library** - Behavioral testing for React components
- **MSW (Mock Service Worker)** - API mocking for isolated testing
- **@vitest/coverage-v8** - Code coverage reporting (>80% target)

### End-to-End Testing

- **Playwright 1.x** - Multi-browser e2e testing (Chrome, Firefox, Safari, Mobile)
- **Visual testing** - Screenshot comparison and video recording
- **API testing** - Full application flow testing

### Performance & Load Testing

- **Lighthouse CI** - Performance monitoring (FCP <2s, LCP <2.5s, TTI <3.5s)
- **k6** - Load testing with Grafana metrics (p50/p95/p99)

### Security & Quality

- **Snyk** - Dependency vulnerability scanning
- **npm audit** - Built-in security auditing
- **Trivy** - Container security scanning (when containerized)
- **ESLint** - Code quality and consistency

### Documentation & Coverage

- **Codecov** - Coverage trend tracking
- **Historia** - Interactive UI component documentation

## 🚀 Quick Start

### Running Tests

```bash
# Run all unit tests
npm run test:unit

# Run unit tests in watch mode
npm run test:unit:watch

# Run unit tests with coverage
npm run test:unit:coverage

# Run e2e tests
npm run test:e2e

# Run e2e tests in UI mode (interactive)
npm run test:e2e:ui

# Run e2e tests in debug mode
npm run test:e2e:debug

# Run all tests (unit + e2e)
npm run test:all

# Run tests for CI (with coverage)
npm run test:ci
```

### Additional Tools

```bash
# Performance testing with Lighthouse
npm run performance

# Load testing with k6
npm run load-test

# Security scanning
npm run security

# Upload coverage to Codecov
npm run coverage:upload

# Run Storybook for component documentation
npm run storybook
```

## 📁 Project Structure

```
src/
├── test/
│   ├── vitest.setup.ts      # Vitest global setup
│   ├── test-utils.tsx       # Testing utilities and providers
│   └── msw-handlers.ts      # MSW API mock handlers
├── lib/
│   └── services/
│       └── __tests__/       # Unit tests for services
└── pages/
    └── api/
        └── articles/
            └── __tests__/   # API endpoint tests

e2e/
├── global-setup.ts          # E2E global setup
├── global-teardown.ts       # E2E global cleanup
└── *.spec.ts               # E2E test files
```

## 🛠️ Configuration Files

- `vitest.config.ts` - Unit test configuration
- `playwright.config.ts` - E2E test configuration
- `lighthouserc.js` - Performance test configuration
- `load-test.js` - Load test script

## 📝 Writing Tests

### Unit Tests

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@test/test-utils';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });
});
```

### E2E Tests

```typescript
import { test, expect } from "@playwright/test";

test("homepage loads", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toBeVisible();
});
```

### API Mocking with MSW

```typescript
import { rest } from "msw";
import { server } from "@test/test-utils";

describe("API Tests", () => {
  it("fetches articles", async () => {
    server.use(
      rest.get("/api/articles", (req, res, ctx) => {
        return res(ctx.json(mockArticles));
      })
    );

    // Your test code
  });
});
```

## 🎯 Test Categories

### Unit Tests

- Component rendering and interactions
- Service layer logic
- Utility functions
- Validation logic

### Integration Tests

- Component interactions with services
- API endpoint testing
- Database operations

### E2E Tests

- User journeys (registration, login, article browsing)
- Critical user flows
- Cross-browser compatibility

## 📊 Coverage Goals

- **Statements**: >80%
- **Branches**: >80%
- **Functions**: >80%
- **Lines**: >80%

Coverage reports are generated in `./coverage/` directory.

## 🔒 Security Testing

### Automated Security Checks

- **npm audit** - Dependency vulnerabilities
- **Snyk** - Advanced vulnerability scanning
- **Trivy** - Container security (when applicable)

### Manual Security Considerations

- Authentication bypass testing
- Authorization testing
- Input validation testing
- XSS prevention testing

## 🚀 CI/CD Integration

Tests are designed to run in CI/CD pipelines:

1. **Unit Tests** - Run on every push/PR
2. **E2E Tests** - Run on main branch and releases
3. **Performance Tests** - Run weekly/daily
4. **Security Scans** - Run on dependencies changes

## 🐛 Debugging Tests

### Unit Tests

```bash
# Run specific test file
npm run test:unit src/lib/services/__tests__/article.service.test.ts

# Run tests matching pattern
npm run test:unit -t "should create article"
```

### E2E Tests

```bash
# Run tests in headed mode (see browser)
npm run test:e2e:headed

# Run specific test file
npm run test:e2e e2e/homepage.spec.ts

# Debug mode
npm run test:e2e:debug
```

## 📋 Best Practices

### General

- Write descriptive test names
- Use `describe` blocks to group related tests
- Keep tests isolated and independent
- Use meaningful assertions

### React Testing

- Use `@testing-library/react` for behavioral testing
- Avoid testing implementation details
- Use `data-testid` for elements that need testing
- Mock external dependencies

### API Testing

- Use MSW for API mocking in unit tests
- Test both success and error scenarios
- Verify correct request parameters
- Test response structure

### E2E Testing

- Keep tests focused on user journeys
- Use realistic test data
- Avoid flaky tests (timeouts, animations)
- Clean up test data between runs

## 🔧 Maintenance

### Updating Test Dependencies

```bash
npm update vitest @testing-library/react playwright
```

### Adding New Test Types

1. Create test file in appropriate directory
2. Follow naming convention: `*.test.ts` or `*.spec.ts`
3. Import necessary utilities from `@test/test-utils`
4. Add to CI/CD pipeline if needed

### Troubleshooting

- Clear node_modules and reinstall if tests fail
- Check MSW handlers are correctly configured
- Verify test database is properly seeded
- Check browser versions in Playwright

## 📚 Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Playwright Documentation](https://playwright.dev/)
- [MSW Documentation](https://mswjs.io/)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
- [k6 Documentation](https://k6.io/docs/)

---

For questions about testing setup or conventions, please check this guide or ask the development team.
