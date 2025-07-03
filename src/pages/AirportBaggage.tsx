import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Boxes } from "lucide-react";
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
  onSelectSize?: (size: string, price: number) => void;
  selectedSize?: string;
}

const AirportBaggage = ({
  onSelectSize = () => {},
  selectedSize = "",
}: AirportBaggageProps) => {
  const { toast } = useToast();
  const { addToCart } = useShoppingCart();
  const { userId, isLoading, isAuthenticated, userName, userEmail } = useAuth();
  const [userPhone, setUserPhone] = useState<string>("");

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
    startTime: "",
    duration: 0,
    startDate: "",
    storageLocation: "",
  });
  const [baggagePrices, setBaggagePrices] = useState<Record<string, number>>(
    {},
  );
  const [persistentStorageLocation, setPersistentStorageLocation] =
    useState<string>("");

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

    // Generate or get persistent storage location
    const storageLocation = getOrCreateStorageLocation();

    setBookingData({
      ...bookingData,
      size,
      price,
      date: new Date().toISOString().split("T")[0],
      startTime: currentTime,
      storageLocation,
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
      bookingCode: data.bookingCode, // Ensure booking code is preserved
      storageLocation:
        data.storageLocation ||
        persistentStorageLocation ||
        getOrCreateStorageLocation(), // Ensure storage location is preserved
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

  // Default prices to use as fallback
  const DEFAULT_PRICES = {
    small_price: 70000,
    medium_price: 80000,
    large_price: 90000,
    extra_large_price: 100000,
    electronic_price: 90000,
    surfingboard_price: 100000,
    wheelchair_price: 110000,
    stickgolf_price: 110000,
  };

  // Save prices to localStorage for persistence across sessions
  const savePricesToLocalStorage = (prices: Record<string, number>) => {
    try {
      localStorage.setItem("baggage_prices", JSON.stringify(prices));
      console.log("💾 Baggage prices saved to localStorage");
    } catch (error) {
      console.error("❌ Error saving baggage prices to localStorage:", error);
    }
  };

  // Load prices from localStorage
  const loadPricesFromLocalStorage = (): Record<string, number> | null => {
    try {
      const savedPrices = localStorage.getItem("baggage_prices");
      if (savedPrices) {
        const parsedPrices = JSON.parse(savedPrices);
        console.log(
          "📂 Loaded baggage prices from localStorage:",
          parsedPrices,
        );
        return parsedPrices;
      }
    } catch (error) {
      console.error(
        "❌ Error loading baggage prices from localStorage:",
        error,
      );
    }
    return null;
  };

  // Fetch baggage prices from database
  const fetchBaggagePrices = async () => {
    setLoading(true);
    try {
      // First try to load from localStorage for immediate display
      const cachedPrices = loadPricesFromLocalStorage();
      if (cachedPrices) {
        console.log("🔄 Using cached prices while fetching from database...");
        setBaggagePrices(cachedPrices);
      }

      console.log("🔄 Fetching baggage prices from database...");
      const { data, error } = await supabase
        .from("baggage_price")
        .select("*")
        .limit(1);

      if (error) {
        console.error("❌ Error fetching baggage prices:", error);
        toast({
          title: "Error",
          description: "Failed to fetch baggage prices. Using default prices.",
          variant: "destructive",
        });

        // If we don't have cached prices, use defaults
        if (!cachedPrices) {
          setBaggagePrices(DEFAULT_PRICES);
          savePricesToLocalStorage(DEFAULT_PRICES);
        }
        // Ensure loading state is cleared even on error
        setLoading(false);
        return;
      }

      if (data && data.length > 0) {
        const priceData = data[0];
        console.log("📦 Raw data from baggage_price table:", priceData);

        // Parse all price fields and ensure they are valid numbers
        const parsedPrices = {
          small_price: parseFloat(priceData.small_price) || 50000,
          medium_price: parseFloat(priceData.medium_price) || 75000,
          large_price: parseFloat(priceData.large_price) || 100000,
          extra_large_price: parseFloat(priceData.extra_large_price) || 125000,
          electronic_price: parseFloat(priceData.electronic_price) || 80000,
          surfingboard_price:
            parseFloat(priceData.surfingboard_price) || 150000,
          wheelchair_price: parseFloat(priceData.wheelchair_price) || 60000,
          stickgolf_price: parseFloat(priceData.stickgolf_price) || 120000,
        };

        // Validate that all prices are valid numbers
        const validPrices = Object.entries(parsedPrices).reduce(
          (acc, [key, value]) => {
            if (isNaN(value) || value <= 0) {
              console.warn(
                `⚠️ Invalid price for ${key}: ${value}, using default`,
              );
              // Use default values for invalid prices
              acc[key] = DEFAULT_PRICES[key] || 50000;
            } else {
              acc[key] = value;
            }
            return acc;
          },
          {} as Record<string, number>,
        );

        console.log("💰 Final validated baggage prices:", validPrices);
        setBaggagePrices(validPrices);
        savePricesToLocalStorage(validPrices);
        // Ensure loading state is cleared when prices are set
        setLoading(false);
      } else {
        console.warn(
          "⚠️ No data found in baggage_price table. Using default prices.",
        );
        // If we don't have cached prices, use defaults
        if (!cachedPrices) {
          setBaggagePrices(DEFAULT_PRICES);
          savePricesToLocalStorage(DEFAULT_PRICES);
        }
      }
    } catch (error) {
      console.error("🚨 Exception in fetchBaggagePrices:", error);
      toast({
        title: "Database Error",
        description: "Could not connect to database. Using default prices.",
        variant: "destructive",
      });

      // If we don't have cached prices, use defaults
      const cachedPrices = loadPricesFromLocalStorage();
      if (!cachedPrices) {
        setBaggagePrices(DEFAULT_PRICES);
        savePricesToLocalStorage(DEFAULT_PRICES);
      }
    } finally {
      // Always clear loading state
      setLoading(false);
    }
  };

  // Fetch user phone number when authenticated
  const fetchUserPhone = async () => {
    if (!isAuthenticated || !userId) {
      console.log(
        "[AirportBaggage] Not authenticated or no userId, clearing phone",
      );
      setUserPhone("");
      return;
    }

    console.log("[AirportBaggage] Fetching user phone for userId:", userId);

    try {
      // Try to get phone from customers table first
      const { data: customerData, error: customerError } = await supabase
        .from("customers")
        .select("phone")
        .eq("id", userId)
        .single();

      if (!customerError && customerData?.phone) {
        console.log(
          "[AirportBaggage] Phone found in customers table:",
          customerData.phone,
        );
        setUserPhone(customerData.phone);
        // Store in localStorage for persistence
        localStorage.setItem("userPhone", customerData.phone);
        return;
      }

      // If not found in customers, try drivers table
      /* const { data: driverData, error: driverError } = await supabase
        .from("drivers")
        .select("phone")
        .eq("id", userId)
        .single();

      if (!driverError && driverData?.phone) {
        console.log(
          "[AirportBaggage] Phone found in drivers table:",
          driverData.phone,
        );
        setUserPhone(driverData.phone);
        // Store in localStorage for persistence
        localStorage.setItem("userPhone", driverData.phone);
        return;
      } */

      // If not found in drivers, try users table
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("phone_number")
        .eq("id", userId)
        .single();

      if (!userError && userData?.phone_number) {
        console.log(
          "[AirportBaggage] Phone found in users table:",
          userData.phone_number,
        );
        setUserPhone(userData.phone_number);
        // Store in localStorage for persistence
        localStorage.setItem("userPhone", userData.phone_number);
        return;
      }

      console.log("[AirportBaggage] No phone number found in any table");
    } catch (error) {
      console.error("[AirportBaggage] Error fetching user phone:", error);
    }
  };

  // Get current user name with fallback to localStorage
  const getCurrentUserName = () => {
    // First try to get from AuthContext
    if (userName && userName.trim() !== "") {
      console.log(
        "[AirportBaggage] Using userName from AuthContext:",
        userName,
      );
      return userName;
    }

    // Fallback to localStorage
    const storedUserName = localStorage.getItem("userName");
    if (storedUserName && storedUserName.trim() !== "") {
      console.log(
        "[AirportBaggage] Using userName from localStorage:",
        storedUserName,
      );
      return storedUserName;
    }

    // Try to get from stored auth_user object
    const storedUser = localStorage.getItem("auth_user");
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        if (userData?.name && userData.name.trim() !== "") {
          console.log(
            "[AirportBaggage] Using userName from auth_user:",
            userData.name,
          );
          return userData.name;
        }
      } catch (error) {
        console.warn("[AirportBaggage] Error parsing auth_user:", error);
      }
    }

    // Final fallback to userEmail prefix if available
    if (userEmail && userEmail.includes("@")) {
      const emailPrefix = userEmail.split("@")[0];
      console.log(
        "[AirportBaggage] Using email prefix as fallback:",
        emailPrefix,
      );
      return emailPrefix;
    }

    console.log("[AirportBaggage] No user name found, returning empty string");
    return "";
  };

  // Get current user email with fallback to localStorage
  const getCurrentUserEmail = () => {
    // First try to get from AuthContext
    if (userEmail && userEmail.trim() !== "") {
      console.log(
        "[AirportBaggage] Using userEmail from AuthContext:",
        userEmail,
      );
      return userEmail;
    }

    // Fallback to localStorage
    const storedUserEmail = localStorage.getItem("userEmail");
    if (storedUserEmail && storedUserEmail.trim() !== "") {
      console.log(
        "[AirportBaggage] Using userEmail from localStorage:",
        storedUserEmail,
      );
      return storedUserEmail;
    }

    // Try to get from stored auth_user object
    const storedUser = localStorage.getItem("auth_user");
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        if (userData?.email && userData.email.trim() !== "") {
          console.log(
            "[AirportBaggage] Using userEmail from auth_user:",
            userData.email,
          );
          return userData.email;
        }
      } catch (error) {
        console.warn("[AirportBaggage] Error parsing auth_user:", error);
      }
    }

    console.log("[AirportBaggage] No user email found, returning empty string");
    return "";
  };

  // Generate or get persistent storage location
  const getOrCreateStorageLocation = () => {
    // First check if we already have a persistent storage location
    if (persistentStorageLocation) {
      console.log(
        "[AirportBaggage] Using existing persistent storage location:",
        persistentStorageLocation,
      );
      return persistentStorageLocation;
    }

    // Try to get from localStorage
    const storedLocation = localStorage.getItem("baggage_storage_location");
    if (storedLocation) {
      console.log(
        "[AirportBaggage] Restoring storage location from localStorage:",
        storedLocation,
      );
      setPersistentStorageLocation(storedLocation);
      return storedLocation;
    }

    // Generate new storage location
    const terminals = [1, 2, 3];
    const levels = [1, 2];
    const randomTerminal =
      terminals[Math.floor(Math.random() * terminals.length)];
    const randomLevel = levels[Math.floor(Math.random() * levels.length)];
    const newLocation = `Terminal ${randomTerminal}, Level ${randomLevel}`;

    console.log(
      "[AirportBaggage] Generated new storage location:",
      newLocation,
    );

    // Store in state and localStorage
    setPersistentStorageLocation(newLocation);
    localStorage.setItem("baggage_storage_location", newLocation);

    return newLocation;
  };

  // Load prices on component mount
  useEffect(() => {
    console.log("[AirportBaggage] Initial mount, fetching baggage prices");

    // Initialize persistent storage location on mount
    const storedLocation = localStorage.getItem("baggage_storage_location");
    if (storedLocation) {
      console.log(
        "[AirportBaggage] Restoring storage location on mount:",
        storedLocation,
      );
      setPersistentStorageLocation(storedLocation);
    }

    // First try to load from localStorage immediately
    const cachedPrices = loadPricesFromLocalStorage();
    if (cachedPrices && Object.keys(cachedPrices).length > 0) {
      console.log("[AirportBaggage] Using cached prices on mount");
      setBaggagePrices(cachedPrices);
      setLoading(false);
      // Still fetch fresh prices in background
      fetchBaggagePrices();
    } else {
      console.log(
        "[AirportBaggage] No cached prices, using defaults and fetching from database",
      );
      // Use default prices immediately to prevent loading state
      setBaggagePrices(DEFAULT_PRICES);
      setLoading(false);
      // Then fetch from database
      fetchBaggagePrices();
    }
  }, []);

  // Handle auth state changes and fetch user data when authenticated
  useEffect(() => {
    const handleAuthStateChange = async () => {
      if (isAuthenticated && userId && !isLoading) {
        console.log(
          "[AirportBaggage] User authenticated, fetching user phone for:",
          userId,
        );

        // First try to restore from localStorage for immediate display
        const storedPhone = localStorage.getItem("userPhone");
        if (storedPhone) {
          console.log(
            "[AirportBaggage] Restoring phone from localStorage:",
            storedPhone,
          );
          setUserPhone(storedPhone);
        }

        // Ensure user name and email are stored in localStorage for persistence
        const currentUserName = getCurrentUserName();
        const currentUserEmail = getCurrentUserEmail();

        if (currentUserName) {
          localStorage.setItem("userName", currentUserName);
          console.log(
            "[AirportBaggage] Stored userName in localStorage:",
            currentUserName,
          );
        }

        if (currentUserEmail) {
          localStorage.setItem("userEmail", currentUserEmail);
          console.log(
            "[AirportBaggage] Stored userEmail in localStorage:",
            currentUserEmail,
          );
        }

        // Then fetch fresh data from database
        await fetchUserPhone();

        // Only re-fetch baggage prices if we don't have them or they're empty
        if (Object.keys(baggagePrices).length === 0) {
          console.log(
            "[AirportBaggage] No baggage prices available, fetching from database",
          );
          await fetchBaggagePrices();
        } else {
          console.log(
            "[AirportBaggage] Baggage prices already available, skipping fetch",
          );
        }
      } else if (!isAuthenticated && !isLoading) {
        console.log(
          "[AirportBaggage] User not authenticated, clearing user data",
        );
        setUserPhone("");
        localStorage.removeItem("userPhone");
      }
    };

    handleAuthStateChange();
  }, [isAuthenticated, userId, isLoading, userName, userEmail]);

  // Enhanced visibility change handler with session recovery - AUTO-RESTORE form state on tab switch
  useEffect(() => {
    let visibilityTimeout: NodeJS.Timeout;

    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible") {
        console.log(
          "[AirportBaggage] Tab became visible, restoring cached data",
        );

        // Clear any existing timeout
        if (visibilityTimeout) clearTimeout(visibilityTimeout);

        // Force clear loading state when tab becomes visible
        if (loading) {
          console.log("[AirportBaggage] Tab visible - clearing loading state");
          // Ensure we have prices when clearing loading state
          if (Object.keys(baggagePrices).length === 0) {
            const cachedPrices = loadPricesFromLocalStorage();
            if (cachedPrices && Object.keys(cachedPrices).length > 0) {
              setBaggagePrices(cachedPrices);
            } else {
              setBaggagePrices(DEFAULT_PRICES);
            }
          }
          setLoading(false);
        }

        // Enhanced session restoration with global trigger and immediate Supabase rehydration
        const storedUser = localStorage.getItem("auth_user");
        if (storedUser && (!isAuthenticated || !userId)) {
          try {
            const userData = JSON.parse(storedUser);
            if (userData && userData.id && userData.email) {
              console.log(
                "[AirportBaggage] Auth state needs restoration, refreshing Supabase session first",
              );

              // Try to refresh Supabase session first
              try {
                const { data: sessionData, error: sessionError } =
                  await supabase.auth.refreshSession();

                if (!sessionError && sessionData?.session?.user) {
                  console.log(
                    "[AirportBaggage] ✅ Supabase session refreshed successfully",
                  );

                  // Update localStorage with fresh session data
                  const freshUserData = {
                    id: sessionData.session.user.id,
                    email: sessionData.session.user.email,
                    role:
                      localStorage.getItem("userRole") ||
                      userData.role ||
                      "Customer",
                    name:
                      localStorage.getItem("userName") ||
                      sessionData.session.user.user_metadata?.full_name ||
                      sessionData.session.user.user_metadata?.name ||
                      sessionData.session.user.email?.split("@")[0] ||
                      "User",
                  };

                  localStorage.setItem(
                    "auth_user",
                    JSON.stringify(freshUserData),
                  );
                  localStorage.setItem("userId", freshUserData.id);
                  localStorage.setItem("userEmail", freshUserData.email);
                  localStorage.setItem("userName", freshUserData.name);

                  // Trigger AuthContext update with fresh data
                  window.dispatchEvent(
                    new CustomEvent("forceSessionRestore", {
                      detail: freshUserData,
                    }),
                  );
                } else {
                  console.log(
                    "[AirportBaggage] Supabase session refresh failed, using cached data",
                  );
                  // Fallback to cached data
                  window.dispatchEvent(
                    new CustomEvent("forceSessionRestore", {
                      detail: userData,
                    }),
                  );
                }
              } catch (refreshError) {
                console.warn(
                  "[AirportBaggage] Session refresh error, using cached data:",
                  refreshError,
                );
                // Fallback to cached data
                window.dispatchEvent(
                  new CustomEvent("forceSessionRestore", { detail: userData }),
                );
              }
            }
          } catch (error) {
            console.warn("[AirportBaggage] Error parsing stored user:", error);
          }
        }

        // Restore phone from localStorage if available and not already set
        const storedPhone = localStorage.getItem("userPhone");
        if (storedPhone && !userPhone) {
          console.log(
            "[AirportBaggage] Restoring phone from localStorage:",
            storedPhone,
          );
          setUserPhone(storedPhone);
        }

        // Restore baggage prices from localStorage if not already loaded
        if (Object.keys(baggagePrices).length === 0) {
          const cachedPrices = loadPricesFromLocalStorage();
          if (cachedPrices && Object.keys(cachedPrices).length > 0) {
            console.log(
              "[AirportBaggage] Restoring baggage prices from localStorage",
            );
            setBaggagePrices(cachedPrices);
          } else {
            // If no cached prices, use defaults
            console.log("[AirportBaggage] No cached prices, using defaults");
            setBaggagePrices(DEFAULT_PRICES);
          }
          // Always clear loading state when we set prices
          setLoading(false);
        } else if (loading) {
          // If we already have prices but still loading, clear loading state
          console.log(
            "[AirportBaggage] Already have prices, clearing loading state",
          );
          setLoading(false);
        }

        // Ensure user data consistency without API calls
        const currentUserName = getCurrentUserName();
        const currentUserEmail = getCurrentUserEmail();

        if (currentUserName) {
          localStorage.setItem("userName", currentUserName);
        }
        if (currentUserEmail) {
          localStorage.setItem("userEmail", currentUserEmail);
        }
      }
    };

    // Listen for session restored events
    const handleSessionRestored = (event: CustomEvent) => {
      console.log(
        "[AirportBaggage] Session restored event received:",
        event.detail,
      );

      // Update user data from restored session
      const userData = event.detail;
      if (userData.name) {
        localStorage.setItem("userName", userData.name);
      }
      if (userData.email) {
        localStorage.setItem("userEmail", userData.email);
      }

      // Restore phone if available
      const storedPhone = localStorage.getItem("userPhone");
      if (storedPhone && !userPhone) {
        setUserPhone(storedPhone);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener(
      "sessionRestored",
      handleSessionRestored as EventListener,
    );

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener(
        "sessionRestored",
        handleSessionRestored as EventListener,
      );
      if (visibilityTimeout) clearTimeout(visibilityTimeout);
    };
  }, [userPhone, baggagePrices, isAuthenticated, userId]);

  // Reset loading state when auth loading state changes or when we have prices
  useEffect(() => {
    // If we have baggage prices, we're no longer loading
    if (Object.keys(baggagePrices).length > 0 && loading) {
      console.log("🔄 Baggage prices loaded, clearing loading state");
      setLoading(false);
    }

    // If auth is no longer loading but component is still loading,
    // ensure we're not stuck in loading state
    if (!isLoading && loading) {
      const timer = setTimeout(() => {
        if (loading) {
          console.log("🔄 Resetting stuck loading state in AirportBaggage");
          // Use default prices if still loading
          if (Object.keys(baggagePrices).length === 0) {
            setBaggagePrices(DEFAULT_PRICES);
          }
          setLoading(false);
        }
      }, 1000); // Reduced timeout to 1 second

      return () => clearTimeout(timer);
    }
  }, [isLoading, loading, baggagePrices]);

  // Check for forced logout and restore user data on component mount
  useEffect(() => {
    const forceLogout = sessionStorage.getItem("forceLogout");
    if (forceLogout) {
      console.log("Force logout detected in AirportBaggage, clearing flag");
      sessionStorage.removeItem("forceLogout");
      setShowAuthModal(false);
      localStorage.removeItem("userPhone");
      setUserPhone("");

      // When force logout is detected, ensure we have prices from localStorage
      const cachedPrices = loadPricesFromLocalStorage();
      if (cachedPrices) {
        console.log("🔄 Restoring prices from localStorage after force logout");
        setBaggagePrices(cachedPrices);
      }
    } else if (isAuthenticated && userId) {
      // On component mount, restore phone from localStorage if available
      const storedPhone = localStorage.getItem("userPhone");
      if (storedPhone) {
        console.log(
          "[AirportBaggage] Restoring phone from localStorage on mount:",
          storedPhone,
        );
        setUserPhone(storedPhone);
      }

      // Ensure user name and email are properly stored on mount
      const currentUserName = getCurrentUserName();
      const currentUserEmail = getCurrentUserEmail();

      if (currentUserName) {
        localStorage.setItem("userName", currentUserName);
        console.log(
          "[AirportBaggage] Ensured userName is stored on mount:",
          currentUserName,
        );
      }

      if (currentUserEmail) {
        localStorage.setItem("userEmail", currentUserEmail);
        console.log(
          "[AirportBaggage] Ensured userEmail is stored on mount:",
          currentUserEmail,
        );
      }
    }
  }, [isAuthenticated, userId, userName, userEmail]);

  // Enhanced auth state restoration after tab switching with fallback recovery
  useEffect(() => {
    let restoreTimeout: NodeJS.Timeout;

    const handleVisibilityAuthRestore = async () => {
      if (document.visibilityState === "visible") {
        console.log(
          "[AirportBaggage] Tab became visible, checking auth state...",
        );

        // Clear any existing timeout
        if (restoreTimeout) clearTimeout(restoreTimeout);

        // Immediate check and restore if needed
        const storedUser = localStorage.getItem("auth_user");
        const storedUserName = localStorage.getItem("userName");
        const storedUserEmail = localStorage.getItem("userEmail");
        const storedPhone = localStorage.getItem("userPhone");

        // Check if auth state is missing or corrupted
        const needsRestore =
          !isAuthenticated ||
          !userId ||
          !userEmail ||
          (storedUser && (!userId || !userEmail));

        if (needsRestore && storedUser) {
          try {
            const parsed = JSON.parse(storedUser);
            if (parsed && parsed.id && parsed.email) {
              console.log(
                "[AirportBaggage] Restoring auth state from localStorage with Supabase refresh",
              );

              // Try to refresh Supabase session to ensure token validity
              try {
                const { data: sessionData, error: sessionError } =
                  await supabase.auth.refreshSession();

                if (!sessionError && sessionData?.session?.user) {
                  console.log(
                    "[AirportBaggage] ✅ Session refresh successful during restore",
                  );

                  // Update with fresh session data
                  const freshUserData = {
                    id: sessionData.session.user.id,
                    email: sessionData.session.user.email,
                    role:
                      localStorage.getItem("userRole") ||
                      parsed.role ||
                      "Customer",
                    name:
                      storedUserName ||
                      sessionData.session.user.user_metadata?.full_name ||
                      sessionData.session.user.user_metadata?.name ||
                      sessionData.session.user.email?.split("@")[0] ||
                      "User",
                  };

                  // Update localStorage with fresh data
                  localStorage.setItem(
                    "auth_user",
                    JSON.stringify(freshUserData),
                  );
                  localStorage.setItem("userId", freshUserData.id);
                  localStorage.setItem("userEmail", freshUserData.email);
                  localStorage.setItem("userName", freshUserData.name);

                  // Trigger global session restore with fresh data
                  window.dispatchEvent(
                    new CustomEvent("forceSessionRestore", {
                      detail: freshUserData,
                    }),
                  );
                } else {
                  console.log(
                    "[AirportBaggage] Session refresh failed, using cached data",
                  );
                  // Fallback to cached data
                  window.dispatchEvent(
                    new CustomEvent("forceSessionRestore", { detail: parsed }),
                  );
                }
              } catch (refreshError) {
                console.warn(
                  "[AirportBaggage] Session refresh error during restore:",
                  refreshError,
                );
                // Fallback to cached data
                window.dispatchEvent(
                  new CustomEvent("forceSessionRestore", { detail: parsed }),
                );
              }

              // Restore local user data immediately
              if (storedPhone && !userPhone) {
                setUserPhone(storedPhone);
              }

              // Only re-fetch baggage prices if we don't have them
              if (Object.keys(baggagePrices).length === 0) {
                const cachedPrices = loadPricesFromLocalStorage();
                if (cachedPrices) {
                  console.log(
                    "[AirportBaggage] Using cached prices during auth restore",
                  );
                  setBaggagePrices(cachedPrices);
                } else {
                  console.log(
                    "[AirportBaggage] No cached prices, using defaults during auth restore",
                  );
                  setBaggagePrices(DEFAULT_PRICES);
                }
              }
            }
          } catch (error) {
            console.error(
              "[AirportBaggage] Error parsing stored user data:",
              error,
            );
          }
        } else if (isAuthenticated && userId) {
          // Auth state looks good, just restore cached data
          console.log(
            "[AirportBaggage] Auth state is good, restoring cached data",
          );

          if (storedPhone && !userPhone) {
            setUserPhone(storedPhone);
          }

          // Only load prices if we don't have them
          if (Object.keys(baggagePrices).length === 0) {
            const cachedPrices = loadPricesFromLocalStorage();
            if (cachedPrices) {
              console.log(
                "[AirportBaggage] Using cached prices during auth refresh",
              );
              setBaggagePrices(cachedPrices);
            } else {
              console.log(
                "[AirportBaggage] No cached prices, using defaults during auth refresh",
              );
              setBaggagePrices(DEFAULT_PRICES);
            }
          }
        }

        // Debounced additional check with session refresh
        restoreTimeout = setTimeout(async () => {
          // Final check after a delay
          if (!isAuthenticated && storedUser) {
            console.log(
              "[AirportBaggage] Final auth check - triggering session restore with refresh",
            );
            try {
              const parsed = JSON.parse(storedUser);
              if (parsed && parsed.id && parsed.email) {
                // Try one more session refresh before final restore
                try {
                  const { data: sessionData, error: sessionError } =
                    await supabase.auth.refreshSession();

                  if (!sessionError && sessionData?.session?.user) {
                    console.log(
                      "[AirportBaggage] ✅ Final session refresh successful",
                    );

                    const freshUserData = {
                      id: sessionData.session.user.id,
                      email: sessionData.session.user.email,
                      role:
                        localStorage.getItem("userRole") ||
                        parsed.role ||
                        "Customer",
                      name:
                        localStorage.getItem("userName") ||
                        sessionData.session.user.user_metadata?.full_name ||
                        sessionData.session.user.user_metadata?.name ||
                        sessionData.session.user.email?.split("@")[0] ||
                        "User",
                    };

                    localStorage.setItem(
                      "auth_user",
                      JSON.stringify(freshUserData),
                    );
                    window.dispatchEvent(
                      new CustomEvent("forceSessionRestore", {
                        detail: freshUserData,
                      }),
                    );
                  } else {
                    // Final fallback to cached data
                    window.dispatchEvent(
                      new CustomEvent("forceSessionRestore", {
                        detail: parsed,
                      }),
                    );
                  }
                } catch (finalRefreshError) {
                  console.warn(
                    "[AirportBaggage] Final session refresh failed:",
                    finalRefreshError,
                  );
                  // Final fallback to cached data
                  window.dispatchEvent(
                    new CustomEvent("forceSessionRestore", { detail: parsed }),
                  );
                }
              }
            } catch (error) {
              console.warn(
                "[AirportBaggage] Error in final auth check:",
                error,
              );
            }
          }
        }, 1000);
      }
    };

    // Listen for auth state refresh events
    const handleAuthStateRefresh = (event: CustomEvent) => {
      console.log("[AirportBaggage] Auth state refreshed:", event.detail);

      // Restore user phone if available
      const storedPhone = localStorage.getItem("userPhone");
      if (storedPhone && !userPhone) {
        setUserPhone(storedPhone);
      }

      // Ensure baggage prices are loaded
      if (Object.keys(baggagePrices).length === 0) {
        const cachedPrices = loadPricesFromLocalStorage();
        if (cachedPrices) {
          setBaggagePrices(cachedPrices);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityAuthRestore);
    window.addEventListener(
      "authStateRefreshed",
      handleAuthStateRefresh as EventListener,
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityAuthRestore,
      );
      window.removeEventListener(
        "authStateRefreshed",
        handleAuthStateRefresh as EventListener,
      );
      if (restoreTimeout) clearTimeout(restoreTimeout);
    };
  }, [isAuthenticated, userId, userName, userEmail, userPhone, baggagePrices]);

  // Additional check for auth state changes during component lifecycle - DISABLED AUTO REFRESH
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      const storedUserName = localStorage.getItem("userName");
      const storedUser = localStorage.getItem("auth_user");

      if (storedUserName && userName && storedUserName !== userName) {
        console.log(
          "[AirportBaggage] Username mismatch detected during render:",
          {
            current: userName,
            stored: storedUserName,
          },
        );

        // REMOVED AUTO REFRESH - just log the mismatch
        try {
          if (storedUser) {
            const parsed = JSON.parse(storedUser);
            if (parsed && parsed.name && parsed.name !== userName) {
              console.log(
                "[AirportBaggage] Username mismatch detected but auto-refresh disabled to prevent booking interruption",
              );
            }
          }
        } catch (error) {
          console.error("[AirportBaggage] Error during username check:", error);
        }
      }
    }
  }, [isAuthenticated, isLoading, userName]);

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
      icon: <WheelchairIcon />,
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

  // Fallback for unauthenticated users
  if (!isAuthenticated && !isLoading) {
    // Don't redirect, just continue with guest experience
    console.log("[AirportBaggage] User not authenticated, continuing as guest");
  }

  // Show loading state only when actually loading prices AND we don't have any prices (cached or default)
  // Always show content if we have any prices available
  if (loading && Object.keys(baggagePrices).length === 0 && isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48 mx-auto mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-32 mx-auto"></div>
          </div>
          <p className="mt-4 text-gray-600">Loading baggage prices...</p>
        </div>
      </div>
    );
  }

  // If we don't have prices but auth is ready, use defaults immediately
  if (Object.keys(baggagePrices).length === 0 && !isLoading) {
    console.log(
      "[AirportBaggage] No prices available, using defaults immediately",
    );
    setBaggagePrices(DEFAULT_PRICES);
    setLoading(false);
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
                                <Button
                                  variant={
                                    bookingData.size === option.id
                                      ? "default"
                                      : "outline"
                                  }
                                  className="w-full"
                                  onClick={() =>
                                    handleSizeSelect(option.id, option.price)
                                  }
                                >
                                  {bookingData.size === option.id
                                    ? "Selected"
                                    : "Select"}
                                </Button>
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
                            | "surfingboard"
                            | "wheelchair"
                            | "stickgolf"
                        }
                        baggagePrices={{
                          small: baggagePrices.small_price || 0,
                          medium: baggagePrices.medium_price || 0,
                          large: baggagePrices.large_price || 0,
                          extra_large: baggagePrices.extra_large_price || 0,
                          electronic: baggagePrices.electronic_price || 0,
                          surfingboard: baggagePrices.surfingboard_price || 0,
                          wheelchair: baggagePrices.wheelchair_price || 0,
                          stickgolf: baggagePrices.stickgolf_price || 0,
                        }}
                        onComplete={handleBookingComplete}
                        onCancel={() => setShowForm(false)}
                        initialDate={new Date()}
                        initialTime={bookingData.startTime || ""}
                        prefilledData={
                          isAuthenticated
                            ? {
                                name: getCurrentUserName(),
                                email: getCurrentUserEmail(),
                                phone:
                                  userPhone ||
                                  localStorage.getItem("userPhone") ||
                                  "",
                              }
                            : undefined
                        }
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
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
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
                        {bookingData.hours
                          ? `${bookingData.hours} ${bookingData.durationType === "days" ? "day(s)" : "hour(s)"}`
                          : ""}
                      </p>
                    </div>
                    {bookingData.durationType === "hours" && (
                      <div>
                        <p className="text-sm text-gray-500">Start Date</p>
                        <p className="font-medium">
                          {format(
                            new Date(bookingData.date || new Date()),
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
                      <p className="font-medium font-mono text-blue-600">
                        {bookingData.bookingCode || "GENERATING..."}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Storage Location</p>
                      <p className="font-medium">
                        {bookingData.storageLocation ||
                          persistentStorageLocation ||
                          getOrCreateStorageLocation()}
                      </p>
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
                          handleCloseReceipt();
                          navigate("/cart");
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
                          {bookingData.storageLocation ||
                            persistentStorageLocation ||
                            getOrCreateStorageLocation()}
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

          {/* Shopping Cart Modal - Only show if explicitly opened */}
          {showCart && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
              <div className="w-full max-w-6xl max-h-[90vh] overflow-auto">
                <ShoppingCart />
                <div className="flex justify-end p-4">
                  <Button onClick={handleCloseCart}>Close Cart</Button>
                </div>
              </div>
            </div>
          )}
        </div>
        {/* End of Airport Baggage Storage section */}
      </div>
    </div>
  );
};

export default AirportBaggage;
