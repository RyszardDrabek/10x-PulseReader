# RSS Fetching Implementation Plan - FR-001

## Overview

This plan implements automatic RSS feed fetching every 15 minutes, parsing articles, and saving them to the database. The implementation follows the existing codebase patterns and integrates with the existing `POST /api/articles` endpoint.

## Architecture Decision

**Selected Approach: External Cron Service → Astro API Endpoint**

- **Simplest Solution**: GitHub Actions scheduled workflow calls Astro API endpoint
- **Alternative** (if pg_cron preferred): pg_cron → PostgreSQL function → pg_net.http_get() → Astro API endpoint
- **Rationale**: RSS parsing requires HTTP calls and XML parsing, which is complex in pure PostgreSQL. Using an HTTP endpoint allows proper error handling, logging, and testing.

## Implementation Steps

### Step 1: Database Schema Migration

**File**: `supabase/migrations/YYYYMMDDHHMMSS_add_rss_source_management_fields.sql`

Add fields to `app.rss_sources` table:
- `is_active` (boolean, default `true`) - Enable/disable RSS source
- `last_fetched_at` (timestamptz, nullable) - Track last successful fetch
- `last_fetch_error` (text, nullable) - Store error message on failure

**Migration SQL**:
```sql
-- Add management fields to rss_sources table
ALTER TABLE app.rss_sources
ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS last_fetched_at timestamptz,
ADD COLUMN IF NOT EXISTS last_fetch_error text;

-- Add index for filtering active sources
CREATE INDEX IF NOT EXISTS idx_rss_sources_is_active 
ON app.rss_sources(is_active) 
WHERE is_active = true;

-- Add comments
COMMENT ON COLUMN app.rss_sources.is_active IS 'Whether this RSS source should be fetched';
COMMENT ON COLUMN app.rss_sources.last_fetched_at IS 'Timestamp of last successful fetch';
COMMENT ON COLUMN app.rss_sources.last_fetch_error IS 'Error message from last failed fetch attempt';
```

### Step 2: Install RSS Parser Dependency

**File**: `package.json`

Add dependency:
```json
{
  "dependencies": {
    "rss-parser": "^3.13.0"
  },
  "devDependencies": {
    "@types/rss-parser": "^3.13.0"
  }
}
```

### Step 3: Create RSS Fetching Service

**File**: `src/lib/services/rss-fetch.service.ts`

Service responsibilities:
- Fetch RSS feeds from URLs
- Parse RSS XML using `rss-parser`
- Extract article data (title, description, link, publicationDate)
- Handle errors gracefully
- Return structured data

**Key Features**:
- Timeout handling (30 seconds per feed)
- Error logging
- RSS feed validation
- Date parsing and normalization

### Step 4: Create RSS Source Service

**File**: `src/lib/services/rss-source.service.ts`

Service responsibilities:
- Fetch active RSS sources from database
- Update `last_fetched_at` on success
- Update `last_fetch_error` on failure
- Validate RSS source URLs

### Step 5: Create Cron API Endpoint

**File**: `src/pages/api/cron/fetch-rss.ts`

Endpoint responsibilities:
- Authenticate using service role (via Authorization header)
- Fetch all active RSS sources from database
- Process each source sequentially:
  - Fetch RSS feed
  - Parse articles
  - Create articles via `POST /api/articles` (internal call)
  - Update source status (success/error)
- Skip problematic feeds and continue with others
- Return summary of processing results

**Authentication**:
- Requires `Authorization: Bearer <SERVICE_ROLE_KEY>` header
- Validates service role in middleware

**Response Format**:
```json
{
  "success": true,
  "processed": 4,
  "succeeded": 3,
  "failed": 1,
  "articlesCreated": 45,
  "errors": [
    {
      "sourceId": "uuid",
      "sourceName": "BBC News",
      "error": "Timeout after 30 seconds"
    }
  ]
}
```

### Step 6: Update RSS Source Validation

**File**: `src/lib/validation/rss-source.schema.ts`

Add URL validation:
- Validate RSS URL format
- Optionally: Test URL accessibility (can be async check)

### Step 7: Create GitHub Actions Cron Workflow

**File**: `.github/workflows/rss-fetch.yml`

Workflow responsibilities:
- Run every 15 minutes (`*/15 * * * *`)
- Call `/api/cron/fetch-rss` endpoint
- Use service role key from secrets
- Handle failures gracefully

**Configuration**:
```yaml
name: RSS Feed Fetcher
on:
  schedule:
    - cron: '*/15 * * * *'  # Every 15 minutes UTC
  workflow_dispatch:  # Allow manual trigger

jobs:
  fetch-rss:
    runs-on: ubuntu-latest
    steps:
      - name: Fetch RSS Feeds
        run: |
          curl -X POST "${{ secrets.APP_URL }}/api/cron/fetch-rss" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            -H "Content-Type: application/json"
```

### Step 8: Update Middleware (if needed)

**File**: `src/middleware/index.ts`

Ensure `/api/cron/*` endpoints are accessible with service role authentication.

### Step 9: Add Logging

**File**: `src/lib/services/rss-fetch.service.ts`

Log:
- RSS fetch start/end
- Number of articles found per feed
- Errors (with feed URL and error message)
- Success metrics

### Step 10: Update Database Types

**File**: `src/db/database.types.ts`

Regenerate types after migration:
```bash
npx supabase gen types typescript --linked > src/db/database.types.ts
```

## File Structure

```
src/
├── lib/
│   ├── services/
│   │   ├── rss-fetch.service.ts      # RSS fetching and parsing
│   │   └── rss-source.service.ts     # RSS source management
│   └── validation/
│       └── rss-source.schema.ts       # URL validation schemas
├── pages/
│   └── api/
│       └── cron/
│           └── fetch-rss.ts           # Cron endpoint
supabase/
└── migrations/
    └── YYYYMMDDHHMMSS_add_rss_source_management_fields.sql
.github/
└── workflows/
    └── rss-fetch.yml                  # Scheduled workflow
```

## Error Handling Strategy

1. **RSS Feed Unavailable**:
   - Log error to `last_fetch_error`
   - Continue with next feed
   - Don't throw exception

2. **Invalid RSS XML**:
   - Log parsing error
   - Skip feed, continue with others

3. **Network Timeout**:
   - 30-second timeout per feed
   - Log timeout error
   - Continue processing

4. **Duplicate Articles**:
   - `POST /api/articles` returns 409 Conflict
   - Treat as success (article already exists)
   - Continue processing

5. **API Errors**:
   - Log error with context
   - Update `last_fetch_error`
   - Continue with next feed

## Testing Strategy

### Unit Tests

**File**: `src/lib/services/rss-fetch.service.test.ts`
- Test RSS parsing with sample feeds
- Test error handling (timeout, invalid XML, network errors)
- Test date parsing edge cases

**File**: `src/lib/services/rss-source.service.test.ts`
- Test fetching active sources
- Test updating fetch status

### Integration Tests

**File**: `src/pages/api/cron/fetch-rss.test.ts`
- Test endpoint authentication
- Test processing multiple feeds
- Test error handling and skipping
- Mock RSS fetching to avoid external calls

### E2E Tests (Optional)

**File**: `e2e/rss-fetching.spec.ts`
- Test actual RSS fetching with real feeds (limited)
- Verify articles appear in database
- Test error scenarios

## Environment Variables

**Required**:
- `SUPABASE_URL` - Already configured
- `SUPABASE_SERVICE_ROLE_KEY` - Already configured
- `APP_URL` - Application URL for cron endpoint (new, for GitHub Actions)

**GitHub Secrets**:
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for authentication
- `APP_URL` - Production application URL (e.g., `https://your-app.pages.dev`)

## Deployment Checklist

- [ ] Run database migration
- [ ] Install `rss-parser` dependency
- [ ] Regenerate database types
- [ ] Configure `APP_URL` in GitHub Secrets
- [ ] Test cron endpoint manually
- [ ] Verify GitHub Actions workflow runs
- [ ] Monitor first few cron executions
- [ ] Verify articles appearing in database
- [ ] Check error logs for any issues

## Monitoring

- Check GitHub Actions workflow runs (every 15 minutes)
- Monitor `last_fetch_error` in database for failed feeds
- Review application logs for RSS fetching errors
- Verify `last_fetched_at` updates correctly

## Future Enhancements (Out of Scope)

- Parallel feed processing
- Retry logic with exponential backoff
- Feed health monitoring dashboard
- Automatic feed deactivation after repeated failures
- RSS feed discovery/validation UI

## Alternative: pg_cron Implementation

If pg_cron is preferred over GitHub Actions:

1. Enable `pg_net` extension in Supabase
2. Create PostgreSQL function that calls Astro endpoint:
```sql
CREATE OR REPLACE FUNCTION app.fetch_rss_feeds()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  response jsonb;
BEGIN
  SELECT content INTO response
  FROM http((
    'POST',
    'https://your-app.pages.dev/api/cron/fetch-rss',
    ARRAY[
      http_header('Authorization', 'Bearer ' || current_setting('app.service_role_key')),
      http_header('Content-Type', 'application/json')
    ],
    'application/json',
    '{}'
  )::http_request);
END;
$$;
```

3. Schedule pg_cron job:
```sql
SELECT cron.schedule(
  'fetch-rss-feeds',
  '*/15 * * * *',
  $$SELECT app.fetch_rss_feeds()$$
);
```

**Note**: Requires `pg_net` extension and service role key stored in PostgreSQL settings.

