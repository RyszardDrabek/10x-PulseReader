import { useEffect, useRef, useCallback, useState } from "react";
import { useArticles } from "../lib/hooks/useArticles";
import { useSupabase } from "./SupabaseProvider";
import ArticleCard from "./ArticleCard";
import LoadingSkeleton from "./LoadingSkeleton";
import NoResultsPlaceholder from "./NoResultsPlaceholder";
import type { GetArticlesQueryParams } from "../types";

interface ArticleListProps {
  queryParams?: GetArticlesQueryParams;
  isPersonalized?: boolean;
}

export default function ArticleList({
  queryParams = { limit: 20, offset: 0 },
  isPersonalized = false,
}: ArticleListProps) {
  const { user } = useSupabase();
  const userId = user?.id;
  const [currentQueryParams, setCurrentQueryParams] = useState({
    ...queryParams,
    applyPersonalization: isPersonalized,
  });

  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useArticles(
    currentQueryParams,
    userId
  );

  // Update query params when props change
  useEffect(() => {
    setCurrentQueryParams({
      ...queryParams,
      applyPersonalization: isPersonalized,
    });
  }, [queryParams, isPersonalized]);

  const observerRef = useRef<IntersectionObserver | null>(null);

  // Flatten the pages data
  const articles = data?.pages.flatMap((page) => page.data) || [];
  const hasMore = hasNextPage || false;
  const isEmpty = articles.length === 0 && !isLoading;

  const lastArticleRef = useCallback(
    (node: HTMLDivElement) => {
      if (isFetchingNextPage) return;
      if (observerRef.current) observerRef.current.disconnect();

      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          fetchNextPage();
        }
      });

      if (node) observerRef.current.observe(node);
    },
    [isFetchingNextPage, hasMore, fetchNextPage]
  );

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-destructive mb-4">Failed to load articles</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <NoResultsPlaceholder
        filters={{
          personalization: isPersonalized,
          blockedItemsCount: 0, // TODO: Get from profile
        }}
        isAuthenticated={!!user}
        onAdjustFilters={() => {
          // TODO: Navigate to settings or reset filters
          console.log("Adjust filters");
        }}
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 md:py-6">
      {/* Live region for screen reader announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only" role="status">
        {isLoading && "Loading articles..."}
        {isFetchingNextPage && "Loading more articles..."}
        {error && "Error loading articles. Please try again."}
        {!isLoading &&
          !isFetchingNextPage &&
          articles.length > 0 &&
          `${articles.length} articles loaded${hasMore ? ", more available" : ", all articles loaded"}`}
      </div>

      <div className="space-y-4 md:space-y-6" role="feed" aria-label="Article feed" aria-busy={isLoading}>
        {articles.map((article, index) => (
          <article
            key={article.id}
            ref={index === articles.length - 1 ? lastArticleRef : undefined}
            aria-posinset={index + 1}
            aria-setsize={articles.length}
          >
            <ArticleCard article={article} />
          </article>
        ))}

        {isFetchingNextPage && (
          <div className="py-4" role="status" aria-label="Loading more articles">
            <LoadingSkeleton count={3} />
          </div>
        )}
      </div>

      {!hasMore && articles.length > 0 && (
        <div className="text-center py-8 text-muted-foreground" role="status" aria-label="End of article feed">
          No more articles to load
        </div>
      )}
    </div>
  );
}
