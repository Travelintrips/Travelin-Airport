import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";

interface AuthContextType {
  isAuthenticated: boolean;
  userRole: string | null;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  isAdmin: boolean;
  isLoading: boolean;
  signOut: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  console.log("[AuthProvider] Initialized once");

  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loadingTimeout, setLoadingTimeout] = useState<NodeJS.Timeout | null>(
    null,
  );
  const isMountedRef = useRef(true);
  const isCheckingRef = useRef(false);

  // Function to fetch user role from database
  const fetchUserRole = async (userId: string) => {
    console.log("[AuthProvider] Starting to fetch user role for ID:", userId);
    try {
      console.log("[AuthProvider] Invoking update-user-metadata edge function");
      // First get user metadata from auth.users using edge function
      const { data: authUserData, error: authUserError } =
        await supabase.functions.invoke("update-user-metadata", {
          body: {
            userId: userId,
            action: "get",
          },
        });

      if (authUserError) {
        console.error(
          "[AuthProvider] Error from update-user-metadata:",
          authUserError,
        );
      }

      if (!authUserError && authUserData?.user) {
        console.log("[AuthProvider] Auth user data found:", authUserData.user);

        // Get user metadata
        const userMetadata = authUserData.user.user_metadata || {};

        // Get display name from metadata
        if (userMetadata.full_name) {
          localStorage.setItem("userName", userMetadata.full_name);
          setUserName(userMetadata.full_name);
          console.log(
            "[AuthProvider] Setting user name from auth metadata:",
            userMetadata.full_name,
          );
        }

        console.log("[AuthProvider] Checking users table");
        // Fallback to checking users table
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("role_id, roles(name), email, full_name")
          .eq("id", userId)
          .single();

        if (userError) {
          console.error("[AuthProvider] Error from users table:", userError);
        }

        if (!userError && userData) {
          console.log(
            "[AuthProvider] User data found in users table:",
            userData,
          );

          // Only use users table name if we didn't get it from auth metadata
          if (!userMetadata.full_name && userData.full_name) {
            localStorage.setItem("userName", userData.full_name);
            setUserName(userData.full_name);
            console.log(
              "[AuthProvider] Setting user name from users table:",
              userData.full_name,
            );
          }

          if (userData.email) {
            localStorage.setItem("userEmail", userData.email);
            setUserEmail(userData.email);
          }

          if (userData.roles?.name === "Admin") {
            console.log("[AuthProvider] ADMIN ROLE FOUND in users table");
            setIsAdmin(true);
            localStorage.setItem("isAdmin", "true");
          }

          console.log(
            "[AuthProvider] Returning role from users table:",
            userData.roles?.name || "Customer",
          );
          return userData.roles?.name || "Customer";
        }
      }

      console.log("[AuthProvider] Checking drivers table");
      // If not found or no role, check drivers table
      const { data: driverData, error: driverError } = await supabase
        .from("drivers")
        .select(
          "driver_type, email, name, phone, reference_phone, license_number, license_expiry, stnk_expiry, selfie_url, sim_url, stnk_url, kk_url, status, created_at, updated_at",
        )
        .eq("id", userId)
        .single();

      if (driverError) {
        console.error("[AuthProvider] Error from drivers table:", driverError);
      }

      if (!driverError && driverData?.driver_type) {
        // Convert driver_type to role name
        const roleName =
          driverData.driver_type === "mitra"
            ? "Driver Mitra"
            : "Driver Perusahaan";
        console.log("[AuthProvider] Role found in drivers table:", roleName);

        // Store email if available
        if (driverData.email) {
          localStorage.setItem("userEmail", driverData.email);
          setUserEmail(driverData.email);
        }

        // Store additional driver information in localStorage
        localStorage.setItem(
          "driverData",
          JSON.stringify({
            id: userId,
            name: driverData.name,
            email: driverData.email,
            phone: driverData.phone,
            reference_phone: driverData.reference_phone,
            license_number: driverData.license_number,
            license_expiry: driverData.license_expiry,
            stnk_expiry: driverData.stnk_expiry,
            selfie_url: driverData.selfie_url,
            sim_url: driverData.sim_url,
            stnk_url: driverData.stnk_url,
            kk_url: driverData.kk_url,
            status: driverData.status,
            driver_type: driverData.driver_type,
            created_at: driverData.created_at,
            updated_at: driverData.updated_at,
          }),
        );

        return roleName;
      }

      console.log("[AuthProvider] Checking staff table");
      // Check if user exists in staff table
      const { data: staffData, error: staffError } = await supabase
        .from("staff")
        .select("id, email")
        .eq("id", userId)
        .single();

      if (staffError) {
        console.error("[AuthProvider] Error from staff table:", staffError);
      }

      if (!staffError && staffData) {
        console.log(
          "[AuthProvider] User found in staff table, assigning Staff role",
        );

        // Store email if available
        if (staffData.email) {
          localStorage.setItem("userEmail", staffData.email);
          setUserEmail(staffData.email);
        }

        return "Staff";
      }

      console.log("[AuthProvider] Checking customers table");
      // Check if user exists in customers table
      const { data: customerData, error: customerError } = await supabase
        .from("customers")
        .select("id, email, full_name")
        .eq("id", userId)
        .single();

      if (customerError) {
        console.error(
          "[AuthProvider] Error from customers table:",
          customerError,
        );
      }

      if (!customerError && customerData) {
        console.log(
          "[AuthProvider] User found in customers table, assigning Customer role",
        );

        if (customerData.email) {
          localStorage.setItem("userEmail", customerData.email);
          setUserEmail(customerData.email);
        }

        if (customerData.full_name) {
          localStorage.setItem("userName", customerData.full_name);
          setUserName(customerData.full_name);
          console.log(
            "[AuthProvider] Setting user name from customers table:",
            customerData.full_name,
          );
        }

        return "Customer";
      }

      console.log(
        "[AuthProvider] User has no role assigned in database, using default Customer role",
      );
      return "Customer";
    } catch (error) {
      console.error("[AuthProvider] Critical error fetching user role:", error);
      console.error(
        "[AuthProvider] Error stack:",
        error instanceof Error ? error.stack : "No stack trace",
      );
      return null;
    }
  };

  // Function to clear authentication storage
  const clearAuthStorage = () => {
    localStorage.removeItem("auth_user");
    localStorage.removeItem("userId");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("isAdmin");
    localStorage.removeItem("userName");
  };

  // Function to sign out the user
  const signOut = async () => {
    console.log("[AuthProvider] Starting comprehensive sign out process");

    // Clear state immediately to prevent UI issues
    setIsAuthenticated(false);
    setUserRole(null);
    setUserId(null);
    setUserEmail(null);
    setUserName(null);
    setIsAdmin(false);

    try {
      // Sign out from Supabase
      await supabase.auth.signOut({ scope: "global" });
    } catch (error) {
      console.warn("[AuthProvider] Error signing out from Supabase:", error);
    }

    // Clear all storage immediately
    console.log("[AuthProvider] Clearing all storage");
    localStorage.clear();
    sessionStorage.clear();

    // Clear IndexedDB databases
    if (typeof indexedDB !== "undefined") {
      const databases = ["supabase", "supabase-js", "keyval-store"];
      databases.forEach((dbName) => {
        try {
          indexedDB.deleteDatabase(dbName);
        } catch (e) {
          console.warn(`[AuthProvider] Error clearing ${dbName}:`, e);
        }
      });
    }

    // Clear browser caches
    if ("caches" in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName)),
        );
      } catch (cacheError) {
        console.warn("[AuthProvider] Error clearing caches:", cacheError);
      }
    }

    // Clear cookies
    document.cookie.split(";").forEach((c) => {
      const eqPos = c.indexOf("=");
      const name = eqPos > -1 ? c.substr(0, eqPos) : c;
      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
      document.cookie =
        name +
        "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=" +
        window.location.hostname;
      document.cookie =
        name +
        "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=." +
        window.location.hostname;
    });

    console.log(
      "[AuthProvider] Logout cleanup completed, ready for page refresh",
    );

    return true;
  };

  const saveUserDataToLocalStorage = (userData: {
    id: string;
    role: string;
    email: string;
    name?: string;
  }) => {
    localStorage.setItem("auth_user", JSON.stringify(userData));
    localStorage.setItem("userId", userData.id);
    if (userData.email) {
      localStorage.setItem("userEmail", userData.email);
    }

    // Always prioritize a real name over "Customer" or "User"
    if (userData.name && userData.name.trim() !== "") {
      if (userData.name !== "Customer" && userData.name !== "User") {
        localStorage.setItem("userName", userData.name);
        console.log(
          "[AuthProvider] Saved user name to localStorage:",
          userData.name,
        );
      } else if (userData.email) {
        // If name is "Customer" or "User", use email username instead
        const emailName = userData.email.split("@")[0];
        localStorage.setItem("userName", emailName);
        console.log(
          "[AuthProvider] Saved email username to localStorage instead of 'Customer'/'User':",
          emailName,
        );

        // Update the userData object as well
        userData.name = emailName;
        localStorage.setItem("auth_user", JSON.stringify(userData));
      }
    } else if (userData.email) {
      // If no name, use email username
      const emailName = userData.email.split("@")[0];
      localStorage.setItem("userName", emailName);
      console.log(
        "[AuthProvider] No name provided, saved email username to localStorage:",
        emailName,
      );

      // Update the userData object as well
      userData.name = emailName;
      localStorage.setItem("auth_user", JSON.stringify(userData));
    }
  };

  // Main checkAuth function - runs only once
  useEffect(() => {
    // Set a timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      console.log("[AuthProvider] Timeout reached, forcing loading to false");
      setIsLoading(false);
      isCheckingRef.current = false;
    }, 20000); // 20 second timeout

    setLoadingTimeout(timeout);

    // Check if user is already authenticated
    const checkAuth = async () => {
      if (isCheckingRef.current) {
        console.log("[AuthProvider] Already checking, skipping...");
        return;
      }
      isCheckingRef.current = true;
      console.log("[AuthProvider] Starting authentication check");

      try {
        console.log("[AuthProvider] Getting Supabase session...");
        // Get Supabase session first with error handling
        const { data, error } = await supabase.auth.getSession();

        // Manual check for session errors
        if (error !== null) {
          console.error("[AuthProvider] Session error detected:", error);
          console.log(
            "[AuthProvider] Clearing auth storage and signing out due to session error",
          );
          clearAuthStorage();
          await supabase.auth.signOut({ scope: "global" });
          setIsAuthenticated(false);
          setUserRole(null);
          setUserId(null);
          setUserEmail(null);
          setUserName(null);
          setIsAdmin(false);
          return;
        }

        console.log(
          "[AuthProvider] Session data:",
          data?.session ? "Session exists" : "No session",
        );

        // Check localStorage for shared authentication
        console.log("[AuthProvider] Checking localStorage for auth_user...");
        const authUserStr = localStorage.getItem("auth_user");
        let authUser = null;
        let needsFallback = false;

        if (authUserStr) {
          console.log(
            "[AuthProvider] Found auth_user in localStorage, parsing...",
          );
          try {
            authUser = JSON.parse(authUserStr);
            console.log("[AuthProvider] Parsed auth_user:", {
              id: authUser?.id,
              role: authUser?.role,
            });

            // Check if localStorage data matches session
            if (data?.session && authUser?.id !== data.session.user.id) {
              console.log(
                "[AuthProvider] 🔄 localStorage mismatch with session, using fallback",
              );
              needsFallback = true;
            } else if (authUser && authUser.id && !data?.session) {
              console.log(
                "[AuthProvider] 🔄 localStorage exists but no session, clearing storage",
              );
              clearAuthStorage();
              setIsAuthenticated(false);
              setUserRole(null);
              setUserId(null);
              setUserEmail(null);
              setUserName(null);
              setIsAdmin(false);
              console.log(
                "[AuthProvider] Cleared storage and state, returning early",
              );
              return;
            }
          } catch (e) {
            console.error(
              "[AuthProvider] ❌ Error parsing auth_user from localStorage:",
              e,
            );
            console.log(
              "[AuthProvider] 🔄 JSON parse error, clearing storage and using fallback",
            );
            clearAuthStorage();
            needsFallback = true;
          }
        } else {
          console.log("[AuthProvider] No auth_user found in localStorage");
        }

        // Use fallback if needed or if no localStorage data
        if (needsFallback || !authUser) {
          console.log("[AuthProvider] Using fallback authentication flow");
          if (data?.session) {
            console.log(
              "[AuthProvider] 🔄 Session exists, processing fallback login",
            );

            const sessionUser = data.session.user;
            console.log("[AuthProvider] Session user ID:", sessionUser.id);
            setIsAuthenticated(true);
            setUserId(sessionUser.id);
            setUserEmail(sessionUser.email || null);

            // Check if user email indicates admin status
            const email = sessionUser.email || "";
            const isAdminEmail =
              email.includes("admin") || email === "divatranssoetta@gmail.com";

            let finalRole = "Customer";
            if (isAdminEmail) {
              console.log(
                "[AuthProvider] Admin email detected in session:",
                email,
              );
              finalRole = "Admin";
              setIsAdmin(true);
              localStorage.setItem("isAdmin", "true");
            } else {
              console.log("[AuthProvider] Fetching role from database...");
              // Fetch role from database
              const fetchedRole = await fetchUserRole(sessionUser.id);
              if (fetchedRole) {
                finalRole = fetchedRole;
                console.log("[AuthProvider] Fetched role:", finalRole);
              } else {
                console.log(
                  "[AuthProvider] No role fetched, using default Customer",
                );
              }
              const isAdminRole = finalRole === "Admin";
              setIsAdmin(isAdminRole);
              localStorage.setItem("isAdmin", isAdminRole ? "true" : "false");
            }

            setUserRole(finalRole);
            localStorage.setItem("userRole", finalRole);

            console.log("[AuthProvider] Getting user name...");
            // Get user name
            let userName = "";

            // First try to get name from users table
            const { data: userTableData, error: userTableError } =
              await supabase
                .from("users")
                .select("full_name")
                .eq("id", sessionUser.id)
                .single();

            if (userTableError) {
              console.log(
                "[AuthProvider] Error getting name from users table:",
                userTableError.message,
              );
            }

            if (!userTableError && userTableData?.full_name) {
              userName = userTableData.full_name;
              console.log(
                "[AuthProvider] Found name in users table:",
                userName,
              );
            } else if (finalRole === "Customer") {
              console.log("[AuthProvider] Trying customers table for name...");
              // If user is a customer, try customers table
              const { data: customerData, error: customerError } =
                await supabase
                  .from("customers")
                  .select("full_name, name")
                  .eq("id", sessionUser.id)
                  .single();

              if (customerError) {
                console.log(
                  "[AuthProvider] Error getting name from customers table:",
                  customerError.message,
                );
              }

              if (
                !customerError &&
                (customerData?.full_name || customerData?.name)
              ) {
                userName = customerData.full_name || customerData.name;
                console.log(
                  "[AuthProvider] Found name in customers table:",
                  userName,
                );
              }
            }

            // Fallback to metadata
            if (!userName) {
              userName =
                sessionUser.user_metadata?.full_name ||
                sessionUser.user_metadata?.name ||
                "";
              console.log(
                "[AuthProvider] Using fallback name from metadata:",
                userName,
              );
            }

            // Don't use "Customer" as the name if we have no actual name
            if (!userName || userName === "Customer" || userName === "User") {
              userName = sessionUser.email?.split("@")[0] || "User";
              console.log(
                "[AuthProvider] Using email username instead of 'Customer'/'User':",
                userName,
              );
            }

            setUserName(userName);
            localStorage.setItem("userName", userName);

            // Create and save userData
            const userData = {
              id: sessionUser.id,
              role: finalRole,
              email: sessionUser.email || "",
              name: userName,
            };
            saveUserDataToLocalStorage(userData);

            console.log("[AuthProvider] ✅ Fallback auth completed:", userData);
          } else {
            // No session and no valid localStorage
            console.log(
              "[AuthProvider] ❌ No session found, user not authenticated",
            );
            setIsAuthenticated(false);
            setUserRole(null);
            setUserId(null);
            setUserEmail(null);
            setUserName(null);
            setIsAdmin(false);
          }
        } else if (authUser && authUser.id && data?.session) {
          console.log(
            "[AuthProvider] Using localStorage data (matches session)",
          );
          // Use localStorage data if valid and matches session
          setIsAuthenticated(true);
          setUserId(authUser.id);
          setUserEmail(authUser.email || null);

          // Resolve Name
          const storedUserName = localStorage.getItem("userName");
          let resolvedUserName = "User";
          if (
            storedUserName &&
            !["customer", "user"].includes(storedUserName.toLowerCase())
          ) {
            resolvedUserName = storedUserName;
          } else if (
            authUser.name &&
            !["customer", "user"].includes(authUser.name.toLowerCase())
          ) {
            resolvedUserName = authUser.name;
          } else if (authUser.email) {
            resolvedUserName = authUser.email.split("@")[0];
          }

          // Resolve Role
          const storedRole = localStorage.getItem("userRole");
          let resolvedUserRole = authUser.role || storedRole || "Customer";

          // Admin override
          const email = authUser.email || "";
          if (
            email.includes("admin") ||
            email === "divatranssoetta@gmail.com"
          ) {
            resolvedUserRole = "Admin";
            setIsAdmin(true);
            localStorage.setItem("isAdmin", "true");
          } else {
            const isAdminRole = resolvedUserRole === "Admin";
            setIsAdmin(isAdminRole);
            localStorage.setItem("isAdmin", isAdminRole ? "true" : "false");
          }

          // Set all state
          setUserName(resolvedUserName);
          setUserRole(resolvedUserRole);

          // Save back to storage
          localStorage.setItem("userName", resolvedUserName);
          localStorage.setItem("userRole", resolvedUserRole);

          // Save combined
          const userData = {
            id: authUser.id,
            role: resolvedUserRole,
            email: authUser.email || "",
            name: resolvedUserName,
          };
          localStorage.setItem("auth_user", JSON.stringify(userData));

          console.log("[AuthProvider] ✅ Loaded from localStorage:", userData);
        } else {
          // No valid session or localStorage data
          console.log("[AuthProvider] ❌ No valid authentication found");
          setIsAuthenticated(false);
          setUserRole(null);
          setUserId(null);
          setUserEmail(null);
          setUserName(null);
          setIsAdmin(false);
        }
      } catch (error) {
        console.error("[AuthProvider] ❌ Critical error in checkAuth:", error);
        console.error(
          "[AuthProvider] Error stack:",
          error instanceof Error ? error.stack : "No stack trace",
        );
        // Clear state on error
        setIsAuthenticated(false);
        setUserRole(null);
        setUserId(null);
        setUserEmail(null);
        setUserName(null);
        setIsAdmin(false);
        clearAuthStorage();
      } finally {
        // Clear the timeout since we completed successfully
        if (loadingTimeout) {
          clearTimeout(loadingTimeout);
          setLoadingTimeout(null);
        }
        isCheckingRef.current = false;
        setIsLoading(false);
        console.log(
          "[AuthProvider] ✅ checkAuth completed, isLoading set to false",
        );
      }
    };

    checkAuth();

    // Listen for auth changes - only set up once
    let authListener: { subscription: { unsubscribe: () => void } | null } = {
      subscription: null,
    };

    try {
      const { data } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          console.log("[AuthProvider] Auth state changed:", event);

          if (event === "SIGNED_IN" && session) {
            // Refresh session to ensure we have the latest token
            try {
              await supabase.auth.refreshSession();
              console.log("[AuthProvider] Session refreshed successfully");
            } catch (refreshError) {
              console.warn(
                "[AuthProvider] Error refreshing session:",
                refreshError,
              );
            }

            // Call checkAuth instead of duplicating the logic
            checkAuth();
          } else if (event === "SIGNED_OUT") {
            // SIGNED_OUT: clear everything
            setIsAuthenticated(false);
            setUserRole(null);
            setUserId(null);
            setUserEmail(null);
            setIsAdmin(false);
            setIsLoading(false);

            localStorage.removeItem("auth_user");
            localStorage.removeItem("userName");
            localStorage.removeItem("userRole");
            localStorage.removeItem("userEmail");
            localStorage.removeItem("isAdmin");
            localStorage.removeItem("userId");
          }
        },
      );

      authListener = data || { subscription: null };
    } catch (error) {
      console.error("[AuthProvider] Error setting up auth listener:", error);
    }

    // Cleanup on unmount
    return () => {
      isMountedRef.current = false;
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe();
      }
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
      }
    };
  }, []); // Empty dependency array - runs only once

  const value: AuthContextType = {
    isAuthenticated,
    userRole,
    userId,
    userEmail,
    userName,
    isAdmin,
    isLoading,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  console.log("[useAuth] Consuming from context");
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
