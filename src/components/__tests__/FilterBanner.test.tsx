import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "../../test/test-utils";
import userEvent from "@testing-library/user-event";
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
    onTogglePersonalization: vi.fn(),
    profile: mockProfile,
    onProfileUpdate: vi.fn(),
    totalArticles: 20,
    filteredArticles: 5,
  };

  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  describe("Basic Rendering", () => {
    it("renders when personalization is enabled", () => {
      render(<FilterBanner {...defaultProps} />);

      // Should show mood toggles and blocked items
      expect(screen.getByText("Showing 20 of 25 articles")).toBeInTheDocument();
    });

    it("renders personalization toggle", () => {
      render(<FilterBanner {...defaultProps} />);

      const toggle = screen.getByRole("switch", { name: /personalization/i });
      expect(toggle).toBeInTheDocument();
    });
  });
});
