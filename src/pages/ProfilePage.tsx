import React from "react";
import UserDashboard from "@/components/dashboard/UserDashboard";
import { useAuth } from "@/contexts/AuthContext";

const ProfilePage = () => {
  const { userEmail, userRole, userName } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <UserDashboard
        userEmail={userEmail}
        userRole={userRole}
        userName={userName || userEmail?.split("@")[0] || "Customer"}
        activeTab="profile"
      />
    </div>
  );
};

export default ProfilePage;
