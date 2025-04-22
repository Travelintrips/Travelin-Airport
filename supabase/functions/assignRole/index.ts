import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.6";

const corsHeaders = {
  "Access-Control-Allow-Origin":
    "https://distracted-archimedes8-kleh7.view-3.tempo-dev.app",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Credentials": "true",
};

Deno.serve(async (req) => {
  // ✅ Handle preflight CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, roleId } = await req.json();

    if (!userId || !roleId) {
      throw new Error("Missing userId or roleId");
    }

    const { data: roleData, error: roleError } = await supabase
      .from("roles")
      .select("role_id, role_name")
      .eq("role_id", roleId)
      .single();

    if (roleError || !roleData) {
      throw new Error("Role not found");
    }

    const { data, error } = await supabase
      .from("users")
      .update({
        role_id: roleId,
        role_name: roleData.role_name,
      })
      .eq("id", userId)
      .select();

    if (error) {
      throw new Error("Failed to update user role: " + error.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "User role updated successfully",
        data,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message,
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }
});
