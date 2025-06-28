import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { supabase } from "@/lib/supabase";

interface AuthContextType {
  isAuthenticated: boolean;
  userRole: string | null;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  isAdmin: boolean;
  isLoading: boolean;
  isHydrated: boolean;
  isCheckingSession: boolean;
  isSessionReady: boolean;
  signOut: () => Promise<void>;
  forceRefreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [session, setSession] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(false);
  const [isSessionReady, setIsSessionReady] = useState(false);

  const getInitialSession = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) {
        setSession(null);
        setUser(null);
        setRole(null);
      } else {
        setSession(data.session);
        setUser(data.session.user);
        // Ambil role dari metadata atau tabel user
        setRole(data.session.user?.user_metadata?.role || null);
      }
    } catch (err) {
      console.error("Error fetching session:", err);
    } finally {
      setIsSessionReady(true);
      setIsLoading(false);
      setIsHydrated(true);
    }
  }, []);

  const forceRefreshSession = useCallback(async () => {
    setIsCheckingSession(true);
    try {
      await supabase.auth.refreshSession();
      await getInitialSession();
    } catch (error) {
      console.error("Failed to refresh session", error);
    } finally {
      setIsCheckingSession(false);
    }
  }, [getInitialSession]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setRole(null);
    setIsHydrated(false);
    setIsSessionReady(false);
    window.location.href = "/login";
  };

  useEffect(() => {
    getInitialSession();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          setSession(session);
          setUser(session?.user ?? null);
          setRole(session?.user?.user_metadata?.role ?? null);
          setIsSessionReady(true);
        }
        if (event === "SIGNED_OUT") {
          setSession(null);
          setUser(null);
          setRole(null);
          setIsSessionReady(false);
        }
      },
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [getInitialSession]);

  // Refresh session saat kembali dari tab/background
  useEffect(() => {
    const handleVisibility = async () => {
      if (document.visibilityState === "visible") {
        await forceRefreshSession();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [forceRefreshSession]);

  const value: AuthContextType = {
    isAuthenticated: !!session,
    userRole: role,
    userId: user?.id ?? null,
    userEmail: user?.email ?? null,
    userName: user?.user_metadata?.name ?? null,
    isAdmin: role === "admin",
    isLoading,
    isHydrated,
    isCheckingSession,
    isSessionReady,
    signOut,
    forceRefreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
