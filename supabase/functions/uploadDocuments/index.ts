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
    const { userId, ktpImage, simImage, idCardImage } = await req.json();

    if (!userId) {
      throw new Error("User ID is required");
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const uploadResults = {
      ktpUrl: "",
      simUrl: "",
      idCardUrl: "",
    };

    // Upload KTP image if provided
    if (ktpImage) {
      try {
        const ktpBlob = await fetch(ktpImage).then((res) => res.blob());
        const ktpFileName = `ktp_${userId}_${new Date().getTime()}.jpg`;

        const { data: ktpData, error: ktpError } = await supabase.storage
          .from("driver_documents")
          .upload(ktpFileName, ktpBlob);

        if (ktpError) {
          console.error("Error uploading KTP image:", ktpError);
        } else if (ktpData) {
          const { data: ktpUrlData } = supabase.storage
            .from("driver_documents")
            .getPublicUrl(ktpFileName);

          uploadResults.ktpUrl = ktpUrlData.publicUrl;

          // Update the drivers table with the KTP URL
          const { error: updateError } = await supabase
            .from("drivers")
            .update({ ktp_url: ktpUrlData.publicUrl })
            .eq("id", userId);

          if (updateError) {
            console.error("Error updating driver KTP URL:", updateError);
          }
        }
      } catch (error) {
        console.error("Error in KTP upload process:", error);
      }
    }

    // Upload SIM image if provided
    if (simImage) {
      try {
        const simBlob = await fetch(simImage).then((res) => res.blob());
        const simFileName = `sim_${userId}_${new Date().getTime()}.jpg`;

        const { data: simData, error: simError } = await supabase.storage
          .from("driver_documents")
          .upload(simFileName, simBlob);

        if (simError) {
          console.error("Error uploading SIM image:", simError);
        } else if (simData) {
          const { data: simUrlData } = supabase.storage
            .from("driver_documents")
            .getPublicUrl(simFileName);

          uploadResults.simUrl = simUrlData.publicUrl;

          // Update the drivers table with the SIM URL
          const { error: updateError } = await supabase
            .from("drivers")
            .update({ sim_url: simUrlData.publicUrl })
            .eq("id", userId);

          if (updateError) {
            console.error("Error updating driver SIM URL:", updateError);
          }
        }
      } catch (error) {
        console.error("Error in SIM upload process:", error);
      }
    }

    // Upload ID Card image if provided
    if (idCardImage) {
      try {
        const idCardBlob = await fetch(idCardImage).then((res) => res.blob());
        const idCardFileName = `idcard_${userId}_${new Date().getTime()}.jpg`;

        const { data: idCardData, error: idCardError } = await supabase.storage
          .from("staff_documents")
          .upload(idCardFileName, idCardBlob);

        if (idCardError) {
          console.error("Error uploading ID Card image:", idCardError);
        } else if (idCardData) {
          const { data: idCardUrlData } = supabase.storage
            .from("staff_documents")
            .getPublicUrl(idCardFileName);

          uploadResults.idCardUrl = idCardUrlData.publicUrl;

          // Update the staff table with the ID Card URL
          const { error: updateError } = await supabase
            .from("staff")
            .update({ id_card_url: idCardUrlData.publicUrl })
            .eq("id", userId);

          if (updateError) {
            console.error("Error updating staff ID Card URL:", updateError);
          }
        }
      } catch (error) {
        console.error("Error in ID Card upload process:", error);
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
