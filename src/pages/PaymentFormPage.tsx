import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PaymentForm from "@/components/payment/PaymentForm";
import { supabase } from "@/lib/supabase";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const PaymentFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<any>(null);
  const [damageAmount, setDamageAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBooking = async () => {
      if (!id) return;

      try {
        setLoading(true);
        // Try to parse the id as a number first (for numeric IDs)
        const numericId = !isNaN(Number(id)) ? Number(id) : null;

        // Query using either numeric ID or string ID (UUID)
        const { data, error } = await supabase
          .from("bookings")
          .select("*")
          .eq("id", numericId !== null ? numericId : id)
          .single();

        if (error) throw error;
        setBooking(data);

        // Fetch damage fees for this booking
        const { data: damageData, error: damageError } = await supabase
          .from("damages")
          .select("amount")
          .eq("booking_id", data.id)
          .eq("payment_status", "pending");

        if (damageError) {
          console.error("Error fetching damage fees:", damageError);
        } else {
          // Calculate total damage amount
          const totalDamage =
            damageData?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
          setDamageAmount(totalDamage);
        }
      } catch (err) {
        console.error("Error fetching booking:", err);
        setError("Failed to load booking details. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [id]);

  const handlePaymentComplete = () => {
    // Navigate back to booking details or dashboard
    navigate(`/admin/bookings`);
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex justify-center items-center h-40">
          <p>Loading booking details...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex flex-col justify-center items-center h-40 text-destructive">
          <AlertCircle className="h-8 w-8 mb-2" />
          <p>{error || "Booking not found"}</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate(-1)}
          >
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <Button variant="outline" onClick={() => navigate(-1)}>
          Back
        </Button>
      </div>

      <h1 className="text-3xl font-bold mb-6 text-center">
        Payment for Booking #{booking.id}
      </h1>

      <PaymentForm
        bookingId={booking.id}
        totalAmount={booking.total_amount}
        damageAmount={damageAmount}
        onPaymentComplete={handlePaymentComplete}
      />
    </div>
  );
};

export default PaymentFormPage;
