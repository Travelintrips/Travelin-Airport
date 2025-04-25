import StaffForm from "../components/auth/forms/StaffForm";
import { RegisterFormValues } from "../components/auth/forms/RegistrationForm";
import { useForm } from "react-hook-form";

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
  ArrowRightLeft,
  Globe,
  ChevronDown,
  User,
  X,
  Calendar as CalendarIcon,
} from "lucide-react";
import AuthForm from "@/components/auth/AuthForm";
import StaffLink from "@/components/StaffLink";
import useAuth from "@/hooks/useAuth";

const TravelPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, userRole, signOut } = useAuth();
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
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    if (!isAuthenticated) return;

    const authUserStr = localStorage.getItem("auth_user");
    try {
      const authUser = authUserStr ? JSON.parse(authUserStr) : null;
      console.log("✅ authUser object:", authUser);

      const name =
        (authUser?.name && authUser.name.trim()) ||
        localStorage.getItem("userName") ||
        authUser?.email?.split("@")[0] ||
        "User";

      // We don't need to set userRole as it comes from useAuth hook
      setUserName(name);

      console.log("✅ userName:", name);
      console.log("✅ userRole:", userRole);
    } catch (e) {
      console.warn("⚠️ Gagal parse auth_user:", e);
    }
  }, [isAuthenticated, userRole]); // Added userRole to dependencies

  const handleAuthStateChange = (state: boolean) => {
    if (state) {
      // Refresh user data from localStorage after login
      const authUserStr = localStorage.getItem("auth_user");
      try {
        const authUser = authUserStr ? JSON.parse(authUserStr) : null;
        const name =
          (authUser?.name && authUser.name.trim()) ||
          localStorage.getItem("userName") ||
          authUser?.email?.split("@")[0] ||
          "User";
        setUserName(name);
        // No need to set userRole here as it comes from useAuth hook
      } catch (e) {
        console.warn("⚠️ Error parsing auth_user after login:", e);
      }
      // Always close the auth form when authentication state changes to true
      setShowAuthForm(false);
      console.log("✅ Auth form closed after successful login");
    } else {
      // Reset state
      setUserName("");
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

  // userName state is now declared at the top of the component

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

  const location = useLocation();

  useEffect(() => {
    if (location.state?.requireAuth) {
      const formType = location.state?.formType || "login"; // default ke login jika tidak ada
      setAuthFormType(formType);
      setShowAuthForm(true);
    }
  }, [location.state]);

  const [showStaffRegister, setShowStaffRegister] = useState(false); // ✅ DI SINI
  const staffForm = useForm<RegisterFormValues>();

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-800 to-green-600">
      {/* Header */}
      <header className="bg-green-800 text-white p-4">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <span className="text-xl font-bold">Travelintrips</span>
            <span className="text-xs">★</span>
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

              {/*Dtriver Mitra dan Perusahaan*/}
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
                    <Button
                      variant="ghost"
                      size="sm"
                      className="justify-start"
                      onClick={() => setShowStaffRegister(true)}
                    >
                      Staff Register
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

              {isAuthenticated ? (
                // ✅ Jika sudah login: tampilkan "My Account"
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-white hover:bg-green-800"
                    >
                      My Account <ChevronDown className="h-4 w-4 ml-1" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48 z-[10]">
                    <div className="grid gap-2">
                      <div className="p-2 border-b">
                        <p className="font-medium">{userName}</p>
                        {userRole && (
                          <Badge variant="outline" className="mt-1">
                            {userRole}
                          </Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="justify-start"
                        onClick={() => navigate("/profile")}
                      >
                        My Profile
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="justify-start"
                        onClick={() => navigate("/bookings")}
                      >
                        My Bookings
                      </Button>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="justify-start"
                          onClick={() => navigate("/admin")}
                        >
                          Admin Dashboard
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="justify-start text-red-500"
                        onClick={signOut}
                      >
                        Sign Out
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              ) : (
                // ❌ Jika belum login: tampilkan tombol Login & Register di luar Popover
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-white hover:bg-green-800"
                    onClick={() => {
                      setAuthFormType("login");
                      setShowAuthForm(true);
                    }}
                  >
                    Login
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-white hover:bg-green-800"
                    onClick={() => {
                      setAuthFormType("register");
                      setShowAuthForm(true);
                    }}
                  >
                    Register
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Travel Options */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-8">
          <Tabs defaultValue="flights" className="w-full">
            <TabsList className="grid grid-cols-4 md:grid-cols-8 gap-2">
              <TabsTrigger
                value="flights"
                className="flex flex-col items-center"
                onClick={() => handleTravelOptionClick("Flights")}
              >
                <Plane className="h-5 w-5 mb-1" />
                <span className="text-xs">Flights</span>
              </TabsTrigger>
              <TabsTrigger
                value="hotels"
                className="flex flex-col items-center"
                onClick={() => handleTravelOptionClick("Hotels")}
              >
                <Hotel className="h-5 w-5 mb-1" />
                <span className="text-xs">Hotels</span>
              </TabsTrigger>
              <TabsTrigger
                value="trains"
                className="flex flex-col items-center"
                onClick={() => handleTravelOptionClick("Trains")}
              >
                <Train className="h-5 w-5 mb-1" />
                <span className="text-xs">Trains</span>
              </TabsTrigger>
              <TabsTrigger
                value="bus"
                className="flex flex-col items-center"
                onClick={() => handleTravelOptionClick("Bus & Travel")}
              >
                <Bus className="h-5 w-5 mb-1" />
                <span className="text-xs">Bus & Travel</span>
              </TabsTrigger>
              <TabsTrigger
                value="airport"
                className="flex flex-col items-center"
                onClick={() => handleTravelOptionClick("Airport Transfer")}
              >
                <Plane className="h-5 w-5 mb-1" />
                <span className="text-xs">Airport Transfer</span>
              </TabsTrigger>
              <TabsTrigger
                value="car"
                className="flex flex-col items-center"
                onClick={() => handleTravelOptionClick("Car Rental")}
              >
                <Car className="h-5 w-5 mb-1" />
                <span className="text-xs">Car Rental</span>
              </TabsTrigger>
              <TabsTrigger
                value="activities"
                className="flex flex-col items-center"
                onClick={() => handleTravelOptionClick("Things to Do")}
              >
                <Globe className="h-5 w-5 mb-1" />
                <span className="text-xs">Things to Do</span>
              </TabsTrigger>
              <TabsTrigger
                value="more"
                className="flex flex-col items-center"
                onClick={() => handleTravelOptionClick("More")}
              >
                <ChevronDown className="h-5 w-5 mb-1" />
                <span className="text-xs">More</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Flight Search */}
        <Card className="p-6 mb-8">
          <div className="flex items-center mb-4">
            <h2 className="text-xl font-bold">Search Flights</h2>
            <div className="ml-auto flex space-x-2">
              <Button
                variant={isRoundTrip ? "default" : "outline"}
                size="sm"
                onClick={() => setIsRoundTrip(true)}
              >
                Round Trip
              </Button>
              <Button
                variant={!isRoundTrip ? "default" : "outline"}
                size="sm"
                onClick={() => setIsRoundTrip(false)}
              >
                One Way
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="relative">
              <Input
                placeholder="From"
                value={fromLocation}
                onChange={(e) => setFromLocation(e.target.value)}
                className="pr-10"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full"
                onClick={swapLocations}
              >
                <ArrowRightLeft className="h-4 w-4" />
              </Button>
            </div>
            <Input
              placeholder="To"
              value={toLocation}
              onChange={(e) => setToLocation(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {departureDate ? (
                      format(departureDate, "PPP")
                    ) : (
                      <span>Departure Date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={departureDate}
                    onSelect={(date) => date && setDepartureDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {isRoundTrip && (
              <div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {returnDate ? (
                        format(returnDate, "PPP")
                      ) : (
                        <span>Return Date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={returnDate}
                      onSelect={(date) => setReturnDate(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            <div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <User className="mr-2 h-4 w-4" />
                    {passengers}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Adults</p>
                          <p className="text-sm text-gray-500">Age 12+</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-full"
                          >
                            -
                          </Button>
                          <span>1</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-full"
                          >
                            +
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Children</p>
                          <p className="text-sm text-gray-500">Age 2-11</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-full"
                          >
                            -
                          </Button>
                          <span>0</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-full"
                          >
                            +
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Infants</p>
                          <p className="text-sm text-gray-500">Under 2</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-full"
                          >
                            -
                          </Button>
                          <span>0</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-full"
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
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <span className="mr-2">🛋️</span>
                    {travelClass}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56">
                  <div className="grid gap-2">
                    <Button
                      variant="ghost"
                      className="justify-start"
                      onClick={() => setTravelClass("Economy")}
                    >
                      Economy
                    </Button>
                    <Button
                      variant="ghost"
                      className="justify-start"
                      onClick={() => setTravelClass("Premium Economy")}
                    >
                      Premium Economy
                    </Button>
                    <Button
                      variant="ghost"
                      className="justify-start"
                      onClick={() => setTravelClass("Business")}
                    >
                      Business
                    </Button>
                    <Button
                      variant="ghost"
                      className="justify-start"
                      onClick={() => setTravelClass("First Class")}
                    >
                      First Class
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <Button
            className="w-full md:w-auto px-8 bg-green-600 hover:bg-green-700"
            onClick={handleSearch}
          >
            <Search className="mr-2 h-4 w-4" /> Search Flights
          </Button>
        </Card>

        {/* Featured Deals */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 text-white">Featured Deals</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="overflow-hidden">
                <div
                  className="h-40 bg-cover bg-center"
                  style={{
                    backgroundImage: `url(https://images.unsplash.com/photo-${1550000000000 + i * 1000}?w=500&q=80)`,
                  }}
                ></div>
                <div className="p-4">
                  <h3 className="font-bold mb-2">
                    {
                      ["Bali Getaway", "Singapore Escape", "Tokyo Adventure"][
                        i - 1
                      ]
                    }
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    {["3 nights", "4 nights", "5 nights"][i - 1]} package with
                    flights
                  </p>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-green-600">
                      IDR {[2500000, 4500000, 7500000][i - 1].toLocaleString()}
                    </span>
                    <Button size="sm">View Deal</Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Staff Link */}
        <div className="text-center mt-8">
          <StaffLink />
        </div>
      </main>

      {/* Auth Form Modal */}
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
              type={authFormType}
              initialTab={authFormType}
              onSuccess={handleAuthStateChange}
              onClose={() => setShowAuthForm(false)}
              onCancel={() => {
                console.log("✅ Auth form canceled");
                setShowAuthForm(false);
              }}
            />
          </div>
        </div>
      )}
      {/* Staff Register Modal */}
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
            {/* 
        Disini StaffForm 
        Pastikan kamu juga import StaffForm 
      */}
            <StaffForm
              control={staffForm.control}
              watch={staffForm.watch}
              setValue={staffForm.setValue}
              existingImages={{
                idCard: "",
                ktp: "",
                sim: "",
                kk: "",
                skck: "",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

const CalendarIcon = (props: any) => (
  <svg
    {...props}
    width="15"
    height="15"
    viewBox="0 0 15 15"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M4.5 1C4.77614 1 5 1.22386 5 1.5V2H10V1.5C10 1.22386 10.2239 1 10.5 1C10.7761 1 11 1.22386 11 1.5V2H12.5C13.3284 2 14 2.67157 14 3.5V12.5C14 13.3284 13.3284 14 12.5 14H2.5C1.67157 14 1 13.3284 1 12.5V3.5C1 2.67157 1.67157 2 2.5 2H4V1.5C4 1.22386 4.22386 1 4.5 1ZM2.5 3C2.22386 3 2 3.22386 2 3.5V5H13V3.5C13 3.22386 12.7761 3 12.5 3H2.5ZM13 6H2V12.5C2 12.7761 2.22386 13 2.5 13H12.5C12.7761 13 13 12.7761 13 12.5V6ZM7 7.5C7 7.22386 7.22386 7 7.5 7C7.77614 7 8 7.22386 8 7.5C8 7.77614 7.77614 8 7.5 8C7.22386 8 7 7.77614 7 7.5ZM9.5 7C9.22386 7 9 7.22386 9 7.5C9 7.77614 9.22386 8 9.5 8C9.77614 8 10 7.77614 10 7.5C10 7.22386 9.77614 7 9.5 7ZM11 7.5C11 7.22386 11.2239 7 11.5 7C11.7761 7 12 7.22386 12 7.5C12 7.77614 11.7761 8 11.5 8C11.2239 8 11 7.77614 11 7.5ZM3.5 9C3.22386 9 3 9.22386 3 9.5C3 9.77614 3.22386 10 3.5 10C3.77614 10 4 9.77614 4 9.5C4 9.22386 3.77614 9 3.5 9ZM5 9.5C5 9.22386 5.22386 9 5.5 9C5.77614 9 6 9.22386 6 9.5C6 9.77614 5.77614 10 5.5 10C5.22386 10 5 9.77614 5 9.5ZM7.5 9C7.22386 9 7 9.22386 7 9.5C7 9.77614 7.22386 10 7.5 10C7.77614 10 8 9.77614 8 9.5C8 9.22386 7.77614 9 7.5 9ZM9 9.5C9 9.22386 9.22386 9 9.5 9C9.77614 9 10 9.22386 10 9.5C10 9.77614 9.77614 10 9.5 10C9.22386 10 9 9.77614 9 9.5ZM11.5 9C11.2239 9 11 9.22386 11 9.5C11 9.77614 11.2239 10 11.5 10C11.7761 10 12 9.77614 12 9.5C12 9.22386 11.7761 9 11.5 9ZM3 11.5C3 11.2239 3.22386 11 3.5 11C3.77614 11 4 11.2239 4 11.5C4 11.7761 3.77614 12 3.5 12C3.22386 12 3 11.7761 3 11.5ZM5.5 11C5.22386 11 5 11.2239 5 11.5C5 11.7761 5.22386 12 5.5 12C5.77614 12 6 11.7761 6 11.5C6 11.2239 5.77614 11 5.5 11ZM7 11.5C7 11.2239 7.22386 11 7.5 11C7.77614 11 8 11.2239 8 11.5C8 11.7761 7.77614 12 7.5 12C7.22386 12 7 11.7761 7 11.5ZM9.5 11C9.22386 11 9 11.2239 9 11.5C9 11.7761 9.22386 12 9.5 12C9.77614 12 10 11.7761 10 11.5C10 11.2239 9.77614 11 9.5 11Z"
      fill="currentColor"
      fillRule="evenodd"
      clipRule="evenodd"
    ></path>
  </svg>
);

export default TravelPage;
