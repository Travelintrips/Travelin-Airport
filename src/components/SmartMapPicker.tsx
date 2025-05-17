import React, { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

type MapMode = "osm" | "google" | "static";

interface SmartMapPickerProps {
  position: [number, number];
  onSelectPosition: (pos: [number, number]) => void;
  forceMode?: MapMode; // Optional override
}

export default function SmartMapPicker({
  position,
  onSelectPosition,
  forceMode,
}: SmartMapPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapMode, setMapMode] = useState<MapMode>("osm");

  const [apiKey, setApiKey] = useState<string | null>(null);

  useEffect(() => {
    const fetchKey = async () => {
      const { data, error } = await supabase
        .from("api_settings")
        .select("google_maps_key")
        .eq("id", 1) // ganti sesuai ID kamu
        .single();

      if (error) {
        console.error("Failed to load Google Maps key", error);
      } else {
        setApiKey(data.google_maps_key);
      }
    };

    fetchKey();
  }, []);

  if (!apiKey) return <div>Loading map...</div>;

  useEffect(() => {
    // AUTO MODE: detect saveData preference
    if (forceMode) {
      setMapMode(forceMode);
    } else if (navigator.connection?.saveData) {
      console.log("Low data mode detected. Using static map.");
      setMapMode("static");
    } else {
      setMapMode("osm");
    }
  }, [forceMode]);

  useEffect(() => {
    if (mapMode === "osm") {
      loadLeaflet();
    } else if (mapMode === "google") {
      loadGoogleMap();
    }
  }, [mapMode, position]);

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
    const map = L.map(mapRef.current).setView(position, 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);
    const marker = L.marker(position).addTo(map);

    map.on("click", (e: any) => {
      const pos = [e.latlng.lat, e.latlng.lng];
      marker.setLatLng(pos);
      onSelectPosition(pos);
    });
  };

  const loadGoogleMap = () => {
    // Cegah duplikasi script
    if (document.getElementById("google-maps-script")) {
      initGoogleMap();
      return;
    }

    const script = document.createElement("script");
    script.id = "google-maps-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
    script.async = true;
    script.defer = true;
    script.onload = () => initGoogleMap();

    document.body.appendChild(script);
  };

  const initGoogleMap = () => {
    const map = new (window as any).google.maps.Map(mapRef.current, {
      center: { lat: position[0], lng: position[1] },
      zoom: 14,
    });

    const marker = new (window as any).google.maps.Marker({
      position: { lat: position[0], lng: position[1] },
      map,
    });

    map.addListener("click", (e: any) => {
      const pos = [e.latLng.lat(), e.latLng.lng()];
      marker.setPosition({ lat: pos[0], lng: pos[1] });
      onSelectPosition(pos);
    });
  };

  if (mapMode === "static") {
    return (
      <img
        src={`https://maps.googleapis.com/maps/api/staticmap?center=${position[0]},${position[1]}&zoom=14&size=600x300&maptype=roadmap&markers=color:red%7C${position[0]},${position[1]}&key=${apiKey}`}
        alt="Static Map"
        className="rounded-md border w-full h-[300px] object-cover"
      />
    );
  }

  return (
    <div
      ref={mapRef}
      className="w-full h-[300px] rounded-md overflow-hidden border"
    ></div>
  );
}
