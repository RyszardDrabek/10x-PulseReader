import type { APIRoute } from "astro";

import { ArticleService } from "../../../lib/services/article.service.ts";
import { RssFetchService } from "../../../lib/services/rss-fetch.service.ts";
import { RssSourceService } from "../../../lib/services/rss-source.service.ts";
import { logger } from "../../../lib/utils/logger.ts";

export const prerender = false;

/**
 * POST /api/cron/fetch-rss
 * Fetches articles from all active RSS sources and saves them to the database.
 * Used by GitHub Actions cron job scheduled to run every 15 minutes.
 *
 * Authentication: Required (service_role JWT token via Authorization header)
 *
 * @returns 200 OK with processing summary on success
 * @returns 401 Unauthorized if not authenticated or not service role
 * @returns 500 Internal Server Error for unexpected errors
 */
export const POST: APIRoute = async (context) => {
  try {
    const supabase = context.locals.supabase;
    const user = context.locals.user;

    // Validate Supabase client is available
    if (!supabase) {
      logger.error("Supabase client not initialized", {
        endpoint: "POST /api/cron/fetch-rss",
      });

      return new Response(
        JSON.stringify({
          error: "Server configuration error: Supabase client not available",
          code: "CONFIGURATION_ERROR",
          timestamp: new Date().toISOString(),
          debug: {
            hasSupabase: !!supabase,
            hasUser: !!user,
            envVars: {
              hasServiceRoleKey: !!import.meta.env.SUPABASE_SERVICE_ROLE_KEY,
              hasSupabaseUrl: !!(import.meta.env.SUPABASE_URL || import.meta.env.PUBLIC_SUPABASE_URL),
            },
          },
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Check authentication
    if (!user) {
      logger.warn("POST /api/cron/fetch-rss called without authentication", {
        endpoint: "POST /api/cron/fetch-rss",
      });

      return new Response(
        JSON.stringify({
          error: "Authentication required",
          code: "AUTHENTICATION_REQUIRED",
          timestamp: new Date().toISOString(),
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Check authorization (service role only)
    if (user.role !== "service_role") {
      logger.warn("POST /api/cron/fetch-rss called without service role", {
        endpoint: "POST /api/cron/fetch-rss",
        userId: (user as { id?: string }).id,
      });

      return new Response(
        JSON.stringify({
          error: "Service role required for this endpoint",
          code: "FORBIDDEN",
          timestamp: new Date().toISOString(),
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    try {
      logger.info("Starting RSS feed fetch job", {
        endpoint: "POST /api/cron/fetch-rss",
      });

      // Initialize services
      const rssSourceService = new RssSourceService(supabase);
      const rssFetchService = new RssFetchService();
      const articleService = new ArticleService(supabase);

      // Fetch all active RSS sources (ordered by last_fetched_at ascending, nulls first)
      // This ensures sources that haven't been fetched recently are prioritized
      const activeSources = await rssSourceService.getActiveRssSources();

      if (activeSources.length === 0) {
        logger.info("No active RSS sources found", {
          endpoint: "POST /api/cron/fetch-rss",
        });

        return new Response(
          JSON.stringify({
            success: true,
            processed: 0,
            succeeded: 0,
            failed: 0,
            articlesCreated: 0,
            errors: [],
            hasMoreWork: false,
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Limit sources to prevent hitting Cloudflare's 50 subrequest limit
      // Strategy: Process ALL articles from fewer sources to ensure completeness
      // Each source: 1 HTTP fetch + N article creates (each = 1 DB call = 1 HTTP request)
      // With 2 sources × 15 articles = 2 fetches + 30 creates = 32 requests (well under 50 limit)
      // This ensures each source is fully processed before moving to the next
      const MAX_SOURCES_PER_RUN = 2;
      const sourcesToProcess = activeSources.slice(0, MAX_SOURCES_PER_RUN);
      const skippedSources = activeSources.length - sourcesToProcess.length;

      logger.info("Source selection for processing", {
        endpoint: "POST /api/cron/fetch-rss",
        totalSources: activeSources.length,
        processingSources: sourcesToProcess.map((s) => ({ id: s.id, name: s.name, lastFetchedAt: s.lastFetchedAt })),
        skippedSources: activeSources
          .slice(MAX_SOURCES_PER_RUN)
          .map((s) => ({ id: s.id, name: s.name, lastFetchedAt: s.lastFetchedAt })),
      });

      logger.info("Found active RSS sources", {
        endpoint: "POST /api/cron/fetch-rss",
        totalSources: activeSources.length,
        processingSources: sourcesToProcess.length,
        skippedSources,
      });

      // Process each source sequentially
      // Track total requests to stay under Cloudflare's 50 subrequest limit
      // Each RSS fetch = 1 request, each article create = 1 request
      const MAX_SUBREQUESTS = 45; // Leave buffer under 50 limit
      let totalSubrequests = 0;

      const results = {
        processed: 0,
        succeeded: 0,
        failed: 0,
        articlesCreated: 0,
        errors: [] as { sourceId: string; sourceName: string; error: string }[],
        skippedSources: 0,
        skippedArticles: [] as { sourceId: string; sourceName: string; skippedCount: number }[],
        hasMoreWork: false,
        stoppedEarly: false,
      };

      for (const source of sourcesToProcess) {
        // Check if we're approaching the subrequest limit
        if (totalSubrequests >= MAX_SUBREQUESTS) {
          results.stoppedEarly = true;
          results.skippedSources = activeSources.length - results.processed;
          results.hasMoreWork = true;
          logger.warn("Stopped processing early due to subrequest limit", {
            endpoint: "POST /api/cron/fetch-rss",
            processedSources: results.processed,
            totalSubrequests,
            remainingSources: activeSources.length - results.processed,
          });
          break;
        }
        try {
          logger.info("Processing RSS source", {
            endpoint: "POST /api/cron/fetch-rss",
            sourceId: source.id,
            sourceName: source.name,
            sourceUrl: source.url,
          });

          // Add small delay between sources to be gentle on rate limits
          // Skip delay for first source
          if (results.processed > 0) {
            await new Promise((resolve) => setTimeout(resolve, 500)); // 500ms delay
          }

          // Fetch and parse RSS feed (1 subrequest)
          totalSubrequests++;
          const fetchResult = await rssFetchService.fetchRssFeed(source.url);

          if (!fetchResult.success) {
            // Skip status update to save subrequests
            // await rssSourceService.updateFetchStatus(source.id, false, fetchResult.error);
            results.failed++;
            results.errors.push({
              sourceId: source.id,
              sourceName: source.name,
              error: fetchResult.error || "Unknown error",
            });

            logger.warn("Failed to fetch RSS feed", {
              endpoint: "POST /api/cron/fetch-rss",
              sourceId: source.id,
              sourceName: source.name,
              error: fetchResult.error,
            });

            results.processed++;
            continue;
          }

          // Process ALL articles from this source to ensure completeness
          // Process articles until we approach the subrequest limit
          let articlesCreatedForSource = 0;

          // Process all articles, but stop if we're running out of requests
          for (const item of fetchResult.items) {
            // Check if we have enough requests left (need at least 1 for this article)
            if (totalSubrequests >= MAX_SUBREQUESTS) {
              const skippedCount = fetchResult.items.length - articlesCreatedForSource;
              if (skippedCount > 0) {
                logger.warn("Stopped processing articles due to subrequest limit", {
                  endpoint: "POST /api/cron/fetch-rss",
                  sourceId: source.id,
                  processedArticles: articlesCreatedForSource,
                  skippedArticles: skippedCount,
                  totalSubrequests,
                });
                results.skippedArticles.push({
                  sourceId: source.id,
                  sourceName: source.name,
                  skippedCount,
                });
              }
              break;
            }

            try {
              // Add small delay between article creations to be gentle on rate limits
              // Skip delay for first article
              if (articlesCreatedForSource > 0) {
                await new Promise((resolve) => setTimeout(resolve, 100)); // 100ms delay
              }

              totalSubrequests++; // Count this article creation
              await articleService.createArticle({
                sourceId: source.id,
                title: item.title,
                description: item.description,
                link: item.link,
                publicationDate: item.publicationDate,
              });

              articlesCreatedForSource++;
              results.articlesCreated++;
            } catch (error) {
              // Handle duplicate articles (409 Conflict) as success
              if (error instanceof Error && error.message === "ARTICLE_ALREADY_EXISTS") {
                // Article already exists, treat as success (but don't count as subrequest since it failed early)
                totalSubrequests--; // Don't count failed requests
                continue;
              }

              // Log other errors but continue processing
              totalSubrequests--; // Don't count failed requests
              logger.warn("Failed to create article", {
                endpoint: "POST /api/cron/fetch-rss",
                sourceId: source.id,
                articleLink: item.link,
                error: error instanceof Error ? error.message : String(error),
              });
            }
          }

          // Skip status update to save subrequests - will update in batch at end if needed
          // await rssSourceService.updateFetchStatus(source.id, true);
          results.succeeded++;
          results.processed++;

          logger.info("Successfully processed RSS source", {
            endpoint: "POST /api/cron/fetch-rss",
            sourceId: source.id,
            sourceName: source.name,
            articlesCreated: articlesCreatedForSource,
          });
        } catch (error) {
          // Handle unexpected errors for this source
          // Skip status update to save subrequests
          const errorMessage = error instanceof Error ? error.message : String(error);
          // await rssSourceService.updateFetchStatus(source.id, false, errorMessage);
          results.failed++;
          results.processed++;
          results.errors.push({
            sourceId: source.id,
            sourceName: source.name,
            error: errorMessage,
          });

          logger.error("Unexpected error processing RSS source", error, {
            endpoint: "POST /api/cron/fetch-rss",
            sourceId: source.id,
            sourceName: source.name,
          });
        }
      }

      // Calculate remaining sources
      results.skippedSources = activeSources.length - results.processed;
      results.hasMoreWork = results.skippedSources > 0 || results.stoppedEarly;

      // Update last_fetched_at for successfully processed sources to enable round-robin
      // Do this in batch at the end to save subrequests (1 update call instead of N)
      if (results.succeeded > 0 && totalSubrequests < MAX_SUBREQUESTS - 1) {
        const succeededSourceIds = sourcesToProcess
          .slice(0, results.processed)
          .filter((source) => {
            // Check if this source succeeded (not in errors array)
            return !results.errors.some((err) => err.sourceId === source.id);
          })
          .map((source) => source.id);

        if (succeededSourceIds.length > 0) {
          try {
            totalSubrequests++; // Count batch update as 1 subrequest
            // Update all succeeded sources in a single batch update
            const { error: batchUpdateError } = await supabase
              .schema("app")
              .from("rss_sources")
              .update({ last_fetched_at: new Date().toISOString() })
              .in("id", succeededSourceIds);

            if (batchUpdateError) {
              logger.warn("Failed to batch update source fetch status", {
                endpoint: "POST /api/cron/fetch-rss",
                error: batchUpdateError.message,
              });
            } else {
              logger.info("Batch updated source fetch status", {
                endpoint: "POST /api/cron/fetch-rss",
                updatedCount: succeededSourceIds.length,
              });
            }
          } catch (error) {
            logger.warn("Error during batch status update", {
              endpoint: "POST /api/cron/fetch-rss",
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
      }

      logger.info("RSS feed fetch job completed", {
        endpoint: "POST /api/cron/fetch-rss",
        ...results,
        totalSubrequests,
      });

      // Return summary
      return new Response(
        JSON.stringify({
          success: true,
          ...results,
          totalSubrequests, // Include subrequest count in response
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      logger.error("Failed to process RSS feeds", error, {
        endpoint: "POST /api/cron/fetch-rss",
      });

      // Include error details for debugging (even in production for this endpoint)
      const errorDetails =
        error instanceof Error
          ? {
              message: error.message,
              stack: error.stack?.split("\n").slice(0, 5).join("\n"), // First 5 lines of stack
              name: error.name,
            }
          : { message: String(error) };

      return new Response(
        JSON.stringify({
          error: "Internal server error",
          code: "INTERNAL_ERROR",
          timestamp: new Date().toISOString(),
          details: errorDetails,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  } catch (outerError) {
    // Catch any errors that occur outside the main try block (e.g., during validation)
    logger.error("Critical error in RSS fetch endpoint", outerError, {
      endpoint: "POST /api/cron/fetch-rss",
    });

    const errorDetails =
      outerError instanceof Error
        ? {
            message: outerError.message,
            stack: outerError.stack?.split("\n").slice(0, 5).join("\n"),
            name: outerError.name,
          }
        : { message: String(outerError) };

    return new Response(
      JSON.stringify({
        error: "Critical server error",
        code: "CRITICAL_ERROR",
        timestamp: new Date().toISOString(),
        details: errorDetails,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
