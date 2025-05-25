import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

// Main hook implementation
function useAuthHook() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [showAuthForm, setShowAuthForm] = useState(false);

  // Function to fetch user role from database
  const fetchUserRole = async (userId: string) => {
    console.log("Fetching user role for ID:", userId);
    try {
      // First get user metadata from auth.users using edge function
      const { data: authUserData, error: authUserError } =
        await supabase.functions.invoke("update-user-metadata", {
          body: {
            userId: userId,
            action: "get",
          },
        });

      if (!authUserError && authUserData?.user) {
        console.log("Auth user data found:", authUserData.user);

        // Get user metadata
        const userMetadata = authUserData.user.user_metadata || {};

        // Get display name from metadata
        if (userMetadata.full_name) {
          localStorage.setItem("userName", userMetadata.full_name);
          setUserName(userMetadata.full_name);
          console.log(
            "Setting user name from auth metadata:",
            userMetadata.full_name,
          );
        }

        // Fallback to checking users table
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("role_id, roles(name), email, full_name")
          .eq("id", userId)
          .single();

        if (!userError && userData) {
          console.log("User data found in users table:", userData);

          // Only use users table name if we didn't get it from auth metadata
          if (!userMetadata.full_name && userData.full_name) {
            localStorage.setItem("userName", userData.full_name);
            setUserName(userData.full_name);
            console.log(
              "Setting user name from users table:",
              userData.full_name,
            );
          }

          if (userData.email) {
            localStorage.setItem("userEmail", userData.email);
            setUserEmail(userData.email);
          }

          if (userData.roles?.name === "Admin") {
            console.log("ADMIN ROLE FOUND in users table");
            setIsAdmin(true);
            localStorage.setItem("isAdmin", "true");
          }

          return userData.roles?.name || "Customer";
        }
      }

      // If not found or no role, check drivers table
      const { data: driverData, error: driverError } = await supabase
        .from("drivers")
        .select(
          "driver_type, email, name, phone, reference_phone, license_number, license_expiry, stnk_expiry, selfie_url, sim_url, stnk_url, kk_url, status, created_at, updated_at",
        )
        .eq("id", userId)
        .single();

      if (!driverError && driverData?.driver_type) {
        // Convert driver_type to role name
        const roleName =
          driverData.driver_type === "mitra"
            ? "Driver Mitra"
            : "Driver Perusahaan";
        console.log("Role found in drivers table:", roleName);

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

      // Check if user exists in staff table
      const { data: staffData, error: staffError } = await supabase
        .from("staff")
        .select("id, email")
        .eq("id", userId)
        .single();

      if (!staffError && staffData) {
        console.log("User found in staff table, assigning Staff role");

        // Store email if available
        if (staffData.email) {
          localStorage.setItem("userEmail", staffData.email);
          setUserEmail(staffData.email);
        }

        return "Staff";
      }

      // Check if user exists in customers table
      const { data: customerData, error: customerError } = await supabase
        .from("customers")
        .select("id, email, full_name")
        .eq("id", userId)
        .single();

      if (!customerError && customerData) {
        console.log("User found in customers table, assigning Customer role");

        if (customerData.email) {
          localStorage.setItem("userEmail", customerData.email);
          setUserEmail(customerData.email);
        }

        if (customerData.full_name) {
          localStorage.setItem("userName", customerData.full_name);
          setUserName(customerData.full_name);
          console.log(
            "Setting user name from customers table:",
            customerData.full_name,
          );
        }

        return "Customer";
      }

      console.log(
        "User has no role assigned in database, using default Customer role",
      );
      return "Customer";
    } catch (error) {
      console.error("Error fetching user role:", error);
      return null;
    }
  };

  // Function to sign out the user
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      // Clear localStorage data
      localStorage.removeItem("auth_user");
      localStorage.removeItem("userId");
      localStorage.removeItem("userRole");
      localStorage.removeItem("userEmail");
      localStorage.removeItem("isAdmin");
      localStorage.removeItem("userName");

      // Update state
      setIsAuthenticated(false);
      setUserRole(null);
      setUserId(null);
      setUserEmail(null);
      setUserName(null);

      return true;
    } catch (error) {
      console.error("Error signing out:", error);
      return false;
    }
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
        console.log("Saved user name to localStorage:", userData.name);
      } else if (userData.email) {
        // If name is "Customer" or "User", use email username instead
        const emailName = userData.email.split("@")[0];
        localStorage.setItem("userName", emailName);
        console.log(
          "Saved email username to localStorage instead of 'Customer'/'User':",
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
        "No name provided, saved email username to localStorage:",
        emailName,
      );

      // Update the userData object as well
      userData.name = emailName;
      localStorage.setItem("auth_user", JSON.stringify(userData));
    }
  };

  useEffect(() => {
    console.log("[Auth Hook] State:", {
      isAuthenticated,
      userName,
      userRole,
      userEmail,
      isLoading,
    });
  }, [isAuthenticated, userName, userRole, isLoading]);

  useEffect(() => {
    // Flag to prevent concurrent executions of checkAuth
    let isChecking = false;

    // Check if user is already authenticated
    const checkAuth = async () => {
      if (isChecking) return;
      isChecking = true;

      try {
        console.log("Running checkAuth...");
        // Check if user is admin based on email
        const userEmail = localStorage.getItem("userEmail");
        if (
          userEmail &&
          (userEmail.includes("admin") ||
            userEmail === "divatranssoetta@gmail.com")
        ) {
          console.log("Admin email detected:", userEmail);
          setIsAdmin(true);
          localStorage.setItem("isAdmin", "true");
        }

        // First check localStorage for shared authentication
        const authUserStr = localStorage.getItem("auth_user");
        if (authUserStr) {
          try {
            const authUser = JSON.parse(authUserStr);
            if (authUser && authUser.id) {
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
              if (email.includes("admin") || email === "suparman.r@gmail.com") {
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

              console.log("✅ Loaded from localStorage:", userData);
              setShowAuthForm(false);
              return true;
            }
          } catch (e) {
            console.error("Error parsing auth_user from localStorage:", e);
          }
        }

        // If not in localStorage, check Supabase session
        const { data } = await supabase.auth.getSession();
        if (data?.session) {
          setIsAuthenticated(true);
          setUserId(data.session.user.id);
          setUserEmail(data.session.user.email || null);

          // Check if user email indicates admin status
          const email = data.session.user.email || "";
          const isAdminEmail =
            email.includes("admin") || email === "suparman.r@gmail.com";

          if (isAdminEmail) {
            console.log("Admin email detected in session:", email);
            setUserRole("Admin");
            setIsAdmin(true);
            localStorage.setItem("userRole", "Admin");
            localStorage.setItem("isAdmin", "true");
          } else {
            // Try to get role from localStorage first (for faster UI rendering)
            const storedRole = localStorage.getItem("userRole");
            if (storedRole) {
              setUserRole(storedRole);
              const isAdminRole = storedRole === "Admin";
              setIsAdmin(isAdminRole || isAdminEmail);
              console.log(
                "Auth from session (localStorage role) - Role:",
                storedRole,
                "isAdmin:",
                isAdminRole || isAdminEmail,
              );
            } else {
              // If not in localStorage, fetch from database
              const fetchedRole = await fetchUserRole(data.session.user.id);
              if (fetchedRole) {
                const finalRole = isAdminEmail ? "Admin" : fetchedRole;
                localStorage.setItem("userRole", finalRole);
                setUserRole(finalRole);
                const isAdminRole = finalRole === "Admin";
                setIsAdmin(isAdminRole || isAdminEmail);
                console.log(
                  "Auth from session (fetched role) - Role:",
                  finalRole,
                  "isAdmin:",
                  isAdminRole || isAdminEmail,
                );
              }
            }
          }

          // First try to get name from users table
          const { data: userTableData, error: userTableError } = await supabase
            .from("users")
            .select("full_name")
            .eq("id", data.session.user.id)
            .single();

          // Get the current role value to use for conditional checks
          const userRoleValue =
            userRole || localStorage.getItem("userRole") || "Customer";

          let userName = "";

          if (!userTableError && userTableData?.full_name) {
            userName = userTableData.full_name;
            console.log("Found name in users table:", userName);
          } else if (userRoleValue === "Customer") {
            // If user is a customer, try customers table
            const { data: customerData, error: customerError } = await supabase
              .from("customers")
              .select("full_name, name")
              .eq("id", data.session.user.id)
              .single();

            if (
              !customerError &&
              (customerData?.full_name || customerData?.name)
            ) {
              userName = customerData.full_name || customerData.name;
              console.log("Found name in customers table:", userName);
            }
          }

          // Fallback to metadata or localStorage
          if (!userName) {
            userName =
              data.session.user.user_metadata?.full_name ||
              data.session.user.user_metadata?.name ||
              localStorage.getItem("userName") ||
              "";
            console.log("Using fallback name:", userName);
          }

          // Don't use "Customer" as the name if we have no actual name
          if (!userName || userName === "Customer" || userName === "User") {
            userName = data.session.user.email?.split("@")[0] || "";
            console.log(
              "Using email username instead of 'Customer'/'User':",
              userName,
            );
          }

          const userData = {
            id: data.session.user.id,
            role: userRoleValue,
            email: data.session.user.email || "",
            name: userName,
          };
          saveUserDataToLocalStorage(userData);

          // Make sure userName state is updated
          setUserName(userName);
          setUserRole(userRoleValue);
        }
      } catch (error) {
        console.error("Error checking auth:", error);
      } finally {
        isChecking = false;
        setIsLoading(false);
        console.log("checkAuth completed, isLoading set to false");
      }
    };

    checkAuth();

    // Listen for auth changes
    let authListener: { subscription: { unsubscribe: () => void } | null } = {
      subscription: null,
    };

    try {
      const { data } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          console.log("Auth state changed:", event);

          if (event === "SIGNED_IN" && session) {
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
      console.error("Error setting up auth listener:", error);
    }

    // Unsubscribe saat komponen unmount
    return () => {
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  return {
    isAuthenticated,
    userRole,
    role: userRole, // Add role alias for userRole to match component expectations
    userId,
    userEmail,
    userName,
    isLoading,
    signOut,
    isAdmin,
    setShowAuthForm,
  };
}

// Export the hook directly as a named export to be compatible with Fast Refresh
export const useAuth = () => {
  return useAuthHook();
};
