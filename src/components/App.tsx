import { type ReactNode } from "react";
import QueryProvider from "./QueryProvider";
import SupabaseProvider from "./SupabaseProvider";
import type { Session } from "@supabase/supabase-js";

/* eslint-disable no-console */
console.log("[App.tsx] Module loaded");
console.log("[App.tsx] typeof window:", typeof window);
console.log("[App.tsx] typeof global:", typeof global);

try {
  console.log("[App.tsx] About to import QueryProvider");
  console.log("[App.tsx] QueryProvider:", typeof QueryProvider);
  console.log("[App.tsx] About to import SupabaseProvider");
  console.log("[App.tsx] SupabaseProvider:", typeof SupabaseProvider);
} catch (error) {
  console.error("[App.tsx] Error importing providers:", error);
  throw error;
}

interface AppProps {
  children: ReactNode;
  initialSession?: Session | null;
  supabaseConfig: {
    url: string;
    key: string;
  };
}

export default function App({ children, initialSession, supabaseConfig }: AppProps) {
  console.log("[App.tsx] App component rendering");
  console.log("[App.tsx] typeof window:", typeof window);

  try {
    return (
      <SupabaseProvider initialSession={initialSession} config={supabaseConfig}>
        <QueryProvider>{children}</QueryProvider>
      </SupabaseProvider>
    );
  } catch (error) {
    console.error("[App.tsx] Error rendering:", error);
    throw error;
  }
}
/* eslint-enable no-console */
