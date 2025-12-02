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
    console.log("useSupabase: context undefined, returning defaults");
    return {
      supabase: null as SupabaseClient<Database> | null,
      session: null,
      user: null,
      loading: true,
    };
  }
  console.log("useSupabase: returning context:", {
    hasUser: !!context.user,
    loading: context.loading,
    hasSession: !!context.session,
  });
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
  console.log("🔥 SupabaseProvider RENDERED with initialSession:", !!initialSession);
  // Use a single client instance, memoized to prevent multiple instances
  // Initialize as null and create in useEffect to avoid SSR issues
  const [supabase, setSupabase] = useState<SupabaseClient<Database> | null>(null);
  const [session, setSession] = useState<Session | null>(initialSession);
  const [user, setUser] = useState<User | null>(initialSession?.user ?? null);
  const [loading, setLoading] = useState(!initialSession); // Start loaded if we have initial session
  const hasServerSession = !!initialSession;

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

    // Get initial session
    const getInitialSession = async () => {
      console.log("[SupabaseProvider] Getting initial session from client...");
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      console.log("[SupabaseProvider] Client session result:", {
        hasSession: !!session,
        sessionUserId: session?.user?.id,
        sessionUserEmail: session?.user?.email,
        error: error?.message,
      });

      if (error) {
        // eslint-disable-next-line no-console
        console.error("Error getting client session:", error);
      }
      if (mounted) {
        // Only update if the session is different from what we already have
        // This prevents unnecessary state updates when session is already null
        if (session !== null || user !== null) {
          setSession(session);
          setUser(session?.user ?? null);
          console.log("[SupabaseProvider] Updated session from client:", !!session?.user);
        } else {
          console.log("[SupabaseProvider] Session already null, no update needed");
        }
        setLoading(false);
      }
    };

    if (!initialSession) {
      console.log("[SupabaseProvider] No initialSession provided, getting session from client");
      getInitialSession();
    } else {
      console.log("[SupabaseProvider] initialSession provided:", {
        hasSession: !!initialSession,
        sessionUserId: initialSession?.user?.id,
        sessionUserEmail: initialSession?.user?.email,
      });

      // For initialSession, we trust the server-provided session
      // Don't make async calls that might fail - just use the provided session
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      setLoading(false);

      console.log("[SupabaseProvider] Using server-provided session directly");
    }

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[SupabaseProvider] Auth state change event:", event, {
        hasSession: !!session,
        sessionUserId: session?.user?.id,
        hasServerSession,
      });

      if (mounted) {
        // Don't override server session with client events
        if (!hasServerSession) {
          setSession(session);
          setUser(session?.user ?? null);
        } else {
          console.log("[SupabaseProvider] Ignoring client auth event - using server session");
        }
        setLoading(false);

        // Reload page on auth state changes to sync server/client state
        // But skip reload if we already have a server session (properly synchronized)
        if ((event === "SIGNED_IN" || event === "SIGNED_OUT") && !hasServerSession) {
          console.log("[SupabaseProvider] Auth state changed, reloading page:", event);
          if (typeof window !== "undefined") {
            window.location.reload();
          }
        } else if (hasServerSession) {
          console.log("[SupabaseProvider] Skipping reload - session already synchronized from server");
        } else {
          console.log("[SupabaseProvider] Skipping reload - not a SIGNED_IN/SIGNED_OUT event or has server session");
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

  console.log("SupabaseProvider rendering with value:", value);
  return <SupabaseContext.Provider value={value}>{children}</SupabaseContext.Provider>;
}
