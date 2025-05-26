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

  const initializeMap = () => {
    if (!mapRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    // Hapus peta lama jika ada
    if (leafletMapRef.current) {
      try {
        leafletMapRef.current.remove();
      } catch (e) {
        console.warn("Error removing existing map", e);
      }
      leafletMapRef.current = null;
    }

    // Ensure the container has dimensions
    if (mapRef.current.offsetWidth === 0 || mapRef.current.offsetHeight === 0) {
      mapRef.current.style.height = "300px";
      mapRef.current.style.width = "100%";
    }

    try {
      // ✅ Inisialisasi peta baru dengan opsi yang lebih aman
      const map = L.map(mapRef.current, {
        center: fromLocation,
        zoom: 13,
        zoomControl: true,
        fadeAnimation: false,
        markerZoomAnimation: false,
        zoomAnimation: false,
      });

      leafletMapRef.current = map;

      // Force a resize to ensure the map has the correct dimensions
      setTimeout(() => {
        try {
          if (map && typeof map.invalidateSize === "function") {
            map.invalidateSize(true);
          }
        } catch (err) {
          console.warn("Error invalidating map size:", err);
        }
      }, 200);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);

      // Add markers after map is fully initialized
      setTimeout(() => {
        try {
          // Use simple circle markers instead of custom icons to avoid DOM issues
          const pickupMarker = L.circleMarker(fromLocation, {
            radius: 8,
            fillColor: "#4CAF50",
            color: "#ffffff",
            weight: 2,
            opacity: 1,
            fillOpacity: 1,
          }).addTo(map);

          const dropoffMarker = L.circleMarker(toLocation, {
            radius: 8,
            fillColor: "#F44336",
            color: "#ffffff",
            weight: 2,
            opacity: 1,
            fillOpacity: 1,
          }).addTo(map);

          // Fetch route from OSRM to follow roads
          const url = `https://router.project-osrm.org/route/v1/driving/${fromLocation[1]},${fromLocation[0]};${toLocation[1]},${toLocation[0]}?overview=full&geometries=geojson`;

          fetch(url)
            .then((response) => response.json())
            .then((data) => {
              if (data.routes && data.routes.length > 0) {
                // Extract route coordinates and convert [lng, lat] to [lat, lng] for Leaflet
                const routeCoords = data.routes[0].geometry.coordinates.map(
                  (coord: [number, number]) => [coord[1], coord[0]],
                );

                // Draw the route following roads
                const routeLine = L.polyline(routeCoords, {
                  color: "#0066FF",
                  weight: 4,
                  opacity: 0.7,
                  noClip: true,
                  interactive: false,
                }).addTo(map);

                // Fit bounds to the route
                try {
                  const bounds = L.latLngBounds(routeCoords);
                  if (bounds.isValid()) {
                    map.fitBounds(bounds, { padding: [50, 50] });
                  }
                } catch (err) {
                  console.warn("Could not fit to route bounds", err);
                }
              } else {
                // Fallback to direct line if no route found
                console.warn("No route found, using direct line");
                const simpleLine = L.polyline([fromLocation, toLocation], {
                  color: "#0066FF",
                  weight: 4,
                  opacity: 0.7,
                  dashArray: "5, 5", // Dashed line to indicate it's not a real route
                  noClip: true,
                  interactive: false,
                }).addTo(map);
              }
            })
            .catch((err) => {
              console.error("Error fetching route:", err);
              // Fallback to direct line on error
              const simpleLine = L.polyline([fromLocation, toLocation], {
                color: "#0066FF",
                weight: 4,
                opacity: 0.7,
                dashArray: "5, 5", // Dashed line to indicate it's not a real route
                noClip: true,
                interactive: false,
              }).addTo(map);
            });

          // Calculate bounds and fit map to show both markers
          const bounds = L.latLngBounds([fromLocation, toLocation]);
          if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [50, 50] });
          } else {
            // Fallback to center view if bounds are invalid
            const centerLat = (fromLocation[0] + toLocation[0]) / 2;
            const centerLng = (fromLocation[1] + toLocation[1]) / 2;
            map.setView([centerLat, centerLng], 12);
          }
        } catch (err) {
          console.error("Error adding markers or line:", err);
          // Fallback to simple view
          map.setView(fromLocation, 12);
        }
      }, 300);

      // Skip OSRM route fetching to avoid errors
    } catch (err) {
      console.error("Failed to initialize map:", err);
    }
  };

  useEffect(() => {
    // Check if Leaflet is already loaded
    if (typeof window !== "undefined" && (window as any).L) {
      initializeMap();
      return;
    }

    // Load CSS if not already loaded
    if (!document.getElementById("leaflet-css") && document.head) {
      try {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.3/dist/leaflet.css";
        document.head.appendChild(link);
      } catch (err) {
        console.error("Error loading Leaflet CSS:", err);
      }
    }

    // Load JS if not already loaded
    if (!document.getElementById("leaflet-js") && document.body) {
      try {
        const script = document.createElement("script");
        script.id = "leaflet-js";
        script.src = "https://unpkg.com/leaflet@1.9.3/dist/leaflet.js";
        script.async = true;
        script.onload = () => {
          // Wait a bit after script loads to ensure Leaflet is fully initialized
          setTimeout(initializeMap, 100);
        };
        document.body.appendChild(script);
      } catch (err) {
        console.error("Error loading Leaflet JS:", err);
      }
    } else {
      // If script already exists but Leaflet isn't loaded yet
      const checkLeaflet = setInterval(() => {
        if (typeof window !== "undefined" && (window as any).L) {
          clearInterval(checkLeaflet);
          initializeMap();
        }
      }, 100);

      // Clear interval after 5 seconds to prevent infinite checking
      setTimeout(() => clearInterval(checkLeaflet), 5000);
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
      style={{ height: "300px", width: "100%", display: "block" }}
    ></div>
  );
}
