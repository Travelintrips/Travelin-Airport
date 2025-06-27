import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";

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
  signOut: () => Promise<boolean>;
  forceRefreshSession?: () => Promise<void>;
  syncSession?: () => Promise<void>;
  ensureSessionReady?: () => Promise<boolean>;
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
  const [userPhone, setUserPhone] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);
  const [isCheckingSession, setIsCheckingSession] = useState<boolean>(false);
  const [isSessionReady, setIsSessionReady] = useState<boolean>(false);
  const [loadingTimeout, setLoadingTimeout] = useState<NodeJS.Timeout | null>(
    null,
  );
  const [sessionTimeout, setSessionTimeout] = useState<NodeJS.Timeout | null>(
    null,
  );
  const isMountedRef = useRef(true);
  const isCheckingRef = useRef(false);
  const sessionSyncRef = useRef(false);

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
    console.log("[AuthProvider] Clearing authentication storage");
    localStorage.removeItem("auth_user");
    localStorage.removeItem("userId");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("isAdmin");
    localStorage.removeItem("userName");
    localStorage.removeItem("userPhone");

    // Clear additional auth-related items
    localStorage.removeItem("shopping_cart");
    localStorage.removeItem("booking_data");
    localStorage.removeItem("recent_bookings");
    localStorage.removeItem("selected_vehicle");
    localStorage.removeItem("payment_data");
    localStorage.removeItem("airport_transfer_data");
    localStorage.removeItem("baggage_data");
    localStorage.removeItem("driverData");

    // Clear Supabase auth tokens
    const supabaseKeys = Object.keys(localStorage).filter(
      (key) => key.startsWith("supabase.auth") || key.startsWith("sb-"),
    );
    supabaseKeys.forEach((key) => localStorage.removeItem(key));
  };

  // Function to sign out the user - WITH FORCED RELOAD
  const signOut = async () => {
    console.log("[AuthProvider] Starting comprehensive sign out process");

    try {
      // Clear all timeouts first
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
        setLoadingTimeout(null);
      }
      if (sessionTimeout) {
        clearTimeout(sessionTimeout);
        setSessionTimeout(null);
      }

      // Reset all auth states immediately
      setIsAuthenticated(false);
      setUserRole(null);
      setUserId(null);
      setUserEmail(null);
      setUserName(null);
      setUserPhone(null);
      setIsAdmin(false);
      setIsLoading(false);
      setIsHydrated(false);
      setIsCheckingSession(false);
      setIsSessionReady(false);

      // Clear authentication storage
      clearAuthStorage();

      // Broadcast logout to other tabs
      const authChannel = new BroadcastChannel("auth");
      authChannel.postMessage("logout");
      authChannel.close();

      // Set logout flag to prevent redirect loops
      sessionStorage.setItem("loggedOut", "true");

      // Sign out from Supabase
      await supabase.auth.signOut();
    } catch (error) {
      console.warn("[AuthProvider] Error during sign out:", error);
    }

    // Force reload to home page after a short delay
    setTimeout(() => {
      window.location.href = "/";
    }, 100);

    return true;
  };

  const updateUserState = async (user: any) => {
    console.log("[AuthProvider] Updating user state with:", user);
    setIsCheckingSession(true);

    // Get fresh data from user_metadata with fallback to localStorage
    const userMeta = user.user_metadata || {};
    const storedUserName = localStorage.getItem("userName");
    const storedUserRole = localStorage.getItem("userRole");
    const storedUserPhone = localStorage.getItem("userPhone");

    // Check for admin email
    const email = user.email || "";
    const isAdminEmail =
      email.includes("admin") || email === "divatranssoetta@gmail.com";

    let finalRole = "Customer";
    let finalUserName = "";
    let finalUserPhone = "";

    // Extract phone number from user_metadata
    if (userMeta.phone_number) {
      finalUserPhone = userMeta.phone_number;
      console.log(
        "[AuthProvider] Using phone from user_metadata:",
        finalUserPhone,
      );
    } else if (userMeta.phone) {
      finalUserPhone = userMeta.phone;
      console.log(
        "[AuthProvider] Using phone from user_metadata (phone field):",
        finalUserPhone,
      );
    } else if (storedUserPhone) {
      finalUserPhone = storedUserPhone;
      console.log(
        "[AuthProvider] Using phone from localStorage:",
        finalUserPhone,
      );
    }

    if (isAdminEmail) {
      console.log("[AuthProvider] Admin email detected:", email);
      finalRole = "Admin";
      setIsAdmin(true);
      localStorage.setItem("isAdmin", "true");
    } else {
      // Use user_metadata role first, then localStorage, then fetch from DB
      if (userMeta.role) {
        finalRole = userMeta.role;
        console.log("[AuthProvider] Using role from user_metadata:", finalRole);
      } else if (storedUserRole) {
        finalRole = storedUserRole;
        console.log("[AuthProvider] Using role from localStorage:", finalRole);
      } else {
        // Fetch role from database as fallback
        try {
          const fetchedRole = await fetchUserRole(user.id);
          if (fetchedRole) {
            finalRole = fetchedRole;
            console.log("[AuthProvider] Fetched role from DB:", finalRole);
          }
        } catch (roleError) {
          console.warn(
            "[AuthProvider] Error fetching role, using default:",
            roleError,
          );
        }
      }

      const isAdminRole = finalRole === "Admin";
      setIsAdmin(isAdminRole);
      localStorage.setItem("isAdmin", isAdminRole ? "true" : "false");
    }

    // Get user name with priority: user_metadata > localStorage > database > email
    if (userMeta.full_name || userMeta.name) {
      finalUserName = (userMeta.full_name || userMeta.name).trim();
      console.log(
        "[AuthProvider] Using name from user_metadata:",
        finalUserName,
      );
    } else if (
      storedUserName &&
      storedUserName !== "Customer" &&
      storedUserName !== "User"
    ) {
      finalUserName = storedUserName;
      console.log(
        "[AuthProvider] Using name from localStorage:",
        finalUserName,
      );
    } else {
      // Try database as fallback
      try {
        // Try users table first
        const { data: userTableData } = await supabase
          .from("users")
          .select("full_name, phone")
          .eq("id", user.id)
          .single();

        if (userTableData?.full_name) {
          finalUserName = userTableData.full_name;
        }

        // Also get phone from users table if not found in metadata
        if (!finalUserPhone && userTableData?.phone) {
          finalUserPhone = userTableData.phone;
          console.log(
            "[AuthProvider] Using phone from users table:",
            finalUserPhone,
          );
        }

        if (!finalUserName && finalRole === "Customer") {
          // Try customers table
          const { data: customerData } = await supabase
            .from("customers")
            .select("full_name, name, phone")
            .eq("id", user.id)
            .single();

          if (customerData?.full_name || customerData?.name) {
            finalUserName = customerData.full_name || customerData.name;
          }

          // Also get phone from customers table if not found elsewhere
          if (!finalUserPhone && customerData?.phone) {
            finalUserPhone = customerData.phone;
            console.log(
              "[AuthProvider] Using phone from customers table:",
              finalUserPhone,
            );
          }
        }

        // Final fallback to email
        if (!finalUserName) {
          finalUserName = user.email?.split("@")[0] || "User";
        }
      } catch (nameError) {
        console.warn("[AuthProvider] Error fetching name:", nameError);
        finalUserName = user.email?.split("@")[0] || "User";
      }
    }

    // Don't use generic names
    if (["Customer", "User"].includes(finalUserName)) {
      finalUserName = user.email?.split("@")[0] || "User";
    }

    // Set AuthContext with fresh data after login
    setIsAuthenticated(true);
    setUserId(user.id);
    setUserEmail(user.email || null);
    setUserRole(finalRole);
    setUserName(finalUserName);
    setUserPhone(finalUserPhone || null);
    setIsCheckingSession(false);

    // Save to localStorage
    const userData = {
      id: user.id,
      role: finalRole,
      email: user.email || "",
      name: finalUserName,
      phone: finalUserPhone,
    };
    saveUserDataToLocalStorage(userData);

    console.log(
      "[AuthProvider] ✅ User state updated with fresh data:",
      userData,
    );
    console.log("[AuthProvider] Setting isHydrated to true");

    // Set isHydrated and isSessionReady LAST to ensure all other states are ready
    setIsHydrated(true);
    setIsSessionReady(true);

    // Clear any session timeout since we successfully updated
    if (sessionTimeout) {
      clearTimeout(sessionTimeout);
      setSessionTimeout(null);
    }
  };

  const saveUserDataToLocalStorage = (userData: {
    id: string;
    role: string;
    email: string;
    name?: string;
    phone?: string;
  }) => {
    // Determine the final username with consistent logic
    let finalUserName = userData.name || "";

    // Always prioritize a real name over "Customer" or "User"
    if (
      !finalUserName ||
      finalUserName.trim() === "" ||
      ["Customer", "User"].includes(finalUserName)
    ) {
      if (userData.email) {
        finalUserName = userData.email.split("@")[0];
        console.log(
          "[AuthProvider] Using email username instead of generic name:",
          finalUserName,
        );
      } else {
        finalUserName = "User";
      }
    }

    // Update userData object with final name
    const finalUserData = {
      ...userData,
      name: finalUserName,
    };

    // Save all data consistently
    localStorage.setItem("auth_user", JSON.stringify(finalUserData));
    localStorage.setItem("userId", userData.id);
    localStorage.setItem("userRole", userData.role);
    localStorage.setItem("userName", finalUserName);

    if (userData.email) {
      localStorage.setItem("userEmail", userData.email);
    }

    if (userData.phone) {
      localStorage.setItem("userPhone", userData.phone);
      console.log(
        "[AuthProvider] Saved phone to localStorage:",
        userData.phone,
      );
    }

    console.log("[AuthProvider] Saved consistent user data to localStorage:", {
      id: userData.id,
      role: userData.role,
      email: userData.email,
      name: finalUserName,
      phone: userData.phone || "Not provided",
    });
  };

  // BroadcastChannel listener for cross-tab logout synchronization
  useEffect(() => {
    const authChannel = new BroadcastChannel("auth");

    const handleAuthMessage = (event: MessageEvent) => {
      if (event.data === "logout") {
        console.log("[AuthProvider] Received logout signal from another tab");

        // Clear all authentication state immediately
        setIsAuthenticated(false);
        setUserRole(null);
        setUserId(null);
        setUserEmail(null);
        setUserName(null);
        setUserPhone(null);
        setIsAdmin(false);
        setIsLoading(false);
        setIsHydrated(false);
        setIsCheckingSession(false);
        setIsSessionReady(false);

        // Clear authentication storage
        clearAuthStorage();

        // Clear additional storage items
        try {
          localStorage.removeItem("shopping_cart");
          localStorage.removeItem("booking_data");
          localStorage.removeItem("recent_bookings");
          localStorage.removeItem("selected_vehicle");
          localStorage.removeItem("payment_data");
          localStorage.removeItem("airport_transfer_data");
          localStorage.removeItem("baggage_data");
          localStorage.removeItem("driverData");

          // Clear Supabase auth tokens
          localStorage.removeItem("supabase.auth.token");
          localStorage.removeItem("sb-refresh-token");
          localStorage.removeItem("sb-access-token");
          localStorage.removeItem("sb-auth-token");
          localStorage.removeItem("supabase.auth.data");
          localStorage.removeItem("supabase.auth.expires_at");
          localStorage.removeItem("supabase.auth.expires_in");
          localStorage.removeItem("supabase.auth.refresh_token");
          localStorage.removeItem("supabase.auth.access_token");
          localStorage.removeItem("supabase.auth.provider_token");
          localStorage.removeItem("supabase.auth.provider_refresh_token");

          // Clear session storage
          sessionStorage.clear();
          sessionStorage.setItem("loggedOut", "true");
        } catch (e) {
          console.warn(
            "[AuthProvider] Error clearing storage on broadcast logout:",
            e,
          );
        }

        console.log(
          "[AuthProvider] ✅ Cross-tab logout - State reset - isAuthenticated:",
          false,
          "userRole:",
          null,
          "userName:",
          null,
        );
      }
    };

    authChannel.addEventListener("message", handleAuthMessage);

    return () => {
      authChannel.removeEventListener("message", handleAuthMessage);
      authChannel.close();
    };
  }, []);

  // Session validation function - centralized logic
  const validateAndRestoreSession = useCallback(
    async (skipSessionCheck = false) => {
      if (isCheckingRef.current) {
        console.log(
          "[AuthProvider] Already checking session, skipping duplicate check",
        );
        return;
      }

      isCheckingRef.current = true;
      console.log("[AuthProvider] Validating and restoring session...");

      try {
        let sessionData = null;
        let sessionError = null;

        // Only check session if not skipping
        if (!skipSessionCheck) {
          const result = await supabase.auth.getSession();
          sessionData = result.data;
          sessionError = result.error;
        }

        // Check localStorage first for immediate state restoration
        const storedUser = localStorage.getItem("auth_user");
        const storedUserName = localStorage.getItem("userName");
        const storedUserRole = localStorage.getItem("userRole");
        const storedUserPhone = localStorage.getItem("userPhone");
        const storedIsAdmin = localStorage.getItem("isAdmin") === "true";

        if (storedUser) {
          try {
            const userData = JSON.parse(storedUser);
            if (userData && userData.id && userData.email) {
              console.log(
                "[AuthProvider] Restoring from localStorage immediately",
              );

              // Prioritize stored values over parsed userData for consistency
              const finalUserName =
                storedUserName ||
                userData.name ||
                userData.email?.split("@")[0] ||
                "User";

              const finalUserRole =
                storedUserRole || userData.role || "Customer";

              const finalUserPhone = storedUserPhone || userData.phone || "";

              // Set state immediately from localStorage
              setIsAuthenticated(true);
              setUserId(userData.id);
              setUserEmail(userData.email || "");
              setUserRole(finalUserRole);
              setUserName(finalUserName);
              setUserPhone(finalUserPhone || null);
              setIsAdmin(storedIsAdmin);
              setIsHydrated(true);
              setIsCheckingSession(false);
              setIsLoading(false);

              console.log(
                "[AuthProvider] ✅ Immediate state restoration from localStorage complete",
              );
            }
          } catch (parseError) {
            console.warn(
              "[AuthProvider] Error parsing localStorage:",
              parseError,
            );
          }
        }

        // Then validate with Supabase session (non-blocking)
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (error) {
          console.error("[AuthProvider] Session error:", error);
          // Only clear if we don't have valid localStorage data
          if (!storedUser) {
            clearAuthStorage();
            setIsAuthenticated(false);
            setUserRole(null);
            setUserId(null);
            setUserEmail(null);
            setUserName(null);
            setIsAdmin(false);
          }
          return;
        }

        if (session?.user) {
          console.log("[AuthProvider] ✅ Session validated, syncing if needed");

          // Add automatic fallback from user_metadata when page is reaccessed
          const user = session.user;
          const userMeta = user.user_metadata || {};

          // Check if we need to update localStorage with fresh metadata
          const shouldUpdateFromMetadata =
            (userMeta.name && !storedUserName) ||
            (userMeta.role && !storedUserRole) ||
            (storedUser && JSON.parse(storedUser).id !== user.id);

          if (shouldUpdateFromMetadata || !storedUser) {
            console.log(
              "[AuthProvider] Updating state with fresh user_metadata",
            );
            await updateUserState(user);
          } else {
            // Ensure localStorage consistency with session
            const userData = JSON.parse(storedUser);
            if (userData.id !== user.id) {
              console.log("[AuthProvider] Session user mismatch, updating");
              await updateUserState(user);
            }
          }
        } else if (!storedUser) {
          console.log(
            "[AuthProvider] No session and no localStorage, clearing state",
          );
          clearAuthStorage();
          setIsAuthenticated(false);
          setUserRole(null);
          setUserId(null);
          setUserEmail(null);
          setUserName(null);
          setIsAdmin(false);
          setIsHydrated(false);
          setIsCheckingSession(false);
        }
      } catch (error) {
        console.error(
          "[AuthProvider] Error in validateAndRestoreSession:",
          error,
        );
        // Don't clear auth state on error - maintain current state
      } finally {
        isCheckingRef.current = false;
      }
    },
    [],
  );

  // Enhanced session synchronization function with timeout and validation
  const syncSession = useCallback(async () => {
    if (sessionSyncRef.current) {
      console.log("[AuthProvider] Session sync already in progress, skipping");
      return;
    }

    sessionSyncRef.current = true;
    console.log("[AuthProvider] Starting enhanced session sync...");

    try {
      // Set timeout for session sync to prevent hanging - increased timeout to 15 seconds
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Session sync timeout")), 15000),
      );

      const { data, error } = await Promise.race([
        sessionPromise,
        timeoutPromise,
      ]);

      if (!data?.session || error) {
        console.log(
          "[AuthProvider] No valid session found, checking localStorage fallback",
        );

        // Check localStorage for fallback before resetting
        const storedUser = localStorage.getItem("auth_user");
        if (storedUser) {
          try {
            const userData = JSON.parse(storedUser);
            if (userData && userData.id && userData.email) {
              console.log(
                "[AuthProvider] Using localStorage fallback for session",
              );

              // Restore from localStorage
              setIsAuthenticated(true);
              setUserId(userData.id);
              setUserEmail(userData.email);
              setUserRole(userData.role || "Customer");
              setUserName(
                userData.name || userData.email?.split("@")[0] || "User",
              );
              setUserPhone(userData.phone || null);
              setIsAdmin(
                userData.role === "Admin" ||
                  localStorage.getItem("isAdmin") === "true",
              );
              setIsHydrated(true);
              setIsCheckingSession(false);
              setIsSessionReady(true);

              // Dispatch event to notify components
              window.dispatchEvent(
                new CustomEvent("authStateRefreshed", { detail: userData }),
              );
              console.log("[AuthProvider] Session restored from localStorage");
              return;
            }
          } catch (parseError) {
            console.warn(
              "[AuthProvider] Error parsing localStorage user data:",
              parseError,
            );
          }
        }

        // Reset state only if no localStorage fallback
        console.log("[AuthProvider] No fallback available, resetting state");
        setIsAuthenticated(false);
        setUserRole(null);
        setUserId(null);
        setUserEmail(null);
        setUserName(null);
        setIsAdmin(false);
        setIsHydrated(true);
        setIsCheckingSession(false);
        clearAuthStorage();
        setIsSessionReady(true);
        return;
      }

      const session = data.session;
      const user = session.user;

      // Validate user data before proceeding
      if (!user || !user.id || !user.email) {
        console.warn("[AuthProvider] Invalid user data in session");
        throw new Error("Invalid user data");
      }

      console.log("[AuthProvider] Valid session found, updating state");
      await updateUserState(user);

      // Dispatch event to notify components
      const userData = {
        id: user.id,
        email: user.email,
        role: userRole || "Customer",
        name: userName || user.email?.split("@")[0] || "User",
      };

      window.dispatchEvent(
        new CustomEvent("authStateRefreshed", { detail: userData }),
      );
      console.log("[AuthProvider] Session synced successfully");
    } catch (e) {
      console.warn(
        "[AuthProvider] Session sync error (non-critical):",
        e.message || e,
      );

      // Try localStorage fallback before resetting
      const storedUser = localStorage.getItem("auth_user");
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          if (userData && userData.id && userData.email) {
            console.log(
              "[AuthProvider] Using localStorage fallback after sync error",
            );

            setIsAuthenticated(true);
            setUserId(userData.id);
            setUserEmail(userData.email);
            setUserRole(userData.role || "Customer");
            setUserName(
              userData.name || userData.email?.split("@")[0] || "User",
            );
            setUserPhone(userData.phone || null);
            setIsAdmin(
              userData.role === "Admin" ||
                localStorage.getItem("isAdmin") === "true",
            );
            setIsHydrated(true);
            setIsCheckingSession(false);
            setIsSessionReady(true);

            window.dispatchEvent(
              new CustomEvent("authStateRefreshed", { detail: userData }),
            );
            console.log(
              "[AuthProvider] Session restored from localStorage after timeout",
            );
            return;
          }
        } catch (parseError) {
          console.warn(
            "[AuthProvider] Error parsing localStorage after sync error:",
            parseError,
          );
        }
      }

      // Only reset state if timeout is not the issue and no localStorage fallback
      if (!e.message?.includes("timeout")) {
        setIsAuthenticated(false);
        setUserRole(null);
        setUserId(null);
        setUserEmail(null);
        setUserName(null);
        setUserPhone(null);
        setIsAdmin(false);
        clearAuthStorage();
      }

      // Always set these to prevent infinite loading
      setIsHydrated(true);
      setIsCheckingSession(false);
      setIsSessionReady(true);
    } finally {
      sessionSyncRef.current = false;
    }
  }, [userRole, userName]);

  // Forceful session refresh function
  const forceRefreshSession = useCallback(async () => {
    console.log("[AuthProvider] Force refreshing session...");
    await syncSession();
  }, [syncSession]);

  // Enhanced session sync with debouncing and validation
  useEffect(() => {
    let syncTimeout: NodeJS.Timeout;
    let lastSyncTime = 0;
    const SYNC_COOLDOWN = 500; // Increased to 5 seconds to reduce sync frequency

    const debouncedSync = () => {
      const now = Date.now();
      if (now - lastSyncTime < SYNC_COOLDOWN) {
        console.log("[AuthProvider] Sync cooldown active, skipping");
        return;
      }

      if (syncTimeout) clearTimeout(syncTimeout);
      syncTimeout = setTimeout(() => {
        if (document.visibilityState === "visible" && !sessionSyncRef.current) {
          console.log("[AuthProvider] Debounced session sync triggered");
          lastSyncTime = Date.now();
          syncSession();
        }
      }, 500); // Increased delay to reduce sync frequency
    };

    // Enhanced visibility change handler with immediate session rehydration
    const syncOnVisibility = async () => {
      if (document.visibilityState === "visible") {
        console.log(
          "[AuthProvider] Tab became visible, rehydrating session immediately",
        );

        try {
          // Immediate Supabase session check for fresh data
          const {
            data: { session },
            error,
          } = await supabase.auth.getSession();

          if (!error && session?.user) {
            console.log(
              "[AuthProvider] Fresh session found, updating AuthContext",
            );

            // Update AuthContext with fresh session data
            const user = session.user;
            const userMeta = user.user_metadata || {};

            // Check for admin status
            const isAdminEmail =
              user.email?.includes("admin") ||
              user.email === "divatranssoetta@gmail.com";
            const finalRole = isAdminEmail
              ? "Admin"
              : userMeta.role || "Customer";
            const finalUserName =
              userMeta.full_name ||
              userMeta.name ||
              user.email?.split("@")[0] ||
              "User";

            // Update all auth states immediately
            setIsAuthenticated(true);
            setUserId(user.id);
            setUserEmail(user.email || null);
            setUserRole(finalRole);
            setUserName(finalUserName);
            setIsAdmin(isAdminEmail || finalRole === "Admin");
            setIsHydrated(true);
            setIsCheckingSession(false);
            setIsSessionReady(true);

            // Update localStorage with fresh data
            const userData = {
              id: user.id,
              email: user.email || "",
              role: finalRole,
              name: finalUserName,
            };
            saveUserDataToLocalStorage(userData);

            // Dispatch events to notify components
            window.dispatchEvent(
              new CustomEvent("authStateRefreshed", { detail: userData }),
            );
            window.dispatchEvent(
              new CustomEvent("sessionRestored", { detail: userData }),
            );

            console.log(
              "[AuthProvider] Session rehydrated successfully from Supabase",
            );
            return; // Exit early since we have fresh session
          }
        } catch (sessionError) {
          console.warn(
            "[AuthProvider] Error getting fresh session:",
            sessionError,
          );
        }

        // Fallback to localStorage if Supabase session fails
        const storedUser = localStorage.getItem("auth_user");
        const storedUserName = localStorage.getItem("userName");
        const storedUserRole = localStorage.getItem("userRole");
        const storedIsAdmin = localStorage.getItem("isAdmin") === "true";

        if (storedUser && (!isAuthenticated || !userId)) {
          try {
            const userData = JSON.parse(storedUser);
            if (userData && userData.id && userData.email) {
              console.log(
                "[AuthProvider] Fallback restore from localStorage on visibility",
              );

              // Use stored values with priority
              const finalUserName =
                storedUserName ||
                userData.name ||
                userData.email?.split("@")[0] ||
                "User";
              const finalUserRole =
                storedUserRole || userData.role || "Customer";

              setIsAuthenticated(true);
              setUserId(userData.id);
              setUserEmail(userData.email);
              setUserRole(finalUserRole);
              setUserName(finalUserName);
              setIsAdmin(storedIsAdmin || finalUserRole === "Admin");
              setIsHydrated(true);
              setIsCheckingSession(false);
              setIsSessionReady(true);

              // Dispatch immediate event with consistent data
              const eventData = {
                id: userData.id,
                email: userData.email,
                role: finalUserRole,
                name: finalUserName,
              };
              window.dispatchEvent(
                new CustomEvent("authStateRefreshed", { detail: eventData }),
              );

              // Also dispatch session restore event for components
              window.dispatchEvent(
                new CustomEvent("sessionRestored", { detail: eventData }),
              );
            }
          } catch (error) {
            console.warn("[AuthProvider] Error in fallback restore:", error);
          }
        }

        // Then schedule background sync for additional validation
        debouncedSync();
      }
    };

    const syncOnFocus = () => {
      console.log("[AuthProvider] Window focused, scheduling sync");
      debouncedSync();
    };

    // Add session timeout handler
    const handleSessionTimeout = () => {
      console.log("[AuthProvider] Session timeout detected");
      if (sessionTimeout) {
        clearTimeout(sessionTimeout);
      }

      const timeout = setTimeout(() => {
        if (!isSessionReady && !sessionSyncRef.current) {
          console.warn(
            "[AuthProvider] Session timeout reached, forcing ready state",
          );

          // Try localStorage one more time before forcing ready
          const storedUser = localStorage.getItem("auth_user");
          if (storedUser) {
            try {
              const userData = JSON.parse(storedUser);
              if (userData && userData.id && userData.email) {
                console.log(
                  "[AuthProvider] Final localStorage restore before timeout",
                );
                setIsAuthenticated(true);
                setUserId(userData.id);
                setUserEmail(userData.email);
                setUserRole(userData.role || "Customer");
                setUserName(
                  userData.name || userData.email?.split("@")[0] || "User",
                );
                setIsAdmin(
                  userData.role === "Admin" ||
                    localStorage.getItem("isAdmin") === "true",
                );
              }
            } catch (error) {
              console.warn("[AuthProvider] Error in final restore:", error);
            }
          }

          setIsSessionReady(true);
          setIsHydrated(true);
          setIsLoading(false);
        }
      }, 10000); // 10 second timeout

      setSessionTimeout(timeout);
    };

    document.addEventListener("visibilitychange", syncOnVisibility);
    window.addEventListener("focus", syncOnFocus);

    // Start session timeout on mount
    handleSessionTimeout();

    return () => {
      document.removeEventListener("visibilitychange", syncOnVisibility);
      window.removeEventListener("focus", syncOnFocus);
      if (syncTimeout) clearTimeout(syncTimeout);
      if (sessionTimeout) clearTimeout(sessionTimeout);
    };
  }, [syncSession, isSessionReady, isAuthenticated, userId]);

  // Main session restoration effect - runs only once on mount
  useEffect(() => {
    let isMounted = true;

    // Set a timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      if (isMounted) {
        console.log("[AuthProvider] Timeout reached, forcing loading to false");
        setIsLoading(false);
        isCheckingRef.current = false;
      }
    }, 3000); // Reduced timeout to 3 seconds

    setLoadingTimeout(timeout);

    // Restore session function - optimized with localStorage priority
    const restoreSession = async () => {
      if (isCheckingRef.current || !isMounted) {
        console.log(
          "[AuthProvider] Already checking or unmounted, skipping...",
        );
        return;
      }

      isCheckingRef.current = true;
      console.log("[AuthProvider] Starting optimized session restoration");

      try {
        // First, try to restore from localStorage for immediate UI update
        const storedUser = localStorage.getItem("auth_user");
        const storedUserName = localStorage.getItem("userName");
        const storedUserRole = localStorage.getItem("userRole");
        const storedUserPhone = localStorage.getItem("userPhone");
        const storedIsAdmin = localStorage.getItem("isAdmin") === "true";

        if (storedUser) {
          try {
            const userData = JSON.parse(storedUser);
            if (userData && userData.id && userData.email) {
              console.log(
                "[AuthProvider] Restoring from localStorage immediately",
              );

              // Prioritize stored values over parsed userData for consistency
              const finalUserName =
                storedUserName ||
                userData.name ||
                userData.email?.split("@")[0] ||
                "User";

              const finalUserRole =
                storedUserRole || userData.role || "Customer";

              const finalUserPhone = storedUserPhone || userData.phone || "";

              // Set state immediately from localStorage
              setIsAuthenticated(true);
              setUserId(userData.id);
              setUserEmail(userData.email || "");
              setUserRole(finalUserRole);
              setUserName(finalUserName);
              setUserPhone(finalUserPhone || null);
              setIsAdmin(storedIsAdmin);
              setIsHydrated(true);
              setIsCheckingSession(false);
              setIsLoading(false);

              console.log(
                "[AuthProvider] ✅ Immediate state restoration from localStorage complete",
              );
            }
          } catch (parseError) {
            console.warn(
              "[AuthProvider] Error parsing localStorage:",
              parseError,
            );
          }
        }

        // Then validate with Supabase session (non-blocking)
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (error) {
          console.error("[AuthProvider] Session error:", error);
          // Only clear if we don't have valid localStorage data
          if (!storedUser) {
            clearAuthStorage();
            setIsAuthenticated(false);
            setUserRole(null);
            setUserId(null);
            setUserEmail(null);
            setUserName(null);
            setIsAdmin(false);
          }
          return;
        }

        if (session?.user) {
          console.log("[AuthProvider] ✅ Session validated, syncing if needed");

          // Validate session user data
          if (!session.user.id || !session.user.email) {
            console.warn("[AuthProvider] Invalid session user data");
            throw new Error("Invalid session user data");
          }

          // Add automatic fallback from user_metadata when page is reaccessed
          const user = session.user;
          const userMeta = user.user_metadata || {};

          // Check if we need to update localStorage with fresh metadata
          const shouldUpdateFromMetadata =
            (userMeta.name && !storedUserName) ||
            (userMeta.role && !storedUserRole) ||
            (storedUser && JSON.parse(storedUser).id !== user.id);

          if (shouldUpdateFromMetadata || !storedUser) {
            console.log(
              "[AuthProvider] Updating state with fresh user_metadata",
            );
            await updateUserState(user);
          } else {
            // Ensure localStorage consistency with session
            const userData = JSON.parse(storedUser);
            if (userData.id !== user.id) {
              console.log("[AuthProvider] Session user mismatch, updating");
              await updateUserState(user);
            } else {
              // Session is valid and consistent, just set ready state
              setIsSessionReady(true);
            }
          }
        } else if (!storedUser) {
          console.log(
            "[AuthProvider] No session and no localStorage, clearing state",
          );
          clearAuthStorage();
          setIsAuthenticated(false);
          setUserRole(null);
          setUserId(null);
          setUserEmail(null);
          setUserName(null);
          setIsAdmin(false);
          setIsHydrated(true);
          setIsCheckingSession(false);
          setIsSessionReady(true);
        } else {
          // We have localStorage but no session - keep current state but mark as ready
          console.log(
            "[AuthProvider] Using localStorage data, session unavailable",
          );
          setIsSessionReady(true);
        }
      } catch (error) {
        console.error("[AuthProvider] Error in restoreSession:", error);
        // Don't clear state on error if we have localStorage data
        const storedUser = localStorage.getItem("auth_user");
        if (!storedUser && isMounted) {
          clearAuthStorage();
          setIsAuthenticated(false);
          setUserRole(null);
          setUserId(null);
          setUserEmail(null);
          setUserName(null);
          setIsAdmin(false);
          setIsHydrated(false);
          setIsCheckingSession(false);
          setIsSessionReady(true);
        }
      } finally {
        if (isMounted) {
          if (loadingTimeout) {
            clearTimeout(loadingTimeout);
            setLoadingTimeout(null);
          }
          isCheckingRef.current = false;
          setIsLoading(false);
          console.log("[AuthProvider] ✅ Session restoration completed");
        }
      }
    };

    // Start session restoration
    restoreSession();

    // Enhanced auth state change listener with real-time session sync
    let authListener: { subscription: { unsubscribe: () => void } | null } = {
      subscription: null,
    };

    try {
      const { data } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (!isMounted) return;

          console.log("[AuthProvider] Auth state changed:", event, {
            hasSession: !!session,
            hasUser: !!session?.user,
          });

          if (event === "SIGNED_IN" && session) {
            console.log("[AuthProvider] User signed in, updating state");
            await updateUserState(session.user);
          } else if (event === "SIGNED_OUT") {
            console.log("[AuthProvider] User signed out, clearing state");
            setIsAuthenticated(false);
            setUserRole(null);
            setUserId(null);
            setUserEmail(null);
            setUserName(null);
            setIsAdmin(false);
            setIsLoading(false);
            setIsHydrated(false);
            setIsCheckingSession(false);
            setIsSessionReady(false);
            clearAuthStorage();
          } else if (event === "TOKEN_REFRESHED" && session) {
            console.log("[AuthProvider] Token refreshed, syncing session");
            // Update state with refreshed session to maintain consistency
            if (
              session.user &&
              (!isAuthenticated || userId !== session.user.id)
            ) {
              console.log("[AuthProvider] Syncing state after token refresh");
              await updateUserState(session.user);
            }
          } else if (event === "TOKEN_REFRESH_FAILED") {
            console.warn("[AuthProvider] Token refresh failed, clearing state");
            setIsAuthenticated(false);
            setUserRole(null);
            setUserId(null);
            setUserEmail(null);
            setUserName(null);
            setIsAdmin(false);
            setIsLoading(false);
            setIsHydrated(false);
            setIsCheckingSession(false);
            setIsSessionReady(false);
            clearAuthStorage();
          }
        },
      );

      authListener = data || { subscription: null };
    } catch (error) {
      console.error("[AuthProvider] Error setting up auth listener:", error);
    }

    // Cleanup on unmount
    return () => {
      isMounted = false;
      isMountedRef.current = false;
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe();
      }
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, []); // Empty dependency array - runs only once

  // Enhanced session readiness function with retry mechanism
  const ensureSessionReady = useCallback(async (): Promise<boolean> => {
    console.log("[AuthProvider] Starting ensureSessionReady...");

    const maxAttempts = 10;
    const attemptDelay = 500; // 500ms between attempts
    const maxWaitTime = 8000; // 8 seconds total timeout

    const startTime = Date.now();

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(
        `[AuthProvider] Session ready check attempt ${attempt}/${maxAttempts}`,
      );

      // Check if we've exceeded the maximum wait time
      if (Date.now() - startTime > maxWaitTime) {
        console.warn("[AuthProvider] Session ready timeout exceeded");
        break;
      }

      // Check current auth state
      if (isAuthenticated && userId && userEmail) {
        console.log(
          "[AuthProvider] ✅ Session ready - AuthContext state valid",
        );
        return true;
      }

      // Check localStorage fallback
      const storedUser = localStorage.getItem("auth_user");
      const storedUserId = localStorage.getItem("userId");
      const storedUserEmail = localStorage.getItem("userEmail");

      if (storedUser && storedUserId && storedUserEmail) {
        try {
          const userData = JSON.parse(storedUser);
          if (userData && userData.id && userData.email) {
            console.log(
              "[AuthProvider] Found valid localStorage data, attempting restore",
            );

            // Trigger session restore
            const consistentUserData = {
              id: userData.id,
              email: userData.email,
              role:
                localStorage.getItem("userRole") || userData.role || "Customer",
              name:
                localStorage.getItem("userName") ||
                userData.name ||
                userData.email?.split("@")[0] ||
                "User",
            };

            window.dispatchEvent(
              new CustomEvent("forceSessionRestore", {
                detail: consistentUserData,
              }),
            );

            // Wait a bit for the restore to take effect
            await new Promise((resolve) => setTimeout(resolve, 200));

            // Check if restore was successful
            if (isAuthenticated && userId && userEmail) {
              console.log("[AuthProvider] ✅ Session restored successfully");
              return true;
            }
          }
        } catch (error) {
          console.warn(
            "[AuthProvider] Error parsing localStorage data:",
            error,
          );
        }
      }

      // Check Supabase session as final attempt
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();
        if (!error && session?.user && session.user.id && session.user.email) {
          console.log(
            "[AuthProvider] Found valid Supabase session, updating state",
          );
          await updateUserState(session.user);

          // Wait a bit for state update
          await new Promise((resolve) => setTimeout(resolve, 200));

          if (isAuthenticated && userId && userEmail) {
            console.log(
              "[AuthProvider] ✅ Session ready after Supabase update",
            );
            return true;
          }
        }
      } catch (error) {
        console.warn(
          `[AuthProvider] Supabase session check failed on attempt ${attempt}:`,
          error,
        );
      }

      // Wait before next attempt (except on last attempt)
      if (attempt < maxAttempts) {
        console.log(
          `[AuthProvider] Waiting ${attemptDelay}ms before next attempt...`,
        );
        await new Promise((resolve) => setTimeout(resolve, attemptDelay));
      }
    }

    console.error(
      "[AuthProvider] ❌ Session ready check failed after all attempts",
    );
    return false;
  }, [isAuthenticated, userId, userEmail, updateUserState]);

  const value: AuthContextType = {
    isAuthenticated,
    userRole,
    userId,
    userEmail,
    userName,
    userPhone,
    isAdmin,
    isLoading,
    isHydrated,
    isCheckingSession,
    isSessionReady,
    signOut,
    forceRefreshSession,
    syncSession,
    ensureSessionReady,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  console.log("[useAuth] Consuming from context");
  const context = useContext(AuthContext);
  if (context === undefined) {
    // Return default values instead of throwing error to prevent storyboard crashes
    console.warn(
      "useAuth called outside of AuthProvider, returning default values",
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
      isHydrated: false,
      isCheckingSession: false,
      isSessionReady: false,
      signOut: async () => false,
      forceRefreshSession: async () => {},
      syncSession: async () => {},
      ensureSessionReady: async () => false,
    };
  }
  return context;
};
