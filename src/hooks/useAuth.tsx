import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  orgId: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  orgId: null,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);

  useEffect(() => {
    // Listen for auth state changes first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      setLoading(false);
    });

    // Then get existing session or sign in anonymously
    supabase.auth.getSession().then(async ({ data: { session: existingSession } }) => {
      if (existingSession) {
        setSession(existingSession);
        setUser(existingSession.user);
        setLoading(false);
      } else {
        // Auto sign-in anonymously — no login page needed
        const { data, error } = await supabase.auth.signInAnonymously();
        if (error) {
          console.error("Anonymous sign-in failed:", error);
          setLoading(false);
        } else {
          setSession(data.session);
          setUser(data.user);
          setLoading(false);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) { setOrgId(null); return; }
    // Fetch org_id from profile, retry a few times if trigger hasn't run yet
    let attempts = 0;
    const fetch = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("org_id")
        .eq("id", user.id)
        .maybeSingle();
      if (data?.org_id) {
        setOrgId(data.org_id);
      } else if (attempts < 5) {
        attempts++;
        setTimeout(fetch, 800);
      }
    };
    fetch();
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, session, loading, orgId }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
