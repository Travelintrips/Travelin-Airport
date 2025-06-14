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
      // Process each cart item as a booking
      for (const item of cartItems) {
        if (item.item_type === "baggage" && item.details) {
          const bookingId = `BG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

          const bookingData = {
            booking_id: bookingId,
            customer_name: customerData.name,
            customer_phone: customerData.phone,
            customer_email: customerData.email,
            item_name: item.details.item_name,
            flight_number: item.details.flight_number || "-",
            baggage_size: item.details.baggage_size,
            price: item.price,
            duration: item.details.duration,
            storage_location: item.details.storage_location,
            start_date: item.details.start_date,
            end_date: item.details.end_date,
            start_time: item.details.start_time,
            end_time: "",
            airport: item.details.airport,
            terminal: item.details.terminal,
            duration_type: item.details.duration_type,
            hours: item.details.hours,
            status: "pending",
            customer_id: userId || null,
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
            .update({ payment_status: "paid" })
            .eq("id", item.item_id);

          if (carBookingError) {
            console.error("Error updating car booking:", carBookingError);
            throw new Error(
              `Failed to update car booking: ${carBookingError.message}`,
            );
          }
        }
      }

      // Create payment record
      const { error: paymentError } = await supabase.from("payments").insert({
        user_id: userId || null,
        amount: totalAmount,
        payment_method: selectedPaymentMethod,
        status: "pending",
        is_partial_payment: "false",
        is_damage_payment: false,
        created_at: new Date().toISOString(),
      });

      if (paymentError) {
        console.error("Error creating payment:", paymentError);
        throw new Error(`Failed to create payment: ${paymentError.message}`);
      }

      // Clear cart after successful checkout
      await clearCart();

      toast({
        title: "Payment successful!",
        description: "Thank you for your order.",
      });
      setShowCheckout(false);
      setSelectedPaymentMethod("");
      setSelectedBank(null);
      setCustomerData({ name: "", email: "", phone: "" });
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

    loadUnpaidBookings();
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
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-2 mb-6">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/")}
                className="mr-2"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <CartIcon className="h-6 w-6" />
              <h1 className="text-2xl font-bold">Shopping Cart</h1>
              {cartItems.length > 0 && (
                <Badge variant="secondary">{cartItems.length}</Badge>
              )}
            </div>

            <div className="space-y-6">
              {isLoading ? (
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
                            </div>
                            <h3 className="font-medium text-lg">
                              {item.service_name}
                            </h3>

                            {/* Duration and Date Information */}
                            {item.item_type === "baggage" && item.details && (
                              <div className="mt-3 space-y-1">
                                {item.service_name ===
                                  "Baggage Storage - Electronic" &&
                                  item.details.item_name && (
                                    <p className="text-sm text-gray-600">
                                      <span className="font-medium">
                                        Item Name:
                                      </span>{" "}
                                      {item.details.item_name}
                                    </p>
                                  )}
                                {item.details.duration && (
                                  <p className="text-sm text-gray-600">
                                    <span className="font-medium">
                                      Duration:
                                    </span>{" "}
                                    {item.details.duration}{" "}
                                    {item.details.duration_type === "days"
                                      ? "day(s)"
                                      : "hour(s)"}
                                  </p>
                                )}
                                {item.details.start_date && (
                                  <p className="text-sm text-gray-600">
                                    <span className="font-medium">
                                      Start Date:
                                    </span>{" "}
                                    {new Date(
                                      item.details.start_date,
                                    ).toLocaleString("en-US")}
                                  </p>
                                )}
                                {item.details.duration_type === "days" &&
                                  item.details.end_date && (
                                    <p className="text-sm text-gray-600">
                                      <span className="font-medium">
                                        End Date:
                                      </span>{" "}
                                      {new Date(
                                        item.details.end_date,
                                      ).toLocaleString("en-US")}
                                    </p>
                                  )}
                              </div>
                            )}

                            {/* Car Rental Information */}
                            {item.item_type === "car" && item.details && (
                              <div className="mt-3 space-y-1">
                                {item.details.start_date && (
                                  <p className="text-sm text-gray-600">
                                    <span className="font-medium">
                                      Pickup Date:
                                    </span>{" "}
                                    {new Date(
                                      item.details.start_date,
                                    ).toLocaleDateString("en-US")}
                                  </p>
                                )}
                                {item.details.end_date && (
                                  <p className="text-sm text-gray-600">
                                    <span className="font-medium">
                                      Return Date:
                                    </span>{" "}
                                    {new Date(
                                      item.details.end_date,
                                    ).toLocaleDateString("en-US")}
                                  </p>
                                )}
                                {item.details.pickup_time && (
                                  <p className="text-sm text-gray-600">
                                    <span className="font-medium">
                                      Pickup Time:
                                    </span>{" "}
                                    {item.details.pickup_time}
                                  </p>
                                )}
                                {item.details.driver_option && (
                                  <p className="text-sm text-gray-600">
                                    <span className="font-medium">
                                      Driver Option:
                                    </span>{" "}
                                    {item.details.driver_option === "self"
                                      ? "Self-drive"
                                      : "With Driver"}
                                  </p>
                                )}
                                <Badge variant="outline" className="text-xs">
                                  Booking ID: {item.item_id}
                                </Badge>
                              </div>
                            )}

                            <p className="text-2xl font-semibold text-primary mt-2">
                              {formatCurrency(item.price)}
                            </p>
                            {item.created_at && (
                              <p className="text-sm text-muted-foreground mt-2">
                                Added:{" "}
                                {new Date(item.created_at).toLocaleString(
                                  "en-US",
                                )}
                              </p>
                            )}
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
              <Button
                onClick={handleCheckout}
                disabled={cartItems.length === 0 || isLoading}
                className="w-full sm:w-auto"
              >
                Checkout ({formatCurrency(totalAmount)})
              </Button>
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

              {/* Order Summary */}
              <div className="max-w-md mx-auto">
                <div className="bg-muted p-4 rounded-lg text-center">
                  <h3 className="font-medium mb-3">Order Summary</h3>
                  <div className="space-y-2 text-sm">
                    {cartItems.map((item) => (
                      <div key={item.id} className="flex justify-between">
                        <span>{item.service_name}</span>
                        <span>{formatCurrency(item.price)}</span>
                      </div>
                    ))}
                  </div>
                  <Separator className="my-3" />
                  <div className="flex justify-between font-semibold text-base">
                    <span>Total:</span>
                    <span>{formatCurrency(totalAmount)}</span>
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
