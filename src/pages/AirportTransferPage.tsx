import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Search,
  Calendar,
  Clock,
  Users,
  Repeat,
  ArrowRightLeft,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AirportTransferPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-blue-500 to-blue-700">
      {/* Header with back button */}
      <header className="p-4 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-0">
        <Button
          variant="outline"
          onClick={() => navigate(-1)}
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
      <div className="text-center text-white px-4 py-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">
          {t("airportTransfer.title", "Airport transfers made")}
        </h1>
        <h2 className="text-2xl md:text-3xl font-bold mb-6">
          {t("airportTransfer.subtitle", "surprisingly easy and enjoyable!")}
        </h2>

        {/* Features */}
        <div className="flex flex-wrap justify-center gap-6 mb-8">
          <div className="flex items-center gap-2">
            <div className="bg-pink-500 rounded-full p-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 text-white"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <span>
              {t("airportTransfer.freeCancellation", "Free cancellation")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-pink-500 rounded-full p-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 text-white"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <span>
              {t("airportTransfer.flightTracking", "Flight tracking")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-pink-500 rounded-full p-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 text-white"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <span>{t("airportTransfer.support", "24/7 customer support")}</span>
          </div>
        </div>
      </div>

      {/* Booking form */}
      <div className="mx-auto w-full max-w-4xl px-4 pb-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4">
            {t(
              "airportTransfer.bookingTitle",
              "Book your airport taxi transfer. Worldwide.",
            )}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="relative">
              <Input
                placeholder={t(
                  "airportTransfer.from",
                  "From: Airport, hotel, station, port, address...",
                )}
                className="pl-10"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Input
                  placeholder={t(
                    "airportTransfer.to",
                    "To: Airport, hotel, station, port, address...",
                  )}
                  className="pl-10"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
              <Button variant="ghost" className="p-2">
                <ArrowRightLeft className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="relative">
              <Input type="text" placeholder="24 Apr 2023" className="pl-10" />
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>

            <div className="relative">
              <Input type="text" placeholder="00:00" className="pl-10" />
              <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>

            <div className="relative">
              <Input type="number" placeholder="1" min="1" className="pl-10" />
              <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox id="roundTrip" />
              <label
                htmlFor="roundTrip"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {t("airportTransfer.roundTrip", "Round trip")}
              </label>
            </div>
          </div>

          <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white py-6">
            <Search className="mr-2 h-5 w-5" />
            {t("airportTransfer.search", "Search")}
          </Button>
        </div>
      </div>

      {/* Payment methods */}
      <div className="bg-gray-100 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            <img
              src="https://cdn.transferz.com/website/img/payment/visa.svg"
              alt="Visa"
              className="h-8"
            />
            <img
              src="https://cdn.transferz.com/website/img/payment/paypal.svg"
              alt="PayPal"
              className="h-8"
            />
            <img
              src="https://cdn.transferz.com/website/img/payment/mastercard.svg"
              alt="Mastercard"
              className="h-8"
            />
            <img
              src="https://cdn.transferz.com/website/img/payment/maestro.svg"
              alt="Maestro"
              className="h-8"
            />
            <img
              src="https://cdn.transferz.com/website/img/payment/applepay.svg"
              alt="Apple Pay"
              className="h-8"
            />
            <img
              src="https://cdn.transferz.com/website/img/payment/gpay.svg"
              alt="Google Pay"
              className="h-8"
            />
            <img
              src="https://cdn.transferz.com/website/img/payment/alipay.svg"
              alt="Alipay"
              className="h-8"
            />
            <img
              src="https://cdn.transferz.com/website/img/payment/ideal.svg"
              alt="iDeal"
              className="h-8"
            />
            <img
              src="https://cdn.transferz.com/website/img/payment/discover.svg"
              alt="Discover"
              className="h-8"
            />
            <img
              src="https://cdn.transferz.com/website/img/payment/diners.svg"
              alt="Diners Club"
              className="h-8"
            />
            <img
              src="https://cdn.transferz.com/website/img/payment/amex.svg"
              alt="American Express"
              className="h-8"
            />
            <img
              src="https://cdn.transferz.com/website/img/payment/unionpay.svg"
              alt="Union Pay"
              className="h-8"
            />
          </div>

          {/* Steps section */}
          <div className="text-center mb-12">
            <p className="text-sm uppercase tracking-wider mb-2">
              {t("airportTransfer.arranged", "ARRANGED IN A MINUTE")}
            </p>
            <h2 className="text-2xl font-bold mb-1">
              {t("airportTransfer.bookSteps.title", "Book an airport transfer")}
            </h2>
            <h3 className="text-xl font-bold mb-8">
              {t("airportTransfer.bookSteps.subtitle", "in 3 easy steps")}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="flex flex-col items-center">
                <div className="bg-yellow-50 p-4 rounded-full mb-4">
                  <Calendar className="h-8 w-8 text-yellow-500" />
                </div>
                <h4 className="font-bold mb-2">
                  {t(
                    "airportTransfer.bookSteps.step1.title",
                    "Schedule in advance",
                  )}
                </h4>
                <p className="text-sm">
                  {t(
                    "airportTransfer.bookSteps.step1.description",
                    "Schedule a time and pick up location to bring you to your destination.",
                  )}
                </p>
              </div>

              <div className="flex flex-col items-center">
                <div className="bg-yellow-50 p-4 rounded-full mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-8 w-8 text-yellow-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h4 className="font-bold mb-2">
                  {t(
                    "airportTransfer.bookSteps.step2.title",
                    "Vehicle options",
                  )}
                </h4>
                <p className="text-sm">
                  {t(
                    "airportTransfer.bookSteps.step2.description",
                    "Choose a car type and options to make your trip enjoyable.",
                  )}
                </p>
              </div>

              <div className="flex flex-col items-center">
                <div className="bg-yellow-50 p-4 rounded-full mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-8 w-8 text-yellow-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h4 className="font-bold mb-2">
                  {t("airportTransfer.bookSteps.step3.title", "Pay and relax")}
                </h4>
                <p className="text-sm">
                  {t(
                    "airportTransfer.bookSteps.step3.description",
                    "No hidden costs. Pay via trusted partners. No worries, we have a cancellation policy.",
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
