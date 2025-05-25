export default async function handler(req, res) {
  const { from, to } = req.query;

  const url = `https://router.project-osrm.org/route/v1/driving/${from};${to}?overview=full&geometries=geojson`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    // Tambahkan console di tempat yang BENAR
    console.log("✅ OSRM URL:", url);
    console.log(
      "📦 OSRM Response sample:",
      JSON.stringify(data?.routes?.[0]?.geometry?.coordinates?.slice(0, 3)),
    );

    if (!data.routes?.[0]?.geometry?.coordinates) {
      console.warn("⚠️ geometry.coordinates kosong", JSON.stringify(data));
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error("❌ Failed to fetch route from OSRM:", error);
    return res.status(500).json({
      error: "Failed to fetch route",
      detail: error.toString(),
    });
  }
}
