/* eslint-disable no-undef, no-console, @typescript-eslint/no-unused-vars */

// k6 load testing script - uses k6 globals and APIs
import http from "k6/http";
import { check, sleep } from "k6";

// Test configuration
export const options = {
  stages: [
    { duration: "2m", target: 100 }, // Ramp up to 100 users over 2 minutes
    { duration: "5m", target: 100 }, // Stay at 100 users for 5 minutes
    { duration: "2m", target: 200 }, // Ramp up to 200 users over 2 minutes
    { duration: "5m", target: 200 }, // Stay at 200 users for 5 minutes
    { duration: "2m", target: 0 }, // Ramp down to 0 users over 2 minutes
  ],
  thresholds: {
    http_req_duration: ["p(95)<500"], // 95% of requests should be below 500ms
    http_req_failed: ["rate<0.1"], // Error rate should be below 10%
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000"; // __ENV is a k6 global

export default function () {
  // Homepage load test
  const homepageResponse = http.get(`${BASE_URL}/`);
  check(homepageResponse, {
    "homepage status is 200": (r) => r.status === 200,
    "homepage response time < 1000ms": (r) => r.timings.duration < 1000,
  });

  // API endpoint test
  const apiResponse = http.get(`${BASE_URL}/api/articles`);
  check(apiResponse, {
    "API status is 200": (r) => r.status === 200,
    "API response time < 500ms": (r) => r.timings.duration < 500,
  });

  // Simulate user behavior
  sleep(Math.random() * 3 + 1); // Random sleep between 1-4 seconds
}

// Setup function (runs before the test starts)
export function setup() {
  console.log("Starting load test...");
  return {};
}

// Teardown function (runs after the test ends)
export function teardown(data) {
  console.log("Load test completed.");
}
