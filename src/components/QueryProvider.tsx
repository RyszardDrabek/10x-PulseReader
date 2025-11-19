import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";

/* eslint-disable no-console */
console.log("[QueryProvider.tsx] Module loaded");
console.log("[QueryProvider.tsx] typeof window:", typeof window);
console.log("[QueryProvider.tsx] typeof global:", typeof global);

try {
  console.log("[QueryProvider.tsx] About to import @tanstack/react-query");
  console.log("[QueryProvider.tsx] QueryClient:", typeof QueryClient);
  console.log("[QueryProvider.tsx] QueryClientProvider:", typeof QueryClientProvider);
} catch (error) {
  console.error("[QueryProvider.tsx] Error importing react-query:", error);
  throw error;
}

interface QueryProviderProps {
  children: React.ReactNode;
}

export default function QueryProvider({ children }: QueryProviderProps) {
  console.log("[QueryProvider.tsx] QueryProvider component rendering");
  console.log("[QueryProvider.tsx] typeof window:", typeof window);
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // With SSR, we usually want to set some default staleTime
            // above 0 to avoid refetching immediately on the client
            staleTime: 60 * 1000, // 1 minute
            gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
            retry: (failureCount, error) => {
              // Don't retry on 4xx errors
              if (error instanceof Error && error.message.includes("4")) {
                return false;
              }
              return failureCount < 3;
            },
          },
        },
      })
  );

  const [devtools, setDevtools] = useState<React.ReactNode>(null);

  useEffect(() => {
    console.log("[QueryProvider.tsx] useEffect running");
    console.log("[QueryProvider.tsx] typeof window:", typeof window);
    console.log("[QueryProvider.tsx] import.meta.env.DEV:", import.meta.env.DEV);
    
    // Only load ReactQueryDevtools in browser and development
    if (typeof window !== "undefined" && import.meta.env.DEV) {
      console.log("[QueryProvider.tsx] Loading ReactQueryDevtools");
      import("@tanstack/react-query-devtools")
        .then((module) => {
          console.log("[QueryProvider.tsx] ReactQueryDevtools loaded successfully");
          setDevtools(<module.ReactQueryDevtools initialIsOpen={false} />);
        })
        .catch((error) => {
          console.error("[QueryProvider.tsx] Error loading ReactQueryDevtools:", error);
        });
    } else {
      console.log("[QueryProvider.tsx] Skipping ReactQueryDevtools (not browser or not dev)");
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {devtools}
    </QueryClientProvider>
  );
}
/* eslint-enable no-console */
