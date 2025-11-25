import { z } from "zod";

/**
 * Schema for AI analysis response from OpenRouter API.
 * Validates the structured JSON response containing sentiment and topics.
 */
export const aiAnalysisResponseSchema = z.object(
  {
    sentiment: z.enum(["positive", "neutral", "negative"], {
      description: "Article sentiment classification",
    }),
    topics: z
      .array(z.string().min(1).max(50))
      .min(1)
      .max(5)
      .refine((topics) => topics.length === new Set(topics.map((t) => t.toLowerCase())).size, {
        message: "Topics must be unique (case-insensitive)",
      })
      .refine((topics) => topics.every((topic) => !/\s{2,}/.test(topic)), {
        message: "Topics should not contain multiple consecutive spaces",
      })
      .refine((topics) => topics.every((topic) => topic.trim() === topic), {
        message: "Topics should not have leading or trailing whitespace",
      }),
  },
  {
    description: "AI analysis response containing sentiment and topics for an article",
  }
);

/**
 * Schema for the complete OpenRouter API response wrapper.
 * This matches the expected OpenRouter response structure.
 */
export const openRouterResponseSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({
          content: z.string().min(1, "AI response content cannot be empty"),
        }),
      })
    )
    .min(1),
});

/**
 * Parsed and validated AI analysis result.
 * This is the result after parsing and validating the AI response.
 */
export type AiAnalysisResult = z.infer<typeof aiAnalysisResponseSchema>;

/**
 * Raw OpenRouter API response structure.
 */
export type OpenRouterResponse = z.infer<typeof openRouterResponseSchema>;

/**
 * Schema for article text input to AI analysis.
 * Validates the content being sent for analysis.
 */
export const articleAnalysisInputSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().nullable().optional(),
  combinedText: z.string().min(10).max(2000), // Combined title + description, truncated
});

/**
 * Validated article input for AI analysis.
 */
export type ArticleAnalysisInput = z.infer<typeof articleAnalysisInputSchema>;
