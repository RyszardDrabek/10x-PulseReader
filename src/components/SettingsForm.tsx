import { useState, useEffect, useCallback } from "react";
import { logger } from "../lib/utils/logger";
import { toast } from "sonner";
import MoodSelector from "./MoodSelector";
import BlocklistManager from "./BlocklistManager";
import { Button } from "./ui/button";
import { Loader2 } from "lucide-react";
import type { ProfileDto, UserMood, User } from "../types";

interface SettingsFormProps {
  user: User | null;
}

export default function SettingsForm({ user }: SettingsFormProps) {
  const [profile, setProfile] = useState<ProfileDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Local state for optimistic updates
  const [localMood, setLocalMood] = useState<UserMood | null>(null);
  const [localBlocklist, setLocalBlocklist] = useState<string[]>([]);

  // Track saving state for optimistic updates
  const [savingField, setSavingField] = useState<string | null>(null);

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
        if (response.status === 404) {
          // Profile doesn't exist yet, set profile to null
          setProfile(null);
          setLoading(false);
          return;
        }
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
  }, [user]);

  // Fetch profile on mount
  useEffect(() => {
    if (user?.id) {
      fetchProfile();
    } else if (user === null) {
      // User is not authenticated, stop loading
      setLoading(false);
    }
    // If user is undefined (still loading), keep loading state
  }, [user, fetchProfile]);

  // Update local state when profile changes
  useEffect(() => {
    if (profile) {
      setLocalMood(profile.mood);
      setLocalBlocklist([...profile.blocklist]);
    }
  }, [profile]);

  // Sync local state with profile when it loads
  useEffect(() => {
    if (profile) {
      setLocalMood(profile.mood);
      setLocalBlocklist([...profile.blocklist]);
    }
  }, [profile]);

  const saveProfileUpdate = useCallback(
    async (updateData: Partial<ProfileDto>, field: string) => {
      if (!user?.id) {
        return;
      }

      // Store previous state for rollback (use current local state if profile exists, or defaults if not)
      const previousMood = profile?.mood ?? null;
      const previousBlocklist = profile?.blocklist ?? [];

      try {
        setSavingField(field);
        setError(null);

        // Optimistically update local state
        if (updateData.mood !== undefined) {
          setLocalMood(updateData.mood);
        }
        if (updateData.blocklist !== undefined) {
          setLocalBlocklist(updateData.blocklist);
        }

        const method = profile ? "PATCH" : "POST";
        const response = await fetch("/api/profile", {
          method,
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

        toast.success("Settings updated", {
          description: "Your preferences have been saved.",
        });

        logger.info("Profile updated successfully", {
          userId: user.id,
          field,
          updateData,
          method,
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to update settings";

        // Revert optimistic updates on error
        setLocalMood(previousMood);
        setLocalBlocklist(previousBlocklist);

        setError(errorMessage);
        logger.error("Failed to update profile", err);
        toast.error("Failed to update settings", {
          description: "Your changes have been reverted. Please try again.",
        });
      } finally {
        setSavingField(null);
      }
    },
    [user?.id, profile]
  );

  const handleMoodChange = (mood: UserMood | null) => {
    // Only save if the mood has actually changed
    if (mood !== localMood) {
      saveProfileUpdate({ mood }, "mood");
    }
  };

  const handleBlocklistChange = (blocklist: string[]) => {
    // Only save if the blocklist has actually changed
    if (JSON.stringify(blocklist.sort()) !== JSON.stringify(localBlocklist.sort())) {
      saveProfileUpdate({ blocklist }, "blocklist");
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

  if (error && profile !== null) {
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
        <MoodSelector currentMood={localMood} onMoodChange={handleMoodChange} disabled={savingField === "mood"} />
      </div>

      {/* Blocklist Management */}
      <div className="space-y-6">
        <BlocklistManager
          blocklist={localBlocklist}
          onBlocklistChange={handleBlocklistChange}
          disabled={savingField === "blocklist"}
        />
      </div>

      {/* Status Messages */}
      {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>}
    </div>
  );
}
