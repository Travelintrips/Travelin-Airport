import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ShoppingCart as CartIcon,
  Trash2,
  CreditCard,
  Banknote,
  Smartphone,
  DollarSign,
  Loader2,
  ArrowLeft,
  Luggage,
  Plane,
  Car,
  Train,
  Hotel,
  Bus,
  MapPin,
  Compass,
} from "lucide-react";
import { useShoppingCart } from "@/hooks/useShoppingCart";
import { formatCurrency } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";

interface ShoppingCartProps {}

const ShoppingCart: React.FC<ShoppingCartProps> = () => {
  const navigate = useNavigate();
  const { isAuthenticated, userId, userEmail, userName } = useAuth();
  const {
    cartItems,
    addToCart,
    removeFromCart,
    clearCart,
    totalAmount,
    checkout,
    isLoading,
  } = useShoppingCart();
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<string>("");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [selectedBank, setSelectedBank] = useState<any | null>(null);
  const [manualBanks, setManualBanks] = useState<any[]>([]);
  const [customerData, setCustomerData] = useState({
    name: "",
    email: "",
    phone: "",
  });

  const handleRemoveItem = async (id: string) => {
    try {
      await removeFromCart(id);
      toast({
        title: "Item removed",
        description: "Item successfully removed from cart.",
      });
    } catch (error) {
      console.error("Error removing item:", error);
      toast({
        title: "Failed to remove item",
        description: "An error occurred while removing item from cart.",
        variant: "destructive",
      });
    }
  };

  const handleClearCart = async () => {
    try {
      await clearCart();
      toast({
        title: "Cart cleared",
        description: "All items successfully removed from cart.",
      });
    } catch (error) {
      console.error("Error clearing cart:", error);
      toast({
        title: "Failed to clear cart",
        description: "An error occurred while clearing the cart.",
        variant: "destructive",
      });
    }
  };

  const handleCheckout = () => {
    setShowCheckout(true);
    // Auto-fill customer data if user is authenticated
    if (isAuthenticated) {
      setCustomerData({
        name: userName || "",
        email: userEmail || "",
        phone: "", // Will be fetched from customer table
      });
      fetchCustomerPhone();
    }
  };

  const fetchCustomerPhone = async () => {
    if (isAuthenticated && userId) {
      try {
        const { data, error } = await supabase
          .from("customers")
          .select("phone")
          .eq("id", userId)
          .single();

        if (!error && data?.phone) {
          setCustomerData((prev) => ({ ...prev, phone: data.phone }));
        }
      } catch (error) {
        console.error("Error fetching customer data:", error);
      }
    }
  };

  const fetchManualPaymentMethods = async () => {
    try {
      const { data, error } = await supabase
        .from("payment_methods")
        .select("*")
        .eq("type", "manual");

      if (error) {
        console.error("Error fetching manual payment methods:", error);
        return;
      }

      setManualBanks(data || []);
    } catch (error) {
      console.error("Exception in fetchManualPaymentMethods:", error);
    }
  };

  // Fetch manual payment methods when bank transfer is selected
  React.useEffect(() => {
    if (selectedPaymentMethod === "bank_transfer") {
      fetchManualPaymentMethods();
    }
  }, [selectedPaymentMethod]);

  const handlePayment = async () => {
    // Validate customer data
    if (!customerData.name || !customerData.email || !customerData.phone) {
      toast({
        title: "Complete customer data",
        description: "Please complete name, email, and phone number.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedPaymentMethod) {
      toast({
        title: "Select payment method",
        description: "Please select a payment method first.",
        variant: "destructive",
      });
      return;
    }

    if (selectedPaymentMethod === "bank_transfer" && !selectedBank) {
      toast({
        title: "Select bank",
        description: "Please select a bank for transfer.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessingPayment(true);
    try {
      let paymentId = null;

      // Create payment record first
      const { data: payment, error: paymentError } = await supabase
        .from("payments")
        .insert({
          user_id: userId || null,
          amount: totalAmount,
          payment_method: selectedPaymentMethod,
          status: "pending",
          is_partial_payment: "false",
          is_damage_payment: false,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (paymentError) {
        console.error("Error creating payment:", paymentError);
        throw new Error(`Failed to create payment: ${paymentError.message}`);
      }

      paymentId = payment.id;

      // Process each cart item and move to respective booking tables
      for (const item of cartItems) {
        if (item.item_type === "baggage" && item.details) {
          const bookingId = `BG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

          // Parse details if it's a JSON string, otherwise use as object
          let parsedDetails = item.details;
          if (typeof item.details === "string") {
            try {
              parsedDetails = JSON.parse(item.details);
            } catch (error) {
              console.error("Error parsing item details JSON:", error);
              parsedDetails = item.details;
            }
          }

          const bookingData = {
            booking_id: bookingId,
            customer_name: customerData.name,
            customer_phone: customerData.phone,
            customer_email: customerData.email,
            item_name: parsedDetails.item_name || null,
            flight_number: parsedDetails.flight_number || "-",
            baggage_size:
              parsedDetails.baggage_size || item.details?.baggage_size,
            price: item.price,
            duration: parsedDetails.duration || item.details?.duration,
            storage_location:
              parsedDetails.storage_location ||
              item.details?.storage_location ||
              "Terminal 1, Level 1",
            start_date: parsedDetails.start_date || item.details?.start_date,
            end_date: parsedDetails.end_date || item.details?.end_date,
            start_time: parsedDetails.start_time || item.details?.start_time,
            end_time: "",
            airport: parsedDetails.airport || item.details?.airport,
            terminal: parsedDetails.terminal || item.details?.terminal,
            duration_type:
              parsedDetails.duration_type || item.details?.duration_type,
            hours: parsedDetails.hours || item.details?.hours,
            status: "confirmed",
            customer_id: userId || null,
            payment_id: paymentId,
          };

          const { error: baggageError } = await supabase
            .from("baggage_booking")
            .insert(bookingData);

          if (baggageError) {
            console.error("Error saving baggage booking:", baggageError);
            throw new Error(
              `Failed to save baggage booking: ${baggageError.message}`,
            );
          }
        } else if (item.item_type === "car" && item.details) {
          // Handle car rental bookings
          const { error: carBookingError } = await supabase
            .from("bookings")
            .update({ payment_status: "paid", payment_id: paymentId })
            .eq("id", item.item_id);

          if (carBookingError) {
            console.error("Error updating car booking:", carBookingError);
            throw new Error(
              `Failed to update car booking: ${carBookingError.message}`,
            );
          }
        }

        // Update shopping_cart status to "paid" or delete the item
        if (isAuthenticated && userId) {
          const { error: updateError } = await supabase
            .from("shopping_cart")
            .update({ status: "paid" })
            .eq("id", item.id)
            .eq("user_id", userId);

          if (updateError) {
            console.error("Error updating shopping cart status:", updateError);
            // Continue processing other items even if this fails
          }
        }
      }

      // Clear cart frontend (localStorage/context)
      await clearCart();

      toast({
        title: "Payment successful!",
        description: "Thank you for your order. Redirecting to invoice...",
      });

      setShowCheckout(false);
      setSelectedPaymentMethod("");
      setSelectedBank(null);
      setCustomerData({ name: "", email: "", phone: "" });

      // Redirect to thank you page with payment ID
      setTimeout(() => {
        if (paymentId) {
          navigate(`/thank-you/${paymentId}`);
        } else {
          navigate("/");
        }
      }, 1500);
    } catch (error) {
      console.error("Error during checkout:", error);
      toast({
        title: "Failed to process payment",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const getItemTypeLabel = (type: string) => {
    switch (type) {
      case "baggage":
        return "Baggage";
      case "airport_transfer":
        return "Airport Transfer";
      case "car":
        return "Car Rental";
      default:
        return type;
    }
  };

  // Load unpaid bookings into cart on component mount
  React.useEffect(() => {
    const loadUnpaidBookings = async () => {
      if (!isAuthenticated || !userId) return;

      try {
        // Fetch unpaid bookings from the bookings table
        const { data: unpaidBookings, error } = await supabase
          .from("bookings")
          .select(
            `
            id,
            vehicle_id,
            total_amount,
            start_date,
            end_date,
            pickup_time,
            driver_option,
            vehicles!bookings_vehicle_id_fkey (
              make,
              model,
              year
            )
          `,
          )
          .eq("user_id", userId)
          .eq("payment_status", "unpaid")
          .eq("status", "pending");

        if (error) {
          console.error("Error fetching unpaid bookings:", error);
          return;
        }

        // Add unpaid bookings to cart if they're not already there
        if (unpaidBookings && unpaidBookings.length > 0) {
          for (const booking of unpaidBookings) {
            // Check if booking is already in cart
            const existingItem = cartItems.find(
              (item) =>
                item.item_id === booking.id.toString() &&
                item.item_type === "car",
            );

            if (!existingItem) {
              const vehicleInfo = booking.vehicles as any;
              const serviceName = `${vehicleInfo?.make || "Unknown"} ${vehicleInfo?.model || "Vehicle"} ${vehicleInfo?.year ? `(${vehicleInfo.year})` : ""}`;

              await addToCart({
                item_type: "car",
                item_id: booking.id.toString(),
                service_name: serviceName,
                price: booking.total_amount,
                details: {
                  start_date: booking.start_date,
                  end_date: booking.end_date,
                  pickup_time: booking.pickup_time,
                  driver_option: booking.driver_option,
                  vehicle_id: booking.vehicle_id,
                },
              });
            }
          }
        }
      } catch (error) {
        console.error("Error loading unpaid bookings:", error);
      }
    };

    // Only attempt to load bookings if authenticated
    if (isAuthenticated && userId) {
      loadUnpaidBookings();
    }
  }, [isAuthenticated, userId, addToCart]);

  const paymentMethods = [
    { id: "credit_card", name: "Credit Card", icon: CreditCard },
    { id: "bank_transfer", name: "Bank Transfer", icon: Banknote },
    { id: "cash", name: "Cash", icon: DollarSign },
    { id: "paylabs", name: "Paylabs", icon: Smartphone },
  ];

  // Product suggestions for empty cart
  const productSuggestions = [
    {
      name: "Baggage",
      icon: Luggage,
      route: "/baggage",
      description: "Secure baggage storage services",
    },
    {
      name: "Airport Transfer",
      icon: MapPin,
      route: "/airport-transfer",
      description: "Convenient airport transportation",
    },
    {
      name: "Car Rental",
      icon: Car,
      route: "/rentcar",
      description: "Premium vehicle rentals",
    },
    {
      name: "Flights",
      icon: Plane,
      route: "/flights",
      description: "Book domestic and international flights",
    },
    {
      name: "Trains",
      icon: Train,
      route: "/trains",
      description: "Comfortable train journeys",
    },
    {
      name: "Hotels",
      icon: Hotel,
      route: "/hotels",
      description: "Quality accommodation options",
    },
    {
      name: "Bus",
      icon: Bus,
      route: "/bus-travel",
      description: "Affordable bus transportation",
    },
    {
      name: "Activities",
      icon: Compass,
      route: "/things-to-do",
      description: "Exciting travel experiences",
    },
  ];

  // Page layout for shopping cart
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4 sm:mb-6">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/")}
                className="mr-2"
                title="Back to Baggage"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <CartIcon className="h-5 w-5 sm:h-6 sm:w-6" />
              <h1 className="text-lg sm:text-2xl font-bold">Shopping Cart</h1>
              {cartItems.length > 0 && (
                <Badge variant="secondary">{cartItems.length}</Badge>
              )}
            </div>

            <div className="space-y-6">
              {isLoading && isAuthenticated ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-3 text-lg">Loading cart...</span>
                </div>
              ) : cartItems.length === 0 ? (
                <div className="text-center py-12">
                  <CartIcon className="h-16 w-16 mx-auto mb-4 opacity-50 text-muted-foreground" />
                  <p className="text-xl font-medium text-muted-foreground mb-2">
                    Your shopping cart is empty
                  </p>
                  <p className="text-base text-muted-foreground mb-8">
                    Discover our amazing services and add items to your cart
                  </p>

                  {/* Product Suggestions */}
                  <div className="max-w-4xl mx-auto">
                    <h3 className="text-lg font-semibold mb-6 text-gray-900">
                      Explore Our Services
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {productSuggestions.map((product) => {
                        const Icon = product.icon;
                        return (
                          <Card
                            key={product.name}
                            className="hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => navigate(product.route)}
                          >
                            <CardContent className="p-4 text-center">
                              <div className="bg-green-100 p-3 rounded-full w-fit mx-auto mb-3">
                                <Icon className="h-6 w-6 text-green-600" />
                              </div>
                              <h4 className="font-medium text-sm mb-2">
                                {product.name}
                              </h4>
                              <p className="text-xs text-muted-foreground">
                                {product.description}
                              </p>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {cartItems.map((item) => (
                      <Card key={item.id} className="p-6">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-3">
                              <Badge variant="outline">
                                {getItemTypeLabel(item.item_type)}
                              </Badge>
                              {item.status && (
                                <Badge
                                  variant={
                                    item.status === "paid"
                                      ? "default"
                                      : "secondary"
                                  }
                                  className="text-xs"
                                >
                                  {item.status}
                                </Badge>
                              )}
                            </div>
                            <h3 className="font-medium text-lg">
                              {item.service_name}
                            </h3>

                            {/* Baggage Details Information - Enhanced display */}
                            {item.item_type === "baggage" &&
                              item.details &&
                              (() => {
                                // Parse details if it's a JSON string, otherwise use as object
                                let parsedDetails = item.details;
                                if (typeof item.details === "string") {
                                  try {
                                    parsedDetails = JSON.parse(item.details);
                                  } catch (error) {
                                    console.error(
                                      "Error parsing item details JSON:",
                                      error,
                                    );
                                    parsedDetails = item.details;
                                  }
                                }

                                return (
                                  <div className="mt-3 space-y-1">
                                    {/* Customer Information */}
                                    {parsedDetails.customer_name && (
                                      <p className="text-sm text-gray-600">
                                        <span className="font-medium">
                                          Customer:
                                        </span>{" "}
                                        {parsedDetails.customer_name}
                                      </p>
                                    )}
                                    {parsedDetails.customer_email && (
                                      <p className="text-sm text-gray-600">
                                        <span className="font-medium">
                                          Email:
                                        </span>{" "}
                                        {parsedDetails.customer_email}
                                      </p>
                                    )}
                                    {parsedDetails.customer_phone && (
                                      <p className="text-sm text-gray-600">
                                        <span className="font-medium">
                                          Phone:
                                        </span>{" "}
                                        {parsedDetails.customer_phone}
                                      </p>
                                    )}

                                    {/* Baggage Information */}
                                    {parsedDetails.baggage_size && (
                                      <p className="text-sm text-gray-600">
                                        <span className="font-medium">
                                          Baggage Size:
                                        </span>{" "}
                                        {parsedDetails.baggage_size
                                          .charAt(0)
                                          .toUpperCase() +
                                          parsedDetails.baggage_size.slice(1)}
                                      </p>
                                    )}
                                    {parsedDetails.item_name && (
                                      <p className="text-sm text-gray-600">
                                        <span className="font-medium">
                                          Item Name:
                                        </span>{" "}
                                        {parsedDetails.item_name}
                                      </p>
                                    )}
                                    {parsedDetails.flight_number &&
                                      parsedDetails.flight_number !== "-" && (
                                        <p className="text-sm text-gray-600">
                                          <span className="font-medium">
                                            Flight Number:
                                          </span>{" "}
                                          {parsedDetails.flight_number}
                                        </p>
                                      )}

                                    {/* Location Information */}
                                    {parsedDetails.airport && (
                                      <p className="text-sm text-gray-600">
                                        <span className="font-medium">
                                          Airport:
                                        </span>{" "}
                                        {parsedDetails.airport}
                                      </p>
                                    )}
                                    {parsedDetails.terminal && (
                                      <p className="text-sm text-gray-600">
                                        <span className="font-medium">
                                          Terminal:
                                        </span>{" "}
                                        {parsedDetails.terminal}
                                      </p>
                                    )}
                                    {parsedDetails.storage_location && (
                                      <p className="text-sm text-gray-600">
                                        <span className="font-medium">
                                          Storage Location:
                                        </span>{" "}
                                        {parsedDetails.storage_location}
                                      </p>
                                    )}

                                    {/* Duration and Time Information */}
                                    {parsedDetails.duration && (
                                      <p className="text-sm text-gray-600">
                                        <span className="font-medium">
                                          Duration:
                                        </span>{" "}
                                        {parsedDetails.duration}{" "}
                                        {parsedDetails.duration_type === "days"
                                          ? "day(s)"
                                          : "hour(s)"}
                                      </p>
                                    )}
                                    {parsedDetails.start_date && (
                                      <p className="text-sm text-gray-600">
                                        <span className="font-medium">
                                          Start Date:
                                        </span>{" "}
                                        {new Date(
                                          parsedDetails.start_date,
                                        ).toLocaleDateString("en-US", {
                                          weekday: "short",
                                          year: "numeric",
                                          month: "short",
                                          day: "numeric",
                                        })}
                                      </p>
                                    )}
                                    {parsedDetails.start_time && (
                                      <p className="text-sm text-gray-600">
                                        <span className="font-medium">
                                          Start Time:
                                        </span>{" "}
                                        {parsedDetails.start_time}
                                      </p>
                                    )}
                                    {parsedDetails.duration_type === "days" &&
                                      parsedDetails.end_date && (
                                        <p className="text-sm text-gray-600">
                                          <span className="font-medium">
                                            End Date:
                                          </span>{" "}
                                          {new Date(
                                            parsedDetails.end_date,
                                          ).toLocaleDateString("en-US", {
                                            weekday: "short",
                                            year: "numeric",
                                            month: "short",
                                            day: "numeric",
                                          })}
                                        </p>
                                      )}
                                    {parsedDetails.hours && (
                                      <p className="text-sm text-gray-600">
                                        <span className="font-medium">
                                          Hours:
                                        </span>{" "}
                                        {parsedDetails.hours}
                                      </p>
                                    )}
                                  </div>
                                );
                              })()}

                            {/* Airport Transfer Information */}
                            {item.item_type === "airport_transfer" &&
                              item.details &&
                              (() => {
                                // Parse details if it's a JSON string, otherwise use as object
                                let parsedDetails = item.details;
                                if (typeof item.details === "string") {
                                  try {
                                    parsedDetails = JSON.parse(item.details);
                                  } catch (error) {
                                    console.error(
                                      "Error parsing airport transfer details JSON:",
                                      error,
                                    );
                                    parsedDetails = item.details;
                                  }
                                }

                                const isInstantBooking =
                                  parsedDetails.bookingType === "instant";
                                const isScheduleBooking =
                                  parsedDetails.bookingType === "scheduled";

                                return (
                                  <div className="mt-3 space-y-1">
                                    {/* Booking Code */}
                                    {parsedDetails.bookingCode && (
                                      <p className="text-sm text-gray-600">
                                        <span className="font-medium">
                                          Booking Code:
                                        </span>{" "}
                                        {parsedDetails.bookingCode}
                                      </p>
                                    )}

                                    {/* Booking Type */}
                                    {parsedDetails.bookingType && (
                                      <p className="text-sm text-gray-600">
                                        <span className="font-medium">
                                          Booking Type:
                                        </span>{" "}
                                        {parsedDetails.bookingType === "instant"
                                          ? "Instant Booking"
                                          : "Schedule Booking"}
                                      </p>
                                    )}

                                    {/* Vehicle Type - for both booking types */}
                                    {parsedDetails.vehicleType && (
                                      <p className="text-sm text-gray-600">
                                        <span className="font-medium">
                                          Vehicle Type:
                                        </span>{" "}
                                        {parsedDetails.vehicleType}
                                      </p>
                                    )}

                                    {/* Pickup Date and Time - for both booking types */}
                                    {parsedDetails.pickupDate && (
                                      <p className="text-sm text-gray-600">
                                        <span className="font-medium">
                                          Pickup Date:
                                        </span>{" "}
                                        {new Date(
                                          parsedDetails.pickupDate,
                                        ).toLocaleDateString("en-US", {
                                          weekday: "short",
                                          year: "numeric",
                                          month: "short",
                                          day: "numeric",
                                        })}
                                      </p>
                                    )}
                                    {parsedDetails.pickupTime && (
                                      <p className="text-sm text-gray-600">
                                        <span className="font-medium">
                                          Pickup Time:
                                        </span>{" "}
                                        {parsedDetails.pickupTime}
                                      </p>
                                    )}

                                    {/* Passengers */}
                                    {parsedDetails.passenger && (
                                      <p className="text-sm text-gray-600">
                                        <span className="font-medium">
                                          Passengers:
                                        </span>{" "}
                                        {parsedDetails.passenger}
                                      </p>
                                    )}

                                    {/* Pickup and Dropoff Locations */}
                                    {parsedDetails.fromAddress && (
                                      <p className="text-sm text-gray-600">
                                        <span className="font-medium">
                                          Pickup:
                                        </span>{" "}
                                        {parsedDetails.fromAddress}
                                      </p>
                                    )}
                                    {parsedDetails.toAddress && (
                                      <p className="text-sm text-gray-600">
                                        <span className="font-medium">
                                          Dropoff:
                                        </span>{" "}
                                        {parsedDetails.toAddress}
                                      </p>
                                    )}

                                    {/* Distance */}
                                    {parsedDetails.distance && (
                                      <p className="text-sm text-gray-600">
                                        <span className="font-medium">
                                          Distance:
                                        </span>{" "}
                                        {parsedDetails.distance} km
                                      </p>
                                    )}

                                    {/* Duration */}
                                    {parsedDetails.duration && (
                                      <p className="text-sm text-gray-600">
                                        <span className="font-medium">
                                          Duration:
                                        </span>{" "}
                                        {parsedDetails.duration} minutes
                                      </p>
                                    )}
                                  </div>
                                );
                              })()}

                            {/* Car Rental Information */}
                            {item.item_type === "car" &&
                              item.details &&
                              (() => {
                                // Parse details if it's a JSON string, otherwise use as object
                                let parsedDetails = item.details;
                                if (typeof item.details === "string") {
                                  try {
                                    parsedDetails = JSON.parse(item.details);
                                  } catch (error) {
                                    console.error(
                                      "Error parsing car details JSON:",
                                      error,
                                    );
                                    parsedDetails = item.details;
                                  }
                                }

                                return (
                                  <div className="mt-3 space-y-1">
                                    {parsedDetails.start_date && (
                                      <p className="text-sm text-gray-600">
                                        <span className="font-medium">
                                          Pickup Date:
                                        </span>{" "}
                                        {new Date(
                                          parsedDetails.start_date,
                                        ).toLocaleDateString("en-US")}
                                      </p>
                                    )}
                                    {parsedDetails.end_date && (
                                      <p className="text-sm text-gray-600">
                                        <span className="font-medium">
                                          Return Date:
                                        </span>{" "}
                                        {new Date(
                                          parsedDetails.end_date,
                                        ).toLocaleDateString("en-US")}
                                      </p>
                                    )}
                                    {parsedDetails.pickup_time && (
                                      <p className="text-sm text-gray-600">
                                        <span className="font-medium">
                                          Pickup Time:
                                        </span>{" "}
                                        {parsedDetails.pickup_time}
                                      </p>
                                    )}
                                    {parsedDetails.driver_option && (
                                      <p className="text-sm text-gray-600">
                                        <span className="font-medium">
                                          Driver Option:
                                        </span>{" "}
                                        {parsedDetails.driver_option === "self"
                                          ? "Self-drive"
                                          : "With Driver"}
                                      </p>
                                    )}
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      Booking ID: {item.item_id}
                                    </Badge>
                                  </div>
                                );
                              })()}

                            <p className="text-2xl font-semibold text-primary mt-2">
                              {formatCurrency(item.price)}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleRemoveItem(item.id)}
                            disabled={isLoading}
                          >
                            <Trash2 className="h-5 w-5" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>

                  <Separator />

                  <div className="flex justify-between items-center text-xl font-semibold bg-gray-50 p-4 rounded-lg">
                    <span>Total:</span>
                    <span className="text-primary">
                      {formatCurrency(totalAmount)}
                    </span>
                  </div>
                </>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mt-8">
              <Button
                variant="outline"
                onClick={handleClearCart}
                disabled={cartItems.length === 0 || isLoading}
                className="w-full sm:w-auto"
              >
                Clear Cart
              </Button>
              {isAuthenticated ? (
                <Button
                  onClick={handleCheckout}
                  disabled={cartItems.length === 0 || isLoading}
                  className="w-full sm:w-auto"
                >
                  Checkout ({formatCurrency(totalAmount)})
                </Button>
              ) : (
                <Button
                  disabled
                  className="w-full sm:w-auto bg-gray-300 text-gray-600 cursor-not-allowed"
                >
                  Please Sign in to Checkout
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Checkout Section */}
      {showCheckout && (
        <div className="mt-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold">Checkout</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Complete customer information and select payment method
              </p>
            </div>

            <div className="space-y-6">
              {/* Customer Information */}
              <div className="text-center">
                <h3 className="font-medium mb-4">Customer Information</h3>
                <div className="max-w-md mx-auto space-y-4">
                  <div className="text-left">
                    <Label htmlFor="customer-name" className="block mb-2">
                      Full Name
                    </Label>
                    <Input
                      id="customer-name"
                      value={customerData.name}
                      onChange={(e) =>
                        setCustomerData((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      placeholder="Enter full name"
                      disabled={isAuthenticated && !!userName}
                      className={
                        isAuthenticated && !!userName
                          ? "bg-gray-100 cursor-not-allowed"
                          : ""
                      }
                    />
                  </div>
                  <div className="text-left">
                    <Label htmlFor="customer-email" className="block mb-2">
                      Email
                    </Label>
                    <Input
                      id="customer-email"
                      type="email"
                      value={customerData.email}
                      onChange={(e) =>
                        setCustomerData((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                      placeholder="Enter email"
                      disabled={isAuthenticated && !!userEmail}
                      className={
                        isAuthenticated && !!userEmail
                          ? "bg-gray-100 cursor-not-allowed"
                          : ""
                      }
                    />
                  </div>
                  <div className="text-left">
                    <Label htmlFor="customer-phone" className="block mb-2">
                      Phone Number
                    </Label>
                    <Input
                      id="customer-phone"
                      value={customerData.phone}
                      onChange={(e) =>
                        setCustomerData((prev) => ({
                          ...prev,
                          phone: e.target.value,
                        }))
                      }
                      placeholder="Enter phone number"
                    />
                  </div>
                </div>
              </div>

              {/* Order Summary - Enhanced with complete booking details */}
              <div className="max-w-2xl mx-auto">
                <div className="bg-muted p-4 rounded-lg">
                  <h3 className="font-medium mb-4 text-center">
                    Complete Order Summary
                  </h3>
                  <div className="space-y-4">
                    {cartItems.map((item) => (
                      <div
                        key={item.id}
                        className="border-b border-gray-200 pb-3 last:border-b-0"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium">
                            {item.service_name}
                          </span>
                          <span className="font-semibold">
                            {formatCurrency(item.price)}
                          </span>
                        </div>

                        {/* Detailed booking information */}
                        {item.item_type === "baggage" && item.details && (
                          <div className="text-sm text-gray-700 space-y-2 mt-3">
                            <div className="grid grid-cols-1 gap-2">
                              {/* Baggage Size */}
                              {item.details.baggage_size && (
                                <div className="flex justify-between">
                                  <span className="font-medium text-gray-600">
                                    Size:
                                  </span>
                                  <span>
                                    {item.details.baggage_size
                                      .charAt(0)
                                      .toUpperCase() +
                                      item.details.baggage_size.slice(1)}
                                  </span>
                                </div>
                              )}

                              {/* Airport */}
                              {item.details.airport && (
                                <div className="flex justify-between">
                                  <span className="font-medium text-gray-600">
                                    Airport:
                                  </span>
                                  <span>{item.details.airport}</span>
                                </div>
                              )}

                              {/* Terminal */}
                              {item.details.terminal && (
                                <div className="flex justify-between">
                                  <span className="font-medium text-gray-600">
                                    Terminal:
                                  </span>
                                  <span>{item.details.terminal}</span>
                                </div>
                              )}

                              {/* Storage Location */}
                              {item.details.storage_location && (
                                <div className="flex justify-between">
                                  <span className="font-medium text-gray-600">
                                    Storage Location:
                                  </span>
                                  <span>{item.details.storage_location}</span>
                                </div>
                              )}

                              {/* Start Date */}
                              {item.details.start_date && (
                                <div className="flex justify-between">
                                  <span className="font-medium text-gray-600">
                                    Start Date:
                                  </span>
                                  <span>
                                    {new Date(
                                      item.details.start_date,
                                    ).toLocaleDateString("en-US", {
                                      weekday: "short",
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric",
                                    })}
                                  </span>
                                </div>
                              )}

                              {/* End Date - only show if duration is more than 1 hour or duration_type is days */}
                              {item.details.end_date &&
                                (item.details.duration_type === "days" ||
                                  (item.details.duration_type === "hours" &&
                                    item.details.duration &&
                                    parseInt(item.details.duration) > 1)) && (
                                  <div className="flex justify-between">
                                    <span className="font-medium text-gray-600">
                                      End Date:
                                    </span>
                                    <span>
                                      {new Date(
                                        item.details.end_date,
                                      ).toLocaleDateString("en-US", {
                                        weekday: "short",
                                        year: "numeric",
                                        month: "short",
                                        day: "numeric",
                                      })}
                                    </span>
                                  </div>
                                )}

                              {/* Start Time */}
                              {item.details.start_time && (
                                <div className="flex justify-between">
                                  <span className="font-medium text-gray-600">
                                    Start Time:
                                  </span>
                                  <span>{item.details.start_time}</span>
                                </div>
                              )}

                              {/* Duration */}
                              {item.details.duration && (
                                <div className="flex justify-between">
                                  <span className="font-medium text-gray-600">
                                    Duration:
                                  </span>
                                  <span>
                                    {item.details.duration}{" "}
                                    {item.details.duration_type === "days"
                                      ? "day(s)"
                                      : "hour(s)"}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Airport Transfer Information */}
                        {item.item_type === "airport_transfer" &&
                          item.details && (
                            <div className="text-sm text-gray-700 space-y-2 mt-3">
                              <div className="grid grid-cols-1 gap-2">
                                {(() => {
                                  // Parse details if it's a JSON string, otherwise use as object
                                  let parsedDetails = item.details;
                                  if (typeof item.details === "string") {
                                    try {
                                      parsedDetails = JSON.parse(item.details);
                                    } catch (error) {
                                      console.error(
                                        "Error parsing airport transfer details JSON:",
                                        error,
                                      );
                                      parsedDetails = item.details;
                                    }
                                  }

                                  const isInstantBooking =
                                    parsedDetails.bookingType === "instant";
                                  const isScheduleBooking =
                                    parsedDetails.bookingType === "scheduled";

                                  return (
                                    <>
                                      {/* Booking Code */}
                                      {parsedDetails.bookingCode && (
                                        <div className="flex justify-between">
                                          <span className="font-medium text-gray-600">
                                            Booking Code:
                                          </span>
                                          <span>
                                            {parsedDetails.bookingCode}
                                          </span>
                                        </div>
                                      )}

                                      {/* Booking Type */}
                                      {parsedDetails.bookingType && (
                                        <div className="flex justify-between">
                                          <span className="font-medium text-gray-600">
                                            Booking Type:
                                          </span>
                                          <span>
                                            {parsedDetails.bookingType ===
                                            "instant"
                                              ? "Instant Booking"
                                              : "Schedule Booking"}
                                          </span>
                                        </div>
                                      )}

                                      {/* Vehicle Type - for both booking types */}
                                      {parsedDetails.vehicleType && (
                                        <div className="flex justify-between">
                                          <span className="font-medium text-gray-600">
                                            Vehicle Type:
                                          </span>
                                          <span>
                                            {parsedDetails.vehicleType}
                                          </span>
                                        </div>
                                      )}

                                      {/* Pickup Date and Time - for both booking types */}
                                      {parsedDetails.pickupDate && (
                                        <div className="flex justify-between">
                                          <span className="font-medium text-gray-600">
                                            Pickup Date:
                                          </span>
                                          <span>
                                            {new Date(
                                              parsedDetails.pickupDate,
                                            ).toLocaleDateString("en-US", {
                                              weekday: "short",
                                              year: "numeric",
                                              month: "short",
                                              day: "numeric",
                                            })}
                                          </span>
                                        </div>
                                      )}
                                      {parsedDetails.pickupTime && (
                                        <div className="flex justify-between">
                                          <span className="font-medium text-gray-600">
                                            Pickup Time:
                                          </span>
                                          <span>
                                            {parsedDetails.pickupTime}
                                          </span>
                                        </div>
                                      )}

                                      {/* Passengers */}
                                      {parsedDetails.passenger && (
                                        <div className="flex justify-between">
                                          <span className="font-medium text-gray-600">
                                            Passengers:
                                          </span>
                                          <span>{parsedDetails.passenger}</span>
                                        </div>
                                      )}

                                      {/* Pickup and Dropoff Locations */}
                                      {parsedDetails.fromAddress && (
                                        <div className="flex justify-between">
                                          <span className="font-medium text-gray-600">
                                            Pickup:
                                          </span>
                                          <span>
                                            {parsedDetails.fromAddress}
                                          </span>
                                        </div>
                                      )}
                                      {parsedDetails.toAddress && (
                                        <div className="flex justify-between">
                                          <span className="font-medium text-gray-600">
                                            Dropoff:
                                          </span>
                                          <span>{parsedDetails.toAddress}</span>
                                        </div>
                                      )}

                                      {/* Distance */}
                                      {parsedDetails.distance && (
                                        <div className="flex justify-between">
                                          <span className="font-medium text-gray-600">
                                            Distance:
                                          </span>
                                          <span>
                                            {parsedDetails.distance} km
                                          </span>
                                        </div>
                                      )}

                                      {/* Duration */}
                                      {parsedDetails.duration && (
                                        <div className="flex justify-between">
                                          <span className="font-medium text-gray-600">
                                            Duration:
                                          </span>
                                          <span>
                                            {parsedDetails.duration} minutes
                                          </span>
                                        </div>
                                      )}
                                    </>
                                  );
                                })()}
                              </div>
                            </div>
                          )}

                        {/* Car Rental Information */}
                        {item.item_type === "car" && item.details && (
                          <div className="text-sm text-gray-700 space-y-2 mt-3">
                            <div className="grid grid-cols-1 gap-2">
                              {item.details.start_date && (
                                <div className="flex justify-between">
                                  <span className="font-medium text-gray-600">
                                    Pickup Date:
                                  </span>
                                  <span>
                                    {new Date(
                                      item.details.start_date,
                                    ).toLocaleDateString("en-US", {
                                      weekday: "short",
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric",
                                    })}
                                  </span>
                                </div>
                              )}
                              {item.details.end_date && (
                                <div className="flex justify-between">
                                  <span className="font-medium text-gray-600">
                                    Return Date:
                                  </span>
                                  <span>
                                    {new Date(
                                      item.details.end_date,
                                    ).toLocaleDateString("en-US", {
                                      weekday: "short",
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric",
                                    })}
                                  </span>
                                </div>
                              )}
                              {item.details.pickup_time && (
                                <div className="flex justify-between">
                                  <span className="font-medium text-gray-600">
                                    Pickup Time:
                                  </span>
                                  <span>{item.details.pickup_time}</span>
                                </div>
                              )}
                              {item.details.driver_option && (
                                <div className="flex justify-between">
                                  <span className="font-medium text-gray-600">
                                    Driver Option:
                                  </span>
                                  <span>
                                    {item.details.driver_option === "self"
                                      ? "Self-drive"
                                      : "With Driver"}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <Separator className="my-3" />
                  <div className="flex justify-between font-semibold text-base">
                    <span>Total Amount:</span>
                    <span className="text-primary">
                      {formatCurrency(totalAmount)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="text-center">
                <h3 className="font-medium mb-4">Payment Method</h3>
                <div className="max-w-md mx-auto">
                  <div className="grid grid-cols-2 gap-3">
                    {paymentMethods.map((method) => {
                      const Icon = method.icon;
                      return (
                        <Button
                          key={method.id}
                          variant={
                            selectedPaymentMethod === method.id
                              ? "default"
                              : "outline"
                          }
                          className="h-auto p-3 flex flex-col items-center gap-2"
                          onClick={() => {
                            setSelectedPaymentMethod(method.id);
                            setSelectedBank(null); // Reset selected bank
                          }}
                        >
                          <Icon className="h-5 w-5" />
                          <span className="text-xs">{method.name}</span>
                        </Button>
                      );
                    })}
                  </div>

                  {/* Bank Selection for Bank Transfer */}
                  {selectedPaymentMethod === "bank_transfer" && (
                    <div className="border rounded-lg p-4 mt-4 text-left">
                      <h4 className="font-medium mb-3 text-center">
                        Select Bank
                      </h4>
                      {manualBanks.length > 0 ? (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {manualBanks.map((bank) => (
                            <div
                              key={bank.id}
                              className={`p-3 border rounded-md cursor-pointer transition-colors ${
                                selectedBank?.id === bank.id
                                  ? "border-blue-500 bg-blue-50"
                                  : "hover:bg-gray-50"
                              }`}
                              onClick={() => setSelectedBank(bank)}
                            >
                              <div className="font-medium">{bank.name}</div>
                              {selectedBank?.id === bank.id && (
                                <div className="mt-2 text-sm space-y-1">
                                  <div>
                                    <span className="font-medium">
                                      Account Holder:
                                    </span>{" "}
                                    {bank.account_holder}
                                  </div>
                                  <div>
                                    <span className="font-medium">
                                      Account Number:
                                    </span>{" "}
                                    {bank.account_number}
                                  </div>
                                  {bank.swift_code && (
                                    <div>
                                      <span className="font-medium">
                                        Swift Code:
                                      </span>{" "}
                                      {bank.swift_code}
                                    </div>
                                  )}
                                  {bank.branch && (
                                    <div>
                                      <span className="font-medium">
                                        Branch:
                                      </span>{" "}
                                      {bank.branch}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-gray-500">
                          No bank accounts found. Please contact support.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-center gap-4 mt-8 pt-6 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCheckout(false);
                  setSelectedPaymentMethod("");
                  setSelectedBank(null);
                  setCustomerData({ name: "", email: "", phone: "" });
                }}
                disabled={isProcessingPayment}
                className="px-8"
              >
                Cancel
              </Button>
              <Button
                onClick={handlePayment}
                disabled={
                  !customerData.name ||
                  !customerData.email ||
                  !customerData.phone ||
                  !selectedPaymentMethod ||
                  (selectedPaymentMethod === "bank_transfer" &&
                    !selectedBank) ||
                  isProcessingPayment
                }
                className="px-8"
              >
                {isProcessingPayment ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  `Pay ${formatCurrency(totalAmount)}`
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShoppingCart;
