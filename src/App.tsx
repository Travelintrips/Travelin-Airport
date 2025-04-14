import React, { Suspense, useEffect, useState } from "react";
import {
  useRoutes,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import DamagePaymentForm from "./components/payment/DamagePaymentForm";
// Import routes dynamically to avoid initialization issues
const routes = import.meta.env.VITE_TEMPO ? window.__TEMPO_ROUTES__ || [] : [];
import Home from "./components/home";
import PaymentDetailsPage from "./pages/PaymentDetailsPage";
import PaymentFormPage from "./pages/PaymentFormPage";
import BookingPage from "./pages/BookingPage";
import AdminDashboard from "./components/admin/AdminDashboard";
import AdminLayout from "./components/admin/AdminLayout";
import StaffPage from "./components/admin/StaffPage";
import CustomerManagement from "./components/admin/CustomerManagement";
import DriverManagement from "./components/admin/DriverManagement";
import CarsManagement from "./components/admin/CarsManagement";
import Payments from "./components/admin/Payments";
import BookingManagement from "./components/admin/BookingManagement";
import InspectionManagement from "./components/admin/InspectionManagement";
import ChecklistManagement from "./components/admin/ChecklistManagement";
import DamageManagement from "./components/admin/DamageManagement";
import VehicleInventory from "./components/admin/VehicleInventory";
import { supabase } from "./lib/supabase";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setIsAuthenticated(true);
        const storedRole = localStorage.getItem("userRole");
        setUserRole(storedRole);
      }
      setIsLoading(false);
    };

    checkAuth();

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_IN" && session) {
          setIsAuthenticated(true);
          const storedRole = localStorage.getItem("userRole");
          setUserRole(storedRole);
        } else if (event === "SIGNED_OUT") {
          setIsAuthenticated(false);
          setUserRole(null);
        }
      },
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Protected route component
  const ProtectedRoute = ({
    children,
    requiredRole,
  }: {
    children: JSX.Element;
    requiredRole?: string;
  }) => {
    if (isLoading) {
      return <div>Loading...</div>;
    }

    if (!isAuthenticated) {
      return <Navigate to="/" />;
    }

    if (requiredRole && userRole !== requiredRole) {
      return <Navigate to="/" />;
    }

    return children;
  };

  return (
    <div>
      <Suspense fallback={<p>Loading...</p>}>
        {/* Conditionally render either tempoRoutes or manual Routes */}
        {import.meta.env.VITE_TEMPO ? (
          <>
            {/* Import tempo-routes dynamically to avoid initialization issues */}
            {Array.isArray(routes) && useRoutes(routes)}

            <Routes>
              {/* Payment Routes - Define these first for higher priority */}
              <Route path="/payment/form/:id" element={<PaymentFormPage />} />
              <Route path="/payment/form/:id/*" element={<PaymentFormPage />} />
              <Route path="/payment/:id" element={<PaymentDetailsPage />} />
              <Route
                path="/damage-payment/:bookingId"
                element={<DamagePaymentForm />}
              />

              <Route path="/" element={<Home />} />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute requiredRole="Admin">
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<AdminDashboard />} />
                <Route path="customers" element={<CustomerManagement />} />
                <Route path="drivers" element={<DriverManagement />} />
                <Route path="cars" element={<CarsManagement />} />
                <Route path="payments" element={<Payments />} />
                <Route path="bookings" element={<BookingManagement />} />
                <Route path="staff" element={<StaffPage />} />
                <Route path="inspections" element={<InspectionManagement />} />
                <Route path="checklist" element={<ChecklistManagement />} />
                <Route path="damages" element={<DamageManagement />} />
                <Route
                  path="vehicle-inventory"
                  element={<VehicleInventory />}
                />
              </Route>

              {/* Allow Tempo routes to capture /tempobook paths */}
              <Route path="/tempobook/*" />
            </Routes>
          </>
        ) : (
          <Routes>
            {/* Payment Routes - Define these first for higher priority */}
            <Route path="/payment/form/:id" element={<PaymentFormPage />} />
            <Route path="/payment/form/:id/*" element={<PaymentFormPage />} />
            <Route path="/payment/:id" element={<PaymentDetailsPage />} />
            <Route
              path="/damage-payment/:bookingId"
              element={<DamagePaymentForm />}
            />

            <Route path="/" element={<Home />} />
            <Route index element={<Home />} />
            <Route path="/booking" element={<BookingPage />} />

            <Route
              path="/admin"
              element={
                <ProtectedRoute requiredRole="Admin">
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="customers" element={<CustomerManagement />} />
              <Route path="drivers" element={<DriverManagement />} />
              <Route path="cars" element={<CarsManagement />} />
              <Route path="payments" element={<Payments />} />
              <Route path="bookings" element={<BookingManagement />} />
              <Route path="staff" element={<StaffPage />} />
              <Route path="inspections" element={<InspectionManagement />} />
              <Route path="checklist" element={<ChecklistManagement />} />
              <Route path="damages" element={<DamageManagement />} />
              <Route path="vehicle-inventory" element={<VehicleInventory />} />
            </Route>

            {/* Catch-all route */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        )}
      </Suspense>
    </div>
  );
}

export default App;
