import React, { useState } from "react";

interface AddressSearchProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSelectPosition: (position: [number, number]) => void;
}

export default function AddressSearch({
  label,
  value,
  onChange,
  onSelectPosition,
}: AddressSearchProps) {
  const [results, setResults] = useState<any[]>([]);

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

  const fetchPlaceDetails = async (placeId: string) => {
    if (!placeId) return;

    try {
      const response = await fetch(
        "https://wvqlwgmlijtcutvseyey.functions.supabase.co/google-place-details",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ place_id: placeId }),
        },
      );

      const data = await response.json();

      if (data.status !== "OK") {
        console.error("Place Details Error:", data.status);
        return;
      }

      const location = data.result.geometry.location;
      onSelectPosition([location.lat, location.lng]);
      onChange(data.result.formatted_address);
      setResults([]);
    } catch (error) {
      console.error("Fetch place details failed:", error);
    }
  };

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium mb-1">{label}</label>
      <input
        type="text"
        className="w-full border rounded-md p-2"
        placeholder="Search address..."
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          searchAddress(e.target.value);
        }}
      />
      {results.length > 0 && (
        <div className="bg-white shadow rounded-md mt-2 max-h-40 overflow-y-auto z-50">
          {results.map((place, index) => (
            <div
              key={index}
              className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
              onClick={() => fetchPlaceDetails(place.place_id)}
            >
              <div className="font-medium">
                {place.structured_formatting?.main_text || place.description}
              </div>
              <div className="text-xs text-gray-500">
                {place.structured_formatting?.secondary_text}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
