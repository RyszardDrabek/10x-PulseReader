import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";

interface QueryProviderProps {
  children: React.ReactNode;
}

export default function QueryProvider({ children }: QueryProviderProps) {
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
    // Only load ReactQueryDevtools in browser and development
    if (typeof window !== "undefined" && import.meta.env.DEV) {
      import("@tanstack/react-query-devtools")
        .then((module) => {
          setDevtools(<module.ReactQueryDevtools initialIsOpen={false} />);
        })
        .catch((error) => {
          // eslint-disable-next-line no-console
          console.error("[QueryProvider] Error loading ReactQueryDevtools:", error);
        });
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {devtools}
    </QueryClientProvider>
  );
}
