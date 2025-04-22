import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface Vehicle {
  id: string;
  name: string;
  type: "sedan" | "suv" | "truck" | "luxury";
  price: number;
  image: string;
  seats: number;
  transmission: "automatic" | "manual";
  fuelType: "petrol" | "diesel" | "electric" | "hybrid";
  available: boolean;
  features: string[];
  make?: string;
  model?: string;
  year?: number;
  license_plate?: string;
  color?: string;
  vehicle_type_id?: number;
  vehicle_type_name?: string;
}

interface CarModel {
  modelName: string;
  availableCount: number;
  imageUrl: string;
  vehicles: Vehicle[];
}

export function useVehicleData(modelNameParam?: string) {
  const [carModels, setCarModels] = useState<CarModel[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [selectedModel, setSelectedModel] = useState<CarModel | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVehicles = async () => {
      console.log("Fetching vehicles...");
      setIsLoadingModels(true);
      setError(null);

      try {
        // Fetch vehicle data
        let query = supabase.from("vehicles").select("*");

        if (typeof query.order === "function") {
          query = query.order("make");
        }

        const { data, error } = await query;

        if (error) {
          console.error("Error fetching vehicles:", error);
          setError("Failed to load vehicles. Please try again later.");
          setCarModels([]);
          return;
        }

        console.log(
          "Vehicles data received:",
          data ? data.length : 0,
          "vehicles",
        );

        if (!data || data.length === 0) {
          console.log("No vehicles found in database");
          setCarModels([]);
          return;
        }

        // Group by model
        const groupedByModel = data.reduce((acc, vehicle) => {
          const modelKey =
            `${vehicle.make || ""} ${vehicle.model || ""}`.trim();

          if (!acc[modelKey]) {
            acc[modelKey] = {
              modelName: modelKey,
              availableCount: 0,
              imageUrl:
                vehicle.image ||
                `/images/cover/${modelKey.toLowerCase().replace(/\s+/g, "-")}.jpg`,
              vehicles: [],
            };
          }

          const transformedVehicle = {
            id: vehicle.id.toString(),
            name: modelKey || "Unknown Vehicle",
            type: vehicle.type || "sedan",
            price: vehicle.price || 0,
            image:
              vehicle.image ||
              "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&q=80",
            seats: vehicle.seats || 4,
            transmission: vehicle.transmission || "automatic",
            fuelType: vehicle.fuel_type || "petrol",
            available: vehicle.available !== false,
            features: vehicle.features
              ? typeof vehicle.features === "string"
                ? JSON.parse(vehicle.features)
                : Array.isArray(vehicle.features)
                  ? vehicle.features
                  : ["AC"]
              : ["AC"],
            vehicle_type_id: vehicle.vehicle_type_id,
            vehicle_type_name: vehicle.vehicle_type_name,
            make: vehicle.make,
            model: vehicle.model,
            year: vehicle.year,
            color: vehicle.color,
            license_plate: vehicle.license_plate,
          };

          acc[modelKey].vehicles.push(transformedVehicle);

          if (vehicle.available !== false) {
            acc[modelKey].availableCount += 1;
          }

          return acc;
        }, {});

        const modelsArray = Object.values(groupedByModel);
        setCarModels(modelsArray);

        // If modelName exists in URL, find and select the model
        if (modelNameParam) {
          const decodedModelName = decodeURIComponent(modelNameParam);
          const foundModel = modelsArray.find((model) => {
            const normalizedModelName = model.modelName.toLowerCase().trim();
            const normalizedUrlName = decodedModelName.toLowerCase().trim();

            const furtherNormalizedModelName = normalizedModelName.replace(
              /\s+/g,
              " ",
            );
            const furtherNormalizedUrlName = normalizedUrlName.replace(
              /\s+/g,
              " ",
            );

            return furtherNormalizedModelName === furtherNormalizedUrlName;
          });

          if (foundModel) {
            setSelectedModel(foundModel);
          } else {
            console.log(`No model found matching: "${decodedModelName}"`);
          }
        }
      } catch (error) {
        console.error("Error processing vehicles data:", error);
        setError("An error occurred while processing vehicle data.");
      } finally {
        setIsLoadingModels(false);
      }
    };

    fetchVehicles();
  }, [modelNameParam]);

  return {
    carModels,
    isLoadingModels,
    selectedModel,
    setSelectedModel,
    error,
  };
}
