import { Search, Settings } from "lucide-react";
import type { ArticleFiltersApplied } from "../types";

interface NoResultsPlaceholderProps {
  filters: ArticleFiltersApplied;
  isAuthenticated: boolean;
  onAdjustFilters: () => void;
}

export default function NoResultsPlaceholder({ filters, isAuthenticated, onAdjustFilters }: NoResultsPlaceholderProps) {
  const hasFilters =
    filters.personalization || filters.sentiment || (filters.blockedItemsCount && filters.blockedItemsCount > 0);

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4" role="region" aria-label="No results found">
      <div className="mb-6" aria-hidden="true">
        <Search className="h-16 w-16 text-muted-foreground" />
      </div>

      <h2 className="text-2xl font-semibold text-foreground mb-2" id="no-results-heading">
        {hasFilters ? "No articles match your filters" : "No articles available"}
      </h2>

      <p className="text-muted-foreground text-center mb-6 max-w-md" aria-describedby="no-results-heading">
        {hasFilters
          ? "Try adjusting your filters or mood preferences to see more articles."
          : isAuthenticated
            ? "There are no articles available right now. Check back later!"
            : "Sign in to access personalized content or browse all available articles."}
      </p>

      <div className="flex flex-col gap-3 w-full max-w-sm mx-auto">
        {hasFilters && isAuthenticated && (
          <button
            onClick={onAdjustFilters}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full"
          >
            <Settings className="mr-2 h-4 w-4" />
            Adjust Filters
          </button>
        )}

        {!isAuthenticated && (
          <a
            href="/login"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full"
          >
            Sign In to Personalize
          </a>
        )}

        {hasFilters && (
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 w-full"
          >
            View All Articles
          </button>
        )}
      </div>
    </div>
  );
}
