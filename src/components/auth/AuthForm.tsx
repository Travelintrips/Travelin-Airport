import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Mail, Lock, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import RegistrationForm, { RegisterFormValues } from "./RegistrationForm";
import { uploadDocumentImages } from "@/lib/edgeFunctions";
import { useNavigate, useLocation } from "react-router-dom";
import AuthModal from "./AuthModal";
import useAuth from "@/hooks/useAuth";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

interface AuthFormProps {
  onLogin?: (data: LoginFormValues) => void;
  onRegister?: (data: RegisterFormValues) => void;
  isLoading?: boolean;
  onAuthStateChange?: (state: boolean) => void;
  initialMode?: "signin" | "register";
  initialTab?: "login" | "register";
  onClose?: () => void;
}

const AuthForm: React.FC<AuthFormProps> = ({
  onLogin = () => {},
  onRegister = () => {},
  isLoading = false,
  onAuthStateChange,
  initialMode = "login",
  initialTab,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<"login" | "register">(
    initialTab || (initialMode === "signin" ? "login" : "register"),
  );
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const authUserStr = localStorage.getItem("auth_user");
    if (authUserStr) {
      try {
        const authUser = JSON.parse(authUserStr);
        console.log("Found auth user in localStorage:", authUser);
        if (authUser && authUser.id) {
          console.log("User found in localStorage");
          if (onAuthStateChange) {
            onAuthStateChange(true);
          }
        }
      } catch (e) {
        console.error("Error parsing auth_user from localStorage:", e);
      }
    }
  }, [onAuthStateChange]);

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLoginSubmit = async (data: LoginFormValues) => {
    setLoginError(null);
    setIsSubmitting(true);

    try {
      console.log("Login submission started with email:", data.email);

      // Force sign out first to clear any existing session
      await supabase.auth.signOut();
      console.log("✅ Forced signOut before login attempt");

      // Small delay to ensure signOut completes
      await new Promise((resolve) => setTimeout(resolve, 500));

      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        console.error("Login error:", error);
        setLoginError(error.message);
        return;
      }

      const userRole = authData.user?.user_metadata?.role || "User";

      if (userRole === "Driver") {
        const { data: driverData, error: driverError } = await supabase
          .from("drivers")
          .select("status")
          .eq("id", authData.user.id)
          .single();

        if (driverError) {
          console.error("Error fetching driver status:", driverError);
        } else if (driverData && driverData.status === "suspended") {
          setLoginError(
            "Your account has been suspended. Please contact an administrator.",
          );
          await supabase.auth.signOut();
          return;
        }
      }

      localStorage.setItem("userRole", userRole);
      localStorage.setItem("userId", authData.user.id);
      if (authData.user.email) {
        localStorage.setItem("userEmail", authData.user.email);
      }

      const userData = {
        id: authData.user.id,
        role: userRole,
        email: authData.user.email || "",
      };
      localStorage.setItem("auth_user", JSON.stringify(userData));

      console.log("User logged in with role:", userRole);
      console.log("User logged in successfully with ID:", authData.user.id);

      onLogin(data);

      if (onAuthStateChange) {
        console.log("Updating auth state to true");
        onAuthStateChange(true);
      } else {
        console.log("No onAuthStateChange handler provided");
      }

      if (userRole === "Admin" || userRole === "Staff") {
        console.log(`Redirecting ${userRole} user to admin panel`);
        navigate("/admin");
      }

      if (onClose) {
        console.log("Closing auth form after successful login");
        onClose();
      }
    } catch (error) {
      setLoginError("An unexpected error occurred");
      console.error("Login error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (data: RegisterFormValues) => {
    setIsSubmitting(true);
    try {
      console.log("✅ Registering with email and password...");

      const { data: authData, error: signUpError } = await supabase.auth.signUp(
        {
          email: data.email,
          password: data.password,
          options: {
            emailRedirectTo: `${window.location.origin}`,
            data: {
              full_name: data.name || "",
              phone_number: data.phone || "",
              role: "Customer",
            },
          },
        },
      );

      if (signUpError) {
        console.error("❌ Registration error:", signUpError);
        throw signUpError;
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (!authData.user) {
        console.error("User creation failed but no error was returned");
        throw new Error("Failed to create user account");
      }

      if (authData.user) {
        let selfieUrl = "";
        if (data.selfieImage) {
          try {
            const timestamp = new Date().getTime();
            const selfieFileName = `selfie_${authData.user.id}_${timestamp}.jpg`;
            const selfieFile = await fetch(data.selfieImage).then((res) =>
              res.blob(),
            );

            const { data: uploadData, error: uploadError } =
              await supabase.storage
                .from("selfies")
                .upload(selfieFileName, selfieFile);

            if (uploadError) {
              console.error("Error uploading selfie:", uploadError);
            } else if (uploadData) {
              const { data: urlData } = supabase.storage
                .from("selfies")
                .getPublicUrl(selfieFileName);

              selfieUrl = urlData.publicUrl;
            }
          } catch (error) {
            console.error("Error in selfie upload process:", error);
          }
        }

        console.log("Using selfie URL:", selfieUrl);

        let documentUrls = {
          ktpUrl: "",
          licenseUrl: "",
          idCardUrl: "",
        };

        const needsUpload =
          data.ktpImage ||
          data.simImage ||
          data.idCardImage ||
          data.kkImage ||
          data.stnkImage;

        if (needsUpload) {
          try {
            console.log("Uploading documents for user:", authData.user.id);

            const { data: uploadResult, error: uploadError } =
              await uploadDocumentImages(
                authData.user.id,
                data.ktpImage,
                data.simImage,
                data.idCardImage,
                data.kkImage,
                data.stnkImage,
              );

            if (uploadError) {
              console.error("Error uploading documents:", uploadError);
            } else if (uploadResult) {
              console.log("Documents uploaded successfully:", uploadResult);
              documentUrls = {
                ktpUrl: uploadResult.ktpUrl || documentUrls.ktpUrl,
                licenseUrl: uploadResult.licenseUrl || documentUrls.licenseUrl,
                idCardUrl: uploadResult.idCardUrl || documentUrls.idCardUrl,
                kkUrl: uploadResult.kkUrl || "",
                stnkUrl: uploadResult.stnkUrl || "",
              };

              console.log("All documents uploaded successfully:", {
                ktpUrl: documentUrls.ktpUrl,
                licenseUrl: documentUrls.licenseUrl,
                idCardUrl: documentUrls.idCardUrl,
                kkUrl: documentUrls.kkUrl,
                stnkUrl: documentUrls.stnkUrl,
              });

              if (data.role === "Driver Mitra") {
                console.log("Driver Mitra documents included in main upload");

                if (documentUrls) {
                  console.log("Document URLs after upload:", {
                    ktpUrl: documentUrls.ktpUrl,
                    licenseUrl: documentUrls.licenseUrl,
                    kkUrl: documentUrls.kkUrl,
                    stnkUrl: documentUrls.stnkUrl,
                  });
                }
              }
            }
          } catch (error) {
            console.error("Error in document upload process:", error);
          }
        }

        console.log("Using document URLs:", documentUrls);

        const { data: roleData, error: roleError } = await supabase
          .from("roles")
          .select("id")
          .ilike("name", data.role)
          .single();

        if (roleError) {
          console.error("Error fetching role ID:", roleError);
        }

        const roleId = roleData?.id || null;

        if (roleId && authData.user) {
          try {
            const { error: assignRoleError } = await supabase.functions.invoke(
              "supabase-functions-assignRole",
              {
                body: { userId: authData.user.id, roleId },
              },
            );

            if (assignRoleError) {
              console.error("Error assigning role:", assignRoleError);
            }
          } catch (assignError) {
            console.error("Error invoking assignRole function:", assignError);
          }
        }

        try {
          const { error: updateError } = await supabase.from("users").upsert(
            {
              id: authData.user.id,
              selfie_url: selfieUrl,
              full_name: data.name,
              email: data.email,
              phone: data.phone,
              // Omit role_id to avoid type conversion issues
            },
            { onConflict: "id" },
          );

          if (updateError) {
            console.error("Error updating user record:", updateError);
          }
        } catch (upsertError) {
          console.error("Exception during user upsert:", upsertError);
          // Continue with the registration process even if this fails
        }

        if (data.role === "Customer") {
          const { data: existingCustomer, error: checkCustomerError } =
            await supabase
              .from("customers")
              .select("id")
              .eq("id", authData.user.id)
              .single();

          if (
            checkCustomerError &&
            !checkCustomerError.message.includes("No rows found")
          ) {
            console.error(
              "Error checking existing customer:",
              checkCustomerError,
            );
          }

          if (existingCustomer) {
            const { error: updateCustomerError } = await supabase
              .from("customers")
              .update({
                name: data.name,
                email: data.email,
                phone: data.phone,
                selfie_url: selfieUrl,
              })
              .eq("id", authData.user.id);

            if (updateCustomerError) {
              console.error(
                "Error updating customer record:",
                updateCustomerError,
              );
            }
          } else {
            const { error: customerError } = await supabase
              .from("customers")
              .insert({
                id: authData.user.id,
                name: data.name,
                email: data.email,
                phone: data.phone,
                selfie_url: selfieUrl,
              });

            if (customerError) {
              console.error("Error creating customer record:", customerError);
            }
          }
        } else if (
          data.role === "Driver Mitra" ||
          data.role === "Driver Perusahaan"
        ) {
          const { data: existingDriver, error: checkDriverError } =
            await supabase
              .from("drivers")
              .select("id")
              .eq("id", authData.user.id)
              .single();

          if (
            checkDriverError &&
            !checkDriverError.message.includes("No rows found")
          ) {
            console.error("Error checking existing driver:", checkDriverError);
          }

          const driverData = {
            id: authData.user.id,
            name: data.name,
            email: data.email,
            phone: data.phone,
            selfie_url: selfieUrl,
            license_number: data.licenseNumber,
            license_expiry: data.licenseExpiry,
            reference_phone: data.referencePhone,
            driver_type: data.role === "Driver Mitra" ? "mitra" : "perusahaan",
            status: "active",
            ktp_url: documentUrls.ktpUrl,
            sim_url: documentUrls.licenseUrl,
            kk_url: documentUrls.kkUrl,
            stnk_url: documentUrls.stnkUrl,
            first_name: data.firstName,
            last_name: data.lastName,
            address: data.address,
            birth_place: data.birthPlace,
            birth_date: data.birthDate,
            religion: data.religion,
          };

          if (data.role === "Driver Mitra") {
            Object.assign(driverData, {
              color: data.color,
              license_plate: data.license_plate,
              make: data.make,
              model: data.model,
              year: data.year,
              vehicle_type: data.type,
              category: data.category,
              seats: data.seats,
              transmission: data.transmission,
              fuel_type: data.fuel_type,
            });
          }

          console.log("Driver data prepared for insertion/update:", {
            id: driverData.id,
            name: driverData.name,
            document_urls: {
              ktp_url: driverData.ktp_url,
              sim_url: driverData.sim_url,
              kk_url: driverData.kk_url,
              stnk_url: driverData.stnk_url,
            },
          });

          if (existingDriver) {
            const { error: updateDriverError } = await supabase
              .from("drivers")
              .update(driverData)
              .eq("id", authData.user.id);

            if (updateDriverError) {
              console.error("Error updating driver record:", updateDriverError);
            }
          } else {
            const { error: driverError } = await supabase
              .from("drivers")
              .insert(driverData);

            if (driverError) {
              console.error("Error creating driver record:", driverError);
            }
          }
        } else if (data.role === "Staff") {
          const { data: existingStaff, error: checkStaffError } = await supabase
            .from("staff")
            .select("id")
            .eq("id", authData.user.id)
            .single();

          if (
            checkStaffError &&
            !checkStaffError.message.includes("No rows found")
          ) {
            console.error("Error checking existing staff:", checkStaffError);
          }

          const staffData = {
            id: authData.user.id,
            name: data.name,
            email: data.email,
            phone: data.phone,
            selfie_url: selfieUrl,
            department: data.department,
            position: data.position,
            employee_id: data.employeeId,
            id_card_url: documentUrls.idCardUrl,
          };

          console.log("Staff data prepared for insertion/update:", {
            id: staffData.id,
            name: staffData.name,
            document_urls: {
              id_card_url: staffData.id_card_url,
            },
          });

          if (existingStaff) {
            const { error: updateStaffError } = await supabase
              .from("staff")
              .update(staffData)
              .eq("id", authData.user.id);

            if (updateStaffError) {
              console.error("Error updating staff record:", updateStaffError);
            }
          } else {
            const { error: staffError } = await supabase
              .from("staff")
              .insert(staffData);

            if (staffError) {
              console.error("Error creating staff record:", staffError);
            }
          }
        }

        localStorage.setItem("userRole", data.role);
        localStorage.setItem("userId", authData.user.id);
        if (authData.user.email) {
          localStorage.setItem("userEmail", authData.user.email);
        }

        const userData = {
          id: authData.user.id,
          role: data.role,
          email: authData.user.email || "",
        };
        localStorage.setItem("auth_user", JSON.stringify(userData));

        console.log(
          `User registered successfully with role: ${data.role} (ID: ${roleId})`,
        );
      }

      await onRegister(data);

      if (onAuthStateChange) {
        console.log("Updating auth state to true after registration");
        onAuthStateChange(true);
      } else {
        console.log("No onAuthStateChange handler provided for registration");
      }

      if (data.role === "Driver Mitra" || data.role === "Driver Perusahaan") {
        console.log(
          "Driver registered successfully, redirecting to driver profile",
        );
        navigate("/driver-profile");
      } else {
        console.log("User registered successfully");
      }

      if (onClose) {
        console.log("Closing auth form after successful registration");
        onClose();
      }
    } catch (error) {
      console.error("Registration error:", error);
      setIsSubmitting(false);
      alert(
        `Registration failed: ${error.message || "Unknown error occurred"}`,
      );
      return;
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <AuthModal
      onClose={onClose}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      loginForm={loginForm}
      handleLoginSubmit={handleLoginSubmit}
      loginError={loginError}
      isLoading={isLoading}
      isSubmitting={isSubmitting}
      showPassword={showPassword}
      togglePasswordVisibility={togglePasswordVisibility}
      handleRegisterSubmit={handleRegisterSubmit}
    />
  );
};

export default AuthForm;
