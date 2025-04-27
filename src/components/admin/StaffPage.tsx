import React, { useState } from "react";
import UserManagement from "./UserManagement";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import RegistrationForm from "@/components/auth/RegistrationForm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";

const StaffPage = () => {
  const [showRegistrationDialog, setShowRegistrationDialog] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleOpenRegistrationForm = () => {
    setShowRegistrationDialog(true);
  };

  const handleRegister = async (data) => {
    setIsSubmitting(true);
    try {
      console.log("Starting staff registration process");

      // Get the role_id for the selected role
      console.log(`Fetching role_id for role: ${data.role}`);
      const { data: roleData, error: roleError } = await supabase
        .from("roles")
        .select("role_id")
        .eq("role_name", data.role)
        .single();

      if (roleError) {
        console.error("Role fetch error:", roleError);
        throw new Error(
          `Error fetching ${data.role} role: ${roleError.message}`,
        );
      }

      console.log(`Role ID found: ${roleData.role_id}`);

      // Check if user already exists
      console.log(`Checking if user with email ${data.email} already exists`);
      const { data: existingUser, error: existingUserError } = await supabase
        .from("users")
        .select("id, email")
        .eq("email", data.email)
        .maybeSingle();

      if (existingUser) {
        console.error("User already exists:", existingUser);
        throw new Error(`User with email ${data.email} already exists`);
      }

      // Create new user directly with auth API instead of edge function
      console.log(`Creating auth user with email: ${data.email}`);
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.name,
          },
        },
      });

      if (authError) {
        console.error("Auth signup error:", authError);
        throw authError;
      }

      if (!authData || !authData.user) {
        console.error("Auth data or user is null", authData);
        throw new Error("Failed to create user account");
      }

      console.log(`Auth user created with ID: ${authData.user.id}`);

      if (authData.user) {
        // Cek apakah user sudah ada di tabel users
        const { data: existingUser, error: checkError } = await supabase
          .from("users")
          .select("id")
          .eq("id", authData.user.id)
          .maybeSingle(); // pakai maybeSingle supaya tidak error kalau tidak ketemu

        if (checkError) {
          console.error("Error checking existing user:", checkError);
          throw new Error("Gagal mengecek data user di tabel users");
        }

        const { error: staffInsertError } = await supabase
          .from("staff")
          .insert({
            id: authData.user.id,
            email: data.email,
            name: data.name,
            full_name: data.name,
            phone: data.phone,
            role_id: roleData.role_id,
            department: data.department || "",
            position: data.position || "",
            employee_id: data.employeeId || "",
            selfie_url: data.selfieImage || null,
            ktp_url: data.ktpImage || null,
            kk_url: data.kkImage || null,
            skck_url: data.skckImage || null,
            relative_phone: data.referencePhone || "",
          });

        if (staffInsertError) {
          console.error("Error inserting staff record:", staffInsertError);
          throw new Error("Gagal menyimpan data staff");
        }
      }

      // Check if user already exists in users table
      console.log("Checking if user exists in users table");
      const { data: existingUserRecord, error: existingUserRecordError } =
        await supabase
          .from("users")
          .select("id")
          .eq("id", authData.user.id)
          .maybeSingle();

      // Only insert if user doesn't exist
      if (!existingUserRecord) {
        console.log("Creating user record in users table");
        const { error: userError } = await supabase.from("users").insert({
          id: authData.user.id,
          email: data.email,
          full_name: data.name,
          role_id: roleData.role_id,
          phone: data.phone || "",
        });

        if (userError) {
          console.error("User insert error:", userError);
          throw userError;
        }
      } else {
        console.log("User already exists in users table, updating instead");
        const { error: userUpdateError } = await supabase
          .from("users")
          .update({
            email: data.email,
            full_name: data.name,
            role_id: roleData.role_id,
            phone: data.phone || "",
          })
          .eq("id", authData.user.id);

        if (userUpdateError) {
          console.error("User update error:", userUpdateError);
          throw userUpdateError;
        }
      }

      console.log("User record created successfully");

      // Prepare staff data with null checks
      const staffData = {
        id: authData.user.id,
        department: data.department || "",
        position: data.position || "",
        employee_id: data.employeeId || "",
        id_card_url: data.idCardImage || null,
        first_name: data.firstName || "",
        last_name: data.lastName || "",
        full_name: `${data.firstName || ""} ${data.lastName || ""}`,
        address: data.address || "",
        ktp_number: data.ktpNumber || "",
        religion: data.religion || "",
        ethnicity: data.ethnicity || "",
        role: data.role || "",
        role_id: roleData.role_id, // ✅ Tambahkan ini
        name: data.name || "",
        email: data.email || "",
        phone: data.phone || "",
        selfie_url: data.selfieImage || null,
        kk_url: data.kkImage || null,
        ktp_url: data.ktpImage || null,
        skck_url: data.skckImage || null,
        relative_phone: data.referencePhone || "",
      };

      console.log("Creating staff record with data:", staffData);

      // Check if staff record already exists
      const { data: existingStaff, error: existingStaffError } = await supabase
        .from("staff")
        .select("id")
        .eq("id", authData.user.id)
        .maybeSingle();

      // Insert or update staff record
      let staffError;
      if (!existingStaff) {
        console.log("Creating new staff record");
        const { error } = await supabase.from("staff").insert(staffData);
        staffError = error;
      } else {
        console.log("Updating existing staff record");
        const { error } = await supabase
          .from("staff")
          .update(staffData)
          .eq("id", authData.user.id);
        staffError = error;
      }

      if (staffError) {
        console.error("Staff insert error:", staffError);
        throw staffError;
      }

      console.log("Staff record created successfully");

      // Show success notification
      toast({
        variant: "default",
        title: "Berhasil!",
        description: `Akun staff ${data.name} berhasil dibuat`,
      });

      // Close the dialog automatically on success
      setShowRegistrationDialog(false);
    } catch (error) {
      console.error("Error registering staff:", error);
      // Show error notification
      toast({
        variant: "destructive",
        title: "Gagal!",
        description: `Gagal membuat akun staff: ${error.message}`,
      });
      // Keep dialog open on error so user can fix the issue
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8">
      <Card className="bg-white shadow-md border-0 overflow-hidden rounded-xl">
        <CardHeader className="bg-gradient-to-r from-primary-tosca/10 to-primary-dark/10 pb-4">
          <CardTitle className="text-2xl font-bold text-primary-dark">
            Staff Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <UserManagement onAddStaff={handleOpenRegistrationForm} />
        </CardContent>
      </Card>

      <Dialog
        open={showRegistrationDialog}
        onOpenChange={setShowRegistrationDialog}
      >
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Staff Registration</DialogTitle>
            <DialogDescription>
              Fill in the details to create a new staff member with complete
              information.
            </DialogDescription>
          </DialogHeader>
          <RegistrationForm
            onRegister={handleRegister}
            isLoading={isSubmitting}
            showPassword={showPassword}
            togglePasswordVisibility={togglePasswordVisibility}
            initialRole="Staff"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StaffPage;
