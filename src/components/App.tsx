import { type ReactNode } from "react";
import QueryProvider from "./QueryProvider";
import SupabaseProvider from "./SupabaseProvider";
import type { Session } from "@supabase/supabase-js";

interface AppProps {
  children: ReactNode;
  initialSession?: Session | null;
  supabaseConfig: {
    url: string;
    key: string;
  };
}

export default function App({ children, initialSession, supabaseConfig }: AppProps) {
  console.log("App component: initialSession", initialSession, "supabaseConfig", supabaseConfig);
  return (
    <SupabaseProvider initialSession={initialSession} config={supabaseConfig}>
      <QueryProvider>{children}</QueryProvider>
    </SupabaseProvider>
  );
}
