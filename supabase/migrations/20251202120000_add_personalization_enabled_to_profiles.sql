-- Add personalization_enabled column to profiles table
ALTER TABLE app.profiles
ADD COLUMN personalization_enabled BOOLEAN DEFAULT TRUE;

-- Add comment for documentation
COMMENT ON COLUMN app.profiles.personalization_enabled IS 'Whether the user has personalization enabled for article filtering';

-- Remove foreign key constraint for development/testing
ALTER TABLE app.profiles
DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;
