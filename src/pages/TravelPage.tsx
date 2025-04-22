import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Car,
  Plane,
  Train,
  Bus,
  Hotel,
  Search,
  CalendarIcon,
  ArrowRightLeft,
  Globe,
  ChevronDown,
  User,
} from "lucide-react";
import AuthForm from "@/components/auth/AuthForm";
import StaffLink from "@/components/StaffLink";

const TravelPage: React.FC = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [authFormType, setAuthFormType] = useState<"login" | "register">(
    "login",
  );
  const [fromLocation, setFromLocation] = useState("Jakarta (CGK)");
  const [toLocation, setToLocation] = useState("Bali / Denpasar (DPS)");
  const [departureDate, setDepartureDate] = useState<Date>(new Date());
  const [returnDate, setReturnDate] = useState<Date | undefined>(new Date());
  const [isRoundTrip, setIsRoundTrip] = useState(true);
  const [passengers, setPassengers] = useState("1 Adult, 0 child, 0 infant");
  const [travelClass, setTravelClass] = useState("Economy");
  const [userRole, setUserRole] = useState<string | null>(null);

  // Check authentication status and get user role
  useEffect(() => {
    const checkAuth = async () => {
      // First check localStorage for shared authentication
      const authUserStr = localStorage.getItem("auth_user");
      if (authUserStr) {
        try {
          const authUser = JSON.parse(authUserStr);
          setIsAuthenticated(true);
          // If authenticated, make sure auth form is closed
          setShowAuthForm(false);

          // Set user role from localStorage
          if (authUser?.role) {
            setUserRole(authUser.role);
          }
          return;
        } catch (e) {
          console.error("Error parsing auth_user from localStorage:", e);
        }
      }

      // If not in localStorage, check Supabase session
      const { data } = await supabase.auth.getSession();
      setIsAuthenticated(!!data.session);

      // If authenticated, make sure auth form is closed
      if (data.session) {
        setShowAuthForm(false);
      }

      // If authenticated via Supabase but not in localStorage, store the data
      if (data.session) {
        const userId = data.session.user.id;
        localStorage.setItem("userId", userId);

        // Try to get user role from metadata or default to "Customer"
        const role = data.session.user.user_metadata?.role || "Customer";
        localStorage.setItem("userRole", role);
        setUserRole(role);

        // Store email if available
        if (data.session.user.email) {
          localStorage.setItem("userEmail", data.session.user.email);
        }

        // ✅ Fetch nama lengkap dari tabel customers
        const { data: customerData } = await supabase
          .from("customers")
          .select("name")
          .eq("user_id", userId)
          .single();

        const userName =
          customerData?.name ||
          localStorage.getItem("userName") ||
          data.session.user.email?.split("@")[0] ||
          "User";

        localStorage.setItem("userName", userName);

        // Store in auth_user for shared authentication
        const userData = {
          id: userId,
          role: role,
          email: data.session.user.email || "",
          name: userName,
        };
        localStorage.setItem("auth_user", JSON.stringify(userData));
      }
    };
    checkAuth();

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        const newAuthState = !!session;
        setIsAuthenticated(newAuthState);

        // If user becomes authenticated, hide the auth form
        if (newAuthState) {
          setShowAuthForm(false);
        }
      },
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleAuthStateChange = (state: boolean) => {
    setIsAuthenticated(state);
    if (state) {
      // Always close the auth form when authentication state changes to true
      setShowAuthForm(false);

      // Get user data from localStorage if available
      const userId = localStorage.getItem("userId");
      const userRole = localStorage.getItem("userRole");
      const userEmail = localStorage.getItem("userEmail");

      // Store user data in localStorage for shared authentication
      if (userId && userRole) {
        const userData = {
          id: userId,
          role: userRole,
          email: userEmail || "",
        };
        localStorage.setItem("auth_user", JSON.stringify(userData));
        setUserRole(userRole);
      }

      // Stay on the current page (TravelPage) after successful login
      // No navigation needed as we're already on the TravelPage
    } else {
      // Remove user data from localStorage on logout
      localStorage.removeItem("auth_user");
      localStorage.removeItem("userId");
      localStorage.removeItem("userRole");
      localStorage.removeItem("userEmail");
      setUserRole(null);
    }
  };

  const handleSearch = () => {
    if (!isAuthenticated) {
      setShowAuthForm(true);
      return;
    }

    // In a real app, this would navigate to search results
    alert("Search functionality will be implemented in the future.");
  };

  const swapLocations = () => {
    const temp = fromLocation;
    setFromLocation(toLocation);
    setToLocation(temp);
  };

  const handleTravelOptionClick = (option: string) => {
    // Handle navigation based on the selected travel option
    switch (option) {
      case "Hotels":
        navigate("/hotels");
        break;
      case "Flights":
        navigate("/flights");
        break;
      case "Trains":
        navigate("/trains");
        break;
      case "Bus & Travel":
        navigate("/bus-travel");
        break;
      case "Airport Transfer":
        navigate("/airport-transfer");
        break;
      case "Car Rental":
        navigate("/rentcar");
        break;
      case "Things to Do":
        navigate("/things-to-do");
        break;
      case "More":
        navigate("/more");
        break;
      default:
        navigate("/");
    }
  };

  const [userName, setUserName] = useState<string | null>(null);

  // Check if user is admin based on email
  const isAdmin = React.useMemo(() => {
    const authUserStr = localStorage.getItem("auth_user");
    if (authUserStr) {
      try {
        const authUser = JSON.parse(authUserStr);
        return (
          authUser?.role === "Admin" ||
          (authUser?.email && authUser.email === "divatranssoetta@gmail.com")
        );
      } catch (e) {
        console.error("Error parsing auth_user:", e);
        return false;
      }
    }
    return false;
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-800 to-green-600">
      {/* Header */}
      <header className="bg-green-800 text-white p-4">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center space-x-4 w-full md:w-auto justify-between">
            {/*
            <Button
              size="sm"
              variant="ghost"
              className="text-white hover:bg-green-800"
              onClick={() => navigate("/")}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <path d="m12 19-7-7 7-7" />
                <path d="M19 12H5" />
              </svg>
              <span className="ml-1">Back</span>
            </Button>
            */}
            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold">Travelintrips</span>
              <span className="text-xs">★</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center md:justify-end gap-2 md:gap-4 w-full md:w-auto">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-green-800 flex items-center space-x-1"
                >
                  <Globe className="h-4 w-4 mr-1" />
                  <span>
                    {i18n.language === "id"
                      ? "🇮🇩"
                      : i18n.language === "zh"
                        ? "🇨🇳"
                        : "🇺🇸"}
                  </span>
                  <span>{i18n.language.toUpperCase()}</span>
                  <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48">
                <div className="grid gap-2">
                  <Button
                    variant={i18n.language === "en" ? "default" : "ghost"}
                    size="sm"
                    className="justify-start"
                    onClick={() => i18n.changeLanguage("en")}
                  >
                    🇺🇸 English
                  </Button>
                  <Button
                    variant={i18n.language === "id" ? "default" : "ghost"}
                    size="sm"
                    className="justify-start"
                    onClick={() => i18n.changeLanguage("id")}
                  >
                    🇮🇩 Indonesia
                  </Button>
                  <Button
                    variant={i18n.language === "zh" ? "default" : "ghost"}
                    size="sm"
                    className="justify-start"
                    onClick={() => i18n.changeLanguage("zh")}
                  >
                    🇨🇳 Chinese
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            <div className="flex items-center space-x-1">
              <span>IDR</span>
              <ChevronDown className="h-4 w-4" />
            </div>

            <div className="hidden md:flex items-center space-x-2">
              <Button
                size="sm"
                variant="ghost"
                className="text-white hover:bg-green-800"
              >
                Deals
              </Button>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-white hover:bg-green-800"
                  >
                    Support <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48">
                  <div className="grid gap-2">
                    <Button variant="ghost" size="sm" className="justify-start">
                      Help Center
                    </Button>
                    <Button variant="ghost" size="sm" className="justify-start">
                      Contact Us
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-white hover:bg-green-800"
                  >
                    Partnership <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48">
                  <div className="grid gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="justify-start"
                      onClick={() => navigate("/driver-mitra")}
                    >
                      Driver Mitra
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="justify-start"
                      onClick={() => navigate("/driver-perusahaan")}
                    >
                      Driver Perusahaan
                    </Button>
                    {/*  <Button
                      variant="ghost"
                      size="sm"
                      className="justify-start"
                      onClick={() => navigate("/")}
                    >
                      Staff
                    </Button>*/}
                  </div>
                </PopoverContent>
              </Popover>

              <Button
                size="sm"
                variant="ghost"
                className="text-white hover:bg-green-800"
              >
                For Corporates
              </Button>

              <Button
                size="sm"
                variant="ghost"
                className="text-white hover:bg-green-800"
                onClick={() => {
                  // Check if user has Staff Trips role
                  if (userRole === "Staff Trips") {
                    navigate("/new-booking");
                  } else {
                    navigate("/booking");
                  }
                }}
              >
                Bookings
              </Button>

              {isAdmin && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-green-800 bg-green-700"
                  onClick={() => {
                    navigate("/admin");
                  }}
                >
                  Admin Panel
                </Button>
              )}
            </div>

            <div className="md:hidden">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-white hover:bg-green-800"
                  >
                    Menu <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48">
                  <div className="grid gap-2">
                    <Button variant="ghost" size="sm" className="justify-start">
                      Deals
                    </Button>
                    <Button variant="ghost" size="sm" className="justify-start">
                      Support
                    </Button>
                    <Button variant="ghost" size="sm" className="justify-start">
                      Partnership
                    </Button>
                    <Button variant="ghost" size="sm" className="justify-start">
                      For Corporates
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="justify-start"
                      onClick={() => {
                        // Check if user has Staff Trips role
                        if (userRole === "Staff Trips") {
                          navigate("/new-booking");
                        } else {
                          navigate("/booking");
                        }
                      }}
                    >
                      Bookings
                    </Button>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="justify-start bg-green-700 text-white"
                        onClick={() => {
                          navigate("/admin");
                        }}
                      >
                        Admin Panel
                      </Button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                {(() => {
                  // Get user data from localStorage
                  const authUserStr = localStorage.getItem("auth_user");
                  const authUser = authUserStr ? JSON.parse(authUserStr) : null;

                  const userName =
                    authUser?.name ||
                    localStorage.getItem("userName") ||
                    authUser?.email?.split("@")[0] ||
                    "User";

                  const userRole =
                    authUser?.role ||
                    localStorage.getItem("userRole") ||
                    "User";

                  console.log("userName:", userName);
                  console.log("userRole:", userRole);

                  return (
                    <span className="text-white text-sm mr-2">
                      {userName} ({userRole})
                    </span>
                  );
                })()}
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-transparent text-white border-white hover:bg-green-800"
                  onClick={() => {
                    // Sign out from Supabase
                    supabase.auth.signOut();

                    // Clear localStorage data
                    localStorage.removeItem("auth_user");
                    localStorage.removeItem("userId");
                    localStorage.removeItem("userRole");
                    localStorage.removeItem("userEmail");

                    // Update authentication state
                    setIsAuthenticated(false);
                    setUserRole(null);

                    // Navigate to home page
                    navigate("/");
                  }}
                >
                  Log Out
                </Button>
              </div>
            ) : (
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-transparent text-white border-white hover:bg-green-800"
                  onClick={() => {
                    setShowAuthForm(true);
                    setAuthFormType("login");
                  }}
                >
                  Log In
                </Button>
                <Button
                  size="sm"
                  className="bg-green-500 text-white hover:bg-green-600"
                  onClick={() => {
                    setShowAuthForm(true);
                    setAuthFormType("register");
                  }}
                >
                  Register
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-green-900 text-white py-2 border-t border-green-700 overflow-x-auto">
        <div className="container mx-auto flex space-x-2 md:space-x-6 px-2 md:px-4">
          <Button
            variant="ghost"
            className="text-white hover:bg-green-800 cursor-pointer text-xs md:text-sm whitespace-nowrap"
            onClick={() => handleTravelOptionClick("Hotels")}
          >
            <Hotel className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" /> Hotels
          </Button>
          <Button
            variant="ghost"
            className="text-white hover:bg-green-800 cursor-pointer text-xs md:text-sm whitespace-nowrap"
            onClick={() => handleTravelOptionClick("Flights")}
          >
            <Plane className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" /> Flights
          </Button>
          <Button
            variant="ghost"
            className="text-white hover:bg-green-800 cursor-pointer text-xs md:text-sm whitespace-nowrap"
            onClick={() => handleTravelOptionClick("Trains")}
          >
            <Train className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" /> Trains
          </Button>
          <Button
            variant="ghost"
            className="text-white hover:bg-green-800 cursor-pointer text-xs md:text-sm whitespace-nowrap"
            onClick={() => handleTravelOptionClick("Bus & Travel")}
          >
            <Bus className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" /> Bus & Travel
          </Button>
          <Button
            variant="ghost"
            className="text-white hover:bg-green-800 cursor-pointer text-xs md:text-sm whitespace-nowrap"
            onClick={() => handleTravelOptionClick("Airport Transfer")}
          >
            Airport Transfer
          </Button>
          <Button
            variant="ghost"
            className="text-white hover:bg-green-800 cursor-pointer text-xs md:text-sm whitespace-nowrap"
            onClick={() => handleTravelOptionClick("Car Rental")}
          >
            <Car className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" /> Car Rental
          </Button>
          <Button
            variant="ghost"
            className="text-white hover:bg-green-800 cursor-pointer text-xs md:text-sm whitespace-nowrap"
            onClick={() => handleTravelOptionClick("Things to Do")}
          >
            Things to Do
          </Button>
          <Button
            variant="ghost"
            className="text-white hover:bg-green-800 cursor-pointer text-xs md:text-sm whitespace-nowrap"
            onClick={() => handleTravelOptionClick("More")}
          >
            More <ChevronDown className="h-3 w-3 md:h-4 md:w-4 ml-1" />
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-8 md:py-12 text-white">
        <h1 className="text-xl md:text-3xl font-bold text-center mb-6 md:mb-8">
          From Southeast Asia to the World, All Yours.
        </h1>

        {/* Travel Options */}
        <div className="bg-white rounded-lg p-4 md:p-6 shadow-lg">
          {/* Tabs */}
          <div className="flex mb-4 md:mb-6 space-x-2 md:space-x-4 overflow-x-auto pb-2">
            <Button
              variant="ghost"
              className="bg-green-100 text-green-600 hover:bg-green-200 cursor-pointer text-xs md:text-sm whitespace-nowrap"
              onClick={() => handleTravelOptionClick("Hotels")}
            >
              <Hotel className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" /> Hotels
            </Button>
            <Button
              variant="ghost"
              className="bg-green-500 text-white hover:bg-green-600 cursor-pointer text-xs md:text-sm whitespace-nowrap"
              onClick={() => handleTravelOptionClick("Flights")}
            >
              <Plane className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" /> Flights
            </Button>
            <Button
              variant="ghost"
              className="text-gray-600 hover:bg-gray-100 cursor-pointer text-xs md:text-sm whitespace-nowrap"
              onClick={() => handleTravelOptionClick("Trains")}
            >
              <Train className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" /> Trains
            </Button>
            <Button
              variant="ghost"
              className="text-gray-600 hover:bg-gray-100 cursor-pointer text-xs md:text-sm whitespace-nowrap"
              onClick={() => handleTravelOptionClick("Bus & Travel")}
            >
              <Bus className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" /> Bus &
              Travel
            </Button>
            <Button
              variant="ghost"
              className="text-gray-600 hover:bg-gray-100 cursor-pointer text-xs md:text-sm whitespace-nowrap"
              onClick={() => handleTravelOptionClick("Airport Transfer")}
            >
              Airport Transfer
            </Button>
            <Button
              variant="ghost"
              className="text-gray-600 hover:bg-gray-100 cursor-pointer text-xs md:text-sm whitespace-nowrap"
              onClick={() => handleTravelOptionClick("Car Rental")}
            >
              <Car className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" /> Car Rental
            </Button>
            <Button
              variant="ghost"
              className="text-gray-600 hover:bg-gray-100 cursor-pointer text-xs md:text-sm whitespace-nowrap"
              onClick={() => handleTravelOptionClick("Things to Do")}
            >
              Things to Do
            </Button>
            <Button
              variant="ghost"
              className="text-gray-600 hover:bg-gray-100 cursor-pointer text-xs md:text-sm whitespace-nowrap"
              onClick={() => handleTravelOptionClick("More")}
            >
              More
            </Button>
          </div>

          {/* Trip Type */}
          <div className="flex mb-4 md:mb-6 space-x-2 overflow-x-auto pb-2">
            <Button
              variant={isRoundTrip ? "default" : "outline"}
              className="rounded-full text-xs md:text-sm whitespace-nowrap"
              onClick={() => setIsRoundTrip(true)}
            >
              Round-trip
            </Button>
            <Button
              variant={!isRoundTrip ? "default" : "outline"}
              className="rounded-full text-xs md:text-sm whitespace-nowrap"
              onClick={() => setIsRoundTrip(false)}
            >
              One-way
            </Button>
            <Button
              variant="outline"
              className="rounded-full text-xs md:text-sm whitespace-nowrap"
            >
              Multi-city
            </Button>
          </div>

          {/* Search Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="relative">
              <label className="block text-xs md:text-sm text-gray-600 mb-1">
                From
              </label>
              <Input
                value={fromLocation}
                onChange={(e) => setFromLocation(e.target.value)}
                className="pl-10 py-4 md:py-6 text-sm md:text-base"
              />
              <Plane className="absolute left-3 top-8 md:top-9 h-4 w-4 md:h-5 md:w-5 text-gray-400" />
            </div>

            <div className="relative">
              <label className="block text-xs md:text-sm text-gray-600 mb-1">
                To
              </label>
              <Input
                value={toLocation}
                onChange={(e) => setToLocation(e.target.value)}
                className="pl-10 py-4 md:py-6 text-sm md:text-base"
              />
              <Plane className="absolute left-3 top-8 md:top-9 h-4 w-4 md:h-5 md:w-5 text-gray-400" />
            </div>

            <Button
              variant="outline"
              size="icon"
              className="absolute left-1/2 top-32 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-full border-2 border-gray-200 z-10 hidden md:flex"
              onClick={swapLocations}
            >
              <ArrowRightLeft className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="icon"
              className="absolute right-4 top-24 md:hidden bg-white rounded-full border-2 border-gray-200 z-10"
              onClick={swapLocations}
            >
              <ArrowRightLeft className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs md:text-sm text-gray-600 mb-1">
                Departure
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal pl-10 py-4 md:py-6 text-sm md:text-base"
                  >
                    <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 md:h-5 md:w-5 text-gray-400" />
                    {departureDate ? (
                      format(departureDate, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={departureDate}
                    onSelect={setDepartureDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {isRoundTrip && (
              <div>
                <label className="block text-xs md:text-sm text-gray-600 mb-1">
                  Return
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal pl-10 py-4 md:py-6 text-sm md:text-base"
                    >
                      <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 md:h-5 md:w-5 text-gray-400" />
                      {returnDate ? (
                        format(returnDate, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={returnDate}
                      onSelect={setReturnDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-xs md:text-sm text-gray-600 mb-1">
                Passengers
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal pl-10 py-4 md:py-6 text-sm md:text-base"
                  >
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 md:h-5 md:w-5 text-gray-400" />
                    {passengers}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-4">
                  <div className="space-y-4">
                    <h4 className="font-medium">Passengers</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span>Adults</span>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                          >
                            -
                          </Button>
                          <span className="w-8 text-center">1</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                          >
                            +
                          </Button>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Children</span>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                          >
                            -
                          </Button>
                          <span className="w-8 text-center">0</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                          >
                            +
                          </Button>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Infants</span>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                          >
                            -
                          </Button>
                          <span className="w-8 text-center">0</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                          >
                            +
                          </Button>
                        </div>
                      </div>
                    </div>
                    <Button className="w-full">Apply</Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <label className="block text-xs md:text-sm text-gray-600 mb-1">
                Class
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal pl-10 py-4 md:py-6 text-sm md:text-base"
                  >
                    <Badge className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 md:h-5 md:w-5 text-gray-400 p-0 flex items-center justify-center">
                      <span className="text-[10px]">C</span>
                    </Badge>
                    {travelClass}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-4">
                  <div className="space-y-4">
                    <h4 className="font-medium">Select Class</h4>
                    <div className="space-y-2">
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => setTravelClass("Economy")}
                      >
                        Economy
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => setTravelClass("Premium Economy")}
                      >
                        Premium Economy
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => setTravelClass("Business")}
                      >
                        Business
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => setTravelClass("First Class")}
                      >
                        First Class
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <Button
            className="w-full bg-green-500 hover:bg-green-600 text-white py-4 md:py-6 text-base md:text-lg"
            onClick={handleSearch}
          >
            <Search className="mr-2 h-4 w-4 md:h-5 md:w-5" />
            Search Flights
          </Button>
        </div>
      </div>

      {/* Auth Form */}
      {showAuthForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-xl font-bold">
                {authFormType === "login" ? t("Log In") : t("Register")}
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowAuthForm(false)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </Button>
            </div>
            <div className="p-4">
              <AuthForm
                initialTab={authFormType}
                onAuthStateChange={handleAuthStateChange}
                onClose={() => setShowAuthForm(false)}
              />
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default TravelPage;
