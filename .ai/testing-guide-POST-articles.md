# Quick Testing Guide for POST /api/articles

## ✅ Already Tested

- Service role authentication ✅
- Article creation with minimal fields ✅
- Source validation ✅
- Response format (camelCase) ✅

## 🧪 Test Cases to Try

### 1. Test with Description

```bash
curl -X POST http://localhost:3000/api/articles \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU" \
  -H "Content-Type: application/json" \
  -d '{"sourceId":"YOUR_SOURCE_ID","title":"Article with Description","description":"This is a test article description","link":"https://example.com/test-with-desc","publicationDate":"2025-11-15T10:00:00Z"}'
```

**Expected:** 201 Created with description field populated

### 2. Test with Sentiment

```bash
curl -X POST http://localhost:3000/api/articles \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU" \
  -H "Content-Type: application/json" \
  -d '{"sourceId":"YOUR_SOURCE_ID","title":"Positive Article","link":"https://example.com/test-positive","publicationDate":"2025-11-15T10:00:00Z","sentiment":"positive"}'
```

**Expected:** 201 Created with sentiment="positive"

Try all three: "positive", "neutral", "negative"

### 3. Test Duplicate Detection

```bash
# First, create an article with a specific link
curl -X POST http://localhost:3000/api/articles \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU" \
  -H "Content-Type: application/json" \
  -d '{"sourceId":"YOUR_SOURCE_ID","title":"Original Article","link":"https://example.com/duplicate-test","publicationDate":"2025-11-15T10:00:00Z"}'

# Then try to create the same link again
curl -X POST http://localhost:3000/api/articles \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU" \
  -H "Content-Type: application/json" \
  -d '{"sourceId":"YOUR_SOURCE_ID","title":"Duplicate Article","link":"https://example.com/duplicate-test","publicationDate":"2025-11-15T10:00:00Z"}'
```

**Expected:** 409 Conflict with error message "Article with this link already exists"

### 4. Test with Topics

First, create some topics in Supabase Studio:

1. Go to http://localhost:54323
2. Navigate to Table Editor → app schema → topics
3. Insert a few topics (e.g., "Technology", "Politics", "Science")
4. Copy their IDs

```bash
curl -X POST http://localhost:3000/api/articles \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU" \
  -H "Content-Type: application/json" \
  -d '{"sourceId":"YOUR_SOURCE_ID","title":"Article with Topics","link":"https://example.com/test-topics","publicationDate":"2025-11-15T10:00:00Z","topicIds":["TOPIC_ID_1","TOPIC_ID_2"]}'
```

**Expected:**

- 201 Created
- Article appears in articles table
- Entries appear in article_topics junction table

### 5. Test Error Cases

**Invalid Source ID:**

```bash
curl -X POST http://localhost:3000/api/articles \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU" \
  -H "Content-Type: application/json" \
  -d '{"sourceId":"00000000-0000-0000-0000-000000000000","title":"Test","link":"https://example.com/test","publicationDate":"2025-11-15T10:00:00Z"}'
```

**Expected:** 400 Bad Request - "RSS source not found"

**Invalid Topic IDs:**

```bash
curl -X POST http://localhost:3000/api/articles \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU" \
  -H "Content-Type: application/json" \
  -d '{"sourceId":"YOUR_SOURCE_ID","title":"Test","link":"https://example.com/test2","publicationDate":"2025-11-15T10:00:00Z","topicIds":["00000000-0000-0000-0000-000000000000"]}'
```

**Expected:** 400 Bad Request - "One or more topics not found"

**Missing Required Field:**

```bash
curl -X POST http://localhost:3000/api/articles \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU" \
  -H "Content-Type: application/json" \
  -d '{"sourceId":"YOUR_SOURCE_ID","link":"https://example.com/test3","publicationDate":"2025-11-15T10:00:00Z"}'
```

**Expected:** 400 Bad Request - Validation error with "Title is required"

**No Authentication:**

```bash
curl -X POST http://localhost:3000/api/articles \
  -H "Content-Type: application/json" \
  -d '{"sourceId":"YOUR_SOURCE_ID","title":"Test","link":"https://example.com/test4","publicationDate":"2025-11-15T10:00:00Z"}'
```

**Expected:** 401 Unauthorized - "Authentication required"

## Verification Checklist

After each test:

- [ ] Check HTTP status code is correct
- [ ] Verify response JSON structure
- [ ] Check Supabase Studio to see the article in the database
- [ ] For topic associations, verify entries in article_topics table
- [ ] Check server logs for any errors

## Get RSS Source IDs

Open Supabase Studio (http://localhost:54323):

1. Go to Table Editor
2. Select "app" schema from dropdown
3. Click "rss_sources" table
4. Copy any ID from the list

Current seeded sources:

- Wyborcza - Najważniejsze
- Rzeczpospolita - Główne
- BBC News - World
- Reuters - World News

---

**Happy Testing! 🧪**
