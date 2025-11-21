import { z } from "zod";

/**
 * Validation schema for creating a new article via POST /api/articles.
 * Used by the RSS fetching cron job (service role only).
 */
export const CreateArticleCommandSchema = z.object({
  sourceId: z.string().uuid({ message: "Invalid UUID format for sourceId" }),
  title: z
    .string()
    .min(1, { message: "Title is required" })
    .max(1000, { message: "Title must not exceed 1000 characters" }),
  description: z.string().max(5000, { message: "Description must not exceed 5000 characters" }).nullable().optional(),
  link: z.string().url({ message: "Link must be a valid URL" }),
  publicationDate: z.string().datetime({
    message: "Publication date must be a valid ISO 8601 datetime",
  }),
  sentiment: z
    .enum(["positive", "neutral", "negative"], {
      errorMap: () => ({
        message: "Sentiment must be one of: positive, neutral, negative, or null",
      }),
    })
    .nullable()
    .optional(),
  topicIds: z
    .array(z.string().uuid({ message: "Invalid UUID format in topicIds" }))
    .max(20, { message: "Maximum 20 topics allowed per article" })
    .optional(),
});

/**
 * TypeScript type inferred from the validation schema.
 */
export type CreateArticleCommandValidated = z.infer<typeof CreateArticleCommandSchema>;

/**
 * Validation schema for updating an article via PATCH /api/articles/:id.
 * Used by the AI analysis job (service role only).
 * All fields are optional for partial updates.
 */
export const UpdateArticleCommandSchema = z.object({
  sentiment: z
    .enum(["positive", "neutral", "negative"], {
      errorMap: () => ({
        message: "Sentiment must be one of: positive, neutral, negative, or null",
      }),
    })
    .nullable()
    .optional(),
  topicIds: z
    .array(z.string().uuid({ message: "Invalid UUID format in topicIds" }))
    .max(20, { message: "Maximum 20 topics allowed per article" })
    .optional(),
});

/**
 * TypeScript type inferred from the validation schema.
 */
export type UpdateArticleCommandValidated = z.infer<typeof UpdateArticleCommandSchema>;

/**
 * Validation schema for UUID path parameters.
 * Reusable schema for validating UUID format in route parameters.
 */
export const UuidParamSchema = z.object({
  id: z.string().uuid({ message: "Invalid UUID format for article ID" }),
});

/**
 * TypeScript type inferred from the validation schema.
 */
export type UuidParamValidated = z.infer<typeof UuidParamSchema>;
