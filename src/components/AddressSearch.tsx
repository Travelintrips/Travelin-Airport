import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { loadGoogleMapsScript } from "@/utils/loadGoogleMapsScript";

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
  const [googleReady, setGoogleReady] = useState(false);

  const FUNCTION_URL =
    "https://wvqlwgmlijtcutvseyey.supabase.co/functions/v1/google-autocomplete";

  // ⏳ Load Google Maps Script once with API key from Supabase or environment variable
  useEffect(() => {
    const loadGoogle = async () => {
      // Try to get API key from environment variable first
      const envApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

      if (envApiKey) {
        try {
          await loadGoogleMapsScript(envApiKey);
          setGoogleReady(true);
          console.log("✅ Google Maps siap digunakan (dari env)");
          return;
        } catch (err) {
          console.error("❌ Gagal memuat Google Maps API dari env:", err);
          // Continue to try from Supabase if env key fails
        }
      }

      // Fallback to Supabase if env variable not available or failed
      try {
        const { data, error } = await supabase
          .from("api_settings")
          .select("google_maps_key")
          .eq("id", 1)
          .single();

        if (error || !data?.google_maps_key) {
          console.error("❌ Gagal ambil API key dari Supabase", error);
          return;
        }

        await loadGoogleMapsScript(data.google_maps_key);
        setGoogleReady(true);
        console.log("✅ Google Maps siap digunakan (dari Supabase)");
      } catch (err) {
        console.error("❌ Gagal memuat Google Maps API dari Supabase:", err);
      }
    };

    loadGoogle();
  }, []);

  const searchAddress = async (search: string) => {
    if (search.length < 3) {
      setResults([]);
      return;
    }

    if (search === value) {
      setResults([]);
      return;
    }

    try {
      // Add a timeout to prevent too many requests
      const response = await fetch(FUNCTION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Add cache control to prevent excessive requests
          "Cache-Control": "max-age=300",
        },
        body: JSON.stringify({ input: search }),
      });

      if (!response.ok) {
        console.error("Network response was not ok:", response.status);
        return;
      }

      const data = await response.json();
      if (data.status !== "OK") {
        console.error(
          "Google API Error:",
          data.status,
          data.error_message || "",
        );
        return;
      }

      setResults(data.predictions || []);
    } catch (error) {
      console.error("Autocomplete failed:", error);
    }
  };

  const getLatLngFromPlaceId = (placeId: string): Promise<[number, number]> => {
    return new Promise((resolve, reject) => {
      // Validate that Google Maps API is ready
      if (typeof window.google === "undefined" || !window.google.maps?.places) {
        return reject("Google Maps API belum siap");
      }

      try {
        // Create a div element for the PlacesService
        const placesDiv = document.createElement("div");
        const service = new window.google.maps.places.PlacesService(placesDiv);

        // Make the request with proper fields parameter
        service.getDetails(
          {
            placeId: placeId,
            fields: ["geometry"], // Only request the geometry field to minimize data
          },
          (result, status) => {
            if (
              status === window.google.maps.places.PlacesServiceStatus.OK &&
              result
            ) {
              const lat = result.geometry?.location?.lat();
              const lng = result.geometry?.location?.lng();

              if (lat && lng) {
                resolve([lat, lng]);
              } else {
                reject("Missing lat/lng in place details");
              }
            } else {
              console.error("PlacesService error:", status);
              reject("Failed to get place details: " + status);
            }
          },
        );
      } catch (error) {
        console.error("Error in getLatLngFromPlaceId:", error);
        reject("Error creating PlacesService: " + error);
      }
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
          className="bg-white shadow rounded-md mt-2 max-h-60 overflow-y-auto absolute w-full left-0 right-0"
          style={{ zIndex: 9999, top: "100%" }}
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

                  // Only fetch coordinates if Google Maps is ready
                  if (googleReady) {
                    try {
                      const [lat, lng] = await getLatLngFromPlaceId(
                        place.place_id,
                      );
                      onSelectPosition([lat, lng]);
                    } catch (err) {
                      console.error(
                        "❌ Gagal ambil lat/lng dari place_id:",
                        err,
                      );
                    }
                  } else {
                    console.warn(
                      "Google Maps belum siap, tidak bisa ambil koordinat",
                    );
                  }
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
