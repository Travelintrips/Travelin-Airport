import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle,
  ArrowLeft,
  Download,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  Luggage,
  Car,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";

interface PaymentDetails {
  id: string;
  amount: number;
  payment_method: string;
  status: string;
  created_at: string;
  user_id?: string;
}

interface BookingDetails {
  booking_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  item_name?: string;
  flight_number?: string;
  baggage_size?: string;
  price: number;
  duration?: string;
  storage_location?: string;
  start_date?: string;
  end_date?: string;
  start_time?: string;
  airport?: string;
  terminal?: string;
  duration_type?: string;
  hours?: string;
  status: string;
}

const ThankYouPage: React.FC = () => {
  const { paymentId } = useParams<{ paymentId: string }>();
  const navigate = useNavigate();
  const [payment, setPayment] = useState<PaymentDetails | null>(null);
  const [bookings, setBookings] = useState<BookingDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPaymentAndBookings = async () => {
      if (!paymentId) {
        setError("Payment ID not found");
        setLoading(false);
        return;
      }

      try {
        // Fetch payment details
        const { data: paymentData, error: paymentError } = await supabase
          .from("payments")
          .select("*")
          .eq("id", paymentId)
          .single();

        if (paymentError) {
          console.error("Error fetching payment:", paymentError);
          setError("Failed to load payment details");
          return;
        }

        setPayment(paymentData);

        // Fetch related bookings
        const { data: baggageBookings, error: baggageError } = await supabase
          .from("baggage_booking")
          .select("*")
          .eq("payment_id", paymentId);

        if (baggageError) {
          console.error("Error fetching baggage bookings:", baggageError);
        }

        const { data: carBookings, error: carError } = await supabase
          .from("bookings")
          .select(
            `
            id,
            total_amount,
            start_date,
            end_date,
            pickup_time,
            driver_option,
            status,
            vehicles!bookings_vehicle_id_fkey (
              make,
              model,
              year
            )
          `,
          )
          .eq("payment_id", paymentId);

        if (carError) {
          console.error("Error fetching car bookings:", carError);
        }

        // Combine all bookings
        const allBookings: BookingDetails[] = [];

        if (baggageBookings) {
          allBookings.push(
            ...baggageBookings.map((booking) => ({
              ...booking,
              booking_id: booking.booking_id || booking.id,
            })),
          );
        }

        if (carBookings) {
          allBookings.push(
            ...carBookings.map((booking) => {
              const vehicle = booking.vehicles as any;
              return {
                booking_id: booking.id.toString(),
                customer_name: paymentData.user_id ? "Customer" : "Guest",
                customer_email: "",
                customer_phone: "",
                item_name: `${vehicle?.make || "Unknown"} ${vehicle?.model || "Vehicle"} ${vehicle?.year ? `(${vehicle.year})` : ""}`,
                price: booking.total_amount,
                start_date: booking.start_date,
                end_date: booking.end_date,
                start_time: booking.pickup_time,
                status: booking.status,
              };
            }),
          );
        }

        setBookings(allBookings);
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("Failed to load order details");
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentAndBookings();
  }, [paymentId]);

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case "credit_card":
        return "Credit Card";
      case "bank_transfer":
        return "Bank Transfer";
      case "cash":
        return "Cash";
      case "paylabs":
        return "Paylabs";
      default:
        return method;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case "confirmed":
      case "paid":
        return "default";
      case "pending":
        return "secondary";
      case "cancelled":
        return "destructive";
      default:
        return "outline";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Order Not Found
          </h1>
          <p className="text-gray-600 mb-6">
            {error || "Unable to load order details"}
          </p>
          <Button
            onClick={() => navigate("/")}
            className="bg-green-600 hover:bg-green-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="bg-green-100 p-4 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Payment Successful!
            </h1>
            <p className="text-lg text-gray-600">
              Thank you for your order. Your booking has been confirmed.
            </p>
          </div>

          {/* Payment Summary */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Payment Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Payment ID</p>
                  <p className="font-medium">{payment.id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Payment Method</p>
                  <p className="font-medium">
                    {getPaymentMethodLabel(payment.payment_method)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Amount</p>
                  <p className="font-semibold text-lg text-green-600">
                    {formatCurrency(payment.amount)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Payment Date</p>
                  <p className="font-medium">
                    {new Date(payment.created_at).toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <Badge
                  variant={getStatusBadgeVariant(payment.status)}
                  className="text-sm"
                >
                  {payment.status.charAt(0).toUpperCase() +
                    payment.status.slice(1)}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Booking Details */}
          {bookings.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Luggage className="h-5 w-5" />
                  Booking Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {bookings.map((booking, index) => (
                    <div
                      key={booking.booking_id}
                      className="border-b border-gray-200 pb-6 last:border-b-0"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-semibold text-lg">
                            {booking.item_name || "Service Booking"}
                          </h3>
                          <p className="text-sm text-gray-600">
                            Booking ID: {booking.booking_id}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-lg">
                            {formatCurrency(booking.price)}
                          </p>
                          <Badge
                            variant={getStatusBadgeVariant(booking.status)}
                            className="text-xs"
                          >
                            {booking.status}
                          </Badge>
                        </div>
                      </div>

                      {/* Customer Information */}
                      {booking.customer_name && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-gray-500" />
                            <div>
                              <p className="text-xs text-gray-600">Customer</p>
                              <p className="text-sm font-medium">
                                {booking.customer_name}
                              </p>
                            </div>
                          </div>
                          {booking.customer_email && (
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-gray-500" />
                              <div>
                                <p className="text-xs text-gray-600">Email</p>
                                <p className="text-sm font-medium">
                                  {booking.customer_email}
                                </p>
                              </div>
                            </div>
                          )}
                          {booking.customer_phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-gray-500" />
                              <div>
                                <p className="text-xs text-gray-600">Phone</p>
                                <p className="text-sm font-medium">
                                  {booking.customer_phone}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Booking Specific Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {booking.baggage_size && (
                          <div className="flex items-center gap-2">
                            <Luggage className="h-4 w-4 text-gray-500" />
                            <div>
                              <p className="text-xs text-gray-600">
                                Baggage Size
                              </p>
                              <p className="text-sm font-medium">
                                {booking.baggage_size.charAt(0).toUpperCase() +
                                  booking.baggage_size.slice(1)}
                              </p>
                            </div>
                          </div>
                        )}
                        {booking.airport && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-gray-500" />
                            <div>
                              <p className="text-xs text-gray-600">Airport</p>
                              <p className="text-sm font-medium">
                                {booking.airport}
                              </p>
                            </div>
                          </div>
                        )}
                        {booking.terminal && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-gray-500" />
                            <div>
                              <p className="text-xs text-gray-600">Terminal</p>
                              <p className="text-sm font-medium">
                                {booking.terminal}
                              </p>
                            </div>
                          </div>
                        )}
                        {booking.start_date && (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-500" />
                            <div>
                              <p className="text-xs text-gray-600">
                                Start Date
                              </p>
                              <p className="text-sm font-medium">
                                {new Date(
                                  booking.start_date,
                                ).toLocaleDateString("en-US", {
                                  weekday: "short",
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })}
                              </p>
                            </div>
                          </div>
                        )}
                        {booking.start_time && (
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-500" />
                            <div>
                              <p className="text-xs text-gray-600">
                                Start Time
                              </p>
                              <p className="text-sm font-medium">
                                {booking.start_time}
                              </p>
                            </div>
                          </div>
                        )}
                        {booking.duration && (
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-500" />
                            <div>
                              <p className="text-xs text-gray-600">Duration</p>
                              <p className="text-sm font-medium">
                                {booking.duration}{" "}
                                {booking.duration_type === "days"
                                  ? "day(s)"
                                  : "hour(s)"}
                              </p>
                            </div>
                          </div>
                        )}
                        {booking.storage_location && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-gray-500" />
                            <div>
                              <p className="text-xs text-gray-600">
                                Storage Location
                              </p>
                              <p className="text-sm font-medium">
                                {booking.storage_location}
                              </p>
                            </div>
                          </div>
                        )}
                        {booking.flight_number &&
                          booking.flight_number !== "-" && (
                            <div className="flex items-center gap-2">
                              <Car className="h-4 w-4 text-gray-500" />
                              <div>
                                <p className="text-xs text-gray-600">
                                  Flight Number
                                </p>
                                <p className="text-sm font-medium">
                                  {booking.flight_number}
                                </p>
                              </div>
                            </div>
                          )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => navigate("/")}
              variant="outline"
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
            <Button
              onClick={() => navigate(`/invoice/${paymentId}`)}
              className="bg-green-600 hover:bg-green-700 flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download Invoice
            </Button>
          </div>

          {/* Contact Information */}
          <div className="text-center mt-8 p-4 bg-white rounded-lg border">
            <p className="text-sm text-gray-600 mb-2">
              Need help with your booking? Contact our support team:
            </p>
            <div className="flex justify-center items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Phone className="h-4 w-4 text-green-600" />
                <span>+62 822 9999 7227</span>
              </div>
              <div className="flex items-center gap-1">
                <Mail className="h-4 w-4 text-green-600" />
                <span>info@travelintrips.com</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThankYouPage;
