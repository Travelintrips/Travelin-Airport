import React from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronDown,
  User,
  BookOpen,
  LayoutDashboard,
  LogOut,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const UserDropdown = () => {
  const {
    userRole: role,
    signOut,
    isAdmin,
    isLoading,
    userEmail,
    userName: authUserName,
    isAuthenticated,
  } = useAuth();

  const navigate = useNavigate();

  // Show loading only for a brief moment with timeout
  const [showLoading, setShowLoading] = React.useState(true);

  React.useEffect(() => {
    if (isLoading) {
      // Set a timeout to stop showing loading after 5 seconds
      const timeout = setTimeout(() => {
        setShowLoading(false);
      }, 5000);

      return () => clearTimeout(timeout);
    } else {
      setShowLoading(false);
    }
  }, [isLoading]);

  // Don't render if not authenticated and not loading
  if (!isAuthenticated && !isLoading && !showLoading) {
    return null;
  }

  // Show loading state
  if (isLoading && showLoading) {
    return (
      <Button
        variant="ghost"
        className="flex items-center gap-2 text-white opacity-70"
      >
        Loading...
      </Button>
    );
  }

  // If not authenticated after loading is complete, don't render
  if (!isAuthenticated) {
    return null;
  }

  // Simplified userName resolution
  const userName =
    authUserName ||
    localStorage.getItem("userName") ||
    (userEmail ? userEmail.split("@")[0] : "User");

  // Simplified admin check
  const effectiveIsAdmin =
    isAdmin || localStorage.getItem("isAdmin") === "true";
  const displayRole = effectiveIsAdmin ? "Admin" : role || "Customer";

  const handleLogout = async () => {
    try {
      const result = await signOut();

      // ✅ Tambahan fallback manual reload jika signOut tidak memicu reload
      setTimeout(() => {
        console.log("[UserDropdown] Fallback reload triggered.");
        window.location.href = window.location.origin;
      }, 100);
    } catch (error) {
      console.error("[UserDropdown] Error during logout:", error);

      // ⛑️ Fallback jika signOut gagal total
      window.location.href = window.location.origin;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-2 text-white hover:bg-transparent hover:text-white"
        >
          <span>
            {userName} ({displayRole})
          </span>

          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={() => handleNavigate("/profile")}>
          <User className="mr-2 h-4 w-4" />
          <span>My Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleNavigate("/bookings")}>
          <BookOpen className="mr-2 h-4 w-4" />
          <span>My Bookings</span>
        </DropdownMenuItem>
        {effectiveIsAdmin && (
          <DropdownMenuItem onClick={() => handleNavigate("/admin")}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            <span>Dashboard Admin</span>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserDropdown;
