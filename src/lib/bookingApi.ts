import { supabase } from "./supabase";
import type { Database } from "@/types/supabase";

type Booking = Database["public"]["Tables"]["bookings"]["Row"];
type BookingInsert = Database["public"]["Tables"]["bookings"]["Insert"];
type BookingUpdate = Database["public"]["Tables"]["bookings"]["Update"];

/**
 * Create a new booking
 */
export async function createBooking(bookingData: BookingInsert) {
  return await supabase.functions.invoke("supabase-functions-create-booking", {
    body: bookingData,
  });
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
