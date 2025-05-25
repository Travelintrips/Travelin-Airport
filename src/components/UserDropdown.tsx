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
import { useAuth } from "@/hooks/useAuth";

const UserDropdown = () => {
  const {
    role,
    signOut,
    isAdmin,
    isLoading,
    userEmail,
    userName: authUserName,
  } = useAuth();
  console.log("UserDropdown debug", {
    isLoading,
    authUserName,
    local: localStorage.getItem("userName"),
  });

  const navigate = useNavigate();

  // Prioritize userName from useAuth hook, then localStorage, then email
  let userName: string | null = authUserName;

  if (!userName || ["user", "customer"].includes(userName.toLowerCase())) {
    const storedName = localStorage.getItem("userName");
    if (
      storedName &&
      !["user", "customer"].includes(storedName.toLowerCase())
    ) {
      userName = storedName;
    } else if (userEmail) {
      userName = userEmail.split("@")[0];
    } else {
      userName = null; // jangan paksa "User"
    }
  }

  if (!userName && !isLoading) {
    return (
      <Button
        variant="ghost"
        className="flex items-center gap-2 text-white opacity-70"
      >
        Not Logged In
      </Button>
    );
  }
  if (isLoading) {
    return (
      <Button
        variant="ghost"
        className="flex items-center gap-2 text-white opacity-70"
      >
        Loading...
      </Button>
    );
  }

  // Get isAdmin from localStorage as a backup
  const isAdminFromStorage = localStorage.getItem("isAdmin") === "true";
  const effectiveIsAdmin = isAdmin || isAdminFromStorage;

  // Ensure we're correctly displaying the role
  console.log(
    "UserDropdown - role:",
    role,
    "isAdmin:",
    isAdmin,
    "isAdminFromStorage:",
    isAdminFromStorage,
    "userName:",
    userName,
    "authUserName:",
    authUserName,
  );
  const displayRole = effectiveIsAdmin ? "Admin" : role || "Customer";

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const handleNavigate = (path: string) => {
    console.log("Navigating to:", path);
    navigate(path); // Use React Router navigate instead of direct location change
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-2 text-white hover:bg-transparent hover:text-white"
        >
          <span>
            {userName && !["user", "customer"].includes(userName.toLowerCase())
              ? userName
              : userEmail?.split("@")[0] || "Guest"}{" "}
            ({displayRole})
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
