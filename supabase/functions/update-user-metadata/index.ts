import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

// Init Supabase Client with Service Role
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables",
  );
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// Helper function for JSON response with CORS headers
function jsonResponse(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
}

serve(async (req) => {
  console.log(`${req.method} ${req.url}`);

  // Handle preflight request (CORS OPTIONS)
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      console.error("Error parsing request body:", parseError);
      return jsonResponse(
        {
          error: "Invalid JSON in request body",
        },
        400,
      );
    }

    const { userId, action, metadata, userData } = requestBody;
    console.log("Request data:", {
      userId,
      action,
      hasMetadata: !!metadata,
      hasUserData: !!userData,
    });

    if (!userId) {
      return jsonResponse(
        {
          error: "Missing userId",
        },
        400,
      );
    }

    if (action === "get") {
      console.log("Getting user by ID:", userId);
      // Get user metadata
      const { data: user, error } =
        await supabase.auth.admin.getUserById(userId);

      if (error) {
        console.error("Error fetching user:", error);
        return jsonResponse(
          {
            error: error.message,
          },
          400,
        );
      }

      console.log("User fetched successfully");
      return jsonResponse({
        user: user.user,
      });
    } else if (action === "update") {
      // Update user metadata - support both 'metadata' and 'userData' parameters
      const updateData = metadata || userData;
      if (!updateData) {
        return jsonResponse(
          {
            error: "Missing metadata or userData for update action",
          },
          400,
        );
      }

      console.log("Updating user metadata for:", userId);
      const { data: user, error } = await supabase.auth.admin.updateUserById(
        userId,
        {
          user_metadata: updateData,
        },
      );

      if (error) {
        console.error("Error updating user metadata:", error);
        return jsonResponse(
          {
            error: error.message,
          },
          400,
        );
      }

      console.log("User metadata updated successfully");
      return jsonResponse({
        user: user.user,
        message: "User metadata updated successfully",
      });
    } else {
      return jsonResponse(
        {
          error: 'Invalid action. Use "get" or "update"',
        },
        400,
      );
    }
  } catch (err) {
    console.error("Error processing request:", err);
    return jsonResponse(
      {
        error: err.message || "Internal server error",
      },
      500,
    );
  }
});
