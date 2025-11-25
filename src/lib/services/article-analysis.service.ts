import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../db/database.types.ts";
import type { ArticleEntity, CreateTopicCommand } from "../../types.ts";
import { AiAnalysisService } from "./ai-analysis.service.ts";
import { TopicService } from "./topic.service.ts";
import { logger } from "../utils/logger.ts";

/**
 * Service that orchestrates AI analysis of articles and updates the database.
 * Handles sentiment classification and topic association.
 */
export class ArticleAnalysisService {
  private aiService: AiAnalysisService;
  private topicService: TopicService;

  constructor(
    private supabase: SupabaseClient<Database>,
    aiService?: AiAnalysisService
  ) {
    this.aiService = aiService || new AiAnalysisService();
    this.topicService = new TopicService(supabase);
  }

  /**
   * Analyzes an article using AI and updates it with sentiment and topics.
   * If AI analysis fails, the article remains unchanged (graceful degradation).
   *
   * @param article - Article entity to analyze
   * @returns Object indicating success and what was updated
   */
  async analyzeAndUpdateArticle(article: ArticleEntity): Promise<{
    success: boolean;
    sentimentUpdated: boolean;
    topicsUpdated: boolean;
    error?: string;
  }> {
    logger.info("Starting article analysis", {
      articleId: article.id,
      title: article.title.substring(0, 100),
    });

    try {
      // Prepare article content for AI analysis
      const analysisInput = AiAnalysisService.prepareArticleForAnalysis(article.title, article.description);

      // Perform AI analysis
      const analysisResult = await this.aiService.analyzeArticle(analysisInput);

      logger.debug("AI analysis successful", {
        articleId: article.id,
        sentiment: analysisResult.sentiment,
        topicsCount: analysisResult.topics.length,
      });

      // Update article with sentiment
      let sentimentUpdated = false;
      let topicsUpdated = false;

      // Update sentiment
      await this.updateArticleSentiment(article.id, analysisResult.sentiment);
      sentimentUpdated = true;

      // Create/find topics and associate them with the article
      if (analysisResult.topics.length > 0) {
        const topicIds = await this.createOrFindTopics(analysisResult.topics);
        await this.associateTopicsWithArticle(article.id, topicIds);
        topicsUpdated = true;
      }

      logger.info("Article analysis completed successfully", {
        articleId: article.id,
        sentiment: analysisResult.sentiment,
        topicsCreated: analysisResult.topics.length,
      });

      return {
        success: true,
        sentimentUpdated,
        topicsUpdated,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error("Article analysis failed", {
        articleId: article.id,
        error: errorMessage,
        title: article.title.substring(0, 100),
      });

      // Return failure but don't throw - graceful degradation
      return {
        success: false,
        sentimentUpdated: false,
        topicsUpdated: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Analyzes multiple articles in batch.
   * Processes articles sequentially with small delays to avoid rate limits.
   *
   * @param articles - Array of article entities to analyze
   * @returns Analysis results for each article
   */
  async analyzeArticlesBatch(articles: ArticleEntity[]): Promise<
    {
      articleId: string;
      success: boolean;
      sentimentUpdated: boolean;
      topicsUpdated: boolean;
      error?: string;
    }[]
  > {
    const results = [];

    logger.info("Starting batch article analysis", {
      articleCount: articles.length,
    });

    for (let i = 0; i < articles.length; i++) {
      const article = articles[i];

      // Add small delay between requests to be gentle on rate limits
      if (i > 0) {
        await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 second delay
      }

      const result = await this.analyzeAndUpdateArticle(article);
      results.push({
        articleId: article.id,
        ...result,
      });
    }

    const successCount = results.filter((r) => r.success).length;
    logger.info("Batch article analysis completed", {
      totalArticles: articles.length,
      successfulAnalyses: successCount,
      failedAnalyses: articles.length - successCount,
    });

    return results;
  }

  /**
   * Updates an article's sentiment in the database.
   * @param articleId - Article ID to update
   * @param sentiment - New sentiment value
   */
  private async updateArticleSentiment(
    articleId: string,
    sentiment: "positive" | "neutral" | "negative"
  ): Promise<void> {
    const { error } = await this.supabase
      .schema("app")
      .from("articles")
      .update({
        sentiment,
        updated_at: new Date().toISOString(),
      })
      .eq("id", articleId);

    if (error) {
      throw new Error(`Failed to update article sentiment: ${error.message}`);
    }
  }

  /**
   * Creates or finds topics by name and returns their IDs.
   * @param topicNames - Array of topic names
   * @returns Array of topic IDs
   */
  private async createOrFindTopics(topicNames: string[]): Promise<string[]> {
    const topicIds: string[] = [];

    for (const topicName of topicNames) {
      try {
        // Clean and normalize topic name
        const cleanName = topicName.trim();

        // Skip empty topics
        if (!cleanName) {
          continue;
        }

        // Create or find topic
        const result = await this.topicService.createOrFindTopic({
          name: cleanName,
        } as CreateTopicCommand);

        topicIds.push(result.topic.id);

        if (result.created) {
          logger.debug("Created new topic", { topicName: cleanName, topicId: result.topic.id });
        } else {
          logger.debug("Found existing topic", { topicName: cleanName, topicId: result.topic.id });
        }
      } catch (error) {
        logger.warn("Failed to create/find topic, skipping", {
          topicName,
          error: error instanceof Error ? error.message : String(error),
        });
        // Continue with other topics - don't fail the whole analysis
      }
    }

    return topicIds;
  }

  /**
   * Associates topics with an article by creating article_topics records.
   * @param articleId - Article ID
   * @param topicIds - Array of topic IDs to associate
   */
  private async associateTopicsWithArticle(articleId: string, topicIds: string[]): Promise<void> {
    if (topicIds.length === 0) {
      return;
    }

    // Prepare association records
    const associations = topicIds.map((topicId) => ({
      article_id: articleId,
      topic_id: topicId,
    }));

    const { error } = await this.supabase.schema("app").from("article_topics").insert(associations);

    if (error) {
      throw new Error(`Failed to associate topics with article: ${error.message}`);
    }
  }

  /**
   * Tests the article analysis service end-to-end.
   * @returns Test result with details
   */
  async testService(): Promise<{
    success: boolean;
    aiServiceWorking: boolean;
    databaseWritable: boolean;
    error?: string;
  }> {
    try {
      // Test AI service
      const aiTest = await this.aiService.testService();
      if (!aiTest.success) {
        return {
          success: false,
          aiServiceWorking: false,
          databaseWritable: false,
          error: `AI service test failed: ${aiTest.error}`,
        };
      }

      // Test database write access by creating a test topic
      const testTopicName = `test-topic-${Date.now()}`;
      const topicResult = await this.topicService.createOrFindTopic({
        name: testTopicName,
      } as CreateTopicCommand);

      if (!topicResult.created && topicResult.topic.name !== testTopicName) {
        throw new Error("Database topic creation test failed");
      }

      // Clean up test topic
      if (topicResult.created) {
        try {
          await this.topicService.deleteTopic(topicResult.topic.id);
        } catch {
          // Ignore cleanup errors
        }
      }

      return {
        success: true,
        aiServiceWorking: true,
        databaseWritable: true,
      };
    } catch (error) {
      return {
        success: false,
        aiServiceWorking: false,
        databaseWritable: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
