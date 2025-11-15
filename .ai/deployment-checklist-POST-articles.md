# Deployment Checklist: POST /api/articles

Use this checklist before deploying the POST /api/articles endpoint to production.

## Pre-Deployment

### Environment Setup
- [ ] `SUPABASE_URL` environment variable configured
- [ ] `SUPABASE_KEY` (anon key) environment variable configured  
- [ ] `SUPABASE_SERVICE_ROLE_KEY` environment variable configured (keep secret!)
- [ ] Environment variables verified in deployment platform

### Database Setup
- [ ] Database migration applied to create `app` schema
- [ ] Table `app.rss_sources` exists with proper structure
- [ ] Table `app.articles` exists with UNIQUE constraint on `link` field
- [ ] Table `app.topics` exists with proper structure
- [ ] Table `app.article_topics` (junction table) exists
- [ ] Foreign key constraints configured:
  - [ ] `articles.source_id` → `rss_sources.id`
  - [ ] `article_topics.article_id` → `articles.id`
  - [ ] `article_topics.topic_id` → `topics.id`
- [ ] Database indexes created:
  - [ ] Index on `articles.link` (for duplicate detection)
  - [ ] Index on `articles.source_id`
  - [ ] Indexes on `article_topics` foreign keys
- [ ] Trigger `update_updated_at_column` exists on `articles` table
- [ ] Row Level Security (RLS) policies configured (service role bypasses)

### Database Types
- [ ] Regenerate TypeScript types from Supabase:
  ```bash
  npx supabase gen types typescript --linked > src/db/database.types.ts
  ```
- [ ] Verify `database.types.ts` includes `app` schema tables
- [ ] No TypeScript errors in codebase after regeneration

### Test Data
- [ ] At least one RSS source seeded in `app.rss_sources` table
- [ ] At least 3 test topics seeded in `app.topics` table
- [ ] Test data UUIDs documented for testing

### Dependencies
- [ ] All npm packages installed: `npm install`
- [ ] `zod` package available (should be in dependencies)
- [ ] `@supabase/supabase-js` package available
- [ ] Build succeeds: `npm run build`
- [ ] No linter errors: `npm run lint`

## Testing

### Manual Testing
- [ ] Test without authentication → expect 401
- [ ] Test with regular user token → expect 401
- [ ] Test with service role token + missing required fields → expect 400
- [ ] Test with invalid UUID formats → expect 400
- [ ] Test with non-existent sourceId → expect 400
- [ ] Test with non-existent topicIds → expect 400
- [ ] Test with valid data → expect 201 and article created
- [ ] Test with duplicate link → expect 409
- [ ] Test with topics → verify associations in database
- [ ] Test response format (camelCase properties)

### Integration Tests
- [ ] Testing framework installed (Vitest recommended)
- [ ] Test configuration created
- [ ] Implement at least critical test cases:
  - [ ] Authentication tests
  - [ ] Validation tests
  - [ ] Success case tests
  - [ ] Duplicate detection test
- [ ] All tests passing
- [ ] Test coverage > 80%

### Load Testing (Optional for MVP)
- [ ] Test with 100 concurrent requests
- [ ] Verify p95 latency < 200ms
- [ ] Verify no database connection pool exhaustion
- [ ] Verify proper handling of concurrent duplicates

## Security Review

### Authentication
- [ ] Service role key stored securely (not in code)
- [ ] Service role key not exposed in client-side code
- [ ] JWT token validation working correctly
- [ ] Regular users cannot access endpoint

### Input Validation
- [ ] All inputs validated by Zod schema
- [ ] SQL injection protection verified (Supabase SDK handles)
- [ ] URL validation prevents javascript: and data: protocols
- [ ] String length limits enforced
- [ ] Array size limits enforced

### Error Handling
- [ ] No sensitive data in error responses
- [ ] No stack traces exposed to client
- [ ] Database errors handled gracefully
- [ ] All error responses follow standard format

## Monitoring Setup

### Logging
- [ ] Structured logging working (JSON format)
- [ ] Success logging includes article metadata
- [ ] Error logging includes stack traces
- [ ] Duplicate detection logged as info (not error)
- [ ] Logs accessible for debugging

### Alerts (Optional for MVP)
- [ ] Error rate monitoring (alert if > 5%)
- [ ] Latency monitoring (alert if p95 > 500ms)
- [ ] 500 error alerts (should be zero)
- [ ] Unauthorized access attempt monitoring

### Metrics to Track
- [ ] Article creation success rate
- [ ] 409 conflict rate (duplicate detection)
- [ ] Response time (p50, p95, p99)
- [ ] Database connection pool usage
- [ ] Errors by type (validation, source not found, etc.)

## Documentation

- [ ] API documentation reviewed: `docs/api/POST-articles.md`
- [ ] Implementation summary reviewed: `.ai/implementation-summary-POST-articles.md`
- [ ] Team informed about new endpoint
- [ ] Cron job developer provided with:
  - [ ] API endpoint URL
  - [ ] Service role token (securely)
  - [ ] Example code
  - [ ] Error handling guide

## Cron Job Integration

### Preparation
- [ ] Service role JWT token generated
- [ ] Token stored securely in cron job environment
- [ ] Cron job code updated to use new endpoint
- [ ] Error handling implemented (409 = skip, 400 = log, 500 = retry)
- [ ] Retry logic with exponential backoff

### Testing
- [ ] Test cron job in development environment
- [ ] Verify articles are created correctly
- [ ] Verify duplicate detection works (409 responses)
- [ ] Verify error handling works
- [ ] Test with real RSS feed data

### Deployment
- [ ] Cron job deployed to production
- [ ] Cron schedule configured (e.g., every 15 minutes)
- [ ] Initial run monitored
- [ ] Verify articles appearing in database

## Post-Deployment

### Verification
- [ ] Endpoint accessible at production URL
- [ ] Service role authentication working
- [ ] Articles being created successfully
- [ ] No unexpected errors in logs
- [ ] Database growing as expected

### Monitoring (First 24 Hours)
- [ ] Check error logs every 2 hours
- [ ] Verify success rate > 95%
- [ ] Verify p95 latency < 200ms
- [ ] Verify no 500 errors
- [ ] Check for unusual 401 attempts

### Performance Baseline
- [ ] Record baseline metrics:
  - [ ] Average response time: _____ms
  - [ ] p95 response time: _____ms
  - [ ] Success rate: _____%
  - [ ] 409 conflict rate: _____%
  - [ ] Articles per hour: _____

## Rollback Plan

### If Critical Issues Found
- [ ] Stop cron job immediately
- [ ] Investigate error logs
- [ ] Fix issue or rollback code
- [ ] Verify fix in staging
- [ ] Resume cron job

### Rollback Steps
1. Stop cron job
2. Revert endpoint code to previous version
3. Redeploy application
4. Verify old endpoint works (if applicable)
5. Investigate and fix issue
6. Follow deployment checklist again

## Sign-Off

- [ ] **Backend Developer:** Code reviewed and tested
- [ ] **DevOps:** Environment configured and deployed
- [ ] **QA:** Manual testing completed
- [ ] **Tech Lead:** Architecture approved
- [ ] **Product:** Acceptance criteria met

---

**Deployment Date:** _______________  
**Deployed By:** _______________  
**Verified By:** _______________  
**Production URL:** _______________  

## Notes

_Add any deployment-specific notes here:_

---

**Status:** ⚠️ Ready for deployment after database setup  
**Blocker:** Database schema must be created first  
**Next Steps:** Apply database migration, then follow this checklist

