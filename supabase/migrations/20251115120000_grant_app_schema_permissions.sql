-- Grant permissions to service role and anon role for app schema
-- This allows the service role and anon users to access tables in the app schema via PostgREST

-- Grant usage on schema
GRANT USAGE ON SCHEMA app TO service_role;
GRANT USAGE ON SCHEMA app TO authenticator;
GRANT USAGE ON SCHEMA app TO anon;

-- Grant all privileges on all tables in app schema
GRANT ALL ON ALL TABLES IN SCHEMA app TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA app TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA app TO service_role;

-- Grant for authenticator role (needed for PostgREST)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA app TO authenticator;

-- Grant SELECT to anon role (for public read access to articles, sources, topics)
GRANT SELECT ON ALL TABLES IN SCHEMA app TO anon;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA app GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA app GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA app GRANT ALL ON FUNCTIONS TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA app GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticator;

