// assignRole Edge Function
// This function manages user roles based on user_id and role_id

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.6";
// Import Database type from local types
type Database = any; // Temporary type until proper types are available

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AssignRoleRequest {
  userId: string;
  roleId: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_KEY") || "";

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing environment variables for Supabase connection");
    }

    // Create Supabase client with admin privileges
    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const { userId, roleId } = (await req.json()) as AssignRoleRequest;

    if (!userId || !roleId) {
      throw new Error(
        "Missing required fields: userId and roleId are required",
      );
    }

    // Check if role exists
    const { data: roleData, error: roleError } = await supabase
      .from("roles")
      .select("id")
      .eq("id", roleId)
      .single();

    if (roleError || !roleData) {
      throw new Error(`Role with ID ${roleId} not found`);
    }

    // Update user's role
    const { data, error } = await supabase
      .from("users")
      .update({ role_id: roleId })
      .eq("id", userId)
      .select();

    if (error) {
      throw new Error(`Failed to update user role: ${error.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "User role updated successfully",
        data,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      },
    );
  }
});
