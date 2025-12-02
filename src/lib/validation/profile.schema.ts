import { z } from "zod";

/**
 * Validation schema for creating a new profile via POST /api/profile.
 * User ID is derived from authentication context, not from request body.
 */
export const CreateProfileCommandSchema = z.object({
  mood: z
    .enum(["positive", "neutral", "negative"], {
      errorMap: () => ({
        message: "Invalid mood value. Must be one of: positive, neutral, negative, or null",
      }),
    })
    .nullable()
    .optional(),
  blocklist: z
    .array(
      z
        .string()
        .min(1, { message: "Blocklist items cannot be empty" })
        .max(200, { message: "Blocklist items must not exceed 200 characters" })
        .trim()
    )
    .max(100, { message: "Maximum 100 items allowed in blocklist" })
    .optional()
    .default([]),
  personalizationEnabled: z
    .boolean({ required_error: "Personalization preference is required" })
    .optional()
    .default(true),
});

/**
 * TypeScript type inferred from the validation schema.
 */
export type CreateProfileCommandValidated = z.infer<typeof CreateProfileCommandSchema>;

/**
 * Validation schema for updating a profile via PATCH /api/profile.
 * All fields are optional for partial updates.
 */
export const UpdateProfileCommandSchema = z.object({
  mood: z
    .enum(["positive", "neutral", "negative"], {
      errorMap: () => ({
        message: "Invalid mood value. Must be one of: positive, neutral, negative, or null",
      }),
    })
    .nullable()
    .optional(),
  blocklist: z
    .array(
      z
        .string()
        .min(1, { message: "Blocklist items cannot be empty" })
        .max(200, { message: "Blocklist items must not exceed 200 characters" })
        .trim()
    )
    .max(100, { message: "Maximum 100 items allowed in blocklist" })
    .optional(),
  personalizationEnabled: z.boolean().optional(),
});

/**
 * TypeScript type inferred from the validation schema.
 */
export type UpdateProfileCommandValidated = z.infer<typeof UpdateProfileCommandSchema>;
