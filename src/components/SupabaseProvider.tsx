import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseClientPublic } from "../db/supabase.client";
import type { Session, User } from "@supabase/supabase-js";
import type { Database } from "../db/database.types";

/* eslint-disable no-console */
console.log("[SupabaseProvider.tsx] Module loaded");
console.log("[SupabaseProvider.tsx] typeof window:", typeof window);
console.log("[SupabaseProvider.tsx] typeof global:", typeof global);

try {
  console.log("[SupabaseProvider.tsx] About to import @supabase/supabase-js");
  console.log("[SupabaseProvider.tsx] createClient:", typeof createClient);
  console.log("[SupabaseProvider.tsx] About to import getSupabaseClientPublic");
  console.log("[SupabaseProvider.tsx] getSupabaseClientPublic:", typeof getSupabaseClientPublic);
} catch (error) {
  console.error("[SupabaseProvider.tsx] Error importing dependencies:", error);
  throw error;
}

interface SupabaseContextType {
  supabase: SupabaseClient<Database> | null;
  session: Session | null;
  user: User | null;
  loading: boolean;
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined);

export function useSupabase() {
  const context = useContext(SupabaseContext);
  if (context === undefined) {
    // During SSR or before hydration, return a safe default
    // We can't access the client during SSR, so return null
    return {
      supabase: null as SupabaseClient<Database> | null,
      session: null,
      user: null,
      loading: true,
    };
  }
  return context;
}

interface SupabaseProviderProps {
  children: ReactNode;
  initialSession?: Session | null;
  config?: {
    url: string;
    key: string;
  };
}

export default function SupabaseProvider({ children, initialSession = null, config }: SupabaseProviderProps) {
  console.log("[SupabaseProvider.tsx] SupabaseProvider component rendering");
  console.log("[SupabaseProvider.tsx] typeof window:", typeof window);
  
  // Use a single client instance, memoized to prevent multiple instances
  // Initialize as null and create in useEffect to avoid SSR issues
  const [supabase, setSupabase] = useState<SupabaseClient<Database> | null>(null);
  const [session, setSession] = useState<Session | null>(initialSession);
  const [user, setUser] = useState<User | null>(initialSession?.user ?? null);
  const [loading, setLoading] = useState(!initialSession);

  // Initialize Supabase client on client side only
  useEffect(() => {
    console.log("[SupabaseProvider.tsx] useEffect running");
    console.log("[SupabaseProvider.tsx] typeof window:", typeof window);
    console.log("[SupabaseProvider.tsx] supabase:", supabase);
    
    if (typeof window !== "undefined" && !supabase) {
      console.log("[SupabaseProvider.tsx] Creating Supabase client");
      try {
        const client = config ? createClient<Database>(config.url, config.key) : getSupabaseClientPublic();
        console.log("[SupabaseProvider.tsx] Supabase client created successfully");
        setSupabase(client);
      } catch (error) {
        console.error("[SupabaseProvider.tsx] Error creating Supabase client:", error);
        throw error;
      }
    } else {
      console.log("[SupabaseProvider.tsx] Skipping Supabase client creation (SSR or already exists)");
    }
  }, [config, supabase]);

  useEffect(() => {
    // Skip if supabase client is not available (SSR)
    if (!supabase) {
      return;
    }

    let mounted = true;

    // Get initial session
    const getInitialSession = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      if (error) {
        console.error("Error getting session:", error);
      }
      if (mounted) {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    };

    if (!initialSession) {
      getInitialSession();
    }

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (mounted) {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Reload page on auth state changes to sync server/client state
        if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
          if (typeof window !== "undefined") {
            window.location.reload();
          }
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, initialSession]);

  const value: SupabaseContextType = {
    supabase,
    session,
    user,
    loading,
  };

  return <SupabaseContext.Provider value={value}>{children}</SupabaseContext.Provider>;
}
/* eslint-enable no-console */
