# Authentication System Architecture Specification for PulseReader

## 1. Overview

This specification outlines the architecture for implementing user registration (US-002), login (US-003), logout (US-004), and password recovery functionality in PulseReader. It leverages Supabase Auth for secure authentication, integrated with Astro's server-side rendering (SSR) capabilities, React for interactive components, and ensures compatibility with existing guest and personalized feed behaviors. The design maintains the project's structure, using TypeScript for type safety, and adheres to the tech stack (Astro 5, React 19, Tailwind 4, Shadcn/ui, Supabase).

Key principles:

- Separation of concerns: Astro pages handle routing and SSR, React components manage interactive UI (e.g., forms), Supabase SDK manages auth state.
- Security: All auth operations use Supabase's built-in protections (e.g., email verification, password hashing).
- User Experience: Seamless transitions between auth/non-auth modes, with clear error messaging and validation.
- Compatibility: Guest users see unfiltered feeds; authenticated users access personalized views without breaking infinite scroll or article display.

Password recovery is included as an extension, using Supabase's reset password flow, though not explicitly in MVP user stories.

## 2. User Interface Architecture

### 2.1 Frontend Changes

The UI will introduce dedicated auth pages while extending existing layouts and components for auth-aware rendering. Non-auth mode (guest) remains unchanged for the main feed (/). Auth mode integrates session checks for personalized content.

- **New Pages (Astro-based, SSR-enabled)**:
  - `/pages/register.astro`: Registration form page. Renders a React form component for email/password input. On submit, calls Supabase registration API. Redirects to `/verify-email` post-registration.
  - `/pages/login.astro`: Login form page. Similar to register, renders React form. Handles login success by redirecting to `/` (personalized if verified).
  - `/pages/forgot-password.astro`: Password recovery page (extension beyond MVP). Renders React form for email input. Triggers Supabase reset email; shows success message "Jeśli konto z podanym adresem istnieje, link do resetowania hasła został wysłany na Twój e-mail.".
  - `/pages/verify-email.astro`: Informational page post-registration. Displays message "Sprawdź swoją skrzynkę e-mail w celu zweryfikowania adresu.", with link to resend verification if needed. Redirects to `/login` after verification (handled via Supabase listener).

- **Extended Existing Elements**:
  - `/pages/index.astro` (Main Feed): Wrap in auth-aware layout. For guests: Render unfiltered ArticleList component. For auth users: Apply filters from profile (mood, blocklist) via server-side query. Use infinite scroll preserved.
  - `/layouts/GlobalLayout.astro`: Add auth state props (e.g., `isAuthenticated`, `user`). Conditionally render:
    - Non-auth: Navigation with "Zaloguj / Zarejestruj" buttons linking to auth pages.
    - Auth: User avatar/dropdown with "Ustawienia" (for US-005/006) and "Wyloguj" button (US-004).
    - Protect routes: Redirect unauth users from personalized sections.
  - `/components/App.tsx` (React Root): Extend to listen for Supabase auth state changes (onAuthStateChange). Update global state (e.g., via Context) for user session, triggering re-renders of feed/components.

- **New Components (React-based, using Shadcn/ui)**:
  - `AuthForm.tsx`: Reusable form for register/login/forgot-password. Props: `mode` ("register"|"login"|"forgot"), `onSubmit` callback. Includes email/password inputs, submit button. Uses Tailwind for styling.
  - `LogoutButton.tsx`: Simple button component in nav dropdown. On click, calls Supabase signOut, redirects to `/`.
  - `AuthGuard.tsx`: HOC or wrapper for protected React components (e.g., settings). Checks session; redirects if unauth.
  - `VerificationMessage.tsx`: Static component for verify-email page, with resend button linking to Supabase resend API.

### 2.2 Separation of Responsibilities

- **Astro Pages**: Handle routing, SSR for initial auth checks (e.g., getServerSession from Supabase), and layout rendering. Integrate with middleware (`/src/middleware/index.ts`) for session validation on protected routes. Pages fetch user profile from Supabase on load for auth users.
- **React Components**: Manage client-side interactivity (form validation, submissions via Supabase client SDK). Use React hooks (e.g., useSupabaseClient) for auth calls. No direct SSR; hydrated on client for dynamic updates (e.g., real-time session changes).
- **Integration**:
  - Navigation: Astro links for page transitions; React Router not needed (Astro handles).
  - User Actions: Forms submit to Supabase via fetch or SDK; success/error callbacks update UI state and navigate (useEffect for redirects).
  - State Management: Supabase auth state synced via browser session; no additional store needed for MVP.

### 2.3 Validation Cases and Error Messages

- **Client-Side Validation (React Forms, using Zod or native)**:
  - Email: Required, valid format (regex). Error: "Proszę podać prawidłowy adres e-mail."
  - Password (register/login): Required, min 8 chars, includes uppercase/lowercase/number. Error: "Hasło musi mieć co najmniej 8 znaków, zawierać wielkie i małe litery oraz liczbę."
  - Real-time: Debounced input validation with visual feedback (e.g., green check/red icon via Shadcn).
- **Server-Side Validation (Supabase + API)**:
  - Duplicate email on register: Error: "Konto z tym adresem e-mail już istnieje."
  - Invalid credentials on login: Error: "Nieprawidłowy adres e-mail lub hasło."
  - Unverified email on login: Error: "Proszę zweryfikować swój adres e-mail przed zalogowaniem." Redirect to verify page.
- **General Errors**:
  - Network/API failure: "Coś poszło nie tak. Spróbuj ponownie." (Non-specific for security).
  - Rate limiting: "Zbyt wiele prób. Spróbuj ponownie później."
  - All errors displayed via toast notifications (Shadcn Toaster) or inline form messages.

### 2.4 Key Scenarios Handling

- **Guest to Auth Transition**: Login/register redirects to `/` with session; feed re-renders personalized. For registration, initial redirect is to `/verify-email` showing the confirmation message, then to `/` after verification.
- **Auth to Guest**: Logout clears session, redirects to `/` unfiltered.
- **Email Verification**: Post-register, user can't login until verified. Supabase email link auto-logs in on click.
- **Password Recovery**: User enters email on forgot page; Supabase sends reset link. On link click, redirect to reset form (new `/pages/reset-password.astro` if needed, beyond MVP).
- **Session Persistence**: Supabase JWT cookies maintained across visits; auto-login on page load if valid.
- **Edge Cases**: Offline mode shows cached feed; auth errors on slow networks retry with exponential backoff.

## 3. Backend Logic

### 3.1 API Endpoints and Data Models

- **Supabase Integration**: Primary backend via Supabase (no custom Node.js server). Use Supabase JS client for all ops.
- **Data Models (Extend `/src/types.ts`)**:
  - `User` (from Supabase Auth): id, email, confirmed_at (for verification).
  - `Profile` (Custom table): user_id (FK to User.id), mood (enum: 'positive'|'neutral'|'negative'), blocklist (array<string> for keywords/URLs). Add indices on user_id.
  - DTOs: `RegisterInput` {email: string, password: string}, `LoginInput` {email: string, password: string}, `RecoveryInput` {email: string}.
- **API Endpoints (Supabase Edge Functions or Astro API Routes in `/src/pages/api`)**:
  - `POST /api/auth/register`: Calls supabase.auth.signUp({email, password}). Returns {data: {user, session}, error}. On success, insert default Profile row via supabase.from('profiles').insert().
  - `POST /api/auth/login`: Calls supabase.auth.signInWithPassword({email, password}). Returns session or error. Post-login, fetch/update Profile.
  - `POST /api/auth/logout`: Calls supabase.auth.signOut(). Clears session.
  - `POST /api/auth/forgot-password`: Calls supabase.auth.resetPasswordForEmail(email, {redirectTo: `${origin}/reset-password`}).
  - `GET /api/auth/session`: Returns current session (for SSR checks).
  - All endpoints use CORS, rate limiting via Supabase policies. Auth required for profile ops (RLS enabled).

### 3.2 Input Data Validation

- **Supabase Built-in**: Handles email/password format, hashing (Argon2), uniqueness.
- **Custom (Astro API)**: Use Zod schemas for inputs (e.g., z.object({email: z.string().email()})). Validate before Supabase calls; return 400 on failure with {error: message}.
- **Profile Sync**: On register/login, upsert Profile if missing (e.g., default mood: 'neutral').

### 3.3 Exception Handling

- **Supabase Errors**: Catch AuthError; map to user-friendly messages (e.g., 'EmailNotConfirmedError' → verification prompt).
- **API Layer**: Try-catch wrappers; log errors to console/Supabase logs (no custom logging for MVP). Return HTTP 4xx/5xx with JSON {error: string}.
- **Graceful Degradation**: If Supabase down, fallback to guest mode; cache sessions locally.
- **Security**: Never expose internal errors; sanitize inputs to prevent injection.

### 3.4 SSR Updates

- **Astro Config (`astro.config.mjs`)**: Ensure SSR mode enabled (output: 'server'). Integrate Supabase server client in pages.
- **Page-Level SSR**: In auth pages, use `getServerSession` (Astro helper + Supabase) to pre-fetch session. For `/index.astro`, SSR fetch articles + apply filters if auth (query Supabase with RLS).
- **Middleware (`/src/middleware/index.ts`)**: Check session on all routes; redirect unauth from protected (e.g., /settings). Use cookies for session propagation.

## 4. Authentication System

### 4.1 Supabase Auth Integration with Astro

- **Setup (`/src/db/supabase.ts`)**: Create server/client instances. Server: Use service role key for admin ops. Client: Anon/public key for frontend.
- **Registration (US-002)**:
  - Client: `supabase.auth.signUp({email, password, options: {emailRedirectTo: `${origin}/verify-email`}})` → Sends verification email.
  - Server: Hook (Supabase trigger) or API to create Profile on user insert.
  - Contract: Returns User object + session (if auto-confirm enabled; else pending).
- **Login (US-003)**:
  - Client: `supabase.auth.signInWithPassword({email, password})` → Validates, returns session if confirmed.
  - If unconfirmed: Throw error, redirect to verify.
  - Session: Stored in cookies; persists via refresh tokens.
- **Logout (US-004)**:
  - Client: `supabase.auth.signOut()` → Clears local/session storage and cookies.
  - Redirect: To `/` via Astro navigation.
- **Password Recovery**:
  - Client: `supabase.auth.resetPasswordForEmail(email, {redirectTo: `${origin}/reset-password`})` → Sends email with magic link.
  - Reset Page: On link click, Supabase auto-handles; render form for new password via `updateUser({password})`.
- **State Management**: Use `onAuthStateChange` listener in App.tsx to sync UI (e.g., update nav, refetch feed).
- **Security Features**:
  - RLS on Profiles: Only owner can read/write.
  - Email Confirmation: Enforced via Supabase settings.
  - Rate Limits: Supabase defaults (e.g., 5 signups/hour per IP).
- **Contracts**:
  - Services: `AuthService` class with methods (register, login, etc.), wrapping Supabase calls.
  - Modules: `/src/lib/auth.ts` for helpers; `/src/db/profiles.ts` for profile ops.
  - Types: Extend Supabase generated types in `/src/types.ts` (e.g., Database['public']['Tables']['profiles']).

This architecture ensures secure, scalable auth without disrupting core feed functionality. Future extensions (e.g., OAuth) can build on Supabase helpers.
