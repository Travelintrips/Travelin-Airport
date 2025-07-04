import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { supabase } from "@/lib/supabase";

interface AuthContextType {
  isAuthenticated: boolean;
  userRole: string | null;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  userPhone: string | null;
  isAdmin: boolean;
  isLoading: boolean;
  isHydrated: boolean;
  isCheckingSession: boolean;
  isSessionReady: boolean;
  signOut: () => Promise<void>;
  forceRefreshSession: () => Promise<void>;
  ensureSessionReady: () => Promise<void>;
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
  const initializationRef = useRef(false);
  const sessionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const initializeSession = useCallback(async () => {
    if (initializationRef.current) {
      console.log("[AuthContext] Session initialization already in progress");
      return;
    }

    initializationRef.current = true;
    setIsLoading(true);
    setIsSessionReady(false);

    try {
      console.log("[AuthContext] Starting session initialization...");

      // Clear any existing timeout
      if (sessionTimeoutRef.current) {
        clearTimeout(sessionTimeoutRef.current);
      }

      // Get current session from Supabase with timeout
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Session check timeout")), 5000);
      });

      const { data, error } = (await Promise.race([
        sessionPromise,
        timeoutPromise,
      ])) as any;

      if (error || !data.session) {
        console.log("[AuthContext] No valid Supabase session found");

        // Try localStorage fallback only if truly offline
        const storedUser = localStorage.getItem("auth_user");
        const storedUserId = localStorage.getItem("userId");
        const storedUserEmail = localStorage.getItem("userEmail");
        const storedUserRole = localStorage.getItem("userRole");

        if (
          storedUser &&
          storedUserId &&
          storedUserEmail &&
          navigator.onLine === false
        ) {
          console.log(
            "[AuthContext] Using localStorage fallback (offline mode)",
          );
          try {
            const userData = JSON.parse(storedUser);
            const storedUserPhone = localStorage.getItem("userPhone");

            setUser({
              id: storedUserId,
              email: storedUserEmail,
              user_metadata: {
                name:
                  userData.name || localStorage.getItem("userName") || "User",
                role: storedUserRole || "Customer",
                phone: storedUserPhone || userData.phone || "",
              },
            });
            setRole(storedUserRole || "Customer");

            // Create a mock session for offline mode
            setSession({
              user: {
                id: storedUserId,
                email: storedUserEmail,
                user_metadata: {
                  name: userData.name,
                  role: storedUserRole,
                  phone: storedUserPhone || userData.phone,
                },
              },
              access_token: "offline_mode",
            });
          } catch (parseError) {
            console.warn(
              "[AuthContext] Error parsing stored user data:",
              parseError,
            );
            setSession(null);
            setUser(null);
            setRole(null);
          }
        } else {
          // Clear everything if no valid session
          setSession(null);
          setUser(null);
          setRole(null);

          // Clear localStorage if session is invalid
          localStorage.removeItem("auth_user");
          localStorage.removeItem("userId");
          localStorage.removeItem("userEmail");
          localStorage.removeItem("userName");
          localStorage.removeItem("userPhone");
          localStorage.removeItem("userRole");
        }
      } else {
        console.log(
          "[AuthContext] Valid Supabase session found, updating state",
        );
        setSession(data.session);
        setUser(data.session.user);
        setRole(data.session.user?.user_metadata?.role || "Customer");

        // Update localStorage with fresh session data
        const userData = {
          id: data.session.user.id,
          email: data.session.user.email,
          name:
            data.session.user.user_metadata?.name ||
            data.session.user.email?.split("@")[0] ||
            "User",
          phone: data.session.user.user_metadata?.phone || "",
        };

        // Try to get additional user data from database with timeout
        try {
          const userDataPromise = supabase
            .from("users")
            .select("full_name, phone")
            .eq("id", data.session.user.id)
            .single();

          const dbTimeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error("Database fetch timeout")), 3000);
          });

          const { data: dbUserData } = (await Promise.race([
            userDataPromise,
            dbTimeoutPromise,
          ])) as any;

          if (dbUserData) {
            if (dbUserData.full_name) userData.name = dbUserData.full_name;
            if (dbUserData.phone) userData.phone = dbUserData.phone;
          }
        } catch (dbError) {
          console.warn(
            "[AuthContext] Error fetching user data from database:",
            dbError,
          );
        }

        // Update localStorage
        localStorage.setItem("auth_user", JSON.stringify(userData));
        localStorage.setItem("userId", data.session.user.id);
        localStorage.setItem("userEmail", data.session.user.email || "");
        localStorage.setItem("userName", userData.name);
        localStorage.setItem("userPhone", userData.phone);
        localStorage.setItem(
          "userRole",
          data.session.user?.user_metadata?.role || "Customer",
        );

        // Check if user is admin
        const isAdminEmail =
          data.session.user.email?.includes("admin") ||
          data.session.user.email === "divatranssoetta@gmail.com";
        const userRole = data.session.user?.user_metadata?.role || "Customer";
        localStorage.setItem(
          "isAdmin",
          isAdminEmail || userRole === "Admin" ? "true" : "false",
        );

        // Dispatch session restored event
        window.dispatchEvent(
          new CustomEvent("sessionRestored", {
            detail: {
              id: data.session.user.id,
              email: data.session.user.email,
              name: userData.name,
              role: userRole,
              phone: userData.phone,
            },
          }),
        );
      }
    } catch (err) {
      console.error("[AuthContext] Error during session initialization:", err);

      // Only use localStorage as absolute fallback when offline
      if (navigator.onLine === false) {
        const storedUser = localStorage.getItem("auth_user");
        if (storedUser) {
          try {
            const userData = JSON.parse(storedUser);
            console.log(
              "[AuthContext] Using localStorage fallback (error + offline)",
            );

            setUser({
              id: userData.id,
              email: userData.email,
              user_metadata: {
                name: userData.name,
                role: userData.role || "Customer",
                phone: userData.phone || "",
              },
            });
            setRole(userData.role || "Customer");
            setSession({
              user: userData,
              access_token: "offline_mode",
            });
          } catch (parseError) {
            console.warn(
              "[AuthContext] Error parsing stored user in error fallback:",
              parseError,
            );
            setSession(null);
            setUser(null);
            setRole(null);
          }
        }
      } else {
        // Clear everything if online but failed
        setSession(null);
        setUser(null);
        setRole(null);
      }
    } finally {
      setIsLoading(false);
      setIsHydrated(true);
      setIsSessionReady(true);
      initializationRef.current = false;
      console.log("[AuthContext] Session initialization completed");
    }
  }, []);

  const forceRefreshSession = useCallback(async () => {
    setIsCheckingSession(true);
    try {
      console.log("[AuthContext] Starting force refresh session...");

      // Create timeout promise with reduced duration
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Session check timeout")), 5000);
      });

      // First try to get current session without refresh
      const sessionPromise = supabase.auth.getSession();
      const { data: currentData, error: currentError } = (await Promise.race([
        sessionPromise,
        timeoutPromise,
      ])) as any;

      if (!currentError && currentData.session?.user) {
        console.log("[AuthContext] Valid session found without refresh");
        setSession(currentData.session);
        setUser(currentData.session.user);
        setRole(currentData.session.user?.user_metadata?.role || null);
        setIsSessionReady(true);

        // Update localStorage with fresh session data
        const userData = {
          id: currentData.session.user.id,
          email: currentData.session.user.email,
          name:
            currentData.session.user.user_metadata?.name ||
            currentData.session.user.email?.split("@")[0] ||
            "User",
          phone: currentData.session.user.user_metadata?.phone || "",
        };
        localStorage.setItem("auth_user", JSON.stringify(userData));
        localStorage.setItem("userId", currentData.session.user.id);
        localStorage.setItem("userEmail", currentData.session.user.email || "");
        localStorage.setItem("userName", userData.name);
        localStorage.setItem("userPhone", userData.phone);
        localStorage.setItem(
          "userRole",
          currentData.session.user?.user_metadata?.role || "Customer",
        );

        // Re-dispatch session restored event after validation
        window.dispatchEvent(
          new CustomEvent("sessionRestored", {
            detail: {
              id: currentData.session.user.id,
              email: currentData.session.user.email,
              name: userData.name,
              role: currentData.session.user?.user_metadata?.role || "Customer",
            },
          }),
        );
        return;
      }

      // If no valid session, try refresh with timeout
      console.log("[AuthContext] No current session, attempting refresh...");
      const refreshPromise = supabase.auth.refreshSession();
      const refreshTimeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Refresh timeout")), 8000);
      });
      const { data, error } = (await Promise.race([
        refreshPromise,
        refreshTimeoutPromise,
      ])) as any;

      if (error) {
        console.warn("[AuthContext] Session refresh failed:", error);
        // Try to restore from localStorage as fallback
        const storedUser = localStorage.getItem("auth_user");
        if (storedUser) {
          try {
            const userData = JSON.parse(storedUser);
            console.log(
              "[AuthContext] Attempting to restore from localStorage:",
              userData.email,
            );
            // Don't clear session state, keep existing data
            setIsSessionReady(true);
            return;
          } catch (parseError) {
            console.warn(
              "[AuthContext] Error parsing stored user:",
              parseError,
            );
          }
        }

        // Clear invalid session state only if no localStorage fallback
        setSession(null);
        setUser(null);
        setRole(null);
        setIsSessionReady(true);
      } else if (data.session) {
        console.log("[AuthContext] Session refreshed successfully");
        setSession(data.session);
        setUser(data.session.user);
        setRole(data.session.user?.user_metadata?.role || null);
        setIsSessionReady(true);

        // Update localStorage with refreshed session data
        const userData = {
          id: data.session.user.id,
          email: data.session.user.email,
          name:
            data.session.user.user_metadata?.name ||
            data.session.user.email?.split("@")[0] ||
            "User",
          phone: data.session.user.user_metadata?.phone || "",
        };
        localStorage.setItem("auth_user", JSON.stringify(userData));
        localStorage.setItem("userId", data.session.user.id);
        localStorage.setItem("userEmail", data.session.user.email || "");
        localStorage.setItem("userName", userData.name);
        localStorage.setItem("userPhone", userData.phone);
        localStorage.setItem(
          "userRole",
          data.session.user?.user_metadata?.role || "Customer",
        );

        // Re-dispatch session restored event after refresh
        window.dispatchEvent(
          new CustomEvent("sessionRestored", {
            detail: {
              id: data.session.user.id,
              email: data.session.user.email,
              name: userData.name,
              role: data.session.user?.user_metadata?.role || "Customer",
            },
          }),
        );
      } else {
        // No session available
        console.log("[AuthContext] No session available after refresh");
        setSession(null);
        setUser(null);
        setRole(null);
        setIsSessionReady(true);
      }
    } catch (error) {
      console.error("[AuthContext] Failed to refresh session", error);
      // Try localStorage fallback before clearing everything
      const storedUser = localStorage.getItem("auth_user");
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          console.log(
            "[AuthContext] Using localStorage fallback after error:",
            userData.email,
          );
          setIsSessionReady(true);
          return;
        } catch (parseError) {
          console.warn(
            "[AuthContext] Error parsing stored user in fallback:",
            parseError,
          );
        }
      }

      // Always set session ready to prevent stuck state
      setSession(null);
      setUser(null);
      setRole(null);
      setIsSessionReady(true);
    } finally {
      // CRITICAL: Always reset checking state
      setIsCheckingSession(false);
    }
  }, []);

  const ensureSessionReady = useCallback(async () => {
    if (!isSessionReady || isLoading) {
      console.log("[AuthContext] Ensuring session is ready...");
      await initializeSession();
    }
  }, [isSessionReady, isLoading, initializeSession]);

  const signOut = async () => {
    sessionStorage.setItem("loggedOut", "true");

    setSession(null);
    setUser(null);
    setRole(null);
    setIsHydrated(true);
    setIsSessionReady(true);

    localStorage.removeItem("auth_user");
    localStorage.removeItem("userId");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userName");
    localStorage.removeItem("userPhone");
    localStorage.removeItem("isAdmin");

    await supabase.auth.signOut();
    window.location.href = "/";
  };

  useEffect(() => {
    // Initialize session on mount
    initializeSession();

    // Set up auth state change listener
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`[AuthContext] Auth state changed: ${event}`);

        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          if (session?.user) {
            setSession(session);
            setUser(session.user);
            setRole(session.user?.user_metadata?.role || "Customer");
            setIsSessionReady(true);

            // Update localStorage with fresh data
            const userData = {
              id: session.user.id,
              email: session.user.email,
              name:
                session.user.user_metadata?.name ||
                session.user.email?.split("@")[0] ||
                "User",
              phone: session.user.user_metadata?.phone || "",
              role: session.user.user_metadata?.role || "Customer",
            };

            localStorage.setItem("auth_user", JSON.stringify(userData));
            localStorage.setItem("userId", session.user.id);
            localStorage.setItem("userEmail", session.user.email || "");
            localStorage.setItem("userName", userData.name);
            localStorage.setItem("userPhone", userData.phone);
            localStorage.setItem("userRole", userData.role);

            // Dispatch session restored event
            window.dispatchEvent(
              new CustomEvent("sessionRestored", {
                detail: userData,
              }),
            );
          }
        }

        if (event === "SIGNED_OUT") {
          setSession(null);
          setUser(null);
          setRole(null);
          setIsSessionReady(false);

          // Clear localStorage
          localStorage.removeItem("auth_user");
          localStorage.removeItem("userId");
          localStorage.removeItem("userEmail");
          localStorage.removeItem("userName");
          localStorage.removeItem("userPhone");
          localStorage.removeItem("userRole");
          localStorage.removeItem("isAdmin");
        }
      },
    );

    // Set up visibility change listener for tab switching
    const handleVisibilityChange = async () => {
      if (
        document.visibilityState === "visible" &&
        !initializationRef.current
      ) {
        console.log("[AuthContext] Tab became visible, rehydrating session...");

        // Add small delay to prevent rapid fire
        setTimeout(async () => {
          if (!initializationRef.current && isHydrated) {
            try {
              const {
                data: { session },
              } = await supabase.auth.getSession();

              // Only update if session state has changed
              if (session?.user?.id !== user?.id) {
                console.log(
                  "[AuthContext] Session state changed, reinitializing...",
                );
                await initializeSession();
              }
            } catch (error) {
              console.warn(
                "[AuthContext] Error checking session on visibility change:",
                error,
              );
            }
          }
        }, 500);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      listener.subscription.unsubscribe();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (sessionTimeoutRef.current) {
        clearTimeout(sessionTimeoutRef.current);
      }
    };
  }, [initializeSession, isHydrated, user?.id]);

  // Handle force session restore events from other components
  useEffect(() => {
    const handleForceSessionRestore = async (event: CustomEvent) => {
      console.log(
        "[AuthContext] Force session restore event received:",
        event.detail,
      );
      const userData = event.detail;

      if (
        userData &&
        userData.id &&
        userData.email &&
        !initializationRef.current
      ) {
        console.log("[AuthContext] Processing force session restore...");
        await initializeSession();
      }
    };

    window.addEventListener(
      "forceSessionRestore",
      handleForceSessionRestore as EventListener,
    );

    return () => {
      window.removeEventListener(
        "forceSessionRestore",
        handleForceSessionRestore as EventListener,
      );
    };
  }, [initializeSession]);

  const value: AuthContextType = {
    isAuthenticated: !!session && !!user,
    userRole: role,
    userId: user?.id ?? null,
    userEmail: user?.email ?? null,
    userName: user?.user_metadata?.name ?? null,
    userPhone: user?.user_metadata?.phone ?? null,
    isAdmin:
      role === "Admin" ||
      user?.email?.includes("admin") ||
      user?.email === "divatranssoetta@gmail.com",
    isLoading,
    isHydrated,
    isCheckingSession,
    isSessionReady,
    signOut,
    forceRefreshSession,
    ensureSessionReady,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    // Provide a fallback context instead of throwing an error
    console.warn(
      "useAuth called outside of AuthProvider, providing fallback context",
    );
    return {
      isAuthenticated: false,
      userRole: null,
      userId: null,
      userEmail: null,
      userName: null,
      userPhone: null,
      isAdmin: false,
      isLoading: false,
      isHydrated: true,
      isCheckingSession: false,
      isSessionReady: true,
      signOut: async () => {
        console.warn("signOut called from fallback context");
      },
      forceRefreshSession: async () => {
        console.warn("forceRefreshSession called from fallback context");
      },
      ensureSessionReady: async () => {
        console.warn("ensureSessionReady called from fallback context");
      },
    };
  }
  return context;
};
