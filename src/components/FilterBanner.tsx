import { useState, useRef } from "react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Smile, Meh, Frown, Loader2, X, Plus } from "lucide-react";
import { logger } from "../lib/utils/logger";
import { toast } from "sonner";
import type { ArticleFiltersApplied, ProfileDto, UserMood } from "../types";

interface FilterBannerProps {
  currentFilters: ArticleFiltersApplied;
  profile: ProfileDto | null;
  onProfileUpdate?: (updatedProfile: ProfileDto) => void;
  totalArticles?: number;
  filteredArticles?: number;
  isAuthenticated: boolean;
}

export default function FilterBanner({
  currentFilters,
  profile,
  onProfileUpdate,
  totalArticles,
  filteredArticles,
  isAuthenticated,
}: FilterBannerProps) {
  const isPersonalized = currentFilters?.personalization || false;

  // All hooks must be called at the top level, before any conditional returns
  const [updatingMood, setUpdatingMood] = useState<UserMood | null>(null);
  const [showBlocklistInput, setShowBlocklistInput] = useState(false);
  const [newBlocklistItem, setNewBlocklistItem] = useState("");
  const [updatingBlocklist, setUpdatingBlocklist] = useState(false);
  const blocklistInputRef = useRef<HTMLInputElement>(null);

  // Debug logging to help diagnose authentication issues
  console.log("FilterBanner RENDER:", {
    isAuthenticated,
    isPersonalized,
    timestamp: new Date().toISOString(),
  });

  const handleMoodChange = async (newMood: UserMood) => {
    if (!isAuthenticated || !profile || updatingMood) return;

    const currentMood = profile.mood;

    // Don't do anything if selecting the same mood
    if (currentMood === newMood) return;

    setUpdatingMood(newMood);

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mood: newMood }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update mood: ${response.status}`);
      }

      const updatedProfile: ProfileDto = await response.json();

      // Notify parent component of profile update
      onProfileUpdate?.(updatedProfile);

      logger.info("Mood updated successfully via FilterBanner", {
        userId: user?.id,
        oldMood: currentMood,
        newMood,
      });
    } catch (error) {
      logger.error("Failed to update mood via FilterBanner", error);
      toast.error("Failed to update mood preference", {
        description: "Please try again or use the settings page.",
      });
    } finally {
      setUpdatingMood(null);
    }
  };

  const handleAddBlocklistItem = async () => {
    if (!isAuthenticated || !profile || updatingBlocklist || !newBlocklistItem.trim()) return;

    const item = newBlocklistItem.trim();
    const currentBlocklist = profile.blocklist || [];

    // Validate item
    if (currentBlocklist.some((existing) => existing.toLowerCase() === item.toLowerCase())) {
      toast.error("This item is already in your blocklist");
      return;
    }

    if (item.length > 100) {
      toast.error("Blocklist item cannot be longer than 100 characters");
      return;
    }

    if (/<[^>]*>/.test(item)) {
      toast.error("HTML tags are not allowed");
      return;
    }

    setUpdatingBlocklist(true);

    try {
      const newBlocklist = [...currentBlocklist, item];

      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ blocklist: newBlocklist }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update blocklist: ${response.status}`);
      }

      const updatedProfile: ProfileDto = await response.json();
      onProfileUpdate?.(updatedProfile);

      setNewBlocklistItem("");
      setShowBlocklistInput(false);

      logger.info("Blocklist item added successfully via FilterBanner", {
        userId: user?.id,
        item,
        newCount: newBlocklist.length,
      });
    } catch (error) {
      logger.error("Failed to add blocklist item via FilterBanner", error);
      toast.error("Failed to add blocklist item", {
        description: "Please try again or use the settings page.",
      });
    } finally {
      setUpdatingBlocklist(false);
    }
  };

  const handleRemoveBlocklistItem = async (index: number) => {
    if (!isAuthenticated || !profile || updatingBlocklist) return;

    const currentBlocklist = profile.blocklist || [];
    const newBlocklist = currentBlocklist.filter((_, i) => i !== index);

    setUpdatingBlocklist(true);

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ blocklist: newBlocklist }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update blocklist: ${response.status}`);
      }

      const updatedProfile: ProfileDto = await response.json();
      onProfileUpdate?.(updatedProfile);

      logger.info("Blocklist item removed successfully via FilterBanner", {
        userId: user?.id,
        removedItem: currentBlocklist[index],
        newCount: newBlocklist.length,
      });
    } catch (error) {
      logger.error("Failed to remove blocklist item via FilterBanner", error);
      toast.error("Failed to remove blocklist item", {
        description: "Please try again or use the settings page.",
      });
    } finally {
      setUpdatingBlocklist(false);
    }
  };

  const handleBlocklistKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddBlocklistItem();
    } else if (e.key === "Escape") {
      setShowBlocklistInput(false);
      setNewBlocklistItem("");
    }
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
          {isAuthenticated && isPersonalized && (
            <div className="flex items-center space-x-2" data-testid="active-filter">
              <span className="text-sm text-muted-foreground" id="mood-label">
                Mood:
              </span>
              <div className="flex items-center space-x-1" role="group" aria-label="Mood selection">
                {(["positive", "neutral", "negative"] as const).map((mood) => {
                  const isSelected = profile?.mood === mood;
                  const isUpdating = updatingMood === mood;

                  return (
                    <Button
                      key={mood}
                      variant={isSelected ? "default" : "ghost"}
                      size="sm"
                      className={`h-7 px-2 transition-all duration-200 ${
                        isSelected ? getMoodColor(mood) : "hover:bg-muted"
                      } ${isUpdating ? "opacity-50 cursor-not-allowed" : ""}`}
                      onClick={() => handleMoodChange(mood)}
                      disabled={isUpdating}
                      aria-label={`Set mood to ${mood}`}
                      aria-pressed={isSelected}
                      data-testid={`mood-toggle-${mood}`}
                    >
                      {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : getMoodIcon(mood)}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Legacy mood display for when personalization is enabled but no mood is set */}
          {isAuthenticated && isPersonalized && !profile?.mood && (
            <div className="flex items-center space-x-2" data-testid="active-filter">
              <span className="text-sm text-muted-foreground" id="mood-label">
                Mood:
              </span>
              <span className="text-sm text-muted-foreground">Not set</span>
            </div>
          )}

          {isAuthenticated && isPersonalized && profile?.blocklist && profile.blocklist.length > 0 && (
            <div className="flex items-center space-x-2" data-testid="active-filter">
              <span className="text-sm text-muted-foreground" id="blocked-label">
                Blocked:
              </span>
              <div className="flex items-center space-x-1">
                <Badge
                  variant="outline"
                  aria-labelledby="blocked-label"
                  aria-description={`${profile.blocklist.length} sources are blocked from your feed`}
                >
                  {profile.blocklist.length} items
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 hover:bg-muted"
                  onClick={() => setShowBlocklistInput(!showBlocklistInput)}
                  disabled={updatingBlocklist}
                  aria-label="Toggle blocklist editing"
                  data-testid="toggle-blocklist-edit"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>

              {/* Inline blocklist editing */}
              {showBlocklistInput && (
                <div className="flex items-center space-x-1 ml-2">
                  <Input
                    ref={blocklistInputRef}
                    type="text"
                    placeholder="Add keyword..."
                    value={newBlocklistItem}
                    onChange={(e) => setNewBlocklistItem(e.target.value)}
                    onKeyDown={handleBlocklistKeyPress}
                    disabled={updatingBlocklist}
                    className="h-6 w-24 text-xs"
                    maxLength={100}
                    data-testid="blocklist-inline-input"
                  />
                  <Button
                    size="sm"
                    className="h-6 px-2"
                    onClick={handleAddBlocklistItem}
                    disabled={updatingBlocklist || !newBlocklistItem.trim()}
                    data-testid="add-blocklist-inline"
                  >
                    {updatingBlocklist ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => {
                      setShowBlocklistInput(false);
                      setNewBlocklistItem("");
                    }}
                    disabled={updatingBlocklist}
                    aria-label="Cancel adding blocklist item"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Add blocklist button when no items exist */}
          {isAuthenticated && isPersonalized && (!profile?.blocklist || profile.blocklist.length === 0) && (
            <div className="flex items-center space-x-2" data-testid="active-filter">
              <span className="text-sm text-muted-foreground">Blocklist:</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => {
                  setShowBlocklistInput(true);
                  setTimeout(() => blocklistInputRef.current?.focus(), 0);
                }}
                disabled={updatingBlocklist}
                data-testid="add-first-blocklist-item"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add keywords
              </Button>
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

        {/* Filter statistics */}
        {isPersonalized &&
          (totalArticles !== undefined ||
            filteredArticles !== undefined ||
            currentFilters?.blockedItemsCount !== undefined) && (
            <div className="flex items-center space-x-4 text-xs text-muted-foreground" data-testid="filter-stats">
              {totalArticles !== undefined && filteredArticles !== undefined && (
                <span>
                  Showing {totalArticles} of {totalArticles + filteredArticles} articles
                </span>
              )}
              {currentFilters?.blockedItemsCount !== undefined && currentFilters.blockedItemsCount > 0 && (
                <span>{currentFilters.blockedItemsCount} blocked by keywords</span>
              )}
            </div>
          )}

        {/* Removed personalization toggle - now controlled in Settings */}
        {!isAuthenticated && (
          <div className="flex items-center justify-end">
            <span className="text-xs text-muted-foreground">
              <a
                href="/login"
                className="text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                aria-label="Sign in to enable personalization features"
              >
                Sign in
              </a>{" "}
              to personalize
            </span>
          </div>
        )}
      </div>

      {/* Quick blocklist item removal - shown when personalization is enabled and items exist */}
      {isAuthenticated &&
        isPersonalized &&
        profile?.blocklist &&
        profile.blocklist.length > 0 &&
        !showBlocklistInput && (
          <div className="flex items-center space-x-1 ml-4" role="group" aria-label="Quick blocklist management">
            <span className="text-xs text-muted-foreground hidden sm:inline">Quick remove:</span>
            {profile.blocklist.slice(0, 3).map((item, index) => (
              <Button
                key={`${item}-${index}`}
                variant="ghost"
                size="sm"
                className="h-5 px-1 text-xs hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => handleRemoveBlocklistItem(index)}
                disabled={updatingBlocklist}
                aria-label={`Remove "${item}" from blocklist`}
                title={`Remove "${item}"`}
                data-testid={`quick-remove-blocklist-${index}`}
              >
                {item.length > 10 ? `${item.substring(0, 10)}...` : item}
                <X className="h-3 w-3 ml-1" />
              </Button>
            ))}
            {profile.blocklist.length > 3 && (
              <span className="text-xs text-muted-foreground">+{profile.blocklist.length - 3} more</span>
            )}
          </div>
        )}

      {/* Live region for filter status */}
      <div aria-live="polite" aria-atomic="true" className="sr-only" role="status">
        {isAuthenticated && isPersonalized
          ? `Showing personalized content${profile?.mood ? ` with ${profile.mood} mood filter` : ""}${profile?.blocklist?.length ? ` and ${profile.blocklist.length} blocked items` : ""}`
          : isAuthenticated
            ? "Showing all articles - personalization disabled in settings"
            : "Sign in to enable personalized content"}
      </div>
    </div>
  );
}
