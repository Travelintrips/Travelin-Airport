import React, { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, isSameDay } from "date-fns";
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

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  email: z.string().email({ message: "Please enter a valid email address" }),
  phone: z
    .string()
    .min(8, { message: "Phone number must be at least 8 characters" }),
  flightNumber: z.string().optional(),
  airport: z.string({ required_error: "Please select an airport" }),
  terminal: z.string({ required_error: "Please select a terminal" }),
  // Separate fields for Hours mode
  startDate_Hours: z
    .date({ required_error: "Please select a date" })
    .optional(),
  startTime_Hours: z.string().optional(),
  hours: z.number().min(1).optional(),
  // Separate fields for Days mode
  startDate_Days: z.date({ required_error: "Please select a date" }).optional(),
  endDate_Days: z.date({ required_error: "Please select a date" }).optional(),
  startTime_Days: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface BookingFormProps {
  selectedSize?: "small" | "medium" | "large";
  onComplete?: (data: any) => void;
  onCancel?: () => void;
}

const BookingForm = ({
  selectedSize = "small",
  onComplete,
  onCancel,
}: BookingFormProps) => {
  const [step, setStep] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [durationType, setDurationType] = useState<"hours" | "days">("hours");
  const [selectedAirport, setSelectedAirport] =
    useState<string>("soekarno_hatta");
  const [startDateHoursTouched, setStartDateHoursTouched] = useState(false);
  const [startDateDaysTouched, setStartDateDaysTouched] = useState(false);
  const [dateTimeHoursTouched, setDateTimeHoursTouched] = useState(false);
  const [dateTimeDaysTouched, setDateTimeDaysTouched] = useState(false);
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

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onChange", // 👉 ini penting untuk validasi realtime
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      flightNumber: "",
      airport: "soekarno_hatta",
      terminal: "3_DOMESTIK",
      startDate_Hours: new Date(),
      startTime_Hours: "",
      hours: 1,
      startDate_Days: new Date(),
      endDate_Days: new Date(new Date().setDate(new Date().getDate() + 1)),
      startTime_Days: "",
    },
  });

  const watchStartDateHours = watch("startDate_Hours");
  const watchStartTimeHours = watch("startTime_Hours");
  const watchHours = watch("hours");

  const watchStartDateDays = watch("startDate_Days");
  const watchEndDateDays = watch("endDate_Days");
  const watchStartTimeDays = watch("startTime_Days");

  const isDurationStepValid =
    (durationType === "hours" &&
      startDateHoursTouched &&
      !!watchHours &&
      watchHours >= 1 &&
      watchHours <= 4 &&
      !!watchStartTimeHours) ||
    (durationType === "days" &&
      startDateDaysTouched &&
      !!watchEndDateDays &&
      !!watchStartTimeDays);

  const getPricePerUnit = () => {
    switch (selectedSize) {
      case "small":
        return 70000;
      case "medium":
        return 90000;
      case "large":
        return 120000;
      default:
        return 70000;
    }
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

  const onSubmit = (data: FormValues) => {
    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);

      if (onComplete) {
        const calculatedDuration =
          durationType === "days"
            ? data.endDate_Days
              ? Math.ceil(
                  (data.endDate_Days.getTime() -
                    data.startDate_Days.getTime()) /
                    (1000 * 60 * 60 * 24),
                )
              : 1
            : Math.ceil((data.hours || 0) / 4); // 4-jam blok

        onComplete({
          name: data.name,
          phone: data.phone,
          email: data.email,
          contact: `${data.email}\n${data.phone}`, // tampilkan email + phone
          flightNumber: data.flightNumber || "-",
          baggageSize:
            selectedSize === "small"
              ? "Small"
              : selectedSize === "medium"
                ? "Medium"
                : "Large",
          price: calculateTotalPrice(),
          duration: calculatedDuration,
          storageLocation: "Terminal 1, Level 1", // bisa diganti dinamis
          bookingId: `BG-${Math.floor(Math.random() * 10000)}`,
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
    }, 1500);
  };

  const isStepValid = () => {
    if (step === 0) return isValid; // hanya validasi form biasa
    if (step === 1) {
      // Validasi durasi dengan pengecekan waktu untuk tanggal hari ini
      if (
        durationType === "hours" &&
        watchStartDateHours &&
        watchStartTimeHours
      ) {
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
            (selectedHour === currentHour && selectedMinute >= currentMinute);

          return (
            isValid &&
            !!watchHours &&
            watchHours >= 1 &&
            watchHours <= 4 &&
            isTimeValid
          );
        }
      } else if (
        durationType === "days" &&
        watchStartDateDays &&
        watchStartTimeDays
      ) {
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
            (selectedHour === currentHour && selectedMinute >= currentMinute);

          return isValid && !!watchEndDateDays && isTimeValid;
        }
      }
      return isValid && isDurationStepValid;
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
            <Input id="name" placeholder="John Doe" {...register("name")} />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="john@example.com"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              placeholder="+62 812 3456 7890"
              {...register("phone")}
            />
            {errors.phone && (
              <p className="text-sm text-red-500">{errors.phone.message}</p>
            )}
          </div>

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
            onValueChange={(value) =>
              setDurationType(value as "hours" | "days")
            }
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
                  onChange={(e) => setValue("hours", parseInt(e.target.value))}
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
                              setValue("startTime_Hours", e.target.value);
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
                          setValue("startDate_Days", date);
                          setStartDateDaysTouched(true);

                          // Always set end date to next day
                          const nextDay = new Date(date);
                          nextDay.setDate(date.getDate() + 1);
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
                      setValue("startTime_Days", e.target.value);
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
                      onSelect={(date) =>
                        date && setValue("endDate_Days", date)
                      }
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
      title: "Review & Payment",
      description: "Confirm your booking details",
      content: (
        <div className="space-y-4">
          <div className="rounded-lg bg-muted p-4">
            <h3 className="font-medium mb-2">Booking Summary</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Baggage Size:</div>
              <div className="font-medium capitalize">{selectedSize}</div>

              <div>Name:</div>
              <div className="font-medium">{watch("name")}</div>

              <div>Contact:</div>
              <div className="font-medium">
                {watch("email")}
                <br />
                {watch("phone")}
              </div>

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

          <div className="border rounded-lg p-4">
            <h3 className="font-medium mb-2">Payment Method</h3>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="h-20 flex flex-col items-center justify-center"
              >
                <div className="text-2xl mb-1">💳</div>
                <div className="text-sm">Credit Card</div>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex flex-col items-center justify-center"
              >
                <div className="text-2xl mb-1">🏦</div>
                <div className="text-sm">Bank Transfer</div>
              </Button>
            </div>
          </div>
        </div>
      ),
    },
  ];

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
          onClick={() =>
            step === steps.length - 1
              ? handleSubmit(onSubmit)()
              : setStep(step + 1)
          }
          disabled={!isStepValid() || isSubmitting}
          className="bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing
            </>
          ) : step === steps.length - 1 ? (
            "Complete Booking"
          ) : (
            "Next"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default BookingForm;
