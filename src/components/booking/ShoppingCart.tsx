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
  HandHeart,
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
  const {
    isAuthenticated,
    userId,
    userEmail,
    userName,
    userRole,
    isLoading: authLoading,
    isHydrated,
    isCheckingSession,
  } = useAuth();
  const {
    cartItems,
    addToCart,
    removeFromCart,
    clearCart,
    totalAmount,
    checkout,
    isLoading,
    refetchCartData,
  } = useShoppingCart();

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

  // Function to load unpaid bookings - moved outside useEffect for reusability
  const loadUnpaidBookings = React.useCallback(async () => {
    if (!isAuthenticated || !userId || !isHydrated || isLoading) {
      console.log("[ShoppingCart] Not ready for loading unpaid bookings", {
        isAuthenticated,
        userId,
        isHydrated,
        isLoading,
      });
      return;
    }

    try {
      console.log("[ShoppingCart] Loading unpaid bookings for user:", userId);
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
        console.log(
          "[ShoppingCart] Found",
          unpaidBookings.length,
          "unpaid bookings",
        );
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
      } else {
        console.log("[ShoppingCart] No unpaid bookings found");
      }
    } catch (error) {
      console.error("Error loading unpaid bookings:", error);
    }
  }, [isAuthenticated, userId, isHydrated, isLoading, addToCart, cartItems]);

  // Load unpaid bookings into cart on component mount and when auth state changes
  React.useEffect(() => {
    // Only load once when auth state is ready
    if (
      isAuthenticated &&
      userId &&
      isHydrated &&
      !isCheckingSession &&
      userRole &&
      !isLoading
    ) {
      console.log(
        "[ShoppingCart] Auth state ready and hydrated, loading unpaid bookings",
        { isAuthenticated, userId, isHydrated, userRole },
      );
      loadUnpaidBookings();
    }
  }, [isAuthenticated, userId, isHydrated, userRole]);

  // Enhanced visibility change handler with auth state recovery
  React.useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let hasTriggeredRefresh = false;

    const handleVisibilityChange = async () => {
      if (
        document.visibilityState === "visible" &&
        isHydrated &&
        !hasTriggeredRefresh
      ) {
        console.log("[ShoppingCart] Tab became visible, checking auth state", {
          isAuthenticated,
          userId,
          isHydrated,
          userRole,
        });
        hasTriggeredRefresh = true;

        // Clear any existing timeout
        if (timeoutId) clearTimeout(timeoutId);

        timeoutId = setTimeout(async () => {
          try {
            // Check if we have valid auth state
            if (isAuthenticated && userId && userRole && !isLoading) {
              console.log(
                "[ShoppingCart] Valid auth state, refreshing cart data",
              );
              await refetchCartData();
            } else if (!isAuthenticated && cartItems.length === 0) {
              // Try to recover session if no auth state
              console.log(
                "[ShoppingCart] No auth state, attempting session recovery",
              );
              const {
                data: { session },
              } = await supabase.auth.getSession();
              if (session?.user) {
                console.log(
                  "[ShoppingCart] Session recovered, will refetch cart",
                );
                // Wait a bit for auth context to update
                setTimeout(async () => {
                  await refetchCartData();
                }, 1000);
              }
            }
          } catch (error) {
            console.error(
              "[ShoppingCart] Error during visibility change handling:",
              error,
            );
          } finally {
            // Reset flag after delay
            setTimeout(() => {
              hasTriggeredRefresh = false;
            }, 3000);
          }
        }, 300);
      }
    };

    // Listen for auth state refresh events
    const handleAuthRefresh = async () => {
      console.log("[ShoppingCart] Auth state refreshed, refetching cart data");
      if (!isLoading) {
        setTimeout(async () => {
          await refetchCartData();
        }, 500);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("authStateRefreshed", handleAuthRefresh);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("authStateRefreshed", handleAuthRefresh);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [
    isAuthenticated,
    userId,
    isHydrated,
    userRole,
    isLoading,
    refetchCartData,
    cartItems.length,
  ]);

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
      name: "Handling",
      icon: HandHeart,
      route: "/handling",
      description: "Airport handling assistance services",
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

  // Add debug logs
  console.log("Cart Page: userRole", userRole);
  console.log("Cart Page: isAuthenticated", isAuthenticated);
  console.log("Cart Page: isHydrated", isHydrated);
  console.log("Cart Page: isCheckingSession", isCheckingSession);
  console.log("Cart Page: authLoading", authLoading);
  console.log("Cart Page: userId", userId);

  // Fallback for unauthenticated users
  if (!isAuthenticated && !authLoading && isHydrated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Please Sign In</h2>
          <p className="text-gray-600 mb-6">
            You need to be signed in to view your cart.
          </p>
          <Button onClick={() => navigate("/login")}>Sign In</Button>
        </div>
      </div>
    );
  }

  // Enhanced loading state with timeout to prevent infinite loading
  const [showReloadButton, setShowReloadButton] = React.useState(false);

  React.useEffect(() => {
    let loadingTimeout: NodeJS.Timeout;

    // Show reload button if loading persists for more than 5 seconds
    if (
      (authLoading && !isAuthenticated) ||
      (!isHydrated && !isAuthenticated) ||
      (isCheckingSession && !userRole)
    ) {
      loadingTimeout = setTimeout(() => {
        console.log(
          "[ShoppingCart] Loading timeout reached, showing reload button",
        );
        setShowReloadButton(true);
      }, 5000);
    } else {
      setShowReloadButton(false);
    }

    return () => {
      if (loadingTimeout) clearTimeout(loadingTimeout);
    };
  }, [authLoading, isAuthenticated, isHydrated, isCheckingSession, userRole]);

  // Show loading spinner with reload option
  if (
    (authLoading && !isAuthenticated) ||
    (!isHydrated && !isAuthenticated) ||
    (isCheckingSession && !userRole)
  ) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mb-4" />
          <span className="text-lg mb-4">
            {authLoading ? "Loading authentication..." : "Loading..."}
          </span>
          {showReloadButton && (
            <Button
              onClick={() => {
                console.log("[ShoppingCart] Manual reload triggered");
                window.location.reload();
              }}
              variant="outline"
              className="mt-4"
            >
              Reload Data
            </Button>
          )}
        </div>
      </div>
    );
  }

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
              {isLoading && cartItems.length === 0 ? (
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

                                    {/* Driver Information */}
                                    {parsedDetails.driverName && (
                                      <div className="flex justify-between">
                                        <span className="font-medium text-gray-600">
                                          Driver:
                                        </span>
                                        <span>{parsedDetails.driverName}</span>
                                      </div>
                                    )}

                                    {/* Driver ID */}
                                    {(parsedDetails.id_driver ||
                                      parsedDetails.driverId) && (
                                      <div className="flex justify-between">
                                        <span className="font-medium text-gray-600">
                                          Driver ID:
                                        </span>
                                        <span>
                                          {parsedDetails.id_driver ||
                                            parsedDetails.driverId}
                                        </span>
                                      </div>
                                    )}

                                    {/* Driver Phone */}
                                    {parsedDetails.driverPhone && (
                                      <div className="flex justify-between">
                                        <span className="font-medium text-gray-600">
                                          Driver Phone:
                                        </span>
                                        <span>{parsedDetails.driverPhone}</span>
                                      </div>
                                    )}

                                    {/* Vehicle Information */}
                                    {parsedDetails.vehicleName && (
                                      <div className="flex justify-between">
                                        <span className="font-medium text-gray-600">
                                          Vehicle:
                                        </span>
                                        <span>{parsedDetails.vehicleName}</span>
                                      </div>
                                    )}

                                    {parsedDetails.vehiclePlate && (
                                      <div className="flex justify-between">
                                        <span className="font-medium text-gray-600">
                                          License Plate:
                                        </span>
                                        <span>
                                          {parsedDetails.vehiclePlate}
                                        </span>
                                      </div>
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
                                        ).toLocaleDateString("en-US", {
                                          weekday: "short",
                                          year: "numeric",
                                          month: "short",
                                          day: "numeric",
                                        })}
                                      </p>
                                    )}
                                    {parsedDetails.end_date && (
                                      <p className="text-sm text-gray-600">
                                        <span className="font-medium">
                                          Return Date:
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
                            disabled={!isAuthenticated || !userId}
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
                disabled={cartItems.length === 0 || !isAuthenticated || !userId}
                className="w-full sm:w-auto"
              >
                Clear Cart
              </Button>
              {isAuthenticated && userId ? (
                <Button
                  onClick={() => navigate("/checkout")}
                  disabled={cartItems.length === 0}
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
    </div>
  );
};

export default ShoppingCart;
