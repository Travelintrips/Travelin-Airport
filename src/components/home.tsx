import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Sun,
  Moon,
  Car,
  Calendar,
  CreditCard,
  User,
  Globe,
} from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import AuthForm from "./auth/AuthForm";
import VehicleSelector from "./booking/VehicleSelector";
import BookingForm from "./booking/BookingForm";
import PreRentalInspectionForm from "./booking/PreRentalInspectionForm";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface Vehicle {
  id: string;
  name: string;
  type: "sedan" | "suv" | "truck" | "luxury";
  price: number;
  image: string;
  seats: number;
  transmission: "automatic" | "manual";
  fuelType: "petrol" | "diesel" | "electric" | "hybrid";
  available: boolean;
  features: string[];
}

const Home = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  // Set document title based on language
  useEffect(() => {
    document.title = t("brand", "Premium Car Rental Service");
  }, [t, i18n.language]);

  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [activeTab, setActiveTab] = useState("vehicles");
  const [bookingData, setBookingData] = useState<any>(null);
  const [showInspection, setShowInspection] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "bank" | "card">(
    "cash",
  );
  const [bankOption, setBankOption] = useState<"BCA" | "Mandiri" | "BRI">(
    "BCA",
  );
  const [cardType, setCardType] = useState<"Visa" | "Mastercard">("Visa");
  const [paymentType, setPaymentType] = useState<"full" | "partial">("full");
  const [partialAmount, setPartialAmount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
    // In a real implementation, you would apply the theme to the document
    // document.documentElement.classList.toggle('dark');
  };

  // Function to handle authentication state
  const handleAuthStateChange = (state: boolean) => {
    setIsAuthenticated(state);

    // Clear user role from local storage when logging out
    if (!state) {
      localStorage.removeItem("userRole");
      localStorage.removeItem("userId");
    } else {
      // Check if user is admin and redirect to admin panel
      const userRole = localStorage.getItem("userRole");
      if (userRole === "Admin") {
        console.log("Admin user detected, should show admin panel");
      }
    }
  };

  // Handle vehicle selection
  const handleSelectVehicle = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setActiveTab("booking");
  };

  // Handle booking completion
  const handleBookingComplete = (data: any) => {
    setBookingData(data);
    setShowInspection(true);
    setActiveTab("inspection");
  };

  // Handle inspection completion
  const handleInspectionComplete = (data: any) => {
    console.log("Inspection completed:", data);
    // Move to payment tab instead of showing alert
    setShowPayment(true);
    setActiveTab("payment");

    // Calculate total amount based on booking data
    if (selectedVehicle && bookingData) {
      const days = bookingData.days || 1;
      const amount = selectedVehicle.price * days;
      setTotalAmount(amount);
      // Set default partial amount to 30% of total
      setPartialAmount(Math.round(amount * 0.3));
    }
  };

  // Handle payment completion
  const handlePaymentComplete = () => {
    const paymentDetails = {
      method: paymentMethod,
      type: paymentType,
      amount: paymentType === "full" ? totalAmount : partialAmount,
      bankOption: paymentMethod === "bank" ? bankOption : null,
      cardType: paymentMethod === "card" ? cardType : null,
    };

    console.log("Payment details:", paymentDetails);

    let message = "Payment completed successfully! ";

    if (paymentType === "partial") {
      const remaining = totalAmount - partialAmount;
      message += `You have paid Rp ${partialAmount.toLocaleString()} with remaining balance of Rp ${remaining.toLocaleString()}.`;
    } else {
      message += `You have paid the full amount of Rp ${totalAmount.toLocaleString()}.`;
    }

    message += " Your vehicle is ready for pickup.";

    alert(message);

    // Reset the flow
    setActiveTab("vehicles");
    setSelectedVehicle(null);
    setBookingData(null);
    setShowInspection(false);
    setShowPayment(false);
    setPaymentMethod("cash");
    setBankOption("BCA");
    setCardType("Visa");
    setPaymentType("full");
    setPartialAmount(0);
    setTotalAmount(0);
  };

  return (
    <div
      className={`min-h-screen bg-background ${theme === "dark" ? "dark" : ""}`}
    >
      {/* Navbar */}
      <nav className="sticky top-0 z-10 w-full bg-background border-b border-border p-4">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Car className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">{t("brand", "CarRental")}</span>
          </div>

          <div className="flex items-center space-x-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Globe className="h-5 w-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2">
                <div className="grid gap-1">
                  <h4 className="font-medium mb-1">{t("language.select")}</h4>
                  <Button
                    variant={i18n.language === "en" ? "default" : "ghost"}
                    size="sm"
                    className="justify-start"
                    onClick={() => i18n.changeLanguage("en")}
                  >
                    {t("language.en")}
                  </Button>
                  <Button
                    variant={i18n.language === "id" ? "default" : "ghost"}
                    size="sm"
                    className="justify-start"
                    onClick={() => i18n.changeLanguage("id")}
                  >
                    {t("language.id")}
                  </Button>
                  <Button
                    variant={i18n.language === "fr" ? "default" : "ghost"}
                    size="sm"
                    className="justify-start"
                    onClick={() => i18n.changeLanguage("fr")}
                  >
                    {t("language.fr")}
                  </Button>
                  <Button
                    variant={i18n.language === "nl" ? "default" : "ghost"}
                    size="sm"
                    className="justify-start"
                    onClick={() => i18n.changeLanguage("nl")}
                  >
                    {t("language.nl")}
                  </Button>
                  <Button
                    variant={i18n.language === "ru" ? "default" : "ghost"}
                    size="sm"
                    className="justify-start"
                    onClick={() => i18n.changeLanguage("ru")}
                  >
                    {t("language.ru")}
                  </Button>
                  <Button
                    variant={i18n.language === "zh" ? "default" : "ghost"}
                    size="sm"
                    className="justify-start"
                    onClick={() => i18n.changeLanguage("zh")}
                  >
                    {t("language.zh")}
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {theme === "light" ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
            </Button>

            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                {localStorage.getItem("userRole") === "Admin" && (
                  <Button
                    variant="default"
                    className="flex items-center gap-2"
                    onClick={() => navigate("/admin")}
                  >
                    {t("navbar.adminPanel")}
                  </Button>
                )}
                <Button variant="outline" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {t("navbar.myAccount")}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleAuthStateChange(false)}
                >
                  {t("navbar.signOut")}
                </Button>
              </div>
            ) : (
              <Button
                variant="default"
                onClick={() => handleAuthStateChange(true)}
              >
                {t("navbar.signIn")}
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-12 md:py-20 bg-muted">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              {t("hero.title")}
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              {t("hero.description")}
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button size="lg" className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                {t("hero.browseCars")}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="flex items-center gap-2"
              >
                <Calendar className="h-5 w-5" />
                {t("hero.bookNow")}
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12 container mx-auto px-4">
        {!isAuthenticated ? (
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-4">
                {t("auth.readyToBook")}
              </h2>
              <p className="text-muted-foreground mb-6">
                {t("auth.signInDescription")}
              </p>
              <div className="flex flex-col space-y-4">
                <div className="flex items-start gap-3">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <Car className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">
                      {t("features.wideSelection")}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {t("features.wideSelectionDesc")}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">
                      {t("features.flexibleBooking")}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {t("features.flexibleBookingDesc")}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <CreditCard className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">
                      {t("features.multiplePayment")}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {t("features.multiplePaymentDesc")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <Card className="w-full max-w-md mx-auto">
              <CardContent className="pt-6">
                <AuthForm onAuthStateChange={handleAuthStateChange} />
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold mb-4">{t("booking.title")}</h2>
              <p className="text-muted-foreground">
                {t("booking.description")}
              </p>
            </div>

            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid w-full max-w-md mx-auto grid-cols-4">
                <TabsTrigger value="vehicles">
                  {t("booking.selectVehicle")}
                </TabsTrigger>
                <TabsTrigger value="booking">
                  {t("booking.bookingDetails")}
                </TabsTrigger>
                <TabsTrigger value="inspection" disabled={!showInspection}>
                  {t("booking.inspection")}
                </TabsTrigger>
                <TabsTrigger value="payment" disabled={!showPayment}>
                  {t("booking.payment")}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="vehicles" className="mt-6">
                <VehicleSelector onSelectVehicle={handleSelectVehicle} />
              </TabsContent>
              <TabsContent value="booking" className="mt-6">
                <BookingForm
                  selectedVehicle={selectedVehicle}
                  onBookingComplete={handleBookingComplete}
                />
              </TabsContent>
              <TabsContent value="inspection" className="mt-6">
                {bookingData && (
                  <PreRentalInspectionForm
                    vehicleId={bookingData.vehicleId}
                    bookingId={bookingData.bookingId}
                    onComplete={handleInspectionComplete}
                    onCancel={() => {
                      setActiveTab("booking");
                      setShowInspection(false);
                    }}
                  />
                )}
              </TabsContent>
              <TabsContent value="payment" className="mt-6">
                {bookingData && showPayment && (
                  <Card className="w-full max-w-2xl mx-auto">
                    <CardContent className="pt-6">
                      <h2 className="text-2xl font-bold mb-4">
                        {t("payment.details")}
                      </h2>
                      <div className="space-y-6">
                        <div className="bg-muted p-4 rounded-md">
                          <h3 className="font-medium mb-2">
                            {t("payment.summary")}
                          </h3>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <span className="text-muted-foreground">
                              {t("payment.vehicle")}
                            </span>
                            <span className="font-medium">
                              {selectedVehicle?.name}
                            </span>
                            <span className="text-muted-foreground">
                              {t("payment.bookingId")}
                            </span>
                            <span className="font-medium">
                              {bookingData.bookingId}
                            </span>
                            <span className="text-muted-foreground">
                              {t("payment.totalAmount")}
                            </span>
                            <span className="font-medium">
                              $
                              {selectedVehicle?.price * (bookingData.days || 1)}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h3 className="font-medium">
                            {t("payment.selectMethod")}
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Button
                              variant={
                                paymentMethod === "card" ? "default" : "outline"
                              }
                              className="flex flex-col items-center justify-center h-24 p-4"
                              onClick={() => setPaymentMethod("card")}
                            >
                              <CreditCard className="h-8 w-8 mb-2" />
                              <span>{t("payment.card")}</span>
                            </Button>
                            <Button
                              variant={
                                paymentMethod === "bank" ? "default" : "outline"
                              }
                              className="flex flex-col items-center justify-center h-24 p-4"
                              onClick={() => setPaymentMethod("bank")}
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
                                className="h-8 w-8 mb-2"
                              >
                                <rect
                                  width="20"
                                  height="14"
                                  x="2"
                                  y="5"
                                  rx="2"
                                />
                                <line x1="2" x2="22" y1="10" y2="10" />
                              </svg>
                              <span>{t("payment.bank")}</span>
                            </Button>
                            <Button
                              variant={
                                paymentMethod === "cash" ? "default" : "outline"
                              }
                              className="flex flex-col items-center justify-center h-24 p-4"
                              onClick={() => setPaymentMethod("cash")}
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
                                className="h-8 w-8 mb-2"
                              >
                                <rect
                                  width="18"
                                  height="12"
                                  x="3"
                                  y="6"
                                  rx="2"
                                />
                                <circle cx="12" cy="12" r="2" />
                              </svg>
                              <span>{t("payment.cash")}</span>
                            </Button>
                          </div>

                          {paymentMethod === "bank" && (
                            <div className="mt-4">
                              <h4 className="text-sm font-medium mb-2">
                                {t("payment.selectBank")}
                              </h4>
                              <div className="grid grid-cols-3 gap-2">
                                <Button
                                  variant={
                                    bankOption === "BCA" ? "default" : "outline"
                                  }
                                  size="sm"
                                  onClick={() => setBankOption("BCA")}
                                >
                                  BCA
                                </Button>
                                <Button
                                  variant={
                                    bankOption === "Mandiri"
                                      ? "default"
                                      : "outline"
                                  }
                                  size="sm"
                                  onClick={() => setBankOption("Mandiri")}
                                >
                                  Mandiri
                                </Button>
                                <Button
                                  variant={
                                    bankOption === "BRI" ? "default" : "outline"
                                  }
                                  size="sm"
                                  onClick={() => setBankOption("BRI")}
                                >
                                  BRI
                                </Button>
                              </div>
                            </div>
                          )}

                          {paymentMethod === "card" && (
                            <div className="mt-4">
                              <h4 className="text-sm font-medium mb-2">
                                {t("payment.selectCardType")}
                              </h4>
                              <div className="grid grid-cols-2 gap-2">
                                <Button
                                  variant={
                                    cardType === "Visa" ? "default" : "outline"
                                  }
                                  size="sm"
                                  onClick={() => setCardType("Visa")}
                                >
                                  Visa
                                </Button>
                                <Button
                                  variant={
                                    cardType === "Mastercard"
                                      ? "default"
                                      : "outline"
                                  }
                                  size="sm"
                                  onClick={() => setCardType("Mastercard")}
                                >
                                  Mastercard
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="space-y-4">
                          <h3 className="font-medium">
                            {t("payment.options")}
                          </h3>
                          <div className="flex items-center space-x-2">
                            <input
                              type="radio"
                              id="full-payment"
                              name="payment-option"
                              className="h-4 w-4"
                              checked={paymentType === "full"}
                              onChange={() => setPaymentType("full")}
                            />
                            <label htmlFor="full-payment">
                              {t("payment.fullPayment")}
                            </label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="radio"
                              id="partial-payment"
                              name="payment-option"
                              className="h-4 w-4"
                              checked={paymentType === "partial"}
                              onChange={() => setPaymentType("partial")}
                            />
                            <label htmlFor="partial-payment">
                              {t("payment.partialPayment")}
                            </label>
                          </div>

                          {paymentType === "partial" && (
                            <div className="mt-4 space-y-4">
                              <div>
                                <label
                                  htmlFor="payment-amount"
                                  className="block text-sm font-medium mb-1"
                                >
                                  {t("payment.paymentAmount")}
                                </label>
                                <Input
                                  id="payment-amount"
                                  type="number"
                                  value={partialAmount}
                                  onChange={(e) =>
                                    setPartialAmount(Number(e.target.value))
                                  }
                                  placeholder="Enter payment amount"
                                  className="max-w-xs"
                                />
                              </div>

                              <div className="p-3 bg-muted rounded-md">
                                <div className="flex justify-between text-sm">
                                  <span>{t("payment.totalAmount")}</span>
                                  <span>Rp {totalAmount.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span>{t("payment.paymentAmount")}</span>
                                  <span>
                                    Rp {partialAmount.toLocaleString()}
                                  </span>
                                </div>
                                <div className="flex justify-between text-sm font-medium mt-1 pt-1 border-t border-border">
                                  <span>{t("payment.remainingBalance")}</span>
                                  <span>
                                    Rp{" "}
                                    {(
                                      totalAmount - partialAmount
                                    ).toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex justify-between pt-4">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setActiveTab("inspection");
                            }}
                          >
                            {t("payment.backToInspection")}
                          </Button>
                          <Button onClick={handlePaymentComplete}>
                            {t("payment.completePayment")}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </section>

      {/* Features Section */}
      <section className="py-12 bg-muted">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            {t("whyChoose.title")}
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="bg-primary/10 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <Car className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">
                    {t("whyChoose.premiumVehicles")}
                  </h3>
                  <p className="text-muted-foreground">
                    {t("whyChoose.premiumVehiclesDesc")}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="bg-primary/10 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <Calendar className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">
                    {t("whyChoose.flexibleBooking")}
                  </h3>
                  <p className="text-muted-foreground">
                    {t("whyChoose.flexibleBookingDesc")}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="bg-primary/10 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <CreditCard className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">
                    {t("whyChoose.securePayments")}
                  </h3>
                  <p className="text-muted-foreground">
                    {t("whyChoose.securePaymentsDesc")}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background border-t border-border py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <Car className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">
                {t("brand", "CarRental")}
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} {t("brand", "Car Rental Service")}.{" "}
              {t("footer.allRightsReserved")}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
