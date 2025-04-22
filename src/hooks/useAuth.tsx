import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

// Define the hook as a function declaration for Fast Refresh compatibility
export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Function to fetch user role from database
  const fetchUserRole = async (userId: string) => {
    try {
      // First check users table for admin, staff, customer roles
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("role_id, roles(name), email, full_name")
        .eq("id", userId)
        .single();

      if (!userError && userData?.roles?.name) {
        console.log("Role found in users table:", userData.roles.name);
        // Store email if available
        if (userData.email) {
          localStorage.setItem("userEmail", userData.email);
          setUserEmail(userData.email);
        }
        return userData.roles.name;
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
      console.log("No specific role found, defaulting to Customer");
      return "Customer";
    } catch (error) {
      console.error("Error fetching user role:", error);
      return null;
    }
  };

  // Function to sign out the user
  const signOut = async (redirectToHome = false) => {
    try {
      await supabase.auth.signOut();
      // Clear localStorage data
      localStorage.removeItem("auth_user");
      localStorage.removeItem("userId");
      localStorage.removeItem("userRole");
      localStorage.removeItem("userEmail");
      localStorage.removeItem("driverData");

      // Update state
      setIsAuthenticated(false);
      setUserRole(null);
      setUserId(null);
      setUserEmail(null);

      // If this is called from the vehicle-groups page, redirect to home
      if (
        redirectToHome ||
        window.location.href.includes(
          "recursing-shannon1-afnjp.view-3.tempo-dev.app/vehicle-groups",
        )
      ) {
        window.location.href =
          "https://distracted-archimedes8-kleh7.view-3.tempo-dev.app/";
      }

      return true;
    } catch (error) {
      console.error("Error signing out:", error);
      return false;
    }
  };

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuth = async () => {
      try {
        // First check localStorage for shared authentication
        const authUserStr = localStorage.getItem("auth_user");
        if (authUserStr) {
          try {
            const authUser = JSON.parse(authUserStr);
            if (authUser && authUser.id) {
              setIsAuthenticated(true);
              setUserId(authUser.id);
              setUserRole(authUser.role || "Customer");
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

          // Try to get role from localStorage first (for faster UI rendering)
          const storedRole = localStorage.getItem("userRole");
          if (storedRole) {
            setUserRole(storedRole);
          } else {
            // If not in localStorage, fetch from database
            const role = await fetchUserRole(data.session.user.id);
            if (role) {
              localStorage.setItem("userRole", role);
              setUserRole(role);
            }
          }

          // Store in auth_user for shared authentication
          const userData = {
            id: data.session.user.id,
            role: storedRole || role || "Customer",
            email: data.session.user.email || "",
          };
          localStorage.setItem("auth_user", JSON.stringify(userData));
          localStorage.setItem("userId", data.session.user.id);
          if (data.session.user.email) {
            localStorage.setItem("userEmail", data.session.user.email);
          }
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
            setIsAuthenticated(true);
            setUserId(session.user.id);
            setUserEmail(session.user.email || null);

            // Try to get role from localStorage first
            const storedRole = localStorage.getItem("userRole");
            if (storedRole) {
              setUserRole(storedRole);
            } else {
              // If not in localStorage, fetch from database
              const role = await fetchUserRole(session.user.id);
              if (role) {
                localStorage.setItem("userRole", role);
                setUserRole(role);
              }
            }

            // Store in auth_user for shared authentication
            const userData = {
              id: session.user.id,
              role: storedRole || userRole || "Customer",
              email: session.user.email || "",
            };
            localStorage.setItem("auth_user", JSON.stringify(userData));
            localStorage.setItem("userId", session.user.id);
            if (session.user.email) {
              localStorage.setItem("userEmail", session.user.email);
            }
          } else if (event === "SIGNED_OUT") {
            setIsAuthenticated(false);
            setUserRole(null);
            setUserId(null);
            setUserEmail(null);
            localStorage.removeItem("auth_user");
            localStorage.removeItem("userId");
            localStorage.removeItem("userRole");
            localStorage.removeItem("userEmail");
          }
        },
      );

      authListener = data || { subscription: null };
    } catch (error) {
      console.error("Error setting up auth listener:", error);
    }

    return () => {
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  // Check if user is admin based on role or email
  const isAdmin =
    userRole === "Admin" ||
    (isAuthenticated && userEmail === "divatranssoetta@gmail.com");

  return {
    isAuthenticated,
    userRole,
    userId,
    userEmail,
    isLoading,
    signOut,
    isAdmin,
  };
}

// Also export as default for backward compatibility
export default useAuth;
