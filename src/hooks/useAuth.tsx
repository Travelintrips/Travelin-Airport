import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

// Define the hook as a function declaration for Fast Refresh compatibility
function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Function to fetch user role from database
  const fetchUserRole = async (userId: string): Promise<string | null> => {
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
      console.log("🔄 Starting signOut process...");

      // Update state first
      console.log("🔄 Updating authentication state...");
      setIsAuthenticated(false);
      setUserRole(null);
      setUserId(null);
      setUserEmail(null);

      // Clear localStorage data
      console.log("🗑️ Clearing localStorage data...");
      localStorage.clear(); // Use clear() to remove ALL items

      // Call Supabase signOut last
      console.log("🔄 Calling supabase.auth.signOut()...");
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("❌ Supabase signOut error:", error);
        // Continue even if there's an error with Supabase signOut
      } else {
        console.log("✅ Supabase signOut successful");
      }

      // If redirectToHome is true, redirect to home
      if (redirectToHome) {
        console.log("🔄 Redirecting to home page...");
        // Use a longer timeout to ensure state updates have time to process
        setTimeout(() => {
          window.location.href = "/";
        }, 800);
      } else {
        // Force page reload to update UI even if not redirecting
        console.log("🔄 Reloading page to update UI...");
        // Use a longer timeout to ensure state updates have time to process
        setTimeout(() => {
          window.location.reload();
        }, 800);
      }

      return true;
    } catch (error) {
      console.error("❌ Error in signOut function:", error);
      // Force reload even on error as a fallback
      setTimeout(() => {
        window.location.href = "/";
      }, 100);
      return false;
    }
  };

  const checkAuth = async () => {
    try {
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
            return;
          }
        } catch (e) {
          console.error("Error parsing auth_user from localStorage:", e);
        }
      }

      // Jika tidak ada di localStorage, cek session Supabase
      const { data } = await supabase.auth.getSession();
      if (data?.session) {
        const session = data.session;
        setIsAuthenticated(true);
        setUserId(session.user.id);
        setUserEmail(session.user.email || null);

        const storedRole = localStorage.getItem("userRole");
        if (storedRole) {
          setUserRole(storedRole);
        } else {
          const role = await fetchUserRole(session.user.id);
          if (role) {
            localStorage.setItem("userRole", role);
            setUserRole(role);
          }
        }

        const userName =
          session.user.user_metadata?.full_name ||
          session.user.email?.split("@")[0] ||
          "User";

        const userData = {
          id: session.user.id,
          role: storedRole || userRole || "Customer",
          email: session.user.email || "",
          name: userName,
        };
        localStorage.setItem("userName", userName);
        localStorage.setItem("auth_user", JSON.stringify(userData));
        localStorage.setItem("userId", session.user.id);
        if (session.user.email) {
          localStorage.setItem("userEmail", session.user.email);
        }
      }
    } catch (error) {
      console.error("Error checking auth:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Jalankan sekali saat mount
  useEffect(() => {
    checkAuth();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth state changed:", event);

        if (event === "SIGNED_IN" && session) {
          await checkAuth(); // 🔁 sinkronisasi ulang setelah login
        }

        if (event === "SIGNED_OUT") {
          localStorage.clear();
          setIsAuthenticated(false);
          setUserRole(null);
          setUserId(null);
          setUserEmail(null);
        }
      },
    );

    return () => {
      listener?.subscription?.unsubscribe?.();
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
    checkAuth,
  };
}

// Export the hook as the default export only
export default useAuth;
