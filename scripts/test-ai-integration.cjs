#!/usr/bin/env node
/* eslint-env node */

/**
 * AI Integration Test Script for PulseReader
 *
 * This script tests the AI analysis integration by:
 * 1. Testing OpenRouter API connectivity
 * 2. Testing AI analysis service functionality
 * 3. Testing article analysis orchestration
 *
 * Usage:
 *   node scripts/test-ai-integration.cjs
 */

const https = require("https");
const http = require("http");

// Load environment variables
require("dotenv").config({ path: ".dev.vars" });

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

async function testOpenRouterConnectivity() {
  console.log("🔗 Testing OpenRouter API connectivity...");

  if (!process.env.OPENROUTER_API_KEY) {
    console.error("❌ OPENROUTER_API_KEY not found in environment");
    return false;
  }

  try {
    const response = await makeRequest("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://10x-pulsereader.pages.dev",
        "X-Title": "PulseReader AI Test",
      },
      body: {
        model: "x-ai/grok-4.1-fast:free",
        messages: [
          {
            role: "user",
            content: 'Respond with \'OK\' in JSON format: {"status": "OK"}',
          },
        ],
        temperature: 0.1,
        max_tokens: 50,
        response_format: { type: "json_object" },
      },
    });

    if (response.status === 200) {
      console.log("✅ OpenRouter API connection successful");
      return true;
    } else {
      console.error(`❌ OpenRouter API error: ${response.status}`);
      console.error("Response:", JSON.stringify(response.data, null, 2));
      return false;
    }
  } catch (error) {
    console.error("❌ OpenRouter API request failed:", error.message);
    return false;
  }
}

async function testAiService() {
  console.log("\n🤖 Testing AI Analysis Service...");

  try {
    // Test the AI analysis API endpoint
    const testData = {
      title: "Poland's Economy Shows Strong Growth in Q3",
      description:
        "The Polish economy expanded by 2.8% in the third quarter, driven by strong exports and domestic consumption. The European Commission forecasts continued growth for 2024.",
    };

    console.log("Sending test article for analysis...");
    console.log("Title:", testData.title);
    console.log("Description:", testData.description.substring(0, 100) + "...");

    const response = await makeRequest("http://localhost:3001/api/test-ai-analysis", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: testData,
    });

    if (response.status === 200) {
      console.log("✅ AI Analysis Service test successful");
      console.log("Response:", JSON.stringify(response.data, null, 2));
      return true;
    } else {
      console.error(`❌ AI Analysis Service error: ${response.status}`);
      console.error("Response:", JSON.stringify(response.data, null, 2));
      return false;
    }
  } catch (error) {
    console.error("❌ AI Analysis Service request failed:", error.message);
    return false;
  }
}

async function runTests() {
  console.log("🚀 PulseReader AI Integration Test Suite");
  console.log("=".repeat(50));

  const results = {
    openRouterConnectivity: false,
    aiService: false,
  };

  // Test 1: OpenRouter API connectivity
  results.openRouterConnectivity = await testOpenRouterConnectivity();

  // Test 2: AI Analysis Service (requires dev server running)
  results.aiService = await testAiService();

  // Summary
  console.log("\n" + "=".repeat(50));
  console.log("📊 Test Results Summary");
  console.log("=".repeat(50));
  console.log(`🔗 OpenRouter API Connectivity: ${results.openRouterConnectivity ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`🤖 AI Analysis Service: ${results.aiService ? "✅ PASS" : "❌ FAIL"}`);

  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;

  console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`);

  if (passedTests === totalTests) {
    console.log("🎉 All AI integration tests passed!");
    process.exit(0);
  } else {
    console.log("⚠️  Some tests failed. Check the output above for details.");
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runTests().catch((error) => {
    console.error("❌ Fatal error running tests:", error);
    process.exit(1);
  });
}

module.exports = { runTests, testOpenRouterConnectivity, testAiService };
