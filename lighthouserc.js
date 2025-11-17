/* eslint-disable no-undef */

// CommonJS configuration file for Lighthouse CI
module.exports = {
  ci: {
    collect: {
      numberOfRuns: 3,
      startServerCommand: "npm run dev",
      startServerReadyPattern: "ready - started server on",
      url: ["http://localhost:3000"],
      settings: {
        preset: "desktop",
        throttling: {
          rttMs: 40,
          throughputKbps: 10240,
          cpuSlowdownMultiplier: 1,
        },
      },
    },
    assert: {
      assertions: {
        "categories:performance": ["error", { minScore: 0.8 }],
        "categories:accessibility": ["error", { minScore: 0.9 }],
        "categories:best-practices": ["error", { minScore: 0.9 }],
        "categories:seo": ["error", { minScore: 0.9 }],
        "categories:pwa": "off",
      },
    },
    upload: {
      target: "temporary-public-storage",
    },
  },
};
