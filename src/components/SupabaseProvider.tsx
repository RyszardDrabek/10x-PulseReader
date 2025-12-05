import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseClientPublic } from "../db/supabase.client";
import type { Session, User } from "@supabase/supabase-js";
import type { Database } from "../db/database.types";

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
  // Use a single client instance, memoized to prevent multiple instances
  // Initialize as null and create in useEffect to avoid SSR issues
  const [supabase, setSupabase] = useState<SupabaseClient<Database> | null>(null);
  const [session, setSession] = useState<Session | null>(initialSession);
  const [user, setUser] = useState<User | null>(initialSession?.user ?? null);
  const [loading, setLoading] = useState(!initialSession); // Start loaded if we have initial session

  // Initialize Supabase client on client side only
  useEffect(() => {
    if (typeof window !== "undefined" && !supabase) {
      const initClient = async () => {
        try {
          let client: SupabaseClient<Database>;

          if (config) {
            // Dynamic import to avoid loading on server
            const { createClient } = await import("@supabase/supabase-js");
            client = createClient<Database>(config.url, config.key, {
              auth: {
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: true,
              },
            });
          } else {
            client = await getSupabaseClientPublic();
          }

          setSupabase(client);
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error("[SupabaseProvider] Error creating Supabase client:", error);
        }
      };

      initClient();
    }
  }, [config, supabase]);

  useEffect(() => {
    // Skip if supabase client is not available (SSR)
    if (!supabase) {
      return;
    }

    let mounted = true;

    if (initialSession) {
      // We have a server session - trust it and set it immediately
      // This ensures the UI shows the authenticated state immediately
      // eslint-disable-next-line no-console
      console.log("[SupabaseProvider] Setting initial server session:", {
        hasSession: !!initialSession,
        userId: initialSession?.user?.id,
        userEmail: initialSession?.user?.email,
        expiresAt: initialSession?.expires_at,
      });
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      setLoading(false);
    } else {
      // No server session provided, try to get it from client
      const getClientSession = async () => {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          // eslint-disable-next-line no-console
          console.error("Error getting client session:", error);
        }
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        }
      };

      getClientSession();
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
