#!/usr/bin/env node
/* eslint-env node */

const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL || "http://127.0.0.1:18785";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function verifyArticles() {
  console.log("🔍 Verifying Articles in Database");
  console.log("==================================");

  try {
    // Get recent articles with their analysis
    const { data: articles, error } = await supabase
      .schema("app")
      .from("articles")
      .select(`
        id,
        title,
        sentiment,
        created_at,
        rss_sources (name),
        article_topics (
          topics (name)
        )
      `)
      .order("created_at", { ascending: false })
      .limit(15);

    if (error) {
      console.error("❌ Error fetching articles:", error);
      return;
    }

    console.log(`📊 Found ${articles.length} recent articles:\n`);

    articles.forEach((article, index) => {
      const topics = article.article_topics?.map(at => at.topics?.name).filter(Boolean) || [];
      const source = article.rss_sources?.name || "Unknown";

      console.log(`${index + 1}. [${article.sentiment?.toUpperCase() || 'UNANALYZED'}] ${article.title.substring(0, 80)}...`);
      console.log(`   📅 ${new Date(article.created_at).toLocaleString()}`);
      console.log(`   📰 Source: ${source}`);
      console.log(`   🏷️  Topics: ${topics.join(', ') || 'none'}`);
      console.log();
    });

    // Summary stats
    const analyzed = articles.filter(a => a.sentiment).length;
    const unanalyzed = articles.filter(a => !a.sentiment).length;
    const sentiments = articles.reduce((acc, a) => {
      if (a.sentiment) acc[a.sentiment] = (acc[a.sentiment] || 0) + 1;
      return acc;
    }, {});

    console.log("📈 Summary Statistics:");
    console.log(`   ✅ Analyzed articles: ${analyzed}`);
    console.log(`   ⏳ Unanalyzed articles: ${unanalyzed}`);
    console.log(`   📊 Sentiment distribution: ${JSON.stringify(sentiments)}`);

  } catch (error) {
    console.error("❌ Verification failed:", error);
  }
}

verifyArticles().catch(console.error);
