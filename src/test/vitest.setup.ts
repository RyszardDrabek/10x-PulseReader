import "@testing-library/jest-dom";
import { beforeAll, afterEach, afterAll } from "vitest";
import { setupServer } from "msw/node";
import { handlers } from "./msw-handlers";

// MSW setup for API mocking
const server = setupServer(...handlers);

// Establish API mocking before all tests
beforeAll(() => {
  server.listen({
    onUnhandledRequest: "warn", // Log unhandled requests instead of erroring
  });
});

// Reset any request handlers that we may add during the tests
afterEach(() => {
  server.resetHandlers();
});

// Clean up after all tests are done
afterAll(() => {
  server.close();
});

// Mock window.matchMedia (required for some UI libraries)
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    addListener: () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    removeListener: () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    addEventListener: () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    removeEventListener: () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    dispatchEvent: () => {},
  }),
});

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  observe() {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  unobserve() {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  disconnect() {}
};

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-useless-constructor
  constructor() {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  observe() {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  unobserve() {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  disconnect() {}
};

// Mock window.scrollTo
Object.defineProperty(window, "scrollTo", {
  writable: true,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  value: () => {},
});

// Suppress console errors during tests unless explicitly testing for them
// eslint-disable-next-line no-console
const originalError = console.error;
beforeAll(() => {
  // eslint-disable-next-line no-console, @typescript-eslint/no-explicit-any
  console.error = (...args: any[]) => {
    if (typeof args[0] === "string" && args[0].includes("Warning:") && args[0].includes("was not wrapped in act")) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  // eslint-disable-next-line no-console
  console.error = originalError;
});
