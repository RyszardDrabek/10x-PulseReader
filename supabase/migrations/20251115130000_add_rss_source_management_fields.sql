-- Add management fields to rss_sources table
-- These fields enable tracking of RSS feed fetching status and errors

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

