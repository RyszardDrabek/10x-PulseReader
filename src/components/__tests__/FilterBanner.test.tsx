import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "../../test/test-utils";
import FilterBanner from "../FilterBanner";
import type { ArticleFiltersApplied, ProfileDto } from "../../types";

// Mock toast notifications
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock Supabase user context
vi.mock("../SupabaseProvider", () => ({
  useSupabase: () => ({
    user: { id: "test-user-id", email: "test@example.com" },
  }),
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe("FilterBanner", () => {
  const mockProfile: ProfileDto = {
    id: "test-profile-id",
    userId: "test-user-id",
    mood: "positive",
    blocklist: ["advertisement", "sponsored"],
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  };

  const defaultProps = {
    currentFilters: {
      personalization: true,
      blockedItemsCount: 2,
    } as ArticleFiltersApplied,
    profile: mockProfile,
    onProfileUpdate: vi.fn(),
    totalArticles: 20,
    filteredArticles: 5,
    isAuthenticated: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  describe("Basic Rendering", () => {
    it("renders when personalization is enabled", () => {
      render(<FilterBanner {...defaultProps} />);

      // Should show mood toggles and total by mood
      expect(screen.getByText("Total articles by mood: 25")).toBeInTheDocument();
    });

    it("renders mood selection buttons for authenticated users", () => {
      render(<FilterBanner {...defaultProps} />);

      // Should show mood selection buttons
      const positiveButton = screen.getByTestId("mood-toggle-positive");
      const neutralButton = screen.getByTestId("mood-toggle-neutral");
      const negativeButton = screen.getByTestId("mood-toggle-negative");

      expect(positiveButton).toBeInTheDocument();
      expect(neutralButton).toBeInTheDocument();
      expect(negativeButton).toBeInTheDocument();
    });
  });
});
