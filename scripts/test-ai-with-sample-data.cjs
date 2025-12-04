#!/usr/bin/env node
/* eslint-env node */

/**
 * AI Analysis Test with Sample Data for PulseReader
 *
 * This script creates sample articles and tests the AI analysis functionality.
 *
 * Usage:
 *   node scripts/test-ai-with-sample-data.cjs
 */

const { createClient } = require("@supabase/supabase-js");

// Sample articles for testing AI analysis
const sampleArticles = [
  {
    title: "Poland's Economy Shows Strong Growth in Q3",
    description:
      "The Polish economy expanded by 2.8% in the third quarter, driven by strong exports and domestic consumption. The European Commission forecasts continued growth for 2024.",
    link: "https://example.com/poland-economy-growth",
    publicationDate: new Date().toISOString(),
  },
  {
    title: "New AI Breakthrough in Medical Diagnostics",
    description:
      "Researchers at MIT have developed an AI system that can detect early-stage cancer with 95% accuracy, potentially revolutionizing medical diagnostics worldwide.",
    link: "https://example.com/ai-medical-breakthrough",
    publicationDate: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
  },
  {
    title: "Climate Summit Reaches Historic Agreement",
    description:
      "World leaders at the COP29 climate summit have agreed to ambitious new targets for reducing carbon emissions, marking a significant step forward in global climate action.",
    link: "https://example.com/climate-summit-agreement",
    publicationDate: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
  },
  {
    title: "Tech Giant Announces Major Layoffs Amid Market Uncertainty",
    description:
      "In a surprising move, a major Silicon Valley company announced 10,000 job cuts citing economic slowdown and market volatility as key factors.",
    link: "https://example.com/tech-company-layoffs",
    publicationDate: new Date(Date.now() - 10800000).toISOString(), // 3 hours ago
  },
  {
    title: "SpaceX Successfully Launches New Satellite Constellation",
    description:
      "SpaceX has successfully launched its latest batch of Starlink satellites, expanding global internet coverage to remote areas in Africa and South America.",
    link: "https://example.com/spacex-satellite-launch",
    publicationDate: new Date(Date.now() - 14400000).toISOString(), // 4 hours ago
  },
];

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || "http://127.0.0.1:18785";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error("❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable is not set");
  console.error("\nSet the service role key:");
  console.error('  export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createSampleArticles() {
  console.log("📝 Creating sample articles for AI analysis testing...\n");

  // First, ensure we have an RSS source
  const { data: existingSource, error: sourceCheckError } = await supabase
    .schema("app")
    .from("rss_sources")
    .select("id")
    .eq("name", "AI Test Source")
    .single();

  let sourceId;

  if (sourceCheckError && sourceCheckError.code !== "PGRST116") {
    console.error("❌ Error checking for test source:", sourceCheckError.message);
    return null;
  }

  if (existingSource) {
    sourceId = existingSource.id;
    console.log("✅ Using existing test RSS source");
  } else {
    // Create test RSS source
    const { data: newSource, error: createSourceError } = await supabase
      .schema("app")
      .from("rss_sources")
      .insert({
        name: "AI Test Source",
        url: "https://example.com/ai-test-feed.xml",
      })
      .select("id")
      .single();

    if (createSourceError) {
      console.error("❌ Error creating test RSS source:", createSourceError.message);
      return null;
    }

    sourceId = newSource.id;
    console.log("✅ Created test RSS source");
  }

  // Create sample articles
  const articlesToCreate = sampleArticles.map((article) => ({
    source_id: sourceId,
    title: article.title,
    description: article.description,
    link: article.link,
    publication_date: article.publicationDate,
  }));

  const { data: createdArticles, error: createError } = await supabase
    .schema("app")
    .from("articles")
    .insert(articlesToCreate)
    .select("id, title");

  if (createError) {
    console.error("❌ Error creating sample articles:", createError.message);
    return null;
  }

  console.log(`✅ Created ${createdArticles.length} sample articles:`);
  createdArticles.forEach((article, index) => {
    console.log(`  ${index + 1}. "${article.title.substring(0, 60)}${article.title.length > 60 ? "..." : ""}"`);
  });

  return createdArticles;
}

async function runAiAnalysis(articleIds) {
  console.log("\n🤖 Running AI analysis on sample articles...\n");

  const results = [];

  for (const articleId of articleIds) {
    try {
      console.log(`🔄 Analyzing article: ${articleId}`);

      // Get article details
      const { data: article, error: fetchError } = await supabase
        .schema("app")
        .from("articles")
        .select("title, description")
        .eq("id", articleId)
        .single();

      if (fetchError || !article) {
        console.error(`❌ Failed to fetch article ${articleId}:`, fetchError?.message);
        results.push({ articleId, success: false, error: "Failed to fetch article" });
        continue;
      }

      // Prepare content for AI analysis
      const content = article.description || article.title;
      const analysisInput = {
        title: article.title,
        description: article.description,
        combinedText: content,
      };

      // Simulate AI analysis (in a real scenario, this would call OpenRouter)
      // For demo purposes, we'll simulate the analysis results
      const mockAnalysisResult = {
        sentiment: Math.random() > 0.5 ? "positive" : Math.random() > 0.5 ? "neutral" : "negative",
        topics: ["technology", "business", "science", "politics", "health"]
          .sort(() => Math.random() - 0.5)
          .slice(0, Math.floor(Math.random() * 3) + 1),
      };

      console.log(`  📊 Sentiment: ${mockAnalysisResult.sentiment}`);
      console.log(`  🏷️  Topics: ${mockAnalysisResult.topics.join(", ")}`);

      // Update article with analysis results
      const { error: updateError } = await supabase
        .schema("app")
        .from("articles")
        .update({
          sentiment: mockAnalysisResult.sentiment,
          updated_at: new Date().toISOString(),
        })
        .eq("id", articleId);

      if (updateError) {
        console.error(`❌ Failed to update article ${articleId}:`, updateError.message);
        results.push({ articleId, success: false, error: "Failed to update article" });
        continue;
      }

      // Create topics and associations
      for (const topicName of mockAnalysisResult.topics) {
        // Find or create topic
        let { data: existingTopic, error: topicError } = await supabase
          .schema("app")
          .from("topics")
          .select("id")
          .ilike("name", topicName)
          .maybeSingle();

        let topicId;

        if (!existingTopic) {
          const { data: newTopic, error: createTopicError } = await supabase
            .schema("app")
            .from("topics")
            .insert({ name: topicName })
            .select("id")
            .single();

          if (createTopicError) {
            console.error(`❌ Failed to create topic "${topicName}":`, createTopicError.message);
            continue;
          }

          topicId = newTopic.id;
          console.log(`    ➕ Created new topic: ${topicName}`);
        } else {
          topicId = existingTopic.id;
        }

        // Create article-topic association
        const { error: assocError } = await supabase.schema("app").from("article_topics").insert({
          article_id: articleId,
          topic_id: topicId,
        });

        if (assocError && !assocError.message.includes("duplicate key")) {
          console.error(`❌ Failed to associate topic "${topicName}" with article:`, assocError.message);
        }
      }

      results.push({
        articleId,
        success: true,
        sentiment: mockAnalysisResult.sentiment,
        topics: mockAnalysisResult.topics,
      });

      console.log(`✅ Analysis completed for article: ${articleId}\n`);

      // Small delay to simulate API rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`❌ Analysis failed for article ${articleId}:`, error.message);
      results.push({ articleId, success: false, error: error.message });
    }
  }

  return results;
}

async function main() {
  console.log("🚀 PulseReader AI Analysis Demo");
  console.log("================================\n");

  try {
    // Create sample articles
    const createdArticles = await createSampleArticles();

    if (!createdArticles || createdArticles.length === 0) {
      console.error("❌ Failed to create sample articles");
      process.exit(1);
    }

    // Run AI analysis
    const articleIds = createdArticles.map((a) => a.id);
    const analysisResults = await runAiAnalysis(articleIds);

    // Summary
    console.log("📊 Analysis Summary");
    console.log("===================");

    const successful = analysisResults.filter((r) => r.success);
    const failed = analysisResults.filter((r) => !r.success);

    console.log(`✅ Successful analyses: ${successful.length}`);
    console.log(`❌ Failed analyses: ${failed.length}`);
    console.log(`📄 Total articles: ${analysisResults.length}`);

    if (successful.length > 0) {
      console.log("\n📋 Analysis Results:");
      successful.forEach((result, index) => {
        const article = createdArticles.find((a) => a.id === result.articleId);
        console.log(`${index + 1}. "${article?.title.substring(0, 50)}..."`);
        console.log(`   Sentiment: ${result.sentiment}`);
        console.log(`   Topics: ${result.topics.join(", ")}`);
      });
    }

    if (failed.length > 0) {
      console.log("\n❌ Failed Analyses:");
      failed.forEach((result, index) => {
        console.log(`${index + 1}. Article ${result.articleId}: ${result.error}`);
      });
    }

    console.log("\n🎉 AI analysis demo completed!");
  } catch (error) {
    console.error("❌ Demo failed:", error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  });
}

module.exports = { main, createSampleArticles, runAiAnalysis };

