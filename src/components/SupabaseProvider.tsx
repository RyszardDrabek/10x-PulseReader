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

    const syncSession = async () => {
      // eslint-disable-next-line no-console
      console.log("[SupabaseProvider] syncSession start", {
        hasInitialSession: !!initialSession,
        hasSupabaseClient: !!supabase,
      });

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

        // Persist the server session into the browser so onAuthStateChange sees it
        if (initialSession.access_token && initialSession.refresh_token) {
          try {
            await supabase.auth.setSession({
              access_token: initialSession.access_token,
              refresh_token: initialSession.refresh_token,
            });
            const {
              data: { user: verifiedUser },
            } = await supabase.auth.getUser();
            setUser(verifiedUser ?? initialSession.user ?? null);
            // eslint-disable-next-line no-console
            console.log("[SupabaseProvider] Verified user after setSession", {
              verifiedUserId: verifiedUser?.id,
              hasAccessToken: !!initialSession.access_token,
            });
          } catch (error) {
            // eslint-disable-next-line no-console
            console.error("[SupabaseProvider] Failed to persist initial session:", error);
          }
        }
        return;
      }

      // No server session provided, verify client user against auth server
      const {
        data: { user: verifiedUser },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        // eslint-disable-next-line no-console
        console.error("Error getting client user:", error);
      }

      if (mounted) {
        setUser(verifiedUser ?? null);
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setSession(session);
        setLoading(false);
        // eslint-disable-next-line no-console
        console.log("[SupabaseProvider] Hydrated from client getUser/getSession", {
          verifiedUserId: verifiedUser?.id,
          hasSession: !!session,
          hasAccessToken: !!session?.access_token,
        });
      }
    };

    syncSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      // Ignore the initial empty session if we already hydrated from server
      if (event === "INITIAL_SESSION" && initialSession && !session) {
        return;
      }

      const {
        data: { user: verifiedUser },
      } = await supabase.auth.getUser();

      const nextSession = session ?? initialSession ?? null;
      const nextUser = verifiedUser ?? session?.user ?? initialSession?.user ?? null;

      setSession(nextSession);
      setUser(nextUser);
      setLoading(false);
      // eslint-disable-next-line no-console
      console.log("[SupabaseProvider] onAuthStateChange", {
        event,
        sessionUserId: nextSession?.user?.id,
        verifiedUserId: nextUser?.id,
        hasAccessToken: !!nextSession?.access_token,
      });
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, initialSession]);

  const effectiveSession = session ?? initialSession ?? null;
  const effectiveUser = user ?? initialSession?.user ?? null;

  const value: SupabaseContextType = {
    supabase,
    session: effectiveSession,
    user: effectiveUser,
    loading,
  };

  return <SupabaseContext.Provider value={value}>{children}</SupabaseContext.Provider>;
}
