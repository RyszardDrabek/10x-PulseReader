-- =====================================================================================
-- migration: initial_schema
-- description: creates the complete database schema for pulsereader application
-- author: db-plan.md
-- date: 2025-11-14
-- 
-- affected objects:
--   - schema: app
--   - enums: app.user_mood, app.article_sentiment
--   - tables: app.profiles, app.rss_sources, app.articles, app.topics, app.article_topics
--   - functions: app.update_updated_at_column()
--   - triggers: update_*_updated_at
--   - indexes: various performance indexes
--   - rls policies: granular policies for all tables
--   - extensions: pg_cron
--   - cron jobs: delete-old-articles
--
-- special considerations:
--   - all tables use uuid as primary keys
--   - rls is enabled on all tables
--   - automated cleanup of articles older than 30 days
--   - case-insensitive unique constraint on topic names
-- =====================================================================================

-- =====================================================================================
-- section 1: schema creation
-- =====================================================================================

-- create dedicated schema to separate application objects from supabase system objects
-- this improves security, maintainability, and permission management
create schema if not exists app;

-- =====================================================================================
-- section 2: enum types
-- =====================================================================================

-- enum for user mood preferences
-- used to filter articles based on sentiment matching user's preferred mood
create type app.user_mood as enum ('positive', 'neutral', 'negative');

-- enum for article sentiment
-- determined by ai analysis of article content
create type app.article_sentiment as enum ('positive', 'neutral', 'negative');

-- =====================================================================================
-- section 3: table definitions
-- =====================================================================================

-- -----------------------------------------------------------------------------
-- table: app.profiles
-- purpose: stores user preferences and settings
-- relationship: 1-to-1 with auth.users
-- -----------------------------------------------------------------------------
create table app.profiles (
    id uuid primary key default gen_random_uuid(),
    
    -- foreign key to supabase auth.users
    -- unique constraint enforces 1-to-1 relationship
    -- cascade delete ensures profile is removed when user account is deleted
    user_id uuid unique not null references auth.users(id) on delete cascade,
    
    -- user's preferred mood for content filtering
    -- null means no preference set (shows all sentiments)
    mood app.user_mood default null,
    
    -- array of blocked keywords and url fragments
    -- articles matching any item in this list will be filtered out
    blocklist text[] not null default '{}',
    
    -- audit timestamps
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- enable row level security
-- profiles contain user-specific data that must be isolated
alter table app.profiles enable row level security;

comment on table app.profiles is 'user preferences and settings with 1-to-1 relationship to auth.users';
comment on column app.profiles.mood is 'preferred mood for filtering articles (null = no preference)';
comment on column app.profiles.blocklist is 'array of keywords and url fragments to block';

-- -----------------------------------------------------------------------------
-- table: app.rss_sources
-- purpose: predefined list of rss feeds to fetch articles from
-- -----------------------------------------------------------------------------
create table app.rss_sources (
    id uuid primary key default gen_random_uuid(),
    
    -- human-readable name of the source (e.g., "bbc news", "wyborcza")
    name text not null,
    
    -- rss feed url - must be unique to prevent duplicate sources
    url text unique not null,
    
    -- audit timestamps
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- enable row level security
-- sources are managed by service role but viewable by everyone
alter table app.rss_sources enable row level security;

comment on table app.rss_sources is 'predefined rss feed sources for article fetching';
comment on column app.rss_sources.url is 'unique rss feed url';

-- -----------------------------------------------------------------------------
-- table: app.articles
-- purpose: stores articles fetched from rss sources with ai analysis results
-- -----------------------------------------------------------------------------
create table app.articles (
    id uuid primary key default gen_random_uuid(),
    
    -- reference to rss source
    -- cascade delete removes articles when source is deleted
    source_id uuid not null references app.rss_sources(id) on delete cascade,
    
    -- article metadata from rss feed
    title text not null,
    
    -- description may be null as not all rss feeds provide it
    description text,
    
    -- unique constraint prevents duplicate articles
    link text unique not null,
    
    -- original publication date from rss feed
    publication_date timestamptz not null,
    
    -- ai-generated sentiment analysis
    -- null is allowed - articles can be stored even if ai analysis fails
    sentiment app.article_sentiment default null,
    
    -- audit timestamps
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- enable row level security
-- articles are viewable by everyone but managed by service role
alter table app.articles enable row level security;

comment on table app.articles is 'articles fetched from rss sources with ai sentiment analysis';
comment on column app.articles.sentiment is 'ai-analyzed sentiment (null if analysis failed)';
comment on column app.articles.link is 'unique article url prevents duplicates';

-- -----------------------------------------------------------------------------
-- table: app.topics
-- purpose: dictionary of ai-generated topics for categorizing articles
-- -----------------------------------------------------------------------------
create table app.topics (
    id uuid primary key default gen_random_uuid(),
    
    -- topic name (e.g., "politics", "technology")
    -- uniqueness enforced by case-insensitive index
    name text not null,
    
    -- audit timestamps
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- enable row level security
-- topics are viewable by everyone but managed by service role
alter table app.topics enable row level security;

comment on table app.topics is 'ai-generated topics for article categorization';
comment on column app.topics.name is 'topic name with case-insensitive uniqueness';

-- -----------------------------------------------------------------------------
-- table: app.article_topics
-- purpose: junction table for many-to-many relationship between articles and topics
-- -----------------------------------------------------------------------------
create table app.article_topics (
    -- composite primary key prevents duplicate topic assignments
    article_id uuid not null references app.articles(id) on delete cascade,
    topic_id uuid not null references app.topics(id) on delete cascade,
    
    -- timestamp when topic was assigned to article
    created_at timestamptz not null default now(),
    
    primary key (article_id, topic_id)
);

-- enable row level security
-- topic assignments are viewable by everyone but managed by service role
alter table app.article_topics enable row level security;

comment on table app.article_topics is 'many-to-many relationship between articles and topics';

-- =====================================================================================
-- section 4: indexes
-- =====================================================================================

-- index for chronological sorting and filtering of articles
-- desc order supports "newest first" queries efficiently
create index idx_articles_publication_date on app.articles(publication_date desc);

-- partial index for sentiment filtering
-- only indexes non-null sentiments to save space
-- supports queries filtering by user mood preferences
create index idx_articles_sentiment on app.articles(sentiment) where sentiment is not null;

-- index for finding articles from specific source
-- supports joins and filtering by rss source
create index idx_articles_source_id on app.articles(source_id);

-- case-insensitive unique index on topic names
-- prevents duplicate topics with different casing (e.g., "Politics" vs "politics")
create unique index idx_topics_name_lower on app.topics(lower(name));

-- index for finding topics of a specific article
-- optimizes queries like "get all topics for article x"
create index idx_article_topics_article_id on app.article_topics(article_id);

-- index for finding articles with a specific topic
-- optimizes queries like "get all articles tagged with topic y"
create index idx_article_topics_topic_id on app.article_topics(topic_id);

-- index for finding user profile by user_id
-- optimizes profile lookups during authentication
create index idx_profiles_user_id on app.profiles(user_id);

-- =====================================================================================
-- section 5: functions and triggers
-- =====================================================================================

-- function to automatically update the updated_at column
-- used by triggers on all tables to track last modification time
create or replace function app.update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

comment on function app.update_updated_at_column() is 'automatically updates updated_at timestamp on row modifications';

-- trigger for app.profiles
-- updates updated_at before any update operation
create trigger update_profiles_updated_at
    before update on app.profiles
    for each row
    execute function app.update_updated_at_column();

-- trigger for app.rss_sources
create trigger update_rss_sources_updated_at
    before update on app.rss_sources
    for each row
    execute function app.update_updated_at_column();

-- trigger for app.articles
create trigger update_articles_updated_at
    before update on app.articles
    for each row
    execute function app.update_updated_at_column();

-- trigger for app.topics
create trigger update_topics_updated_at
    before update on app.topics
    for each row
    execute function app.update_updated_at_column();

-- =====================================================================================
-- section 6: row level security policies
-- =====================================================================================

-- -----------------------------------------------------------------------------
-- rls policies: app.profiles
-- rationale: users must only access their own profile data for privacy
-- -----------------------------------------------------------------------------

-- anonymous users cannot view any profiles
create policy "anon users cannot view profiles"
    on app.profiles for select
    to anon
    using (false);

-- authenticated users can view only their own profile
-- auth.uid() returns the authenticated user's id
create policy "authenticated users can view their own profile"
    on app.profiles for select
    to authenticated
    using (auth.uid() = user_id);

-- anonymous users cannot insert profiles
create policy "anon users cannot insert profiles"
    on app.profiles for insert
    to anon
    with check (false);

-- authenticated users can insert only their own profile
-- this allows profile creation after user registration
create policy "authenticated users can insert their own profile"
    on app.profiles for insert
    to authenticated
    with check (auth.uid() = user_id);

-- anonymous users cannot update profiles
create policy "anon users cannot update profiles"
    on app.profiles for update
    to anon
    using (false);

-- authenticated users can update only their own profile
-- using clause checks ownership, with check ensures they don't change user_id
create policy "authenticated users can update their own profile"
    on app.profiles for update
    to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- anonymous users cannot delete profiles
create policy "anon users cannot delete profiles"
    on app.profiles for delete
    to anon
    using (false);

-- authenticated users can delete only their own profile
create policy "authenticated users can delete their own profile"
    on app.profiles for delete
    to authenticated
    using (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- rls policies: app.articles
-- rationale: articles are public content (everyone can read)
--            only service role can manage articles (inserted by cron jobs)
-- -----------------------------------------------------------------------------

-- anonymous users can view all articles
-- articles are public content available without authentication
create policy "anon users can view articles"
    on app.articles for select
    to anon
    using (true);

-- authenticated users can view all articles
create policy "authenticated users can view articles"
    on app.articles for select
    to authenticated
    using (true);

-- anonymous users cannot insert articles
create policy "anon users cannot insert articles"
    on app.articles for insert
    to anon
    with check (false);

-- authenticated users cannot insert articles
-- only backend processes (service_role) can insert articles
create policy "authenticated users cannot insert articles"
    on app.articles for insert
    to authenticated
    with check (false);

-- anonymous users cannot update articles
create policy "anon users cannot update articles"
    on app.articles for update
    to anon
    using (false);

-- authenticated users cannot update articles
-- only backend processes (service_role) can update articles
create policy "authenticated users cannot update articles"
    on app.articles for update
    to authenticated
    using (false);

-- anonymous users cannot delete articles
create policy "anon users cannot delete articles"
    on app.articles for delete
    to anon
    using (false);

-- authenticated users cannot delete articles
-- only backend processes (service_role) can delete articles
create policy "authenticated users cannot delete articles"
    on app.articles for delete
    to authenticated
    using (false);

-- -----------------------------------------------------------------------------
-- rls policies: app.rss_sources
-- rationale: sources are public information (everyone can read)
--            only service role can manage sources
-- -----------------------------------------------------------------------------

-- anonymous users can view all rss sources
create policy "anon users can view rss sources"
    on app.rss_sources for select
    to anon
    using (true);

-- authenticated users can view all rss sources
create policy "authenticated users can view rss sources"
    on app.rss_sources for select
    to authenticated
    using (true);

-- anonymous users cannot insert rss sources
create policy "anon users cannot insert rss sources"
    on app.rss_sources for insert
    to anon
    with check (false);

-- authenticated users cannot insert rss sources
create policy "authenticated users cannot insert rss sources"
    on app.rss_sources for insert
    to authenticated
    with check (false);

-- anonymous users cannot update rss sources
create policy "anon users cannot update rss sources"
    on app.rss_sources for update
    to anon
    using (false);

-- authenticated users cannot update rss sources
create policy "authenticated users cannot update rss sources"
    on app.rss_sources for update
    to authenticated
    using (false);

-- anonymous users cannot delete rss sources
create policy "anon users cannot delete rss sources"
    on app.rss_sources for delete
    to anon
    using (false);

-- authenticated users cannot delete rss sources
create policy "authenticated users cannot delete rss sources"
    on app.rss_sources for delete
    to authenticated
    using (false);

-- -----------------------------------------------------------------------------
-- rls policies: app.topics
-- rationale: topics are public metadata (everyone can read)
--            only service role can manage topics (created by ai analysis)
-- -----------------------------------------------------------------------------

-- anonymous users can view all topics
create policy "anon users can view topics"
    on app.topics for select
    to anon
    using (true);

-- authenticated users can view all topics
create policy "authenticated users can view topics"
    on app.topics for select
    to authenticated
    using (true);

-- anonymous users cannot insert topics
create policy "anon users cannot insert topics"
    on app.topics for insert
    to anon
    with check (false);

-- authenticated users cannot insert topics
create policy "authenticated users cannot insert topics"
    on app.topics for insert
    to authenticated
    with check (false);

-- anonymous users cannot update topics
create policy "anon users cannot update topics"
    on app.topics for update
    to anon
    using (false);

-- authenticated users cannot update topics
create policy "authenticated users cannot update topics"
    on app.topics for update
    to authenticated
    using (false);

-- anonymous users cannot delete topics
create policy "anon users cannot delete topics"
    on app.topics for delete
    to anon
    using (false);

-- authenticated users cannot delete topics
create policy "authenticated users cannot delete topics"
    on app.topics for delete
    to authenticated
    using (false);

-- -----------------------------------------------------------------------------
-- rls policies: app.article_topics
-- rationale: article-topic associations are public (everyone can read)
--            only service role can manage associations
-- -----------------------------------------------------------------------------

-- anonymous users can view all article-topic associations
create policy "anon users can view article topics"
    on app.article_topics for select
    to anon
    using (true);

-- authenticated users can view all article-topic associations
create policy "authenticated users can view article topics"
    on app.article_topics for select
    to authenticated
    using (true);

-- anonymous users cannot insert article-topic associations
create policy "anon users cannot insert article topics"
    on app.article_topics for insert
    to anon
    with check (false);

-- authenticated users cannot insert article-topic associations
create policy "authenticated users cannot insert article topics"
    on app.article_topics for insert
    to authenticated
    with check (false);

-- anonymous users cannot update article-topic associations
create policy "anon users cannot update article topics"
    on app.article_topics for update
    to anon
    using (false);

-- authenticated users cannot update article-topic associations
create policy "authenticated users cannot update article topics"
    on app.article_topics for update
    to authenticated
    using (false);

-- anonymous users cannot delete article-topic associations
create policy "anon users cannot delete article topics"
    on app.article_topics for delete
    to anon
    using (false);

-- authenticated users cannot delete article-topic associations
create policy "authenticated users cannot delete article topics"
    on app.article_topics for delete
    to authenticated
    using (false);

-- =====================================================================================
-- section 7: extensions and automation
-- =====================================================================================

-- enable pg_cron extension for scheduled tasks
-- note: this extension must be enabled by database administrator
-- in supabase, it may need to be enabled via dashboard
create extension if not exists pg_cron;

-- schedule daily cleanup of articles older than 30 days
-- runs at 2:00 am utc to minimize impact on application performance
-- cascade delete automatically removes related records from app.article_topics
select cron.schedule(
    'delete-old-articles',           -- job name
    '0 2 * * *',                     -- cron expression: daily at 2:00 am
    $$delete from app.articles where publication_date < now() - interval '30 days'$$
);

comment on extension pg_cron is 'scheduled tasks for database maintenance';

-- =====================================================================================
-- section 8: seed data
-- =====================================================================================

-- insert predefined rss sources
-- these are the initial feeds that the application will monitor
insert into app.rss_sources (name, url) values
    ('Wyborcza - Najważniejsze', 'https://rss.gazeta.pl/pub/rss/najnowsze_wyborcza.xml'),
    ('Rzeczpospolita - Główne', 'https://www.rp.pl/rss_main'),
    ('BBC News - World', 'http://feeds.bbci.co.uk/news/world/rss.xml'),
    ('Reuters - World News', 'https://rss.app/feeds/SdI37Q5uDrVQuAOr.xml');

-- =====================================================================================
-- end of migration
-- =====================================================================================

