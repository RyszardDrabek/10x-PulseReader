# View Implementation Plan - Homepage

## 1. Overview

The Homepage view serves as the primary entry point for users to browse news articles in PulseReader. It displays a paginated, infinite-scrolling list of articles fetched from the API, supporting both guest (unfiltered) and authenticated (personalized based on mood and blocklist) modes. The view integrates dynamic React components for interactivity, handles loading states, empty results, and provides feedback on active filters. It ensures a responsive, accessible experience aligned with the PRD's focus on content discovery and personalization.

## 2. View Routing

The view should be accessible at the root path `/` as an Astro page. Use Astro's file-based routing by creating `src/pages/index.astro`. For authenticated routes, leverage Astro middleware to protect personalization features, redirecting unauthenticated users appropriately while allowing guest access.

## 3. Component Structure

- Homepage (Astro page: src/pages/index.astro)
  - GlobalLayout (Astro layout wrapping the page)
    - Header (Navigation: Logo, auth-dependent menu)
    - Main Content Area
      - FilterBanner (React component: Displays/toggles filters)
      - ArticleList (React component: Infinite scroll article feed with cards)
        - ArticleCard (React component: Individual article display)
        - LoadingSkeleton (React component: Placeholder during fetches)
      - NoResultsPlaceholder (React component: Empty state message)
    - Footer (Static: Links and copyright)
  - ToastNotification (Global overlay for feedback)

The hierarchy uses Astro for static rendering of the layout and React islands for dynamic parts like ArticleList and FilterBanner to optimize performance.

## 4. Component Details

### Homepage (Astro Page)

- Component description: The main entry point rendering the article feed. It initializes global state, handles authentication checks, and orchestrates data fetching via a custom hook. Consists of the global layout with conditional rendering of personalized elements.
- Main elements: `<main>` container with `<FilterBanner client:load />`, `<ArticleList client:load />` or `<NoResultsPlaceholder client:load />` based on data, integrated within GlobalLayout.
- Handled interactions: Route protection via middleware; initial API call on mount; re-fetch on filter toggle.
- Handled validation: Verify user authentication status from Supabase session; ensure API responses match expected types (e.g., ArticleListResponse).
- Types: ArticleListResponse (from types.ts), UserSession (Supabase auth type), PaginatedResponse<ArticleDto>.
- Props: None (top-level page).

### FilterBanner (React Component)

- Component description: A persistent banner showing active filters (mood, blocklist count) and a toggle to enable/disable personalization. For guests, it displays inactive elements with login prompts. Updates global state on toggle.
- Main elements: `<div class="banner">` with mood icon (if set), block count badge, toggle switch (Shadcn/ui Switch), and CTA buttons for guests (e.g., "Login to personalize").
- Handled interactions: Click on toggle to set applyPersonalization; hover tooltips for filter details; keyboard navigation for switch.
- Handled validation: Check if user is authenticated before enabling toggle; validate mood/blocklist from profile API if needed; ensure case-insensitive blocklist matching per PRD.
- Types: ArticleFiltersApplied (from types.ts), UserMood (enum), ProfileDto (for current preferences).
- Props: { isAuthenticated: boolean, currentFilters: ArticleFiltersApplied, onTogglePersonalization: (enabled: boolean) => void, profile: ProfileDto | null }.

### ArticleList (React Component)

- Component description: Manages infinite scrolling of article cards using TanStack Query for data fetching and virtualization for performance. Renders ArticleCard components and handles pagination.
- Main elements: `<div class="feed">` with IntersectionObserver for scroll detection; repeated `<ArticleCard />` for each item; `<LoadingSkeleton />` during fetches.
- Handled interactions: Scroll to load more (via useInfiniteQuery); click on article title to open link in new tab; keyboard Enter on card to open article.
- Handled validation: Ensure offset and limit params are integers (default limit=20, max=100); validate sentiment filter is one of 'positive', 'neutral', 'negative'; applyPersonalization only if authenticated.
- Types: ArticleDto[], PaginationMetadata, GetArticlesQueryParams (from types.ts).
- Props: { queryParams: GetArticlesQueryParams, initialData?: ArticleListResponse, isPersonalized: boolean }.

### ArticleCard (React Component)

- Component description: Displays a single article with title, excerpt, metadata (date, sentiment indicator, source, topics as chips). Sanitizes content to prevent XSS.
- Main elements: `<article role="article">` with `<h3>` (clickable title), `<p>` description, badges for sentiment (color-coded), source name, topic chips (Shadcn/ui Badge), and date (formatted).
- Handled interactions: Click title or card to open link (target="_blank"); focus for keyboard navigation (tabindex=0).
- Handled validation: Sanitize title/description with DOMPurify; ensure link is valid URL; truncate description to 200 chars if too long.
- Types: ArticleDto (full article data).
- Props: { article: ArticleDto, onArticleClick?: (id: string) => void }.

### NoResultsPlaceholder (React Component)

- Component description: Renders a friendly message when no articles match filters, with suggestions to adjust settings.
- Main elements: `<div class="empty-state">` with icon (e.g., search empty), heading ("No articles found"), message text, and link/button to settings ("Adjust filters").
- Handled interactions: Click link to navigate to /settings (if authenticated) or prompt login.
- Handled validation: Only show if data.length === 0 and filters are applied; differentiate between guest (show all articles prompt) and authenticated (filter adjustment).
- Types: ArticleFiltersApplied, UserSession.
- Props: { filters: ArticleFiltersApplied, isAuthenticated: boolean, onAdjustFilters: () => void }.

### LoadingSkeleton (React Component)

- Component description: Placeholder UI during API fetches to maintain smooth UX.
- Main elements: Multiple `<div class="skeleton">` mimicking ArticleCard structure (title bar, description lines, badges).
- Handled interactions: None (static during load).
- Handled validation: Render N skeletons based on page size (e.g., 5-10).
- Types: None specific.
- Props: { count: number }.

## 5. Types

All types leverage existing definitions from src/types.ts, including ArticleDto, ArticleListResponse, GetArticlesQueryParams, UserMood, ArticleSentiment, ProfileDto, PaginationMetadata, and ArticleFiltersApplied. No new database entities are needed.

New ViewModel types for the Homepage:

- **HomepageViewModel**: Aggregates state for the entire view.
  - articles: ArticleDto[] (current loaded articles)
  - pagination: PaginationMetadata (current page info)
  - filters: ArticleFiltersApplied (applied filters summary)
  - isLoading: boolean (fetching state)
  - isPersonalized: boolean (whether personalization is active)
  - hasMore: boolean (from pagination.hasMore)
  - error: string | null (API error message)
  - user: { id: string, profile: ProfileDto | null } | null (auth state)

- **FilterState**: For FilterBanner.
  - mood: UserMood | null
  - blocklist: string[] (length for count)
  - isEnabled: boolean (personalization toggle)

- **ArticleCardProps**: Extends ArticleDto with onClick handler.
  - article: ArticleDto
  - index: number (for key in list)
  - onOpen: (link: string) => void

These ViewModels ensure type-safe state management in React hooks and components, bridging API DTOs to UI-specific data.

## 6. State Management

State is managed using React's useState and useEffect for local component state, combined with TanStack Query (via @tanstack/react-query) for server-state management of articles (useInfiniteQuery for pagination). A custom hook, useArticles, will encapsulate API fetching, personalization logic, and caching. Global auth state is handled via Supabase Auth helpers (useSupabaseClient, useUser). No Redux/Zustand needed for MVP; query cache invalidates on filter changes. The Homepage page passes initial session to child components via context or props.

Custom Hook: useArticles(queryParams: GetArticlesQueryParams, userId?: string)
- Fetches via GET /api/articles with params.
- Handles infinite scroll with { getNextPageParam: (lastPage) => lastPage.pagination.hasMore ? lastPage.pagination.offset + lastPage.pagination.limit : undefined }
- Optimistic updates on filter toggle.
- Returns { data, isLoading, error, fetchNextPage, refetch }

## 7. API Integration

Integrate with GET /api/articles (from src/pages/api/articles/index.ts). Use fetch or Supabase client for requests, including Authorization header with Supabase JWT for authenticated users.

Request: Query params as GetArticlesQueryParams (e.g., ?limit=20&offset=0&applyPersonalization=true&sentiment=positive). For guests, omit applyPersonalization or set false.

Response: ArticleListResponse (PaginatedResponse<ArticleDto> with filtersApplied). Handle 200 OK by flattening data.pages into flat array for ArticleList. On 401, redirect to /login if personalization attempted. On 400, display validation errors in toast. Use TanStack Query for caching (staleTime: 5min) to reduce calls.

For profile-dependent filters, optionally fetch GET /api/profile on mount if authenticated, but prefer server-side application via applyPersonalization param.

## 8. User Interactions

- **Infinite Scroll**: User scrolls to bottom → useArticles hook calls fetchNextPage → Articles append to list, skeleton shows during load. Success: New cards render; Error: Retry button appears.
- **Filter Toggle (Authenticated)**: Click switch in FilterBanner → Set isPersonalized=true/false → Refetch articles with updated applyPersonalization param → Banner updates to show/hide filters; Feed refreshes.
- **Guest Personalization Tease**: Hover/click inactive toggle → Show tooltip/prompt: "Log in to personalize your feed" → Link to /login.
- **Article Click**: Click title/card → window.open(article.link, '_blank') → Track analytics if implemented; Keyboard: Enter on focused card.
- **No Results**: If data empty after fetch → Render NoResultsPlaceholder → Click "Adjust filters" → Navigate to /settings (auth) or /login (guest).
- **Loading**: Initial load or refetch → Show LoadingSkeleton in ArticleList position → Hide on data arrival.

All interactions use ARIA for announcements (e.g., aria-live="polite" on feed updates) and keyboard support (tabindex, onKeyDown).

## 9. Conditions and Validation

- **Authentication Check**: On mount, verify Supabase session. If applyPersonalization requested but !user, disable toggle and show login prompt (FilterBanner). Affects: Personalized fetch only for auth users.
- **Filter Application**: If isPersonalized, include applyPersonalization=true in query; Validate mood/blocklist from profile (server-handled). If filters yield empty, show NoResultsPlaceholder (ArticleList level).
- **Pagination Limits**: Enforce limit <=100 client-side; Offset must be multiple of limit. On hasMore=false, disable scroll loading.
- **Content Sanitization**: Before rendering title/description, use DOMPurify.sanitize() to prevent XSS (ArticleCard).
- **Responsive Conditions**: Use Tailwind breakpoints; On mobile, collapse FilterBanner to icon; Ensure infinite scroll works without momentum scrolling issues.
- **Empty State**: data.length === 0 && !isLoading → Render NoResults; For guests, always fetch unfiltered (applyPersonalization=false).

Validation failures (e.g., invalid sentiment) from API 400 → Set error state, show toast with details, refetch without invalid param.

## 10. Error Handling

- **API Errors**:
  - 400 (Validation): Display specific field errors in toast (e.g., "Invalid sentiment"), clear invalid params, refetch.
  - 401 (Auth): If during personalized fetch, set isPersonalized=false, show "Login required" banner, redirect to /login on toggle attempt.
  - 404/500 (Server): Show generic error toast "Failed to load articles", with retry button calling refetch. Log to console.
  - Network Error: Fallback to cached data (TanStack Query), show offline indicator in FilterBanner.

- **Edge Cases**:
  - Empty Initial Feed (No Articles): Render NoResults with "No articles available yet" for guests.
  - Overly Strict Filters (US-008): After refetch, if data empty, show placeholder with filter adjustment link.
  - Infinite Scroll Failure: On fetchNextPage error, append error card with "Load more failed" and retry button.
  - Session Expiration: Supabase onAuthStateChange listener → Refetch or redirect as needed.

Use Shadcn/ui Toast for non-blocking feedback; Ensure graceful degradation (e.g., static list if JS disabled via Astro).

## 11. Implementation Steps

1. Create src/pages/index.astro: Set up Astro page with GlobalLayout import, add React islands for FilterBanner and ArticleList via client:load directive. Include Supabase auth script and initial session prop.

2. Implement GlobalLayout (if not exists): In src/layouts/Layout.astro, add Header with auth-conditional nav (useSupabaseClient for session), Main, Footer. Use Tailwind for responsive design.

3. Create FilterBanner.tsx in src/components/: Use Shadcn/ui Switch and Badge. Integrate useUser hook for auth check. Handle toggle with onChange calling parent refetch.

4. Create useArticles custom hook in src/lib/hooks/: Use useInfiniteQuery from @tanstack/react-query. Build queryKey with params and userId. Fetch via fetch('/api/articles', { headers: auth ? { Authorization: `Bearer ${token}` } : {} }). Parse response as ArticleListResponse.

5. Create ArticleList.tsx: Use useArticles hook, render flat data with ArticleCard. Implement IntersectionObserver for load trigger. Add LoadingSkeleton during isFetchingNextPage.

6. Create ArticleCard.tsx: Map ArticleDto props, sanitize content, add onClick to open link. Use Shadcn/ui Badge for sentiment/topics (color: green/yellow/red for positive/neutral/negative).

7. Create NoResultsPlaceholder.tsx: Conditional render based on empty data and filters. Use Link from @astrojs/router for navigation.

8. Create LoadingSkeleton.tsx: Simple animated divs with Tailwind skeleton classes (bg-gray-200 animate-pulse).

9. Add State Management: Wrap app in QueryClientProvider in _app or layout. Use useEffect in Homepage for initial fetch.

10. Accessibility: Add ARIA roles (article, button), live regions for updates, keyboard handlers. Test with screen readers.

11. Styling: Apply Tailwind classes for responsive grid (grid-cols-1 md:grid-cols-2), infinite scroll container (max-h-screen overflow-y-auto).

12. Testing: Add unit tests for hooks (e.g., query params), integration tests for interactions (e.g., toggle refetch), e2e for scroll loading using Playwright.

13. Polish: Implement virtualization with react-window if >100 articles. Add optimistic UI for toggle (immediate refetch).
