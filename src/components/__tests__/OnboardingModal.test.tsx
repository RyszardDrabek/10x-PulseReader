import { describe, it, expect, vi } from "vitest";
import { render, screen } from "../../test/test-utils";
import OnboardingModal from "../OnboardingModal";

// Mock toast notifications
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe("OnboardingModal", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onComplete: vi.fn(),
  };

  describe("Basic Rendering", () => {
    it("renders when open", () => {
      render(<OnboardingModal {...defaultProps} />);

      expect(screen.getByText("Welcome to PulseReader! 🎉")).toBeInTheDocument();
    });

    it("does not render when closed", () => {
      render(<OnboardingModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByText("Welcome to PulseReader!")).not.toBeInTheDocument();
    });
  });
});
