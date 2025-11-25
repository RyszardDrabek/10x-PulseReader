#!/usr/bin/env node
/* eslint-env node */

/**
 * Delete Recent Articles Script for PulseReader
 *
 * This script deletes articles from the last N days.
 * Useful for testing AI analysis on fresh content.
 *
 * Usage:
 *   node scripts/delete-recent-articles.cjs --days 2
 *   SUPABASE_SERVICE_ROLE_KEY='your-key' node scripts/delete-recent-articles.cjs --days 7
 */

const { createClient } = require('@supabase/supabase-js');

// Parse command line arguments
const args = process.argv.slice(2);
let daysToDelete = 2; // Default: last 2 days

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--days' && args[i + 1]) {
    daysToDelete = parseInt(args[i + 1], 10);
    if (isNaN(daysToDelete) || daysToDelete < 0) {
      console.error('❌ Invalid days value. Must be a positive number.');
      process.exit(1);
    }
    break;
  }
}

// Calculate the cutoff date
const cutoffDate = new Date();
cutoffDate.setDate(cutoffDate.getDate() - daysToDelete);
const cutoffISOString = cutoffDate.toISOString();

console.log(`🗑️  Deleting articles from the last ${daysToDelete} days...`);
console.log(`📅 Cutoff date: ${cutoffISOString}`);

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable is not set');
  console.error('\nSet the service role key:');
  console.error('  export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"');
  console.error('  node scripts/delete-recent-articles.cjs --days 2');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteRecentArticles() {
  try {
    console.log('\n🔍 Checking for articles to delete...');

    // First, count articles that will be deleted
    const { data: articlesToDelete, error: countError } = await supabase
      .schema('app')
      .from('articles')
      .select('id, title, created_at')
      .gte('created_at', cutoffISOString);

    if (countError) {
      console.error('❌ Error counting articles:', countError.message);
      process.exit(1);
    }

    const articleCount = articlesToDelete?.length || 0;
    console.log(`📊 Found ${articleCount} articles created since ${cutoffISOString}`);

    if (articleCount === 0) {
      console.log('✅ No articles to delete. Database is already clean.');
      return;
    }

    // Show sample of articles to be deleted
    if (articleCount <= 5) {
      console.log('\n📝 Articles to be deleted:');
      articlesToDelete?.forEach((article, index) => {
        console.log(`  ${index + 1}. "${article.title?.substring(0, 50)}${article.title?.length > 50 ? '...' : ''}"`);
      });
    } else {
      console.log('\n📝 Sample of articles to be deleted:');
      articlesToDelete?.slice(0, 3).forEach((article, index) => {
        console.log(`  ${index + 1}. "${article.title?.substring(0, 50)}${article.title?.length > 50 ? '...' : ''}"`);
      });
      console.log(`  ... and ${articleCount - 3} more articles`);
    }

    // Confirm deletion
    console.log(`\n⚠️  This will delete ${articleCount} articles and their associated topics.`);
    console.log('Are you sure? (This action cannot be undone!)');

    // In a real script, you'd want user confirmation, but for automation we'll proceed
    console.log('⏳ Proceeding with deletion...');

    // Delete articles (CASCADE will handle article_topics)
    const { data: deletedArticles, error: deleteError } = await supabase
      .schema('app')
      .from('articles')
      .delete()
      .gte('created_at', cutoffISOString)
      .select('id, title');

    if (deleteError) {
      console.error('❌ Error deleting articles:', deleteError.message);
      process.exit(1);
    }

    const deletedCount = deletedArticles?.length || 0;
    console.log(`\n✅ Successfully deleted ${deletedCount} articles`);

    // Also clean up orphaned topics (topics not referenced by any articles)
    console.log('🧹 Cleaning up orphaned topics...');

    // First, get all topic IDs that are still referenced
    const { data: referencedTopicIds, error: refError } = await supabase
      .schema('app')
      .from('article_topics')
      .select('topic_id');

    if (refError) {
      console.warn('⚠️  Could not check for orphaned topics:', refError.message);
    } else {
      const uniqueReferencedTopicIds = [...new Set(referencedTopicIds?.map(at => at.topic_id))];

      // Delete topics that are not referenced
      const { data: allTopics, error: allTopicsError } = await supabase
        .schema('app')
        .from('topics')
        .select('id, name');

      if (!allTopicsError && allTopics) {
        const orphanedTopics = allTopics.filter(topic => !uniqueReferencedTopicIds.includes(topic.id));

        if (orphanedTopics.length > 0) {
          const orphanedIds = orphanedTopics.map(t => t.id);
          const { error: cleanupError } = await supabase
            .schema('app')
            .from('topics')
            .delete()
            .in('id', orphanedIds);

          if (cleanupError) {
            console.warn('⚠️  Could not clean up orphaned topics:', cleanupError.message);
          } else {
            console.log(`🧹 Cleaned up ${orphanedTopics.length} orphaned topics`);
          }
        } else {
          console.log('✅ No orphaned topics to clean up');
        }
      }
    }

    console.log('\n🎉 Database cleanup completed successfully!');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  deleteRecentArticles().catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { deleteRecentArticles };
