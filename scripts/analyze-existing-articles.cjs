#!/usr/bin/env node
/* eslint-env node */
/* global fetch */

/**
 * Analyze Existing Articles Script for PulseReader
 *
 * This script analyzes all articles that don't have sentiment analysis yet.
 * It processes articles in batches to avoid overwhelming the AI service.
 */

const { createClient } = require("@supabase/supabase-js");

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || "http://127.0.0.1:18785";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required");
  process.exit(1);
}

if (!OPENROUTER_API_KEY) {
  console.error("❌ OPENROUTER_API_KEY environment variable is required");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function analyzeExistingArticles() {
  console.log("🚀 PulseReader: Analyzing Existing Articles");
  console.log("============================================");

  try {
    // Get all articles without sentiment
    const { data: articles, error } = await supabase
      .schema("app")
      .from("articles")
      .select("id, title, description")
      .is("sentiment", null)
      .limit(50); // Process in batches

    if (error) {
      console.error("❌ Failed to fetch articles:", error);
      return;
    }

    if (!articles || articles.length === 0) {
      console.log("✅ No articles found that need analysis");
      return;
    }

    console.log(`📝 Found ${articles.length} articles to analyze`);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < articles.length; i++) {
      const article = articles[i];

      try {
        console.log(`🔍 Analyzing ${i + 1}/${articles.length}: "${article.title.substring(0, 60)}..."`);

        // Call the test AI analysis endpoint
        const response = await fetch("http://localhost:3001/api/test-ai-analysis", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: article.title,
            description: article.description || "",
          }),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.analysis?.sentiment) {
            // Update the article with sentiment
            const { error: updateError } = await supabase
              .schema("app")
              .from("articles")
              .update({ sentiment: result.analysis.sentiment })
              .eq("id", article.id);

            if (updateError) {
              console.error(`❌ Failed to update article ${article.id}:`, updateError);
              failCount++;
            } else {
              console.log(`✅ Updated article with sentiment: ${result.analysis.sentiment}`);
              successCount++;
            }
          } else {
            console.error(`❌ AI analysis failed for article ${article.id}`);
            failCount++;
          }
        } else {
          console.error(`❌ HTTP error for article ${article.id}: ${response.status}`);
          failCount++;
        }

        // Small delay to avoid overwhelming the API
        await new Promise((resolve) => setTimeout(resolve, 1000));
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
  } catch (error) {
    console.error("❌ Script failed:", error);
    process.exit(1);
  }
}

// Run the script
analyzeExistingArticles().catch(console.error);
