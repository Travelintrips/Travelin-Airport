import React, { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { loadGoogleMapsScript } from "@/utils/loadGoogleMapsScript";

type MapMode = "osm" | "google" | "static";

interface SmartMapPickerProps {
  pickup: [number, number];
  dropoff: [number, number];
  forceMode?: MapMode;
}

export default function SmartMapPicker({
  pickup,
  dropoff,
  forceMode,
}: SmartMapPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  const [mapMode, setMapMode] = useState<MapMode>("osm");
  const [apiKey, setApiKey] = useState<string | null>(null);

  // Ambil Google Maps API key dari Supabase
  useEffect(() => {
    const fetchKey = async () => {
      const { data, error } = await supabase
        .from("api_settings")
        .select("google_maps_key")
        .eq("id", 1)
        .single();

      if (error) {
        console.error("Failed to load Google Maps key", error);
      } else {
        setApiKey(data.google_maps_key);
      }
    };

    fetchKey();
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data, error } = await supabase
        .from("api_settings")
        .select("google_maps_key")
        .eq("id", 1)
        .single();

      if (error || !data?.google_maps_key) {
        console.error("❌ Gagal ambil API key dari Supabase", error);
        return;
      }

      try {
        await loadGoogleMapsScript(data.google_maps_key);
        console.log("🎉 Google Maps siap digunakan");
      } catch (e) {
        console.error("❌ Gagal memuat Google Maps", e);
      }
    };

    init();
  }, []);

  // Mode peta
  useEffect(() => {
    if (forceMode) {
      setMapMode(forceMode);
    } else if (navigator.connection?.saveData) {
      setMapMode("static");
    } else {
      setMapMode("osm");
    }
  }, [forceMode]);

  // Load peta setelah posisi valid dan API key ada
  useEffect(() => {
    if (
      !pickup ||
      !dropoff ||
      pickup[0] === 0 ||
      dropoff[0] === 0 ||
      !mapRef.current
    )
      return;

    if (mapMode === "osm") {
      loadLeaflet();
    } else if (mapMode === "google") {
      loadGoogleMap();
    }
  }, [mapMode, pickup, dropoff]);

  const loadLeaflet = () => {
    const L = (window as any).L;

    if (!L) {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.3/dist/leaflet.js";
      script.async = true;
      script.onload = () => initLeafletMap();
      document.body.appendChild(script);

      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.3/dist/leaflet.css";
      document.head.appendChild(link);
    } else {
      initLeafletMap();
    }
  };

  const initLeafletMap = () => {
    const L = (window as any).L;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
    }

    const centerLat = (pickup[0] + dropoff[0]) / 2;
    const centerLng = (pickup[1] + dropoff[1]) / 2;

    const map = L.map(mapRef.current).setView([centerLat, centerLng], 13);
    mapInstanceRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    // Marker Pickup (Hijau)
    L.marker(pickup, {
      icon: L.divIcon({
        className: "pickup-marker",
        html: `<div style="background-color: #4CAF50; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white;"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      }),
    }).addTo(map);

    // Marker Dropoff (Merah)
    L.marker(dropoff, {
      icon: L.divIcon({
        className: "dropoff-marker",
        html: `<div style="background-color: #F44336; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white;"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      }),
    }).addTo(map);
  };

  const loadGoogleMap = () => {
    if (document.getElementById("google-maps-script")) {
      initGoogleMap();
      return;
    }

    const script = document.createElement("script");
    script.id = "google-maps-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;

    script.async = true;
    script.defer = true;
    script.onload = () => initGoogleMap();
    document.body.appendChild(script);
  };

  const initGoogleMap = () => {
    const map = new (window as any).google.maps.Map(mapRef.current, {
      center: {
        lat: (pickup[0] + dropoff[0]) / 2,
        lng: (pickup[1] + dropoff[1]) / 2,
      },
      zoom: 13,
    });

    new (window as any).google.maps.Marker({
      position: { lat: pickup[0], lng: pickup[1] },
      map,
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: "#4CAF50",
        fillOpacity: 1,
        strokeWeight: 2,
        strokeColor: "#ffffff",
      },
    });

    new (window as any).google.maps.Marker({
      position: { lat: dropoff[0], lng: dropoff[1] },
      map,
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: "#F44336",
        fillOpacity: 1,
        strokeWeight: 2,
        strokeColor: "#ffffff",
      },
    });
  };

  if (!apiKey) return <div>Loading map...</div>;

  if (mapMode === "static") {
    return (
      <img
        src={`https://maps.googleapis.com/maps/api/staticmap?size=600x300&markers=color:green%7C${pickup[0]},${pickup[1]}&markers=color:red%7C${dropoff[0]},${dropoff[1]}&key=${apiKey}`}
        alt="Map preview"
        className="rounded-md border w-full h-[300px] object-cover"
      />
    );
  }

  return (
    <div
      ref={mapRef}
      className="w-full h-[300px] rounded-md overflow-hidden border"
    />
  );
}
