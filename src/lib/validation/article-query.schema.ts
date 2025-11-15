import { z } from "zod";

/**
 * Validation schema for GET /api/articles query parameters.
 * All parameters are optional with defaults applied in validation.
 * URL query params are strings, so we use coercion to transform to proper types.
 */
export const GetArticlesQueryParamsSchema = z.object({
  /**
   * Number of articles to return per page.
   * Default: 20, Min: 1, Max: 100
   */
  limit: z
    .string()
    .optional()
    .default("20")
    .transform((val) => parseInt(val, 10))
    .pipe(
      z
        .number()
        .int({ message: "Limit must be an integer" })
        .min(1, { message: "Limit must be at least 1" })
        .max(100, { message: "Limit must not exceed 100" })
    ),

  /**
   * Offset for pagination (number of articles to skip).
   * Default: 0, Min: 0
   */
  offset: z
    .string()
    .optional()
    .default("0")
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int({ message: "Offset must be an integer" }).min(0, { message: "Offset must be non-negative" })),

  /**
   * Filter articles by sentiment (positive, neutral, negative).
   * Optional - if not provided, all sentiments are included.
   */
  sentiment: z
    .enum(["positive", "neutral", "negative"], {
      errorMap: () => ({ message: "Sentiment must be one of: positive, neutral, negative" }),
    })
    .optional(),

  /**
   * Filter articles by topic ID (UUID).
   * Optional - if not provided, all topics are included.
   */
  topicId: z.string().uuid({ message: "Invalid UUID format for topicId" }).optional(),

  /**
   * Filter articles by RSS source ID (UUID).
   * Optional - if not provided, all sources are included.
   */
  sourceId: z.string().uuid({ message: "Invalid UUID format for sourceId" }).optional(),

  /**
   * Apply personalization based on authenticated user's mood and blocklist.
   * Requires authentication when set to true.
   * Default: false
   */
  applyPersonalization: z
    .string()
    .optional()
    .default("false")
    .transform((val) => val === "true")
    .pipe(z.boolean()),

  /**
   * Field to sort by.
   * Default: publication_date
   */
  sortBy: z
    .enum(["publication_date", "created_at"], {
      errorMap: () => ({ message: "sortBy must be one of: publication_date, created_at" }),
    })
    .optional()
    .default("publication_date"),

  /**
   * Sort order direction.
   * Default: desc (newest first)
   */
  sortOrder: z
    .enum(["asc", "desc"], {
      errorMap: () => ({ message: "sortOrder must be one of: asc, desc" }),
    })
    .optional()
    .default("desc"),
});

/**
 * TypeScript type inferred from the validation schema.
 * Represents validated and transformed query parameters.
 */
export type GetArticlesQueryParamsValidated = z.infer<typeof GetArticlesQueryParamsSchema>;
