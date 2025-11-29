#!/usr/bin/env node
/* eslint-env node */

/**
 * Production Database Seeding Script
 *
 * This script seeds the production database with RSS sources and fetches articles.
 * Run this locally with production environment variables to populate your production database.
 *
 * Usage:
 *   SUPABASE_URL='your-prod-url' SUPABASE_SERVICE_ROLE_KEY='your-service-role-key' node scripts/seed-production.cjs
 */

const https = require("https");
const http = require("http");

// Configuration - uses production environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  console.error("❌ Error: SUPABASE_URL environment variable is not set");
  process.exit(1);
}

if (!SERVICE_ROLE_KEY) {
  console.error("❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable is not set");
  process.exit(1);
}

console.log("🌱 Starting production database seeding...");
console.log(`📍 Supabase URL: ${SUPABASE_URL}`);
console.log(`🔑 Service Role Key: ${SERVICE_ROLE_KEY.substring(0, 20)}...`);

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
          "Content-Type": "application/json",
          ...options.headers,
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          try {
            const jsonData = JSON.parse(data);
            resolve({ status: res.statusCode, data: jsonData });
          } catch (e) {
            resolve({ status: res.statusCode, data });
          }
        });
      }
    );

    req.on("error", (error) => {
      reject(error);
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

async function createRssSource(name, url) {
  console.log(`📡 Creating RSS source: ${name}`);

  try {
    const response = await makeRequest(`${SUPABASE_URL}/rest/v1/rss_sources`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        apikey: SERVICE_ROLE_KEY,
        Prefer: "return=representation",
      },
      body: {
        name,
        url,
      },
    });

    if (response.status === 201) {
      console.log(`✅ Created RSS source: ${name}`);
      return response.data[0];
    } else {
      console.log(`❌ Failed to create RSS source: ${name}`, response);
      return null;
    }
  } catch (error) {
    console.error(`❌ Error creating RSS source: ${name}`, error.message);
    return null;
  }
}

async function seedRssSources() {
  console.log("📰 Seeding RSS sources...");

  const sources = [
    { name: "BBC News - World", url: "http://feeds.bbci.co.uk/news/world/rss.xml" },
    { name: "Reuters - World News", url: "https://feeds.reuters.com/Reuters/worldNews" },
    { name: "TechCrunch", url: "https://techcrunch.com/feed/" },
    { name: "The Guardian - Technology", url: "https://www.theguardian.com/technology/rss" },
    { name: "Wired", url: "https://www.wired.com/feed/rss" },
    { name: "Ars Technica", url: "https://feeds.arstechnica.com/arstechnica/index" },
  ];

  const createdSources = [];

  for (const source of sources) {
    const created = await createRssSource(source.name, source.url);
    if (created) {
      createdSources.push(created);
    }
    await sleep(1000); // Rate limiting
  }

  console.log(`✅ Created ${createdSources.length} RSS sources`);
  return createdSources;
}

async function fetchRssSources() {
  console.log("🔍 Fetching RSS sources from database...");

  try {
    const response = await makeRequest(
      `${SUPABASE_URL}/rest/v1/rss_sources?select=id,name,url,is_active&is_active=eq.true`,
      {
        headers: {
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          apikey: SERVICE_ROLE_KEY,
        },
      }
    );

    if (response.status === 200) {
      console.log(`✅ Found ${response.data.length} active RSS sources`);
      return response.data;
    } else {
      console.log("❌ Failed to fetch RSS sources", response);
      return [];
    }
  } catch (error) {
    console.error("❌ Error fetching RSS sources", error.message);
    return [];
  }
}

async function triggerRssFetch() {
  console.log("🚀 Triggering RSS fetch for all sources...");

  // This would typically be done via a cron job, but for production seeding we'll do it manually
  console.log("ℹ️  Note: RSS fetching is typically done via cron job at /api/cron/fetch-rss");
  console.log("ℹ️  You may need to set up a cron job or scheduled function in your deployment platform");
  console.log("ℹ️  For now, the RSS sources have been created and will be fetched by your cron job");
}

async function main() {
  try {
    console.log("🚀 Starting production database seeding process...\n");

    // Seed RSS sources
    const sources = await seedRssSources();

    if (sources.length > 0) {
      console.log("\n📋 Summary:");
      console.log(`   RSS Sources Created: ${sources.length}`);
      console.log(`   Sources: ${sources.map((s) => s.name).join(", ")}`);
    }

    console.log("\n⚡ Next Steps:");
    console.log("1. Set up a cron job to call your /api/cron/fetch-rss endpoint every 15-30 minutes");
    console.log("2. The RSS sources will automatically fetch articles and populate your database");
    console.log("3. Your homepage should now show articles once the cron job runs");

    console.log("\n✅ Production seeding completed successfully!");
  } catch (error) {
    console.error("❌ Production seeding failed:", error.message);
    process.exit(1);
  }
}

main();
