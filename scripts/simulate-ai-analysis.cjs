#!/usr/bin/env node
/* eslint-env node */

/**
 * Simulate AI Analysis Script for PulseReader
 *
 * This script simulates AI analysis for articles that don't have sentiment/tags yet.
 * It analyzes article content and assigns realistic sentiment and topics based on keywords.
 * This allows testing the application with realistic data without requiring an API key.
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY='your-key' node scripts/simulate-ai-analysis.cjs
 */

const { createClient } = require("@supabase/supabase-js");

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || "http://127.0.0.1:18785";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required");
  console.error("Usage: SUPABASE_SERVICE_ROLE_KEY='your-key' node scripts/simulate-ai-analysis.cjs");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Simulate AI analysis results (in production, this would come from OpenRouter)
function simulateAIAnalysis(article) {
  // Simulate processing time
  const processingTime = Math.random() * 2000 + 1000; // 1-3 seconds

  return new Promise((resolve) => {
    setTimeout(() => {
      // Combine title and description for analysis
      const content = (article.title + " " + (article.description || "")).toLowerCase();

      // Simulate sentiment analysis based on content keywords
      let sentiment;
      if (
        content.includes("growth") ||
        content.includes("breakthrough") ||
        content.includes("success") ||
        content.includes("historic") ||
        content.includes("achievement") ||
        content.includes("positive") ||
        content.includes("improvement") ||
        content.includes("advance") ||
        content.includes("win") ||
        content.includes("victory") ||
        content.includes("recovery") ||
        content.includes("boost") ||
        content.includes("surge")
      ) {
        sentiment = "positive";
      } else if (
        content.includes("crisis") ||
        content.includes("disaster") ||
        content.includes("failure") ||
        content.includes("decline") ||
        content.includes("drop") ||
        content.includes("fall") ||
        content.includes("crash") ||
        content.includes("negative") ||
        content.includes("worse") ||
        content.includes("worst") ||
        content.includes("attack") ||
        content.includes("death") ||
        content.includes("kill") ||
        content.includes("war") ||
        content.includes("conflict") ||
        content.includes("violence") ||
        content.includes("scandal") ||
        content.includes("corruption")
      ) {
        sentiment = "negative";
      } else {
        sentiment = "neutral";
      }

      // Simulate topic extraction based on keywords
      const topicKeywords = {
        technology: [
          "tech",
          "software",
          "app",
          "digital",
          "internet",
          "ai",
          "artificial",
          "computer",
          "device",
          "mobile",
          "web",
        ],
        politics: [
          "government",
          "political",
          "election",
          "party",
          "minister",
          "president",
          "policy",
          "law",
          "vote",
          "parliament",
        ],
        economy: [
          "economic",
          "economy",
          "finance",
          "market",
          "business",
          "company",
          "stock",
          "trade",
          "investment",
          "bank",
        ],
        health: ["health", "medical", "doctor", "hospital", "disease", "treatment", "vaccine", "pandemic", "cancer"],
        science: ["science", "research", "study", "scientist", "discovery", "experiment", "laboratory", "theory"],
        environment: [
          "climate",
          "environment",
          "green",
          "sustainable",
          "carbon",
          "emission",
          "renewable",
          "energy",
          "planet",
        ],
        sports: [
          "sport",
          "football",
          "soccer",
          "basketball",
          "tennis",
          "olympic",
          "athlete",
          "game",
          "match",
          "tournament",
        ],
        culture: ["culture", "art", "music", "film", "movie", "theater", "museum", "festival", "book", "literature"],
        world: ["international", "global", "world", "foreign", "diplomatic", "summit", "treaty", "alliance"],
        society: ["social", "community", "people", "public", "education", "school", "university", "student"],
      };

      const relevantTopics = [];
      for (const [topic, keywords] of Object.entries(topicKeywords)) {
        if (keywords.some((keyword) => content.includes(keyword))) {
          relevantTopics.push(topic);
        }
      }

      // Ensure we have 1-3 topics, fallback to "general" if none found
      const topics =
        relevantTopics.length > 0 ? relevantTopics.slice(0, Math.min(3, relevantTopics.length)) : ["general"];

      resolve({
        articleId: article.id,
        sentiment,
        topics,
        processingTime: Math.round(processingTime),
        confidence: Math.random() * 0.3 + 0.7, // 70-100% confidence
      });
    }, processingTime);
  });
}

async function createOrFindTopics(topicNames) {
  const topicIds = [];

  for (const topicName of topicNames) {
    // Try to find existing topic (case-insensitive)
    const { data: existingTopic, error: findError } = await supabase
      .schema("app")
      .from("topics")
      .select("id")
      .ilike("name", topicName)
      .single();

    if (existingTopic) {
      topicIds.push(existingTopic.id);
    } else {
      // Create new topic
      const { data: newTopic, error: createError } = await supabase
        .schema("app")
        .from("topics")
        .insert({ name: topicName })
        .select("id")
        .single();

      if (createError) {
        console.error(`❌ Failed to create topic "${topicName}":`, createError);
        continue;
      }

      topicIds.push(newTopic.id);
      console.log(`✅ Created new topic: ${topicName}`);
    }
  }

  return topicIds;
}

async function simulateAIAnalysisForArticles() {
  console.log("🚀 PulseReader: Simulating AI Analysis for Existing Articles");
  console.log("============================================================");
  console.log(`📍 Supabase URL: ${SUPABASE_URL}`);
  console.log("⚠️  Note: This script simulates AI analysis without calling external APIs\n");

  try {
    // Get all articles without sentiment
    const { data: articles, error } = await supabase
      .schema("app")
      .from("articles")
      .select("id, title, description")
      .is("sentiment", null)
      .limit(100); // Process up to 100 articles at a time

    if (error) {
      console.error("❌ Failed to fetch articles:", error);
      return;
    }

    if (!articles || articles.length === 0) {
      console.log("✅ No articles found that need analysis");
      return;
    }

    console.log(`📝 Found ${articles.length} articles to analyze\n`);

    let successCount = 0;
    let failCount = 0;
    const sentimentCounts = { positive: 0, neutral: 0, negative: 0 };
    const topicCounts = {};

    for (let i = 0; i < articles.length; i++) {
      const article = articles[i];

      try {
        console.log(`🔍 Analyzing ${i + 1}/${articles.length}: "${article.title.substring(0, 60)}..."`);

        // Simulate AI analysis
        const analysisResult = await simulateAIAnalysis(article);

        console.log(`   ✅ Sentiment: ${analysisResult.sentiment}`);
        console.log(`   🏷️  Topics: ${analysisResult.topics.join(", ")}`);
        console.log(`   ⏱️  Processing Time: ${analysisResult.processingTime}ms`);
        console.log(`   📊 Confidence: ${(analysisResult.confidence * 100).toFixed(1)}%\n`);

        // Update article with sentiment
        const { error: updateSentimentError } = await supabase
          .schema("app")
          .from("articles")
          .update({ sentiment: analysisResult.sentiment })
          .eq("id", article.id);

        if (updateSentimentError) {
          console.error(`❌ Failed to update sentiment for article ${article.id}:`, updateSentimentError);
          failCount++;
          continue;
        }

        // Create/find topics and associate them with the article
        if (analysisResult.topics.length > 0) {
          try {
            const topicIds = await createOrFindTopics(analysisResult.topics);

            // Associate topics with article (avoid duplicates)
            for (const topicId of topicIds) {
              const { error: associateError } = await supabase
                .schema("app")
                .from("article_topics")
                .upsert({ article_id: article.id, topic_id: topicId }, { onConflict: "article_id,topic_id" });

              if (associateError) {
                console.error(`❌ Failed to associate topic ${topicId} with article ${article.id}:`, associateError);
              }
            }
          } catch (topicError) {
            console.warn(
              `⚠️  Failed to create/associate topics for article ${article.id}, but sentiment was updated:`,
              topicError.message
            );
          }
        }

        // Update counters
        sentimentCounts[analysisResult.sentiment]++;
        analysisResult.topics.forEach((topic) => {
          topicCounts[topic] = (topicCounts[topic] || 0) + 1;
        });

        successCount++;

        // Small delay to avoid overwhelming the database
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`❌ Error analyzing article ${article.id}:`, error.message);
        failCount++;
      }
    }

    console.log("\n📊 Analysis Complete");
    console.log("===================");
    console.log(`✅ Successfully analyzed: ${successCount} articles`);
    console.log(`❌ Failed to analyze: ${failCount} articles`);
    console.log(`📈 Success rate: ${((successCount / (successCount + failCount)) * 100).toFixed(1)}%\n`);

    console.log("📋 Sentiment Distribution:");
    Object.entries(sentimentCounts).forEach(([sentiment, count]) => {
      if (count > 0) {
        console.log(`   ${sentiment}: ${count} articles`);
      }
    });

    console.log("\n🏷️ Popular Topics:");
    Object.entries(topicCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10) // Show top 10
      .forEach(([topic, count]) => {
        console.log(`   ${topic}: ${count} articles`);
      });

    console.log("\n🎉 AI Analysis Simulation Complete!");
    console.log("\n💡 Note: This simulation provides realistic test data.");
    console.log("   In production, real AI analysis would be performed by OpenRouter.");
  } catch (error) {
    console.error("❌ Script failed:", error);
    process.exit(1);
  }
}

// Run the script
simulateAIAnalysisForArticles().catch(console.error);
