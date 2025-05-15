import { Label } from "@/components/ui/label";
import React, { useState, useEffect } from "react";
import TimePicker from "react-time-picker";
import PaymentMethods from "@/components/PaymentMethods";
import AddressSearch from "@/components/AddressSearch";
import MapPicker from "@/components/MapPicker";
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
import { createClient } from "@supabase/supabase-js";
import Select from "react-select";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);

const handleSwapLocation = () => {
  console.log("🔁 Swapping pickup & dropoff...");

  // 1. Swap koordinat
  const tempLoc = fromLocation;
  setFromLocation(toLocation);
  setToLocation(tempLoc);

  // 2. Swap label
  const tempTerminal = fromTerminalName;
  const tempAddress = toAddress;

  const isAddressValidTerminal = terminals.some((t) => t.name === tempAddress);

  // 3. Atur label dengan aman
  setFromTerminalName(isAddressValidTerminal ? tempAddress : "");
  setToAddress(tempTerminal); // walaupun ini nama terminal, AddressSearch bisa menampilkannya
};

export default function AirportTransferPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [fromLocation, setFromLocation] = React.useState<[number, number]>([
    -6.2, 106.8,
  ]); // Jakarta
  const [toLocation, setToLocation] = React.useState<[number, number]>([
    -6.2, 106.8,
  ]);
  const [showFromMap, setShowFromMap] = React.useState(false);
  const [showToMap, setShowToMap] = React.useState(false);

  function calculateDistance(
    from: [number, number],
    to: [number, number],
  ): number {
    const R = 6371; // Radius bumi dalam kilometer
    const lat1 = from[0] * (Math.PI / 180);
    const lon1 = from[1] * (Math.PI / 180);
    const lat2 = to[0] * (Math.PI / 180);
    const lon2 = to[1] * (Math.PI / 180);

    const dLat = lat2 - lat1;
    const dLon = lon2 - lon1;

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance;
  }

  function calculatePrice(distanceKm: number, vehicleType: string): number {
    const baseDistance = 10;
    const basePrice = 100000;
    const additionalRate = 4000;
    const surcharge = 30000;
    const parking = 10000;

    const electricFee = vehicleType === "Electric" ? 30000 : 0;
    const premiumFee = vehicleType === "MPV Premium" ? 50000 : 0;

    let total = basePrice;

    if (distanceKm > baseDistance) {
      const additionalDistance = Math.ceil(distanceKm - baseDistance);
      total += additionalDistance * additionalRate;
    }

    return total + surcharge + parking + electricFee + premiumFee;
  }

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

  const [fromTerminalName, setFromTerminalName] = useState(""); // untuk pickup (dropdown)
  const [toAddress, setToAddress] = useState(""); // untuk dropoff (input alamat)

  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [pickupDate, setPickupDate] = useState("");
  const [pickupTime, setPickupTime] = useState("10:00"); // default waktu
  const [passenger, setPassenger] = useState<number>(1);
  const [airportLocation, setAirportLocation] = useState("");
  const [previewDistance, setPreviewDistance] = useState<number | null>(null);
  const [previewPrice, setPreviewPrice] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const distance = await getRouteDistanceViaOSRM(fromLocation, toLocation);
      setPreviewDistance(distance);
      setPreviewPrice(calculatePrice(distance, vehicleType));
    })();
  }, [fromLocation, toLocation, vehicleType]);

  function generateBookingCode() {
    return `AT-${Math.floor(100000 + Math.random() * 900000)}`;
  }

  async function handleSubmit() {
    const distance = await getRouteDistanceViaOSRM(fromLocation, toLocation);
    const price = calculatePrice(distance);

    const payload = {
      airport_location: airportLocation,
      customer_name: fullName,
      phone: phoneNumber,
      pickup_location: fromTerminalName,
      dropoff_location: toAddress,
      pickup_date: pickupDate,
      pickup_time: pickupTime,
      type: vehicleType,
      price,
      model: null,
      vehicle_name: null,
      booking_code: generateBookingCode(),
      customer_id: null, // nanti bisa diisi dari Supabase Auth jika login
      passenger: passenger,
    };

    const { data, error } = await supabase
      .from("airport_transfer")
      .insert([payload]);

    if (error) {
      alert("Gagal menyimpan booking: " + error.message);
      console.error("Insert error:", error);
    } else {
      alert("Booking berhasil!");
      console.log("Insert success:", data);
      navigate("/success");
    }
  }

  function generateBookingCode() {
    return `AT-${Math.floor(100000 + Math.random() * 900000)}`;
  }

  async function handlePreview(event: React.MouseEvent) {
    event.preventDefault(); // ⬅️ ini sangat penting

    if (
      !airportLocation ||
      !pickupDate ||
      !pickupTime ||
      !vehicleType ||
      !fullName ||
      !phoneNumber ||
      !fromTerminalName ||
      !toAddress
    ) {
      alert("Please complete all required fields.");
      return;
    }

    const distance = await getRouteDistanceViaOSRM(fromLocation, toLocation);
    const price = calculatePrice(distance, vehicleType);

    const previewData = {
      airport_location: airportLocation,
      customer_name: fullName,
      phone: phoneNumber,
      pickup_location: fromTerminalName,
      dropoff_location: toAddress,
      pickup_date: pickupDate,
      pickup_time: pickupTime,
      type: vehicleType,
      passenger,
      price,
      model: null,
      vehicle_name: null,
      booking_code: generateBookingCode(),
      customer_id: null,
    };

    const previewCode = `preview-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 6)}`;

    const { error, data } = await supabase
      .from("airport_transfer_preview")
      .insert([{ preview_code: previewCode, data: previewData }]);

    if (error) {
      alert("Gagal membuat preview: " + error.message);
      return;
    }

    navigate(`/airport-preview/${previewCode}`); // ✅ Routing React
  }

  async function getRouteDistanceViaOSRM(
    from: [number, number],
    to: [number, number],
  ): Promise<number> {
    const [fromLat, fromLng] = from;
    const [toLat, toLng] = to;

    try {
      const res = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=false`,
      );
      const data = await res.json();

      if (data.routes && data.routes.length > 0) {
        const distanceMeters = data.routes[0].distance;
        return distanceMeters / 1000; // convert to km
      } else {
        console.warn("No route found from OSRM");
        return 0;
      }
    } catch (err) {
      console.error("Error calling OSRM:", err);
      return 0;
    }
  }

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
      <div className="mx-auto w-full max-w-5xl px-4 pb-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4">
            {t(
              "airportTransfer.bookingTitle",
              "Book your airport taxi transfer. Worldwide.",
            )}
          </h2>

          <div className="mb-4">
            {/* Flex Horizontal */}
            <div className="flex flex-col md:flex-row gap-3">
              {/* From Terminal */}
              <div className="flex flex-col w-full md:w-1/4">
                <label
                  htmlFor="airportLocation"
                  className="text-sm font-medium mb-1"
                >
                  Airport Location
                </label>
                <select
                  className="w-full border rounded-md p-2"
                  value={airportLocation}
                  onChange={(e) => setAirportLocation(e.target.value)}
                >
                  <option value="">Select Airport</option>
                  <option value="Soekarno-Hatta">Soekarno-Hatta</option>
                  <option value="Halim Perdanakusuma">
                    Halim Perdanakusuma
                  </option>
                  <option value="Ngurah Rai">Ngurah Rai</option>
                  <option value="Juanda">Juanda</option>
                </select>
              </div>

              <div className="flex flex-col w-full md:w-1/3">
                <label className="text-sm font-medium mb-2">
                  Pickup Location
                </label>
                <Select
                  value={
                    fromTerminalName
                      ? { label: fromTerminalName, value: fromTerminalName }
                      : null
                  }
                  options={terminals.map((t) => ({
                    label: t.name,
                    value: t.name,
                  }))}
                  onChange={(selected) => {
                    const selectedTerminal = terminals.find(
                      (t) => t.name === selected?.value,
                    );
                    if (selectedTerminal) {
                      setFromTerminalName(selectedTerminal.name);
                      setFromLocation(selectedTerminal.position);
                    } else if (selected === null) {
                      setFromTerminalName("");
                      setFromLocation([0, 0]); // opsional: reset koordinat
                    }
                  }}
                  isClearable
                  placeholder="Terminal or address"
                  className="react-select-container"
                  classNamePrefix="react-select"
                />
              </div>

              {/* To Location */}
              <div className="flex flex-col w-full md:w-1/3">
                <label className="text-sm font-medium mb-1">
                  Dropoff Location
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-grow">
                    <AddressSearch
                      label=""
                      value={toAddress}
                      onChange={(value) => {
                        console.log("🏁 Selected Address:", value);
                        setToAddress(value);
                      }}
                      onSelectPosition={(pos) => {
                        console.log("📍 Dropoff Coordinates:", pos);
                        setToLocation(pos);
                      }}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      console.log("🔁 Swapping locations...");

                      // Swap koordinat
                      const tempLoc = fromLocation;
                      setFromLocation(toLocation);
                      setToLocation(tempLoc);

                      // Swap label
                      const tempTerminal = fromTerminalName;
                      const tempAddress = toAddress;

                      // Validasi: apakah alamat tujuan adalah terminal valid?
                      const isValidTerminal = terminals.some(
                        (t) => t.name === tempAddress,
                      );

                      // Jika alamat valid sebagai terminal, set ke dropdown
                      setFromTerminalName(tempAddress);

                      // Jika yang sebelumnya terminal valid, tampilkan di dropoff
                      setToAddress(tempTerminal);
                    }}
                    title="Swap pickup & dropoff"
                  >
                    <ArrowRightLeft className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Map */}
            <div className="mt-2">
              <MapPicker fromLocation={fromLocation} toLocation={toLocation} />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-5 mb-5">
            {/* Pick Date */}
            <div className="flex flex-col">
              <label htmlFor="pickDate" className="text-sm font-medium mb-1">
                Pickup Date
              </label>
              <input
                id="pickDate"
                type="text"
                placeholder="Select date"
                className="w-full border rounded-md p-2 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                ref={(input) => {
                  if (input) {
                    window.flatpickr(input, {
                      dateFormat: "Y-m-d",
                      onChange: (selectedDates, dateStr) => {
                        setPickupDate(dateStr);
                      },
                    });
                  }
                }}
              />
            </div>

            {/* Pick Time */}
            <div className="flex flex-col">
              <label htmlFor="pickTime" className="text-sm font-medium mb-1">
                Pickup Time
              </label>
              <input
                id="pickTime"
                type="time"
                className="w-full border rounded-md p-2 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                value={pickupTime || ""}
                onChange={(e) => setPickupTime(e.target.value)}
                required
              />
            </div>

            {/* Passenger */}
            <div className="flex flex-col">
              <label htmlFor="passenger" className="text-sm font-medium mb-1">
                Passenger
              </label>
              <input
                id="passenger"
                type="number"
                min="1"
                placeholder="1"
                value={passenger}
                onChange={(e) => setPassenger(parseInt(e.target.value))}
                className="w-full border rounded-md p-2 px-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
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

            <div className="flex flex-col w-full md:w-2/2">
              <label htmlFor="vehicleType" className="text-sm font-medium mb-1">
                Vehicle Type
              </label>
              <select
                id="vehicleType"
                className="w-full border rounded-md p-2"
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
              >
                <option value="">Select Type</option>
                <option value="MPV">MPV</option>
                <option value="Electric">Electric (EV)</option>
                <option value="MPV Premium">MPV Premium</option>
              </select>
            </div>

            {/* Nama Lengkap */}
            <div className="flex flex-col w-full md:w-4/4">
              <label htmlFor="fullName" className="text-sm font-medium mb-1">
                Full Name
              </label>
              <Input
                id="fullName"
                type="text"
                placeholder="Nama Lengkap"
                className="pl-3"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            {/* Nomor Telepon */}
            <div className="flex flex-col w-full md:w-2/2">
              <label htmlFor="phoneNumber" className="text-sm font-medium mb-1">
                Phone
              </label>
              <Input
                id="phoneNumber"
                type="tel"
                placeholder="Nomor Telepon"
                className="pl-3"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>

            {/* Booking Summary - Positioned to the left and wider */}
            {fromLocation && toLocation && (
              <div className="col-span-4 p-4 mt-4 bg-white rounded-lg shadow-lg max-w-md">
                <h2 className="text-lg font-bold mb-4">Booking Summary</h2>
                <p>
                  <strong>From:</strong> {fromTerminalName || "-"}
                </p>
                <p>
                  <strong>To Address:</strong> {toAddress || "-"}
                </p>

                <div className="mt-2">
                  {previewDistance !== null && previewPrice !== null ? (
                    <>
                      <p>
                        <strong>Distance:</strong> {previewDistance.toFixed(2)}{" "}
                        km
                      </p>
                      <p>
                        <strong>Surcharge:</strong> Rp 30.000
                      </p>
                      <p>
                        <strong>Parking:</strong> Rp 10.000
                      </p>
                      <p>
                        <strong>Estimated Price:</strong> Rp{" "}
                        {previewPrice.toLocaleString("id-ID")}
                      </p>
                    </>
                  ) : (
                    <p>Calculating distance...</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <Button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6"
            onClick={handlePreview}
          >
            {t("airportTransfer.bookNow", "Book Now")}
          </Button>
        </div>
      </div>

      {/* Payment methods */}
      <div className="bg-gray-100 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            <img
              src="https://travelintrips.co.id/wp-content/uploads/2025/05/visa-1.jpg"
              alt="Visa"
              className="h-8"
            />
            <img
              src="https://travelintrips.co.id/wp-content/uploads/2025/05/paypal.png"
              alt="PayPal"
              className="h-8"
            />
            <img
              src="https://travelintrips.co.id/wp-content/uploads/2025/05/MasterCard_Logo.svg.png"
              alt="Mastercard"
              className="h-8"
            />
            <img
              src="https://travelintrips.co.id/wp-content/uploads/2025/05/Mandiri.png"
              alt="Mandiri"
              className="h-8"
            />
            <img
              src="https://travelintrips.co.id/wp-content/uploads/2023/10/permata-bank3459.jpg"
              alt="Permata"
              className="h-8"
            />
            <img
              src="https://travelintrips.co.id/wp-content/uploads/2023/10/bca-1.png"
              alt="BCA"
              className="h-8"
            />
            <img
              src="https://travelintrips.co.id/wp-content/uploads/2023/10/maybank.png"
              alt="MayBank"
              className="h-8"
            />
            <img
              src="https://travelintrips.co.id/wp-content/uploads/2023/10/danamon.png"
              alt="Danamon"
              className="h-8"
            />
            <img
              src="https://travelintrips.co.id/wp-content/uploads/2023/10/cimb-niaga.png"
              alt="CIMB"
              className="h-8"
            />
            <img
              src="https://travelintrips.co.id/wp-content/uploads/2023/10/bni.png"
              alt="BNI"
              className="h-8"
            />
            <img
              src="https://travelintrips.co.id/wp-content/uploads/2023/10/bri.png"
              alt="BRI"
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
