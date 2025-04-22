import React, { useState, useEffect } from "react";
import {
  useLocation,
  Navigate,
  useParams,
  useNavigate,
} from "react-router-dom";
import BookingForm from "../components/booking/BookingForm";
import { Card } from "../components/ui/card";
import { supabase } from "@/lib/supabase";

export default function BookingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();
  const { selectedVehicle } = location.state || {};

  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [vehicle, setVehicle] = useState(selectedVehicle || null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is authenticated
  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      setIsAuthenticated(!!data.session);
      setIsLoading(false);
    };
    checkAuth();
  }, []);

  // Fetch vehicle data if not provided in location state
  useEffect(() => {
    const fetchVehicle = async () => {
      if (!selectedVehicle && (params.vehicle_id || params.model_name)) {
        setIsLoading(true);
        try {
          let query = supabase.from("vehicles").select("*");

          if (params.vehicle_id) {
            query = query.eq("id", params.vehicle_id);
          } else if (params.model_name) {
            query = query.eq("model", params.model_name);
          }

          const { data, error } = await query.single();

          if (error) throw error;
          if (data) {
            setVehicle(data);
            console.log("Vehicle data fetched successfully:", data);
          } else {
            setError("Vehicle not found");
          }
        } catch (err) {
          console.error("Error fetching vehicle:", err);
          setError("Failed to load vehicle details");
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchVehicle();
  }, [params.vehicle_id, params.model_name, selectedVehicle]);

  // Redirect to login if not authenticated
  if (isAuthenticated === false) {
    return (
      <Navigate
        to="/"
        state={{
          returnPath: location.pathname,
          returnState: { selectedVehicle: vehicle },
        }}
      />
    );
  }

  // Show loading state
  if (isLoading || isAuthenticated === null) {
    return (
      <div className="container mx-auto py-8 px-4 text-center">
        <h1 className="text-3xl font-bold mb-6">Book a Car</h1>
        <div className="p-6 bg-white shadow-md rounded-md">
          <p className="text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-6">Book a Car</h1>
        <Card className="p-6 bg-white shadow-md">
          <div className="text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
            >
              Go Back
            </button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Book a Car</h1>
      <Card className="p-6 bg-white shadow-md">
        {vehicle ? <BookingForm selectedVehicle={vehicle} /> : <BookingForm />}
      </Card>
    </div>
  );
}
