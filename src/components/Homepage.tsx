import { useState, useEffect, useRef, useCallback } from "react";
import { useSupabase } from "./SupabaseProvider";
import { useQueryClient } from "@tanstack/react-query";
import FilterBanner from "./FilterBanner";
import ArticleList from "./ArticleList";
import type { ArticleFiltersApplied, ProfileDto, GetArticlesQueryParams } from "../types";

export default function Homepage() {
  const { user } = useSupabase();
  const isAuthenticated = !!user;
  const queryClient = useQueryClient();
  const queryClientRef = useRef(queryClient);

  const [isPersonalized, setIsPersonalized] = useState(false);
  const [profile, setProfile] = useState<ProfileDto | null>(null);
  const [queryParams] = useState<GetArticlesQueryParams>({
    limit: 20,
    offset: 0,
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
      console.error("Failed to fetch profile:", error);
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

    // Invalidate and refetch articles with new personalization setting
    if (queryClientRef.current) {
      queryClientRef.current.invalidateQueries({
        queryKey: ["articles"],
      });
    }
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
      <ArticleList queryParams={queryParams} isPersonalized={isPersonalized} />
    </div>
  );
}
