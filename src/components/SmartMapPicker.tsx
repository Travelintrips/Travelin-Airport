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
  const routingControlRef = useRef<any>(null);
  const isComponentMountedRef = useRef(true);
  const cleanupInProgressRef = useRef(false);

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

  // Cleanup function
  useEffect(() => {
    return () => {
      isComponentMountedRef.current = false;

      if (cleanupInProgressRef.current) {
        return;
      }
      cleanupInProgressRef.current = true;

      // Clean up routing control first
      if (routingControlRef.current) {
        try {
          // Stop any ongoing routing requests
          if (
            routingControlRef.current._router &&
            typeof routingControlRef.current._router.abort === "function"
          ) {
            routingControlRef.current._router.abort();
          }

          // Remove event listeners
          if (typeof routingControlRef.current.off === "function") {
            routingControlRef.current.off();
          }

          // Remove the control from map if map still exists
          if (
            mapInstanceRef.current &&
            typeof mapInstanceRef.current.removeControl === "function"
          ) {
            mapInstanceRef.current.removeControl(routingControlRef.current);
          }
        } catch (error) {
          console.warn("Error removing routing control:", error);
        }
        routingControlRef.current = null;
      }

      // Clean up map instance
      if (mapInstanceRef.current) {
        try {
          // Remove all event listeners first
          if (typeof mapInstanceRef.current.off === "function") {
            mapInstanceRef.current.off();
          }

          // Clear all layers safely
          if (typeof mapInstanceRef.current.eachLayer === "function") {
            const layersToRemove: any[] = [];
            mapInstanceRef.current.eachLayer((layer: any) => {
              layersToRemove.push(layer);
            });

            layersToRemove.forEach((layer) => {
              try {
                if (
                  mapInstanceRef.current &&
                  typeof mapInstanceRef.current.removeLayer === "function"
                ) {
                  mapInstanceRef.current.removeLayer(layer);
                }
              } catch (e) {
                // Ignore layer removal errors
              }
            });
          }

          // Remove the map
          if (typeof mapInstanceRef.current.remove === "function") {
            mapInstanceRef.current.remove();
          }
        } catch (error) {
          console.warn("Error removing map:", error);
        }
        mapInstanceRef.current = null;
      }

      cleanupInProgressRef.current = false;
    };
  }, []);

  // Load peta setelah posisi valid dan API key ada
  useEffect(() => {
    if (
      !pickup ||
      !dropoff ||
      pickup[0] === 0 ||
      dropoff[0] === 0 ||
      !mapRef.current ||
      !apiKey
    )
      return;

    if (mapMode === "osm") {
      loadLeaflet();
    } else if (mapMode === "google") {
      loadGoogleMap();
    }
  }, [mapMode, pickup, dropoff, apiKey]);

  const loadLeaflet = () => {
    const L = (window as any).L;

    if (!L) {
      // Load Leaflet CSS
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.3/dist/leaflet.css";
      document.head.appendChild(link);

      // Load Leaflet JS
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.3/dist/leaflet.js";
      script.async = true;
      script.onload = () => {
        // Load Leaflet Routing Machine after Leaflet is loaded
        loadLeafletRoutingMachine();
      };
      document.body.appendChild(script);
    } else {
      // Check if routing machine is available, if not load it
      if (!L.Routing) {
        loadLeafletRoutingMachine();
      } else {
        initLeafletMap();
      }
    }
  };

  const loadLeafletRoutingMachine = () => {
    const L = (window as any).L;

    if (L.Routing) {
      initLeafletMap();
      return;
    }

    // Load Leaflet Routing Machine CSS
    const routingCss = document.createElement("link");
    routingCss.rel = "stylesheet";
    routingCss.href =
      "https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.css";
    document.head.appendChild(routingCss);

    // Load Leaflet Routing Machine JS
    const routingScript = document.createElement("script");
    routingScript.src =
      "https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.js";
    routingScript.async = true;
    routingScript.onload = () => {
      initLeafletMap();
    };
    routingScript.onerror = () => {
      console.warn(
        "Failed to load Leaflet Routing Machine, continuing without routing",
      );
      initLeafletMap();
    };
    document.body.appendChild(routingScript);
  };

  const initLeafletMap = () => {
    const L = (window as any).L;

    // Don't initialize if component is unmounted or cleanup is in progress
    if (!isComponentMountedRef.current || cleanupInProgressRef.current) {
      return;
    }

    // Clean up existing routing control first
    if (routingControlRef.current) {
      try {
        // Stop any ongoing routing requests
        if (
          routingControlRef.current._router &&
          typeof routingControlRef.current._router.abort === "function"
        ) {
          routingControlRef.current._router.abort();
        }

        // Remove event listeners
        if (typeof routingControlRef.current.off === "function") {
          routingControlRef.current.off();
        }

        if (
          mapInstanceRef.current &&
          typeof mapInstanceRef.current.removeControl === "function"
        ) {
          mapInstanceRef.current.removeControl(routingControlRef.current);
        }
      } catch (error) {
        console.warn("Error removing existing routing control:", error);
      }
      routingControlRef.current = null;
    }

    // Clean up existing map
    if (mapInstanceRef.current) {
      try {
        // Remove all event listeners first
        if (typeof mapInstanceRef.current.off === "function") {
          mapInstanceRef.current.off();
        }

        // Clear all layers safely
        if (typeof mapInstanceRef.current.eachLayer === "function") {
          const layersToRemove: any[] = [];
          mapInstanceRef.current.eachLayer((layer: any) => {
            layersToRemove.push(layer);
          });

          layersToRemove.forEach((layer) => {
            try {
              if (
                mapInstanceRef.current &&
                typeof mapInstanceRef.current.removeLayer === "function"
              ) {
                mapInstanceRef.current.removeLayer(layer);
              }
            } catch (e) {
              // Ignore layer removal errors
            }
          });
        }

        if (typeof mapInstanceRef.current.remove === "function") {
          mapInstanceRef.current.remove();
        }
      } catch (error) {
        console.warn("Error removing existing map:", error);
      }
    }

    // Don't continue if component unmounted during cleanup
    if (!isComponentMountedRef.current || cleanupInProgressRef.current) {
      return;
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

    // Add routing if Leaflet Routing Machine is available and component is still mounted
    if (
      L.Routing &&
      typeof L.Routing.control === "function" &&
      isComponentMountedRef.current &&
      !cleanupInProgressRef.current
    ) {
      try {
        const routingControl = L.Routing.control({
          waypoints: [
            L.latLng(pickup[0], pickup[1]),
            L.latLng(dropoff[0], dropoff[1]),
          ],
          routeWhileDragging: false,
          addWaypoints: false,
          createMarker: function () {
            return null;
          }, // Don't create default markers
          lineOptions: {
            styles: [{ color: "#3388ff", weight: 4, opacity: 0.7 }],
          },
        });

        // Add error handling for routing events
        routingControl.on("routesfound", function (e) {
          if (!isComponentMountedRef.current || cleanupInProgressRef.current) {
            return;
          }
        });

        routingControl.on("routingerror", function (e) {
          if (!isComponentMountedRef.current || cleanupInProgressRef.current) {
            return;
          }
          console.warn("Routing error:", e);
        });

        // Override the _clearLines method to prevent null errors
        if (routingControl._clearLines) {
          const originalClearLines = routingControl._clearLines;
          routingControl._clearLines = function () {
            try {
              if (this._map && this._map.hasLayer) {
                originalClearLines.call(this);
              }
            } catch (error) {
              console.warn("Error in _clearLines:", error);
            }
          };
        }

        if (isComponentMountedRef.current && !cleanupInProgressRef.current) {
          routingControl.addTo(map);
          routingControlRef.current = routingControl;
        }
      } catch (error) {
        console.warn("Error adding routing control:", error);
      }
    }
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
