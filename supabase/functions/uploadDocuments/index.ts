import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.6";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const requestData = await req.json();
    const userId = requestData.userId;

    if (!userId) {
      throw new Error("User ID is required");
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
      Deno.env.get("SUPABASE_SERVICE_KEY") ??
      "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const uploadResults: Record<string, string> = {};

    // Process all possible image types
    const imageTypes = [
      { key: "selfie", bucket: "selfies", filename: "selfie" },
      {
        key: "ktpImage",
        bucket: "driver_documents",
        filename: "ktp",
        dbField: "ktp_url",
        table: "drivers",
      },
      {
        key: "simImage",
        bucket: "driver_documents",
        filename: "sim",
        dbField: "sim_url",
        table: "drivers",
      },
      {
        key: "idCardImage",
        bucket: "staff_documents",
        filename: "idcard",
        dbField: "id_card_url",
        table: "staff",
      },
      {
        key: "kkImage",
        bucket: "driver_documents",
        filename: "kk",
        dbField: "kk_url",
        table: "drivers",
      },
      {
        key: "stnkImage",
        bucket: "driver_documents",
        filename: "stnk",
        dbField: "stnk_url",
        table: "drivers",
      },
      {
        key: "skckImage",
        bucket: "driver_documents",
        filename: "skck",
        dbField: "skck_url",
        table: "drivers",
      },
      {
        key: "front",
        bucket: "vehicles",
        filename: "front",
        dbField: "front_image_url",
        table: "vehicles",
      },
      {
        key: "back",
        bucket: "vehicles",
        filename: "back",
        dbField: "back_image_url",
        table: "vehicles",
      },
      {
        key: "side",
        bucket: "vehicles",
        filename: "side",
        dbField: "side_image_url",
        table: "vehicles",
      },
      {
        key: "interior",
        bucket: "vehicles",
        filename: "interior",
        dbField: "interior_image_url",
        table: "vehicles",
      },
      {
        key: "bpkb",
        bucket: "vehicles",
        filename: "bpkb",
        dbField: "bpkb_url",
        table: "vehicles",
      },
    ];

    for (const imageType of imageTypes) {
      const imageData = requestData[imageType.key];
      if (imageData && imageData.startsWith("data:")) {
        try {
          // Extract the base64 data
          const base64Data = imageData.split(",")[1];
          const blob = await fetch(imageData).then((res) => res.blob());
          const fileName = `${imageType.filename}_${userId}_${new Date().getTime()}.jpg`;

          // Upload to storage
          const { data, error } = await supabase.storage
            .from(imageType.bucket)
            .upload(fileName, blob);

          if (error) {
            console.error(`Error uploading ${imageType.key}:`, error);
          } else if (data) {
            // Get public URL
            const { data: urlData } = supabase.storage
              .from(imageType.bucket)
              .getPublicUrl(fileName);

            const publicUrl = urlData.publicUrl;
            uploadResults[imageType.key.replace("Image", "")] = publicUrl;

            // Update database if table and field are specified
            if (imageType.table && imageType.dbField) {
              const updateData: Record<string, string> = {};
              updateData[imageType.dbField] = publicUrl;

              const { error: updateError } = await supabase
                .from(imageType.table)
                .update(updateData)
                .eq("id", userId);

              if (updateError) {
                console.error(
                  `Error updating ${imageType.table} ${imageType.dbField}:`,
                  updateError,
                );
              }
            }
          }
        } catch (error) {
          console.error(`Error in ${imageType.key} upload process:`, error);
        }
      }
    }

    return new Response(JSON.stringify(uploadResults), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
