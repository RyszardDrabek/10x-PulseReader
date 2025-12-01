#!/usr/bin/env node
/* eslint-env node */

/**
 * AI Analysis Demo for PulseReader
 *
 * This script demonstrates the AI analysis functionality without database dependencies.
 * It shows how articles would be analyzed and what results would be produced.
 *
 * Usage:
 *   node scripts/demo-ai-analysis.cjs
 */

const sampleArticles = [
  {
    id: "article-1",
    title: "Poland's Economy Shows Strong Growth in Q3",
    description:
      "The Polish economy expanded by 2.8% in the third quarter, driven by strong exports and domestic consumption. The European Commission forecasts continued growth for 2024.",
  },
  {
    id: "article-2",
    title: "New AI Breakthrough in Medical Diagnostics",
    description:
      "Researchers at MIT have developed an AI system that can detect early-stage cancer with 95% accuracy, potentially revolutionizing medical diagnostics worldwide.",
  },
  {
    id: "article-3",
    title: "Climate Summit Reaches Historic Agreement",
    description:
      "World leaders at the COP29 climate summit have agreed to ambitious new targets for reducing carbon emissions, marking a significant step forward in global climate action.",
  },
  {
    id: "article-4",
    title: "Tech Giant Announces Major Layoffs Amid Market Uncertainty",
    description:
      "In a surprising move, a major Silicon Valley company announced 10,000 job cuts citing economic slowdown and market volatility as key factors.",
  },
  {
    id: "article-5",
    title: "SpaceX Successfully Launches New Satellite Constellation",
    description:
      "SpaceX has successfully launched its latest batch of Starlink satellites, expanding global internet coverage to remote areas in Africa and South America.",
  },
];

// Simulate AI analysis results (in production, this would come from OpenRouter)
function simulateAIAnalysis(article) {
  // Simulate processing time
  const processingTime = Math.random() * 2000 + 1000; // 1-3 seconds

  return new Promise((resolve) => {
    setTimeout(() => {
      // Simulate sentiment analysis based on content
      let sentiment;
      const lowerContent = (article.title + " " + (article.description || "")).toLowerCase();

      if (
        lowerContent.includes("growth") ||
        lowerContent.includes("breakthrough") ||
        lowerContent.includes("success") ||
        lowerContent.includes("historic")
      ) {
        sentiment = "positive";
      } else if (
        lowerContent.includes("uncertainty") ||
        lowerContent.includes("cuts") ||
        lowerContent.includes("slowdown") ||
        lowerContent.includes("volatility")
      ) {
        sentiment = "negative";
      } else {
        sentiment = "neutral";
      }

      // Simulate topic extraction
      const allTopics = [
        "technology",
        "business",
        "politics",
        "economy",
        "health",
        "science",
        "environment",
        "space",
        "innovation",
        "global",
        "finance",
        "energy",
      ];

      const contentWords = lowerContent.split(" ");
      const relevantTopics = allTopics.filter((topic) =>
        contentWords.some((word) => word.includes(topic.substring(0, 4)) || topic.includes(word.substring(0, 4)))
      );

      // Ensure we have 1-3 topics
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

async function demonstrateAIAnalysis() {
  console.log("🚀 PulseReader AI Analysis Demonstration");
  console.log("========================================\n");

  console.log("🤖 AI Analysis Configuration:");
  console.log("  • Model: x-ai/grok-4.1-fast:free");
  console.log("  • Provider: OpenRouter");
  console.log("  • Analysis: Sentiment + Topic Classification");
  console.log("  • Response Format: Structured JSON\n");

  console.log("📝 Sample Articles for Analysis:");
  console.log("================================\n");

  sampleArticles.forEach((article, index) => {
    console.log(`${index + 1}. "${article.title}"`);
    console.log(`   ${article.description.substring(0, 80)}${article.description.length > 80 ? "..." : ""}\n`);
  });

  console.log("🔄 Running AI Analysis...");
  console.log("=========================\n");

  const results = [];
  const startTime = Date.now();

  for (const article of sampleArticles) {
    console.log(`🔍 Analyzing: "${article.title.substring(0, 50)}..."`);

    try {
      const result = await simulateAIAnalysis(article);
      results.push(result);

      console.log(`   ✅ Sentiment: ${result.sentiment}`);
      console.log(`   🏷️  Topics: ${result.topics.join(", ")}`);
      console.log(`   ⏱️  Processing Time: ${result.processingTime}ms`);
      console.log(`   📊 Confidence: ${(result.confidence * 100).toFixed(1)}%\n`);

      // Simulate API rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.log(`   ❌ Analysis failed: ${error.message}\n`);
      results.push({
        articleId: article.id,
        error: error.message,
        success: false,
      });
    }
  }

  const totalTime = Date.now() - startTime;
  const successful = results.filter((r) => !r.error);
  const failed = results.filter((r) => r.error);

  console.log("📊 Analysis Summary");
  console.log("===================");
  console.log(`⏱️  Total Processing Time: ${totalTime}ms`);
  console.log(`📄 Articles Analyzed: ${results.length}`);
  console.log(`✅ Successful Analyses: ${successful.length}`);
  console.log(`❌ Failed Analyses: ${failed.length}`);
  console.log(
    `📈 Average Processing Time: ${Math.round(successful.reduce((sum, r) => sum + r.processingTime, 0) / successful.length)}ms per article`
  );
  console.log(
    `🎯 Average Confidence: ${((successful.reduce((sum, r) => sum + r.confidence, 0) / successful.length) * 100).toFixed(1)}%`
  );

  console.log("\n📋 Sentiment Distribution:");
  const sentiments = successful.reduce((acc, r) => {
    acc[r.sentiment] = (acc[r.sentiment] || 0) + 1;
    return acc;
  }, {});
  Object.entries(sentiments).forEach(([sentiment, count]) => {
    console.log(`   ${sentiment}: ${count} articles`);
  });

  console.log("\n🏷️ Popular Topics:");
  const allTopics = successful.flatMap((r) => r.topics);
  const topicCounts = allTopics.reduce((acc, topic) => {
    acc[topic] = (acc[topic] || 0) + 1;
    return acc;
  }, {});
  Object.entries(topicCounts)
    .sort(([, a], [, b]) => b - a)
    .forEach(([topic, count]) => {
      console.log(`   ${topic}: ${count} articles`);
    });

  console.log("\n🎉 AI Analysis Demo Complete!");
  console.log("\n💡 In production, this analysis would:");
  console.log("   • Run automatically after RSS fetching");
  console.log("   • Update articles in the database with sentiment and topics");
  console.log("   • Enable personalized content filtering");
  console.log("   • Continue working even if AI temporarily fails");
}

async function demonstrateErrorHandling() {
  console.log("\n🛡️ Error Handling Demonstration");
  console.log("===============================\n");

  console.log("Simulating various error scenarios...\n");

  // Simulate API timeout
  console.log("1. API Timeout Scenario:");
  console.log("   ⏱️  Request takes too long (>10 seconds)");
  console.log("   ✅ Result: Graceful timeout with error logging\n");

  // Simulate API rate limit
  console.log("2. Rate Limiting Scenario:");
  console.log("   🚦 API returns 429 (Too Many Requests)");
  console.log("   ✅ Result: Automatic retry with exponential backoff\n");

  // Simulate insufficient credits
  console.log("3. Insufficient Credits Scenario:");
  console.log("   💰 API returns 402 (Payment Required)");
  console.log("   ✅ Result: Article saved without analysis, service continues\n");

  // Simulate malformed response
  console.log("4. Malformed AI Response Scenario:");
  console.log("   🤖 AI returns invalid JSON or unexpected format");
  console.log("   ✅ Result: Validation error, article saved without tags\n");

  // Simulate network failure
  console.log("5. Network Failure Scenario:");
  console.log("   🌐 Connection to OpenRouter fails");
  console.log("   ✅ Result: Error logged, graceful degradation\n");

  console.log("🔄 In all error scenarios:");
  console.log("   • RSS fetching continues normally");
  console.log("   • Articles are saved to database");
  console.log("   • AI analysis is skipped for problematic articles");
  console.log("   • System remains operational");
}

// Run the demonstration
if (require.main === module) {
  demonstrateAIAnalysis()
    .then(() => demonstrateErrorHandling())
    .catch((error) => {
      console.error("❌ Demo failed:", error.message);
      process.exit(1);
    });
}

module.exports = { demonstrateAIAnalysis, demonstrateErrorHandling };
