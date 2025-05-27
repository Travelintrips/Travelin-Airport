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

async function geocodeAddress(
  address: string,
): Promise<[number, number] | null> {
  if (!address || address.trim() === "") return null;

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
    );
    const data = await res.json();
    if (data.length > 0) {
      return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
    }
  } catch (err) {
    console.error("Geocoding failed:", err);
  }
  return null;
}

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
  vehicleMake: string;
  vehiclePricePerKm: number;
  basicPrice: number;
  surcharge: number;
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
  vehicle_color?: string;
  vehicle_make?: string;
  vehicle_type?: string;
  price_km?: number;
  basic_price?: number;
  surcharge?: number;
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
  const totalSteps = 4;
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
    //vehicleType: "Sedan",
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
    vehicleColor: "",
    vehicleMake: "",
    vehiclePricePerKm: 0,
    basicPrice: 0,
    surcharge: 0,
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
  {
    /*  const terminals = [
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
  ];*/
  }

  // Vehicle types - fetched dynamically from database
  const [vehicleTypes, setVehicleTypes] = useState<{ name: string }[]>([]);

  // Fetch available vehicle types from database
  useEffect(() => {
    const fetchVehicleTypes = async () => {
      try {
        const { data, error } = await supabase
          .from("vehicles")
          .select("type")
          .order("type")
          .distinct();

        if (error) {
          console.error("Error fetching vehicle types:", error);
          // Set default vehicle types if there's an error
          const defaultTypes = [
            { name: "Sedan" },
            { name: "SUV" },
            { name: "MPV" },
            { name: "MPV Premium" },
            { name: "Electric" },
          ];
          setVehicleTypes(defaultTypes);

          // Set default vehicle type if not already set
          if (!formData.vehicleType) {
            setFormData((prev) => ({
              ...prev,
              vehicleType: defaultTypes[0].name,
            }));
          }
          return;
        }

        if (data && data.length > 0) {
          const types = data.map((item) => ({ name: item.type }));
          setVehicleTypes(types);

          // Set default vehicle type if not already set
          if (!formData.vehicleType && types.length > 0) {
            setFormData((prev) => ({
              ...prev,
              vehicleType: types[0].name,
            }));
          }
        } else {
          // If no data returned, set default vehicle types
          const defaultTypes = [
            { name: "Sedan" },
            { name: "SUV" },
            { name: "MPV" },
            { name: "MPV Premium" },
            { name: "Electric" },
          ];
          setVehicleTypes(defaultTypes);

          // Set default vehicle type if not already set
          if (!formData.vehicleType) {
            setFormData((prev) => ({
              ...prev,
              vehicleType: defaultTypes[0].name,
            }));
          }
        }
      } catch (err) {
        console.error("Failed to fetch vehicle types:", err);
        // Set default vehicle types if there's an exception
        const defaultTypes = [
          { name: "Sedan" },
          { name: "SUV" },
          { name: "MPV" },
          { name: "MPV Premium" },
          { name: "Electric" },
        ];
        setVehicleTypes(defaultTypes);

        // Set default vehicle type if not already set
        if (!formData.vehicleType) {
          setFormData((prev) => ({
            ...prev,
            vehicleType: defaultTypes[0].name,
          }));
        }
      }
    };

    fetchVehicleTypes();
  }, []);

  // Calculate route distance and duration
  useEffect(() => {
    // Reset distance and duration when addresses change
    if (formData.fromAddress === "" || formData.toAddress === "") {
      setFormData((prev) => ({
        ...prev,
        distance: 0,
        duration: 0,
      }));
      return;
    }

    // Only calculate if we have valid coordinates and addresses
    if (
      formData.fromLocation[0] !== 0 &&
      formData.toLocation[0] !== 0 &&
      formData.fromAddress &&
      formData.toAddress
    ) {
      getRouteDetails(formData.fromLocation, formData.toLocation);
    }
  }, [
    formData.fromLocation,
    formData.toLocation,
    formData.fromAddress,
    formData.toAddress,
  ]);

  // Calculate price when distance, vehicle type, or vehicle price per km changes
  useEffect(() => {
    const calculatePriceFromData = async () => {
      if (formData.distance <= 0) return;

      try {
        // If we have a selected driver with all pricing data, use that
        if (selectedDriver) {
          // Ensure all price values are properly converted to numbers
          const price_km = Number(selectedDriver.price_km);
          const basic_price = Number(selectedDriver.basic_price);
          const surcharge = Number(selectedDriver.surcharge);

          console.log(
            `Calculating price for distance ${formData.distance}km with:`,
            {
              price_km,
              basic_price,
              surcharge,
            },
          );

          // Verify that we have valid numbers
          let price;
          if (isNaN(price_km) || isNaN(basic_price) || isNaN(surcharge)) {
            console.error("Invalid driver pricing data:", selectedDriver);
            // Fetch pricing data from database instead of using hardcoded defaults
            const vehiclePricing = await getPricingFromDatabase(
              formData.vehicleType,
            );
            price = calculatePrice(
              formData.distance,
              vehiclePricing.priceKm,
              vehiclePricing.basicPrice,
              vehiclePricing.surcharge,
            );
          } else {
            price = calculatePrice(
              formData.distance,
              price_km,
              basic_price,
              surcharge,
            );
          }
          setFormData((prev) => ({ ...prev, price }));
        }
        // Otherwise use the vehicle pricing data if available
        else if (formData.vehiclePricePerKm > 0) {
          // Ensure all price values are properly converted to numbers
          const price_km = Number(formData.vehiclePricePerKm);
          const basic_price = Number(formData.basicPrice);
          const surcharge = Number(formData.surcharge);

          console.log(
            `Calculating price for distance ${formData.distance}km with vehicle type data:`,
            {
              price_km,
              basic_price,
              surcharge,
            },
          );

          // Verify that we have valid numbers
          let price;
          if (isNaN(price_km) || isNaN(basic_price) || isNaN(surcharge)) {
            console.error("Invalid vehicle pricing data in form:", {
              price_km: formData.vehiclePricePerKm,
              basic_price: formData.basicPrice,
              surcharge: formData.surcharge,
            });
            // Fetch pricing data from database instead of using hardcoded defaults
            const vehiclePricing = await getPricingFromDatabase(
              formData.vehicleType,
            );
            price = calculatePrice(
              formData.distance,
              vehiclePricing.priceKm,
              vehiclePricing.basicPrice,
              vehiclePricing.surcharge,
            );
          } else {
            price = calculatePrice(
              formData.distance,
              price_km,
              basic_price,
              surcharge,
            );
          }
          setFormData((prev) => ({ ...prev, price }));
        }
        // If no pricing data is available, fetch from database
        else {
          // Fetch pricing data from database
          const vehiclePricing = await getPricingFromDatabase(
            formData.vehicleType,
          );
          const price = calculatePrice(
            formData.distance,
            vehiclePricing.priceKm,
            vehiclePricing.basicPrice,
            vehiclePricing.surcharge,
          );
          setFormData((prev) => ({ ...prev, price }));
        }
      } catch (error) {
        console.error("Error calculating price:", error);
        toast({
          title: "Price Calculation Error",
          description: "Could not calculate price. Please try again.",
          variant: "destructive",
        });
      }
    };

    calculatePriceFromData();
  }, [
    formData.distance,
    formData.vehiclePricePerKm,
    formData.basicPrice,
    formData.surcharge,
    formData.vehicleType,
    selectedDriver,
  ]);

  // Fetch vehicle pricing data when vehicle type changes
  useEffect(() => {
    const fetchVehiclePricing = async () => {
      if (!formData.vehicleType) return;

      try {
        const { data, error } = await supabase
          .from("vehicles")
          .select("price_km, basic_price, surcharge")
          .eq("type", formData.vehicleType)
          .limit(1);

        if (error) {
          console.error("Error fetching vehicle pricing:", error);
          // Use default values instead of showing error
          setFormData((prev) => ({
            ...prev,
            vehiclePricePerKm: 3250,
            basicPrice: 75000,
            surcharge: 40000,
          }));
          return;
        }

        if (!data || data.length === 0) {
          console.error(`No pricing data found for ${formData.vehicleType}`);
          // Use default values
          setFormData((prev) => ({
            ...prev,
            vehiclePricePerKm: 3250,
            basicPrice: 75000,
            surcharge: 40000,
          }));
          return;
        }

        // Ensure all price values are properly converted to numbers
        const price_km = Number(data[0].price_km);
        const basic_price = Number(data[0].basic_price);
        const surcharge = Number(data[0].surcharge);

        console.log(
          `Vehicle type ${formData.vehicleType} pricing from vehicles table:`,
          {
            price_km,
            basic_price,
            surcharge,
            original: {
              price_km: data[0].price_km,
              basic_price: data[0].basic_price,
              surcharge: data[0].surcharge,
            },
          },
        );

        // Verify that we have valid numbers
        if (isNaN(price_km) || isNaN(basic_price) || isNaN(surcharge)) {
          console.error("Invalid pricing data from database:", data[0]);
          // Use default values instead of showing error
          setFormData((prev) => ({
            ...prev,
            vehiclePricePerKm: 3250,
            basicPrice: 75000,
            surcharge: 40000,
          }));
          return;
        }

        setFormData((prev) => ({
          ...prev,
          vehiclePricePerKm: price_km,
          basicPrice: basic_price,
          surcharge: surcharge,
        }));
      } catch (err) {
        console.error("Failed to fetch vehicle pricing:", err);
        // Use default values instead of showing error
        setFormData((prev) => ({
          ...prev,
          vehiclePricePerKm: 3250,
          basicPrice: 75000,
          surcharge: 40000,
        }));
      }
    };

    fetchVehiclePricing();

    // Reset selected driver when vehicle type changes
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
      vehicleMake: "",
    }));
  }, [formData.vehicleType]);

  // Helper function to get pricing from database based on vehicle type
  async function getPricingFromDatabase(vehicleType: string) {
    try {
      const { data, error } = await supabase
        .from("vehicles")
        .select("price_km, basic_price, surcharge")
        .eq("type", vehicleType)
        .limit(1);

      if (error) {
        console.error(`Error fetching pricing for ${vehicleType}:`, error);
        // Return default values instead of throwing error
        return {
          priceKm: 3250,
          basicPrice: 75000,
          surcharge: 40000,
        };
      }

      if (!data || data.length === 0) {
        console.error(`No pricing data found for ${vehicleType}`);
        // Return default values
        return {
          priceKm: 3250,
          basicPrice: 75000,
          surcharge: 40000,
        };
      }

      // Ensure all values are numbers
      const priceKm = Number(data[0].price_km);
      const basicPrice = Number(data[0].basic_price);
      const surcharge = Number(data[0].surcharge);

      if (isNaN(priceKm) || isNaN(basicPrice) || isNaN(surcharge)) {
        console.error(`Invalid pricing data for ${vehicleType}:`, data[0]);
        // Return default values
        return {
          priceKm: 3250,
          basicPrice: 75000,
          surcharge: 40000,
        };
      }

      return { priceKm, basicPrice, surcharge };
    } catch (err) {
      console.error(`Failed to get pricing for ${vehicleType}:`, err);
      // Return default values instead of throwing error
      return {
        priceKm: 3250,
        basicPrice: 75000,
        surcharge: 40000,
      };
    }
  }

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
      case 2: // Map & Route + Driver Selection
        // Require driver selection to proceed
        return (
          formData.fromAddress && formData.toAddress && selectedDriver !== null
        );
      case 3: // Booking Confirmation
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

  // Calculate price based on distance and vehicle data from database
  function calculatePrice(
    distanceKm: number,
    pricePerKm: number,
    basicPrice: number,
    surcharge: number,
  ): number {
    // Validate inputs to prevent NaN results
    if (
      isNaN(distanceKm) ||
      isNaN(pricePerKm) ||
      isNaN(basicPrice) ||
      isNaN(surcharge)
    ) {
      console.error("Invalid price calculation inputs:", {
        distanceKm,
        pricePerKm,
        basicPrice,
        surcharge,
      });
      return 0;
    }

    const baseDistance = 8; // First 8 km use basic_price

    // Round distance to 1 decimal place for accuracy
    const roundedDistance = Math.round(distanceKm * 10) / 10;

    let total = 0;

    // Apply pricing formula
    if (roundedDistance <= baseDistance) {
      total = basicPrice + surcharge;
    } else {
      const extraDistance = roundedDistance - baseDistance;
      total = basicPrice + extraDistance * pricePerKm + surcharge;
    }

    console.log(`Price calculation for ${roundedDistance}km:`, {
      basicPrice,
      pricePerKm,
      surcharge,
      extraDistance:
        roundedDistance > baseDistance ? roundedDistance - baseDistance : 0,
      total,
    });

    return total;
  }

  // Get route details using OSRM
  async function getRouteDetails(
    from: [number, number] | null,
    to: [number, number] | null,
  ) {
    // Handle null values
    if (!from || !to) {
      console.warn("Missing coordinates for route calculation");
      return;
    }

    const [fromLat, fromLng] = from;
    const [toLat, toLng] = to;

    // Check if coordinates are valid
    if (fromLat === 0 || fromLng === 0 || toLat === 0 || toLng === 0) {
      console.warn("Invalid coordinates for route calculation");
      return;
    }

    // Check if coordinates are the same (very close locations)
    const isSameLocation =
      Math.abs(fromLat - toLat) < 0.0001 && Math.abs(fromLng - toLng) < 0.0001;

    if (isSameLocation) {
      // Set minimal values for same location
      setFormData((prev) => ({
        ...prev,
        distance: 0.1, // 100 meters minimum
        duration: 1, // 1 minute minimum
      }));
      return;
    }

    try {
      // Use car driving profile explicitly
      const res = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full`,
      );
      const data = await res.json();

      if (data.routes && data.routes.length > 0) {
        const distanceKm = Math.max(0.1, data.routes[0].distance / 1000); // convert to km, minimum 0.1
        const durationMin = Math.max(
          1,
          Math.ceil(data.routes[0].duration / 60),
        ); // convert to minutes, minimum 1

        setFormData((prev) => ({
          ...prev,
          distance: distanceKm,
          duration: durationMin,
        }));
      } else {
        console.warn("No route found from OSRM");
        // Set default values instead of showing error
        const directDistance = calculateDirectDistance(
          fromLat,
          fromLng,
          toLat,
          toLng,
        );
        setFormData((prev) => ({
          ...prev,
          distance: directDistance,
          duration: Math.ceil(directDistance * 2), // Rough estimate: 30km/h average speed
        }));
      }
    } catch (err) {
      console.error("Error calling OSRM:", err);
      // Calculate direct distance as fallback
      const directDistance = calculateDirectDistance(
        fromLat,
        fromLng,
        toLat,
        toLng,
      );
      setFormData((prev) => ({
        ...prev,
        distance: directDistance,
        duration: Math.ceil(directDistance * 2), // Rough estimate: 30km/h average speed
      }));
    }
  }

  // Calculate direct distance between two points using Haversine formula
  function calculateDirectDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) *
        Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km
    return Math.max(0.1, distance); // Minimum 0.1 km
  }

  function deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
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
      color
    )
  `,
        )
        .in("status", ["onride", "confirmed"]);

      if (onrideError) {
        console.error("Error fetching onride drivers:", onrideError);
        throw onrideError;
      }

      // Format driver data
      const driverData = [];

      // Process each onride driver
      for (const item of onrideDrivers || []) {
        if (!item.drivers || !item.vehicles) continue;
        if (item.vehicles.type !== formData.vehicleType) continue; // Filter by selected vehicleType

        try {
          // Fetch pricing data from vehicles table based on vehicle type
          const { data: pricingData, error: pricingError } = await supabase
            .from("vehicles")
            .select("price_km, basic_price, surcharge")
            .eq("type", item.vehicles.type)
            .limit(1);

          // Default values
          let price_km = 3250;
          let basic_price = 75000;
          let surcharge = 40000;

          if (pricingError) {
            console.error(
              `Error fetching pricing for ${item.vehicles.type}:`,
              pricingError,
            );
            // Continue with default values
          } else if (!pricingData || pricingData.length === 0) {
            console.error(`No pricing data found for ${item.vehicles.type}`);
            // Continue with default values
          } else {
            // Try to use database values if they exist and are valid
            const tempPriceKm = Number(pricingData[0].price_km);
            const tempBasicPrice = Number(pricingData[0].basic_price);
            const tempSurcharge = Number(pricingData[0].surcharge);

            // Only use database values if they are valid numbers
            if (!isNaN(tempPriceKm)) price_km = tempPriceKm;
            if (!isNaN(tempBasicPrice)) basic_price = tempBasicPrice;
            if (!isNaN(tempSurcharge)) surcharge = tempSurcharge;
          }

          console.log(
            `Driver ${item.drivers.name} pricing from vehicles table:`,
            {
              price_km,
              basic_price,
              surcharge,
            },
          );

          driverData.push({
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
            price_km,
            basic_price,
            surcharge,
          });
        } catch (err) {
          console.error(
            `Error processing onride driver ${item.drivers.name}:`,
            err,
          );
        }
      }

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
      const availableDriversFormatted = [];

      // Fetch vehicle pricing data once for the selected vehicle type
      const { data: vehiclePricing, error: vehiclePricingError } =
        await supabase
          .from("vehicles")
          .select("price_km, basic_price, surcharge")
          .eq("type", formData.vehicleType)
          .limit(1);

      if (vehiclePricingError) {
        console.error(
          `Error fetching pricing for ${formData.vehicleType}:`,
          vehiclePricingError,
        );
        // Use default values instead of throwing error
        const defaultValues = {
          price_km: 3250,
          basic_price: 75000,
          surcharge: 40000,
        };

        // For each available driver, use default pricing data
        for (const driver of availableDriversData || []) {
          availableDriversFormatted.push({
            id: driver.id,
            driver_name: driver.name,
            phone_number: driver.phone,
            status: driver.status,
            photo_url: driver.selfie_url,
            // Simulate distance and ETA for demo purposes
            distance: Math.round(Math.random() * 10 + 5), // 5-15 km
            eta: Math.round(Math.random() * 15 + 10), // 10-25 minutes
            // Add default pricing data
            price_km: defaultValues.price_km,
            basic_price: defaultValues.basic_price,
            surcharge: defaultValues.surcharge,
            vehicle_type: formData.vehicleType,
          });
        }

        setAvailableDrivers(availableDriversFormatted);
        return;
      }

      // Check if we have data
      if (!vehiclePricing || vehiclePricing.length === 0) {
        console.error(`No pricing data found for ${formData.vehicleType}`);
        // Use default values
        const defaultValues = {
          price_km: 3250,
          basic_price: 75000,
          surcharge: 40000,
        };

        // For each available driver, use default pricing data
        for (const driver of availableDriversData || []) {
          availableDriversFormatted.push({
            id: driver.id,
            driver_name: driver.name,
            phone_number: driver.phone,
            status: driver.status,
            photo_url: driver.selfie_url,
            // Simulate distance and ETA for demo purposes
            distance: Math.round(Math.random() * 10 + 5), // 5-15 km
            eta: Math.round(Math.random() * 15 + 10), // 10-25 minutes
            // Add default pricing data
            price_km: defaultValues.price_km,
            basic_price: defaultValues.basic_price,
            surcharge: defaultValues.surcharge,
            vehicle_type: formData.vehicleType,
          });
        }

        setAvailableDrivers(availableDriversFormatted);
        return;
      }

      // Get the first item from the array
      const pricingData = vehiclePricing[0];

      // Ensure all price values are properly converted to numbers
      const price_km = Number(pricingData.price_km);
      const basic_price = Number(pricingData.basic_price);
      const surcharge = Number(pricingData.surcharge);

      if (isNaN(price_km) || isNaN(basic_price) || isNaN(surcharge)) {
        console.error(
          `Invalid pricing data for ${formData.vehicleType}:`,
          vehiclePricing,
        );
        // Use default values instead of throwing error
        const defaultValues = {
          price_km: 3250,
          basic_price: 75000,
          surcharge: 40000,
        };

        // For each available driver, use default pricing data
        for (const driver of availableDriversData || []) {
          availableDriversFormatted.push({
            id: driver.id,
            driver_name: driver.name,
            phone_number: driver.phone,
            status: driver.status,
            photo_url: driver.selfie_url,
            // Simulate distance and ETA for demo purposes
            distance: Math.round(Math.random() * 10 + 5), // 5-15 km
            eta: Math.round(Math.random() * 15 + 10), // 10-25 minutes
            // Add default pricing data
            price_km: defaultValues.price_km,
            basic_price: defaultValues.basic_price,
            surcharge: defaultValues.surcharge,
            vehicle_type: formData.vehicleType,
          });
        }

        setAvailableDrivers(availableDriversFormatted);
        return;
      }

      // For each available driver, use the pricing data we fetched
      for (const driver of availableDriversData || []) {
        try {
          availableDriversFormatted.push({
            id: driver.id,
            driver_name: driver.name,
            phone_number: driver.phone,
            status: driver.status,
            photo_url: driver.selfie_url,
            // Simulate distance and ETA for demo purposes
            distance: Math.round(Math.random() * 10 + 5), // 5-15 km
            eta: Math.round(Math.random() * 15 + 10), // 10-25 minutes
            // Add vehicle pricing data from database
            price_km,
            basic_price,
            surcharge,
            vehicle_type: formData.vehicleType,
          });
        } catch (err) {
          console.error(`Error processing driver ${driver.name}:`, err);
        }
      }

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
  const handleSelectDriver = async (driver: Driver) => {
    setSelectedDriver(driver);

    try {
      // Get vehicle type from driver or use current form data
      const vehicleType = driver.vehicle_type || formData.vehicleType;

      // Fetch pricing data from database based on vehicle type
      const { data, error } = await supabase
        .from("vehicles")
        .select("price_km, basic_price, surcharge")
        .eq("type", vehicleType)
        .limit(1);

      // Default values to use if there's an error or no data
      let driverPriceKm = 3250;
      let driverBasicPrice = 75000;
      let driverSurcharge = 40000;

      if (error) {
        console.error(`Error fetching pricing for ${vehicleType}:`, error);
        // Continue with default values
      } else if (!data || data.length === 0) {
        console.error(`No pricing data found for ${vehicleType}`);
        // Continue with default values
      } else {
        // Ensure all price values are properly converted to numbers
        const tempPriceKm = Number(data[0].price_km);
        const tempBasicPrice = Number(data[0].basic_price);
        const tempSurcharge = Number(data[0].surcharge);

        // Only use database values if they are valid numbers
        if (!isNaN(tempPriceKm)) driverPriceKm = tempPriceKm;
        if (!isNaN(tempBasicPrice)) driverBasicPrice = tempBasicPrice;
        if (!isNaN(tempSurcharge)) driverSurcharge = tempSurcharge;
      }

      // Calculate price based on current distance and driver's pricing data
      const estimatedPrice = calculatePrice(
        formData.distance,
        driverPriceKm,
        driverBasicPrice,
        driverSurcharge,
      );

      setFormData((prev) => ({
        ...prev,
        driverId: driver.id,
        driverName: driver.driver_name,
        driverPhone: driver.phone_number,
        driverPhoto: driver.photo_url || "",
        vehicleType: vehicleType,
        vehicleName: driver.vehicle_name || "Unknown",
        vehicleModel: driver.vehicle_model || "",
        vehiclePlate: driver.license_plate || "N/A",
        vehicleColor: driver.vehicle_color || "N/A",
        vehicleMake: driver.vehicle_make || "N/A",
        vehiclePricePerKm: driverPriceKm,
        basicPrice: driverBasicPrice,
        surcharge: driverSurcharge,
        price: estimatedPrice, // Set the price directly here
      }));
    } catch (err) {
      console.error("Error selecting driver:", err);
      toast({
        title: "Error",
        description: "Could not select driver. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle next step
  const handleNextStep = async () => {
    if (currentStep === 1) {
      setIsLoading(true);
      try {
        // Cek dan lengkapi fromLocation jika kosong
        if (!formData.fromLocation || formData.fromLocation[0] === 0) {
          const coords = await geocodeAddress(formData.fromAddress);
          if (coords) {
            setFormData((prev) => ({ ...prev, fromLocation: coords }));
          }
        }

        // Cek dan lengkapi toLocation jika kosong
        if (!formData.toLocation || formData.toLocation[0] === 0) {
          const coords = await geocodeAddress(formData.toAddress);
          if (coords) {
            setFormData((prev) => ({ ...prev, toLocation: coords }));
          }
        }

        // Calculate route if both addresses are filled
        if (formData.fromAddress && formData.toAddress) {
          const isValidCoords = (coords: [number, number]) =>
            coords && coords.length === 2 && coords[0] !== 0 && coords[1] !== 0;

          const fromCoords = isValidCoords(formData.fromLocation)
            ? formData.fromLocation
            : await geocodeAddress(formData.fromAddress);

          const toCoords = isValidCoords(formData.toLocation)
            ? formData.toLocation
            : await geocodeAddress(formData.toAddress);

          if (fromCoords && toCoords) {
            await getRouteDetails(fromCoords, toCoords);

            // Update the form data with the geocoded coordinates
            setFormData((prev) => ({
              ...prev,
              fromLocation: fromCoords,
              toLocation: toCoords,
            }));

            // Note: We don't need to manually calculate price here anymore
            // as the useEffect will handle it when formData.distance changes
          }
        }

        // Search for drivers immediately after route calculation
        await searchDrivers();
      } finally {
        setIsLoading(false);
      }
    }

    if (currentStep === 2) {
      setIsLoading(true);
      await searchDrivers();
      setIsLoading(false);
    }

    if (currentStep === 3) {
      await handleSubmitBooking();
    }

    // Lanjutkan ke step berikutnya
    setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
  };

  // Handle previous step
  const handlePrevStep = () => {
    // If going back from confirmation to route & driver selection, reset driver selection
    if (currentStep === 3) {
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

    // If going back from route & driver selection to location & schedule
    // Make sure we recalculate the price when returning to step 2
    if (currentStep === 2) {
      // We don't need to do anything special here anymore
      // The useEffect will handle price recalculation when the user changes addresses
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
        license_plate: formData.vehiclePlate || "N/A",
        model: formData.vehicleModel || "N/A",
        make: formData.vehicleMake || "N/A",
        vehicle_name: formData.vehicleName || "N/A",
        status: "pending",
        customer_id: userId, // Add customer_id from auth
      };

      const { data, error } = await supabase
        .from("airport_transfer")
        .insert([bookingData]);

      if (error) {
        throw error;
      }

      // Move to success step
      setCurrentStep(4);

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
    if (currentStep === 2) {
      searchDrivers(); // Re-search when vehicle type changes
    }
  }, [currentStep, formData.vehicleType]);

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
        return renderMapAndRouteWithDriverStep();
      case 3:
        return renderBookingConfirmationStep();
      case 4:
        return renderBookingSuccessStep();
      default:
        return renderLocationAndScheduleStep();
    }
  };

  // Add custom CSS for the routing machine
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      .leaflet-routing-container {
        display: none !important;
      }
      .leaflet-routing-alt {
        display: none !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

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
                  setFormData((prev) => ({
                    ...prev,
                    fromAddress: value,
                    // Reset location if address is cleared
                    fromLocation: value ? prev.fromLocation : [0, 0],
                  }))
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
                  setFormData((prev) => ({
                    ...prev,
                    toAddress: value,
                    // Reset location if address is cleared
                    toLocation: value ? prev.toLocation : [0, 0],
                  }))
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

  // Step 2: Map and Route with Driver Selection
  const renderMapAndRouteWithDriverStep = () => {
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
                <div className="text-center">
                  {selectedDriver ? (
                    <>
                      <h4 className="text-sm font-medium text-gray-500">
                        Price
                      </h4>
                      <p className="text-2xl font-bold text-green-600">
                        Rp {formData.price.toLocaleString()}
                      </p>
                    </>
                  ) : (
                    <div className="flex items-center justify-center">
                      <div className="bg-blue-100 text-blue-600 rounded-full p-3">
                        <Car className="h-6 w-6" />
                      </div>
                      <span className="ml-2 text-sm text-gray-500">
                        Select a driver to see price
                      </span>
                    </div>
                  )}
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

          {/* Driver Selection Section */}
          <div className="space-y-4 mt-6">
            {/* Vehicle Type */}
            <div className="space-y-2">
              <h3 className="text-lg font-medium">
                Please Select Vehicle Type
              </h3>
              <select
                value={formData.vehicleType}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    vehicleType: e.target.value,
                  }))
                }
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isLoading}
              >
                {vehicleTypes.length > 0 ? (
                  vehicleTypes.map((type) => (
                    <option key={type.name} value={type.name}>
                      {type.name}
                    </option>
                  ))
                ) : (
                  <option value="">Select a vehicle type</option>
                )}
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
                              {driver.status === "onride"
                                ? "On Ride"
                                : "Available"}
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
                    <h4 className="text-lg font-medium mb-2">
                      No drivers found
                    </h4>
                    <p className="text-gray-600 mb-4">
                      We couldn't find any available drivers at the moment.
                    </p>
                    <Button onClick={searchDrivers}>Try Again</Button>
                  </div>
                </div>
              )}
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
            disabled={loading || vehicleTypes.length === 0}
          >
            {vehicleTypes.length > 0 ? (
              vehicleTypes.map((type) => (
                <option key={type.name} value={type.name}>
                  {type.name}
                </option>
              ))
            ) : (
              <option value="">Loading vehicle types...</option>
            )}
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

                {/*    <div className="flex justify-between">
                  <span className="text-gray-500">Parking</span>
                  <span className="font-medium">
                    Rp {formData.parking?.toLocaleString() || "10,000"}
                  </span>
                </div> */}

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
              <span className="font-medium">{formData.vehicleName}</span>
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
                {[1, 2, 3, 4].map((step) => (
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
                      {step === 2 && "Route & Driver"}
                      {step === 3 && "Confirm"}
                      {step === 4 && "Success"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardHeader>

          <CardContent>{renderStepContent()}</CardContent>

          {currentStep < 4 && (
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
                title={
                  currentStep === 2 && !selectedDriver
                    ? "Please select a driver first"
                    : ""
                }
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {currentStep === 4 ? "Booking..." : "Loading..."}
                  </>
                ) : (
                  <>
                    {currentStep === 3 ? "Confirmation Booking" : "Next"}
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
