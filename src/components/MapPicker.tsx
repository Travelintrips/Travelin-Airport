import React, { useEffect, useRef } from "react";

interface MapPickerProps {
  fromLocation: [number, number];
  toLocation: [number, number];
}

export default function MapPicker({
  fromLocation,
  toLocation,
}: MapPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);

  const initializeMap = async () => {
    if (!mapRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    // Hapus peta lama jika ada
    if (leafletMapRef.current) {
      leafletMapRef.current.remove();
      leafletMapRef.current = null;
    }

    // ✅ Inisialisasi peta baru
    const map = L.map(mapRef.current).setView(fromLocation, 13);
    leafletMapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    L.marker(fromLocation).addTo(map).bindPopup("Pickup");
    L.marker(toLocation).addTo(map).bindPopup("Dropoff");

    const url = `https://router.project-osrm.org/route/v1/driving/${fromLocation[1]},${fromLocation[0]};${toLocation[1]},${toLocation[0]}?geometries=geojson`;

    try {
      const res = await fetch(url);
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        const routeCoords = data.routes[0].geometry.coordinates.map(
          (coord: [number, number]) => [coord[1], coord[0]],
        );
        const routeLine = L.polyline(routeCoords, {
          color: "blue",
          weight: 4,
        }).addTo(map);
        map.fitBounds(routeLine.getBounds());
      } else {
        console.warn("No OSRM route found");
      }
    } catch (err) {
      console.error("Failed to fetch route from OSRM:", err);
    }
  };

  useEffect(() => {
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.3/dist/leaflet.css";
      document.head.appendChild(link);
    }

    if (!document.getElementById("leaflet-js")) {
      const script = document.createElement("script");
      script.id = "leaflet-js";
      script.src = "https://unpkg.com/leaflet@1.9.3/dist/leaflet.js";
      script.async = true;
      script.onload = () => initializeMap();
      document.body.appendChild(script);
    } else {
      initializeMap();
    }

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [fromLocation, toLocation]);

  return (
    <div
      className="w-full h-[300px] rounded-md overflow-hidden border"
      ref={mapRef}
    ></div>
  );
}
