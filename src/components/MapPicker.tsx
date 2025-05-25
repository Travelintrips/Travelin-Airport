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
  const mapInstanceRef = useRef<any>(null);
  const routeLayerRef = useRef<any>(null);
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    // Load Leaflet and Leaflet Routing Machine if not already loaded
    const loadDependencies = async () => {
      if (!(window as any).L) {
        // Load Leaflet first
        const leafletScript = document.createElement("script");
        leafletScript.src = "https://unpkg.com/leaflet@1.9.3/dist/leaflet.js";
        leafletScript.async = true;
        document.body.appendChild(leafletScript);

        const leafletLink = document.createElement("link");
        leafletLink.rel = "stylesheet";
        leafletLink.href = "https://unpkg.com/leaflet@1.9.3/dist/leaflet.css";
        document.head.appendChild(leafletLink);

        // Wait for Leaflet to load
        await new Promise<void>((resolve) => {
          leafletScript.onload = () => resolve();
        });

        // Then load Leaflet Routing Machine
        const routingScript = document.createElement("script");
        routingScript.src =
          "https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.js";
        routingScript.async = true;
        document.body.appendChild(routingScript);

        const routingLink = document.createElement("link");
        routingLink.rel = "stylesheet";
        routingLink.href =
          "https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.css";
        document.head.appendChild(routingLink);

        // Wait for Routing Machine to load
        await new Promise<void>((resolve) => {
          routingScript.onload = () => resolve();
        });
      }

      initMap();
    };

    loadDependencies();

    // Cleanup function to remove map when component unmounts
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update map when locations change
  useEffect(() => {
    if (mapInstanceRef.current && (window as any).L) {
      updateRoute();
    }
  }, [fromLocation, toLocation]);

  const initMap = () => {
    if (!mapRef.current || !(window as any).L) return;

    // Clear previous map instance
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
    }

    const L = (window as any).L;
    const map = L.map(mapRef.current).setView(
      [
        (fromLocation[0] + toLocation[0]) / 2,
        (fromLocation[1] + toLocation[1]) / 2,
      ],
      12,
    );

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    mapInstanceRef.current = map;
    updateRoute();
  };

  const updateRoute = async () => {
    if (!mapInstanceRef.current || !(window as any).L) return;

    const L = (window as any).L;
    const map = mapInstanceRef.current;

    const isValidFrom = fromLocation[0] !== 0 && fromLocation[1] !== 0;
    const isValidTo = toLocation[0] !== 0 && toLocation[1] !== 0;
    if (!isValidFrom || !isValidTo) return;

    // Hapus route lama
    if (routeLayerRef.current) {
      map.removeLayer(routeLayerRef.current);
    }

    // Hapus marker lama
    markersRef.current?.forEach((marker) => map.removeLayer(marker));
    markersRef.current = [];

    const createCustomIcon = (color: string) =>
      L.divIcon({
        className: "custom-div-icon",
        html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.3);"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

    const fromStr = `${fromLocation[1]},${fromLocation[0]}`;
    const toStr = `${toLocation[1]},${toLocation[0]}`;

    try {
      const res = await fetch(`/api/route?from=${fromStr}&to=${toStr}`);
      const data = await res.json();

      if (!data.routes?.[0]?.geometry?.coordinates) {
        throw new Error("Invalid route format");
      }

      const coords = data.routes[0].geometry.coordinates.map(
        ([lng, lat]: [number, number]) => [lat, lng],
      );

      const polyline = L.polyline(coords, {
        color: "#0066FF",
        opacity: 0.8,
        weight: 6,
      }).addTo(map);
      routeLayerRef.current = polyline;

      // Marker
      const fromMarker = L.marker(fromLocation, {
        icon: createCustomIcon("#4CAF50"),
      }).addTo(map);
      const toMarker = L.marker(toLocation, {
        icon: createCustomIcon("#F44336"),
      }).addTo(map);

      markersRef.current.push(fromMarker, toMarker);

      map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
    } catch (error) {
      console.error("❌ Failed to fetch route:", error);

      // Fallback garis lurus
      const polyline = L.polyline([fromLocation, toLocation], {
        color: "blue",
        weight: 5,
        opacity: 0.7,
      }).addTo(map);
      routeLayerRef.current = polyline;

      const fromMarker = L.marker(fromLocation, {
        icon: createCustomIcon("#4CAF50"),
      }).addTo(map);
      const toMarker = L.marker(toLocation, {
        icon: createCustomIcon("#F44336"),
      }).addTo(map);
      markersRef.current.push(fromMarker, toMarker);

      map.fitBounds(L.latLngBounds(fromLocation, toLocation), {
        padding: [50, 50],
      });
    }
  };

  return (
    <div ref={mapRef} className="w-full h-[300px] rounded-md overflow-hidden" />
  );
}
