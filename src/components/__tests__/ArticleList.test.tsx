import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "../../test/test-utils";
import ArticleList from "../ArticleList";
import type {
  ArticleListResponse,
  GetArticlesQueryParams,
  ProfileDto,
  ArticleDto,
  ArticleFiltersApplied,
} from "../../types";

// Mock Supabase provider
vi.mock("../SupabaseProvider", () => ({
  useSupabase: () => ({
    supabase: {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: null },
          error: null,
        }),
      },
    },
    user: null,
  }),
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="supabase-provider">{children}</div>,
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock child components
vi.mock("../ArticleCard", () => ({
  default: ({ article }: { article: ArticleDto }) => <div data-testid="article-card">{article.title}</div>,
}));

vi.mock("../LoadingSkeleton", () => ({
  default: ({ count }: { count: number }) => <div data-testid="loading-skeleton">Loading {count} items</div>,
}));

vi.mock("../NoResultsPlaceholder", () => ({
  default: ({ filters, isAuthenticated }: { filters: ArticleFiltersApplied; isAuthenticated: boolean }) => (
    <div data-testid="no-results-placeholder">
      No results - personalized: {filters?.personalization ? "true" : "false"}, authenticated:{" "}
      {isAuthenticated ? "true" : "false"}
    </div>
  ),
}));

describe("ArticleList", () => {
  const mockArticles: ArticleListResponse = {
    data: [
      {
        id: "1",
        title: "Test Article 1",
        description: "Description 1",
        link: "https://example.com/1",
        publicationDate: "2024-01-01T00:00:00Z",
        sentiment: "positive",
        source: {
          id: "source-1",
          name: "Test Source",
          url: "https://example.com",
        },
        topics: [],
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      },
      {
        id: "2",
        title: "Test Article 2",
        description: "Description 2",
        link: "https://example.com/2",
        publicationDate: "2024-01-02T00:00:00Z",
        sentiment: "neutral",
        source: {
          id: "source-1",
          name: "Test Source",
          url: "https://example.com",
        },
        topics: [],
        createdAt: "2024-01-02T00:00:00Z",
        updatedAt: "2024-01-02T00:00:00Z",
      },
    ],
    pagination: {
      limit: 20,
      offset: 0,
      total: 2,
      hasMore: false,
    },
    filtersApplied: {
      sentiment: undefined,
      personalization: false,
    },
  };

  const mockProfile: ProfileDto = {
    id: "test-profile-id",
    userId: "test-user-id",
    mood: "positive",
    blocklist: [],
    personalizationEnabled: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  };

  const defaultProps = {
    queryParams: {
      limit: 20,
      offset: 0,
      sortBy: "publication_date",
      sortOrder: "desc",
    } as GetArticlesQueryParams,
    initialData: mockArticles,
    isPersonalized: false,
    profile: null,
    onStatsUpdate: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  describe("Initial Rendering", () => {
    it("renders articles from initial data", () => {
      render(<ArticleList {...defaultProps} />);

      expect(screen.getByTestId("article-list")).toBeInTheDocument();
      expect(screen.getAllByTestId("article-card")).toHaveLength(2);
      expect(screen.getByText("Test Article 1")).toBeInTheDocument();
      expect(screen.getByText("Test Article 2")).toBeInTheDocument();
    });

    it("shows loading state initially when no initial data", () => {
      render(<ArticleList {...defaultProps} initialData={undefined} />);

      // Should show loading skeleton initially
      expect(screen.getByTestId("loading-skeleton")).toBeInTheDocument();
    });
  });

  describe("Profile Changes", () => {
    it("refetches articles when profile mood changes and personalization is enabled", async () => {
      // Mock successful fetch response
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockArticles),
      });

      const { rerender } = render(<ArticleList {...defaultProps} />);

      // Initially should not have made any fetch calls (using initial data)
      expect(mockFetch).not.toHaveBeenCalled();

      // Update props to enable personalization and set profile
      rerender(<ArticleList {...defaultProps} isPersonalized={true} profile={mockProfile} />);

      // Should make a fetch call when personalization is enabled
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      // Reset mock call count and change mood
      mockFetch.mockClear();

      const updatedProfile = { ...mockProfile, mood: "negative" };

      rerender(<ArticleList {...defaultProps} isPersonalized={true} profile={updatedProfile} />);

      // Should refetch when mood changes - this is the key behavior we're testing
      await waitFor(
        () => {
          expect(mockFetch).toHaveBeenCalled();
        },
        { timeout: 2000 }
      );
    });

    it("does not refetch when mood changes but personalization is disabled", async () => {
      const { rerender } = render(<ArticleList {...defaultProps} />);

      // Update props to set profile but keep personalization disabled
      rerender(<ArticleList {...defaultProps} isPersonalized={false} profile={mockProfile} />);

      // Should not make fetch calls when personalization is disabled
      expect(mockFetch).not.toHaveBeenCalled();

      // Change mood but keep personalization disabled
      const updatedProfile = { ...mockProfile, mood: "negative" };
      rerender(<ArticleList {...defaultProps} isPersonalized={false} profile={updatedProfile} />);

      // Still should not fetch
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("Personalization Changes", () => {
    it("refetches articles when personalization is toggled", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockArticles),
      });

      const { rerender } = render(<ArticleList {...defaultProps} />);

      // Initially should not fetch (using initial data)
      expect(mockFetch).not.toHaveBeenCalled();

      // Enable personalization
      rerender(<ArticleList {...defaultProps} isPersonalized={true} />);

      // Should fetch when personalization is enabled
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });
    });
  });
});
