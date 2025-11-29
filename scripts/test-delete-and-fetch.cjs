#!/usr/bin/env node
/* eslint-env node */
/* global URLSearchParams */

/**
 * Test Script: Delete Articles and Re-fetch RSS
 *
 * This script:
 * 1. Deletes articles (optionally filtered by source or all)
 * 2. Re-fetches RSS feeds to get fresh articles with correct encoding
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY='your-key' DEPLOYMENT_URL='http://localhost:3000' node scripts/test-delete-and-fetch.cjs
 *   SUPABASE_SERVICE_ROLE_KEY='your-key' DEPLOYMENT_URL='http://localhost:3000' node scripts/test-delete-and-fetch.cjs --source-id=<uuid>
 *   SUPABASE_SERVICE_ROLE_KEY='your-key' DEPLOYMENT_URL='http://localhost:3000' node scripts/test-delete-and-fetch.cjs --all
 */

const https = require("https");
const http = require("http");

// Configuration
const BASE_URL = (process.env.DEPLOYMENT_URL || "http://localhost:3000").replace(/\/$/, "");
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.SUPABASE_URL || "http://127.0.0.1:18785";

// Parse command line arguments
const args = process.argv.slice(2);
const deleteAll = args.includes("--all");
const sourceIdArg = args.find((arg) => arg.startsWith("--source-id="));
const sourceId = sourceIdArg ? sourceIdArg.split("=")[1] : null;

if (!SERVICE_ROLE_KEY) {
  console.error("❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable is not set");
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
          "User-Agent": "PulseReader-Test-Delete-Fetch/1.0",
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

async function getArticles(sourceId = null) {
  console.log("\n📰 Fetching articles list...");
  const params = new URLSearchParams();
  if (sourceId) {
    params.set("sourceId", sourceId);
  }
  params.set("limit", "100"); // Get up to 100 articles

  const url = `${BASE_URL}/api/articles?${params}`;
  const response = await makeRequest(url);

  if (response.status !== 200) {
    throw new Error(`Failed to fetch articles: ${response.status}`);
  }

  return response.data.data || [];
}

async function deleteArticle(articleId) {
  const url = `${BASE_URL}/api/articles/${articleId}`;
  const response = await makeRequest(url, { method: "DELETE" });

  if (response.status === 204) {
    return true;
  }
  if (response.status === 404) {
    console.log(`   ⚠️  Article ${articleId} not found (may have been already deleted)`);
    return false;
  }
  throw new Error(`Failed to delete article ${articleId}: ${response.status} - ${JSON.stringify(response.data)}`);
}

async function deleteArticles(articles) {
  if (articles.length === 0) {
    console.log("   ℹ️  No articles to delete");
    return 0;
  }

  console.log(`\n🗑️  Deleting ${articles.length} article(s)...`);
  let deleted = 0;
  let failed = 0;

  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    try {
      const success = await deleteArticle(article.id);
      if (success) {
        deleted++;
        process.stdout.write(`\r   Progress: ${i + 1}/${articles.length} (${deleted} deleted)`);
      }
      // Small delay to avoid overwhelming the API
      if (i < articles.length - 1) {
        await sleep(100);
      }
    } catch (error) {
      failed++;
      console.error(`\n   ❌ Failed to delete article ${article.id}: ${error.message}`);
    }
  }

  console.log(`\n   ✅ Deleted: ${deleted}, Failed: ${failed}`);
  return deleted;
}

async function fetchRssFeeds() {
  console.log("\n🔄 Fetching RSS feeds...");
  const url = `${BASE_URL}/api/cron/fetch-rss`;

  const response = await makeRequest(url, {
    method: "POST",
    body: {},
  });

  if (response.status !== 200) {
    throw new Error(`Failed to fetch RSS: ${response.status} - ${JSON.stringify(response.data)}`);
  }

  const result = response.data;
  console.log(`\n📊 RSS Fetch Results:`);
  console.log(`   ✅ Sources Processed: ${result.processed || 0}`);
  console.log(`   ✅ Sources Succeeded: ${result.succeeded || 0}`);
  console.log(`   ❌ Sources Failed: ${result.failed || 0}`);
  console.log(`   📄 Articles Created: ${result.articlesCreated || 0}`);
  console.log(`   ⏭️  Sources Skipped: ${result.skippedSources || 0}`);

  if (result.errors && result.errors.length > 0) {
    console.log(`\n   ⚠️  Errors:`);
    result.errors.forEach((error, index) => {
      console.log(`      ${index + 1}. ${error.sourceName}: ${error.error}`);
    });
  }

  return result;
}

async function main() {
  console.log("🚀 Test: Delete Articles and Re-fetch RSS");
  console.log("=".repeat(60));
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log(`🔑 Using service role key: ${SERVICE_ROLE_KEY.substring(0, 20)}...`);
  if (sourceId) {
    console.log(`📌 Filtering by source ID: ${sourceId}`);
  } else if (deleteAll) {
    console.log(`🗑️  Will delete ALL articles`);
  } else {
    console.log(`ℹ️  Use --all to delete all articles or --source-id=<uuid> to filter by source`);
  }
  console.log("=".repeat(60));

  try {
    // Step 1: Get articles to delete
    const articles = await getArticles(sourceId);
    console.log(`\n📰 Found ${articles.length} article(s) to delete`);

    if (articles.length === 0) {
      console.log("\n✅ No articles found. Proceeding directly to RSS fetch...");
    } else {
      // Show sample articles
      console.log("\n📋 Sample articles:");
      articles.slice(0, 3).forEach((article, index) => {
        console.log(`   ${index + 1}. ${article.title.substring(0, 60)}... (${article.id})`);
      });
      if (articles.length > 3) {
        console.log(`   ... and ${articles.length - 3} more`);
      }

      // Step 2: Delete articles
      const deletedCount = await deleteArticles(articles);
      console.log(`\n✅ Deletion complete: ${deletedCount} article(s) deleted`);

      // Wait a bit before fetching
      console.log("\n⏳ Waiting 2 seconds before fetching RSS feeds...");
      await sleep(2000);
    }

    // Step 3: Fetch RSS feeds
    const fetchResult = await fetchRssFeeds();

    // Final summary
    console.log("\n" + "=".repeat(60));
    console.log("📊 Final Summary");
    console.log("=".repeat(60));
    if (articles.length > 0) {
      console.log(`   🗑️  Articles Deleted: ${articles.length}`);
    }
    console.log(`   📄 New Articles Created: ${fetchResult.articlesCreated || 0}`);
    console.log(`   ✅ Sources Succeeded: ${fetchResult.succeeded || 0}`);
    console.log(`   ❌ Sources Failed: ${fetchResult.failed || 0}`);
    console.log("\n✅ Test completed successfully!");
  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
    if (error.stack) {
      console.error("\nStack trace:", error.stack);
    }
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main, getArticles, deleteArticles, fetchRssFeeds };
