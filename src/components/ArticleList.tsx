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
  onStatsUpdate?: (stats: { totalArticles?: number; filteredArticles?: number; blockedItemsCount?: number }) => void;
}

export default function ArticleList({
  queryParams = { limit: 20, offset: 0, sortBy: "publication_date", sortOrder: "desc" },
  initialData,
  isPersonalized = false,
  onStatsUpdate,
}: ArticleListProps) {
  const { supabase } = useSupabase();

  // Check if we have valid initial data (with articles)
  const hasInitialData = initialData && initialData.data && initialData.data.length > 0;

  const [articles, setArticles] = useState(initialData?.data || []);
  const [loading, setLoading] = useState(!hasInitialData);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(initialData?.pagination.hasMore || false);
  const [currentOffset, setCurrentOffset] = useState(
    initialData ? initialData.pagination.offset + initialData.pagination.limit : 0
  );
  const [usePersonalization, setUsePersonalization] = useState(isPersonalized);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const prevPersonalizationRef = useRef<boolean | undefined>(undefined);
  const hasMoreRef = useRef(hasMore);
  const loadingRef = useRef(loading);
  const currentOffsetRef = useRef(currentOffset);

  // Keep refs in sync with state
  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    currentOffsetRef.current = currentOffset;
  }, [currentOffset]);

  // Cleanup observer when component unmounts
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, []);

  const fetchArticles = useCallback(
    async (offset = 0, append = false) => {
      // Prevent duplicate fetches
      if (loadingRef.current) {
        return;
      }

      setLoading(true);
      setError(null);
      try {
        // Build URLSearchParams with proper string conversion
        const params = new URLSearchParams();
        if (queryParams.limit !== undefined) {
          params.set("limit", queryParams.limit.toString());
        }
        // Use the offset parameter, not queryParams.offset
        params.set("offset", offset.toString());
        if (queryParams.sentiment) {
          params.set("sentiment", queryParams.sentiment);
        }
        if (queryParams.topicId) {
          params.set("topicId", queryParams.topicId);
        }
        if (queryParams.sourceId) {
          params.set("sourceId", queryParams.sourceId);
        }
        if (queryParams.sortBy) {
          params.set("sortBy", queryParams.sortBy);
        }
        if (queryParams.sortOrder) {
          params.set("sortOrder", queryParams.sortOrder);
        }
        params.set("applyPersonalization", usePersonalization.toString());

        // eslint-disable-next-line no-console
        console.log("[ArticleList] Making API request:", {
          url: `/api/articles?${params}`,
          usePersonalization,
          limit: queryParams.limit,
          offset: offset,
          hasSupabase: !!supabase,
        });

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };

        // Only try to get session if supabase client is available
        if (supabase) {
          try {
            const {
              data: { session },
            } = await supabase.auth.getSession();
            // eslint-disable-next-line no-console
            console.log("[ArticleList] Session check:", {
              hasSession: !!session,
              hasAccessToken: !!session?.access_token,
              userId: session?.user?.id,
              userEmail: session?.user?.email,
            });
            if (session?.access_token) {
              headers.Authorization = `Bearer ${session.access_token}`;
            }
          } catch (authError) {
            // If auth fails, continue without auth header
            // eslint-disable-next-line no-console
            console.warn("[ArticleList] Failed to get session:", authError);
          }
        }

        const response = await fetch(`/api/articles?${params}`, { headers });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: Failed to fetch articles`);
        }

        const data: ArticleListResponse = await response.json();

        // Calculate filtered articles count (total - shown articles)
        const shownArticles = data.data?.length || 0;
        const totalArticles = data.pagination.total;
        const filteredArticles = Math.max(0, totalArticles - shownArticles);

        setArticles((prev) => {
          if (append) {
            // Only append if we have new data
            if (data.data && data.data.length > 0) {
              return [...prev, ...data.data];
            }
            // If no new data but append was requested, keep previous articles
            return prev;
          }
          // Replace articles only if we have data
          return data.data && data.data.length > 0 ? data.data : prev;
        });
        setHasMore(data.pagination.hasMore);
        setCurrentOffset(data.pagination.offset + data.pagination.limit);

        // Update stats for parent component
        onStatsUpdate?.({
          totalArticles: shownArticles,
          filteredArticles,
          blockedItemsCount: data.filtersApplied?.blockedItemsCount,
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to load articles";
        setError(errorMessage);
        // Don't clear articles on error when appending - preserve existing articles
        if (!append) {
          setArticles([]);
        }
      } finally {
        setLoading(false);
      }
    },
    [queryParams, usePersonalization, supabase, onStatsUpdate]
  );

  // Initial fetch if no valid initialData (empty or missing)
  useEffect(() => {
    if (!hasInitialData) {
      fetchArticles(0);
    }
  }, [hasInitialData, fetchArticles]);

  useEffect(() => {
    const prevPersonalization = prevPersonalizationRef.current;

    // Only update if personalization actually changed
    if (prevPersonalization !== isPersonalized) {
      setUsePersonalization(isPersonalized);

      // Only refetch if personalization actually changed from a previous value
      // Don't refetch on initial render when prevPersonalization is undefined
      if (prevPersonalization !== undefined) {
        setArticles([]);
        fetchArticles(0, false);
      }
    }

    prevPersonalizationRef.current = isPersonalized;
  }, [isPersonalized, fetchArticles]);

  const lastArticleRef = useCallback(
    (node: HTMLDivElement | null) => {
      // Disconnect previous observer
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }

      // Always set up observer if we have a node
      // The observer callback will check hasMore internally
      if (node) {
        observerRef.current = new IntersectionObserver(
          (entries) => {
            // Check conditions using refs to get latest values
            if (entries[0].isIntersecting && hasMoreRef.current && !loadingRef.current) {
              fetchArticles(currentOffsetRef.current, true);
            }
          },
          {
            rootMargin: "100px", // Start loading 100px before the element is visible
            threshold: 0.1, // Trigger when 10% of element is visible
          }
        );
        observerRef.current.observe(node);
      }
    },
    [fetchArticles]
  );

  const isEmpty = articles.length === 0 && !loading && !error;
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

  // Use articles state directly - it's initialized with initialData on mount
  const displayArticles = articles;

  return (
    <div className="max-w-6xl mx-auto px-4 py-4 md:py-6">
      {/* Show error banner if there's an error but keep articles visible */}
      {error && (
        <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-md">
          <p className="text-destructive mb-2">{error}</p>
          <button
            onClick={() => fetchArticles(0, false)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 text-sm"
          >
            Try Again
          </button>
        </div>
      )}
      <div
        className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6"
        role="feed"
        aria-label="Article feed"
        aria-busy={loading}
        data-testid="article-list"
      >
        {displayArticles.map((article, index) => (
          <article
            key={article.id}
            ref={index === displayArticles.length - 1 ? lastArticleRef : undefined}
            aria-posinset={index + 1}
            aria-setsize={displayArticles.length}
            className="h-full"
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
    </div>
  );
}
