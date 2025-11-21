// =====================================================================================
// DTO and Command Model Type Definitions for PulseReader
// =====================================================================================
// This file contains all Data Transfer Objects (DTOs) and Command Models used by the
// REST API. These types are derived from the database schema (app schema) and represent
// the data structures exchanged between client and server.
// =====================================================================================

import type { Database } from "./db/database.types";

// =====================================================================================
// Database Entity Types (Foundation)
// =====================================================================================
// These types are directly derived from the Supabase-generated database types
// to ensure type safety and consistency with the database schema.

/**
 * User mood preference for article filtering.
 * Corresponds to app.user_mood enum in database.
 */
export type UserMood = Database["app"]["Enums"]["user_mood"];

/**
 * Article sentiment determined by AI analysis.
 * Corresponds to app.article_sentiment enum in database.
 */
export type ArticleSentiment = Database["app"]["Enums"]["article_sentiment"];

/**
 * Profile entity - User preferences and settings.
 * Derived from app.profiles table Row type with camelCase field names.
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
 * Derived from app.rss_sources table Row type with camelCase field names.
 */
export interface RssSourceEntity {
  id: string;
  name: string;
  url: string;
  isActive: boolean;
  lastFetchedAt: string | null;
  lastFetchError: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Article entity - News articles with AI analysis.
 * Derived from app.articles table Row type with camelCase field names.
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
 * Derived from app.topics table Row type with camelCase field names.
 */
export interface TopicEntity {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Article-Topic junction entity.
 * Derived from app.article_topics table Row type with camelCase field names.
 */
export interface ArticleTopicEntity {
  articleId: string;
  topicId: string;
  createdAt: string;
}

// =====================================================================================
// Database Insert Types
// =====================================================================================
// These types represent the data structures required to insert records into database tables.
// They are derived from Supabase Insert types for type-safe database operations.

/**
 * Insert type for creating a new article in the database.
 * Maps to app.articles Insert type.
 */
export interface ArticleInsert {
  id?: string;
  sourceId: string;
  title: string;
  description?: string | null;
  link: string;
  publicationDate: string;
  sentiment?: ArticleSentiment | null;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Insert type for creating a new profile in the database.
 * Maps to app.profiles Insert type.
 */
export interface ProfileInsert {
  id?: string;
  userId: string;
  mood?: UserMood | null;
  blocklist?: string[];
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Insert type for creating a new RSS source in the database.
 * Maps to app.rss_sources Insert type.
 */
export interface RssSourceInsert {
  id?: string;
  name: string;
  url: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Insert type for creating a new topic in the database.
 * Maps to app.topics Insert type.
 */
export interface TopicInsert {
  id?: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Insert type for creating article-topic associations.
 * Maps to app.article_topics Insert type.
 */
export interface ArticleTopicInsert {
  articleId: string;
  topicId: string;
  createdAt?: string;
}

// =====================================================================================
// Database Update Types
// =====================================================================================
// These types represent the data structures for updating database records.

/**
 * Update type for modifying an article in the database.
 * Maps to app.articles Update type.
 */
export interface ArticleUpdate {
  sourceId?: string;
  title?: string;
  description?: string | null;
  link?: string;
  publicationDate?: string;
  sentiment?: ArticleSentiment | null;
  updatedAt?: string;
}

/**
 * Update type for modifying a profile in the database.
 * Maps to app.profiles Update type.
 */
export interface ProfileUpdate {
  mood?: UserMood | null;
  blocklist?: string[];
  updatedAt?: string;
}

/**
 * Update type for modifying an RSS source in the database.
 * Maps to app.rss_sources Update type.
 */
export interface RssSourceUpdate {
  name?: string;
  url?: string;
  isActive?: boolean;
  lastFetchedAt?: string | null;
  lastFetchError?: string | null;
  updatedAt?: string;
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
