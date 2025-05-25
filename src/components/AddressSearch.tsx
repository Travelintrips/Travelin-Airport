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

    // Always clear results if the input exactly matches the current value
    if (search === value) {
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
    <div className="mb-4 relative">
      <label className="block text-sm font-medium mb-1">{label}</label>
      <Input
        type="text"
        value={value}
        onChange={(e) => {
          const newValue = e.target.value;
          onChange(newValue);
          setQuery(newValue);

          // Clear results if the field matches the selected value
          if (newValue === value) {
            setResults([]);
            return;
          }

          // Only search if there's text to search for
          if (newValue.trim() !== "") {
            searchAddress(newValue);
          } else {
            setResults([]);
          }
        }}
        onFocus={(e) => {
          if (onFocus) onFocus();

          // Don't show results if the field already has a selected value
          if (e.target.value === value && value.trim() !== "") {
            setResults([]);
            return;
          }

          // Only show results for new searches
          if (e.target.value.trim() !== "") {
            searchAddress(e.target.value);
          }
        }}
        onClick={(e) => {
          // Don't show dropdown when clicking on a field with a selected value
          if (value.trim() !== "") {
            setResults([]);
          }

          if (onClick) onClick();
        }}
        placeholder={placeholder}
        className="w-full"
      />
      {results.length > 0 && (
        <div
          className="bg-white shadow rounded-md mt-2 max-h-60 overflow-y-auto fixed sm:absolute w-full left-0 right-0"
          style={{ zIndex: 9999 }}
        >
          {results.map((place, index) => (
            <div
              key={index}
              className="cursor-pointer px-4 py-3 hover:bg-gray-100 active:bg-gray-200 touch-auto"
              onClick={async () => {
                try {
                  // Immediately update the input field with the selected address
                  onChange(place.description);
                  setQuery(place.description);

                  // Always clear results immediately after selection
                  setResults([]);

                  // Then fetch the coordinates
                  const [lat, lng] = await getLatLngFromPlaceId(place.place_id);
                  onSelectPosition([lat, lng]);
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
