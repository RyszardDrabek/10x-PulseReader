// =====================================================================================
// Database Seed Script for PulseReader
// =====================================================================================
// This script populates the database with realistic test data for development.
// It creates test users, profiles, RSS sources, topics, articles, and relationships.
//
// Usage:
//   npm run seed
//   npm run seed:reset  (clears all data first)
// =====================================================================================

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/db/database.types.ts";
import type { ArticleSentiment, UserMood } from "../src/types.ts";

// =====================================================================================
// Configuration
// =====================================================================================

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Missing required environment variables:");
  console.error("   SUPABASE_URL:", !!SUPABASE_URL);
  console.error("   SUPABASE_SERVICE_ROLE_KEY:", !!SUPABASE_SERVICE_ROLE_KEY);
  console.error("\nPlease ensure these are set in your .env file");
  process.exit(1);
}

// Create admin client with service role key for full database access
const supabaseAdmin = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// =====================================================================================
// Test Data Definitions
// =====================================================================================

interface TestUser {
  email: string;
  password: string;
  name: string;
  mood?: UserMood;
  blocklist?: string[];
}

const TEST_USERS: TestUser[] = [
  {
    email: "anna.kowalska@example.com",
    password: "Test123!@#",
    name: "Anna Kowalska",
    mood: "positive",
    blocklist: ["wojna", "konflikt", "kryzys"],
  },
  {
    email: "piotr.nowak@example.com",
    password: "Test123!@#",
    name: "Piotr Nowak",
    mood: "neutral",
    blocklist: ["sport", "piłka"],
  },
  {
    email: "maria.wisniewska@example.com",
    password: "Test123!@#",
    name: "Maria Wiśniewska",
    mood: "negative",
    blocklist: [],
  },
  {
    email: "jan.kowalczyk@example.com",
    password: "Test123!@#",
    name: "Jan Kowalczyk",
    mood: null,
    blocklist: ["polityka", "wybory"],
  },
];

const RSS_SOURCES = [
  {
    name: "Wyborcza - Najważniejsze",
    url: "https://rss.gazeta.pl/pub/rss/najnowsze_wyborcza.xml",
  },
  {
    name: "Rzeczpospolita - Główne",
    url: "https://www.rp.pl/rss_main",
  },
  {
    name: "BBC News - World",
    url: "http://feeds.bbci.co.uk/news/world/rss.xml",
  },
  {
    name: "Reuters - World News",
    url: "https://rss.app/feeds/SdI37Q5uDrVQuAOr.xml",
  },
  {
    name: "TechCrunch",
    url: "https://techcrunch.com/feed/",
  },
  {
    name: "The Guardian - Technology",
    url: "https://www.theguardian.com/technology/rss",
  },
];

const TOPICS = [
  "Technologia",
  "Polityka",
  "Gospodarka",
  "Sport",
  "Zdrowie",
  "Nauka",
  "Kultura",
  "Świat",
  "Biznes",
  "Edukacja",
  "Środowisko",
  "Społeczeństwo",
];

interface TestArticle {
  title: string;
  description: string;
  link: string;
  publicationDate: Date;
  sentiment: ArticleSentiment;
  sourceIndex: number;
  topicIndices: number[];
}

const TEST_ARTICLES: TestArticle[] = [
  {
    title: "Nowe odkrycie w dziedzinie sztucznej inteligencji zmienia oblicze technologii",
    description:
      "Naukowcy z Uniwersytetu Warszawskiego opracowali przełomowy algorytm uczenia maszynowego, który może zrewolucjonizować sposób, w jaki komputery przetwarzają język naturalny.",
    link: "https://example.com/ai-breakthrough-2024",
    publicationDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    sentiment: "positive",
    sourceIndex: 0,
    topicIndices: [0, 5], // Technologia, Nauka
  },
  {
    title: "Rząd ogłasza nowy program wsparcia dla małych przedsiębiorstw",
    description:
      "Ministerstwo Rozwoju przedstawiło szczegóły programu finansowego mającego na celu wsparcie małych i średnich firm w okresie transformacji gospodarczej.",
    link: "https://example.com/government-support-program",
    publicationDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    sentiment: "positive",
    sourceIndex: 1,
    topicIndices: [1, 2], // Polityka, Gospodarka
  },
  {
    title: "Eksperci ostrzegają przed rosnącym zagrożeniem cybernetycznym",
    description:
      "Raport bezpieczeństwa cybernetycznego wskazuje na znaczący wzrost liczby ataków hakerskich w ostatnim kwartale, szczególnie wymierzonych w infrastrukturę krytyczną.",
    link: "https://example.com/cybersecurity-threats",
    publicationDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    sentiment: "negative",
    sourceIndex: 0,
    topicIndices: [0, 11], // Technologia, Społeczeństwo
  },
  {
    title: "Breakthrough in quantum computing promises faster data processing",
    description:
      "Researchers at leading tech companies have achieved a major milestone in quantum computing, potentially revolutionizing how we process complex calculations.",
    link: "https://example.com/quantum-computing-breakthrough",
    publicationDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    sentiment: "positive",
    sourceIndex: 2,
    topicIndices: [0, 5], // Technologia, Nauka
  },
  {
    title: "Global climate summit reaches historic agreement on emissions",
    description:
      "World leaders have signed a landmark agreement committing to reduce carbon emissions by 50% by 2030, marking a significant step forward in climate action.",
    link: "https://example.com/climate-summit-agreement",
    publicationDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
    sentiment: "positive",
    sourceIndex: 3,
    topicIndices: [10, 7], // Środowisko, Świat
  },
  {
    title: "Economic downturn affects markets worldwide",
    description:
      "Stock markets across the globe have experienced significant volatility following concerns about inflation and supply chain disruptions.",
    link: "https://example.com/economic-downturn",
    publicationDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), // 6 days ago
    sentiment: "negative",
    sourceIndex: 3,
    topicIndices: [2, 8], // Gospodarka, Biznes
  },
  {
    title: "New health study reveals benefits of Mediterranean diet",
    description:
      "A comprehensive 10-year study has confirmed that following a Mediterranean diet can significantly reduce the risk of cardiovascular diseases.",
    link: "https://example.com/mediterranean-diet-study",
    publicationDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    sentiment: "positive",
    sourceIndex: 2,
    topicIndices: [4, 5], // Zdrowie, Nauka
  },
  {
    title: "Major tech company announces layoffs affecting thousands",
    description:
      "One of the world's largest technology companies has announced plans to reduce its workforce by 15%, citing economic challenges and restructuring needs.",
    link: "https://example.com/tech-layoffs",
    publicationDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
    sentiment: "negative",
    sourceIndex: 4,
    topicIndices: [0, 8], // Technologia, Biznes
  },
  {
    title: "Revolutionary cancer treatment shows promising results in trials",
    description:
      "Clinical trials of a new immunotherapy treatment have shown remarkable success rates, offering hope to patients with previously untreatable forms of cancer.",
    link: "https://example.com/cancer-treatment-trials",
    publicationDate: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000), // 9 days ago
    sentiment: "positive",
    sourceIndex: 2,
    topicIndices: [4, 5], // Zdrowie, Nauka
  },
  {
    title: "International sports event breaks viewership records",
    description:
      "The latest championship tournament has attracted record-breaking global audiences, demonstrating the enduring appeal of competitive sports.",
    link: "https://example.com/sports-championship",
    publicationDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
    sentiment: "positive",
    sourceIndex: 1,
    topicIndices: [3], // Sport
  },
  {
    title: "Cultural festival celebrates diversity and inclusion",
    description:
      "A week-long cultural festival featuring artists from around the world has brought communities together, highlighting the importance of cultural exchange.",
    link: "https://example.com/cultural-festival",
    publicationDate: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000), // 11 days ago
    sentiment: "positive",
    sourceIndex: 0,
    topicIndices: [6, 11], // Kultura, Społeczeństwo
  },
  {
    title: "Education system faces challenges in digital transformation",
    description:
      "Schools and universities are struggling to adapt to new digital learning requirements, with many institutions lacking necessary infrastructure and training.",
    link: "https://example.com/education-digital-challenges",
    publicationDate: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000), // 12 days ago
    sentiment: "neutral",
    sourceIndex: 1,
    topicIndices: [9, 0], // Edukacja, Technologia
  },
  {
    title: "Renewable energy investments reach all-time high",
    description:
      "Global investments in renewable energy sources have reached unprecedented levels, signaling a major shift towards sustainable power generation.",
    link: "https://example.com/renewable-energy-investments",
    publicationDate: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000), // 13 days ago
    sentiment: "positive",
    sourceIndex: 3,
    topicIndices: [10, 2], // Środowisko, Gospodarka
  },
  {
    title: "Social media platform introduces new privacy features",
    description:
      "In response to growing privacy concerns, a major social media platform has rolled out enhanced privacy controls allowing users more control over their data.",
    link: "https://example.com/social-media-privacy",
    publicationDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
    sentiment: "neutral",
    sourceIndex: 4,
    topicIndices: [0, 11], // Technologia, Społeczeństwo
  },
  {
    title: "Breakthrough in space exploration opens new possibilities",
    description:
      "Scientists have made significant progress in understanding distant planets, bringing humanity one step closer to potential interstellar exploration.",
    link: "https://example.com/space-exploration-breakthrough",
    publicationDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
    sentiment: "positive",
    sourceIndex: 2,
    topicIndices: [5, 7], // Nauka, Świat
  },
];

// =====================================================================================
// Helper Functions
// =====================================================================================

function log(message: string, type: "info" | "success" | "error" | "warn" = "info") {
  const icons = {
    info: "ℹ️",
    success: "✅",
    error: "❌",
    warn: "⚠️",
  };
  console.log(`${icons[type]} ${message}`);
}

async function clearExistingData() {
  log("Clearing existing data...", "info");

  // Delete in order to respect foreign key constraints
  // Using .neq() with a non-existent UUID effectively deletes all rows
  const nonExistentUuid = "00000000-0000-0000-0000-000000000000";

  const { error: topicsError } = await supabaseAdmin
    .schema("app")
    .from("article_topics")
    .delete()
    .neq("article_id", nonExistentUuid);
  if (topicsError) log(`Warning clearing article_topics: ${topicsError.message}`, "warn");

  const { error: articlesError } = await supabaseAdmin
    .schema("app")
    .from("articles")
    .delete()
    .neq("id", nonExistentUuid);
  if (articlesError) log(`Warning clearing articles: ${articlesError.message}`, "warn");

  const { error: topicsDeleteError } = await supabaseAdmin
    .schema("app")
    .from("topics")
    .delete()
    .neq("id", nonExistentUuid);
  if (topicsDeleteError) log(`Warning clearing topics: ${topicsDeleteError.message}`, "warn");

  const { error: profilesError } = await supabaseAdmin
    .schema("app")
    .from("profiles")
    .delete()
    .neq("id", nonExistentUuid);
  if (profilesError) log(`Warning clearing profiles: ${profilesError.message}`, "warn");

  const { error: sourcesError } = await supabaseAdmin
    .schema("app")
    .from("rss_sources")
    .delete()
    .neq("id", nonExistentUuid);
  if (sourcesError) log(`Warning clearing rss_sources: ${sourcesError.message}`, "warn");

  // Delete test users from auth
  const { data: users } = await supabaseAdmin.auth.admin.listUsers();
  if (users?.users) {
    for (const user of users.users) {
      if (TEST_USERS.some((tu) => tu.email === user.email)) {
        await supabaseAdmin.auth.admin.deleteUser(user.id);
      }
    }
  }

  log("Existing data cleared", "success");
}

// =====================================================================================
// Seed Functions
// =====================================================================================

async function seedUsers(): Promise<Map<string, string>> {
  log("Creating test users...", "info");
  const userIdMap = new Map<string, string>();

  for (const userData of TEST_USERS) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true, // Auto-confirm for development
      user_metadata: {
        name: userData.name,
      },
    });

    if (error) {
      log(`Failed to create user ${userData.email}: ${error.message}`, "error");
      continue;
    }

    if (data.user) {
      userIdMap.set(userData.email, data.user.id);
      log(`Created user: ${userData.email} (${data.user.id})`, "success");
    }
  }

  return userIdMap;
}

async function seedProfiles(userIdMap: Map<string, string>) {
  log("Creating user profiles...", "info");

  for (const userData of TEST_USERS) {
    const userId = userIdMap.get(userData.email);
    if (!userId) {
      log(`Skipping profile for ${userData.email} - user not found`, "warn");
      continue;
    }

    const { error } = await supabaseAdmin
      .schema("app")
      .from("profiles")
      .insert({
        user_id: userId,
        mood: userData.mood ?? null,
        blocklist: userData.blocklist ?? [],
      })
      .select()
      .single();

    if (error) {
      log(`Failed to create profile for ${userData.email}: ${error.message}`, "error");
    } else {
      log(`Created profile for: ${userData.email}`, "success");
    }
  }
}

async function seedRssSources(): Promise<Map<number, string>> {
  log("Creating RSS sources...", "info");
  const sourceIdMap = new Map<number, string>();

  for (let i = 0; i < RSS_SOURCES.length; i++) {
    const source = RSS_SOURCES[i];

    // Check if source already exists
    const { data: existing } = await supabaseAdmin
      .schema("app")
      .from("rss_sources")
      .select("id")
      .eq("url", source.url)
      .single();

    if (existing) {
      sourceIdMap.set(i, existing.id);
      log(`RSS source already exists: ${source.name}`, "info");
      continue;
    }

    const { data, error } = await supabaseAdmin
      .schema("app")
      .from("rss_sources")
      .insert({
        name: source.name,
        url: source.url,
      })
      .select()
      .single();

    if (error) {
      log(`Failed to create RSS source ${source.name}: ${error.message}`, "error");
    } else if (data) {
      sourceIdMap.set(i, data.id);
      log(`Created RSS source: ${source.name}`, "success");
    }
  }

  return sourceIdMap;
}

async function seedTopics(): Promise<Map<number, string>> {
  log("Creating topics...", "info");
  const topicIdMap = new Map<number, string>();

  for (let i = 0; i < TOPICS.length; i++) {
    const topicName = TOPICS[i];

    // Check if topic already exists (case-insensitive)
    const { data: existing } = await supabaseAdmin
      .schema("app")
      .from("topics")
      .select("id")
      .ilike("name", topicName)
      .single();

    if (existing) {
      topicIdMap.set(i, existing.id);
      log(`Topic already exists: ${topicName}`, "info");
      continue;
    }

    const { data, error } = await supabaseAdmin
      .schema("app")
      .from("topics")
      .insert({
        name: topicName,
      })
      .select()
      .single();

    if (error) {
      log(`Failed to create topic ${topicName}: ${error.message}`, "error");
    } else if (data) {
      topicIdMap.set(i, data.id);
      log(`Created topic: ${topicName}`, "success");
    }
  }

  return topicIdMap;
}

async function seedArticles(sourceIdMap: Map<number, string>, topicIdMap: Map<number, string>) {
  log("Creating articles...", "info");

  for (const articleData of TEST_ARTICLES) {
    const sourceId = sourceIdMap.get(articleData.sourceIndex);
    if (!sourceId) {
      log(`Skipping article - source index ${articleData.sourceIndex} not found`, "warn");
      continue;
    }

    // Check if article already exists
    const { data: existing } = await supabaseAdmin
      .schema("app")
      .from("articles")
      .select("id")
      .eq("link", articleData.link)
      .single();

    if (existing) {
      log(`Article already exists: ${articleData.title}`, "info");
      continue;
    }

    const { data: article, error: articleError } = await supabaseAdmin
      .schema("app")
      .from("articles")
      .insert({
        source_id: sourceId,
        title: articleData.title,
        description: articleData.description,
        link: articleData.link,
        publication_date: articleData.publicationDate.toISOString(),
        sentiment: articleData.sentiment,
      })
      .select()
      .single();

    if (articleError) {
      log(`Failed to create article ${articleData.title}: ${articleError.message}`, "error");
      continue;
    }

    if (!article) {
      log(`Article creation returned no data: ${articleData.title}`, "warn");
      continue;
    }

    log(`Created article: ${articleData.title}`, "success");

    // Create article-topic relationships
    for (const topicIndex of articleData.topicIndices) {
      const topicId = topicIdMap.get(topicIndex);
      if (!topicId) {
        log(`Skipping topic relationship - topic index ${topicIndex} not found`, "warn");
        continue;
      }

      const { error: relationError } = await supabaseAdmin.schema("app").from("article_topics").insert({
        article_id: article.id,
        topic_id: topicId,
      });

      if (relationError) {
        log(
          `Failed to create article-topic relationship for article ${article.id} and topic ${topicId}: ${relationError.message}`,
          "error"
        );
      }
    }
  }
}

// =====================================================================================
// Main Execution
// =====================================================================================

async function main() {
  const shouldReset = process.argv.includes("--reset") || process.argv.includes("-r");

  console.log("\n" + "=".repeat(60));
  console.log("🌱 PulseReader Database Seed Script");
  console.log("=".repeat(60) + "\n");

  try {
    if (shouldReset) {
      await clearExistingData();
      console.log();
    }

    // Seed in order respecting foreign key constraints
    const userIdMap = await seedUsers();
    console.log();

    await seedProfiles(userIdMap);
    console.log();

    const sourceIdMap = await seedRssSources();
    console.log();

    const topicIdMap = await seedTopics();
    console.log();

    await seedArticles(sourceIdMap, topicIdMap);
    console.log();

    console.log("=".repeat(60));
    log("Seed completed successfully! 🎉", "success");
    console.log("=".repeat(60));
    console.log("\nTest users created:");
    TEST_USERS.forEach((user) => {
      console.log(`  - ${user.email} (password: ${user.password})`);
    });
    console.log();
  } catch (error) {
    console.error("\n" + "=".repeat(60));
    log("Seed failed!", "error");
    console.error(error);
    console.log("=".repeat(60) + "\n");
    process.exit(1);
  }
}

// Run the seed script
main();
