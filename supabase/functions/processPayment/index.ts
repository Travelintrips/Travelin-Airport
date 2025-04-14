// processPayment Edge Function
// This function processes payments and updates payment status

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.6";

// Use any type instead of importing Database type that doesn't exist
type Database = any;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ProcessPaymentRequest {
  userId: string;
  bookingId: number;
  amount: number;
  paymentMethod: string; // "Cash", "Bank Transfer", "Credit/Debit Card"
  bankName?: string;
  isPartialPayment?: boolean;
}

Deno.serve(async (req) => {
  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_KEY") || "";

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing environment variables for Supabase connection");
    }

    // Create Supabase client with admin privileges
    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const {
      userId,
      bookingId,
      amount,
      paymentMethod,
      bankName,
      isPartialPayment,
    } = await req.json();

    if (!userId || !bookingId || !amount || !paymentMethod) {
      throw new Error(
        "Missing required fields: userId, bookingId, amount, and paymentMethod are required",
      );
    }

    // Check if booking exists
    const { data: bookingData, error: bookingError } = await supabase
      .from("bookings")
      .select("id, total_amount, payment_status")
      .eq("id", bookingId)
      .single();

    if (bookingError || !bookingData) {
      throw new Error(`Booking with ID ${bookingId} not found`);
    }

    // Create payment record
    const { data: paymentData, error: paymentError } = await supabase
      .from("payments")
      .insert({
        user_id: userId,
        booking_id: bookingId,
        amount: amount,
        payment_method: paymentMethod,
        status: "completed",
        created_at: new Date().toISOString(),
        bank_name: bankName || null,
        is_partial_payment: isPartialPayment || false,
      })
      .select()
      .single();

    if (paymentError) {
      throw new Error(
        `Failed to create payment record: ${paymentError.message}`,
      );
    }

    // Determine payment status for booking
    let paymentStatus = "partial";

    // Get total payments for this booking
    const { data: totalPaymentsData, error: totalPaymentsError } =
      await supabase
        .from("payments")
        .select("amount")
        .eq("booking_id", bookingId);

    if (totalPaymentsError) {
      throw new Error(
        `Failed to fetch payment records: ${totalPaymentsError.message}`,
      );
    }

    // Calculate total paid amount
    const totalPaid = totalPaymentsData.reduce(
      (sum, payment) => sum + (payment.amount || 0),
      0,
    );

    // If total paid equals or exceeds total amount, mark as paid
    if (totalPaid >= (bookingData.total_amount || 0)) {
      paymentStatus = "paid";
    }

    // Update booking payment status
    const { data: updatedBooking, error: updateError } = await supabase
      .from("bookings")
      .update({ payment_status: paymentStatus })
      .eq("id", bookingId)
      .select();

    // Note: Damage status updates should now be handled separately

    if (updateError) {
      throw new Error(
        `Failed to update booking status: ${updateError.message}`,
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Payment processed successfully",
        data: {
          payment: paymentData,
          booking: updatedBooking,
          totalPaid: totalPaid,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      },
    );
  }
});
