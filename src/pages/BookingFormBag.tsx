import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SuitcaseRolling, BriefcaseMetal, Boxes } from "lucide-react";
import { Laptop, MonitorSmartphone, TabletSmartphone } from "lucide-react";
import { Waves, Tent, Compass } from "lucide-react";
import { WheelchairIcon } from "@/components/icons";
import { SurfingIcon, GolfIcon, JoinedIcon } from "@/components/icons";
import { format } from "date-fns";
import {
  Package,
  PackageOpen,
  Luggage,
  Map as MapIcon,
  Loader2,
} from "lucide-react";
import BookingForm from "./BookingFormBag";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";
import { useShoppingCart } from "@/hooks/useShoppingCart";
import { useAuth } from "@/contexts/AuthContext";
import ShoppingCart from "@/components/booking/ShoppingCart";
import AuthRequiredModal from "@/components/auth/AuthRequiredModal";

interface BaggageSizeOption {
  id: string;
  size: string;
  price: number;
  icon: React.ReactNode;
  description: string;
}

interface AirportBaggageProps {
  onSelectSize: (size: string, price: number) => void;
  selectedSize?: string;
}

const AirportBaggage = ({
  onSelectSize = () => {},
  selectedSize = "",
}: AirportBaggageProps) => {
  const { toast } = useToast();
  const { addToCart } = useShoppingCart();
  const { userId, isLoading, isAuthenticated } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [bookingData, setBookingData] = useState({
    size: "",
    price: 0,
    name: "",
    contact: "",
    email: "",
    phone: "",
    durationType: "hours",
    hours: 4,
    date: "",
    endDate: "",
  });
  const [baggagePrices, setBaggagePrices] = useState<Record<string, number>>(
    {},
  );

  const handleViewMap = () => {
    setShowMap(true);
  };

  const handleCloseMap = () => {
    setShowMap(false);
  };

  const handleSizeSelect = (size: string, price: number) => {
    // Set current time when selecting size to ensure time validation works properly
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const currentTime = `${hours}:${minutes}`;

    setBookingData({
      ...bookingData,
      size,
      price,
      date: new Date().toISOString().split("T")[0],
      startTime: currentTime,
    });
    setShowForm(true);
    onSelectSize(size, price);
  };

  const handleBookingComplete = (data) => {
    console.log("📋 Booking completed with data:", data);
    const updatedBookingData = {
      ...bookingData,
      ...data,
      is_guest: !isAuthenticated || !userId, // Set is_guest flag based on auth status
    };
    setBookingData(updatedBookingData);
    // Only show receipt after booking is complete
    setShowReceipt(true);
  };

  const handleCloseReceipt = () => {
    setShowReceipt(false);
  };

  const handleViewCart = () => {
    setShowCart(true);
  };

  const handleCloseCart = () => {
    setShowCart(false);
  };

  // Fetch baggage prices from database
  const fetchBaggagePrices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("baggage_price")
        .select("*")
        .limit(1);

      if (error) {
        console.error("❌ Error fetching baggage prices:", error);
        toast({
          title: "Error",
          description: "Failed to fetch baggage prices",
          variant: "destructive",
        });
        // Set default prices if there's an error
        setBaggagePrices({
          small_price: 50000,
          medium_price: 75000,
          large_price: 100000,
          extra_large_price: 125000,
          electronic_price: 80000,
          surfingboard_price: 150000,
          wheelchair_price: 60000,
          stickgolf_price: 120000,
        });
        setLoading(false);
        return;
      }

      if (data && data.length > 0) {
        const priceData = data[0];

        console.log("📦 Raw data from baggage_price table:", priceData);

        // ✅ Parsing semua field yang berakhiran _price menjadi number
        const parsedPrices = Object.entries(priceData).reduce(
          (acc, [key, value]) => {
            if (key.endsWith("_price")) {
              acc[key] = Number(value) || 0;
            }
            return acc;
          },
          {} as Record<string, number>,
        );

        console.log("💰 Parsed baggage prices:", parsedPrices);
        setBaggagePrices(parsedPrices);
      } else {
        console.warn("⚠️ No data found in baggage_price table.");
        // Set default prices if no data found
        setBaggagePrices({
          small_price: 50000,
          medium_price: 75000,
          large_price: 100000,
          extra_large_price: 125000,
          electronic_price: 80000,
          surfingboard_price: 150000,
          wheelchair_price: 60000,
          stickgolf_price: 120000,
        });
      }
    } catch (error) {
      console.error("🚨 Exception in fetchBaggagePrices:", error);
      // Set default prices if there's an exception
      setBaggagePrices({
        small_price: 50000,
        medium_price: 75000,
        large_price: 100000,
        extra_large_price: 125000,
        electronic_price: 80000,
        surfingboard_price: 150000,
        wheelchair_price: 60000,
        stickgolf_price: 120000,
      });
    } finally {
      setLoading(false);
    }
  };

  // Load prices on component mount
  useEffect(() => {
    fetchBaggagePrices();
  }, []);

  const baggageOptions: BaggageSizeOption[] = [
    {
      id: "small",
      size: "Small",
      price: baggagePrices.small_price || 0,
      icon: <Package className="h-12 w-12" />,
      description: "Ideal for small bags, backpacks, or personal items",
    },
    {
      id: "medium",
      size: "Medium",
      price: baggagePrices.medium_price || 0,
      icon: <PackageOpen className="h-12 w-12" />,
      description: "Perfect for carry-on luggage or medium-sized bags",
    },
    {
      id: "large",
      size: "Large",
      price: baggagePrices.large_price || 0,
      icon: <Luggage className="h-12 w-12" />,
      description: "Best for large suitcases or multiple items",
    },
    {
      id: "extra_large",
      size: "Extra Large",
      price: baggagePrices.extra_large_price || 0,
      icon: <Boxes className="h-12 w-12" />,
      description: "Best for Extra large suitcases or multiple items",
    },

    {
      id: "electronic",
      size: "Electronics",
      price: baggagePrices.electronic_price,
      icon: <JoinedIcon className="h-12 w-12" />,
      description: "Best for Goods Electronic Laptop,Keyboards,Guitar,Camera",
    },

    {
      id: "surfingboard",
      size: "Surfing Board",
      price: baggagePrices.surfingboard_price || 0,
      icon: <SurfingIcon className="h-12 w-12" />,
      description:
        "Best for Long or wide items such as surfboards or sporting gear.",
    },

    {
      id: "wheelchair",
      size: "Wheel Chair",
      price: baggagePrices.wheelchair_price,
      icon: <WheelchairIcon className="h-12 w-12" />,
      description: "Best for Manual or foldable wheelchairs and mobility aids.",
    },

    {
      id: "stickgolf",
      size: "Stick Golf",
      price: baggagePrices.stickgolf_price || 0,
      icon: <GolfIcon className="h-12 w-12" />,
      description: "Best for Golf bags or long-shaped sports equipment.",
    },
  ];
  const navigate = useNavigate();

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);

  // Show loading state while loading prices
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48 mx-auto mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-32 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white">
      <div className="container-luggage mx-auto max-w-full bg-white">
        {/*AirportBaggage*/}
        <div className="min-h-screen bg-slate-50">
          {/* Header */}
          <header className="w-full bg-sky-700 text-white py-6 shadow-md">
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-0 sm:justify-between px-4 sm:px-6">
              {/* Tombol Back di kiri */}
              <Button
                variant="outline"
                className="text-black border-white hover:bg-white-600 shadow-md font-semibold px-4 py-2 rounded-md w-full sm:w-auto"
                onClick={() => navigate("/")} // ganti '/' jika halaman front page berbeda
              >
                ← Back
              </Button>

              {/* Judul di tengah */}
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-center w-full sm:flex-1 order-first sm:order-none">
                Airport Baggage Storage
              </h1>

              {/* Tombol View di kanan */}
              <Button
                variant="outline"
                className="text-blue-900 bg-white border-white hover:bg-blue-100 shadow-md font-semibold px-4 py-2 rounded-md w-full sm:w-auto"
                onClick={handleViewMap}
              >
                <MapIcon className="mr-2 h-4 w-4" /> View Storage Locations
              </Button>
            </div>
          </header>

          {/* Hero Section */}
          <section className="w-full py-8 sm:py-12 bg-gradient-to-b from-sky-600 to-sky-700 text-white">
            <div className="w-full px-4 sm:px-6">
              <div className="max-w-6xl mx-auto text-center">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 break-words">
                  Store Your Baggage Safely
                </h2>
                <p className="text-base sm:text-xl max-w-2xl mx-auto">
                  Enjoy your layover without the burden of carrying your
                  luggage. Our secure storage service is available 24/7
                  throughout the airport.
                </p>
              </div>
            </div>
          </section>

          {/* Main Content Baggage */}
          <section className="py-12">
            <div className="container mx-auto px-4">
              <Card className="bg-white shadow-lg">
                <CardContent className="p-6">
                  {!showForm ? (
                    <div>
                      <h2 className="text-2xl font-bold text-center mb-8">
                        Select Your Baggage Size
                      </h2>
                      {loading ? (
                        <div className="flex justify-center items-center py-12">
                          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                          <span className="ml-2">
                            Loading baggage prices...
                          </span>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 max-w-5xl mx-auto">
                          {baggageOptions.map((option) => (
                            <Card
                              key={option.id}
                              className={`cursor-pointer transition-all hover:shadow-lg ${bookingData.size === option.id ? "border-2 border-blue-500 shadow-md" : "border border-gray-200"}`}
                              onClick={() =>
                                handleSizeSelect(option.id, option.price)
                              }
                            >
                              <CardContent className="flex flex-col items-center justify-center p-6">
                                <div
                                  className={`p-4 rounded-full mb-4 ${bookingData.size === option.id ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-600"}`}
                                >
                                  {option.icon}
                                </div>
                                <h3 className="text-xl font-semibold mb-1">
                                  {option.size}
                                </h3>
                                <p className="text-lg font-bold text-blue-600 mb-2">
                                  {formatPrice(option.price)}
                                </p>

                                <p className="text-gray-500 text-center text-sm mb-4">
                                  {option.description}
                                </p>
                                <div className="flex gap-2">
                                  <Button
                                    variant={
                                      bookingData.size === option.id
                                        ? "default"
                                        : "outline"
                                    }
                                    className="flex-1"
                                    onClick={() =>
                                      handleSizeSelect(option.id, option.price)
                                    }
                                  >
                                    {bookingData.size === option.id
                                      ? "Selected"
                                      : "Select"}
                                  </Button>
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      try {
                                        await addToCart({
                                          item_type: "baggage",
                                          item_id: option.id,
                                          service_name: `Baggage Storage - ${option.size}`,
                                          price: option.price,
                                          details: {
                                            size: option.size,
                                            description: option.description,
                                          },
                                        });
                                      } catch (error) {
                                        console.error(
                                          "Failed to add to cart:",
                                          error,
                                        );
                                      }
                                    }}
                                  >
                                    + Cart
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <h2 className="text-2xl font-bold text-center mb-8">
                        Complete Your Booking
                      </h2>
                      <BookingForm
                        selectedSize={
                          bookingData.size as
                            | "small"
                            | "medium"
                            | "large"
                            | "extra_large"
                            | "electronic"
                            | "surfing_board"
                            | "wheelchair"
                            | "stickgolf"
                        }
                        baggagePrices={baggagePrices}
                        onComplete={handleBookingComplete}
                        onCancel={() => setShowForm(false)}
                        initialDate={new Date()}
                        initialTime={bookingData.startTime}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Features Section */}
          <section className="py-12 bg-gray-100">
            <div className="container mx-auto px-4">
              <h2 className="text-2xl font-bold text-center mb-8">
                Why Choose Our Service
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                <Card className="bg-white">
                  <CardContent className="p-6 text-center">
                    <div className="rounded-full bg-sky-100 p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-8 w-8 text-sky-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold mb-2">
                      Secure Storage
                    </h3>
                    <p className="text-gray-600">
                      Your belongings are kept in a monitored, secure area with
                      24/7 surveillance.
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-white">
                  <CardContent className="p-6 text-center">
                    <div className="rounded-full bg-sky-100 p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-8 w-8 text-sky-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Quick & Easy</h3>
                    <p className="text-gray-600">
                      Drop off and pick up your baggage in minutes with our
                      efficient service.
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-white">
                  <CardContent className="p-6 text-center">
                    <div className="rounded-full bg-sky-100 p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-8 w-8 text-sky-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold mb-2">
                      Affordable Rates
                    </h3>
                    <p className="text-gray-600">
                      Competitive pricing with options for different baggage
                      sizes and durations.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="bg-gray-800 text-white py-8">
            <div className="container mx-auto px-4 text-center">
              <p>
                © {new Date().getFullYear()} Airport Baggage Storage. All
                rights reserved.
              </p>
              <div className="mt-4">
                <a href="#" className="text-sky-300 hover:text-sky-100 mx-2">
                  Terms of Service
                </a>
                <a href="#" className="text-sky-300 hover:text-sky-100 mx-2">
                  Privacy Policy
                </a>
                <a href="#" className="text-sky-300 hover:text-sky-100 mx-2">
                  Contact Us
                </a>
              </div>
            </div>
          </footer>

          {/* Modals */}
          {showReceipt && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
              <Card className="w-full max-w-md bg-white">
                <CardContent className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold">Booking Receipt</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCloseReceipt}
                    >
                      ✕
                    </Button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-500">Baggage Size</p>
                      <p className="font-medium">
                        {baggageOptions.find(
                          (opt) => opt.id === bookingData.size,
                        )?.size || ""}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Name</p>
                      <p className="font-medium">{bookingData.name || ""}</p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="font-medium">{bookingData.email || ""}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Phone</p>
                      <p className="font-medium">{bookingData.phone || ""}</p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500">Price</p>
                      <p className="font-medium">
                        Rp {bookingData.price.toLocaleString("id-ID")}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Duration</p>
                      <p className="font-medium">
                        {bookingData.duration
                          ? `${bookingData.duration} ${bookingData.durationType === "days" ? "day(s)" : "hour(s)"}`
                          : ""}
                      </p>
                    </div>
                    {bookingData.durationType === "hours" && (
                      <div>
                        <p className="text-sm text-gray-500">Start Date</p>
                        <p className="font-medium">
                          {format(
                            new Date(bookingData.date),
                            "MMMM d, yyyy - HH:mm",
                          )}
                        </p>
                      </div>
                    )}

                    {bookingData.durationType === "days" && (
                      <>
                        <div>
                          <p className="text-sm text-gray-500">Start Date</p>
                          <p className="font-medium">
                            {format(
                              new Date(bookingData.startDate),
                              "MMMM d, yyyy - HH:mm",
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">End Date</p>
                          <p className="font-medium">
                            {format(
                              new Date(bookingData.endDate),
                              "MMMM d, yyyy",
                            )}
                          </p>
                        </div>
                      </>
                    )}

                    <div>
                      <p className="text-sm text-gray-500">Booking ID</p>
                      <p className="font-medium">
                        {Math.random()
                          .toString(36)
                          .substring(2, 10)
                          .toUpperCase()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Storage Location</p>
                      <p className="font-medium">{`Terminal ${Math.floor(Math.random() * 3) + 1}, Level ${Math.floor(Math.random() * 2) + 1}`}</p>
                    </div>
                    <div className="flex justify-center">
                      <div className="text-center">
                        <p className="font-medium">Travelin Baggage</p>
                        <p className="text-sm text-gray-500">
                          Thank you for your order
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 flex justify-end space-x-2">
                      <Button variant="outline" onClick={handleCloseReceipt}>
                        Close
                      </Button>
                      <Button
                        onClick={() => {
                          navigate("/cart");
                          handleCloseReceipt();
                        }}
                      >
                        View Cart
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {showMap && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
              <Card className="w-full max-w-4xl bg-white">
                <CardContent className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold">
                      Airport Storage Locations
                    </h3>
                    <Button variant="ghost" size="sm" onClick={handleCloseMap}>
                      ✕
                    </Button>
                  </div>
                  <div className="bg-gray-200 h-96 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <MapIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">Airport Map View</p>
                      {bookingData.size && (
                        <p className="mt-2 font-medium text-blue-600">
                          Your baggage is stored at:{" "}
                          {`Terminal ${Math.floor(Math.random() * 3) + 1}, Level ${Math.floor(Math.random() * 2) + 1}`}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-6 flex justify-end">
                    <Button onClick={handleCloseMap}>Close</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Shopping Cart Modal */}
          <ShoppingCart isOpen={showCart} onClose={handleCloseCart} />
        </div>
        {/* End of Airport Baggage Storage section */}
      </div>
    </div>
  );
};

export default AirportBaggage;
