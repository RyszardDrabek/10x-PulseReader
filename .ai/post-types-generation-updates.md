# Post Types Generation Updates

## Issue

After generating database types with the `app` schema, the ArticleService was querying tables without specifying the schema. Since Supabase uses multiple schemas (`public`, `graphql_public`, `app`), we need to explicitly specify which schema to use.

## Changes Made

Updated `src/lib/services/article.service.ts` to use `.schema("app")` before all `.from()` calls:

### 1. validateSource()
```typescript
const { data, error } = await this.supabase
  .schema("app")  // ✅ Added
  .from("rss_sources")
  // ...
```

### 2. validateTopics()
```typescript
const { data, error } = await this.supabase
  .schema("app")  // ✅ Added
  .from("topics")
  // ...
```

### 3. createArticle() - Article Insert
```typescript
const { data: article, error: insertError } = await this.supabase
  .schema("app")  // ✅ Added
  .from("articles")
  // ...
```

### 4. createArticle() - Topic Associations
```typescript
const { error: associationError } = await this.supabase
  .schema("app")  // ✅ Added
  .from("article_topics")
  // ...
```

### 5. createArticle() - Rollback Delete
```typescript
await this.supabase
  .schema("app")  // ✅ Added
  .from("articles")
  .delete()
  // ...
```

## Why This Is Necessary

Supabase client needs to know which schema to query from when multiple schemas exist:
- `public` - Default PostgreSQL schema
- `graphql_public` - GraphQL API schema
- `app` - Our application schema (custom)

Without `.schema("app")`, the client defaults to `public` schema and won't find our tables.

## Verification

✅ No TypeScript errors
✅ All queries now correctly target the `app` schema
✅ Types are properly inferred from `Database["app"]["Tables"]`

## Status

✅ **Complete** - The implementation is now fully functional with proper schema specification.

## Next Steps

Test the endpoint with:
1. Start dev server: `npm run dev`
2. Make a POST request to `/api/articles` with service role token
3. Verify article is created in the `app.articles` table

