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

  // Load Leaflet & Routing script once
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

  // Update route on location change
  useEffect(() => {
    const isValidCoord = ([lat, lng]: [number, number]) =>
      typeof lat === "number" &&
      typeof lng === "number" &&
      lat !== 0 &&
      lng !== 0;

    if (
      !mapInstanceRef.current ||
      !(window as any).L ||
      !isValidCoord(fromLocation) ||
      !isValidCoord(toLocation)
    )
      return;

    updateRoute();
  }, [fromLocation, toLocation]);

  const initMap = () => {
    const L = (window as any).L;
    if (!mapRef.current || !L) {
      console.warn("❗ Map container atau Leaflet belum siap");
      return;
    }

    // 💥 Hindari double init: jika Leaflet sudah terhubung ke elemen ini
    if (mapRef.current._leaflet_id) {
      console.log("⚠️ Map sudah diinisialisasi. Melewati initMap()");
      return;
    }

    const bounds = L.latLngBounds(
      L.latLng(fromLocation[0], fromLocation[1]),
      L.latLng(toLocation[0], toLocation[1]),
    );

    const map = L.map(mapRef.current);
    map.fitBounds(bounds, { padding: [50, 50] });

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

    const isValid = ([lat, lng]: [number, number]) =>
      typeof lat === "number" &&
      typeof lng === "number" &&
      lat !== 0 &&
      lng !== 0;

    if (!isValid(fromLocation) || !isValid(toLocation)) {
      console.warn("⚠️ Koordinat tidak valid:", { fromLocation, toLocation });
      return;
    }

    if (
      fromLocation[0] === toLocation[0] &&
      fromLocation[1] === toLocation[1]
    ) {
      console.warn(
        "⛔ Pickup dan Dropoff berada di titik yang sama. Routing dibatalkan.",
      );
      return;
    }

    // ✅ Jika sudah ada routing, cukup update titiknya
    try {
      if (routeLayerRef.current) {
        routeLayerRef.current.setWaypoints([
          L.latLng(fromLocation[0], fromLocation[1]),
          L.latLng(toLocation[0], toLocation[1]),
        ]);
        return;
      }
    } catch (err) {
      console.warn("⚠️ setWaypoints gagal, akan buat ulang routing", err);
    }

    const createCustomIcon = (color: string) =>
      L.divIcon({
        className: "custom-div-icon",
        html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.3);"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

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
        createMarker: (i: number, waypoint: any) => {
          const icon =
            i === 0 ? createCustomIcon("#4CAF50") : createCustomIcon("#F44336");
          return L.marker(waypoint.latLng, { icon, draggable: false });
        },
        router: L.Routing.osrmv1({
          serviceUrl: "https://router.project-osrm.org/route/v1",
          profile: "driving",
        }),
        collapsible: true,
        show: false,
      }).addTo(map);

      routingControl.on("routesfound", (e) => {
        const route = e.routes[0];
        const distanceKm = route.summary.totalDistance / 1000;
        const durationMin = route.summary.totalTime / 60;
        console.log(
          "✅ Rute ditemukan:",
          distanceKm.toFixed(2),
          "km,",
          durationMin.toFixed(1),
          "menit",
        );
      });

      const container = routingControl.getContainer();
      if (container) container.style.display = "none";

      routeLayerRef.current = routingControl;
    } catch (err) {
      console.error("❌ Gagal membuat routing control:", err);
    }
  };

  return (
    <div ref={mapRef} className="w-full h-[300px] rounded-md overflow-hidden" />
  );
}
