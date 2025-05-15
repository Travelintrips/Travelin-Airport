import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

// Named export for useAuth
export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  // Function to fetch user role from database
  const fetchUserRole = async (userId: string) => {
    console.log("Fetching user role for ID:", userId);
    try {
      // First check users table for admin, staff, customer roles
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("role_id, roles(name), email, full_name")
        .eq("id", userId)
        .single();

      if (!userError && userData) {
        console.log("User data found:", userData);

        // Check if user has Admin role
        if (userData.roles?.name === "Admin") {
          console.log("ADMIN ROLE FOUND in users table");
          setIsAdmin(true);
          localStorage.setItem("isAdmin", "true");
        }

        // Store email if available
        if (userData.email) {
          localStorage.setItem("userEmail", userData.email);
          setUserEmail(userData.email);
        }

        return userData.roles?.name || "Customer";
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
        .select("id, email")
        .eq("id", userId)
        .single();

      if (!customerError && customerData) {
        console.log("User found in customers table, assigning Customer role");

        // Store email if available
        if (customerData.email) {
          localStorage.setItem("userEmail", customerData.email);
          setUserEmail(customerData.email);
        }

        return "Customer";
      }

      // Default role if nothing found
      console.log(
        "No specific role found in any table (users, drivers, staff, customers), assigning Customer role",
      );

      // Log the issue but don't try to update the database here
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

      // Update state
      setIsAuthenticated(false);
      setUserRole(null);
      setUserId(null);
      setUserEmail(null);

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
    if (userData.name) {
      localStorage.setItem("userName", userData.name);
    }
  };

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuth = async () => {
      try {
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
              setUserRole(authUser.role || null);
              setUserName(authUser.name || null); // ✅ ambil name dari authUser
              setShowAuthForm(false);

              // If email contains 'admin' or matches specific admin email, force Admin role
              const email = authUser.email || "";
              if (email.includes("admin") || email === "suparman.r@gmail.com") {
                setUserRole("Admin");
                setIsAdmin(true);
                localStorage.setItem("userRole", "Admin");
                localStorage.setItem("isAdmin", "true");
                console.log("Admin email detected, setting role to Admin");
              } else {
                const role = authUser.role || "Customer";
                setUserRole(role);
                // Explicitly check if role is exactly "Admin" (case-sensitive)
                const isAdminRole = role === "Admin";
                setIsAdmin(isAdminRole);
              }

              console.log(
                "Auth from localStorage - Role:",
                userRole,
                "isAdmin:",
                isAdmin,
              );
              setUserEmail(authUser.email || null);
              setIsLoading(false);
              return; // Exit early if we found auth data in localStorage
            }
          } catch (e) {
            console.error("Error parsing auth_user from localStorage:", e);
            // Continue with Supabase auth check
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

          // Store in auth_user for shared authentication
          const currentStoredRole = localStorage.getItem("userRole");
          const userRoleValue =
            currentStoredRole ||
            (await fetchUserRole(data.session.user.id)) ||
            "Customer";
          const userData = {
            id: data.session.user.id,
            role: userRoleValue,
            email: data.session.user.email || "",
            name: data.session.user.user_metadata?.full_name || "", // ✅
          };
          saveUserDataToLocalStorage(userData);
        }
      } catch (error) {
        console.error("Error checking auth:", error);
      } finally {
        setIsLoading(false);
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
            // Clear old localStorage
            localStorage.removeItem("auth_user");
            localStorage.removeItem("userName");
            localStorage.removeItem("userRole");
            localStorage.removeItem("userEmail");
            localStorage.removeItem("isAdmin");
            localStorage.removeItem("userId");

            setIsAuthenticated(true);
            setUserId(session.user.id);
            setUserEmail(session.user.email || null);

            // ✅ Cek metadata (ambil dari session.user_metadata)
            const userMetadata = session.user.user_metadata || {};
            const serverRole = userMetadata.role || "Customer"; // fallback ke Customer kalau gak ada
            const serverName = userMetadata.name || "User";

            console.log("User logged in with server role:", serverRole);

            // ✅ Langsung gunakan serverRole
            const finalRole = serverRole;
            const isAdminRole = finalRole === "Admin";

            // Set state
            setUserRole(finalRole);
            setIsAdmin(isAdminRole);

            // Save to localStorage
            localStorage.setItem("userRole", finalRole);
            localStorage.setItem("isAdmin", isAdminRole ? "true" : "false");
            localStorage.setItem("userName", serverName);
            localStorage.setItem("userId", session.user.id);
            if (session.user.email) {
              localStorage.setItem("userEmail", session.user.email);
            }

            // Save auth_user combined
            const userData = {
              id: session.user.id,
              role: finalRole,
              email: session.user.email || "",
              name: serverName,
            };
            localStorage.setItem("auth_user", JSON.stringify(userData));
          } else if (event === "SIGNED_OUT") {
            // SIGNED_OUT: clear everything
            setIsAuthenticated(false);
            setUserRole(null);
            setUserId(null);
            setUserEmail(null);
            setIsAdmin(false);

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

  const [userName, setUserName] = useState<string | null>(null);

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
  };
}

// Default export that returns the hook result
export default function useAuthHook() {
  return useAuth();
}
