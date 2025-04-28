import StaffForm from "../components/auth/forms/StaffForm";
import { RegisterFormValues } from "../components/auth/RegistrationForm";
import { useForm, FormProvider } from "react-hook-form";
import { useLocation } from "react-router-dom"; // pastikan import ini ada
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  X,
} from "lucide-react";
import AuthForm from "@/components/auth/AuthForm";
import UserDropdown from "@/components/UserDropdown";
import { useAuth } from "@/hooks/useAuth";

const TravelPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, setIsAuthenticated, userRole, signOut, isAdmin } =
    useAuth();

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
  const [adultCount, setAdultCount] = useState(1);
  const [childCount, setChildCount] = useState(0);
  const [infantCount, setInfantCount] = useState(0);
  const [travelClass, setTravelClass] = useState("Economy");
  const [showStaffRegister, setShowStaffRegister] = useState(false);

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      // First check localStorage for shared authentication
      const authUser = localStorage.getItem("auth_user");
      if (authUser) {
        setIsAuthenticated(true);
        // If authenticated, make sure auth form is closed
        setShowAuthForm(false);
        return;
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
        const userRole = data.session.user.user_metadata?.role || "Customer";
        localStorage.setItem("userRole", userRole);

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

        const authUserObj = authUser ? JSON.parse(authUser) : {};
        const userName =
          authUserObj?.name ||
          localStorage.getItem("userName") ||
          (authUserObj?.email ? authUserObj.email.split("@")[0] : "User");

        localStorage.setItem("userName", userName);

        // Store in auth_user for shared authentication
        const userData = {
          id: userId,
          role: userRole,
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
      authListener?.subscription.unsubscribe();
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
      }

      // Check if user is admin and redirect to admin dashboard
      console.log("TravelPage auth state change - userRole:", userRole);
      const authUserStr = localStorage.getItem("auth_user");
      if (authUserStr) {
        try {
          const authUser = JSON.parse(authUserStr);
          console.log("TravelPage auth_user from localStorage:", authUser);
        } catch (e) {
          console.error("Error parsing auth_user in TravelPage:", e);
        }
      }

      if (userRole === "Admin") {
        console.log("Redirecting admin to dashboard");
        navigate("/admin");
      } else {
        // Stay on the current page (TravelPage) after successful login
        // No navigation needed as we're already on the TravelPage
      }
    } else {
      // Remove user data from localStorage on logout
      localStorage.removeItem("auth_user");
      localStorage.removeItem("userId");
      localStorage.removeItem("userRole");
      localStorage.removeItem("userEmail");
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-800 to-green-600">
      {/* Header */}
      <header className="bg-green-800 text-white p-4">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center space-x-4 w-full md:w-auto justify-between">
            {/* <Button
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
            </Button> */}
            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold">Travelintrips</span>
              <span className="text-xs">★</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center md:justify-end gap-2 md:gap-4 w-full md:w-auto">
            <div className="flex items-center space-x-1">
              <span>🇮🇩</span>
              <span>EN</span>
              <span>|</span>
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
                      onClick={() =>
                        window.open(
                          "https://register.travelinairport.com/",
                          "_blank",
                        )
                      }
                    >
                      Driver Mitra
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="justify-start"
                      onClick={() =>
                        window.open(
                          "https://register.travelinairport.com/",
                          "_blank",
                        )
                      }
                    >
                      Driver Perusahaan
                    </Button>
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
              >
                Bookings
              </Button>
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
                    <Button variant="ghost" size="sm" className="justify-start">
                      Bookings
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <UserDropdown />
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
        <div className="container mx-auto flex justify-center md:justify-start space-x-2 md:space-x-6 px-2 md:px-4">
          <Button
            variant="ghost"
            className="text-white hover:bg-green-800 cursor-pointer text-xs md:text-sm whitespace-nowrap flex items-center"
            onClick={() => handleTravelOptionClick("Hotels")}
          >
            <Hotel className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" /> Hotels
          </Button>
          <Button
            variant="ghost"
            className="text-white hover:bg-green-800 cursor-pointer text-xs md:text-sm whitespace-nowrap flex items-center"
            onClick={() => handleTravelOptionClick("Flights")}
          >
            <Plane className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" /> Flights
          </Button>
          <Button
            variant="ghost"
            className="text-white hover:bg-green-800 cursor-pointer text-xs md:text-sm whitespace-nowrap flex items-center"
            onClick={() => handleTravelOptionClick("Trains")}
          >
            <Train className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" /> Trains
          </Button>
          <Button
            variant="ghost"
            className="text-white hover:bg-green-800 cursor-pointer text-xs md:text-sm whitespace-nowrap flex items-center"
            onClick={() => handleTravelOptionClick("Bus & Travel")}
          >
            <Bus className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" /> Bus & Travel
          </Button>
          <Button
            variant="ghost"
            className="text-white hover:bg-green-800 cursor-pointer text-xs md:text-sm whitespace-nowrap flex items-center"
            onClick={() => handleTravelOptionClick("Airport Transfer")}
          >
            Airport Transfer
          </Button>
          <Button
            variant="ghost"
            className="text-white hover:bg-green-800 cursor-pointer text-xs md:text-sm whitespace-nowrap flex items-center"
            onClick={() => handleTravelOptionClick("Car Rental")}
          >
            <Car className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" /> Car Rental
          </Button>
          <Button
            variant="ghost"
            className="text-white hover:bg-green-800 cursor-pointer text-xs md:text-sm whitespace-nowrap flex items-center"
            onClick={() => handleTravelOptionClick("Things to Do")}
          >
            Things to Do
          </Button>
          <Button
            variant="ghost"
            className="text-white hover:bg-green-800 cursor-pointer text-xs md:text-sm whitespace-nowrap flex items-center"
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
          <div className="flex mb-4 md:mb-6 space-x-2 md:space-x-4 overflow-x-auto pb-2 justify-center">
            <Button
              variant="ghost"
              className="bg-green-100 text-green-600 hover:bg-green-200 cursor-pointer text-xs md:text-sm whitespace-nowrap flex items-center"
              onClick={() => handleTravelOptionClick("Hotels")}
            >
              <Hotel className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" /> Hotels
            </Button>
            <Button
              variant="ghost"
              className="bg-green-500 text-white hover:bg-green-600 cursor-pointer text-xs md:text-sm whitespace-nowrap flex items-center"
              onClick={() => handleTravelOptionClick("Flights")}
            >
              <Plane className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" /> Flights
            </Button>
            <Button
              variant="ghost"
              className="text-gray-600 hover:bg-gray-100 cursor-pointer text-xs md:text-sm whitespace-nowrap flex items-center"
              onClick={() => handleTravelOptionClick("Trains")}
            >
              <Train className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" /> Trains
            </Button>
            <Button
              variant="ghost"
              className="text-gray-600 hover:bg-gray-100 cursor-pointer text-xs md:text-sm whitespace-nowrap flex items-center"
              onClick={() => handleTravelOptionClick("Bus & Travel")}
            >
              <Bus className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" /> Bus &
              Travel
            </Button>
            <Button
              variant="ghost"
              className="text-gray-600 hover:bg-gray-100 cursor-pointer text-xs md:text-sm whitespace-nowrap flex items-center"
              onClick={() => handleTravelOptionClick("Airport Transfer")}
            >
              Airport Transfer
            </Button>
            <Button
              variant="ghost"
              className="text-gray-600 hover:bg-gray-100 cursor-pointer text-xs md:text-sm whitespace-nowrap flex items-center"
              onClick={() => handleTravelOptionClick("Car Rental")}
            >
              <Car className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" /> Car Rental
            </Button>
            <Button
              variant="ghost"
              className="text-gray-600 hover:bg-gray-100 cursor-pointer text-xs md:text-sm whitespace-nowrap flex items-center"
              onClick={() => handleTravelOptionClick("Things to Do")}
            >
              Things to Do
            </Button>
            <Button
              variant="ghost"
              className="text-gray-600 hover:bg-gray-100 cursor-pointer text-xs md:text-sm whitespace-nowrap flex items-center"
              onClick={() => handleTravelOptionClick("More")}
            >
              More
            </Button>
          </div>

          {/* Trip Type */}
          <div className="flex mb-4 md:mb-6 space-x-2 overflow-x-auto pb-2 justify-center md:justify-start">
            <Button
              variant="outline"
              className={`rounded-full text-xs md:text-sm whitespace-nowrap font-medium border-gray-300 ${isRoundTrip ? "bg-green-500 text-white" : "text-black"}`}
              onClick={() => setIsRoundTrip(true)}
            >
              Round-trip
            </Button>
            <Button
              variant="outline"
              className={`rounded-full text-xs md:text-sm whitespace-nowrap font-medium border-gray-300 ${!isRoundTrip ? "bg-green-500 text-white" : "text-black"}`}
              onClick={() => setIsRoundTrip(false)}
            >
              One-way
            </Button>
            <Button
              variant="outline"
              className="rounded-full text-xs md:text-sm whitespace-nowrap font-medium text-black border-gray-300"
            >
              Multi-city
            </Button>
          </div>

          {/* Swap button - top */}
          <div className="flex justify-center mb-4">
            <Button
              variant="default"
              className="bg-green-500 text-white rounded-full border border-green-600 z-10 px-4 py-2 flex items-center gap-2 font-medium transition"
              onClick={swapLocations}
            >
              <ArrowRightLeft className="h-4 w-4" />
              SWAP
            </Button>
          </div>

          {/* Search Form */}
          <div className="relative grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="relative">
              <div className="flex items-center mb-1">
                <Plane className="h-4 w-4 md:h-5 md:w-5 text-green-600 mr-2" />
                <label className="block text-xs md:text-sm text-black font-medium">
                  From
                </label>
              </div>
              <Input
                value={fromLocation}
                onChange={(e) => setFromLocation(e.target.value)}
                className="py-4 md:py-6 text-sm md:text-base text-black"
              />
            </div>

            <div className="relative">
              <div className="flex items-center mb-1">
                <Plane className="h-4 w-4 md:h-5 md:w-5 text-green-600 mr-2" />
                <label className="block text-xs md:text-sm text-black font-medium">
                  To
                </label>
              </div>
              <Input
                value={toLocation}
                onChange={(e) => setToLocation(e.target.value)}
                className="py-4 md:py-6 text-sm md:text-base text-black"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 relative">
            <div className="relative">
              <div className="flex items-center mb-1">
                <CalendarIcon className="h-4 w-4 md:h-5 md:w-5 text-green-600 mr-2" />
                <label className="block text-xs md:text-sm text-black font-medium">
                  Departure
                </label>
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal py-4 md:py-6 text-sm md:text-base text-black"
                  >
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
                    onSelect={(date) => {
                      setDepartureDate(date);
                      document.body.click(); // Close the popover
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {isRoundTrip && (
              <div className="relative">
                <div className="flex items-center mb-1">
                  <CalendarIcon className="h-4 w-4 md:h-5 md:w-5 text-green-600 mr-2" />
                  <label className="block text-xs md:text-sm text-black font-medium">
                    Return
                  </label>
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal py-4 md:py-6 text-sm md:text-base text-black"
                    >
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
                      onSelect={(date) => {
                        setReturnDate(date);
                        document.body.click(); // Close the popover
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {/* Removed swap button between departure and return */}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="relative">
              <div className="flex items-center mb-1">
                <User className="h-4 w-4 md:h-5 md:w-5 text-green-600 mr-2" />
                <label className="block text-xs md:text-sm text-black font-medium">
                  Passengers
                </label>
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal py-4 md:py-6 text-sm md:text-base text-black"
                  >
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
                            onClick={() =>
                              setAdultCount(Math.max(1, adultCount - 1))
                            }
                            disabled={adultCount <= 1}
                          >
                            -
                          </Button>
                          <span className="w-8 text-center">{adultCount}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setAdultCount(adultCount + 1)}
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
                            onClick={() =>
                              setChildCount(Math.max(0, childCount - 1))
                            }
                            disabled={childCount <= 0}
                          >
                            -
                          </Button>
                          <span className="w-8 text-center">{childCount}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setChildCount(childCount + 1)}
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
                            onClick={() =>
                              setInfantCount(Math.max(0, infantCount - 1))
                            }
                            disabled={infantCount <= 0}
                          >
                            -
                          </Button>
                          <span className="w-8 text-center">{infantCount}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setInfantCount(infantCount + 1)}
                          >
                            +
                          </Button>
                        </div>
                      </div>
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => {
                        const newPassengerText = `${adultCount} Adult${adultCount > 1 ? "s" : ""}, ${childCount} child${childCount > 1 ? "ren" : ""}, ${infantCount} infant${infantCount > 1 ? "s" : ""}`;
                        setPassengers(newPassengerText);
                        document.body.click(); // Close the popover
                      }}
                    >
                      Apply
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="relative">
              <div className="flex items-center mb-1">
                <Badge className="h-4 w-4 md:h-5 md:w-5 bg-green-600 text-white p-0 flex items-center justify-center mr-2">
                  <span className="text-[10px]">C</span>
                </Badge>
                <label className="block text-xs md:text-sm text-black font-medium">
                  Class
                </label>
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal py-4 md:py-6 text-sm md:text-base text-black"
                  >
                    <span>{travelClass}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-4">
                  <div className="space-y-4">
                    <h4 className="font-medium">Select Class</h4>
                    <div className="space-y-2">
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => {
                          setTravelClass("Economy");
                          document.body.click(); // Close the popover
                        }}
                      >
                        Economy
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => {
                          setTravelClass("Premium Economy");
                          document.body.click(); // Close the popover
                        }}
                      >
                        Premium Economy
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => {
                          setTravelClass("Business");
                          document.body.click(); // Close the popover
                        }}
                      >
                        Business
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => {
                          setTravelClass("First Class");
                          document.body.click(); // Close the popover
                        }}
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
            className="w-full bg-green-500 hover:bg-green-600 text-white py-4 md:py-6 text-base md:text-lg mt-2"
            onClick={handleSearch}
          >
            <Search className="mr-2 h-4 w-4 md:h-5 md:w-5" />
            Search Flights
          </Button>
        </div>
      </div>

      {/* Auth Form */}
      {showAuthForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full relative">
            <Button
              className="absolute top-2 right-2 z-50"
              variant="ghost"
              size="icon"
              onClick={() => {
                console.log("❌ Close clicked");
                setShowAuthForm(false);
              }}
            >
              <span className="text-xl">✕</span>
            </Button>

            <h2 className="text-xl font-bold mb-4">
              {authFormType === "login" ? "Login" : "Register"}
            </h2>
            <AuthForm
              initialTab={authFormType}
              onClose={() => {
                console.log("✅ Auth form closed");
                setShowAuthForm(false);
              }}
            />
          </div>
        </div>
      )}
      {showStaffRegister && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center p-4">
          <div className="bg-white p-6 rounded shadow-md w-full max-w-4xl relative">
            <Button
              className="absolute top-2 right-2"
              size="icon"
              variant="ghost"
              onClick={() => setShowStaffRegister(false)}
            >
              <X className="w-4 h-4" />
            </Button>
            <h2 className="text-xl font-bold mb-4">Staff Registration</h2>
          </div>
        </div>
      )}
    </div>
  );
};

export default TravelPage;
