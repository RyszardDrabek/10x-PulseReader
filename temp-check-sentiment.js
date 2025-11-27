#!/usr/bin/env node

const https = require("https");

const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY environment variable is not set");
  process.exit(1);
}

console.log("Checking recent articles for sentiment...");

const req = https.request("https://10x-pulsereader.pages.dev/api/articles?limit=5&sort=createdAt_desc", {
  headers: {
    "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
  },
}, (res) => {
  let data = "";

  res.on("data", (chunk) => {
    data += chunk;
  });

  res.on("end", () => {
    try {
      const json = JSON.parse(data);
      console.log(`\nStatus: ${res.statusCode}`);
      console.log("\nRecent articles:");
      json.data.forEach((article, index) => {
        console.log(`${index + 1}. ${article.title.substring(0, 60)}...`);
        console.log(`   Sentiment: "${article.sentiment || "null"}"`);
        console.log(`   Created: ${article.createdAt}`);
        console.log("");
      });
    } catch (error) {
      console.error("Error parsing response:", error.message);
      console.log("Raw response:", data);
    }
  });
});

req.on("error", (error) => {
  console.error("Request failed:", error.message);
});

req.end();
