import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import RegistrationForm, { RegisterFormValues } from "./RegistrationForm";
import { uploadDocumentImages } from "@/lib/edgeFunctions";

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
}

const AuthForm: React.FC<AuthFormProps> = ({
  onLogin = () => {},
  onRegister = () => {},
  isLoading = false,
  onAuthStateChange,
}) => {
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);

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
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        setLoginError(error.message);
        return;
      }

      // Get role from user metadata instead of querying the database
      const userRole = authData.user.user_metadata.role || "User";

      // Check if the user is a driver and if they are suspended
      if (userRole === "Driver") {
        const { data: driverData, error: driverError } = await supabase
          .from("drivers")
          .select("status")
          .eq("id", authData.user.id)
          .single();

        if (driverError) {
          console.error("Error fetching driver status:", driverError);
        } else if (driverData && driverData.status === "suspended") {
          // If the driver is suspended, prevent login
          setLoginError(
            "Your account has been suspended. Please contact an administrator.",
          );
          // Sign out the user since they were automatically signed in
          await supabase.auth.signOut();
          return;
        }
      }

      // Store user role in local storage
      localStorage.setItem("userRole", userRole);
      localStorage.setItem("userId", authData.user.id);

      console.log("User logged in with role:", userRole);

      onLogin(data);
      // Update authentication state after successful login
      if (onAuthStateChange) {
        onAuthStateChange(true);
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
      // Prepare user metadata based on role
      const userMetadata: Record<string, any> = {
        full_name: data.name,
        role: data.role,
        phone_number: data.phone,
        has_selfie: !!data.selfieImage,
      };

      // Add role-specific data to metadata
      if (data.role === "Driver Mitra" || data.role === "Driver Perusahaan") {
        userMetadata.license_number = data.licenseNumber;
        userMetadata.license_expiry = data.licenseExpiry;
        userMetadata.reference_phone = data.referencePhone;

        // Add Driver Mitra specific metadata
        if (data.role === "Driver Mitra") {
          userMetadata.has_kk = !!data.kkImage;
          userMetadata.has_stnk = !!data.stnkImage;
        }
      } else if (data.role === "Staff") {
        userMetadata.department = data.department;
        userMetadata.position = data.position;
        userMetadata.employee_id = data.employeeId;
      }

      // Register the user with Supabase
      const { data: authData, error: signUpError } = await supabase.auth.signUp(
        {
          email: data.email,
          password: data.password,
          options: {
            data: userMetadata,
          },
        },
      );

      if (signUpError) {
        console.error("Registration error:", signUpError);
        throw signUpError;
      }

      // Check if user was created successfully
      if (!authData.user) {
        console.error("User creation failed but no error was returned");
        throw new Error("Failed to create user account");
      }

      if (authData.user) {
        // Upload selfie image
        let selfieUrl = "";
        if (data.selfieImage) {
          try {
            // Use a unique filename with timestamp to avoid conflicts
            const timestamp = new Date().getTime();
            const selfieFileName = `selfie_${authData.user.id}_${timestamp}.jpg`;
            const selfieFile = await fetch(data.selfieImage).then((res) =>
              res.blob(),
            );

            // Try uploading with minimal options
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

        // Upload document images
        let documentUrls = {
          ktpUrl: "",
          simUrl: "",
          idCardUrl: "",
        };

        // Check if any document images need to be uploaded
        const needsUpload =
          data.ktpImage ||
          data.simImage ||
          data.idCardImage ||
          data.kkImage ||
          data.stnkImage;

        if (needsUpload) {
          try {
            console.log("Uploading documents for user:", authData.user.id);

            // Upload all documents in a single request
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
              // Merge existing URLs with newly uploaded ones
              documentUrls = {
                ktpUrl: uploadResult.ktpUrl || documentUrls.ktpUrl,
                simUrl: uploadResult.simUrl || documentUrls.simUrl,
                idCardUrl: uploadResult.idCardUrl || documentUrls.idCardUrl,
                kkUrl: uploadResult.kkUrl || "",
                stnkUrl: uploadResult.stnkUrl || "",
              };

              console.log("All documents uploaded successfully:", {
                ktpUrl: documentUrls.ktpUrl,
                simUrl: documentUrls.simUrl,
                idCardUrl: documentUrls.idCardUrl,
                kkUrl: documentUrls.kkUrl,
                stnkUrl: documentUrls.stnkUrl,
              });

              // If this is a Driver Mitra, include KK and STNK in the same upload request
              // This simplifies the process by using a single upload request for all documents
              if (data.role === "Driver Mitra") {
                // The documents are already included in the main upload request
                // No need for a separate request for KK and STNK
                console.log("Driver Mitra documents included in main upload");

                // Ensure the documentUrls object has the correct structure
                if (documentUrls) {
                  console.log("Document URLs after upload:", {
                    ktpUrl: documentUrls.ktpUrl,
                    simUrl: documentUrls.simUrl,
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

        // Get role ID from the role name (case insensitive match)
        const { data: roleData, error: roleError } = await supabase
          .from("roles")
          .select("id")
          .ilike("role_name", data.role)
          .single();

        if (roleError) {
          console.error("Error fetching role ID:", roleError);
        }

        const roleId = roleData?.id || null;

        // Use upsert to handle both insert and update cases
        const { error: updateError } = await supabase.from("users").upsert(
          {
            id: authData.user.id,
            selfie_url: selfieUrl,
            role_id: roleId,
            full_name: data.name,
            email: data.email,
            phone: data.phone,
          },
          { onConflict: "id" },
        );

        if (updateError) {
          console.error("Error updating user record:", updateError);
        }

        // Create or update role-specific records
        if (data.role === "Customer") {
          // Check if customer record already exists
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
            // Customer exists, update the record
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
            // Customer doesn't exist, insert new record
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
          // Check if driver record already exists
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

          // Prepare driver data
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
            status: "active", // Default status for new drivers
            ktp_url: documentUrls.ktpUrl,
            sim_url: documentUrls.simUrl,
            kk_url: documentUrls.kkUrl,
            stnk_url: documentUrls.stnkUrl,
          };

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
            // Driver exists, update the record
            const { error: updateDriverError } = await supabase
              .from("drivers")
              .update(driverData)
              .eq("id", authData.user.id);

            if (updateDriverError) {
              console.error("Error updating driver record:", updateDriverError);
            }
          } else {
            // Driver doesn't exist, insert new record
            const { error: driverError } = await supabase
              .from("drivers")
              .insert(driverData);

            if (driverError) {
              console.error("Error creating driver record:", driverError);
            }
          }
        } else if (data.role === "Staff") {
          // Check if staff record already exists
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

          // Prepare staff data
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
            // Staff exists, update the record
            const { error: updateStaffError } = await supabase
              .from("staff")
              .update(staffData)
              .eq("id", authData.user.id);

            if (updateStaffError) {
              console.error("Error updating staff record:", updateStaffError);
            }
          } else {
            // Staff doesn't exist, insert new record
            const { error: staffError } = await supabase
              .from("staff")
              .insert(staffData);

            if (staffError) {
              console.error("Error creating staff record:", staffError);
            }
          }
        }

        // Store user role in local storage regardless of insert/update result
        localStorage.setItem("userRole", data.role);
        localStorage.setItem("userId", authData.user.id);

        // Log success message
        console.log(
          `User registered successfully with role: ${data.role} (ID: ${roleId})`,
        );
      }

      await onRegister(data);
      // Update authentication state after successful registration
      if (onAuthStateChange) {
        onAuthStateChange(true);
      }
    } catch (error) {
      console.error("Registration error:", error);
      // Show error to user
      setIsSubmitting(false);
      alert(
        `Registration failed: ${error.message || "Unknown error occurred"}`,
      );
      return; // Exit early to prevent further processing
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Card className="w-full max-w-md mx-auto bg-card">
      <CardHeader>
        <CardTitle className="text-2xl text-center">
          Car Rental System
        </CardTitle>
        <CardDescription className="text-center">
          Sign in to your account or create a new one
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as "login" | "register")}
        >
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <Form {...loginForm}>
              <form
                onSubmit={loginForm.handleSubmit(handleLoginSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={loginForm.control}
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
                  control={loginForm.control}
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

                {loginError && (
                  <div className="text-sm text-destructive mb-2">
                    {loginError}
                  </div>
                )}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading || isSubmitting}
                >
                  {isLoading || isSubmitting ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="register">
            <RegistrationForm
              onRegister={handleRegisterSubmit}
              isLoading={isLoading}
              showPassword={showPassword}
              togglePasswordVisibility={togglePasswordVisibility}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex flex-col space-y-2">
        <div className="text-sm text-muted-foreground text-center">
          {activeTab === "login" ? (
            <p>
              Don't have an account?{" "}
              <Button
                variant="link"
                className="p-0 h-auto"
                onClick={() => setActiveTab("register")}
              >
                Register
              </Button>
            </p>
          ) : (
            <p>
              Already have an account?{" "}
              <Button
                variant="link"
                className="p-0 h-auto"
                onClick={() => setActiveTab("login")}
              >
                Login
              </Button>
            </p>
          )}
        </div>
      </CardFooter>
    </Card>
  );
};

export default AuthForm;
