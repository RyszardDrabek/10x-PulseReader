import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import SettingsForm from "../SettingsForm";

const mockSupabaseState = {
  user: null as any,
  loading: false,
  session: null as any,
  supabase: null as any,
};

vi.mock("../SupabaseProvider", () => ({
  useSupabase: () => mockSupabaseState,
}));

const mockProfile = {
  id: "profile-1",
  userId: "user-1",
  mood: "positive",
  blocklist: ["spam"],
  personalizationEnabled: true,
};

describe("SettingsForm", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockSupabaseState.user = null;
    mockSupabaseState.loading = false;
    mockSupabaseState.session = null;
    mockSupabaseState.supabase = null;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("loads profile and hides loading state", async () => {
    mockSupabaseState.session = { access_token: "token-123" } as any;
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockProfile,
    } as Response);

    render(<SettingsForm user={{ id: "user-1" } as any} />);

    expect(screen.getByText(/Loading your settings/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText(/Loading your settings/i)).not.toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/profile",
      expect.objectContaining({
        credentials: "include",
        headers: expect.objectContaining({ Authorization: "Bearer token-123" }),
      })
    );

    expect(screen.getAllByText(/Personalization/i).length).toBeGreaterThan(0);
  });

  it("stops loading on unauthorized response", async () => {
    mockSupabaseState.session = null;
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({}),
    } as Response);

    render(<SettingsForm user={null} />);

    await waitFor(() => {
      expect(screen.queryByText(/Loading your settings/i)).not.toBeInTheDocument();
    });
  });
});

