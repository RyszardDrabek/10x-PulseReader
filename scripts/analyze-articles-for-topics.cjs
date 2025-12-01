#!/usr/bin/env node
/* eslint-env node */
/* global fetch */

/**
 * Analyze Articles for Topics Script for PulseReader
 *
 * This script analyzes articles from the database and creates topics using AI.
 * It uses OpenRouter API (free tier) which has rate limits.
 *
 * Rate Limits: Free tier allows ~10-20 requests per minute
 * This script uses 10-second delays between requests to respect limits.
 *
 * For production use, consider upgrading to a paid OpenRouter plan.
 */

const { createClient } = require("@supabase/supabase-js");

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || "http://127.0.0.1:18785";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required");
  process.exit(1);
}

if (!OPENROUTER_API_KEY) {
  console.error("❌ OPENROUTER_API_KEY environment variable is required");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function analyzeArticlesForTopics(limit = 15) {
  console.log("🚀 PulseReader: Analyzing Articles for AI Topic Creation");
  console.log("=======================================================");
  console.log(`📊 Processing ${limit} articles`);
  console.log(`🌐 API Base URL: ${BASE_URL}`);
  console.log("");

  try {
    // Get articles that don't have topics yet (prioritize those)
    // If not enough, fall back to articles without sentiment analysis
    const { data: articles, error } = await supabase
      .schema("app")
      .from("articles")
      .select(
        `
        id,
        title,
        description,
        sentiment,
        created_at,
        article_topics (
          topics (
            id,
            name
          )
        )
      `
      )
      .order("created_at", { ascending: false })
      .limit(limit * 2); // Get more to filter

    if (error) {
      console.error("❌ Failed to fetch articles:", error);
      return;
    }

    if (!articles || articles.length === 0) {
      console.log("✅ No articles found in database");
      return;
    }

    // Filter articles that need topic analysis
    // Prioritize articles without any topics, then articles without sentiment
    const articlesNeedingAnalysis = articles
      .filter((article) => !article.article_topics || article.article_topics.length === 0)
      .slice(0, limit);

    if (articlesNeedingAnalysis.length === 0) {
      console.log("✅ All recent articles already have topics assigned");
      return;
    }

    console.log(`📝 Found ${articlesNeedingAnalysis.length} articles to analyze for topics`);

    let successCount = 0;
    let failCount = 0;
    let totalTopicsCreated = 0;

    for (let i = 0; i < articlesNeedingAnalysis.length; i++) {
      const article = articlesNeedingAnalysis[i];

      try {
        console.log(
          `\n🔍 Analyzing ${i + 1}/${articlesNeedingAnalysis.length}: "${article.title.substring(0, 60)}..."`
        );

        // Call the test analyze article endpoint
        const response = await fetch(`${BASE_URL}/api/test-analyze-article/${article.id}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-OpenRouter-API-Key": OPENROUTER_API_KEY,
          },
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.analysisResult?.success !== false) {
            const topicsCreated = result.article.topics?.length || 0;
            totalTopicsCreated += topicsCreated;
            console.log(
              `✅ Success: ${result.article.sentiment || "unknown"} sentiment, ${topicsCreated} topics created`
            );

            // Show created topics
            if (result.article.topics && result.article.topics.length > 0) {
              const topicNames = result.article.topics.map((t) => t.name).join(", ");
              console.log(`   📋 Topics: ${topicNames}`);
            }

            successCount++;
          } else {
            console.error(`❌ Analysis failed for article ${article.id}: ${result.error || "Unknown analysis error"}`);
            failCount++;
          }
        } else {
          const errorText = await response.text();
          if (response.status === 429) {
            console.error(`⏳ Rate limited for article ${article.id} - OpenRouter API quota exceeded`);
          } else {
            console.error(`❌ HTTP error for article ${article.id}: ${response.status} - ${errorText}`);
          }
          failCount++;
        }

        // Longer delay to respect OpenRouter API rate limits (free tier)
        await new Promise((resolve) => setTimeout(resolve, 10000));
      } catch (error) {
        console.error(`❌ Error analyzing article ${article.id}:`, error.message);
        failCount++;
      }
    }

    console.log("\n📊 Analysis Complete");
    console.log("===================");
    console.log(`✅ Successfully analyzed: ${successCount} articles`);
    console.log(`❌ Failed to analyze: ${failCount} articles`);
    console.log(`📈 Success rate: ${((successCount / (successCount + failCount)) * 100).toFixed(1)}%`);
    console.log(`🎯 Total topics created: ${totalTopicsCreated}`);
  } catch (error) {
    console.error("❌ Script failed:", error);
    process.exit(1);
  }
}

// Get limit from command line argument or default to 15
const limit = process.argv[2] ? parseInt(process.argv[2]) : 15;

if (isNaN(limit) || limit < 1) {
  console.error("❌ Invalid limit. Please provide a positive number.");
  process.exit(1);
}

// Run the script
analyzeArticlesForTopics(limit).catch(console.error);
