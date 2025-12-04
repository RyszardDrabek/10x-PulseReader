#!/usr/bin/env node
/* eslint-env node */

/**
 * RSS Fetch Local Script for PulseReader
 *
 * This script fetches RSS feeds directly without needing the API server.
 * It uses the local Supabase instance and saves articles to the database.
 */

const { createClient } = require("@supabase/supabase-js");

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || "http://127.0.0.1:18785";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// RSS Sources to fetch from
const RSS_SOURCES = [
  {
    name: "BBC News - World",
    url: "http://feeds.bbci.co.uk/news/world/rss.xml"
  },
  {
    name: "Reuters - World News",
    url: "https://feeds.reuters.com/Reuters/worldNews"
  },
  {
    name: "The Guardian - World",
    url: "https://www.theguardian.com/world/rss"
  }
];

async function fetchRssFeed(url) {
  try {
    console.log(`📡 Fetching: ${url}`);

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; PulseReader/1.0)",
      },
      signal: AbortSignal.timeout(30000), // 30 seconds timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const xmlText = await response.text();

    // Simple XML parsing for RSS
    const items = [];
    const itemRegex = /<item>(.*?)<\/item>/gs;
    const titleRegex = /<title>(.*?)<\/title>/;
    const descriptionRegex = /<description>(.*?)<\/description>/;
    const linkRegex = /<link>(.*?)<\/link>/;
    const pubDateRegex = /<pubDate>(.*?)<\/pubDate>/;

    let match;
    while ((match = itemRegex.exec(xmlText)) !== null) {
      const itemXml = match[1];

      const titleMatch = titleRegex.exec(itemXml);
      const descriptionMatch = descriptionRegex.exec(itemXml);
      const linkMatch = linkRegex.exec(itemXml);
      const pubDateMatch = pubDateRegex.exec(itemXml);

      if (titleMatch && linkMatch) {
        items.push({
          title: titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim(),
          description: descriptionMatch ? descriptionMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim() : null,
          link: linkMatch[1].trim(),
          publicationDate: pubDateMatch ? new Date(pubDateMatch[1]).toISOString() : new Date().toISOString(),
        });
      }
    }

    return { success: true, items };
  } catch (error) {
    console.error(`❌ Failed to fetch RSS feed: ${error.message}`);
    return { success: false, items: [], error: error.message };
  }
}

async function saveArticlesToDatabase(sourceId, articles) {
  let created = 0;
  let skipped = 0;

  for (const article of articles.slice(0, 10)) { // Limit to 10 articles per source
    try {
      // Check if article already exists
      const { data: existingArticle } = await supabase
        .schema("app")
        .from("articles")
        .select("id")
        .eq("link", article.link)
        .single();

      if (existingArticle) {
        skipped++;
        continue;
      }

      // Create new article
      const { error } = await supabase
        .schema("app")
        .from("articles")
        .insert({
          source_id: sourceId,
          title: article.title,
          description: article.description,
          link: article.link,
          publication_date: article.publicationDate,
          sentiment: null, // Will be analyzed later
        });

      if (error) {
        console.error(`❌ Failed to save article "${article.title}": ${error.message}`);
      } else {
        created++;
        console.log(`✅ Saved: ${article.title.substring(0, 60)}...`);
      }
    } catch (error) {
      console.error(`❌ Error saving article: ${error.message}`);
    }
  }

  return { created, skipped };
}

async function fetchAllRssFeeds() {
  console.log("🚀 PulseReader: Fetching RSS Feeds Locally");
  console.log("===========================================");

  let totalCreated = 0;
  let totalSkipped = 0;

  for (const source of RSS_SOURCES) {
    console.log(`\n📰 Processing source: ${source.name}`);

    // Get or create RSS source
    let sourceId;
    const { data: existingSource } = await supabase
      .schema("app")
      .from("rss_sources")
      .select("id")
      .eq("url", source.url)
      .single();

    if (existingSource) {
      sourceId = existingSource.id;
      console.log(`📍 Using existing source ID: ${sourceId}`);
    } else {
      const { data: newSource, error } = await supabase
        .schema("app")
        .from("rss_sources")
        .insert({ name: source.name, url: source.url })
        .select("id")
        .single();

      if (error) {
        console.error(`❌ Failed to create RSS source: ${error.message}`);
        continue;
      }

      sourceId = newSource.id;
      console.log(`✅ Created new source with ID: ${sourceId}`);
    }

    // Fetch RSS feed
    const result = await fetchRssFeed(source.url);

    if (!result.success) {
      console.error(`❌ Failed to fetch RSS feed for ${source.name}`);
      continue;
    }

    console.log(`📄 Found ${result.items.length} articles`);

    // Save articles
    const { created, skipped } = await saveArticlesToDatabase(sourceId, result.items);
    totalCreated += created;
    totalSkipped += skipped;

    console.log(`📊 ${source.name}: ${created} created, ${skipped} skipped`);
  }

  console.log(`\n📊 Summary:`);
  console.log(`   📄 Total articles created: ${totalCreated}`);
  console.log(`   ⏭️  Total articles skipped: ${totalSkipped}`);

  console.log("\n🎉 RSS fetch completed!");
  console.log("\n💡 Tip: Run 'npm run simulate:ai-analysis' to analyze the new articles.");
}

// Run the script
fetchAllRssFeeds().catch(console.error);
