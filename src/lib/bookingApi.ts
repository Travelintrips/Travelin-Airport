import { supabase } from "./supabase";
import type { Database } from "@/types/supabase";
import { sendNewBooking } from "@/api/sendNewBooking";

type Booking = Database["public"]["Tables"]["bookings"]["Row"];
type BookingInsert = Database["public"]["Tables"]["bookings"]["Insert"];
type BookingUpdate = Database["public"]["Tables"]["bookings"]["Update"];

/**
 * Send booking to external API
 */
export async function sendNewBooking(bookingData: any) {
  try {
    const response = await fetch(
      "https://appserverv2.travelincars.com/api/new-booking.php",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pickup_datetime: bookingData.pickup_datetime || "2025-05-27 15:00:00",
          pickup_address:
            bookingData.pickup_address || "soekarno hatta airport",
          pickup_long: bookingData.pickup_long || "106.6571842",
          pickup_lat: bookingData.pickup_lat || "-6.1286371",
          dropoff_address:
            bookingData.dropoff_address || "soekarno hatta airport1",
          dropoff_long: bookingData.dropoff_long || "106.6571842",
          dropoff_lat: bookingData.dropoff_lat || "-6.1286371",
          estimated_cost: String(bookingData.estimated_cost || "100000"),
          ride_id: String(bookingData.ride_id || "1"),
          customer_name: bookingData.customer_name || "customer_name",
          customer_phone: bookingData.customer_phone || "08912345678",
          driver_id: String(bookingData.id_driver || "2"),
        }),
      },
    );

    const result = await response.json();
    return { data: result, error: null };
  } catch (error) {
    console.error("Error sending booking to external API:", error);
    return { data: null, error };
  }
}

/**
 * Create a new booking
 */
export async function createBooking(bookingData: BookingInsert) {
  // Insert booking ke tabel airport_transfer
  const { data, error } = await supabase
    .from("airport_transfer")
    .insert([bookingData])
    .select(); // atau .single() jika hanya 1 data

  if (error) {
    console.error("Error creating booking:", error.message);
    return { error };
  }

  // Jika berhasil, kirim ke API eksternal
  if (data && data.length > 0) {
    const externalData = {
      pickup_datetime: `${bookingData.pickup_date} ${bookingData.pickup_time}:00`,
      pickup_address: bookingData.pickup_location,
      pickup_long: String(bookingData.fromLocation?.[1] || "106.6571842"),
      pickup_lat: String(bookingData.fromLocation?.[0] || "-6.1286371"),
      dropoff_address: bookingData.dropoff_location,
      dropoff_long: String(bookingData.toLocation?.[1] || "106.6571842"),
      dropoff_lat: String(bookingData.toLocation?.[0] || "-6.1286371"),
      estimated_cost: String(bookingData.price || "100000"),
      ride_id: "1",
      customer_name: bookingData.customer_name,
      customer_phone: bookingData.phone,
      driver_id: bookingData.driver_id ? String(bookingData.driver_id) : "0",
    };

    try {
      await sendNewBooking(externalData); // kirim ke API eksternal
    } catch (err) {
      console.error("Failed to send to external API:", err);
    }
  }

  return { data };
}

/**
 * Get bookings with optional filters
 */
export async function getBookings(params?: {
  id?: number;
  vehicle_id?: number;
  status?: string;
}) {
  const queryParams = new URLSearchParams();

  if (params?.id) queryParams.append("id", params.id.toString());
  if (params?.vehicle_id)
    queryParams.append("vehicle_id", params.vehicle_id.toString());
  if (params?.status) queryParams.append("status", params.status);

  return await supabase.functions.invoke("supabase-functions-get-booking", {
    queryParams,
  });
}

/**
 * Get a single booking by ID
 */
export async function getBookingById(id: number) {
  return await getBookings({ id });
}

/**
 * Update an existing booking
 */
export async function updateBooking(id: number, updateData: BookingUpdate) {
  return await supabase.functions.invoke("supabase-functions-update-booking", {
    body: { id, ...updateData },
  });
}

/**
 * Delete a booking
 */
export async function deleteBooking(id: number) {
  const queryParams = new URLSearchParams();
  queryParams.append("id", id.toString());

  return await supabase.functions.invoke("supabase-functions-delete-booking", {
    queryParams,
  });
}
