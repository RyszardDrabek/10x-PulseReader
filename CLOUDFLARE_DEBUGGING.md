# Cloudflare Deployment Debugging Guide

This guide helps you debug issues with your Astro + Cloudflare Pages deployment.

## Enhanced Logging Features

Your application now includes enhanced logging with:
- ✅ Structured JSON logs with Cloudflare request context
- ✅ Request-scoped loggers that include CF-RAY IDs
- ✅ Automatic inclusion of user agent, IP, and country information
- ✅ Debug logging for authentication flow
- ✅ Error logging with full stack traces

## How to View Logs

### Method 1: Functions Tab (Most Visible for Workers/Pages)

For Cloudflare Pages/Workers, the **Functions tab** is your best bet for real-time logs:

1. **Go to Cloudflare Dashboard**:
   - Visit [dash.cloudflare.com](https://dash.cloudflare.com)
   - Select your account and zone

2. **Access Functions Tab**:
   - Go to **Workers & Pages** → **10x-pulsereader**
   - Click on the **Functions** tab

3. **View Real-time Logs**:
   - Look for logs prefixed with `[CF-RAY-ID]` (e.g., `[abc123def456]`)
   - **TRACE logs** are most visible and show critical flow points:
     ```
     [abc123def456] TRACE: REQUEST_START | {"method":"GET","path":"/api/articles"}
     [abc123def456] TRACE: AUTH_USER_SUCCESS | {"userId":"user-123"}
     [abc123def456] TRACE: ROUTE_API | {"isAuthenticated":true}
     [abc123def456] TRACE: API_ARTICLES_GET_SUCCESS | {"resultCount":10}
     [abc123def456] TRACE: REQUEST_COMPLETE
     ```

4. **Filter and Search**:
   - Use the search box to filter by CF-RAY ID for specific requests
   - Look for `TRACE:` entries for high-level flow
   - Look for `ERROR:` entries for failures

### Method 2: Monitoring → Logs (Structured JSON)

1. **Go to Monitoring** → **Logs**
2. **View Structured Logs**:
   - Look for JSON-formatted log entries
   - Each log includes:
     ```json
     {
       "level": "info|error|warn|debug",
       "message": "Human readable message",
       "timestamp": "2024-01-01T12:00:00.000Z",
       "cfRay": "abc123def456",
       "cfConnectingIp": "1.2.3.4",
       "cfCountry": "US",
       "userAgent": "Mozilla/5.0...",
       "endpoint": "/api/articles"
     }
     ```

### Method 2: Wrangler CLI (Development)

For local development with `wrangler dev`:

```bash
# Run with local mode
npm run dev:cloudflare

# Or with remote mode (uses actual Cloudflare Workers)
npm run preview:cloudflare
```

Logs will appear in your terminal with the same structured format.

### Method 3: Production Logs via API

Use Cloudflare's Logs API to fetch logs programmatically:

```bash
# Get recent logs
curl -X GET "https://api.cloudflare.com/client/v4/zones/YOUR_ZONE_ID/logs/received" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json"
```

## Debugging Common Issues

### 1. Authentication Problems

**Symptoms**: Users can't log in, API returns 401/403

**Debug Steps**:
1. Check middleware logs for "User authenticated" vs "User not authenticated"
2. Look for Supabase initialization errors
3. Verify environment variables are set in Cloudflare

**Key Log Messages to Look For**:
```
"Starting normal authentication flow"
"User authenticated" or "User not authenticated"
"Service role authentication successful"
```

### 2. API Endpoint Failures

**Symptoms**: API calls return 500 errors

**Debug Steps**:
1. Find logs with matching `cfRay` ID
2. Check for "Supabase client not initialized" errors
3. Look for validation errors or service failures

**Key Log Messages**:
```
"Supabase client not initialized"
"Query parameter validation failed"
"Failed to fetch articles"
```

### 3. Database Connection Issues

**Symptoms**: Supabase-related errors

**Debug Steps**:
1. Check environment variables in Cloudflare Pages settings
2. Verify Supabase URL and keys are correct
3. Look for connection timeout errors

### 4. Static Asset Issues

**Symptoms**: CSS/JS not loading, broken UI

**Debug Steps**:
1. Check browser network tab for 404s
2. Verify build output in `dist/` directory
3. Check Cloudflare Pages deployment logs

## Environment Variables Checklist

Ensure these are set in Cloudflare Pages:

```
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Testing Your Deployment

Use the included test script:

```bash
# Set environment variables
export DEPLOYMENT_URL=https://your-app.pages.dev
export PUBLIC_SUPABASE_KEY=your_public_key

# Run tests
node scripts/test-deployment.cjs
```

This will:
- Test homepage access
- Test public API endpoints
- Test protected endpoints
- Generate log entries for debugging

## Log Levels & Visibility

### Functions Tab Visibility (Highest Priority)

The **Functions tab** shows logs in this priority order:

1. **TRACE logs** (most visible): Critical flow points with `[CF-RAY-ID]` prefix
2. **ERROR logs**: Failures and exceptions
3. **WARN logs**: Warnings and potential issues
4. **INFO logs**: Normal operations
5. **DEBUG logs**: Development-only detailed information

### Structured JSON Logs (Monitoring → Logs)

- **DEBUG**: Detailed flow information (only in development)
- **INFO**: Normal operations and success cases
- **WARN**: Potential issues or unexpected conditions
- **ERROR**: Failures and exceptions with stack traces

## Troubleshooting Tips

1. **No logs appearing?**
   - Ensure observability is enabled in `wrangler.json`
   - Check Cloudflare plan supports logging
   - Wait a few minutes for logs to propagate

2. **Logs are too verbose?**
   - Temporarily disable debug logging in production
   - Filter logs by level or message content

3. **Missing request context?**
   - Ensure you're using `createRequestLogger(request)` in API routes
   - Check that middleware is running for all requests

4. **Performance issues?**
   - JSON logging has minimal performance impact
   - Consider sampling for high-traffic applications

## Getting Help

If you're still having issues:

1. **Check Cloudflare Status**: https://www.cloudflare.com/status/
2. **Review Deployment Logs**: In Cloudflare Pages dashboard
3. **Test Locally**: Use `wrangler dev` to reproduce issues
4. **Compare Environments**: Test same requests locally vs production

## Recent Changes

- Enhanced middleware logging with request context
- Added Cloudflare-specific headers to all logs
- Created request-scoped loggers for better traceability
- Added structured error logging with stack traces
- Created deployment testing script
