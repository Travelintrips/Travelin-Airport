import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Mail, Lock, User, Phone } from "lucide-react";
import { supabase } from "@/lib/supabase";
import SelfieCapture from "./SelfieCapture";
import { uploadDocumentImages } from "@/lib/edgeFunctions";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const registerSchema = z
  .object({
    name: z.string().min(2, { message: "Name must be at least 2 characters" }),
    email: z.string().email({ message: "Please enter a valid email address" }),
    password: z
      .string()
      .min(6, { message: "Password must be at least 6 characters" }),
    phone: z
      .string()
      .min(10, { message: "Phone number must be at least 10 digits" }),
    role: z.string().min(1, { message: "Please select a role" }),
    selfieImage: z.string().optional(),
    // Driver fields (common)
    licenseNumber: z.string().optional(),
    licenseExpiry: z.string().optional(),
    referencePhone: z.string().optional(),
    ktpImage: z.string().optional(),
    simImage: z.string().optional(),
    // Driver Perusahaan fields
    skckImage: z.string().optional(),
    // Driver Mitra fields (vehicle information)
    color: z.string().optional(),
    license_plate: z.string().optional(),
    make: z.string().optional(),
    model: z.string().optional(),
    year: z.number().optional().or(z.string().optional()),
    type: z.string().optional(),
    category: z.string().optional(),
    seats: z.number().optional().or(z.string().optional()),
    transmission: z.string().optional(),
    fuel_type: z.string().optional(),
    // Additional Driver Mitra fields
    kkImage: z.string().optional(),
    stnkImage: z.string().optional(),
    // Staff fields
    department: z.string().optional(),
    position: z.string().optional(),
    employeeId: z.string().optional(),
    idCardImage: z.string().optional(),
  })
  .refine(
    (data) => {
      // If role is Driver, require license number, expiry, and reference phone
      if (data.role === "Driver Mitra" || data.role === "Driver Perusahaan") {
        return (
          !!data.licenseNumber && !!data.licenseExpiry && !!data.referencePhone
        );
      }
      return true;
    },
    {
      message:
        "License number, expiry date, and reference phone are required for drivers",
      path: ["licenseNumber"],
    },
  )
  .refine(
    (data) => {
      // If role is Driver Perusahaan, require SKCK
      if (data.role === "Driver Perusahaan") {
        return !!data.skckImage;
      }
      return true;
    },
    {
      message: "SKCK document is required for Driver Perusahaan",
      path: ["skckImage"],
    },
  )
  .refine(
    (data) => {
      // If role is Driver Mitra, require vehicle information
      if (data.role === "Driver Mitra") {
        return (
          !!data.make &&
          !!data.model &&
          !!data.year &&
          !!data.license_plate &&
          !!data.color &&
          !!data.kkImage &&
          !!data.stnkImage
        );
      }
      return true;
    },
    {
      message:
        "Vehicle information, KK, and STNK are required for Driver Mitra",
      path: ["make"],
    },
  )
  .refine(
    (data) => {
      // If role is Staff, require department, position, and employee ID
      if (data.role === "Staff") {
        return !!data.department && !!data.position && !!data.employeeId;
      }
      return true;
    },
    {
      message: "Department, position, and employee ID are required for staff",
      path: ["department"],
    },
  );

export type RegisterFormValues = z.infer<typeof registerSchema>;

interface RegistrationFormProps {
  onRegister: (data: RegisterFormValues) => void;
  isLoading?: boolean;
  showPassword: boolean;
  togglePasswordVisibility: () => void;
  initialRole?: string;
}

const RegistrationForm: React.FC<RegistrationFormProps> = ({
  onRegister,
  isLoading = false,
  showPassword,
  togglePasswordVisibility,
  initialRole,
}) => {
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selfieImage, setSelfieImage] = useState<string>("");
  const [blinkDetected, setBlinkDetected] = useState(false);
  const [selfieRequired, setSelfieRequired] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [existingImages, setExistingImages] = useState({
    selfie: "",
    ktp: "",
    sim: "",
    skck: "",
    idCard: "",
  });

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      phone: "",
      role: initialRole || "Customer",
      selfieImage: "",
      licenseNumber: "",
      licenseExpiry: "",
      referencePhone: "",
      ktpImage: "",
      simImage: "",
      // Driver Perusahaan fields
      skckImage: "",
      // Driver Mitra fields
      color: "",
      license_plate: "",
      make: "",
      model: "",
      year: "",
      type: "",
      category: "",
      seats: "",
      transmission: "",
      fuel_type: "",
      kkImage: "",
      stnkImage: "",
      // Staff fields
      department: "",
      position: "",
      employeeId: "",
      idCardImage: "",
    },
  });

  // Fetch existing user data if userId is available
  useEffect(() => {
    // Set initial role if provided
    if (initialRole) {
      registerForm.setValue("role", initialRole);
    }

    const fetchUserData = async () => {
      // Get userId from localStorage if available (for editing existing user)
      const storedUserId = localStorage.getItem("userId");
      if (storedUserId) {
        setUserId(storedUserId);

        try {
          // Fetch user data
          const { data: userData, error: userError } = await supabase
            .from("users")
            .select("*")
            .eq("id", storedUserId)
            .single();

          if (userError) throw userError;

          if (userData) {
            // Set selfie URL if available
            if (userData.selfie_url) {
              setExistingImages((prev) => ({
                ...prev,
                selfie: userData.selfie_url,
              }));
              // Set selfie image from existing URL
              setSelfieImage(userData.selfie_url);
              registerForm.setValue("selfieImage", userData.selfie_url);
            }

            // Check role and fetch additional data
            const userRole = localStorage.getItem("userRole");

            if (
              userRole === "Driver Mitra" ||
              userRole === "Driver Perusahaan"
            ) {
              const { data: driverData, error: driverError } = await supabase
                .from("drivers")
                .select("*")
                .eq("id", storedUserId)
                .single();

              if (!driverError && driverData) {
                // Set driver document URLs if available
                if (driverData.ktp_url) {
                  setExistingImages((prev) => ({
                    ...prev,
                    ktp: driverData.ktp_url,
                  }));
                  registerForm.setValue("ktpImage", driverData.ktp_url);
                }
                if (driverData.sim_url) {
                  setExistingImages((prev) => ({
                    ...prev,
                    sim: driverData.sim_url,
                  }));
                  registerForm.setValue("simImage", driverData.sim_url);
                }
                if (driverData.skck_url) {
                  setExistingImages((prev) => ({
                    ...prev,
                    skck: driverData.skck_url,
                  }));
                  registerForm.setValue("skckImage", driverData.skck_url);
                }
              }
            } else if (userRole === "Staff") {
              const { data: staffData, error: staffError } = await supabase
                .from("staff")
                .select("*")
                .eq("id", storedUserId)
                .single();

              if (!staffError && staffData) {
                // Set staff document URL if available
                if (staffData.id_card_url) {
                  setExistingImages((prev) => ({
                    ...prev,
                    idCard: staffData.id_card_url,
                  }));
                  registerForm.setValue("idCardImage", staffData.id_card_url);
                }
              }
            }
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      }
    };

    fetchUserData();
  }, [initialRole]);

  const handleRegisterSubmit = async (data: RegisterFormValues) => {
    setRegisterError(null);
    setIsSubmitting(true);

    // Check if selfie is required and not provided
    if (selfieRequired && !selfieImage) {
      setRegisterError("Silakan ambil foto selfie terlebih dahulu");
      setIsSubmitting(false);
      return;
    }

    // Add selfie image to form data
    data.selfieImage = selfieImage;

    // Validate document uploads based on role
    if (data.role === "Driver Mitra" || data.role === "Driver Perusahaan") {
      if (!data.ktpImage) {
        setRegisterError("Please upload your KTP (ID card)");
        setIsSubmitting(false);
        return;
      }
      if (!data.simImage) {
        setRegisterError("Please upload your SIM (Driver's License)");
        setIsSubmitting(false);
        return;
      }
    } else if (data.role === "Staff") {
      if (!data.idCardImage) {
        setRegisterError("Please upload your ID Card");
        setIsSubmitting(false);
        return;
      }
    }

    try {
      // Call the onRegister callback with the form data
      onRegister(data);
    } catch (error) {
      setRegisterError("An unexpected error occurred");
      console.error("Registration error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...registerForm}>
      <form
        onSubmit={registerForm.handleSubmit(handleRegisterSubmit)}
        className="space-y-4"
      >
        <FormField
          control={registerForm.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                  <Input placeholder="John Doe" className="pl-10" {...field} />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={registerForm.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                  <Input
                    placeholder="email@example.com"
                    className="pl-10"
                    {...field}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={registerForm.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="******"
                    className="pl-10"
                    {...field}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1"
                    onClick={togglePasswordVisibility}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <Eye className="h-5 w-5 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={registerForm.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone Number</FormLabel>
              <FormControl>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                  <Input
                    placeholder="+1234567890"
                    className="pl-10"
                    {...field}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={registerForm.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <Select
                onValueChange={(value) => {
                  field.onChange(value);
                  // Reset role-specific fields when role changes
                  if (
                    value !== "Driver Mitra" &&
                    value !== "Driver Perusahaan"
                  ) {
                    registerForm.setValue("licenseNumber", "");
                    registerForm.setValue("licenseExpiry", "");
                    registerForm.setValue("referencePhone", "");
                    registerForm.setValue("ktpImage", "");
                    registerForm.setValue("simImage", "");
                  }
                  if (value !== "Driver Perusahaan") {
                    registerForm.setValue("skckImage", "");
                  }
                  if (value !== "Driver Mitra") {
                    registerForm.setValue("color", "");
                    registerForm.setValue("license_plate", "");
                    registerForm.setValue("make", "");
                    registerForm.setValue("model", "");
                    registerForm.setValue("year", "");
                    registerForm.setValue("type", "");
                    registerForm.setValue("category", "");
                    registerForm.setValue("seats", "");
                    registerForm.setValue("transmission", "");
                    registerForm.setValue("fuel_type", "");
                    registerForm.setValue("kkImage", "");
                    registerForm.setValue("stnkImage", "");
                  }
                  if (value !== "Staff") {
                    registerForm.setValue("department", "");
                    registerForm.setValue("position", "");
                    registerForm.setValue("employeeId", "");
                    registerForm.setValue("idCardImage", "");
                  }
                }}
                defaultValue={field.value}
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Customer">Customer</SelectItem>
                  <SelectItem value="Staff">Staff</SelectItem>
                  <SelectItem value="Driver Mitra">Driver Mitra</SelectItem>
                  <SelectItem value="Driver Perusahaan">
                    Driver Perusahaan
                  </SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Role-specific fields */}
        {(registerForm.watch("role") === "Driver Mitra" ||
          registerForm.watch("role") === "Driver Perusahaan") && (
          <div className="space-y-4 border p-4 rounded-md bg-muted/30">
            <h3 className="font-medium">Driver Information</h3>

            <FormField
              control={registerForm.control}
              name="licenseNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>License Number (SIM)</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter license number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={registerForm.control}
              name="licenseExpiry"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>License Expiry Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={registerForm.control}
              name="referencePhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reference Phone Number</FormLabel>
                  <FormControl>
                    <Input placeholder="+1234567890" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>KTP Image</FormLabel>
              <div className="relative">
                <Input
                  type="file"
                  accept="image/*"
                  id="ktp-upload"
                  className="cursor-pointer"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const imageData = event.target?.result as string;
                        if (imageData) {
                          registerForm.setValue("ktpImage", imageData);
                        }
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </div>
              {existingImages.ktp && (
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground mb-1">
                    Existing KTP Image:
                  </p>
                  <img
                    src={existingImages.ktp}
                    alt="KTP"
                    className="w-full max-h-32 object-contain mb-2 border rounded"
                  />
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Upload a photo of your KTP (ID card) - Required for driver
                registration
              </p>
            </div>

            <div className="space-y-2">
              <FormLabel>SIM Image</FormLabel>
              <div className="relative">
                <Input
                  type="file"
                  accept="image/*"
                  id="sim-upload"
                  className="cursor-pointer"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const imageData = event.target?.result as string;
                        if (imageData) {
                          registerForm.setValue("simImage", imageData);
                        }
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </div>
              {existingImages.sim && (
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground mb-1">
                    Existing SIM Image:
                  </p>
                  <img
                    src={existingImages.sim}
                    alt="SIM"
                    className="w-full max-h-32 object-contain mb-2 border rounded"
                  />
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Upload a photo of your SIM (Driver's License) - Required for
                driver registration
              </p>
            </div>

            {/* Driver Perusahaan specific fields */}
            {registerForm.watch("role") === "Driver Perusahaan" && (
              <div className="space-y-2 mt-4 pt-4 border-t border-border">
                <h4 className="font-medium">Driver Perusahaan Documents</h4>
                <FormLabel>SKCK Image</FormLabel>
                <div className="relative">
                  <Input
                    type="file"
                    accept="image/*"
                    id="skck-upload"
                    className="cursor-pointer"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const imageData = event.target?.result as string;
                          if (imageData) {
                            registerForm.setValue("skckImage", imageData);
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </div>
                {existingImages.skck && (
                  <div className="mt-2">
                    <p className="text-xs text-muted-foreground mb-1">
                      Existing SKCK Image:
                    </p>
                    <img
                      src={existingImages.skck}
                      alt="SKCK"
                      className="w-full max-h-32 object-contain mb-2 border rounded"
                    />
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Upload a photo of your SKCK (Police Clearance Certificate) -
                  Required for Driver Perusahaan
                </p>
              </div>
            )}

            {/* Driver Mitra specific fields - Vehicle Information */}
            {registerForm.watch("role") === "Driver Mitra" && (
              <div className="space-y-4 mt-4 pt-4 border-t border-border">
                <h4 className="font-medium">Vehicle Information</h4>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={registerForm.control}
                    name="make"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Make</FormLabel>
                        <FormControl>
                          <Input placeholder="Toyota" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registerForm.control}
                    name="model"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Model</FormLabel>
                        <FormControl>
                          <Input placeholder="Avanza" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={registerForm.control}
                    name="year"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Year</FormLabel>
                        <FormControl>
                          <Input placeholder="2020" type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registerForm.control}
                    name="color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Color</FormLabel>
                        <FormControl>
                          <Input placeholder="Silver" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={registerForm.control}
                  name="license_plate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>License Plate</FormLabel>
                      <FormControl>
                        <Input placeholder="B 1234 CD" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={registerForm.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="SUV">SUV</SelectItem>
                            <SelectItem value="Sedan">Sedan</SelectItem>
                            <SelectItem value="MPV">MPV</SelectItem>
                            <SelectItem value="Hatchback">Hatchback</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registerForm.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Economy">Economy</SelectItem>
                            <SelectItem value="Standard">Standard</SelectItem>
                            <SelectItem value="Premium">Premium</SelectItem>
                            <SelectItem value="Luxury">Luxury</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={registerForm.control}
                    name="seats"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Seats</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select seats" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="2">2</SelectItem>
                            <SelectItem value="4">4</SelectItem>
                            <SelectItem value="5">5</SelectItem>
                            <SelectItem value="7">7</SelectItem>
                            <SelectItem value="8">8</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registerForm.control}
                    name="transmission"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Transmission</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select transmission" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Manual">Manual</SelectItem>
                            <SelectItem value="Automatic">Automatic</SelectItem>
                            <SelectItem value="CVT">CVT</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={registerForm.control}
                  name="fuel_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fuel Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select fuel type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Petrol">Petrol</SelectItem>
                          <SelectItem value="Diesel">Diesel</SelectItem>
                          <SelectItem value="Electric">Electric</SelectItem>
                          <SelectItem value="Hybrid">Hybrid</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2 mt-4 pt-4 border-t border-border">
                  <h4 className="font-medium">Required Documents</h4>

                  <div className="space-y-2">
                    <FormLabel>KK Image (Family Card)</FormLabel>
                    <div className="relative">
                      <Input
                        type="file"
                        accept="image/*"
                        id="kk-upload"
                        className="cursor-pointer"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const imageData = event.target?.result as string;
                              if (imageData) {
                                registerForm.setValue("kkImage", imageData);
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </div>
                    {registerForm.watch("kkImage") && (
                      <div className="mt-2">
                        <p className="text-xs text-muted-foreground mb-1">
                          Selected KK Image:
                        </p>
                        <img
                          src={registerForm.watch("kkImage")}
                          alt="KK"
                          className="w-full max-h-32 object-contain mb-2 border rounded"
                        />
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Upload a photo of your KK (Family Card) - Required for
                      Driver Mitra
                    </p>
                  </div>

                  <div className="space-y-2">
                    <FormLabel>STNK Image (Vehicle Registration)</FormLabel>
                    <div className="relative">
                      <Input
                        type="file"
                        accept="image/*"
                        id="stnk-upload"
                        className="cursor-pointer"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const imageData = event.target?.result as string;
                              if (imageData) {
                                registerForm.setValue("stnkImage", imageData);
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </div>
                    {registerForm.watch("stnkImage") && (
                      <div className="mt-2">
                        <p className="text-xs text-muted-foreground mb-1">
                          Selected STNK Image:
                        </p>
                        <img
                          src={registerForm.watch("stnkImage")}
                          alt="STNK"
                          className="w-full max-h-32 object-contain mb-2 border rounded"
                        />
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Upload a photo of your STNK (Vehicle Registration) -
                      Required for Driver Mitra
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {registerForm.watch("role") === "Staff" && (
          <div className="space-y-4 border p-4 rounded-md bg-muted/30">
            <h3 className="font-medium">Staff Information</h3>

            <FormField
              control={registerForm.control}
              name="department"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Department</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter department" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={registerForm.control}
              name="position"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Position</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter position" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={registerForm.control}
              name="employeeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Employee ID</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter employee ID" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>ID Card Image</FormLabel>
              <div className="relative">
                <Input
                  type="file"
                  accept="image/*"
                  id="idcard-upload"
                  className="cursor-pointer"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const imageData = event.target?.result as string;
                        if (imageData) {
                          registerForm.setValue("idCardImage", imageData);
                        }
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </div>
              {existingImages.idCard && (
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground mb-1">
                    Existing ID Card Image:
                  </p>
                  <img
                    src={existingImages.idCard}
                    alt="ID Card"
                    className="w-full max-h-32 object-contain mb-2 border rounded"
                  />
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Upload a photo of your ID Card - Required for staff registration
              </p>
            </div>
          </div>
        )}

        {/* Selfie Capture Component */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <FormLabel>Selfie Verification</FormLabel>
          </div>
          <SelfieCapture
            onCapture={(image) => {
              setSelfieImage(image);
              registerForm.setValue("selfieImage", image);
            }}
            onBlinkDetected={() => setBlinkDetected(true)}
            blinkDetected={blinkDetected}
          />
          {existingImages.selfie && (
            <div className="mt-2">
              <p className="text-xs text-muted-foreground mb-1">
                Existing Selfie Image:
              </p>
              <img
                src={existingImages.selfie}
                alt="Selfie"
                className="w-full max-h-32 object-contain mb-2 border rounded"
              />
            </div>
          )}
          {!selfieImage && !existingImages.selfie && (
            <p className="text-xs text-muted-foreground">
              Silakan ambil atau upload foto selfie untuk verifikasi
            </p>
          )}
        </div>

        {registerError && (
          <div className="text-sm text-destructive mb-2">{registerError}</div>
        )}
        <Button
          type="submit"
          className="w-full"
          disabled={
            isLoading || isSubmitting || (selfieRequired && !selfieImage)
          }
        >
          {isLoading || isSubmitting ? "Creating account..." : "Create Account"}
        </Button>
      </form>
    </Form>
  );
};

export default RegistrationForm;
