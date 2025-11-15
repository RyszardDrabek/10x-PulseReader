// =====================================================================================
// DTO and Command Model Type Definitions for PulseReader
// =====================================================================================
// This file contains all Data Transfer Objects (DTOs) and Command Models used by the
// REST API. These types are derived from the database schema (app schema) and represent
// the data structures exchanged between client and server.
// =====================================================================================

// =====================================================================================
// Database Entity Types (Foundation)
// =====================================================================================

/**
 * User mood preference for article filtering.
 * Corresponds to app.user_mood enum in database.
 */
export type UserMood = "positive" | "neutral" | "negative";

/**
 * Article sentiment determined by AI analysis.
 * Corresponds to app.article_sentiment enum in database.
 */
export type ArticleSentiment = "positive" | "neutral" | "negative";

/**
 * Profile entity - User preferences and settings.
 * Corresponds to app.profiles table.
 */
export interface ProfileEntity {
  id: string;
  userId: string;
  mood: UserMood | null;
  blocklist: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * RSS Source entity - Predefined RSS feed sources.
 * Corresponds to app.rss_sources table.
 */
export interface RssSourceEntity {
  id: string;
  name: string;
  url: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Article entity - News articles with AI analysis.
 * Corresponds to app.articles table.
 */
export interface ArticleEntity {
  id: string;
  sourceId: string;
  title: string;
  description: string | null;
  link: string;
  publicationDate: string;
  sentiment: ArticleSentiment | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Topic entity - AI-generated topics for categorization.
 * Corresponds to app.topics table.
 */
export interface TopicEntity {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

// =====================================================================================
// Common API Response Types
// =====================================================================================

/**
 * Pagination metadata for list responses.
 */
export interface PaginationMetadata {
  limit: number;
  offset: number;
  total: number;
  hasMore: boolean;
}

/**
 * Generic paginated response wrapper.
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMetadata;
}

/**
 * Standard error response format.
 */
export interface ErrorResponse {
  error: string;
  code?: string;
  details?: Record<string, unknown>;
  timestamp?: string;
}

// =====================================================================================
// Article DTOs
// =====================================================================================

/**
 * Nested RSS Source object in Article responses.
 * Contains only essential source information.
 */
export interface ArticleSourceDto {
  id: string;
  name: string;
  url: string;
}

/**
 * Nested Topic object in Article responses.
 * Contains only essential topic information.
 */
export interface ArticleTopicDto {
  id: string;
  name: string;
}

/**
 * Article response DTO for GET /api/articles and GET /api/articles/:id.
 * Includes nested source and topics for complete article representation.
 */
export interface ArticleDto {
  id: string;
  title: string;
  description: string | null;
  link: string;
  publicationDate: string;
  sentiment: ArticleSentiment | null;
  source: ArticleSourceDto;
  topics: ArticleTopicDto[];
  createdAt: string;
  updatedAt?: string;
}

/**
 * Filters applied metadata for article list responses.
 */
export interface ArticleFiltersApplied {
  sentiment?: ArticleSentiment;
  personalization?: boolean;
  blockedItemsCount?: number;
}

/**
 * Complete article list response with pagination and filter metadata.
 */
export interface ArticleListResponse extends PaginatedResponse<ArticleDto> {
  filtersApplied?: ArticleFiltersApplied;
}

/**
 * Command model for creating a new article (POST /api/articles).
 * Used by service role (RSS fetching cron job).
 */
export interface CreateArticleCommand {
  sourceId: string;
  title: string;
  description?: string | null;
  link: string;
  publicationDate: string;
  sentiment?: ArticleSentiment | null;
  topicIds?: string[];
}

/**
 * Command model for updating an article (PATCH /api/articles/:id).
 * Used by service role (AI analysis job).
 */
export interface UpdateArticleCommand {
  sentiment?: ArticleSentiment | null;
  topicIds?: string[];
}

// =====================================================================================
// Profile DTOs
// =====================================================================================

/**
 * Profile response DTO for GET /api/profile.
 * Direct mapping to ProfileEntity.
 */
export type ProfileDto = ProfileEntity;

/**
 * Command model for creating a new profile (POST /api/profile).
 * User ID is derived from authentication context, not from request body.
 */
export interface CreateProfileCommand {
  mood?: UserMood | null;
  blocklist?: string[];
}

/**
 * Command model for updating profile (PATCH /api/profile).
 * All fields are optional for partial updates.
 */
export interface UpdateProfileCommand {
  mood?: UserMood | null;
  blocklist?: string[];
}

// =====================================================================================
// RSS Source DTOs
// =====================================================================================

/**
 * RSS Source response DTO for GET /api/rss-sources and GET /api/rss-sources/:id.
 * Direct mapping to RssSourceEntity.
 */
export type RssSourceDto = RssSourceEntity;

/**
 * RSS Source list response with pagination.
 */
export type RssSourceListResponse = PaginatedResponse<RssSourceDto>;

/**
 * Command model for creating a new RSS source (POST /api/rss-sources).
 * Used by service role.
 */
export interface CreateRssSourceCommand {
  name: string;
  url: string;
}

/**
 * Command model for updating an RSS source (PATCH /api/rss-sources/:id).
 * Used by service role. All fields are optional for partial updates.
 */
export interface UpdateRssSourceCommand {
  name?: string;
  url?: string;
}

// =====================================================================================
// Topic DTOs
// =====================================================================================

/**
 * Topic response DTO for GET /api/topics and GET /api/topics/:id.
 * Direct mapping to TopicEntity.
 */
export type TopicDto = TopicEntity;

/**
 * Topic list response with pagination.
 */
export type TopicListResponse = PaginatedResponse<TopicDto>;

/**
 * Command model for creating a new topic (POST /api/topics).
 * Used by service role (AI analysis job).
 * Note: Implementation should handle case-insensitive upsert.
 */
export interface CreateTopicCommand {
  name: string;
}

// =====================================================================================
// Query Parameter Types
// =====================================================================================

/**
 * Query parameters for GET /api/articles.
 */
export interface GetArticlesQueryParams {
  limit?: number;
  offset?: number;
  sentiment?: ArticleSentiment;
  topicId?: string;
  sourceId?: string;
  applyPersonalization?: boolean;
  sortBy?: "publication_date" | "created_at";
  sortOrder?: "asc" | "desc";
}

/**
 * Query parameters for GET /api/rss-sources.
 */
export interface GetRssSourcesQueryParams {
  limit?: number;
  offset?: number;
}

/**
 * Query parameters for GET /api/topics.
 */
export interface GetTopicsQueryParams {
  limit?: number;
  offset?: number;
  search?: string;
}

// =====================================================================================
// Validation Types
// =====================================================================================

/**
 * Validation error details for 400 Bad Request responses.
 */
export interface ValidationErrorDetails {
  field?: string;
  message: string;
}

/**
 * Validation error response with detailed error messages.
 * Extends ErrorResponse but overrides details to be an array of validation errors.
 */
export interface ValidationErrorResponse extends Omit<ErrorResponse, "details"> {
  details: ValidationErrorDetails[];
}

// =====================================================================================
// Type Guards
// =====================================================================================

/**
 * Type guard to check if a value is a valid UserMood.
 */
export function isUserMood(value: unknown): value is UserMood {
  return value === "positive" || value === "neutral" || value === "negative";
}

/**
 * Type guard to check if a value is a valid ArticleSentiment.
 */
export function isArticleSentiment(value: unknown): value is ArticleSentiment {
  return value === "positive" || value === "neutral" || value === "negative";
}

/**
 * Type guard to check if a value is a valid sort order.
 */
export function isSortOrder(value: unknown): value is "asc" | "desc" {
  return value === "asc" || value === "desc";
}

// =====================================================================================
// Utility Types for API Implementation
// =====================================================================================

/**
 * Internal database row type for articles with joined source and topics.
 * Used in API implementation to represent article with its relationships.
 */
export interface ArticleWithRelations extends ArticleEntity {
  source: RssSourceEntity;
  topics: TopicEntity[];
}

/**
 * Mapper type to convert database entities to DTOs.
 * Ensures type-safe conversions in API route handlers.
 */
export type EntityToDto<TEntity, TDto> = (entity: TEntity) => TDto;

/**
 * Helper type to ensure all required fields are present for entity creation.
 */
export type CreateEntityData<T> = Omit<T, "id" | "createdAt" | "updatedAt">;

/**
 * Helper type for partial entity updates.
 */
export type UpdateEntityData<T> = Partial<Omit<T, "id" | "createdAt" | "updatedAt">>;
