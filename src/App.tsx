import React, { Suspense, lazy } from "react";
import ProfilePage from "./pages/ProfilePage";
import BookingsPage from "./pages/BookingsPage";
import ApiSettings from "./components/admin/ApiSettings";
import PriceKMManagement from "./components/admin/PriceKMManagement";
import PriceBaggage from "./components/admin/PriceBaggage";
import PaymentMethodsManagement from "./components/admin/PaymentMethodsManagement";
import BaggageBookingManagement from "./components/admin/BaggageBookingManagement";
import ChartManagement from "./components/admin/ChartManagement";
import { Toaster } from "@/components/ui/toaster";
import {
  useRoutes,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import AirportTransferPreview from "./pages/AirportTransferPreview";
import DamagePaymentForm from "./components/payment/DamagePaymentForm";
import routes from "tempo-routes";
import RentCar from "./components/RentCar";
import TravelPage from "./pages/TravelPage";
import ModelDetailPage from "./pages/ModelDetailPage";
import PaymentDetailsPage from "./pages/PaymentDetailsPage";
import PaymentFormPage from "./pages/PaymentFormPage";
import BookingPage from "./pages/BookingPage";
import NewBookingPage from "./pages/NewBookingPage";
import BookingForm from "./components/booking/BookingForm";
import ShoppingCart from "./components/booking/ShoppingCart";
import AdminDashboard from "./components/admin/AdminDashboard";
import AdminLayout from "./components/admin/AdminLayout";
import StaffPage from "./components/admin/StaffPage";
import CustomerManagement from "./components/admin/CustomerManagement";
import DriverManagement from "./components/admin/DriverManagement";
import CarsManagement from "./components/admin/CarsManagement";
import Payments from "./components/admin/Payments";
import BookingManagement from "./components/admin/BookingManagement";
import BookingManagementConnected from "./components/admin/BookingManagementConnected";
import InspectionManagement from "./components/admin/InspectionManagement";
import ChecklistManagement from "./components/admin/ChecklistManagement";
import DamageManagement from "./components/admin/DamageManagement";
import VehicleInventory from "./components/admin/VehicleInventory";
import AirportTransferManagement from "./components/admin/AirportTransferManagement";
import AirportTransferPage from "./pages/AirportTransferPage";
import AirportBaggage from "./pages/AirportBaggage";
import DriverMitraPage from "./pages/DriverMitraPage";
import DriverPerusahaanPage from "./pages/DriverPerusahaanPage";
import DriverProfile from "./components/DriverProfile";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ShoppingCartProvider } from "@/hooks/useShoppingCart";
import HotelsPage from "./pages/HotelsPage";
import FlightsPage from "./pages/FlightsPage";
import TrainsPage from "./pages/TrainsPage";
import BusPage from "./pages/BusPage";
import ActivitiesPage from "./pages/ActivitiesPage";

declare global {
  interface Window {
    __TEMPO_ROUTES__?: any[];
  }
}

const ROLES = {
  ADMIN: "Admin",
  STAFF: "Staff",
  STAFF_TRIPS: "Staff Trips",
  CUSTOMER: "Customer",
  DRIVER_MITRA: "Driver Mitra",
  DRIVER_PERUSAHAAN: "Driver Perusahaan",
};

function AppContent() {
  const { isAuthenticated, userRole, isLoading, userEmail, isAdmin } =
    useAuth();

  console.log("App.tsx - Current auth state:", {
    isAuthenticated,
    userRole,
    isAdmin,
  });
  const navigate = useNavigate();

  // isAdmin is now directly provided by the useAuth hook
  // No need to recompute it here

  React.useEffect(() => {
    if (isAuthenticated && !isLoading) {
      const currentPath = window.location.pathname;

      // Debug output to help diagnose issues
      console.log("Current authentication state:", {
        isAuthenticated,
        userRole,
        isAdmin,
        userEmail,
        currentPath,
      });

      // Check if user is admin either by role or isAdmin flag
      if (userRole === ROLES.ADMIN || isAdmin) {
        console.log("Admin user detected, redirecting to admin dashboard");
        // Always redirect admin users to admin dashboard if they're not already there
        if (!currentPath.includes("/admin")) {
          // Use navigate with replace: true to prevent back button issues
          navigate("/admin", { replace: true });
        }
      } else if (userRole === ROLES.STAFF_TRIPS || userRole === ROLES.STAFF) {
        // Hanya block redirect kalau sekarang sudah di home page ("/")
        if (currentPath === "/" || currentPath === "/home") {
          // ✅ Stay di TravelPage, tidak redirect
        } else {
          // ✅ Kalau login di /auth atau dimanapun selain "/" atau "/home", langsung redirect ke sub-account
          window.location.href =
            "https://priceless-moore1-lbkq9.view-3.tempo-dev.app/sub-account";
        }
      } else if (userRole === ROLES.DRIVER_PERUSAHAAN) {
        navigate("/driver-profile");
      }
    }
  }, [isAuthenticated, isLoading, userRole, isAdmin, userEmail, navigate]);

  const ProtectedRoute = ({
    children,
    requiredRole,
    allowedRoles,
  }: {
    children: JSX.Element;
    requiredRole?: string;
    allowedRoles?: string[];
  }) => {
    if (isLoading) {
      return <div>Loading...</div>;
    }

    // Special case for admin - check both isAdmin flag and userRole
    // This ensures that users with admin emails or admin roles can access admin routes
    if (isAdmin || userRole === ROLES.ADMIN) {
      console.log("Admin access granted via isAdmin flag or Admin role");
      return children;
    }

    if (!isAuthenticated) {
      console.log("Not authenticated, redirecting to home");
      return <Navigate to="/" />;
    }

    console.log("Protected route check:", {
      userRole,
      requiredRole,
      allowedRoles,
      isAdmin,
    });

    if (requiredRole && userRole !== requiredRole) {
      console.log(
        `Access denied: User role ${userRole} does not match required role ${requiredRole}`,
      );
      return <Navigate to="/" />;
    }

    if (allowedRoles && !allowedRoles.includes(userRole || "")) {
      console.log(
        `Access denied: User role ${userRole} is not in allowed roles [${allowedRoles.join(", ")}]`,
      );
      return <Navigate to="/" />;
    }

    return children;
  };

  React.useEffect(() => {
    if (!isAuthenticated && !isLoading && sessionStorage.getItem("loggedOut")) {
      console.log("[App.tsx] Detected logout flag, clearing and reloading");
      sessionStorage.removeItem("loggedOut");
      window.location.replace("/"); // ⬅️ lebih baik daripada reload untuk reset state + cache
    }
  }, [isAuthenticated, isLoading]);

  return (
    <ShoppingCartProvider>
      <div className="min-h-screen w-full">
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-screen">
              <p>Loading...</p>
            </div>
          }
        >
          {import.meta.env.VITE_TEMPO ? (
            <>
              <Routes>
                {/* Payment form route - only accessible from cart */}
                <Route path="/payment/form/:id" element={<PaymentFormPage />} />
                <Route
                  path="/payment/form/:id/*"
                  element={<PaymentFormPage />}
                />
                <Route path="/payment/:id" element={<PaymentDetailsPage />} />
                <Route
                  path="/damage-payment/:bookingId"
                  element={<DamagePaymentForm />}
                />
                <Route
                  path="damage-payment/:bookingId"
                  element={<DamagePaymentForm />}
                />

                <Route index element={<TravelPage />} />
                <Route path="/home" element={<RentCar />} />
                <Route path="/sub-account" element={<TravelPage />} />
                <Route path="/rentcar" element={<RentCar />} />
                <Route
                  path="/models/:modelName"
                  element={<ModelDetailPage />}
                />
                <Route
                  path="/models/:modelName/*"
                  element={<ModelDetailPage />}
                />
                <Route path="/booking" element={<BookingPage />} />
                <Route path="/booking/:vehicle_id" element={<BookingPage />} />
                <Route path="/booking/:vehicleId" element={<BookingForm />} />
                <Route
                  path="/booking/model/:model_name"
                  element={<BookingPage />}
                />
                <Route
                  path="/airport-transfer"
                  element={<AirportTransferPage />}
                />
                <Route
                  path="/airport-preview/:previewCode"
                  element={<AirportTransferPreview />}
                />
                <Route path="/baggage" element={<AirportBaggage />} />
                <Route path="/cart" element={<ShoppingCart />} />
                <Route path="/driver-mitra" element={<DriverMitraPage />} />
                <Route
                  path="/driver-perusahaan"
                  element={<DriverPerusahaanPage />}
                />
                <Route path="/driver-profile" element={<DriverProfile />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/bookings" element={<BookingsPage />} />
                <Route path="/hotels" element={<HotelsPage />} />
                <Route path="/flights" element={<FlightsPage />} />
                <Route path="/trains" element={<TrainsPage />} />
                <Route path="/bus-travel" element={<BusPage />} />
                <Route path="/things-to-do" element={<ActivitiesPage />} />

                <Route
                  path="/new-booking"
                  element={
                    <ProtectedRoute
                      allowedRoles={[
                        ROLES.ADMIN,
                        ROLES.STAFF,
                        ROLES.STAFF_TRIPS,
                      ]}
                    >
                      <NewBookingPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute
                      allowedRoles={[
                        ROLES.ADMIN,
                        ROLES.STAFF,
                        ROLES.STAFF_TRIPS,
                      ]}
                    >
                      <AdminLayout />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/*"
                  element={
                    <ProtectedRoute
                      allowedRoles={[
                        ROLES.ADMIN,
                        ROLES.STAFF,
                        ROLES.STAFF_TRIPS,
                      ]}
                    >
                      <AdminLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route path="api-settings" element={<ApiSettings />} />
                  <Route path="price-km" element={<PriceKMManagement />} />
                  <Route path="price-baggage" element={<PriceBaggage />} />
                  <Route
                    path="payment-methods"
                    element={<PaymentMethodsManagement />}
                  />
                  <Route
                    path="baggage-booking"
                    element={<BaggageBookingManagement />}
                  />
                  <Route path="chart" element={<ChartManagement />} />
                  <Route
                    path="damage-payment/:bookingId"
                    element={<DamagePaymentForm />}
                  />
                  <Route index element={<AdminDashboard />} />
                  <Route path="dashboard" element={<AdminDashboard />} />
                  <Route path="customers" element={<CustomerManagement />} />
                  <Route path="drivers" element={<DriverManagement />} />
                  <Route path="cars" element={<CarsManagement />} />
                  <Route path="payments" element={<Payments />} />
                  <Route
                    path="bookings"
                    element={<BookingManagementConnected />}
                  />
                  <Route path="staff" element={<StaffPage />} />
                  <Route
                    path="inspections"
                    element={<InspectionManagement />}
                  />
                  <Route path="checklist" element={<ChecklistManagement />} />
                  <Route path="damages" element={<DamageManagement />} />
                  <Route
                    path="vehicle-inventory"
                    element={<VehicleInventory />}
                  />
                  <Route
                    path="airport-transfer"
                    element={<AirportTransferManagement />}
                  />
                </Route>

                <Route path="/tempobook/*" element={<div />} />

                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </>
          ) : (
            <Routes>
              <Route
                path="/airport-preview/:previewCode"
                element={<AirportTransferPreview />}
              />

              <Route path="/payment/form/:id" element={<PaymentFormPage />} />
              <Route path="/payment/form/:id/*" element={<PaymentFormPage />} />
              <Route path="/payment/:id" element={<PaymentDetailsPage />} />
              <Route
                path="/damage-payment/:bookingId"
                element={<DamagePaymentForm />}
              />
              <Route
                path="damage-payment/:bookingId"
                element={<DamagePaymentForm />}
              />

              <Route path="/" element={<TravelPage />} />
              <Route path="/home" element={<RentCar />} />
              <Route path="/sub-account" element={<TravelPage />} />
              <Route path="/rentcar" element={<RentCar />} />
              <Route path="/models/:modelName" element={<ModelDetailPage />} />
              <Route
                path="/models/:modelName/*"
                element={<ModelDetailPage />}
              />
              <Route path="/booking" element={<BookingPage />} />
              <Route path="/booking/:vehicle_id" element={<BookingPage />} />
              <Route path="/booking/:vehicleId" element={<BookingForm />} />
              <Route
                path="/booking/model/:model_name"
                element={<BookingPage />}
              />
              <Route
                path="/airport-transfer"
                element={<AirportTransferPage />}
              />
              <Route path="/baggage" element={<AirportBaggage />} />
              <Route path="/cart" element={<ShoppingCart />} />
              <Route path="/driver-mitra" element={<DriverMitraPage />} />
              <Route
                path="/driver-perusahaan"
                element={<DriverPerusahaanPage />}
              />
              <Route path="/driver-profile" element={<DriverProfile />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/bookings" element={<BookingsPage />} />
              <Route path="/hotels" element={<HotelsPage />} />
              <Route path="/flights" element={<FlightsPage />} />
              <Route path="/trains" element={<TrainsPage />} />
              <Route path="/bus-travel" element={<BusPage />} />
              <Route path="/things-to-do" element={<ActivitiesPage />} />
              <Route
                path="/new-booking"
                element={
                  <ProtectedRoute
                    allowedRoles={[ROLES.ADMIN, ROLES.STAFF, ROLES.STAFF_TRIPS]}
                  >
                    <NewBookingPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin"
                element={
                  <ProtectedRoute
                    allowedRoles={[ROLES.ADMIN, ROLES.STAFF, ROLES.STAFF_TRIPS]}
                  >
                    <AdminLayout />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/*"
                element={
                  <ProtectedRoute
                    allowedRoles={[ROLES.ADMIN, ROLES.STAFF, ROLES.STAFF_TRIPS]}
                  >
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<AdminDashboard />} />
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="customers" element={<CustomerManagement />} />
                <Route path="drivers" element={<DriverManagement />} />
                <Route path="cars" element={<CarsManagement />} />
                <Route path="payments" element={<Payments />} />
                <Route
                  path="bookings"
                  element={<BookingManagementConnected />}
                />
                <Route path="staff" element={<StaffPage />} />
                <Route path="inspections" element={<InspectionManagement />} />
                <Route path="checklist" element={<ChecklistManagement />} />
                <Route path="damages" element={<DamageManagement />} />
                <Route
                  path="vehicle-inventory"
                  element={<VehicleInventory />}
                />
                <Route
                  path="airport-transfer"
                  element={<AirportTransferManagement />}
                />
                <Route path="api-settings" element={<ApiSettings />} />
                <Route path="price-km" element={<PriceKMManagement />} />
                <Route
                  path="payment-methods"
                  element={<PaymentMethodsManagement />}
                />
                <Route
                  path="baggage-booking"
                  element={<BaggageBookingManagement />}
                />
                <Route path="chart" element={<ChartManagement />} />
                <Route
                  path="damage-payment/:bookingId"
                  element={<DamagePaymentForm />}
                />
              </Route>

              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          )}
        </Suspense>
        <Toaster />
      </div>
    </ShoppingCartProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
