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

  const updateRoute = () => {
    if (!mapInstanceRef.current || !(window as any).L) return;

    const L = (window as any).L;
    const map = mapInstanceRef.current;

    // Check if coordinates are valid
    const isValidFrom = fromLocation[0] !== 0 && fromLocation[1] !== 0;
    const isValidTo = toLocation[0] !== 0 && toLocation[1] !== 0;

    if (!isValidFrom || !isValidTo) return;

    // Remove previous routing control if exists
    if (routeLayerRef.current) {
      map.removeControl(routeLayerRef.current);
    }

    // Create custom markers
    const createCustomIcon = (color: string) => {
      return L.divIcon({
        className: "custom-div-icon",
        html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.3);"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });
    };

    // Create routing control with car mode
    try {
      const routingControl = L.Routing.control({
        waypoints: [
          L.latLng(fromLocation[0], fromLocation[1]),
          L.latLng(toLocation[0], toLocation[1]),
        ],
        routeWhileDragging: false,
        showAlternatives: false,
        fitSelectedRoutes: true,
        lineOptions: {
          styles: [
            { color: "#0066FF", opacity: 0.8, weight: 6 },
            { color: "#0033FF", opacity: 0.5, weight: 4 },
          ],
        },
        createMarker: function (i: number, waypoint: any) {
          const icon =
            i === 0
              ? createCustomIcon("#4CAF50") // Green for start
              : createCustomIcon("#F44336"); // Red for end

          return L.marker(waypoint.latLng, {
            icon: icon,
            draggable: false,
          });
        },
        router: L.Routing.osrmv1({
          serviceUrl: "https://router.project-osrm.org/route/v1",
          profile: "driving",
        }),
        collapsible: true,
        show: false, // Don't show the instructions panel
      }).addTo(map);

      // Store reference to remove later
      routeLayerRef.current = routingControl;

      // Hide the control panel but keep the route
      const container = routingControl.getContainer();
      if (container) {
        container.style.display = "none";
      }
    } catch (error) {
      console.error("Error creating routing control:", error);

      // Fallback to simple polyline if routing fails
      const polyline = L.polyline([fromLocation, toLocation], {
        color: "blue",
        weight: 5,
        opacity: 0.7,
      }).addTo(map);

      // Add markers
      L.marker(fromLocation, {
        icon: createCustomIcon("#4CAF50"),
      }).addTo(map);

      L.marker(toLocation, {
        icon: createCustomIcon("#F44336"),
      }).addTo(map);

      // Fit bounds
      const bounds = L.latLngBounds(fromLocation, toLocation);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  };

  return (
    <div ref={mapRef} className="w-full h-[300px] rounded-md overflow-hidden" />
  );
}
