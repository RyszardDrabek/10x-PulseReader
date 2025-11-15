import { useInfiniteQuery } from "@tanstack/react-query";
import { useSupabase } from "../../components/SupabaseProvider";
import type { GetArticlesQueryParams, ArticleListResponse } from "../../types";

export function useArticles(queryParams: GetArticlesQueryParams, userId?: string) {
  const { supabase } = useSupabase();

  return useInfiniteQuery({
    queryKey: ["articles", queryParams, userId],
    queryFn: async ({ pageParam = 0 }) => {
      const params = new URLSearchParams();

      // Add queryParams to URLSearchParams, filtering out undefined values
      Object.entries({ ...queryParams, offset: pageParam }).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      // Add authorization header if user is authenticated
      if (userId) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.access_token) {
          headers.Authorization = `Bearer ${session.access_token}`;
        }
      }

      const response = await fetch(`/api/articles?${params}`, {
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch articles: ${response.status}`);
      }

      const data: ArticleListResponse = await response.json();
      return data;
    },
    getNextPageParam: (lastPage) => {
      return lastPage.pagination.hasMore ? lastPage.pagination.offset + lastPage.pagination.limit : undefined;
    },
    initialPageParam: 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
