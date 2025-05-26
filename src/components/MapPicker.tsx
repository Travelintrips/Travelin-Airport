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
  const isInitialized = useRef(false);

  // Load Leaflet and Routing Machine scripts
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

        console.log("📦 Loading Routing Machine...");
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

      if (!isInitialized.current) {
        initMap();
        isInitialized.current = true;
      }
    };

    loadDependencies();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      routeLayerRef.current = null;
      isInitialized.current = false;
    };
  }, []);

  // Watch location changes
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
    ) {
      return;
    }

    updateRoute();
  }, [fromLocation, toLocation]);

  const initMap = () => {
    const L = (window as any).L;
    if (!mapRef.current || !L) {
      console.warn("❗ Map container atau Leaflet belum siap");
      return;
    }

    // ✅ Bersihkan peta sebelumnya jika sudah pernah dibuat
    if ((mapRef.current as any)._leaflet_id) {
      console.log("♻️ Map sudah ada, mereset container...");
      mapRef.current.innerHTML = ""; // reset kontainer sebelum inisialisasi ulang
    }

    const map = L.map(mapRef.current);

    const bounds = L.latLngBounds(
      L.latLng(fromLocation[0], fromLocation[1]),
      L.latLng(toLocation[0], toLocation[1]),
    );
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
      console.warn("❗ Leaflet Routing belum siap");
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
      console.warn("⛔ Pickup dan Dropoff sama. Routing dibatalkan.");
      return;
    }

    try {
      const layer = routeLayerRef.current;

      const isSafeToUpdate =
        layer &&
        typeof layer.setWaypoints === "function" &&
        typeof layer.getWaypoints === "function" &&
        typeof layer.getPlan === "function" &&
        layer.getPlan() &&
        layer.getWaypoints() &&
        layer.getWaypoints().length === 2 &&
        layer._container &&
        layer._lineLayer;

      if (isSafeToUpdate) {
        console.log("✅ Memperbarui rute dengan setWaypoints()");
        setTimeout(() => {
          // 💡 delay untuk beri waktu leaflet siap render
          try {
            layer.setWaypoints([
              L.latLng(fromLocation[0], fromLocation[1]),
              L.latLng(toLocation[0], toLocation[1]),
            ]);
          } catch (e) {
            console.warn("❌ Crash saat setWaypoints() dgn delay", e);
          }
        }, 100);
        return;
      } else {
        console.warn("⚠️ Routing layer belum siap. Membuat ulang...");
      }
    } catch (err) {
      console.warn("⚠️ setWaypoints gagal. Reset routeLayerRef.", err);
      try {
        if (mapInstanceRef.current && routeLayerRef.current) {
          mapInstanceRef.current.removeControl(routeLayerRef.current);
        }
      } catch (removeErr) {
        console.error("❌ Gagal menghapus routing control:", removeErr);
      }
      routeLayerRef.current = null;
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
        collapsible: true,
        show: false,
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
    } catch (error) {
      console.error("❌ Gagal membuat routing control:", error);
    }
  };

  return (
    <div ref={mapRef} className="w-full h-[300px] rounded-md overflow-hidden" />
  );
}
