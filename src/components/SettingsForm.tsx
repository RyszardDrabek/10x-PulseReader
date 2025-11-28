import { useState, useEffect, useCallback } from "react";
import { useSupabase } from "./SupabaseProvider";
import { logger } from "../lib/utils/logger";
import { toast } from "sonner";
import MoodSelector from "./MoodSelector";
import BlocklistManager from "./BlocklistManager";
import { Button } from "./ui/button";
import { Loader2 } from "lucide-react";
import type { ProfileDto, UserMood } from "../types";

export default function SettingsForm() {
  const { user } = useSupabase();
  const [profile, setProfile] = useState<ProfileDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Local state for optimistic updates
  const [localMood, setLocalMood] = useState<UserMood | null>(null);
  const [localBlocklist, setLocalBlocklist] = useState<string[]>([]);

  // Track if there are unsaved changes
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Fetch profile on mount
  useEffect(() => {
    if (user?.id) {
      fetchProfile();
    }
  }, [user?.id]);

  // Update local state when profile changes
  useEffect(() => {
    if (profile) {
      setLocalMood(profile.mood);
      setLocalBlocklist([...profile.blocklist]);
    }
  }, [profile]);

  // Check for unsaved changes
  useEffect(() => {
    if (profile) {
      const moodChanged = localMood !== profile.mood;
      const blocklistChanged = JSON.stringify(localBlocklist.sort()) !== JSON.stringify(profile.blocklist.sort());
      setHasUnsavedChanges(moodChanged || blocklistChanged);
    }
  }, [localMood, localBlocklist, profile]);

  const fetchProfile = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/profile", {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch profile: ${response.status}`);
      }

      const profileData: ProfileDto = await response.json();
      setProfile(profileData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load profile";
      setError(errorMessage);
      logger.error("Failed to fetch profile in settings", err);
      toast.error("Failed to load your settings", {
        description: "Please refresh the page to try again.",
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const saveProfile = useCallback(async () => {
    if (!user?.id) return;

    try {
      setSaving(true);
      setError(null);

      const updateData = {
        mood: localMood,
        blocklist: localBlocklist,
      };

      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const updatedProfile: ProfileDto = await response.json();
      setProfile(updatedProfile);
      setHasUnsavedChanges(false);

      toast.success("Settings saved successfully", {
        description: "Your preferences have been updated.",
      });

      logger.info("Profile updated successfully", {
        userId: user.id,
        mood: localMood,
        blocklistCount: localBlocklist.length,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to save settings";

      // Revert optimistic updates on error
      if (profile) {
        setLocalMood(profile.mood);
        setLocalBlocklist([...profile.blocklist]);
      }

      setError(errorMessage);
      logger.error("Failed to save profile", err);
      toast.error("Failed to save settings", {
        description: "Your changes have been reverted. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  }, [user?.id, localMood, localBlocklist, profile]);

  const handleMoodChange = (mood: UserMood | null) => {
    setLocalMood(mood);
  };

  const handleBlocklistChange = (blocklist: string[]) => {
    setLocalBlocklist(blocklist);
  };

  const handleSave = () => {
    saveProfile();
  };

  const handleReset = () => {
    if (profile) {
      setLocalMood(profile.mood);
      setLocalBlocklist([...profile.blocklist]);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading your settings...</span>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive mb-4">{error}</p>
        <Button onClick={fetchProfile} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Mood Selection */}
      <div className="space-y-6">
        <MoodSelector
          currentMood={localMood}
          onMoodChange={handleMoodChange}
          disabled={saving}
        />
      </div>

      {/* Blocklist Management */}
      <div className="space-y-6">
        <BlocklistManager
          blocklist={localBlocklist}
          onBlocklistChange={handleBlocklistChange}
          disabled={saving}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 pt-6 border-t">
        <Button
          onClick={handleSave}
          disabled={!hasUnsavedChanges || saving}
          className="flex-1 sm:flex-none"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </Button>

        <Button
          onClick={handleReset}
          variant="outline"
          disabled={!hasUnsavedChanges || saving}
          className="flex-1 sm:flex-none"
        >
          Reset
        </Button>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
          {error}
        </div>
      )}

      {!hasUnsavedChanges && !saving && (
        <div className="text-sm text-muted-foreground">
          All changes saved.
        </div>
      )}
    </div>
  );
}
