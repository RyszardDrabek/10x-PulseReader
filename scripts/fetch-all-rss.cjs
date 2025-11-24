#!/usr/bin/env node
/* eslint-env node */

/**
 * RSS Fetch All Script for PulseReader
 *
 * This script calls the RSS fetch endpoint repeatedly until all sources are processed.
 * It handles retries with delays and stops when there's no more work to do.
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY='your-key' node scripts/fetch-all-rss.cjs
 *   SUPABASE_SERVICE_ROLE_KEY='your-key' DEPLOYMENT_URL='https://your-app.pages.dev' node scripts/fetch-all-rss.cjs
 */

const https = require("https");
const http = require("http");

// Configuration
const BASE_URL = (process.env.DEPLOYMENT_URL || "https://10x-pulsereader.pages.dev").replace(/\/$/, "");
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RETRY_DELAY_MS = parseInt(process.env.RETRY_DELAY_MS || "2000", 10); // 2 seconds default
const MAX_RETRIES = parseInt(process.env.MAX_RETRIES || "50", 10); // Max 50 calls to prevent infinite loops

if (!SERVICE_ROLE_KEY) {
  console.error("❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable is not set");
  console.error("\nTo fetch all RSS feeds, you need to set the service role key:");
  console.error("  export SUPABASE_SERVICE_ROLE_KEY='your-service-role-key'");
  console.error("  node scripts/fetch-all-rss.cjs");
  console.error("\nOr pass it directly:");
  console.error("  SUPABASE_SERVICE_ROLE_KEY='your-key' node scripts/fetch-all-rss.cjs");
  process.exit(1);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
          "User-Agent": "PulseReader-RSS-Fetch-All/1.0",
          ...options.headers,
        },
        ...options,
      },
      (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          try {
            const jsonData = JSON.parse(data);
            resolve({ status: res.statusCode, data: jsonData, headers: res.headers });
          } catch (_e) {
            resolve({ status: res.statusCode, data, headers: res.headers });
          }
        });
      }
    );

    req.on("error", (err) => {
      reject(err);
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

async function fetchRssBatch(batchNumber) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`🔄 Batch ${batchNumber}: Fetching RSS feeds...`);
  console.log(`${"=".repeat(60)}`);

  try {
    const startTime = Date.now();
    const response = await makeRequest(`${BASE_URL}/api/cron/fetch-rss`, {
      method: "POST",
      body: {},
    });

    const duration = Date.now() - startTime;

    if (response.status !== 200) {
      console.error(`❌ Batch ${batchNumber} failed with status ${response.status}`);
      console.error("Response:", JSON.stringify(response.data, null, 2));
      return { success: false, hasMoreWork: false };
    }

    const result = response.data;

    console.log(`\n📊 Batch ${batchNumber} Results:`);
    console.log(`   ✅ Status: ${response.status}`);
    console.log(`   ⏱️  Duration: ${duration}ms`);
    console.log(`   📰 Sources Processed: ${result.processed || 0}`);
    console.log(`   ✅ Sources Succeeded: ${result.succeeded || 0}`);
    console.log(`   ❌ Sources Failed: ${result.failed || 0}`);
    console.log(`   📄 Articles Created: ${result.articlesCreated || 0}`);
    console.log(`   ⏭️  Sources Skipped: ${result.skippedSources || 0}`);
    console.log(`   🔄 Has More Work: ${result.hasMoreWork ? "Yes" : "No"}`);
    console.log(`   ⚠️  Stopped Early: ${result.stoppedEarly ? "Yes" : "No"}`);
    if (result.totalSubrequests !== undefined) {
      console.log(`   📊 Total Subrequests: ${result.totalSubrequests}`);
    }

    if (result.errors && result.errors.length > 0) {
      console.log(`\n   ⚠️  Errors (${result.errors.length}):`);
      result.errors.forEach((error, index) => {
        console.log(`      ${index + 1}. ${error.sourceName}: ${error.error}`);
      });
    }

    if (result.skippedArticles && result.skippedArticles.length > 0) {
      console.log(`\n   ⏭️  Skipped Articles:`);
      result.skippedArticles.forEach((skip, index) => {
        console.log(`      ${index + 1}. ${skip.sourceName}: ${skip.skippedCount} articles`);
      });
    }

    return {
      success: true,
      hasMoreWork: result.hasMoreWork || false,
      result,
    };
  } catch (error) {
    console.error(`❌ Batch ${batchNumber} request failed:`, error.message);
    return { success: false, hasMoreWork: false };
  }
}

async function fetchAllRss() {
  console.log("🚀 RSS Fetch All - Processing All Sources");
  console.log("=".repeat(60));
  console.log(`📍 Endpoint: ${BASE_URL}/api/cron/fetch-rss`);
  console.log(`⏱️  Retry Delay: ${RETRY_DELAY_MS}ms`);
  console.log(`🔄 Max Retries: ${MAX_RETRIES}`);
  console.log("=".repeat(60));

  const summary = {
    totalBatches: 0,
    totalProcessed: 0,
    totalSucceeded: 0,
    totalFailed: 0,
    totalArticlesCreated: 0,
    totalSourcesSkipped: 0,
    errors: [],
  };

  let batchNumber = 1;
  let hasMoreWork = true;

  while (hasMoreWork && batchNumber <= MAX_RETRIES) {
    const batchResult = await fetchRssBatch(batchNumber);

    if (!batchResult.success) {
      console.error(`\n❌ Batch ${batchNumber} failed. Stopping.`);
      break;
    }

    // Update summary
    summary.totalBatches++;
    if (batchResult.result) {
      summary.totalProcessed += batchResult.result.processed || 0;
      summary.totalSucceeded += batchResult.result.succeeded || 0;
      summary.totalFailed += batchResult.result.failed || 0;
      summary.totalArticlesCreated += batchResult.result.articlesCreated || 0;
      summary.totalSourcesSkipped += batchResult.result.skippedSources || 0;
      if (batchResult.result.errors) {
        summary.errors.push(...batchResult.result.errors);
      }
    }

    hasMoreWork = batchResult.hasMoreWork;

    if (hasMoreWork && batchNumber < MAX_RETRIES) {
      console.log(`\n⏳ Waiting ${RETRY_DELAY_MS}ms before next batch...`);
      await sleep(RETRY_DELAY_MS);
      batchNumber++;
    } else if (hasMoreWork && batchNumber >= MAX_RETRIES) {
      console.log(`\n⚠️  Reached max retries (${MAX_RETRIES}). Stopping.`);
      console.log(`   There may still be more sources to process.`);
      break;
    } else {
      console.log(`\n✅ All sources processed!`);
      break;
    }
  }

  // Final summary
  console.log(`\n${"=".repeat(60)}`);
  console.log("📊 Final Summary");
  console.log(`${"=".repeat(60)}`);
  console.log(`   🔄 Total Batches: ${summary.totalBatches}`);
  console.log(`   📰 Total Sources Processed: ${summary.totalProcessed}`);
  console.log(`   ✅ Total Sources Succeeded: ${summary.totalSucceeded}`);
  console.log(`   ❌ Total Sources Failed: ${summary.totalFailed}`);
  console.log(`   📄 Total Articles Created: ${summary.totalArticlesCreated}`);
  console.log(`   ⏭️  Total Sources Skipped: ${summary.totalSourcesSkipped}`);

  if (summary.errors.length > 0) {
    console.log(`\n   ⚠️  Total Errors: ${summary.errors.length}`);
    const uniqueErrors = new Map();
    summary.errors.forEach((error) => {
      const key = `${error.sourceId}:${error.error}`;
      if (!uniqueErrors.has(key)) {
        uniqueErrors.set(key, error);
      }
    });
    console.log(`   📋 Unique Errors:`);
    Array.from(uniqueErrors.values()).forEach((error, index) => {
      console.log(`      ${index + 1}. ${error.sourceName}: ${error.error}`);
    });
  }

  console.log(`\n✅ RSS fetch all completed!`);
}

// Run if called directly
if (require.main === module) {
  fetchAllRss().catch((error) => {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  });
}

module.exports = { fetchAllRss, fetchRssBatch };
