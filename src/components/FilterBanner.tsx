import { useSupabase } from "./SupabaseProvider";
import { Switch } from "./ui/switch";
import { Badge } from "./ui/badge";
import { Smile, Meh, Frown } from "lucide-react";
import type { ArticleFiltersApplied, ProfileDto } from "../types";

interface FilterBannerProps {
  currentFilters: ArticleFiltersApplied;
  onTogglePersonalization: (enabled: boolean) => void;
  profile: ProfileDto | null;
}

export default function FilterBanner({ currentFilters, onTogglePersonalization, profile }: FilterBannerProps) {
  const { user } = useSupabase();
  const isAuthenticated = !!user;
  const isPersonalized = currentFilters?.personalization || false;

  const handleToggle = (enabled: boolean) => {
    if (!isAuthenticated) {
      // Redirect to login or show prompt
      window.location.href = "/login";
      return;
    }

    onTogglePersonalization(enabled);
  };

  const getMoodIcon = (mood: string | null) => {
    switch (mood) {
      case "positive":
        return <Smile className="h-4 w-4" />;
      case "neutral":
        return <Meh className="h-4 w-4" />;
      case "negative":
        return <Frown className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getMoodColor = (mood: string | null) => {
    switch (mood) {
      case "positive":
        return "bg-green-100 text-green-800";
      case "neutral":
        return "bg-yellow-100 text-yellow-800";
      case "negative":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="border-b bg-muted/50 px-4 py-3 md:px-6" role="region" aria-label="Article filters">
      <div className="flex flex-col space-y-3 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div className="flex flex-wrap items-center gap-2 md:gap-4" role="group" aria-label="Active filters">
          {isAuthenticated && isPersonalized && profile?.mood && (
            <div className="flex items-center space-x-2" data-testid="active-filter">
              <span className="text-sm text-muted-foreground" id="mood-label">
                Mood:
              </span>
              <Badge variant="secondary" className={getMoodColor(profile.mood)} aria-labelledby="mood-label">
                {getMoodIcon(profile.mood)}
                <span className="ml-1 capitalize">{profile.mood}</span>
              </Badge>
            </div>
          )}

          {isAuthenticated && isPersonalized && profile?.blocklist && profile.blocklist.length > 0 && (
            <div className="flex items-center space-x-2" data-testid="active-filter">
              <span className="text-sm text-muted-foreground" id="blocked-label">
                Blocked:
              </span>
              <Badge
                variant="outline"
                aria-labelledby="blocked-label"
                aria-description={`${profile.blocklist.length} sources are blocked from your feed`}
              >
                {profile.blocklist.length} sources
              </Badge>
            </div>
          )}

          {currentFilters?.sentiment && (
            <div className="flex items-center space-x-2" data-testid="active-filter">
              <span className="text-sm text-muted-foreground" id="sentiment-label">
                Sentiment:
              </span>
              <Badge
                variant="secondary"
                className={getMoodColor(currentFilters.sentiment)}
                aria-labelledby="sentiment-label"
              >
                {getMoodIcon(currentFilters.sentiment)}
                <span className="ml-1 capitalize">{currentFilters.sentiment}</span>
              </Badge>
            </div>
          )}
        </div>

        <div
          className="flex items-center justify-between md:justify-end md:space-x-2"
          role="group"
          aria-label="Personalization controls"
        >
          <span className="text-sm text-muted-foreground md:mr-2" id="personalization-label">
            {isAuthenticated ? "Personalization" : "Personalize"}
          </span>
          <Switch
            checked={isPersonalized}
            onCheckedChange={handleToggle}
            disabled={!isAuthenticated}
            aria-labelledby="personalization-label"
            aria-describedby={!isAuthenticated ? "personalization-description" : undefined}
            data-testid="filter-button"
          />
          {!isAuthenticated && (
            <span className="text-xs text-muted-foreground ml-2 flex-shrink-0" id="personalization-description">
              <a
                href="/login"
                className="text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                aria-label="Sign in to enable personalization features"
              >
                Sign in
              </a>{" "}
              to personalize
            </span>
          )}
        </div>
      </div>

      {/* Live region for filter changes */}
      <div aria-live="polite" aria-atomic="true" className="sr-only" role="status">
        {isPersonalized
          ? `Personalization enabled${profile?.mood ? ` with ${profile.mood} mood filter` : ""}${profile?.blocklist?.length ? ` and ${profile.blocklist.length} blocked sources` : ""}`
          : "Personalization disabled, showing all articles"}
      </div>
    </div>
  );
}
