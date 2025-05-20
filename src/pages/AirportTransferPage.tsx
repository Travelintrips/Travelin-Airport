import { LoadScriptNext } from "@react-google-maps/api";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "../lib/supabase";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/useAuth";

// UI Components
import { ArrowRightCircle, UserCheck, CarFront } from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

// Custom Components
import AddressSearch from "@/components/AddressSearch";
import MapPicker from "@/components/MapPicker";

// Icons
import {
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  ArrowRightLeft,
  Loader2,
  MapPin,
  Car,
  CheckCircle,
  Phone,
  Home,
  ChevronRight,
} from "lucide-react";

// Types
interface BookingFormData {
  fromLocation: [number, number];
  toLocation: [number, number];
  fromAddress: string;
  toAddress: string;
  pickupDate: string;
  pickupTime: string;
  passenger: number;
  vehicleType: string;
  fullName: string;
  phoneNumber: string;
  paymentMethod: string;
  price: number;
  distance: number;
  duration: number;
  bookingCode: string;
  driverId: string | null;
  driverName: string;
  driverPhone: string;
  driverPhoto: string;
  vehicleName: string;
  vehicleModel: string;
  vehiclePlate: string;
  vehicleColor: string;
  vehicleType: string;
}

interface Driver {
  id: string;
  driver_name: string;
  phone_number: string;
  status: string;
  photo_url?: string;
  vehicle_name?: string;
  vehicle_model?: string;
  license_plate?: string;
  distance?: number;
  eta?: number;
}

function AirportTransferPageContent() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAuthenticated, userId, userName, userEmail } = useAuth();

  // Step tracking
  const [currentStep, setCurrentStep] = useState<number>(1);
  const totalSteps = 5;
  const progressPercentage = (currentStep / totalSteps) * 100;

  // Form data
  const [formData, setFormData] = useState<BookingFormData>({
    fromLocation: [-6.2, 106.8], // Jakarta default
    toLocation: [-6.2, 106.8],
    fromAddress: "",
    toAddress: "",
    pickupDate: "",
    pickupTime: "10:00",
    passenger: 1,
    vehicleType: "Sedan",
    fullName: userName || "",
    phoneNumber: "",
    paymentMethod: "cash",
    price: 0,
    distance: 0,
    duration: 0,
    bookingCode: generateBookingCode(),
    driverId: null,
    driverName: "",
    driverPhone: "",
    driverPhoto: "",
    vehicleName: "",
    vehicleModel: "",
    vehiclePlate: "",
    surcharge: 0,
    parking: 10000,
  });

  // UI states
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showFromMap, setShowFromMap] = useState<boolean>(false);
  const [showToMap, setShowToMap] = useState<boolean>(false);
  const [availableDrivers, setAvailableDrivers] = useState<Driver[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [isSearchingDriver, setIsSearchingDriver] = useState<boolean>(false);

  // Fetch user data if authenticated
  useEffect(() => {
    const fetchUserData = async () => {
      if (isAuthenticated && userId) {
        try {
          const { data, error } = await supabase
            .from("users")
            .select("full_name, phone")
            .eq("id", userId)
            .single();

          if (data && !error) {
            console.log("User data fetched:", data);
            setFormData((prev) => ({
              ...prev,
              fullName: data.full_name || userName || "",
              phoneNumber: data.phone || "",
            }));
          } else {
            console.log("No user data found, using auth data");
            setFormData((prev) => ({
              ...prev,
              fullName: userName || "",
            }));
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      }
    };

    fetchUserData();
  }, [isAuthenticated, userId, userName]);

  // Terminal options for airport
  const terminals = [
    { name: "Terminal 1A", position: [-6.125766, 106.65616] },
    { name: "Terminal 2D", position: [-6.123753973054377, 106.65172265118323] },
    { name: "Terminal 2E", position: [-6.122176573287238, 106.65300357936765] },
    { name: "Terminal 2F", position: [-6.126944, 106.6575] },
    {
      name: "Terminal 3 Domestik",
      position: [-6.119777589726106, 106.66638611807755],
    },
    {
      name: "Terminal 3 International",
      position: [-6.119777589726106, 106.66638611807755],
    },
  ];

  // Vehicle types
  const vehicleTypes = [
    // { name: "Sedan", basePrice: 100000, additionalRate: 4000 },
    { name: "SUV", basePrice: 120000, additionalRate: 5000 },
    { name: "MPV", basePrice: 85000, additionalRate: 4500 },
    { name: "MPV Premium", basePrice: 120000, additionalRate: 6000 },
    { name: "Electric", basePrice: 95000, additionalRate: 5500 },
  ];

  // Calculate route distance and duration
  useEffect(() => {
    if (formData.fromLocation[0] !== 0 && formData.toLocation[0] !== 0) {
      getRouteDetails(formData.fromLocation, formData.toLocation);
    }
  }, [formData.fromLocation, formData.toLocation]);

  // Calculate price when distance or vehicle type changes
  useEffect(() => {
    if (formData.distance > 0 && formData.vehiclePricePerKm > 0) {
      const price = calculatePrice(
        formData.distance,
        formData.vehiclePricePerKm,
      );
      setFormData((prev) => ({ ...prev, price }));
    }
  }, [formData.distance, formData.vehiclePricePerKm]);

  // Validate form based on current step
  const isCurrentStepValid = () => {
    switch (currentStep) {
      case 1: // Location & Schedule
        return (
          formData.fromAddress.trim() !== "" &&
          formData.toAddress.trim() !== "" &&
          formData.pickupDate !== "" &&
          formData.pickupTime !== ""
        );
      case 2: // Map & Route
        return formData.distance > 0;
      case 3: // Driver Selection
        return selectedDriver !== null && availableDrivers.length > 0;
      case 4: // Booking Confirmation
        return (
          formData.fullName.trim() !== "" &&
          formData.phoneNumber.trim() !== "" &&
          formData.paymentMethod !== "" &&
          formData.driverId !== null
        );
      default:
        return true;
    }
  };

  // Generate a unique booking code
  function generateBookingCode() {
    return `AT-${Math.floor(100000 + Math.random() * 900000)}`;
  }

  // Calculate price based on distance and vehicle type
  function calculatePrice(distanceKm: number, pricePerKm: number): number {
    const baseDistance = 10;
    const parking = 10000;

    const vehicleType = formData.vehicleType;

    // Default values
    let basePrice = 100000;
    let surcharge = 30000;

    // Kondisi berdasarkan jenis kendaraan
    if (vehicleType === "MPV") {
      basePrice = 85000;
      surcharge = 30000;
    } else if (vehicleType === "Electric") {
      basePrice = 95000;
      surcharge = 45000;
    } else if (vehicleType === "MPV Premium") {
      basePrice = 120000;
      surcharge = 50000; // atau bisa diubah jika berbeda
    }

    let total = basePrice;

    if (distanceKm > baseDistance) {
      const additionalDistance = Math.ceil(distanceKm - baseDistance);
      total += additionalDistance * pricePerKm;
    }

    return total + surcharge + parking;
  }

  // Get route details using OSRM
  async function getRouteDetails(from: [number, number], to: [number, number]) {
    const [fromLat, fromLng] = from;
    const [toLat, toLng] = to;

    try {
      const res = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=false`,
      );
      const data = await res.json();

      if (data.routes && data.routes.length > 0) {
        const distanceKm = data.routes[0].distance / 1000; // convert to km
        const durationMin = Math.ceil(data.routes[0].duration / 60); // convert to minutes

        setFormData((prev) => ({
          ...prev,
          distance: distanceKm,
          duration: durationMin,
        }));
      } else {
        console.warn("No route found from OSRM");
        toast({
          title: "Route Error",
          description: "Could not calculate route between locations",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Error calling OSRM:", err);
      toast({
        title: "Service Error",
        description: "Could not connect to routing service",
        variant: "destructive",
      });
    }
  }

  // Handle location swap
  const handleSwapLocation = () => {
    setFormData((prev) => ({
      ...prev,
      fromLocation: prev.toLocation,
      toLocation: prev.fromLocation,
      fromAddress: prev.toAddress,
      toAddress: prev.fromAddress,
    }));
  };

  // Search for available drivers
  const searchDrivers = async () => {
    setIsSearchingDriver(true);
    try {
      // First try to find onride drivers
      const { data: onrideDrivers, error: onrideError } = await supabase
        .from("bookings")
        .select(
          `
    driver_id,
    vehicle_id,
    status,
    drivers (
      id,
      name,
      phone,
      selfie_url
    ),
    vehicles (
      make,
      model,
      type,
      license_plate,
      color,
      price_km
    )
  `,
        )
        .in("status", ["onride", "confirmed"]);

      if (onrideError) {
        console.error("Error fetching onride drivers:", onrideError);
        throw onrideError;
      }

      // Format driver data
      const driverData = (onrideDrivers || [])
        .filter((item) => item.drivers && item.vehicles)
        .filter((item) => item.vehicles.type === formData.vehicleType) // ✅ Filter by selected vehicleType
        .map((item) => ({
          id: item.drivers.id,
          driver_name: item.drivers.name,
          phone_number: item.drivers.phone,
          status: item.status,
          photo_url: item.drivers.selfie_url,
          license_plate: item.vehicles.license_plate,
          vehicle_name: item.vehicles.make,
          vehicle_model: item.vehicles.model,
          vehicle_type: item.vehicles.type,
          vehicle_color: item.vehicles.color,
          distance: Math.round(Math.random() * 5 + 1),
          eta: Math.round(Math.random() * 10 + 5),
          price_km: item.vehicles.price_km || 0,
        }));

      if (driverData.length > 0) {
        setAvailableDrivers(driverData);
        return;
      }

      // If no onride drivers, find available drivers
      const { data: availableDriversData, error: availableError } =
        await supabase
          .from("drivers")
          .select("id, name, phone, status, selfie_url")
          .eq("status", "available")
          .limit(5);

      if (availableError) {
        console.error("Error fetching available drivers:", availableError);
        throw availableError;
      }

      // Format available drivers
      const availableDriversFormatted = (availableDriversData || []).map(
        (driver) => ({
          id: driver.id,
          driver_name: driver.name,
          phone_number: driver.phone,
          status: driver.status,
          photo_url: driver.selfie_url,
          // Simulate distance and ETA for demo purposes
          distance: Math.round(Math.random() * 10 + 5), // 5-15 km
          eta: Math.round(Math.random() * 15 + 10), // 10-25 minutes
        }),
      );

      setAvailableDrivers(availableDriversFormatted);
    } catch (err) {
      console.error("Error searching drivers:", err);
      toast({
        title: "Driver Search Failed",
        description: "Could not find available drivers",
        variant: "destructive",
      });
    } finally {
      setIsSearchingDriver(false);
    }
  };

  // Select a driver
  const handleSelectDriver = (driver: Driver) => {
    setSelectedDriver(driver);

    const dynamicSurcharge =
      driver.vehicle_type === "Electric"
        ? 45000
        : driver.vehicle_type === "MPV"
          ? 30000
          : 30000; // default fallback

    setFormData((prev) => ({
      ...prev,
      driverId: driver.id,
      driverName: driver.driver_name,
      driverPhone: driver.phone_number,
      driverPhoto: driver.photo_url || "",
      vehicleType: driver.vehicle_type || "",
      vehicleName: driver.vehicle_name || "Unknown",
      vehicleModel: driver.vehicle_model || "",
      vehiclePlate: driver.license_plate || "N/A",
      vehicleColor: driver.vehicle_color || "N/A",
      vehiclePricePerKm: driver.price_km || 0,
      surcharge: dynamicSurcharge, // ✅ Tambahan penting
    }));
  };

  // Handle next step
  const handleNextStep = async () => {
    if (currentStep === 2) {
      // Before moving to driver selection, search for drivers
      setIsLoading(true);
      await searchDrivers();
      setIsLoading(false);
    }

    if (currentStep === 4) {
      // Submit booking
      await handleSubmitBooking();
    } else {
      // Move to next step
      setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
    }
  };

  // Handle previous step
  const handlePrevStep = () => {
    // If going back from confirmation to driver selection, reset driver selection
    if (currentStep === 4) {
      setSelectedDriver(null);
      setFormData((prev) => ({
        ...prev,
        driverId: null,
        driverName: "",
        driverPhone: "",
        driverPhoto: "",
        vehicleName: "",
        vehicleModel: "",
        vehiclePlate: "",
        vehicleColor: "",
      }));
    }
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  // Submit booking to database
  const handleSubmitBooking = async () => {
    setIsLoading(true);
    try {
      const bookingData = {
        booking_code: formData.bookingCode,
        customer_name: formData.fullName,
        phone: formData.phoneNumber,
        pickup_location: formData.fromAddress,
        dropoff_location: formData.toAddress,
        pickup_date: formData.pickupDate,
        pickup_time: formData.pickupTime,
        type: formData.vehicleType,
        price: formData.price,
        passenger: formData.passenger,
        driver_id: formData.driverId,
        driver_name: formData.driverName,
        payment_method: formData.paymentMethod,
        distance: formData.distance,
        duration: formData.duration,
        status: "confirmed",
      };

      const { data, error } = await supabase
        .from("airport_transfer")
        .insert([bookingData]);

      if (error) {
        throw error;
      }

      // Move to success step
      setCurrentStep(5);

      // Send notification (simulated)
      console.log("Sending booking notification to customer and driver");
    } catch (error) {
      console.error("Error submitting booking:", error);
      toast({
        title: "Booking Failed",
        description: "Could not complete your booking. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentStep === 3) {
      searchDrivers(); // Re-search when vehicle type changes
    }
  }, [formData.vehicleType]);

  // Use current location
  const useCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          try {
            const response = await fetch(
              `https://wvqlwgmlijtcutvseyey.functions.supabase.co/google-place-details`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  location: { lat, lng },
                  get_address_from_location: true,
                }),
              },
            );
            const data = await response.json();
            if (data.formatted_address) {
              setFormData((prev) => ({
                ...prev,
                fromLocation: [lat, lng],
                fromAddress: data.formatted_address,
              }));
              toast({
                title: "Location Found",
                description: "Using your current location as pickup point",
              });
            }
          } catch (error) {
            console.error("Error getting address from location:", error);
            toast({
              title: "Location Error",
              description: "Could not determine your address",
              variant: "destructive",
            });
          }
        },
        (error) => {
          console.error("Error getting location:", error);
          toast({
            title: "Location Access Denied",
            description: "Please enable location services to use this feature",
            variant: "destructive",
          });
        },
      );
    } else {
      toast({
        title: "Not Supported",
        description: "Geolocation is not supported by your browser",
        variant: "destructive",
      });
    }
  };

  // Render step content based on current step
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return renderLocationAndScheduleStep();
      case 2:
        return renderMapAndRouteStep();
      case 3:
        return renderDriverSelectionStep();
      case 4:
        return renderBookingConfirmationStep();
      case 5:
        return renderBookingSuccessStep();
      default:
        return renderLocationAndScheduleStep();
    }
  };

  // Step 1: Location and Schedule
  const renderLocationAndScheduleStep = () => {
    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Pickup & Dropoff Locations</h3>

          {/* Pickup Location */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <label className="text-sm font-medium">Pickup Location</label>

              {/* Use My Location Option – responsif di mobile */}
              <div
                className="inline-flex items-center gap-1 bg-white border border-gray-300 rounded-md shadow-sm px-3 py-1 text-sm cursor-pointer hover:bg-gray-100 active:scale-[0.98] transition"
                onClick={useCurrentLocation}
                onTouchStart={useCurrentLocation} // ✅ fix untuk mobile touch
              >
                <MapPin className="h-4 w-4 text-blue-500" />
                <span>Use My Location</span>
              </div>
            </div>

            {/* Input field */}
            <div className="relative z-30">
              <AddressSearch
                label=""
                value={formData.fromAddress}
                onChange={(value) =>
                  setFormData((prev) => ({ ...prev, fromAddress: value }))
                }
                onSelectPosition={(pos) =>
                  setFormData((prev) => ({ ...prev, fromLocation: pos }))
                }
                placeholder="Enter pickup location"
              />
            </div>
          </div>

          {/* Dropoff Location */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <label className="text-sm font-medium">Dropoff Location</label>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleSwapLocation}
                className="h-8 px-2 w-max"
              >
                <ArrowRightLeft className="h-4 w-4 mr-1" />
                Swap
              </Button>
            </div>

            <div className="relative z-30">
              <AddressSearch
                label=""
                value={formData.toAddress}
                onChange={(value) =>
                  setFormData((prev) => ({ ...prev, toAddress: value }))
                }
                onSelectPosition={(pos) =>
                  setFormData((prev) => ({ ...prev, toLocation: pos }))
                }
                placeholder="Enter dropoff location"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Schedule & Passengers</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pickup Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Pickup Date</label>
              <div className="relative">
                <Input
                  type="date"
                  value={formData.pickupDate}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      pickupDate: e.target.value,
                    }))
                  }
                  min={new Date().toISOString().split("T")[0]}
                  className="pl-10"
                />
                <Calendar className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
            </div>

            {/* Pickup Time */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Pickup Time</label>
              <div className="relative">
                <Input
                  type="time"
                  value={formData.pickupTime}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      pickupTime: e.target.value,
                    }))
                  }
                  className="pl-10"
                />
                <Clock className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
            {/* Passengers */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Passengers</label>
              <div className="relative">
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={formData.passenger}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      passenger: parseInt(e.target.value),
                    }))
                  }
                  className="pl-10"
                />
                <Users className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Step 2: Map and Route
  const renderMapAndRouteStep = () => {
    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Route Preview</h3>

          <div className="bg-white rounded-md overflow-hidden border">
            <MapPicker
              fromLocation={formData.fromLocation}
              toLocation={formData.toLocation}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <h4 className="text-sm font-medium text-gray-500">
                    Distance
                  </h4>
                  <p className="text-2xl font-bold">
                    {formData.distance.toFixed(1)} km
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <h4 className="text-sm font-medium text-gray-500">
                    Duration
                  </h4>
                  <p className="text-2xl font-bold">{formData.duration} min</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 text-center">
                <div className="flex items-center justify-center">
                  <div className="bg-blue-100 text-blue-600 rounded-full p-3">
                    <Car className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="bg-blue-50 p-4 rounded-md">
            <h4 className="font-medium text-blue-700">Route Details</h4>
            <div className="mt-2 space-y-2">
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <div className="h-4 w-4 rounded-full bg-green-500"></div>
                </div>
                <div>
                  <p className="font-medium">Pickup</p>
                  <p className="text-sm text-gray-600">
                    {formData.fromAddress}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <div className="h-4 w-4 rounded-full bg-red-500"></div>
                </div>
                <div>
                  <p className="font-medium">Dropoff</p>
                  <p className="text-sm text-gray-600">{formData.toAddress}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Step 3: Driver Selection
  const renderDriverSelectionStep = () => {
    return (
      <div className="space-y-6">
        {/* Vehicle Type */}
        <div className="space-y-2">
          <h3 className="text-lg font-medium">Vehicle Type</h3>
          <select
            value={formData.vehicleType}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                vehicleType: e.target.value,
              }))
            }
            className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            {vehicleTypes.map((type) => (
              <option key={type.name} value={type.name}>
                {type.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Available Drivers</h3>

          {isSearchingDriver ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
              <p className="text-gray-500">
                Searching for available drivers...
              </p>
            </div>
          ) : availableDrivers.length > 0 ? (
            <div className="space-y-4">
              {availableDrivers.map((driver) => (
                <div
                  key={driver.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${selectedDriver?.id === driver.id ? "border-blue-500 bg-blue-50" : "hover:border-gray-400"}`}
                  onClick={() => handleSelectDriver(driver)}
                >
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-full bg-gray-200 overflow-hidden">
                      {driver.photo_url ? (
                        <img
                          src={driver.photo_url}
                          alt={driver.driver_name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-blue-100 text-blue-500">
                          <Users className="h-8 w-8" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1">
                      <h4 className="font-medium flex items-center gap-2">
                        {driver.driver_name}
                        {driver.vehicle_type && (
                          <span className="text-xs font-medium text-white px-2 py-0.5 rounded bg-gray-700">
                            {driver.vehicle_type}
                          </span>
                        )}
                      </h4>

                      <p className="text-sm text-gray-500">
                        {driver.phone_number}
                      </p>

                      <div className="flex items-center gap-4 mt-1 flex-wrap">
                        {/* Status */}
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                          {driver.status === "onride" ? "On Ride" : "Available"}
                        </span>

                        {/* Detail kendaraan */}
                        <span className="text-xs text-gray-500">
                          {driver.vehicle_name && driver.vehicle_model
                            ? `${driver.vehicle_name} ${driver.vehicle_model}`
                            : "Unknown Model"}{" "}
                          • {driver.license_plate || "N/A"}{" "}
                          {driver.vehicle_color && (
                            <span className="ml-1 text-xs text-gray-700 font-semibold">
                              {driver.vehicle_color}
                            </span>
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {driver.distance} km away
                      </div>
                      <div className="text-xs text-gray-500">
                        ETA: {driver.eta} min
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
              <div className="flex flex-col items-center">
                <Car className="h-12 w-12 text-yellow-500 mb-4" />
                <h4 className="text-lg font-medium mb-2">No drivers found</h4>
                <p className="text-gray-600 mb-4">
                  We couldn't find any available drivers at the moment.
                </p>
                <Button onClick={searchDrivers}>Try Again</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Step 4: Booking Confirmation
  const renderBookingConfirmationStep = () => {
    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Personal Information</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Full Name</label>
              {isAuthenticated ? (
                <div className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  {formData.fullName}
                </div>
              ) : (
                <Input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      fullName: e.target.value,
                    }))
                  }
                  placeholder="Enter your full name"
                />
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Phone Number</label>
              {isAuthenticated ? (
                <div className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  {formData.phoneNumber}
                </div>
              ) : (
                <Input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      phoneNumber: e.target.value,
                    }))
                  }
                  placeholder="Enter your phone number"
                />
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Booking Summary</h3>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-500">Pickup</span>
                  <span className="font-medium text-right">
                    {formData.fromAddress}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500">Dropoff</span>
                  <span className="font-medium text-right">
                    {formData.toAddress}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500">Date & Time</span>
                  <span className="font-medium">
                    {new Date(formData.pickupDate).toLocaleDateString()} at{" "}
                    {formData.pickupTime}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500">Driver</span>
                  <span className="font-medium">{formData.driverName}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500">Vehicle Model</span>
                  <span className="font-medium">{formData.vehicleModel}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500">Vehicle Type</span>
                  <span className="font-medium">{formData.vehicleType}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500">Plate Number</span>
                  <span className="font-medium">
                    {formData.vehiclePlate || "N/A"}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500">Vehicle Color</span>
                  <span className="font-medium">
                    {formData.vehicleColor || "Unknown"}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500">Passengers</span>
                  <span className="font-medium">{formData.passenger}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500">Surcharge</span>
                  <span className="font-medium">
                    Rp {formData.surcharge?.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500">Parking</span>
                  <span className="font-medium">
                    Rp {formData.parking?.toLocaleString() || "10,000"}
                  </span>
                </div>

                <div className="pt-2 border-t">
                  <div className="flex justify-between">
                    <span className="font-medium">Total Price</span>
                    <span className="font-bold text-lg">
                      Rp {formData.price.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Payment Method</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div
              className={`border rounded-lg p-4 cursor-pointer transition-all ${formData.paymentMethod === "cash" ? "border-blue-500 bg-blue-50" : "hover:border-gray-400"}`}
              onClick={() =>
                setFormData((prev) => ({ ...prev, paymentMethod: "cash" }))
              }
            >
              <div className="flex items-center gap-2">
                <div
                  className={`h-4 w-4 rounded-full border ${formData.paymentMethod === "cash" ? "border-4 border-blue-500" : "border border-gray-300"}`}
                ></div>
                <span>Cash</span>
              </div>
            </div>

            <div
              className={`border rounded-lg p-4 cursor-pointer transition-all ${formData.paymentMethod === "qris" ? "border-blue-500 bg-blue-50" : "hover:border-gray-400"}`}
              onClick={() =>
                setFormData((prev) => ({ ...prev, paymentMethod: "qris" }))
              }
            >
              <div className="flex items-center gap-2">
                <div
                  className={`h-4 w-4 rounded-full border ${formData.paymentMethod === "qris" ? "border-4 border-blue-500" : "border border-gray-300"}`}
                ></div>
                <span>QRIS / E-wallet</span>
              </div>
            </div>

            <div
              className={`border rounded-lg p-4 cursor-pointer transition-all ${formData.paymentMethod === "transfer" ? "border-blue-500 bg-blue-50" : "hover:border-gray-400"}`}
              onClick={() =>
                setFormData((prev) => ({ ...prev, paymentMethod: "transfer" }))
              }
            >
              <div className="flex items-center gap-2">
                <div
                  className={`h-4 w-4 rounded-full border ${formData.paymentMethod === "transfer" ? "border-4 border-blue-500" : "border border-gray-300"}`}
                ></div>
                <span>Bank Transfer</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Step 5: Booking Success
  const renderBookingSuccessStep = () => {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <div className="bg-green-100 rounded-full p-4 mb-6">
          <CheckCircle className="h-12 w-12 text-green-500" />
        </div>

        <h2 className="text-2xl font-bold mb-2">Booking Successful!</h2>
        <p className="text-gray-600 mb-6 text-center">
          Your airport transfer has been booked successfully.
        </p>

        <div className="bg-gray-50 w-full max-w-md rounded-lg p-6 mb-8">
          <div className="text-center mb-4">
            <h3 className="text-sm font-medium text-gray-500">
              Booking Reference
            </h3>
            <p className="text-xl font-bold">{formData.bookingCode}</p>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500">Date & Time</span>
              <span className="font-medium">
                {new Date(formData.pickupDate).toLocaleDateString()} at{" "}
                {formData.pickupTime}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-500">Driver</span>
              <span className="font-medium">{formData.driverName}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-500">Vehicle</span>
              <span className="font-medium">{formData.vehicleType}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-500">Payment</span>
              <span className="font-medium capitalize">
                {formData.paymentMethod}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => navigate(`/booking/${formData.bookingCode}`)}
          >
            <Car className="h-4 w-4" />
            Track Booking
          </Button>

          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={() =>
              (window.location.href = `tel:${formData.driverPhone}`)
            }
          >
            <Phone className="h-4 w-4" />
            Call Driver
          </Button>

          <Button
            className="flex items-center gap-2"
            onClick={() => navigate("/")}
          >
            <Home className="h-4 w-4" />
            Back to Home
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-blue-500 to-blue-700">
      {/* Header with back button */}
      <header className="p-4 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-0">
        <Button
          variant="outline"
          onClick={() => navigate("/")}
          className="bg-white/90 hover:bg-white"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("common.back")}
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" className="bg-white/90 hover:bg-white">
            IDR
          </Button>
          <Button
            variant="outline"
            className="bg-white/90 hover:bg-white flex items-center gap-1"
          >
            <img
              src="https://flagcdn.com/w20/gb.png"
              alt="English"
              className="h-4"
            />
            EN
          </Button>
        </div>
      </header>

      {/* Hero section */}
      <div className="text-center text-white px-4 py-6">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">
          {t("airportTransfer.title", "Airport transfers made")}
        </h1>
        <h2 className="text-2xl md:text-3xl font-bold mb-4">
          {t("airportTransfer.subtitle", "surprisingly easy and enjoyable!")}
        </h2>
      </div>

      {/* Main content */}
      <div className="mx-auto w-full max-w-5xl px-4 pb-8 flex-1 flex flex-col">
        <Card className="w-full">
          <CardHeader>
            <div className="w-full">
              {/* Progress bar */}
              <div className="mb-4">
                <Progress value={progressPercentage} className="h-2" />
              </div>

              {/* Step indicators */}
              <div className="flex justify-between">
                {[1, 2, 3, 4, 5].map((step) => (
                  <div
                    key={step}
                    className={`flex flex-col items-center ${currentStep >= step ? "text-blue-600" : "text-gray-400"}`}
                  >
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep >= step ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-400"}`}
                    >
                      {step}
                    </div>
                    <span className="text-xs mt-1 hidden sm:block">
                      {step === 1 && "Location"}
                      {step === 2 && "Route"}
                      {step === 3 && "Driver"}
                      {step === 4 && "Confirm"}
                      {step === 5 && "Success"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardHeader>

          <CardContent>{renderStepContent()}</CardContent>

          {currentStep < 5 && (
            <CardFooter className="flex justify-between">
              {currentStep > 1 ? (
                <Button
                  variant="outline"
                  onClick={handlePrevStep}
                  disabled={isLoading}
                >
                  Back
                </Button>
              ) : (
                <div></div>
              )}

              <Button
                onClick={handleNextStep}
                disabled={!isCurrentStepValid() || isLoading}
                className="min-w-[100px]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {currentStep === 4 ? "Booking..." : "Loading..."}
                  </>
                ) : (
                  <>
                    {currentStep === 4 ? "Confirm Booking" : "Next"}
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
}

export default function AirportTransferPage() {
  return (
    <TooltipProvider>
      <LoadScriptNext
        googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
        libraries={["places"]}
      >
        <AirportTransferPageContent />
      </LoadScriptNext>
    </TooltipProvider>
  );
}
