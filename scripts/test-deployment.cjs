#!/usr/bin/env node

/**
 * Deployment Testing Script for PulseReader
 *
 * This script helps test the Cloudflare deployment by making requests
 * to various endpoints and checking the responses and logs.
 */

const https = require("https");
const http = require("http");

// Configuration
const BASE_URL = (process.env.DEPLOYMENT_URL || "https://10x-pulsereader.pages.dev").replace(/\/$/, "");
const SUPABASE_KEY = process.env.PUBLIC_SUPABASE_KEY;

if (!SUPABASE_KEY) {
  console.error("Please set PUBLIC_SUPABASE_KEY environment variable");
  process.exit(1);
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith("https:") ? https : http;

    const req = protocol.request(
      url,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
          "User-Agent": "PulseReader-Deployment-Test/1.0",
        },
        ...options,
      },
      (res) => {
        let data = "";

        console.log(`\n📡 Request: ${options.method || "GET"} ${url}`);
        console.log(`📊 Status: ${res.statusCode}`);
        console.log(`🔍 Headers:`, JSON.stringify(res.headers, null, 2));

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          try {
            const jsonData = JSON.parse(data);
            console.log(`📄 Response:`, JSON.stringify(jsonData, null, 2));
            resolve({ status: res.statusCode, data: jsonData, headers: res.headers });
          } catch (_e) {
            console.log(`📄 Response (raw):`, data);
            resolve({ status: res.statusCode, data, headers: res.headers });
          }
        });
      }
    );

    req.on("error", (err) => {
      console.error(`❌ Request failed: ${err.message}`);
      reject(err);
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

async function testEndpoints() {
  console.log("🚀 Starting PulseReader Deployment Tests");
  console.log("=".repeat(50));

  try {
    // Test 1: Basic homepage access
    console.log("\n1️⃣ Testing homepage access...");
    await makeRequest(`${BASE_URL}/`);

    // Test 2: Public API endpoint (articles without auth)
    console.log("\n2️⃣ Testing public articles endpoint...");
    await makeRequest(`${BASE_URL}/api/articles`);

    // Test 3: Protected endpoint (should fail without proper auth)
    console.log("\n3️⃣ Testing protected endpoint without auth...");
    try {
      await makeRequest(`${BASE_URL}/api/profile`);
    } catch (_e) {
      console.log("✅ Expected failure for protected endpoint");
    }

    // Test 4: Service role access (if you have the key)
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.log("\n4️⃣ Testing service role access...");
      await makeRequest(`${BASE_URL}/api/articles`, {
        headers: {
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: {
          title: "Test Article",
          link: `https://example.com/test-${Date.now()}`,
          content: "Test content",
          sourceId: "test-source",
          topicIds: [],
        },
        method: "POST",
      });
    }

    console.log("\n✅ All tests completed!");
    console.log("\n📋 Next steps:");
    console.log("1. Go to Cloudflare Dashboard → Workers & Pages → 10x-pulsereader → Functions tab");
    console.log("2. Look for TRACE logs prefixed with [CF-RAY-ID] - these are most visible");
    console.log("3. Check Monitoring → Logs for detailed structured JSON logs");
    console.log("4. Monitor for any ERROR or WARN entries");
  } catch (error) {
    console.error("❌ Test suite failed:", error);
  }
}

// Run tests if called directly
if (require.main === module) {
  testEndpoints();
}

module.exports = { testEndpoints, makeRequest };
