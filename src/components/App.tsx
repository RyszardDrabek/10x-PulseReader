import QueryProvider from "./QueryProvider";
import SupabaseProvider from "./SupabaseProvider";
import Homepage from "./Homepage";
import SettingsForm from "./SettingsForm";
import type { Session } from "@supabase/supabase-js";
import type { ArticleListResponse, ProfileDto } from "../types";

interface AppProps {
  initialSession?: Session | null;
  supabaseConfig: {
    url: string;
    key: string;
  };
  page?: "home" | "settings";
  homeInitialData?: ArticleListResponse;
  homeInitialProfile?: ProfileDto | null;
  settingsUser?: unknown;
}

export default function App({
  initialSession,
  supabaseConfig,
  page = "home",
  homeInitialData,
  homeInitialProfile = null,
  settingsUser,
}: AppProps) {
  // eslint-disable-next-line no-console
  console.log("App component: initialSession", initialSession, "supabaseConfig", supabaseConfig);
  // eslint-disable-next-line no-console
  console.log("App component: initialSession exists:", !!initialSession);

  return (
    <SupabaseProvider initialSession={initialSession} config={supabaseConfig}>
      <QueryProvider>
        {page === "home" && <Homepage initialData={homeInitialData} initialProfile={homeInitialProfile} />}
        {page === "settings" && (
          <main className="container mx-auto px-4 py-8 max-w-2xl">
            <div className="space-y-8">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold">Settings</h1>
                <p className="text-muted-foreground">
                  Customize your news feed preferences to get the most relevant content.
                </p>
              </div>

              <SettingsForm user={settingsUser} />
            </div>
          </main>
        )}
      </QueryProvider>
    </SupabaseProvider>
  );
}
