import React, { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, isSameDay } from "date-fns";
import { v4 as uuidv4 } from "uuid";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, ChevronDown, Loader2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

import { useShoppingCart } from "@/hooks/useShoppingCart";

// Create a function to generate the form schema based on selectedSize
const createFormSchema = (selectedSize: string) => {
  return z.object({
    name: z.string().min(2, { message: "Name must be at least 2 characters" }),
    email: z.string().email({ message: "Please enter a valid email address" }),
    phone: z
      .string()
      .min(8, { message: "Phone number must be at least 8 characters" }),
    itemName:
      selectedSize === "electronic"
        ? z
            .string()
            .min(1, { message: "Item name is required for electronic items" })
        : z.string().optional(),
    flightNumber: z.string().optional(),
    airport: z.string({ required_error: "Please select an airport" }),
    terminal: z.string({ required_error: "Please select a terminal" }),
    // Separate fields for Hours mode
    startDate_Hours: z
      .date({ required_error: "Please select a date" })
      .optional(),
    startTime_Hours: z.string().optional(),
    hours: z.number().min(1).max(4).optional(),
    // Separate fields for Days mode
    startDate_Days: z
      .date({ required_error: "Please select a date" })
      .optional(),
    endDate_Days: z.date({ required_error: "Please select a date" }).optional(),
    startTime_Days: z.string().optional(),
  });
};

type FormValues = z.infer<ReturnType<typeof createFormSchema>>;

interface BookingFormProps {
  selectedSize?:
    | "small"
    | "medium"
    | "large"
    | "extra_large"
    | "electronic"
    | "surfingboard"
    | "wheelchair"
    | "stickgolf";
  onComplete?: (data: any) => void;
  onCancel?: () => void;
  baggagePrices?: {
    small: number;
    medium: number;
    large: number;
    extra_large: number;
    electronic: number;
    surfingboard: number;
    wheelchair: number;
    stickgolf: number;
  };
  initialDate?: Date;
  initialTime?: string;
  prefilledData?: {
    name: string;
    email: string;
    phone: string;
  };
}

const BookingForm = ({
  selectedSize = "small",
  onComplete,
  onCancel,
  baggagePrices,
  initialDate,
  initialTime,
  prefilledData,
}: BookingFormProps) => {
  const { addToCart } = useShoppingCart();
  const {
    isAuthenticated,
    userId,
    userEmail,
    userName,
    isHydrated,
    isSessionReady,
    ensureSessionReady,
  } = useAuth();
  const [step, setStep] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [durationType, setDurationType] = useState<"hours" | "days">("hours");
  const [selectedAirport, setSelectedAirport] =
    useState<string>("soekarno_hatta");
  const [authStateReady, setAuthStateReady] = useState<boolean>(false);

  // Hours mode state
  const [hoursStartDate, setHoursStartDate] = useState<Date | undefined>(
    initialDate || new Date(),
  );
  const [hoursTime, setHoursTime] = useState<string | undefined>(
    initialTime || "",
  );
  const [hourCount, setHourCount] = useState<number>(1);
  const [startDateHoursTouched, setStartDateHoursTouched] =
    useState(!!initialDate);
  const [dateTimeHoursTouched, setDateTimeHoursTouched] =
    useState(!!initialTime);

  // Days mode state
  const [daysStartDate, setDaysStartDate] = useState<Date | undefined>(
    initialDate || new Date(),
  );
  const [daysEndDate, setDaysEndDate] = useState<Date | undefined>(
    initialDate
      ? new Date(new Date(initialDate).setDate(initialDate.getDate() + 1))
      : new Date(new Date().setDate(new Date().getDate() + 1)),
  );
  const [daysPickTime, setDaysPickTime] = useState<string | undefined>(
    initialTime || "",
  );
  const [startDateDaysTouched, setStartDateDaysTouched] =
    useState(!!initialDate);
  const [dateTimeDaysTouched, setDateTimeDaysTouched] = useState(!!initialTime);

  // Function to get current time in HH:MM format
  const getCurrentTimeString = () => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  // Available airports
  const airports = [
    { id: "soekarno_hatta", name: "Soekarno Hatta International Airport" },
    { id: "halim_perdanakusuma", name: "Halim Perdanakusuma Airport" },
    { id: "ngurah_rai", name: "Ngurah Rai International Airport" },
    { id: "juanda", name: "Juanda International Airport" },
  ];

  // Available terminals by airport
  const terminalsByAirport = {
    soekarno_hatta: [
      { id: "1A", name: "Terminal 1A" },
      { id: "1B", name: "Terminal 1B" },
      { id: "2D", name: "Terminal 2D" },
      { id: "2E", name: "Terminal 2E" },
      { id: "2F", name: "Terminal 2F" },
      { id: "3_DOMESTIK", name: "Terminal 3 Domestik" },
      { id: "3_INTERNASIONAL", name: "Terminal 3 Internasional" },
    ],
    halim_perdanakusuma: [{ id: "MAIN", name: "Main Terminal" }],
    ngurah_rai: [
      { id: "DOMESTIK", name: "Domestic Terminal" },
      { id: "INTERNASIONAL", name: "International Terminal" },
    ],
    juanda: [
      { id: "T1", name: "Terminal 1" },
      { id: "T2", name: "Terminal 2" },
    ],
  };

  const formSchema = createFormSchema(selectedSize);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isValid },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onChange", // 👉 ini penting untuk validasi realtime
    defaultValues: {
      name: prefilledData?.name || "",
      email: prefilledData?.email || "",
      phone: prefilledData?.phone || "",
      itemName: "",
      flightNumber: "",
      airport: "soekarno_hatta",
      terminal: "3_DOMESTIK",
      startDate_Hours: hoursStartDate,
      startTime_Hours: hoursTime,
      hours: hourCount,
      startDate_Days: daysStartDate,
      endDate_Days: daysEndDate,
      startTime_Days: daysPickTime,
    },
  });

  // Watch form values for Hours mode
  const watchStartDateHours = watch("startDate_Hours");
  const watchStartTimeHours = watch("startTime_Hours");
  const watchHours = watch("hours");

  // Watch form values for Days mode
  const watchStartDateDays = watch("startDate_Days");
  const watchEndDateDays = watch("endDate_Days");
  const watchStartTimeDays = watch("startTime_Days");

  // Separate validation for each duration type
  const isHoursModeValid =
    startDateHoursTouched &&
    !!watchHours &&
    watchHours >= 1 &&
    watchHours <= 4 &&
    !!watchStartTimeHours;

  const isDaysModeValid =
    startDateDaysTouched && !!watchEndDateDays && !!watchStartTimeDays;

  const isDurationStepValid =
    (durationType === "hours" && isHoursModeValid) ||
    (durationType === "days" && isDaysModeValid);

  const getPricePerUnit = () => {
    // Check if baggagePrices prop exists and has the selected size
    if (
      baggagePrices &&
      baggagePrices[selectedSize as keyof typeof baggagePrices]
    ) {
      return baggagePrices[selectedSize as keyof typeof baggagePrices];
    }

    // Default price map that matches database values
    const priceMap = {
      small: 75000,
      medium: 80000,
      large: 90000,
      extra_large: 100000,
      electronic: 90000,
      surfingboard: 100000,
      wheelchair: 60000,
      stickgolf: 120000,
    };

    // Fallback to default price map
    return priceMap[selectedSize] || 75000;
  };

  const calculateTotalPrice = () => {
    const pricePerUnit = getPricePerUnit();

    if (durationType === "hours" && watchHours) {
      return pricePerUnit * Math.ceil(watchHours / 4); // Price per 4 hours
    } else if (
      durationType === "days" &&
      watchStartDateDays &&
      watchEndDateDays
    ) {
      const diffTime = Math.abs(
        watchEndDateDays.getTime() - watchStartDateDays.getTime(),
      );
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return pricePerUnit * diffDays;
    }

    return pricePerUnit; // Default to one unit
  };

  const onSubmit = async (data: FormValues) => {
    console.log("[BookingForm] Starting booking submission...");
    console.log("[BookingForm] Auth State:", {
      isAuthenticated,
      userId,
      userEmail,
      userName,
      isHydrated,
    });
    console.log("[BookingForm] Form Data:", data);

    setIsSubmitting(true);

    try {
      // Ensure session is ready before proceeding
      console.log("[BookingForm] Ensuring session is ready...");
      if (ensureSessionReady) {
        const sessionReady = await ensureSessionReady();
        if (!sessionReady) {
          console.error("[BookingForm] Session not ready after validation");
          alert("Session expired. Please re-login and try again.");
          setIsSubmitting(false);
          return;
        }
      }

      // Refresh Supabase session to ensure token is active
      console.log("[BookingForm] Refreshing Supabase session...");
      const { data: sessionData, error: sessionError } =
        await supabase.auth.refreshSession();

      if (sessionError) {
        console.error("[BookingForm] Session refresh failed:", sessionError);
        alert("Session expired. Please re-login and try again.");
        setIsSubmitting(false);
        return;
      }

      if (!sessionData?.session?.user) {
        console.error("[BookingForm] No valid session after refresh");
        alert("Session expired. Please re-login and try again.");
        setIsSubmitting(false);
        return;
      }

      console.log("[BookingForm] ✅ Session refreshed successfully");

      // Get fresh session to ensure Supabase client uses latest token
      console.log("[BookingForm] Getting fresh session to sync token...");
      const {
        data: { session: freshSession },
        error: getSessionError,
      } = await supabase.auth.getSession();

      if (getSessionError || !freshSession?.user) {
        console.error(
          "[BookingForm] Failed to get fresh session:",
          getSessionError,
        );
        alert("Session expired. Please re-login and try again.");
        setIsSubmitting(false);
        return;
      }

      console.log("[BookingForm] ✅ Fresh session obtained, token synced");
    } catch (refreshError) {
      console.error("[BookingForm] Error refreshing session:", refreshError);
      alert("Session expired. Please re-login and try again.");
      setIsSubmitting(false);
      return;
    }

    // Enhanced session validation with ensureSessionReady
    console.log("[BookingForm] Ensuring session is ready before submission...");

    let sessionReady = false;
    try {
      if (ensureSessionReady) {
        sessionReady = await ensureSessionReady();
      } else {
        // Fallback if ensureSessionReady is not available
        console.warn(
          "[BookingForm] ensureSessionReady not available, using fallback",
        );
        sessionReady =
          isSessionReady && isAuthenticated && !!userId && !!userEmail;
      }
    } catch (error) {
      console.error("[BookingForm] Error in ensureSessionReady:", error);
      sessionReady = false;
    }

    if (!sessionReady) {
      console.error("[BookingForm] Session validation failed");
      alert(
        "Sesi login tidak valid atau belum siap. Silakan refresh halaman dan coba lagi.",
      );
      setIsSubmitting(false);
      return;
    }

    console.log(
      "[BookingForm] ✅ Session validation passed, proceeding with submission",
    );

    // Enhanced session validation with immediate fallback and AuthContext patching
    let validationAttempts = 0;
    const maxValidationAttempts = 3;
    let isAuthValid = false;
    let currentUser = null;

    // Immediate fallback check before validation attempts
    if (!isAuthenticated && localStorage.getItem("auth_user")) {
      console.log(
        "[BookingForm] AuthContext not authenticated but localStorage has user data, attempting immediate patch",
      );
      try {
        const stored = JSON.parse(localStorage.getItem("auth_user") || "{}");
        if (stored.id && stored.email) {
          console.log(
            "[BookingForm] Patching AuthContext with localStorage data",
          );

          // Dispatch event to force AuthContext update
          const consistentUserData = {
            id: stored.id,
            email: stored.email,
            role: localStorage.getItem("userRole") || stored.role || "Customer",
            name:
              localStorage.getItem("userName") ||
              stored.name ||
              stored.email?.split("@")[0] ||
              "User",
          };

          window.dispatchEvent(
            new CustomEvent("forceSessionRestore", {
              detail: consistentUserData,
            }),
          );

          // Small delay to allow AuthContext to update
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      } catch (e) {
        console.warn("[BookingForm] Error in immediate fallback:", e);
      }
    }

    while (validationAttempts < maxValidationAttempts && !isAuthValid) {
      validationAttempts++;
      console.log(
        `[BookingForm] Auth validation attempt ${validationAttempts}`,
      );

      // Get fresh session data from Supabase
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        console.log("[BookingForm] Fresh session check:", {
          hasSession: !!session,
          hasUser: !!session?.user,
          userId: session?.user?.id,
          userEmail: session?.user?.email,
        });

        if (session?.user) {
          currentUser = {
            id: session.user.id,
            email: session.user.email,
            name:
              session.user.user_metadata?.full_name ||
              session.user.user_metadata?.name ||
              session.user.email?.split("@")[0] ||
              "User",
          };
          isAuthValid = true;
          console.log("[BookingForm] Using fresh session data:", currentUser);

          // Update localStorage with fresh session data
          localStorage.setItem("auth_user", JSON.stringify(currentUser));
          localStorage.setItem("userId", currentUser.id);
          localStorage.setItem("userEmail", currentUser.email);
          localStorage.setItem("userName", currentUser.name);

          break;
        }
      } catch (sessionError) {
        console.warn(
          `[BookingForm] Session check attempt ${validationAttempts} failed:`,
          sessionError,
        );
      }

      // Enhanced fallback to localStorage with validation
      const storedUser = localStorage.getItem("auth_user");
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          if (parsedUser && parsedUser.id && parsedUser.email) {
            currentUser = {
              id: parsedUser.id,
              email: parsedUser.email,
              name:
                localStorage.getItem("userName") ||
                parsedUser.name ||
                parsedUser.email?.split("@")[0] ||
                "User",
            };
            isAuthValid = true;
            console.log(
              "[BookingForm] Using enhanced localStorage data:",
              currentUser,
            );
            break;
          }
        } catch (e) {
          console.warn("[BookingForm] Error parsing stored user:", e);
        }
      }

      // Check context state as final fallback
      if (isAuthenticated && userId && userEmail) {
        currentUser = {
          id: userId,
          email: userEmail,
          name: userName || userEmail.split("@")[0] || "User",
        };
        isAuthValid = true;
        console.log("[BookingForm] Using context state:", currentUser);
        break;
      }

      // Wait before retry
      if (validationAttempts < maxValidationAttempts) {
        console.log(`[BookingForm] Waiting 500ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    if (!isAuthValid || !currentUser) {
      console.error("[BookingForm] Auth validation failed after all attempts");
      alert(
        "Sesi login tidak valid. Silakan refresh halaman atau login ulang.",
      );
      setIsSubmitting(false);
      return;
    }

    console.log("[BookingForm] Auth validation passed:", {
      userId: currentUser.id,
      userEmail: currentUser.email,
      attempts: validationAttempts,
    });

    // Enhanced timeout handling with AbortController
    const abortController = new AbortController();
    const processingTimeout = setTimeout(() => {
      console.warn(
        "[BookingForm] Processing timeout reached (15s), aborting request",
      );
      abortController.abort();
      setIsSubmitting(false);
      alert("Proses booking timeout. Silakan coba lagi.");
    }, 15000); // Increased to 15 second timeout

    try {
      const calculatedDuration =
        durationType === "days"
          ? data.endDate_Days
            ? Math.ceil(
                (data.endDate_Days.getTime() - data.startDate_Days!.getTime()) /
                  (1000 * 60 * 60 * 24),
              )
            : 1
          : Math.ceil((data.hours || 0) / 4); // 4-jam blok

      const serviceName = `Baggage Storage - ${
        selectedSize === "small"
          ? "Small"
          : selectedSize === "medium"
            ? "Medium"
            : selectedSize === "large"
              ? "Large"
              : selectedSize === "extra_large"
                ? "Extra Large"
                : selectedSize === "electronic"
                  ? "Electronic"
                  : selectedSize === "surfingboard"
                    ? "Surfing Board"
                    : selectedSize === "wheelchair"
                      ? "Wheel Chair"
                      : selectedSize === "stickgolf"
                        ? "Stick Golf"
                        : "Unknown"
      }`;

      // Add to shopping cart instead of directly saving booking
      console.log("[BookingForm] Adding item to cart...");
      try {
        // Check if request was aborted
        if (abortController.signal.aborted) {
          console.log("[BookingForm] Request was aborted");
          return;
        }

        // Use the fresh session we already validated
        if (!freshSession?.user) {
          console.error(
            "[BookingForm] Fresh session invalid before cart operation",
          );
          alert("Session expired. Please re-login.");
          return;
        }

        const cartItem = {
          item_type: "baggage" as "airport_transfer" | "baggage" | "car",
          item_id: selectedSize,
          service_name: serviceName,
          price: calculateTotalPrice(),
          details: {
            customer_name: data.name,
            customer_phone: data.phone,
            customer_email: data.email,
            item_name:
              selectedSize === "electronic" ? data.itemName || "" : null,
            flight_number: data.flightNumber || "-",
            baggage_size: selectedSize,
            duration: calculatedDuration,
            storage_location: "Terminal 1, Level 1",
            start_date:
              durationType === "hours"
                ? data.startDate_Hours
                : data.startDate_Days,
            end_date:
              durationType === "hours"
                ? data.startDate_Hours
                : data.endDate_Days,
            start_time:
              durationType === "hours"
                ? data.startTime_Hours
                : data.startTime_Days,
            airport: data.airport,
            terminal: data.terminal,
            duration_type: durationType,
            hours: durationType === "hours" ? data.hours : null,
          },
        };

        console.log("[BookingForm] Cart item to add:", cartItem);

        // Enhanced cart operation with retry mechanism
        let cartSuccess = false;
        let cartAttempts = 0;
        const maxCartAttempts = 2;

        while (cartAttempts < maxCartAttempts && !cartSuccess) {
          cartAttempts++;
          console.log(`[BookingForm] Cart operation attempt ${cartAttempts}`);

          try {
            // Use the fresh session we already validated and synced
            if (!freshSession?.user) {
              throw new Error("Session expired during cart operation");
            }

            // Add timeout handling to cart operation with longer timeout
            const cartPromise = addToCart(cartItem);
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(
                () => reject(new Error("Cart operation timeout")),
                12000,
              ),
            );

            await Promise.race([cartPromise, timeoutPromise]);
            cartSuccess = true;
            console.log(
              `[BookingForm] Successfully added item to cart on attempt ${cartAttempts}`,
            );
          } catch (cartError) {
            console.error(
              `[BookingForm] Cart attempt ${cartAttempts} failed:`,
              cartError,
            );

            // Check if it's a session-related error
            if (
              cartError.message?.includes("JWT") ||
              cartError.message?.includes("session") ||
              cartError.message?.includes("auth") ||
              cartError.message?.includes("expired")
            ) {
              console.error(
                "[BookingForm] Session-related cart error detected",
              );
              throw new Error("Session expired during cart operation");
            }

            if (cartAttempts < maxCartAttempts) {
              console.log(
                "[BookingForm] Retrying cart operation in 1 second...",
              );
              await new Promise((resolve) => setTimeout(resolve, 1000));
            } else {
              throw cartError; // Re-throw on final attempt
            }
          }
        }
      } catch (cartError) {
        // Check if it's an abort error
        if (cartError.name === "AbortError" || abortController.signal.aborted) {
          console.log("[BookingForm] Cart operation was aborted");
          return;
        }

        console.error("[BookingForm] Failed to add item to cart:", cartError);
        console.error("[BookingForm] Cart error details:", {
          message: cartError.message,
          stack: cartError.stack,
        });

        // Check if it's a session-related error
        if (
          cartError.message?.includes("session") ||
          cartError.message?.includes("expired") ||
          cartError.message?.includes("JWT") ||
          cartError.message?.includes("auth")
        ) {
          alert("Session expired. Please re-login.");
        } else {
          alert("Failed to add item to cart. Please try again.");
        }

        // Clear timeout and reset state
        clearTimeout(processingTimeout);
        setIsSubmitting(false);
        return; // Exit early if cart addition fails
      }

      console.log("[BookingForm] Calling onComplete callback...");
      if (onComplete) {
        const completionData = {
          name: data.name,
          phone: data.phone,
          email: data.email,
          itemName:
            selectedSize === "electronic" ? data.itemName || "" : undefined,
          flightNumber: data.flightNumber || "-",
          baggageSize: serviceName.replace("Baggage Storage - ", ""),
          price: calculateTotalPrice(),
          duration: calculatedDuration,
          storageLocation: "Terminal 1, Level 1",
          startDate:
            durationType === "hours"
              ? data.startDate_Hours
              : data.startDate_Days,
          endDate:
            durationType === "hours" ? data.startDate_Hours : data.endDate_Days,
          startTime:
            durationType === "hours"
              ? data.startTime_Hours
              : data.startTime_Days,
          endTime: "",
          airport: airports.find((a) => a.id === data.airport)?.name,
          terminal: terminalsByAirport[data.airport]?.find(
            (t) => t.id === data.terminal,
          )?.name,
          durationType: durationType,
          hours: durationType === "hours" ? data.hours : undefined,
        };

        console.log("[BookingForm] Completion data:", completionData);
        try {
          onComplete(completionData);
          console.log(
            "[BookingForm] onComplete callback executed successfully",
          );
        } catch (callbackError) {
          console.error(
            "[BookingForm] Error in onComplete callback:",
            callbackError,
          );
        }
      } else {
        console.warn("[BookingForm] No onComplete callback provided");
      }
    } catch (error) {
      console.error("[BookingForm] Error in booking submission:", error);
      console.error("[BookingForm] Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });

      // Check if it's a session-related error
      if (
        error.message?.includes("JWT") ||
        error.message?.includes("session") ||
        error.message?.includes("auth")
      ) {
        alert("Session expired. Please re-login.");
      } else {
        alert("Terjadi kesalahan saat memproses booking. Silakan coba lagi.");
      }
    } finally {
      // Clear the timeout and reset processing state
      console.log(
        "[BookingForm] Cleaning up - clearing timeout and resetting state",
      );
      clearTimeout(processingTimeout);
      abortController.abort(); // Clean up abort controller
      setIsSubmitting(false);
      console.log("[BookingForm] Booking submission process completed");
    }
  };

  // Save form draft to localStorage with enhanced data
  const saveFormDraft = () => {
    try {
      const formData = {
        step,
        durationType,
        hoursStartDate,
        hoursTime,
        hourCount,
        daysStartDate,
        daysEndDate,
        daysPickTime,
        selectedSize,
        // Save form values
        formValues: {
          name: watch("name"),
          email: watch("email"),
          phone: watch("phone"),
          itemName: watch("itemName"),
          flightNumber: watch("flightNumber"),
          airport: watch("airport"),
          terminal: watch("terminal"),
        },
        timestamp: Date.now(),
        isSubmitting: false, // Always save as not submitting to prevent stuck state
      };
      localStorage.setItem("booking_form_draft", JSON.stringify(formData));
      console.log("[BookingForm] Enhanced form draft saved with step:", step);
    } catch (error) {
      console.warn("[BookingForm] Error saving form draft:", error);
    }
  };

  // 2. Auto-restore step dari localStorage jika ditemukan draft valid
  const restoreFormDraft = () => {
    try {
      const savedDraft = localStorage.getItem("booking_form_draft");
      if (savedDraft) {
        const draftData = JSON.parse(savedDraft);
        const timeDiff = Date.now() - draftData.timestamp;
        const maxAge = 30 * 60 * 1000; // 30 minutes

        if (timeDiff < maxAge && draftData.selectedSize === selectedSize) {
          console.log(
            "[BookingForm] Restoring valid form draft with step:",
            draftData.step,
          );

          // Always reset submitting state to prevent stuck button
          setIsSubmitting(false);

          // Restore step and duration type
          setStep(draftData.step || 0);
          setDurationType(draftData.durationType || "hours");

          // Restore dates and times
          if (draftData.hoursStartDate) {
            const restoredDate = new Date(draftData.hoursStartDate);
            setHoursStartDate(restoredDate);
            setValue("startDate_Hours", restoredDate);
            setStartDateHoursTouched(true);
          }

          if (draftData.hoursTime) {
            setHoursTime(draftData.hoursTime);
            setValue("startTime_Hours", draftData.hoursTime);
            setDateTimeHoursTouched(true);
          }

          if (draftData.hourCount) {
            setHourCount(draftData.hourCount);
            setValue("hours", draftData.hourCount);
          }

          if (draftData.daysStartDate) {
            const restoredStartDate = new Date(draftData.daysStartDate);
            setDaysStartDate(restoredStartDate);
            setValue("startDate_Days", restoredStartDate);
            setStartDateDaysTouched(true);
          }

          if (draftData.daysEndDate) {
            const restoredEndDate = new Date(draftData.daysEndDate);
            setDaysEndDate(restoredEndDate);
            setValue("endDate_Days", restoredEndDate);
          }

          if (draftData.daysPickTime) {
            setDaysPickTime(draftData.daysPickTime);
            setValue("startTime_Days", draftData.daysPickTime);
            setDateTimeDaysTouched(true);
          }

          // Restore form values if not prefilled
          if (draftData.formValues && !prefilledData) {
            Object.entries(draftData.formValues).forEach(([key, value]) => {
              if (value) {
                setValue(key as any, value);
              }
            });
          }

          console.log(
            "[BookingForm] Form draft restored successfully to step:",
            draftData.step,
          );
          return true;
        } else {
          console.log("[BookingForm] Draft expired or size mismatch, clearing");
          localStorage.removeItem("booking_form_draft");
        }
      }
    } catch (error) {
      console.warn("[BookingForm] Error restoring form draft:", error);
      localStorage.removeItem("booking_form_draft");
    }
    return false;
  };

  // Auto-save form draft when key values change
  useEffect(() => {
    const timer = setTimeout(() => {
      saveFormDraft();
    }, 1000); // Debounce saves

    return () => clearTimeout(timer);
  }, [
    step,
    durationType,
    hoursStartDate,
    hoursTime,
    hourCount,
    daysStartDate,
    daysEndDate,
    daysPickTime,
    watch("name"),
    watch("email"),
    watch("phone"),
    watch("itemName"),
    watch("flightNumber"),
    watch("airport"),
    watch("terminal"),
  ]);

  const isStepValid = () => {
    if (step === 0) {
      return isValid; // Standard form validation for all users
    }
    if (step === 1) {
      // Validasi berdasarkan mode durasi yang aktif
      if (durationType === "hours") {
        // Validasi khusus untuk mode Hours
        if (watchStartDateHours && watchStartTimeHours && watchHours) {
          const today = new Date();
          const isToday = isSameDay(watchStartDateHours, today);

          if (isToday) {
            // Jika tanggal hari ini, pastikan waktu yang dipilih belum lewat
            const currentHour = today.getHours();
            const currentMinute = today.getMinutes();

            const [selectedHour, selectedMinute] = watchStartTimeHours
              .split(":")
              .map(Number);

            const isTimeValid =
              selectedHour > currentHour ||
              (selectedHour === currentHour && selectedMinute > currentMinute);

            return (
              !!watchHours &&
              watchHours >= 1 &&
              watchHours <= 4 &&
              (isTimeValid || !isToday)
            );
          }

          // Jika bukan hari ini, cukup validasi hours saja
          return (
            !!watchHours &&
            watchHours >= 1 &&
            watchHours <= 4 &&
            !!watchStartTimeHours
          );
        }
        return false;
      } else if (durationType === "days") {
        // Validasi khusus untuk mode Days
        if (watchStartDateDays && watchStartTimeDays && watchEndDateDays) {
          const today = new Date();
          const isToday = isSameDay(watchStartDateDays, today);

          if (isToday) {
            // Jika tanggal hari ini, pastikan waktu yang dipilih belum lewat
            const currentHour = today.getHours();
            const currentMinute = today.getMinutes();

            const [selectedHour, selectedMinute] = watchStartTimeDays
              .split(":")
              .map(Number);

            const isTimeValid =
              selectedHour > currentHour ||
              (selectedHour === currentHour && selectedMinute > currentMinute);

            return !!watchEndDateDays && (isTimeValid || !isToday);
          }

          // Jika bukan hari ini, cukup validasi tanggal akhir saja
          return !!watchEndDateDays;
        }
        return false;
      }
      return false;
    }

    return isValid;
  };

  const steps = [
    {
      title: "Personal Information",
      description: "Enter your contact details",
      content: (
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              placeholder="Full Name"
              {...register("name")}
              disabled={!!prefilledData?.name}
              className={prefilledData?.name ? "bg-gray-100" : ""}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
            {prefilledData?.name && (
              <p className="text-xs text-gray-500">
                Auto-filled from your profile
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="john@example.com"
              {...register("email")}
              disabled={!!prefilledData?.email}
              className={prefilledData?.email ? "bg-gray-100" : ""}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
            )}
            {prefilledData?.email && (
              <p className="text-xs text-gray-500">
                Auto-filled from your profile
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              placeholder="+62 812 3456 7890"
              {...register("phone")}
              disabled={!!prefilledData?.phone}
              className={prefilledData?.phone ? "bg-gray-100" : ""}
            />
            {errors.phone && (
              <p className="text-sm text-red-500">{errors.phone.message}</p>
            )}
            {prefilledData?.phone && (
              <p className="text-xs text-gray-500">
                Auto-filled from your profile
              </p>
            )}
          </div>

          {selectedSize === "electronic" && (
            <div className="grid gap-2">
              <Label htmlFor="itemName">Item Name</Label>
              <Input
                id="itemName"
                placeholder="e.g., Laptop, Camera, Keyboard"
                {...register("itemName")}
              />
              {errors.itemName && (
                <p className="text-sm text-red-500">
                  {errors.itemName.message}
                </p>
              )}
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="flightNumber">Flight Number (Optional)</Label>
            <Input
              id="flightNumber"
              placeholder="GA-123"
              {...register("flightNumber")}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="airport">Airport</Label>
            <Select
              defaultValue={watch("airport")}
              onValueChange={(value) => {
                setValue("airport", value);
                setValue(
                  "terminal",
                  terminalsByAirport[
                    value as keyof typeof terminalsByAirport
                  ][0].id,
                );
                setSelectedAirport(value);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an airport" />
              </SelectTrigger>
              <SelectContent>
                {airports.map((airport) => (
                  <SelectItem key={airport.id} value={airport.id}>
                    {airport.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="terminal">Terminal</Label>
            <Select
              defaultValue={watch("terminal")}
              onValueChange={(value) => setValue("terminal", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a terminal" />
              </SelectTrigger>
              <SelectContent>
                {terminalsByAirport[
                  selectedAirport as keyof typeof terminalsByAirport
                ]?.map((terminal) => (
                  <SelectItem key={terminal.id} value={terminal.id}>
                    {terminal.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      ),
    },
    {
      title: "Storage Duration",
      description: "Select how long you need storage",
      content: (
        <div className="space-y-4">
          <Tabs
            value={durationType}
            onValueChange={(value) => {
              const newDurationType = value as "hours" | "days";
              setDurationType(newDurationType);
            }}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="hours">Hours</TabsTrigger>
              <TabsTrigger value="days">Days</TabsTrigger>
            </TabsList>
            <TabsContent value="hours" className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="hours">Number of Hours</Label>
                <Input
                  id="hours"
                  type="number"
                  min="1"
                  max="4"
                  defaultValue="1"
                  onChange={(e) => {
                    const newHourCount = parseInt(e.target.value);
                    setHourCount(newHourCount);
                    setValue("hours", newHourCount);
                  }}
                />
                <p className="text-sm text-muted-foreground">
                  Minimum 1 hour, maximum 4 hours
                </p>
              </div>

              <div className="grid gap-2">
                <Label>Date & Time</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateTimeHoursTouched && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTimeHoursTouched &&
                      watchStartDateHours &&
                      watchStartTimeHours ? (
                        <span>
                          {format(watchStartDateHours, "PPP")} -{" "}
                          {watchStartTimeHours}
                        </span>
                      ) : (
                        <span>Select date time</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <div className="p-3">
                      <Calendar
                        mode="single"
                        selected={watchStartDateHours}
                        onSelect={(date) => {
                          if (date) {
                            setHoursStartDate(date);
                            setValue("startDate_Hours", date);
                            setStartDateHoursTouched(true);
                          }
                        }}
                        disabled={(date) =>
                          date < new Date(new Date().setHours(0, 0, 0, 0))
                        }
                      />
                      <div className="mt-4">
                        <Label htmlFor="startTime_Hours">Pick Time</Label>
                        <div className="flex items-center mt-2">
                          <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="startTime_Hours"
                            type="time"
                            className="flex-1"
                            value={watchStartTimeHours || ""}
                            onChange={(e) => {
                              const newTime = e.target.value;
                              setHoursTime(newTime);
                              setValue("startTime_Hours", newTime);
                              setDateTimeHoursTouched(true);
                            }}
                            min={
                              watchStartDateHours &&
                              isSameDay(watchStartDateHours, new Date())
                                ? getCurrentTimeString()
                                : undefined
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </TabsContent>

            <TabsContent value="days" className="space-y-4">
              <div className="grid gap-2">
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !watchStartDateDays && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {watchStartDateDays ? (
                        format(watchStartDateDays, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={watchStartDateDays}
                      onSelect={(date) => {
                        if (date) {
                          setDaysStartDate(date);
                          setValue("startDate_Days", date);
                          setStartDateDaysTouched(true);

                          // Always set end date to next day
                          const nextDay = new Date(date);
                          nextDay.setDate(date.getDate() + 1);
                          setDaysEndDate(nextDay);
                          setValue("endDate_Days", nextDay);
                        }
                      }}
                      disabled={(date) =>
                        date < new Date(new Date().setHours(0, 0, 0, 0))
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="startTime">Pick Time</Label>
                <div className="flex items-center">
                  <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="startTime_Days"
                    type="time"
                    className="flex-1"
                    value={watchStartTimeDays || ""}
                    onChange={(e) => {
                      const newTime = e.target.value;
                      setDaysPickTime(newTime);
                      setValue("startTime_Days", newTime);
                      setDateTimeDaysTouched(true);
                    }}
                    min={
                      watchStartDateDays &&
                      isSameDay(watchStartDateDays, new Date())
                        ? getCurrentTimeString()
                        : undefined
                    }
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !watchEndDateDays && "text-muted-foreground",
                      )}
                      disabled={!watchStartDateDays}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {watchEndDateDays ? (
                        format(watchEndDateDays, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={watchEndDateDays}
                      onSelect={(date) => {
                        if (date) {
                          setDaysEndDate(date);
                          setValue("endDate_Days", date);
                        }
                      }}
                      disabled={(date) => {
                        if (!watchStartDateDays) return true;

                        // Disable dates before start date + 1 day
                        const minDate = new Date(watchStartDateDays);
                        minDate.setDate(watchStartDateDays.getDate() + 1);
                        return date < minDate;
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      ),
    },
    {
      title: "Review & Add to Cart",
      description: "Confirm your booking details",
      content: (
        <div className="space-y-4">
          <div className="rounded-lg bg-muted p-4">
            <h3 className="font-medium mb-2">Booking Summary</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Baggage Size/Items:</div>
              <div className="font-medium capitalize">{selectedSize}</div>

              <div>Name:</div>
              <div className="font-medium">{watch("name")}</div>

              <div>Email:</div>
              <div className="font-medium">{watch("email")}</div>

              <div>Contact:</div>
              <div className="font-medium">{watch("phone")}</div>

              {selectedSize === "electronic" && watch("itemName") && (
                <React.Fragment key="item-name">
                  <div>Item Name:</div>
                  <div className="font-medium">{watch("itemName")}</div>
                </React.Fragment>
              )}

              <div>Airport:</div>
              <div className="font-medium">
                {airports.find((a) => a.id === watch("airport"))?.name}
              </div>

              <div>Terminal:</div>
              <div className="font-medium">
                {
                  terminalsByAirport[
                    watch("airport") as keyof typeof terminalsByAirport
                  ]?.find((t) => t.id === watch("terminal"))?.name
                }
              </div>

              {watch("flightNumber") && (
                <React.Fragment key="flight-number">
                  <div>Flight Number:</div>
                  <div className="font-medium">{watch("flightNumber")}</div>
                </React.Fragment>
              )}

              <div>Duration:</div>
              <div className="font-medium">
                {durationType === "hours"
                  ? `${watchHours} hours`
                  : `${
                      watchStartDateDays && watchEndDateDays
                        ? Math.ceil(
                            Math.abs(
                              watchEndDateDays.getTime() -
                                watchStartDateDays.getTime(),
                            ) /
                              (1000 * 60 * 60 * 24),
                          )
                        : 0
                    } days`}
              </div>

              <div>Start Date:</div>
              <div className="font-medium">
                {durationType === "hours"
                  ? format(watchStartDateHours || new Date(), "PPP") +
                    (watchStartTimeHours ? ` - ${watchStartTimeHours}` : "")
                  : format(watchStartDateDays || new Date(), "PPP") +
                    (watchStartTimeDays ? ` - ${watchStartTimeDays}` : "")}
              </div>

              {durationType === "days" && watchEndDateDays && (
                <React.Fragment key="end-date">
                  <div>End Date:</div>
                  <div className="font-medium">
                    {format(watchEndDateDays, "PPP")}
                  </div>
                </React.Fragment>
              )}

              <div className="col-span-2 text-base font-bold pt-2">
                Total Price:
              </div>
              <div className="col-span-2 text-base font-bold">
                {(() => {
                  const price = calculateTotalPrice();
                  return isNaN(price) || price <= 0
                    ? "Price calculating..."
                    : `Rp ${price.toLocaleString()}`;
                })()}
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <p className="text-sm text-blue-700">
                This item will be added to your cart. You can select payment
                method and complete checkout from the shopping cart.
              </p>
            </div>
          </div>
        </div>
      ),
    },
  ];

  // Handle tab change to reset fields for the inactive mode
  useEffect(() => {
    if (durationType === "hours") {
      // Update form with current hours mode state
      setValue("startDate_Hours", hoursStartDate);
      setValue("startTime_Hours", hoursTime);
      setValue("hours", hourCount);
    } else {
      // Update form with current days mode state
      setValue("startDate_Days", daysStartDate);
      setValue("endDate_Days", daysEndDate);
      setValue("startTime_Days", daysPickTime);
    }
  }, [
    durationType,
    setValue,
    hoursStartDate,
    hoursTime,
    hourCount,
    daysStartDate,
    daysEndDate,
    daysPickTime,
  ]);

  // Check for booking draft and reset step if needed
  useEffect(() => {
    const draft = localStorage.getItem("booking_form_draft");
    const parsedDraft = draft ? JSON.parse(draft) : null;

    const isRepeatBooking = parsedDraft?.selectedSize === selectedSize;
    const isFreshStart = !parsedDraft || !isRepeatBooking;

    if (isFreshStart) {
      localStorage.removeItem("booking_form_draft");
      setStep(0);
    } else {
      setStep(parsedDraft.step ?? 0);
    }
  }, [selectedSize]);

  // Wait for session to be ready before loading data with validation
  useEffect(() => {
    if (!isSessionReady) {
      console.log("[BookingFormBag] Waiting for session to be ready...");
      return;
    }

    console.log(
      "[BookingFormBag] Session ready, initializing form with validation",
    );

    // Initialize time fields if initialTime is provided
    if (initialTime) {
      setHoursTime(initialTime);
      setDaysPickTime(initialTime);
      setValue("startTime_Hours", initialTime);
      setValue("startTime_Days", initialTime);
      setDateTimeHoursTouched(true);
      setDateTimeDaysTouched(true);
    }
  }, [isSessionReady, initialTime, setValue]);

  // Enhanced visibility change handler with session recovery - AUTO-RESTORE form state on tab switch
  useEffect(() => {
    let visibilityTimeout: NodeJS.Timeout;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        console.log(
          "[BookingForm] Tab became visible, restoring form state...",
        );

        // Clear any existing timeout
        if (visibilityTimeout) clearTimeout(visibilityTimeout);

        // Always reset processing state if stuck
        if (isSubmitting) {
          console.log(
            "[BookingForm] Resetting stuck processing state after tab switch",
          );
          setIsSubmitting(false);
        }

        // Check auth state and restore form draft
        const storedUser = localStorage.getItem("auth_user");
        const storedUserName = localStorage.getItem("userName");
        const storedUserRole = localStorage.getItem("userRole");

        if (storedUser) {
          try {
            const userData = JSON.parse(storedUser);
            console.log(
              "[BookingForm] Auth state checked from localStorage:",
              userData.email,
            );

            // Check if current auth state is missing or corrupted
            const needsRestore =
              !isAuthenticated ||
              !userId ||
              !userEmail ||
              userId !== userData.id ||
              userEmail !== userData.email;

            if (needsRestore) {
              console.log(
                "[BookingForm] Auth state needs restoration, triggering global restore",
              );

              // Create consistent user data
              const consistentUserData = {
                id: userData.id,
                email: userData.email,
                role: storedUserRole || userData.role || "Customer",
                name:
                  storedUserName ||
                  userData.name ||
                  userData.email?.split("@")[0] ||
                  "User",
              };

              window.dispatchEvent(
                new CustomEvent("forceSessionRestore", {
                  detail: consistentUserData,
                }),
              );
            }

            setAuthStateReady(true);

            // AUTO-RESTORE form draft on tab switch to prevent reset
            console.log(
              "[BookingForm] Auto-restoring form draft to prevent reset",
            );
            restoreFormDraft();
          } catch (e) {
            console.warn("[BookingForm] Error parsing stored user data:", e);
            setAuthStateReady(false);
            // Still try to restore form draft even if auth parsing fails
            restoreFormDraft();
          }
        } else {
          console.warn("[BookingForm] No stored user data found");
          setAuthStateReady(false);
          // Still try to restore form draft for guest users
          restoreFormDraft();
        }

        // Debounced additional check
        visibilityTimeout = setTimeout(() => {
          // Final auth state check
          if (!isAuthenticated && storedUser) {
            try {
              const userData = JSON.parse(storedUser);
              if (userData && userData.id && userData.email) {
                console.log(
                  "[BookingForm] Final auth check - triggering session restore",
                );

                const consistentUserData = {
                  id: userData.id,
                  email: userData.email,
                  role: storedUserRole || userData.role || "Customer",
                  name:
                    storedUserName ||
                    userData.name ||
                    userData.email?.split("@")[0] ||
                    "User",
                };

                window.dispatchEvent(
                  new CustomEvent("forceSessionRestore", {
                    detail: consistentUserData,
                  }),
                );
              }
            } catch (error) {
              console.warn("[BookingForm] Error in final auth check:", error);
            }
          }
        }, 500); // Reduced timeout for faster recovery
      }
    };

    // Listen for auth state refresh events
    const handleAuthStateRefresh = (event: CustomEvent) => {
      console.log("[BookingForm] Auth state refreshed:", event.detail);
      setAuthStateReady(true);

      // Reset processing state if it was stuck
      if (isSubmitting) {
        console.log(
          "[BookingForm] Resetting processing state after auth refresh",
        );
        setIsSubmitting(false);
      }

      // Update form with refreshed user data if prefilled
      if (prefilledData && event.detail) {
        const userData = event.detail;
        if (userData.name && !watch("name")) {
          setValue("name", userData.name);
        }
        if (userData.email && !watch("email")) {
          setValue("email", userData.email);
        }
      }
    };

    // Listen for session restored events
    const handleSessionRestored = (event: CustomEvent) => {
      console.log(
        "[BookingForm] Session restored event received:",
        event.detail,
      );
      setAuthStateReady(true);

      // Reset processing state if it was stuck
      if (isSubmitting) {
        console.log(
          "[BookingForm] Resetting processing state after session restore",
        );
        setIsSubmitting(false);
      }

      // Update form with restored user data
      const userData = event.detail;
      if (userData.name && prefilledData && !watch("name")) {
        setValue("name", userData.name);
      }
      if (userData.email && prefilledData && !watch("email")) {
        setValue("email", userData.email);
      }
    };

    // Listen for authStateUpdated event and refresh context
    const refreshContext = () => {
      const storedUser = localStorage.getItem("auth_user");
      if (!isAuthenticated && !storedUser) {
        console.error("[BookingForm] Session expired. Please login again.");
        alert("Session expired. Please login again.");
        window.location.reload();
      } else if (storedUser && !isAuthenticated) {
        // Try to restore from localStorage
        try {
          const userData = JSON.parse(storedUser);
          if (userData && userData.id && userData.email) {
            console.log("[BookingForm] Restoring session from localStorage");
            window.dispatchEvent(
              new CustomEvent("forceSessionRestore", { detail: userData }),
            );
          }
        } catch (error) {
          console.warn("[BookingForm] Error restoring session:", error);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener(
      "authStateRefreshed",
      handleAuthStateRefresh as EventListener,
    );
    window.addEventListener(
      "sessionRestored",
      handleSessionRestored as EventListener,
    );
    window.addEventListener("authStateUpdated", refreshContext);

    // Initial check and restore on component mount ONLY
    const storedUser = localStorage.getItem("auth_user");
    setAuthStateReady(!!storedUser);

    // Try to restore form draft ONLY on initial load, not on tab switches
    if (storedUser && !authStateReady) {
      console.log(
        "[BookingForm] Initial mount - attempting to restore form draft",
      );
      setTimeout(() => {
        restoreFormDraft();
      }, 100); // Small delay to ensure form is initialized
    }

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener(
        "authStateRefreshed",
        handleAuthStateRefresh as EventListener,
      );
      window.removeEventListener(
        "sessionRestored",
        handleSessionRestored as EventListener,
      );
      window.removeEventListener("authStateUpdated", refreshContext);
      if (visibilityTimeout) clearTimeout(visibilityTimeout);
    };
  }, [
    selectedSize,
    isAuthenticated,
    userId,
    userEmail,
    prefilledData,
    watch,
    setValue,
    isSubmitting,
    authStateReady,
  ]); // Fixed dependencies array

  return (
    <Card className="w-full max-w-lg mx-auto bg-white">
      <CardHeader>
        <CardTitle>{steps[step].title}</CardTitle>
        <CardDescription>{steps[step].description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)}>{steps[step].content}</form>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => (step === 0 ? onCancel?.() : setStep(step - 1))}
          disabled={isSubmitting}
        >
          {step === 0 ? "Cancel" : "Back"}
        </Button>
        <Button
          onClick={async () => {
            if (step === steps.length - 1) {
              console.log("[BookingForm] Book Now button clicked");

              // Prevent multiple submissions
              if (isSubmitting) {
                console.log("[BookingForm] Already submitting, ignoring click");
                return;
              }

              // Set submitting state immediately to prevent double clicks
              setIsSubmitting(true);

              try {
                // Enhanced session validation with ensureSessionReady
                console.log(
                  "[BookingForm] Validating and refreshing session before submission...",
                );

                // First, ensure session is ready
                if (ensureSessionReady) {
                  const sessionReady = await ensureSessionReady();
                  if (!sessionReady) {
                    console.error(
                      "[BookingForm] Session not ready after validation",
                    );
                    alert("Session expired. Please re-login and try again.");
                    setIsSubmitting(false);
                    return;
                  }
                }

                // Then refresh the Supabase session
                const { data: sessionData, error: sessionError } =
                  await supabase.auth.refreshSession();

                if (sessionError || !sessionData?.session?.user) {
                  console.error(
                    "[BookingForm] Session refresh failed:",
                    sessionError,
                  );
                  alert("Session expired. Please re-login and try again.");
                  setIsSubmitting(false);
                  return;
                }

                console.log(
                  "[BookingForm] ✅ Session refreshed successfully, submitting form",
                );
                await handleSubmit(onSubmit)();
              } catch (error) {
                console.error("[BookingForm] Error during submission:", error);

                // Check if it's a session-related error
                if (
                  error.message?.includes("JWT") ||
                  error.message?.includes("session") ||
                  error.message?.includes("auth")
                ) {
                  alert("Session expired. Please re-login and try again.");
                } else {
                  alert(
                    "An error occurred while processing your booking. Please try again.",
                  );
                }
                setIsSubmitting(false);
              }
            } else {
              console.log(`[BookingForm] Moving to step ${step + 1}`);
              setStep(step + 1);
            }
          }}
          disabled={
            step === steps.length - 1
              ? isSubmitting
              : !isStepValid() || isSubmitting
          }
          className="bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : step === steps.length - 1 ? (
            "Book Now"
          ) : (
            "Next"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default BookingForm;
