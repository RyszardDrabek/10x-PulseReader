import { z } from "zod";

import { logger } from "../utils/logger.ts";
import { OpenRouterClient } from "./openrouter.client.ts";
import {
  aiAnalysisResponseSchema,
  articleAnalysisInputSchema,
  type AiAnalysisResult,
  type ArticleAnalysisInput
} from "../validation/ai-analysis.schema.ts";

/**
 * Service for AI-powered article analysis using OpenRouter API.
 * Handles sentiment classification and topic extraction.
 */
export class AiAnalysisService {
  private client: OpenRouterClient;

  constructor(openRouterClient?: OpenRouterClient) {
    this.client = openRouterClient || new OpenRouterClient();
  }

  /**
   * Analyzes an article's sentiment and extracts topics using AI.
   * @param input - Article content to analyze
   * @returns Analysis result with sentiment and topics
   * @throws Error if AI analysis fails
   */
  async analyzeArticle(input: ArticleAnalysisInput): Promise<AiAnalysisResult> {
    // Validate input
    const validatedInput = articleAnalysisInputSchema.parse(input);

    logger.info("Starting AI analysis for article", {
      title: validatedInput.title.substring(0, 100),
      textLength: validatedInput.combinedText.length,
    });

    // Create analysis prompt
    const prompt = this.buildAnalysisPrompt(validatedInput);

    try {
      // Make API request
      const response = await this.client.chatCompletion([
        {
          role: "system",
          content: this.getSystemPrompt()
        },
        {
          role: "user",
          content: prompt
        }
      ]);

      // Extract and parse AI response
      const aiResponse = response.choices[0].message.content;

      logger.debug("AI raw response", { response: aiResponse });

      // Parse JSON response
      let parsedResponse: unknown;
      try {
        parsedResponse = JSON.parse(aiResponse);
      } catch (parseError) {
        logger.error("Failed to parse AI response as JSON", {
          aiResponse: aiResponse.substring(0, 500),
          parseError: parseError instanceof Error ? parseError.message : String(parseError),
        });
        throw new Error("AI_RESPONSE_INVALID_JSON");
      }

      // Validate response structure
      const analysisResult = aiAnalysisResponseSchema.parse(parsedResponse);

      logger.info("AI analysis completed successfully", {
        sentiment: analysisResult.sentiment,
        topicsCount: analysisResult.topics.length,
        topics: analysisResult.topics,
      });

      return analysisResult;

    } catch (error) {
      logger.error("AI analysis failed", {
        error: error instanceof Error ? error.message : String(error),
        title: validatedInput.title.substring(0, 100),
      });

      // Re-throw with more context
      if (error instanceof z.ZodError) {
        throw new Error(`AI_RESPONSE_VALIDATION_FAILED: ${error.message}`);
      }

      throw error; // Re-throw original error
    }
  }

  /**
   * Builds the analysis prompt for the AI model.
   * @param input - Validated article input
   * @returns Formatted prompt string
   */
  private buildAnalysisPrompt(input: ArticleAnalysisInput): string {
    return `Please analyze this news article and provide sentiment classification and topic extraction.

Article Title: ${input.title}

Article Content: ${input.combinedText}

Instructions:
1. Classify the overall sentiment of the article as exactly one of: "positive", "neutral", or "negative"
2. Extract 2-3 main topics that best describe the article's content
3. Return only valid JSON in this exact format:
{
  "sentiment": "positive|neutral|negative",
  "topics": ["topic1", "topic2", "topic3"]
}

Requirements:
- Topics should be concise (1-3 words each)
- Topics should be unique and relevant to the article content
- Sentiment should reflect the overall tone and implications of the article
- Use lowercase for all topics unless proper nouns are required`;
  }

  /**
   * Returns the system prompt that sets the AI's behavior.
   * @returns System prompt string
   */
  private getSystemPrompt(): string {
    return `You are an expert news analyst AI specializing in sentiment analysis and topic classification for news articles.

Your task is to analyze news articles and provide structured analysis in JSON format only.

Key guidelines:
- Be objective and consistent in sentiment classification
- Focus on factual content rather than sensational headlines
- Extract meaningful, specific topics rather than generic categories
- Always return valid JSON that matches the required schema
- If uncertain about sentiment, default to "neutral"
- Topics should be actionable and useful for content filtering

Remember: Return ONLY the JSON response, no additional text or explanations.`;
  }

  /**
   * Prepares article content for AI analysis by combining and truncating text.
   * @param title - Article title
   * @param description - Article description (optional)
   * @returns Prepared analysis input
   */
  static prepareArticleForAnalysis(title: string, description?: string | null): ArticleAnalysisInput {
    // Combine title and description, but prioritize description content
    let combinedText = title;

    if (description && description.trim()) {
      // If description is longer and more substantial, use it primarily
      if (description.length > title.length * 2) {
        combinedText = `${title}\n\n${description}`;
      } else {
        // Otherwise, combine but don't duplicate title content
        combinedText = description.includes(title)
          ? description
          : `${title}\n\n${description}`;
      }
    }

    // Truncate to reasonable length for AI processing
    // Keep it under 2000 characters to fit within token limits
    if (combinedText.length > 1500) {
      combinedText = combinedText.substring(0, 1500) + "...";
    }

    // Clean up whitespace
    combinedText = combinedText.replace(/\s+/g, ' ').trim();

    return {
      title: title.trim(),
      description: description?.trim() || null,
      combinedText,
    };
  }

  /**
   * Tests the AI service connection and functionality.
   * @returns Test result
   */
  async testService(): Promise<{ success: boolean; error?: string }> {
    try {
      // Test with a simple article
      const testInput = AiAnalysisService.prepareArticleForAnalysis(
        "Test Article",
        "This is a test article for AI service validation."
      );

      await this.analyzeArticle(testInput);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
