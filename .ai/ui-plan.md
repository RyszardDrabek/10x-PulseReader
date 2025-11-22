# UI Architecture for PulseReader

## 1. UI Structure Overview

The user interface for PulseReader is designed as a responsive web application leveraging Astro for static page rendering and SEO optimization, with React components (islands) for dynamic features like infinite scrolling, form interactions, and real-time updates. The structure supports seamless transitions between guest and authenticated states, prioritizing a clean, intuitive experience for news aggregation and personalization. Key principles include progressive enhancement for performance, accessibility through ARIA attributes and keyboard navigation, and security via client-side validation and secure token handling. The architecture aligns with the PRD's focus on infinite scroll feeds, mood-based filtering, blocklist management, and error recovery, while integrating with the REST API for data fetching and updates. Views are minimal to avoid complexity in the MVP, emphasizing the homepage as the central hub.

## 2. View List

### Homepage (/)

- **View Path**: `/`
- **Main Purpose**: To provide the primary content feed where users browse articles, either unfiltered for guests or personalized based on mood and blocklist for authenticated users, supporting infinite scrolling and article interaction.
- **Key Information to Display**: List of article cards including title, description, publication date, sentiment indicator, source name, and topics; active filter summary (e.g., mood status, block count); loading skeletons during fetches; no-results message if filters yield empty results.
- **Key View Components**: ArticleList (React component for infinite scroll and cards), FilterBanner (displays and toggles active filters), NoResultsPlaceholder (friendly message with adjustment suggestions).
- **UX, Accessibility, and Security Considerations**: Smooth infinite scroll with virtualized rendering for performance; ARIA live regions for dynamic content updates and screen reader announcements; keyboard navigation for article selection (Enter to open); client-side caching to reduce API calls; sanitize displayed content to prevent XSS.

### Register (/register)

- **View Path**: `/register`
- **Main Purpose**: To enable new users to create an account via email and password, initiating the email verification process.
- **Key Information to Display**: Signup form fields (email, password); real-time validation feedback (e.g., email format, password strength); success message post-submission directing to email check; link to login page.
- **Key View Components**: AuthForm (reusable form with inputs and validation), ValidationMessages (inline error/success indicators).
- **UX, Accessibility, and Security Considerations**: Progressive disclosure of errors during typing; loading state on submission; labeled form fields with ARIA-describedby for errors; client-side validation complemented by server-side; password masking with toggle option; redirect to homepage if already authenticated.

### Login (/login)

- **View Path**: `/login`
- **Main Purpose**: To authenticate existing users and redirect them to the personalized homepage.
- **Key Information to Display**: Login form fields (email, password); error messages for invalid credentials or unverified email; link to register page and forgot password (placeholder for future).
- **Key View Components**: AuthForm (as above), ErrorDisplay (toast or inline for auth failures).
- **UX, Accessibility, and Security Considerations**: Auto-focus on email field; session persistence post-login; ARIA alerts for errors; block unverified users with specific messaging; secure credential handling without local storage of passwords; redirect to homepage on success.

### Verify Email (/verify-email)

- **View Path**: `/verify-email`
- **Main Purpose**: To guide users through email confirmation after registration, providing resend options and status updates.
- **Key Information to Display**: Instructional message (e.g., "Check your inbox for verification link"); resend verification button; progress indicator or poll for confirmation; redirect prompt to login.
- **Key View Components**: VerificationMessage (static or dynamic content), ActionButton (for resend).
- **UX, Accessibility, and Security Considerations**: Clear, reassuring copy with email preview; accessible button labels; secure handling of verification tokens via Supabase; fallback to manual login redirect; ARIA live for status changes post-resend.

### Settings (/settings)

- **View Path**: `/settings`
- **Main Purpose**: To allow authenticated users to configure mood preferences and manage the blocklist, with immediate reflection in the article feed.
- **Key Information to Display**: Mood selection interface (e.g., clickable emoticon buttons for positive/neutral/negative); blocklist input field and editable list of items; current filter summary (e.g., "3 items blocked"); toggle for applying personalization; save confirmation.
- **Key View Components**: MoodSelector (interactive buttons), BlocklistManager (input, list, add/remove actions), FilterToggle (switch component).
- **UX, Accessibility, and Security Considerations**: Optimistic updates with rollback on failure; real-time preview of filter impact (e.g., "X articles affected"); high-contrast icons and ARIA labels for mood choices; keyboard-accessible list management (e.g., focusable delete buttons); input sanitization for blocklist to prevent injection; rate limiting on saves via debouncing.

### Not Found (404)

- **View Path**: `/*` (catch-all)
- **Main Purpose**: To handle invalid routes gracefully, guiding users back to valid content.
- **Key Information to Display**: Friendly error message (e.g., "Page not found"); suggestion to return home; search bar placeholder (future).
- **Key View Components**: ErrorPage (generic template), HomeLink (navigation button).
- **UX, Accessibility, and Security Considerations**: Non-alarming design with humor or reassurance; skip-to-content links; no sensitive data exposure.

## 3. User Journey Map

The user journeys are designed to be linear and intuitive, with authentication as a gateway to personalization while allowing guest access to core functionality.

- **Guest Browsing (US-001)**: User lands on Homepage → Views unfiltered article feed with infinite scroll → Interacts with cards (click to open external source) → Sees teaser prompts in nav for registration → Clicks "Register" to navigate to /register.
- **Registration and Onboarding (US-002, US-005)**: From Homepage or direct → Navigates to /register → Submits form → Redirects to /verify-email → User verifies email externally → Returns to /login → Logs in → Redirects to Homepage (now personalized with default/null mood) → Optional onboarding modal prompts to /settings for initial mood setup → Sets mood → Feed updates immediately.

- **Authenticated Browsing and Personalization (US-003, US-007, US-009)**: Login success → Homepage with applied filters (mood/blocklist) → Browses infinite feed, sees filter banner → Clicks article to open in new tab → Navigates to /settings via nav → Adjusts mood or blocklist → Saves (optimistic update) → Returns to Homepage for refetched personalized results → Toggles filters off for unfiltered view.

- **Blocklist Management (US-006)**: From Settings → Adds/removes items in BlocklistManager → Saves → Toast confirmation → Feed excludes matches (title/desc/URL) → No-results if overly strict (US-008).

- **Logout (US-004)**: From any authenticated view → Clicks logout in nav dropdown → Session ends → Redirects to Homepage as guest (unfiltered feed).

- **Error Recovery**: Network failure on Homepage → Shows offline indicator and cached stale data → Retry button refetches. Strict filters → No-results message with link to /settings. Session expiration (401) → Toast + redirect to /login with "Please log in again."

Journeys incorporate immediate feedback loops (e.g., refetch on settings change) and graceful degradation (e.g., cache for offline).

## 4. Layout and Navigation Structure

The layout follows a standard web app structure: a fixed top navigation bar, main content area, and optional footer. Navigation is state-aware, adapting to authentication status for simplicity and security.

- **Global Layout**:
  - **Header (Top Nav)**: Logo linking to /; conditional menu – Guest: "Login" and "Register" buttons (right-aligned); Authenticated: "Settings" link and user avatar dropdown (with "Logout" option). Responsive: Hamburger menu on mobile for collapse.
  - **Main Content**: View-specific, centered on mobile, full-width on desktop; responsive grid for article lists (1-col mobile, 2-col tablet+).
  - **Footer**: Static links (About, Privacy – placeholders); copyright.
  - **Global Overlays**: Toast notifications for actions/errors; modals for onboarding or confirmations (e.g., destructive blocklist deletes).

- **Navigation Flows**:
  - Direct links in nav for Home (/), Settings (/settings – protected, redirects unauth to /login).
  - Auth views (/register, /login) auto-redirect if already authenticated.
  - Back/forward browser navigation preserved with client-side routing where possible (Astro handles SSR).
  - Infinite scroll on Homepage eliminates pagination nav; manual "Load More" fallback on error.
  - Protected Routes: Astro middleware checks Supabase auth session; unauth users redirected to /login with return URL preserved.
  - Breadcrumbs: Minimal, only in Settings (e.g., "Home > Settings") for context.

This structure ensures low cognitive load, with 2-3 clicks max for common tasks, and touch/keyboard-friendly interactions.

## 5. Key Components

- **ArticleCard**: Reusable card for Homepage feed; displays title (clickable), description excerpt, metadata badges (sentiment color-coded, source/topics as chips); accessible with role="article" and ARIA-label for open action.
- **AuthForm**: Generic form for login/register; includes email/password inputs, validation hooks, submit handler integrating Supabase Auth; supports error display and loading states.

- **MoodSelector**: Interactive emoticon buttons (positive/neutral/negative) for Settings; selected state with visual feedback; ARIA-pressed for accessibility; triggers PATCH to /api/profile.

- **BlocklistManager**: Input field for adding items, virtualized list of blocked terms with delete icons; supports drag-reorder (future); debounced saves to /api/profile; input sanitization.

- **FilterBanner**: Persistent bar on Homepage/Settings; shows active mood icon, block count, toggle switch for personalization; updates via global state; ARIA-live for changes.

- **InfiniteScrollLoader**: React component using TanStack Query for paginated fetches (/api/articles with offset); skeleton placeholders; error retry button.

- **ToastNotification**: Global system for feedback (success on save, errors on API fail); positioned top-right, auto-dismiss; accessible with ARIA announcements.

- **NoResultsPlaceholder**: Centered message with icon; includes action link to Settings for filter adjustments; responsive sizing.

- **ErrorBoundary**: Wrapper for dynamic React islands; catches render errors, displays fallback UI with reload option; logs to console for dev.

These components promote reusability, with composition for views (e.g., Homepage = Layout + ArticleList + FilterBanner), ensuring consistency in styling (Tailwind/Shadcn/ui) and behavior (optimistic updates, accessibility).
