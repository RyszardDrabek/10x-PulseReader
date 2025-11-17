import { useState, useEffect, useRef, useCallback } from "react";
import { useSupabase } from "./SupabaseProvider";
import ArticleCard from "./ArticleCard";
import LoadingSkeleton from "./LoadingSkeleton";
import NoResultsPlaceholder from "./NoResultsPlaceholder";
import type { GetArticlesQueryParams, ArticleListResponse } from "../types";

interface ArticleListProps {
  queryParams?: GetArticlesQueryParams;
  initialData?: ArticleListResponse;
  isPersonalized?: boolean;
}

export default function ArticleList({
  queryParams = { limit: 20, offset: 0 },
  initialData,
  isPersonalized = false,
}: ArticleListProps) {
  const { supabase } = useSupabase();

  const [articles, setArticles] = useState(initialData?.data || []);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(initialData?.pagination.hasMore || false);
  const [currentOffset, setCurrentOffset] = useState(initialData?.pagination.offset || 0);
  const [usePersonalization, setUsePersonalization] = useState(isPersonalized);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const prevPersonalizationRef = useRef<boolean | undefined>(undefined);

  // If we have initialData but no articles, something is wrong
  if (initialData && articles.length === 0) {
    console.error("InitialData provided but articles array is empty:", initialData);
  }

  const fetchArticles = useCallback(
    async (offset = 0, append = false) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          ...queryParams,
          offset: offset.toString(),
          applyPersonalization: usePersonalization.toString(),
        });

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };

        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.access_token) {
          headers.Authorization = `Bearer ${session.access_token}`;
        }

        const response = await fetch(`/api/articles?${params}`, { headers });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: Failed to fetch articles`);
        }

        const data: ArticleListResponse = await response.json();
        setArticles((prev) => (append ? [...prev, ...data.data] : data.data));
        setHasMore(data.pagination.hasMore);
        setCurrentOffset(data.pagination.offset + data.pagination.limit);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load articles");
      } finally {
        setLoading(false);
      }
    },
    [queryParams, usePersonalization, supabase]
  );

  // Initial fetch if no initialData
  useEffect(() => {
    if (!initialData) {
      fetchArticles(0);
    }
  }, [fetchArticles, initialData]);

  useEffect(() => {
    const prevPersonalization = prevPersonalizationRef.current;
    setUsePersonalization(isPersonalized);

    // Only refetch if personalization actually changed from a previous value
    // Don't refetch on initial render when prevPersonalization is the same as current
    if (prevPersonalization !== undefined && prevPersonalization !== isPersonalized) {
      setArticles([]);
      fetchArticles(0, false);
    }

    prevPersonalizationRef.current = isPersonalized;
  }, [isPersonalized]);

  const lastArticleRef = useCallback(
    (node: HTMLDivElement) => {
      if (loading || !hasMore) return;
      if (observerRef.current) observerRef.current.disconnect();
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          fetchArticles(currentOffset, true);
        }
      });
      if (node) observerRef.current.observe(node);
    },
    [loading, hasMore, fetchArticles, currentOffset]
  );

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-destructive mb-4">Failed to load articles</p>
        <button
          onClick={() => fetchArticles(0, false)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Try Again
        </button>
      </div>
    );
  }

  const isEmpty = articles.length === 0 && !loading;
  if (isEmpty) {
    return (
      <NoResultsPlaceholder
        filters={{ personalization: usePersonalization, blockedItemsCount: 0 }}
        isAuthenticated={!!supabase.user}
        onAdjustFilters={() => {
          setUsePersonalization(false);
          fetchArticles(0, false);
        }}
      />
    );
  }

  // Ensure we display articles if we have initialData, even if state gets confused
  const displayArticles = initialData?.data || articles;

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 md:py-6">
      <div className="space-y-4 md:space-y-6" role="feed" aria-label="Article feed" aria-busy={loading}>
        {displayArticles.map((article, index) => (
          <article
            key={article.id}
            ref={index === displayArticles.length - 1 ? lastArticleRef : undefined}
            aria-posinset={index + 1}
            aria-setsize={displayArticles.length}
          >
            <ArticleCard article={article} />
          </article>
        ))}
        {loading && displayArticles.length === 0 && <LoadingSkeleton count={3} />}
      </div>
      {!hasMore && displayArticles.length > 0 && (
        <div className="text-center py-8 text-muted-foreground">No more articles to load</div>
      )}
      {displayArticles.length === 0 && !loading && !error && (
        <div className="text-center py-8 text-muted-foreground">No articles found</div>
      )}
      {error && displayArticles.length === 0 && (
        <div className="text-center py-8 text-red-600">Error loading articles: {error}</div>
      )}
    </div>
  );
}
