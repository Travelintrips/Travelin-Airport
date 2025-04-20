import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  Phone,
  Upload,
  Calendar,
  KeyRound,
} from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";

const registerSchema = z
  .object({
    name: z.string().min(2, { message: "Name must be at least 2 characters" }),
    email: z.string().email({ message: "Please enter a valid email address" }),
    password: z
      .string()
      .min(6, { message: "Password must be at least 6 characters" }),
    confirmPassword: z
      .string()
      .min(6, { message: "Password must be at least 6 characters" }),
    phone: z
      .string()
      .min(10, { message: "Phone number must be at least 10 digits" }),
    role: z.string().min(1, { message: "Please select a role" }),
    selfieImage: z.string().optional(),
    // Common fields for Driver and Staff
    address: z.string().optional(),
    birthPlace: z.string().optional(),
    birthDate: z.string().optional(),
    religion: z.string().optional(),
    tribe: z.string().optional(),
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
    // New fields for Driver Mitra and Driver Perusahaan
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    fullName: z.string().optional(),
    nickname: z.string().optional(),
    ktpAddress: z.string().optional(),
    phoneNumber: z.string().optional(),
    familyPhoneNumber: z.string().optional(),
    relativePhoneNumber: z.string().optional(),
    ktpNumber: z.string().optional(),
    // Vehicle fields for Driver Mitra
    vehicleName: z.string().optional(),
    vehicleType: z.string().optional(),
    vehicleBrand: z.string().optional(),
    plateNumber: z.string().optional(),
    vehicleYear: z.number().optional().or(z.string().optional()),
    vehicleColor: z.string().optional(),
    vehicleStatus: z.string().optional(),
    frontImage: z.string().optional(),
    backImage: z.string().optional(),
    sideImage: z.string().optional(),
    interiorImage: z.string().optional(),
    stnkImage: z.string().optional(),
    bpkbImage: z.string().optional(),
  })
  .refine(
    (data) => {
      // Validate that passwords match
      return data.password === data.confirmPassword;
    },
    {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    },
  )
  .refine(
    (data) => {
      // If role is Driver, require license number, expiry, and reference phone
      if (data.role === "Driver Mitra" || data.role === "Driver Perusahaan") {
        return (
          !!data.licenseNumber &&
          !!data.licenseExpiry &&
          (!!data.referencePhone ||
            !!data.familyPhoneNumber ||
            !!data.relativePhoneNumber)
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
          !!data.vehicleName &&
          !!data.vehicleType &&
          !!data.vehicleBrand &&
          !!data.plateNumber &&
          !!data.vehicleYear &&
          !!data.vehicleColor &&
          !!data.vehicleStatus &&
          !!data.frontImage &&
          !!data.backImage &&
          !!data.sideImage &&
          !!data.interiorImage &&
          !!data.stnkImage &&
          !!data.bpkbImage
        );
      }
      return true;
    },
    {
      message: "All vehicle information fields are required for Driver Mitra",
      path: ["vehicleName"],
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
  )
  .refine(
    (data) => {
      // If role is Driver Mitra or Driver Perusahaan, require personal information
      if (data.role === "Driver Mitra" || data.role === "Driver Perusahaan") {
        return (
          !!data.firstName &&
          !!data.lastName &&
          !!data.fullName &&
          !!data.ktpAddress &&
          !!data.phoneNumber &&
          (!!data.familyPhoneNumber || !!data.relativePhoneNumber) &&
          !!data.ktpNumber &&
          !!data.religion &&
          !!data.tribe &&
          !!data.selfieImage &&
          !!data.simImage &&
          !!data.kkImage &&
          !!data.ktpImage
        );
      }
      return true;
    },
    {
      message: "All personal information fields are required for drivers",
      path: ["firstName"],
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
      confirmPassword: "",
      phone: "",
      role: initialRole || "Customer",
      selfieImage: "",
      // Driver Mitra and Driver Perusahaan fields
      firstName: "",
      lastName: "",
      fullName: "",
      nickname: "",
      ktpAddress: "",
      phoneNumber: "",
      familyPhoneNumber: "",
      relativePhoneNumber: "",
      ktpNumber: "",
      licenseNumber: "",
      licenseExpiry: "",
      religion: "",
      tribe: "",
      // Vehicle fields
      vehicleName: "",
      vehicleType: "",
      vehicleBrand: "",
      plateNumber: "",
      vehicleYear: "",
      vehicleColor: "",
      vehicleStatus: "Tersedia",
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
      if (!data.kkImage) {
        setRegisterError("Please upload your Kartu Keluarga");
        setIsSubmitting(false);
        return;
      }
      if (data.role === "Driver Perusahaan" && !data.skckImage) {
        setRegisterError("Please upload your SKCK");
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

    // Validate vehicle uploads for Driver Mitra
    if (data.role === "Driver Mitra") {
      if (
        !data.frontImage ||
        !data.backImage ||
        !data.sideImage ||
        !data.interiorImage
      ) {
        setRegisterError("Please upload all vehicle photos");
        setIsSubmitting(false);
        return;
      }
      if (!data.stnkImage) {
        setRegisterError("Please upload your STNK");
        setIsSubmitting(false);
        return;
      }
      if (!data.bpkbImage) {
        setRegisterError("Please upload your BPKB");
        setIsSubmitting(false);
        return;
      }
    }

    try {
      // Upload images to storage if needed
      if (data.role === "Driver Mitra" || data.role === "Driver Perusahaan") {
        // Prepare document images for upload
        const documentImages: Record<string, string> = {};

        // Add userId to the documentImages object
        // First try to get it from the component state, or generate a temporary one
        documentImages.userId = userId || `temp_${Date.now()}`;

        if (data.selfieImage && data.selfieImage.startsWith("data:")) {
          documentImages.selfie = data.selfieImage;
        }
        if (data.ktpImage && data.ktpImage.startsWith("data:")) {
          documentImages.ktp = data.ktpImage;
        }
        if (data.simImage && data.simImage.startsWith("data:")) {
          documentImages.sim = data.simImage;
        }
        if (data.kkImage && data.kkImage.startsWith("data:")) {
          documentImages.kk = data.kkImage;
        }
        if (data.skckImage && data.skckImage.startsWith("data:")) {
          documentImages.skck = data.skckImage;
        }

        // For Driver Mitra, add vehicle images
        if (data.role === "Driver Mitra") {
          if (data.frontImage && data.frontImage.startsWith("data:")) {
            documentImages.front = data.frontImage;
          }
          if (data.backImage && data.backImage.startsWith("data:")) {
            documentImages.back = data.backImage;
          }
          if (data.sideImage && data.sideImage.startsWith("data:")) {
            documentImages.side = data.sideImage;
          }
          if (data.interiorImage && data.interiorImage.startsWith("data:")) {
            documentImages.interior = data.interiorImage;
          }
          if (data.stnkImage && data.stnkImage.startsWith("data:")) {
            documentImages.stnk = data.stnkImage;
          }
          if (data.bpkbImage && data.bpkbImage.startsWith("data:")) {
            documentImages.bpkb = data.bpkbImage;
          }
        }

        // Only upload if there are images to upload
        if (Object.keys(documentImages).length > 1) {
          // > 1 because we added userId
          try {
            const { data: uploadResult, error } =
              await uploadDocumentImages(documentImages);

            if (error) {
              console.error("Error uploading images:", error);
              setRegisterError("Failed to upload images. Please try again.");
              setIsSubmitting(false);
              return;
            }

            if (uploadResult) {
              // Update the form data with the uploaded URLs
              if (uploadResult.selfie) data.selfieImage = uploadResult.selfie;
              if (uploadResult.ktp) data.ktpImage = uploadResult.ktp;
              if (uploadResult.sim) data.simImage = uploadResult.sim;
              if (uploadResult.kk) data.kkImage = uploadResult.kk;
              if (uploadResult.skck) data.skckImage = uploadResult.skck;

              // For Driver Mitra, update vehicle image URLs
              if (data.role === "Driver Mitra") {
                if (uploadResult.front) data.frontImage = uploadResult.front;
                if (uploadResult.back) data.backImage = uploadResult.back;
                if (uploadResult.side) data.sideImage = uploadResult.side;
                if (uploadResult.interior)
                  data.interiorImage = uploadResult.interior;
                if (uploadResult.stnk) data.stnkImage = uploadResult.stnk;
                if (uploadResult.bpkb) data.bpkbImage = uploadResult.bpkb;
              }
            }
          } catch (error) {
            console.error("Error uploading images:", error);
            setRegisterError("Failed to upload images. Please try again.");
            setIsSubmitting(false);
            return;
          }
        }
      }

      // Call the onRegister callback with the form data
      await onRegister(data);

      // Show success notification
      toast({
        title: "Registration successful",
        description: "Your account has been created successfully.",
        duration: 5000,
      });

      // Reset form after successful submission
      registerForm.reset();
      setSelfieImage("");
      setBlinkDetected(false);
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
        <Toaster />
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
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
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
              <FormControl>
                <Select
                  disabled={initialRole ? true : false}
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Customer">Customer</SelectItem>
                    <SelectItem value="Driver Mitra">Driver Mitra</SelectItem>
                    <SelectItem value="Driver Perusahaan">
                      Driver Perusahaan
                    </SelectItem>
                    <SelectItem value="Staff">Staff</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Driver Mitra and Driver Perusahaan Fields */}
        {(registerForm.watch("role") === "Driver Mitra" ||
          registerForm.watch("role") === "Driver Perusahaan") && (
          <div className="space-y-4 border p-4 rounded-md">
            <h3 className="font-semibold text-lg">Data Driver</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={registerForm.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Depan</FormLabel>
                    <FormControl>
                      <Input placeholder="Nama Depan" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={registerForm.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Belakang</FormLabel>
                    <FormControl>
                      <Input placeholder="Nama Belakang" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={registerForm.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Lengkap</FormLabel>
                    <FormControl>
                      <Input placeholder="Nama Lengkap" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {registerForm.watch("role") === "Driver Perusahaan" && (
                <FormField
                  control={registerForm.control}
                  name="nickname"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama Panggilan</FormLabel>
                      <FormControl>
                        <Input placeholder="Nama Panggilan" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={registerForm.control}
                name="ktpAddress"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Alamat KTP</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Alamat sesuai KTP" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={registerForm.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nomor Telepon</FormLabel>
                    <FormControl>
                      <Input placeholder="08xxxxxxxxxx" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {registerForm.watch("role") === "Driver Mitra" ? (
                <FormField
                  control={registerForm.control}
                  name="familyPhoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nomor Telepon Keluarga</FormLabel>
                      <FormControl>
                        <Input placeholder="08xxxxxxxxxx" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <FormField
                  control={registerForm.control}
                  name="relativePhoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nomor Telepon Kerabat</FormLabel>
                      <FormControl>
                        <Input placeholder="08xxxxxxxxxx" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={registerForm.control}
                name="religion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Agama</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih Agama" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Islam">Islam</SelectItem>
                          <SelectItem value="Kristen">Kristen</SelectItem>
                          <SelectItem value="Katolik">Katolik</SelectItem>
                          <SelectItem value="Hindu">Hindu</SelectItem>
                          <SelectItem value="Buddha">Buddha</SelectItem>
                          <SelectItem value="Konghucu">Konghucu</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={registerForm.control}
                name="tribe"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Suku</FormLabel>
                    <FormControl>
                      <Input placeholder="Suku" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={registerForm.control}
                name="ktpNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nomor KTP</FormLabel>
                    <FormControl>
                      <Input placeholder="Nomor KTP" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={registerForm.control}
                name="licenseNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nomor SIM</FormLabel>
                    <FormControl>
                      <Input placeholder="Nomor SIM" {...field} />
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
                    <FormLabel>Masa Berlaku SIM</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                        <Input type="date" className="pl-10" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        )}

        {/* Vehicle Information for Driver Mitra */}
        {registerForm.watch("role") === "Driver Mitra" && (
          <div className="space-y-4 border p-4 rounded-md mt-4">
            <h3 className="font-semibold text-lg">Data Kendaraan Pribadi</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={registerForm.control}
                name="vehicleName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Kendaraan</FormLabel>
                    <FormControl>
                      <Input placeholder="Nama Kendaraan" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={registerForm.control}
                name="vehicleType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipe Kendaraan</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih Tipe" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SUV">SUV</SelectItem>
                          <SelectItem value="MPV">MPV</SelectItem>
                          <SelectItem value="PREMIUM">PREMIUM</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={registerForm.control}
                name="vehicleBrand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Merek</FormLabel>
                    <FormControl>
                      <Input placeholder="Merek Kendaraan" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={registerForm.control}
                name="plateNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nomor Plat</FormLabel>
                    <FormControl>
                      <Input placeholder="B 1234 ABC" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={registerForm.control}
                name="vehicleYear"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tahun Kendaraan</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="2020" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={registerForm.control}
                name="vehicleColor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Warna</FormLabel>
                    <FormControl>
                      <Input placeholder="Warna Kendaraan" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={registerForm.control}
                name="vehicleStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status Kendaraan</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Tersedia">Tersedia</SelectItem>
                          <SelectItem value="Dalam Perbaikan">
                            Dalam Perbaikan
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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

        {/* Document Upload Fields for Driver Mitra and Driver Perusahaan */}
        {(registerForm.watch("role") === "Driver Mitra" ||
          registerForm.watch("role") === "Driver Perusahaan") && (
          <div className="space-y-4 border p-4 rounded-md mt-4">
            <h3 className="font-semibold text-lg">Dokumen Driver</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* KTP Image Upload */}
              <FormField
                control={registerForm.control}
                name="ktpImage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Upload Foto KTP</FormLabel>
                    <FormControl>
                      <div className="flex flex-col space-y-2">
                        <div className="flex items-center space-x-2">
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  if (event.target?.result) {
                                    registerForm.setValue(
                                      "ktpImage",
                                      event.target.result as string,
                                    );
                                  }
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                          <Upload className="h-5 w-5 text-muted-foreground" />
                        </div>
                        {field.value && (
                          <div className="mt-2">
                            <img
                              src={field.value}
                              alt="KTP"
                              className="w-full max-h-32 object-contain border rounded"
                            />
                          </div>
                        )}
                        {existingImages.ktp && !field.value && (
                          <div className="mt-2">
                            <p className="text-xs text-muted-foreground mb-1">
                              Existing KTP Image:
                            </p>
                            <img
                              src={existingImages.ktp}
                              alt="KTP"
                              className="w-full max-h-32 object-contain border rounded"
                            />
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* SIM Image Upload */}
              <FormField
                control={registerForm.control}
                name="simImage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Upload Foto SIM</FormLabel>
                    <FormControl>
                      <div className="flex flex-col space-y-2">
                        <div className="flex items-center space-x-2">
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  if (event.target?.result) {
                                    registerForm.setValue(
                                      "simImage",
                                      event.target.result as string,
                                    );
                                  }
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                          <Upload className="h-5 w-5 text-muted-foreground" />
                        </div>
                        {field.value && (
                          <div className="mt-2">
                            <img
                              src={field.value}
                              alt="SIM"
                              className="w-full max-h-32 object-contain border rounded"
                            />
                          </div>
                        )}
                        {existingImages.sim && !field.value && (
                          <div className="mt-2">
                            <p className="text-xs text-muted-foreground mb-1">
                              Existing SIM Image:
                            </p>
                            <img
                              src={existingImages.sim}
                              alt="SIM"
                              className="w-full max-h-32 object-contain border rounded"
                            />
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* KK Image Upload */}
              <FormField
                control={registerForm.control}
                name="kkImage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Upload Foto Kartu Keluarga</FormLabel>
                    <FormControl>
                      <div className="flex flex-col space-y-2">
                        <div className="flex items-center space-x-2">
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  if (event.target?.result) {
                                    registerForm.setValue(
                                      "kkImage",
                                      event.target.result as string,
                                    );
                                  }
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                          <Upload className="h-5 w-5 text-muted-foreground" />
                        </div>
                        {field.value && (
                          <div className="mt-2">
                            <img
                              src={field.value}
                              alt="Kartu Keluarga"
                              className="w-full max-h-32 object-contain border rounded"
                            />
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* SKCK Image Upload */}
              <FormField
                control={registerForm.control}
                name="skckImage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Upload SKCK</FormLabel>
                    <FormControl>
                      <div className="flex flex-col space-y-2">
                        <div className="flex items-center space-x-2">
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  if (event.target?.result) {
                                    registerForm.setValue(
                                      "skckImage",
                                      event.target.result as string,
                                    );
                                  }
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                          <Upload className="h-5 w-5 text-muted-foreground" />
                        </div>
                        {field.value && (
                          <div className="mt-2">
                            <img
                              src={field.value}
                              alt="SKCK"
                              className="w-full max-h-32 object-contain border rounded"
                            />
                          </div>
                        )}
                        {existingImages.skck && !field.value && (
                          <div className="mt-2">
                            <p className="text-xs text-muted-foreground mb-1">
                              Existing SKCK Image:
                            </p>
                            <img
                              src={existingImages.skck}
                              alt="SKCK"
                              className="w-full max-h-32 object-contain border rounded"
                            />
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        )}

        {/* Vehicle Document Upload Fields for Driver Mitra */}
        {registerForm.watch("role") === "Driver Mitra" && (
          <div className="space-y-4 border p-4 rounded-md mt-4">
            <h3 className="font-semibold text-lg">Dokumen Kendaraan</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Front Image Upload */}
              <FormField
                control={registerForm.control}
                name="frontImage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Upload Foto Kendaraan Depan</FormLabel>
                    <FormControl>
                      <div className="flex flex-col space-y-2">
                        <div className="flex items-center space-x-2">
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  if (event.target?.result) {
                                    registerForm.setValue(
                                      "frontImage",
                                      event.target.result as string,
                                    );
                                  }
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                          <Upload className="h-5 w-5 text-muted-foreground" />
                        </div>
                        {field.value && (
                          <div className="mt-2">
                            <img
                              src={field.value}
                              alt="Kendaraan Depan"
                              className="w-full max-h-32 object-contain border rounded"
                            />
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Back Image Upload */}
              <FormField
                control={registerForm.control}
                name="backImage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Upload Foto Kendaraan Belakang</FormLabel>
                    <FormControl>
                      <div className="flex flex-col space-y-2">
                        <div className="flex items-center space-x-2">
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  if (event.target?.result) {
                                    registerForm.setValue(
                                      "backImage",
                                      event.target.result as string,
                                    );
                                  }
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                          <Upload className="h-5 w-5 text-muted-foreground" />
                        </div>
                        {field.value && (
                          <div className="mt-2">
                            <img
                              src={field.value}
                              alt="Kendaraan Belakang"
                              className="w-full max-h-32 object-contain border rounded"
                            />
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Side Image Upload */}
              <FormField
                control={registerForm.control}
                name="sideImage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Upload Foto Kendaraan Samping</FormLabel>
                    <FormControl>
                      <div className="flex flex-col space-y-2">
                        <div className="flex items-center space-x-2">
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  if (event.target?.result) {
                                    registerForm.setValue(
                                      "sideImage",
                                      event.target.result as string,
                                    );
                                  }
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                          <Upload className="h-5 w-5 text-muted-foreground" />
                        </div>
                        {field.value && (
                          <div className="mt-2">
                            <img
                              src={field.value}
                              alt="Kendaraan Samping"
                              className="w-full max-h-32 object-contain border rounded"
                            />
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Interior Image Upload */}
              <FormField
                control={registerForm.control}
                name="interiorImage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Upload Foto Interior</FormLabel>
                    <FormControl>
                      <div className="flex flex-col space-y-2">
                        <div className="flex items-center space-x-2">
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  if (event.target?.result) {
                                    registerForm.setValue(
                                      "interiorImage",
                                      event.target.result as string,
                                    );
                                  }
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                          <Upload className="h-5 w-5 text-muted-foreground" />
                        </div>
                        {field.value && (
                          <div className="mt-2">
                            <img
                              src={field.value}
                              alt="Interior"
                              className="w-full max-h-32 object-contain border rounded"
                            />
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* STNK Image Upload */}
              <FormField
                control={registerForm.control}
                name="stnkImage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Upload STNK</FormLabel>
                    <FormControl>
                      <div className="flex flex-col space-y-2">
                        <div className="flex items-center space-x-2">
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  if (event.target?.result) {
                                    registerForm.setValue(
                                      "stnkImage",
                                      event.target.result as string,
                                    );
                                  }
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                          <Upload className="h-5 w-5 text-muted-foreground" />
                        </div>
                        {field.value && (
                          <div className="mt-2">
                            <img
                              src={field.value}
                              alt="STNK"
                              className="w-full max-h-32 object-contain border rounded"
                            />
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* BPKB Image Upload */}
              <FormField
                control={registerForm.control}
                name="bpkbImage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Upload BPKB</FormLabel>
                    <FormControl>
                      <div className="flex flex-col space-y-2">
                        <div className="flex items-center space-x-2">
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  if (event.target?.result) {
                                    registerForm.setValue(
                                      "bpkbImage",
                                      event.target.result as string,
                                    );
                                  }
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                          <Upload className="h-5 w-5 text-muted-foreground" />
                        </div>
                        {field.value && (
                          <div className="mt-2">
                            <img
                              src={field.value}
                              alt="BPKB"
                              className="w-full max-h-32 object-contain border rounded"
                            />
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        )}

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
          {isLoading || isSubmitting ? "Creating account..." : "Submit"}
        </Button>
      </form>
    </Form>
  );
};

export default RegistrationForm;
