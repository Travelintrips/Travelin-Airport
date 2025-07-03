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
  ensureSessionReady: () => Promise<void>; // ✅ ditambahkan di sini
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
      console.log("[AuthContext] Starting initial session check...");

      // First try to restore from localStorage
      const storedUser = localStorage.getItem("auth_user");
      const storedUserId = localStorage.getItem("userId");
      const storedUserEmail = localStorage.getItem("userEmail");
      const storedUserRole = localStorage.getItem("userRole");

      if (storedUser && storedUserId && storedUserEmail) {
        try {
          const userData = JSON.parse(storedUser);
          console.log(
            "[AuthContext] Found stored user data, attempting to restore:",
            userData.email,
          );

          // Set initial state from localStorage
          const storedUserPhone = localStorage.getItem("userPhone");
          const finalPhone = storedUserPhone || userData.phone || "";

          setUser({
            id: storedUserId,
            email: storedUserEmail,
            user_metadata: {
              name: userData.name,
              role: storedUserRole || "Customer",
              phone: finalPhone,
            },
          });

          // Update localStorage with the final phone if it was missing
          if (finalPhone && !storedUserPhone) {
            localStorage.setItem("userPhone", finalPhone);
          }
          setRole(storedUserRole || "Customer");

          // Dispatch session restored event immediately
          window.dispatchEvent(
            new CustomEvent("sessionRestored", {
              detail: {
                id: storedUserId,
                email: storedUserEmail,
                name: userData.name,
                role: storedUserRole || "Customer",
              },
            }),
          );
        } catch (parseError) {
          console.warn(
            "[AuthContext] Error parsing stored user data:",
            parseError,
          );
        }
      }

      // Then try to get current session from Supabase
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) {
        console.log("[AuthContext] No valid Supabase session found");

        // If no Supabase session but we have localStorage data, keep the restored state
        if (storedUser && storedUserId && storedUserEmail) {
          console.log("[AuthContext] Keeping localStorage session as fallback");
          // Keep the session state from localStorage
        } else {
          // Clear everything if no session anywhere
          setSession(null);
          setUser(null);
          setRole(null);
        }
      } else {
        console.log(
          "[AuthContext] Valid Supabase session found, updating state",
        );
        setSession(data.session);
        setUser(data.session.user);
        setRole(data.session.user?.user_metadata?.role || null);

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

        // Try to get phone from database if not in metadata
        if (!userData.phone) {
          try {
            const { data: customerData } = await supabase
              .from("customers")
              .select("phone")
              .eq("user_id", data.session.user.id)
              .single();

            if (customerData?.phone) {
              userData.phone = customerData.phone;
            } else {
              const { data: userData2 } = await supabase
                .from("users")
                .select("phone")
                .eq("id", data.session.user.id)
                .single();

              if (userData2?.phone) {
                userData.phone = userData2.phone;
              }
            }
          } catch (error) {
            console.warn(
              "[AuthContext] Error fetching phone from database:",
              error,
            );
          }
        }

        localStorage.setItem("auth_user", JSON.stringify(userData));
        localStorage.setItem("userId", data.session.user.id);
        localStorage.setItem("userEmail", data.session.user.email || "");
        localStorage.setItem("userName", userData.name);
        localStorage.setItem("userPhone", userData.phone);
        localStorage.setItem(
          "userRole",
          data.session.user?.user_metadata?.role || "Customer",
        );

        // Dispatch session restored event with fresh data
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
      }
    } catch (err) {
      console.error("[AuthContext] Error fetching session:", err);

      // Fallback to localStorage if Supabase fails
      const storedUser = localStorage.getItem("auth_user");
      const storedUserId = localStorage.getItem("userId");
      const storedUserEmail = localStorage.getItem("userEmail");
      const storedUserRole = localStorage.getItem("userRole");

      if (storedUser && storedUserId && storedUserEmail) {
        try {
          const userData = JSON.parse(storedUser);
          console.log(
            "[AuthContext] Using localStorage fallback after error:",
            userData.email,
          );

          setUser({
            id: storedUserId,
            email: storedUserEmail,
            user_metadata: {
              name: userData.name,
              role: storedUserRole || "Customer",
            },
          });
          setRole(storedUserRole || "Customer");

          // Dispatch session restored event
          window.dispatchEvent(
            new CustomEvent("sessionRestored", {
              detail: {
                id: storedUserId,
                email: storedUserEmail,
                name: userData.name,
                role: storedUserRole || "Customer",
              },
            }),
          );
        } catch (parseError) {
          console.warn(
            "[AuthContext] Error parsing stored user in fallback:",
            parseError,
          );
        }
      }
    } finally {
      setIsSessionReady(true);
      setIsLoading(false);
      setIsHydrated(true);
      console.log("[AuthContext] Initial session check completed");
    }
  }, []);

  const forceRefreshSession = useCallback(async () => {
    setIsCheckingSession(true);
    try {
      console.log("[AuthContext] Starting force refresh session...");

      // Create timeout promise with reduced duration
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Session check timeout")), 5000); // Increased to 5000ms for better stability
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

        return;
      }

      // If no valid session, try refresh with timeout
      console.log("[AuthContext] No current session, attempting refresh...");
      const refreshPromise = supabase.auth.refreshSession();
      const refreshTimeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Refresh timeout")), 10000); // Increased timeout for refresh
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
      setIsCheckingSession(false);
    }
  }, []);

  const ensureSessionReady = useCallback(async () => {
    if (!isSessionReady) {
      await getInitialSession();
    }
  }, [isSessionReady, getInitialSession]);

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

  // Session locking mechanism to prevent race conditions
  const [isSessionLocked, setIsSessionLocked] = useState(false);
  const sessionLockRef = useRef<NodeJS.Timeout | null>(null);

  const lockSession = useCallback(() => {
    if (sessionLockRef.current) {
      clearTimeout(sessionLockRef.current);
    }
    setIsSessionLocked(true);
    sessionLockRef.current = setTimeout(() => {
      setIsSessionLocked(false);
      sessionLockRef.current = null;
    }, 3000); // 3 second lock
  }, []);

  useEffect(() => {
    let visibilityTimeout: NodeJS.Timeout;
    let lastVisibilityCheck = 0;
    const VISIBILITY_COOLDOWN = 12000; // Increased cooldown to prevent excessive checks
    let isProcessingVisibility = false; // Add processing flag

    const handleVisibility = async () => {
      if (document.visibilityState === "visible") {
        const now = Date.now();

        // Enhanced throttling with processing flag
        if (
          now - lastVisibilityCheck < VISIBILITY_COOLDOWN ||
          isProcessingVisibility
        ) {
          console.log(
            "[AuthContext] Visibility check throttled or already processing, skipping",
          );
          return;
        }

        // Check if session is locked to prevent race conditions
        if (isSessionLocked) {
          console.log(
            "[AuthContext] Session locked, skipping visibility check",
          );
          return;
        }

        isProcessingVisibility = true;
        lastVisibilityCheck = now;
        lockSession(); // Lock session during check

        // Clear any existing timeout
        if (visibilityTimeout) clearTimeout(visibilityTimeout);

        console.log(
          "[AuthContext] Tab became visible, prioritizing localStorage",
        );

        // Prioritize localStorage for immediate session restoration
        const storedUser = localStorage.getItem("auth_user");
        const storedUserId = localStorage.getItem("userId");
        const storedUserEmail = localStorage.getItem("userEmail");
        const storedUserRole = localStorage.getItem("userRole");

        if (storedUser && storedUserId && storedUserEmail) {
          try {
            const userData = JSON.parse(storedUser);
            console.log(
              "[AuthContext] Restoring session from localStorage:",
              userData.email,
            );

            // Update context state with stored data immediately
            setUser({
              id: storedUserId,
              email: storedUserEmail,
              user_metadata: {
                name: userData.name,
                role: storedUserRole || "Customer",
                phone:
                  userData.phone || localStorage.getItem("userPhone") || "",
              },
            });
            setRole(storedUserRole || "Customer");
            setIsSessionReady(true);

            // Dispatch session restored event with stored data immediately
            window.dispatchEvent(
              new CustomEvent("sessionRestored", {
                detail: {
                  id: storedUserId,
                  email: storedUserEmail,
                  name: userData.name,
                  role: storedUserRole || "Customer",
                  phone:
                    userData.phone || localStorage.getItem("userPhone") || "",
                },
              }),
            );

            // Optional: Try to validate with Supabase in background (non-blocking)
            setTimeout(async () => {
              try {
                const {
                  data: { session },
                } = await supabase.auth.getSession();
                if (session?.user && session.user.id === storedUserId) {
                  console.log(
                    "[AuthContext] Background session validation successful",
                  );
                  // Update with fresh data if different
                  if (session.user.email !== storedUserEmail) {
                    const freshUserData = {
                      id: session.user.id,
                      email: session.user.email,
                      name: session.user.user_metadata?.name || userData.name,
                      phone:
                        session.user.user_metadata?.phone || userData.phone,
                    };
                    localStorage.setItem(
                      "auth_user",
                      JSON.stringify(freshUserData),
                    );
                    localStorage.setItem("userEmail", session.user.email || "");
                  }
                }
              } catch (bgError) {
                console.log(
                  "[AuthContext] Background validation failed (non-critical):",
                  bgError.message,
                );
              }
            }, 2000);
          } catch (parseError) {
            console.warn(
              "[AuthContext] Error parsing stored user:",
              parseError,
            );
            setIsSessionReady(true);
          }
        } else {
          console.log(
            "[AuthContext] No localStorage data, trying Supabase session check",
          );

          // Only try Supabase if no localStorage data
          try {
            const sessionPromise = supabase.auth.getSession();
            const timeoutPromise = new Promise((_, reject) => {
              setTimeout(
                () => reject(new Error("Session check timeout")),
                5000,
              ); // Reduced timeout
            });

            const {
              data: { session },
              error,
            } = (await Promise.race([sessionPromise, timeoutPromise])) as any;

            if (!error && session?.user) {
              console.log("[AuthContext] Valid Supabase session found");
              setSession(session);
              setUser(session.user);
              setRole(session.user?.user_metadata?.role || null);
              setIsSessionReady(true);

              // Update localStorage with fresh session data
              const userData = {
                id: session.user.id,
                email: session.user.email,
                name:
                  session.user.user_metadata?.name ||
                  session.user.email?.split("@")[0] ||
                  "User",
                phone: session.user.user_metadata?.phone || "",
              };

              localStorage.setItem("auth_user", JSON.stringify(userData));
              localStorage.setItem("userId", session.user.id);
              localStorage.setItem("userEmail", session.user.email || "");
              localStorage.setItem("userName", userData.name);
              localStorage.setItem("userPhone", userData.phone);
              localStorage.setItem(
                "userRole",
                session.user?.user_metadata?.role || "Customer",
              );

              // Dispatch session restored event
              window.dispatchEvent(
                new CustomEvent("sessionRestored", {
                  detail: userData,
                }),
              );
            } else {
              console.log("[AuthContext] No valid session found anywhere");
              setIsSessionReady(true);
            }
          } catch (error) {
            console.log(
              "[AuthContext] Supabase session check failed:",
              error.message,
            );
            setIsSessionReady(true);
          }
        }

        isProcessingVisibility = false; // Reset processing flag
      }
    };

    // Listen for force session restore events
    const handleForceSessionRestore = async (event: CustomEvent) => {
      console.log(
        "[AuthContext] Force session restore event received:",
        event.detail,
      );
      const userData = event.detail;

      if (userData && userData.id && userData.email) {
        // Update localStorage
        localStorage.setItem("auth_user", JSON.stringify(userData));
        localStorage.setItem("userId", userData.id);
        localStorage.setItem("userEmail", userData.email);
        localStorage.setItem(
          "userName",
          userData.name || userData.email.split("@")[0] || "User",
        );
        localStorage.setItem("userRole", userData.role || "Customer");

        // Try to get fresh session from Supabase
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (session?.user && session.user.id === userData.id) {
            console.log(
              "[AuthContext] Updating context with fresh session data",
            );
            setSession(session);
            setUser(session.user);
            setRole(session.user?.user_metadata?.role || userData.role || null);
          }
        } catch (error) {
          console.warn(
            "[AuthContext] Error getting fresh session in force restore:",
            error,
          );
        }

        setIsSessionReady(true);
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener(
      "forceSessionRestore",
      handleForceSessionRestore as EventListener,
    );

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener(
        "forceSessionRestore",
        handleForceSessionRestore as EventListener,
      );
      if (visibilityTimeout) clearTimeout(visibilityTimeout);
    };
  }, [isSessionLocked, lockSession]);

  const value: AuthContextType = {
    isAuthenticated: !!session,
    userRole: role,
    userId: user?.id ?? null,
    userEmail: user?.email ?? null,
    userName: user?.user_metadata?.name ?? null,
    userPhone: user?.user_metadata?.phone ?? null,
    isAdmin: role === "admin",
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
