import { useState, useEffect, useCallback } from "react";
import { useSupabase } from "./SupabaseProvider";
import { logger } from "../lib/utils/logger";
import FilterBanner from "./FilterBanner";
import ArticleList from "./ArticleList";
import OnboardingModal from "./OnboardingModal";
import type {
  ArticleFiltersApplied,
  ProfileDto,
  GetArticlesQueryParams,
  ArticleListResponse,
  UserMood,
} from "../types";

interface HomepageProps {
  initialData?: ArticleListResponse;
}

export default function Homepage({ initialData }: HomepageProps) {
  const { user } = useSupabase();
  const isAuthenticated = !!user;

  const [isPersonalized, setIsPersonalized] = useState(false);
  const [profile, setProfile] = useState<ProfileDto | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [articleStats, setArticleStats] = useState<{
    totalArticles?: number;
    filteredArticles?: number;
    blockedItemsCount?: number;
  }>({});
  const [queryParams] = useState<GetArticlesQueryParams>({
    limit: 20,
    offset: 0,
    sortBy: "publication_date",
    sortOrder: "desc",
  });

  const fetchProfile = useCallback(async () => {
    if (!user?.id) return;

    try {
      const response = await fetch("/api/profile", {
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (response.ok) {
        const profileData: ProfileDto = await response.json();
        setProfile(profileData);
      }
    } catch (error) {
      logger.error("Failed to fetch profile", error);
    }
  }, [user?.id]);

  // Fetch profile when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      fetchProfile();
    }
  }, [isAuthenticated, user?.id, fetchProfile]);

  // Automatically enable personalization for authenticated users based on their profile preference
  useEffect(() => {
    if (isAuthenticated && profile) {
      const personalizationValue = profile.personalizationEnabled ?? true;
      logger.debug("Setting personalization for authenticated user", {
        userId: user?.id,
        personalizationEnabled: profile.personalizationEnabled,
        defaultValue: true,
        finalValue: personalizationValue,
      });
      setIsPersonalized(personalizationValue);
    } else if (!isAuthenticated) {
      logger.debug("Disabling personalization for unauthenticated user");
      setIsPersonalized(false);
    } else if (isAuthenticated && !profile) {
      // Authenticated but profile not loaded yet - default to true for personalization
      setIsPersonalized(true);
    }
  }, [isAuthenticated, profile, user]);

  // Show onboarding modal for new users without preferences
  useEffect(() => {
    if (isAuthenticated && profile && !showOnboarding) {
      // Check if user needs onboarding (no mood set and empty blocklist)
      const needsOnboarding = profile.mood === null && (!profile.blocklist || profile.blocklist.length === 0);

      if (needsOnboarding) {
        // Small delay to allow the page to render first
        setTimeout(() => setShowOnboarding(true), 1000);
      }
    }
  }, [isAuthenticated, profile, showOnboarding]);

  // Refresh profile data when window regains focus or becomes visible (e.g., returning from settings page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && isAuthenticated && user?.id) {
        fetchProfile();
      }
    };

    const handleFocus = () => {
      if (isAuthenticated && user?.id) {
        fetchProfile();
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      // Listen for profile changes from other tabs/windows
      if (e.key === "profile-updated" && isAuthenticated && user?.id) {
        // eslint-disable-next-line no-console
        console.log("[Homepage] Profile update detected from another tab, refetching...");
        fetchProfile();
      }
    };

    const handleProfileUpdate = (e: CustomEvent<ProfileDto>) => {
      // Listen for profile updates from the same tab (e.g., from settings page)
      setProfile(e.detail);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("profileUpdated", handleProfileUpdate as EventListener);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("profileUpdated", handleProfileUpdate as EventListener);
    };
  }, [isAuthenticated, user?.id, fetchProfile]);

  const handleOnboardingComplete = useCallback(
    async (preferences: { mood?: UserMood; blocklist?: string[] }) => {
      if (!user?.id) return;

      try {
        // Update profile with onboarding preferences
        const updateData = {
          mood: preferences.mood || null,
          blocklist: preferences.blocklist || [],
        };

        const response = await fetch("/api/profile", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updateData),
        });

        if (!response.ok) {
          throw new Error(`Failed to update profile: ${response.status}`);
        }

        const updatedProfile: ProfileDto = await response.json();
        setProfile(updatedProfile);
        setShowOnboarding(false);

        // Enable personalization automatically
        setIsPersonalized(true);

        logger.info("Onboarding completed successfully", {
          userId: user.id,
          mood: preferences.mood,
          blocklistCount: preferences.blocklist?.length || 0,
        });
      } catch (error) {
        logger.error("Failed to complete onboarding", error);
        throw error; // Re-throw to let the modal handle the error
      }
    },
    [user?.id]
  );

  const getCurrentFilters = (): ArticleFiltersApplied => {
    if (!isPersonalized) {
      return {
        personalization: false,
      };
    }

    return {
      personalization: true,
      blockedItemsCount: profile?.blocklist?.length || 0,
    };
  };

  return (
    <div className="min-h-screen">
      <FilterBanner
        currentFilters={{
          ...getCurrentFilters(),
          blockedItemsCount: articleStats.blockedItemsCount,
        }}
        profile={profile}
        onProfileUpdate={setProfile}
        totalArticles={articleStats.totalArticles}
        filteredArticles={articleStats.filteredArticles}
        isAuthenticated={isAuthenticated}
      />
      <ArticleList
        queryParams={queryParams}
        isPersonalized={isPersonalized}
        profile={profile}
        initialData={initialData}
        onStatsUpdate={setArticleStats}
      />

      <OnboardingModal
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onComplete={handleOnboardingComplete}
      />
    </div>
  );
}
