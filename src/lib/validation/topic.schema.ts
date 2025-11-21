import { z } from "zod";

/**
 * Validation schema for GET /api/topics query parameters.
 */
export const GetTopicsQueryParamsSchema = z.object({
  limit: z
    .string()
    .optional()
    .default("100")
    .transform((val) => parseInt(val, 10))
    .pipe(
      z
        .number()
        .int({ message: "Limit must be an integer" })
        .min(1, { message: "Limit must be at least 1" })
        .max(500, { message: "Limit must not exceed 500" })
    ),

  offset: z
    .string()
    .optional()
    .default("0")
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int({ message: "Offset must be an integer" }).min(0, { message: "Offset must be non-negative" })),

  search: z
    .string()
    .optional()
    .transform((val) => (val === null || val === undefined || val.trim() === "" ? undefined : val.trim())),
});

/**
 * Validation schema for POST /api/topics request body.
 */
export const CreateTopicCommandSchema = z.object({
  name: z
    .string({ required_error: "Name is required" })
    .min(1, { message: "Name cannot be empty" })
    .max(500, { message: "Name must not exceed 500 characters" })
    .trim(),
});

/**
 * Validation schema for UUID path parameters (GET/DELETE /api/topics/:id).
 */
export const TopicIdParamSchema = z.string().uuid({ message: "Invalid UUID format" });

/**
 * TypeScript types inferred from validation schemas.
 */
export type GetTopicsQueryParamsValidated = z.infer<typeof GetTopicsQueryParamsSchema>;
export type CreateTopicCommandValidated = z.infer<typeof CreateTopicCommandSchema>;
export type TopicIdParamValidated = z.infer<typeof TopicIdParamSchema>;
