import { useState, useEffect, useCallback } from "react";
import { logger } from "../lib/utils/logger";
import { toast } from "sonner";
import MoodSelector from "./MoodSelector";
import BlocklistManager from "./BlocklistManager";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
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
  const [localPersonalizationEnabled, setLocalPersonalizationEnabled] = useState<boolean>(true);

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
      setLocalPersonalizationEnabled(profile.personalizationEnabled ?? true);
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
      const previousPersonalizationEnabled = profile?.personalizationEnabled ?? true;

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
        if (updateData.personalizationEnabled !== undefined) {
          setLocalPersonalizationEnabled(updateData.personalizationEnabled);
        }

        const method = profile ? "PATCH" : "POST";
        const response = await fetch("/api/profile", {
          method,
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(updateData),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const updatedProfile: ProfileDto = await response.json();
        setProfile(updatedProfile);

        // Notify current tab and other tabs/windows about the profile update
        window.localStorage.setItem('profile-updated', Date.now().toString());
        // Dispatch a custom event for the current tab
        window.dispatchEvent(new CustomEvent('profileUpdated', { detail: updatedProfile }));
        window.localStorage.removeItem('profile-updated');

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
        setLocalPersonalizationEnabled(previousPersonalizationEnabled);

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

  const handlePersonalizationToggle = (enabled: boolean) => {
    // Only save if the setting has actually changed
    if (enabled !== localPersonalizationEnabled) {
      saveProfileUpdate({ personalizationEnabled: enabled }, "personalization");
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

      {/* Personalization Settings */}
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Personalization</h3>
            <p className="text-sm text-muted-foreground">
              Control whether your mood and blocklist preferences are applied to filter articles.
            </p>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="personalization-toggle" className="text-sm font-medium">
                Enable personalization
              </Label>
              <p className="text-xs text-muted-foreground">
                When enabled, articles will be filtered based on your mood and blocked keywords
              </p>
            </div>
            <Switch
              id="personalization-toggle"
              checked={localPersonalizationEnabled}
              onCheckedChange={handlePersonalizationToggle}
              disabled={savingField === "personalization"}
            />
          </div>
        </div>
      </div>

      {/* Status Messages */}
      {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>}
    </div>
  );
}
