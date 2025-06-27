import React, { useState, useEffect } from "react";
import UserDashboard from "@/components/dashboard/UserDashboard";
import { useAuth } from "@/contexts/AuthContext";
import AuthRequiredModal from "@/components/auth/AuthRequiredModal";

const BookingsPage = () => {
  const { userEmail, userRole, userName, userId, isAuthenticated } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      setShowAuthModal(true);
    }
  }, [isAuthenticated, userId]);

  if (!isAuthenticated || !userId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48 mx-auto mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-32 mx-auto"></div>
          </div>
        </div>
        <AuthRequiredModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <UserDashboard />
    </div>
  );
};

export default BookingsPage;
