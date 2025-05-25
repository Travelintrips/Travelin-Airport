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
    const loadDependencies = async () => {
      if (!(window as any).L) {
        console.log("📦 Loading Leaflet...");
        const leafletScript = document.createElement("script");
        leafletScript.src = "https://unpkg.com/leaflet@1.9.3/dist/leaflet.js";
        leafletScript.async = true;
        document.body.appendChild(leafletScript);

        const leafletLink = document.createElement("link");
        leafletLink.rel = "stylesheet";
        leafletLink.href = "https://unpkg.com/leaflet@1.9.3/dist/leaflet.css";
        document.head.appendChild(leafletLink);

        await new Promise<void>((resolve) => {
          leafletScript.onload = () => {
            console.log("✅ Leaflet loaded");
            resolve();
          };
        });

        console.log("📦 Loading Leaflet Routing Machine...");
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

        await new Promise<void>((resolve) => {
          routingScript.onload = () => {
            console.log("✅ Routing Machine loaded");
            resolve();
          };
        });
      }

      initMap();
    };

    loadDependencies();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (mapInstanceRef.current && (window as any).L) {
      updateRoute();
    }
  }, [fromLocation, toLocation]);

  const initMap = () => {
    if (!mapRef.current || !(window as any).L) return;

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
    const L = (window as any).L;
    const map = mapInstanceRef.current;

    if (!L || !map || !L.Routing) {
      console.warn("❗ Leaflet or Routing belum siap");
      return;
    }

    console.log("📍 From:", fromLocation);
    console.log("📍 To:", toLocation);

    const isValidFrom = fromLocation[0] !== 0 && fromLocation[1] !== 0;
    const isValidTo = toLocation[0] !== 0 && toLocation[1] !== 0;

    if (!isValidFrom || !isValidTo) {
      console.warn("⚠️ Koordinat tidak valid:", { fromLocation, toLocation });
      return;
    }

    if (routeLayerRef.current) {
      map.removeControl(routeLayerRef.current);
    }

    const createCustomIcon = (color: string) => {
      return L.divIcon({
        className: "custom-div-icon",
        html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.3);"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });
    };

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
            i === 0 ? createCustomIcon("#4CAF50") : createCustomIcon("#F44336");

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
        show: false,
      }).addTo(map);

      routingControl.on("routesfound", function (e) {
        const route = e.routes[0];
        const distanceKm = route.summary.totalDistance / 1000;
        const durationMin = route.summary.totalTime / 60;

        console.log("✅ OSRM route found:");
        console.log("  📏 Jarak :", distanceKm.toFixed(2), "km");
        console.log("  ⏱️ Durasi:", durationMin.toFixed(1), "menit");
      });

      routeLayerRef.current = routingControl;

      const container = routingControl.getContainer();
      if (container) {
        container.style.display = "none";
      }
    } catch (error) {
      console.error("❌ Gagal membuat routing control:", error);

      const polyline = L.polyline([fromLocation, toLocation], {
        color: "blue",
        weight: 5,
        opacity: 0.7,
      }).addTo(map);

      L.marker(fromLocation, {
        icon: createCustomIcon("#4CAF50"),
      }).addTo(map);

      L.marker(toLocation, {
        icon: createCustomIcon("#F44336"),
      }).addTo(map);

      const bounds = L.latLngBounds(fromLocation, toLocation);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  };

  return (
    <div ref={mapRef} className="w-full h-[300px] rounded-md overflow-hidden" />
  );
}
