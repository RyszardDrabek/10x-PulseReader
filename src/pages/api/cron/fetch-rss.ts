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

    // Fetch all active RSS sources
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
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    logger.info("Found active RSS sources", {
      endpoint: "POST /api/cron/fetch-rss",
      sourceCount: activeSources.length,
    });

    // Process each source sequentially
    const results = {
      processed: activeSources.length,
      succeeded: 0,
      failed: 0,
      articlesCreated: 0,
      errors: [] as { sourceId: string; sourceName: string; error: string }[],
    };

    for (const source of activeSources) {
      try {
        logger.info("Processing RSS source", {
          endpoint: "POST /api/cron/fetch-rss",
          sourceId: source.id,
          sourceName: source.name,
          sourceUrl: source.url,
        });

        // Fetch and parse RSS feed
        const fetchResult = await rssFetchService.fetchRssFeed(source.url);

        if (!fetchResult.success) {
          // Update source with error
          await rssSourceService.updateFetchStatus(source.id, false, fetchResult.error);
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

          continue;
        }

        // Process each article from the feed
        let articlesCreatedForSource = 0;
        for (const item of fetchResult.items) {
          try {
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
              // Article already exists, treat as success
              continue;
            }

            // Log other errors but continue processing
            logger.warn("Failed to create article", {
              endpoint: "POST /api/cron/fetch-rss",
              sourceId: source.id,
              articleLink: item.link,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        // Update source with success
        await rssSourceService.updateFetchStatus(source.id, true);
        results.succeeded++;

        logger.info("Successfully processed RSS source", {
          endpoint: "POST /api/cron/fetch-rss",
          sourceId: source.id,
          sourceName: source.name,
          articlesCreated: articlesCreatedForSource,
        });
      } catch (error) {
        // Handle unexpected errors for this source
        const errorMessage = error instanceof Error ? error.message : String(error);
        await rssSourceService.updateFetchStatus(source.id, false, errorMessage);
        results.failed++;
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

    logger.info("RSS feed fetch job completed", {
      endpoint: "POST /api/cron/fetch-rss",
      ...results,
    });

    // Return summary
    return new Response(
      JSON.stringify({
        success: true,
        ...results,
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

    // Include error details in development mode for debugging
    const isDevelopment = import.meta.env.DEV;
    const errorDetails =
      isDevelopment && error instanceof Error ? { message: error.message, stack: error.stack } : undefined;

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        code: "INTERNAL_ERROR",
        timestamp: new Date().toISOString(),
        ...(errorDetails && { details: errorDetails }),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (outerError) {
    // Catch any errors that occur outside the main try block
    logger.error("Critical error in RSS fetch endpoint", outerError, {
      endpoint: "POST /api/cron/fetch-rss",
    });

    return new Response(
      JSON.stringify({
        error: "Critical server error",
        code: "CRITICAL_ERROR",
        timestamp: new Date().toISOString(),
        message: outerError instanceof Error ? outerError.message : String(outerError),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
