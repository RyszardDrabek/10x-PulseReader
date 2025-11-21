import { z } from "zod";

/**
 * Validation schema for POST /api/rss-sources request body.
 */
export const CreateRssSourceCommandSchema = z.object({
  name: z
    .string({ required_error: "Name is required" })
    .min(1, { message: "Name cannot be empty" })
    .max(500, { message: "Name must not exceed 500 characters" }),

  url: z
    .string({ required_error: "URL is required" })
    .url({ message: "Invalid URL format" })
    .max(2000, { message: "URL must not exceed 2000 characters" }),
});

/**
 * Validation schema for PATCH /api/rss-sources/:id request body.
 * All fields are optional, but at least one must be provided.
 */
export const UpdateRssSourceCommandSchema = z
  .object({
    name: z
      .string()
      .min(1, { message: "Name cannot be empty" })
      .max(500, { message: "Name must not exceed 500 characters" })
      .optional(),

    url: z
      .string()
      .url({ message: "Invalid URL format" })
      .max(2000, { message: "URL must not exceed 2000 characters" })
      .optional(),
  })
  .refine((data) => data.name !== undefined || data.url !== undefined, {
    message: "At least one field (name or url) must be provided",
  });

/**
 * Validation schema for GET /api/rss-sources query parameters.
 */
export const GetRssSourcesQueryParamsSchema = z.object({
  limit: z
    .string()
    .optional()
    .default("50")
    .transform((val) => parseInt(val, 10))
    .pipe(
      z
        .number()
        .int({ message: "Limit must be an integer" })
        .min(1, { message: "Limit must be at least 1" })
        .max(100, { message: "Limit must not exceed 100" })
    ),

  offset: z
    .string()
    .optional()
    .default("0")
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int({ message: "Offset must be an integer" }).min(0, { message: "Offset must be non-negative" })),
});

/**
 * Validation schema for UUID path parameters.
 */
export const UuidParamSchema = z.string().uuid({ message: "Invalid UUID format" });

/**
 * TypeScript types inferred from validation schemas.
 */
export type CreateRssSourceCommandValidated = z.infer<typeof CreateRssSourceCommandSchema>;
export type UpdateRssSourceCommandValidated = z.infer<typeof UpdateRssSourceCommandSchema>;
export type GetRssSourcesQueryParamsValidated = z.infer<typeof GetRssSourcesQueryParamsSchema>;
