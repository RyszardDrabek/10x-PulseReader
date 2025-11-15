-- =====================================================================================
-- migration: disable_rls_for_development
-- description: disables row level security on all app schema tables for development
-- author: development team
-- date: 2025-11-14
-- 
-- affected objects:
--   - tables: app.profiles, app.rss_sources, app.articles, app.topics, app.article_topics
--   - policies: all policies dropped from app schema tables
--
-- special considerations:
--   - this migration is for development only
--   - before production deployment, this migration should be rolled back
--   - alternatively, create a new migration to re-enable rls and policies
--
-- warning: disabling rls removes all access control at the database level
--          use only in development environments
-- =====================================================================================

-- =====================================================================================
-- section 1: drop all existing policies
-- =====================================================================================

-- -----------------------------------------------------------------------------
-- drop policies from app.profiles
-- -----------------------------------------------------------------------------
drop policy if exists "anon users cannot view profiles" on app.profiles;
drop policy if exists "authenticated users can view their own profile" on app.profiles;
drop policy if exists "anon users cannot insert profiles" on app.profiles;
drop policy if exists "authenticated users can insert their own profile" on app.profiles;
drop policy if exists "anon users cannot update profiles" on app.profiles;
drop policy if exists "authenticated users can update their own profile" on app.profiles;
drop policy if exists "anon users cannot delete profiles" on app.profiles;
drop policy if exists "authenticated users can delete their own profile" on app.profiles;

-- -----------------------------------------------------------------------------
-- drop policies from app.articles
-- -----------------------------------------------------------------------------
drop policy if exists "anon users can view articles" on app.articles;
drop policy if exists "authenticated users can view articles" on app.articles;
drop policy if exists "anon users cannot insert articles" on app.articles;
drop policy if exists "authenticated users cannot insert articles" on app.articles;
drop policy if exists "anon users cannot update articles" on app.articles;
drop policy if exists "authenticated users cannot update articles" on app.articles;
drop policy if exists "anon users cannot delete articles" on app.articles;
drop policy if exists "authenticated users cannot delete articles" on app.articles;

-- -----------------------------------------------------------------------------
-- drop policies from app.rss_sources
-- -----------------------------------------------------------------------------
drop policy if exists "anon users can view rss sources" on app.rss_sources;
drop policy if exists "authenticated users can view rss sources" on app.rss_sources;
drop policy if exists "anon users cannot insert rss sources" on app.rss_sources;
drop policy if exists "authenticated users cannot insert rss sources" on app.rss_sources;
drop policy if exists "anon users cannot update rss sources" on app.rss_sources;
drop policy if exists "authenticated users cannot update rss sources" on app.rss_sources;
drop policy if exists "anon users cannot delete rss sources" on app.rss_sources;
drop policy if exists "authenticated users cannot delete rss sources" on app.rss_sources;

-- -----------------------------------------------------------------------------
-- drop policies from app.topics
-- -----------------------------------------------------------------------------
drop policy if exists "anon users can view topics" on app.topics;
drop policy if exists "authenticated users can view topics" on app.topics;
drop policy if exists "anon users cannot insert topics" on app.topics;
drop policy if exists "authenticated users cannot insert topics" on app.topics;
drop policy if exists "anon users cannot update topics" on app.topics;
drop policy if exists "authenticated users cannot update topics" on app.topics;
drop policy if exists "anon users cannot delete topics" on app.topics;
drop policy if exists "authenticated users cannot delete topics" on app.topics;

-- -----------------------------------------------------------------------------
-- drop policies from app.article_topics
-- -----------------------------------------------------------------------------
drop policy if exists "anon users can view article topics" on app.article_topics;
drop policy if exists "authenticated users can view article topics" on app.article_topics;
drop policy if exists "anon users cannot insert article topics" on app.article_topics;
drop policy if exists "authenticated users cannot insert article topics" on app.article_topics;
drop policy if exists "anon users cannot update article topics" on app.article_topics;
drop policy if exists "authenticated users cannot update article topics" on app.article_topics;
drop policy if exists "anon users cannot delete article topics" on app.article_topics;
drop policy if exists "authenticated users cannot delete article topics" on app.article_topics;

-- =====================================================================================
-- section 2: disable row level security
-- =====================================================================================

-- disable rls on app.profiles
-- allows unrestricted access to user profiles during development
alter table app.profiles disable row level security;

-- disable rls on app.rss_sources
-- allows unrestricted management of rss sources during development
alter table app.rss_sources disable row level security;

-- disable rls on app.articles
-- allows unrestricted access to articles during development
alter table app.articles disable row level security;

-- disable rls on app.topics
-- allows unrestricted management of topics during development
alter table app.topics disable row level security;

-- disable rls on app.article_topics
-- allows unrestricted management of article-topic associations during development
alter table app.article_topics disable row level security;

-- =====================================================================================
-- end of migration
-- =====================================================================================

