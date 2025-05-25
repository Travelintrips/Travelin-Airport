import React from "react";
import UserDashboard from "@/components/dashboard/UserDashboard";
import { useAuth } from "@/hooks/useAuth";

const BookingsPage = () => {
  const { userEmail, userRole, userName, userId } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <UserDashboard
        userEmail={userEmail}
        userRole={userRole}
        userName={userName || "Customer"}
        activeTab="bookings"
      />
    </div>
  );
};

export default BookingsPage;
