import React, { useState } from "react";
import { Input } from "@/components/ui/input";

interface AddressSearchProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSelectPosition: (position: [number, number]) => void;
  onFocus?: () => void;
  onClick?: () => void;
  placeholder?: string;
}

export default function AddressSearch({
  label,
  value,
  onChange,
  onSelectPosition,
  onFocus,
  onClick,
  placeholder = "Search address...",
}: AddressSearchProps) {
  const [results, setResults] = useState<any[]>([]);
  const [query, setQuery] = useState("");

  const FUNCTION_URL =
    "https://wvqlwgmlijtcutvseyey.supabase.co/functions/v1/google-autocomplete";

  const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  const searchAddress = async (search: string) => {
    if (search.length < 3) {
      setResults([]);
      return;
    }

    try {
      const response = await fetch(FUNCTION_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: search }),
      });

      const data = await response.json();
      if (data.status !== "OK") {
        console.error("Google API Error:", data.status);
        return;
      }

      setResults(data.predictions || []);
    } catch (error) {
      console.error("Autocomplete failed:", error);
    }
  };

  const fetchPlaceDetails = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        "https://wvqlwgmlijtcutvseyey.functions.supabase.co/google-place-details",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            location: { lat, lng }, // ✅ Cocok dengan Edge Function
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        console.error("Fetch Place Details failed:", data);
        return;
      }

      if (data.formatted_address) {
        onChange(data.formatted_address);
        onSelectPosition([lat, lng]);
        setResults([]);
      } else {
        console.warn("Formatted address not found:", data);
      }
    } catch (error) {
      console.error("Fetch failed:", error);
    }
  };

  const getLatLngFromPlaceId = (placeId: string): Promise<[number, number]> => {
    return new Promise((resolve, reject) => {
      if (typeof window.google === "undefined" || !window.google.maps?.places) {
        return reject("Google Maps API belum dimuat");
      }

      const service = new window.google.maps.places.PlacesService(
        document.createElement("div"),
      );

      service.getDetails({ placeId }, (result, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK) {
          const lat = result.geometry?.location?.lat();
          const lng = result.geometry?.location?.lng();

          if (lat && lng) {
            resolve([lat, lng]);
          } else {
            reject("Missing lat/lng in place details");
          }
        } else {
          reject("Failed to get place details: " + status);
        }
      });
    });
  };

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium mb-1">{label}</label>
      <Input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setQuery(e.target.value);
          searchAddress(e.target.value);
        }}
        onFocus={onFocus}
        onClick={onClick}
        placeholder={placeholder}
        className="w-full"
      />
      {results.length > 0 && (
        <div className="bg-white shadow rounded-md mt-2 max-h-40 overflow-y-auto z-50 absolute w-full">
          {results.map((place, index) => (
            <div
              key={index}
              className="cursor-pointer px-4 py-2 hover:bg-gray-100"
              onClick={async () => {
                try {
                  const [lat, lng] = await getLatLngFromPlaceId(place.place_id);
                  fetchPlaceDetails(lat, lng);
                } catch (err) {
                  console.error("❌ Gagal ambil lat/lng dari place_id:", err);
                }
              }}
            >
              {place.description}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
