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
  // Authentication removed - allow all users to access baggage booking
  const { addToCart } = useShoppingCart();
  const [step, setStep] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [durationType, setDurationType] = useState<"hours" | "days">("hours");
  const [selectedAirport, setSelectedAirport] =
    useState<string>("soekarno_hatta");
  const [customerPhone, setCustomerPhone] = useState<string>("");

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

  const [showTimePicker, setShowTimePicker] = useState(false);

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
    if (baggagePrices && baggagePrices[`${selectedSize}_price`]) {
      return baggagePrices[`${selectedSize}_price`];
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

  // Customer data fetching removed - no authentication required

  // Auto-fill form fields removed - no authentication required

  useEffect(() => {
    if (initialTime) {
      setHoursTime(initialTime);
      setDaysPickTime(initialTime);
      setValue("startTime_Hours", initialTime);
      setValue("startTime_Days", initialTime);
      setDateTimeHoursTouched(true);
      setDateTimeDaysTouched(true);
    }
  }, []);

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);

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
      try {
        await addToCart({
          item_type: "baggage",
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
        });
      } catch (cartError) {
        console.error("Failed to add item to cart:", cartError);
        // Continue with the rest of the function even if cart addition fails
      }

      if (onComplete) {
        onComplete({
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
        });
      }
    } catch (error) {
      console.error("Error in booking submission:", error);
      // You could add error handling UI here
    } finally {
      setIsSubmitting(false);
    }
  };

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
                      onClick={() => setShowTimePicker(true)}
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
                <>
                  <div>Item Name:</div>
                  <div className="font-medium">{watch("itemName")}</div>
                </>
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
                <>
                  <div>Flight Number:</div>
                  <div className="font-medium">{watch("flightNumber")}</div>
                </>
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
                <>
                  <div>End Date:</div>
                  <div className="font-medium">
                    {format(watchEndDateDays, "PPP")}
                  </div>
                </>
              )}

              <div className="text-base font-bold pt-2">Total Price:</div>
              <div className="text-base font-bold pt-2">
                Rp {calculateTotalPrice().toLocaleString()}
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

  // Function to fetch baggage prices if needed
  const fetchBaggagePrices = async () => {
    // This function is a placeholder since prices are passed via props
    // The actual implementation is in AirportBaggage.tsx
    console.log("Using baggage prices from props:", baggagePrices);
  };

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
  }, [durationType]);

  // Initialize time fields if initialTime is provided
  useEffect(() => {
    if (initialTime) {
      setHoursTime(initialTime);
      setDaysPickTime(initialTime);
      setValue("startTime_Hours", initialTime);
      setValue("startTime_Days", initialTime);
      setDateTimeHoursTouched(true);
      setDateTimeDaysTouched(true);
    }
  }, []);

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
          onClick={() => {
            if (step === steps.length - 1) {
              handleSubmit(onSubmit)();
            } else {
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
              Processing
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
