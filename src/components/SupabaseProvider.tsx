import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabaseClient } from "../db/supabase.client";
import type { Session, User } from "@supabase/supabase-js";

interface SupabaseContextType {
  supabase: typeof supabaseClient;
  session: Session | null;
  user: User | null;
  loading: boolean;
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined);

export function useSupabase() {
  const context = useContext(SupabaseContext);
  if (context === undefined) {
    // During SSR or before hydration, return a safe default
    return {
      supabase: supabaseClient,
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
}

export default function SupabaseProvider({ children, initialSession = null }: SupabaseProviderProps) {
  const supabase = supabaseClient;
  const [session, setSession] = useState<Session | null>(initialSession);
  const [user, setUser] = useState<User | null>(initialSession?.user ?? null);
  const [loading, setLoading] = useState(!initialSession);

  useEffect(() => {
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
          window.location.reload();
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase.auth, initialSession]);

  const value: SupabaseContextType = {
    supabase,
    session,
    user,
    loading,
  };

  return <SupabaseContext.Provider value={value}>{children}</SupabaseContext.Provider>;
}
