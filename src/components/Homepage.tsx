import { useState, useEffect, useCallback } from "react";
import { useSupabase } from "./SupabaseProvider";
import { logger } from "../lib/utils/logger";
import FilterBanner from "./FilterBanner";
import ArticleList from "./ArticleList";
import type { ArticleFiltersApplied, ProfileDto, GetArticlesQueryParams, ArticleListResponse } from "../types";

interface HomepageProps {
  initialData?: ArticleListResponse;
}

export default function Homepage({ initialData }: HomepageProps) {
  const { user } = useSupabase();
  const isAuthenticated = !!user;

  const [isPersonalized, setIsPersonalized] = useState(false);
  const [profile, setProfile] = useState<ProfileDto | null>(null);
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

  const handleTogglePersonalization = (enabled: boolean) => {
    setIsPersonalized(enabled);
    // The ArticleList component will re-render with the new personalization setting
    // and useArticles hook will handle the query invalidation
  };

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
        currentFilters={getCurrentFilters()}
        onTogglePersonalization={handleTogglePersonalization}
        profile={profile}
      />
      <ArticleList queryParams={queryParams} isPersonalized={isPersonalized} initialData={initialData} />
    </div>
  );
}
