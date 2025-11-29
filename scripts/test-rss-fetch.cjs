#!/usr/bin/env node

/**
 * RSS Fetch Testing Script for PulseReader
 *
 * This script tests the RSS fetching endpoint by making a POST request
 * to /api/cron/fetch-rss with service role authentication.
 */

const https = require("https");
const http = require("http");

// Configuration
const BASE_URL = (process.env.DEPLOYMENT_URL || "https://10x-pulsereader.pages.dev").replace(/\/$/, "");
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error("❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable is not set");
  console.error("\nTo test RSS fetching, you need to set the service role key:");
  console.error("  export SUPABASE_SERVICE_ROLE_KEY='your-service-role-key'");
  console.error("  node scripts/test-rss-fetch.cjs");
  console.error("\nOr pass it directly:");
  console.error("  SUPABASE_SERVICE_ROLE_KEY='your-key' node scripts/test-rss-fetch.cjs");
  process.exit(1);
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith("https:") ? https : http;

    const req = protocol.request(
      url,
      {
        method: options.method || "GET",
        headers: {
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
          "User-Agent": "PulseReader-RSS-Fetch-Test/1.0",
          ...(OPENROUTER_API_KEY && { "X-OpenRouter-API-Key": OPENROUTER_API_KEY }),
          ...options.headers,
        },
        ...options,
      },
      (res) => {
        let data = "";

        console.log(`\n📡 Request: ${options.method || "GET"} ${url}`);
        console.log(`📊 Status: ${res.statusCode} ${res.statusMessage}`);
        console.log(`⏱️  Response Time: ${new Date().toISOString()}`);

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

async function testRssFetch() {
  console.log("🚀 Testing RSS Feed Fetching");
  console.log("=".repeat(60));
  console.log(`📍 Endpoint: ${BASE_URL}/api/cron/fetch-rss`);
  console.log(`🔑 Using service role key: ${SERVICE_ROLE_KEY.substring(0, 20)}...`);
  console.log("=".repeat(60));

  try {
    const startTime = Date.now();
    const response = await makeRequest(`${BASE_URL}/api/cron/fetch-rss`, {
      method: "POST",
      body: {},
    });

    const duration = Date.now() - startTime;

    console.log("\n" + "=".repeat(60));
    console.log("📊 Test Results");
    console.log("=".repeat(60));
    console.log(`✅ Status Code: ${response.status}`);
    console.log(`⏱️  Duration: ${duration}ms`);

    if (response.status === 200 && response.data) {
      const result = response.data;
      console.log(`\n📈 Processing Summary:`);
      console.log(`   • Sources Processed: ${result.processed || 0}`);
      console.log(`   • Sources Succeeded: ${result.succeeded || 0}`);
      console.log(`   • Sources Failed: ${result.failed || 0}`);
      console.log(`   • Articles Created: ${result.articlesCreated || 0}`);
      console.log(`   • Sources Skipped: ${result.skippedSources || 0}`);
      console.log(`   • Has More Work: ${result.hasMoreWork ? "Yes" : "No"}`);
      console.log(`   • Stopped Early: ${result.stoppedEarly ? "Yes" : "No"}`);
      console.log(`   • Total Subrequests: ${result.totalSubrequests || "N/A"}`);

      if (result.errors && result.errors.length > 0) {
        console.log(`\n⚠️  Errors:`);
        result.errors.forEach((error, index) => {
          console.log(`   ${index + 1}. ${error.sourceName} (${error.sourceId}): ${error.error}`);
        });
      }

      if (result.skippedArticles && result.skippedArticles.length > 0) {
        console.log(`\n⏭️  Skipped Articles:`);
        result.skippedArticles.forEach((skip, index) => {
          console.log(`   ${index + 1}. ${skip.sourceName}: ${skip.skippedCount} articles skipped`);
        });
      }

      console.log("\n✅ RSS fetch test completed successfully!");
    } else if (response.status === 401) {
      console.error("\n❌ Authentication failed!");
      console.error("   Make sure SUPABASE_SERVICE_ROLE_KEY is correct");
      process.exit(1);
    } else {
      console.error(`\n❌ Unexpected response: ${response.status}`);
      process.exit(1);
    }

    console.log("\n📋 Next steps:");
    console.log("1. Check Cloudflare Dashboard → Workers & Pages → Functions tab for logs");
    console.log("2. Verify articles were created in your database");
    console.log("3. Check RSS sources' last_fetched_at timestamps");
  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
    if (error.stack) {
      console.error("\nStack trace:", error.stack);
    }
    process.exit(1);
  }
}

// Run test if called directly
if (require.main === module) {
  testRssFetch();
}

module.exports = { testRssFetch, makeRequest };
