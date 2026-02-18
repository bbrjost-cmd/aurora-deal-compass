import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MEXICO_DEALS = [
  // QUINTANA ROO — Riviera Maya / Tulum / Cancún
  { name: "Fairmont Riviera Maya", city: "Playa del Carmen", state: "Quintana Roo", lat: 20.6296, lon: -87.0739, segment: "luxury", opening_type: "new_build", rooms_min: 180, rooms_max: 260, stage: "underwriting", score: 82 },
  { name: "Raffles Tulum Eco-Resort", city: "Tulum", state: "Quintana Roo", lat: 20.2114, lon: -87.4654, segment: "luxury", opening_type: "conversion", rooms_min: 60, rooms_max: 95, stage: "loi", score: 76 },
  { name: "Emblems Collection Tulum", city: "Tulum", state: "Quintana Roo", lat: 20.2200, lon: -87.4600, segment: "luxury", opening_type: "new_build", rooms_min: 45, rooms_max: 75, stage: "qualified", score: 71 },
  { name: "MGallery Cancún Zona Hotelera", city: "Cancún", state: "Quintana Roo", lat: 21.1619, lon: -86.8515, segment: "luxury_lifestyle", opening_type: "conversion", rooms_min: 120, rooms_max: 200, stage: "underwriting", score: 68 },
  { name: "Mondrian Tulum Boutique", city: "Tulum", state: "Quintana Roo", lat: 20.2050, lon: -87.4500, segment: "luxury_lifestyle", opening_type: "new_build", rooms_min: 55, rooms_max: 90, stage: "lead", score: 55 },
  { name: "SLS Cancún Lifestyle", city: "Cancún", state: "Quintana Roo", lat: 21.1750, lon: -86.8300, segment: "luxury_lifestyle", opening_type: "new_build", rooms_min: 200, rooms_max: 320, stage: "qualified", score: 63 },
  { name: "Sofitel Holbox Island", city: "Holbox", state: "Quintana Roo", lat: 21.5200, lon: -87.3700, segment: "luxury", opening_type: "new_build", rooms_min: 70, rooms_max: 110, stage: "lead", score: 48 },
  { name: "Grupo Xcaret MGallery", city: "Playa del Carmen", state: "Quintana Roo", lat: 20.5810, lon: -87.1180, segment: "luxury_lifestyle", opening_type: "new_build", rooms_min: 150, rooms_max: 280, stage: "negotiation", score: 79 },
  { name: "Delano Bacalar Eco-Luxury", city: "Bacalar", state: "Quintana Roo", lat: 18.6751, lon: -88.3924, segment: "luxury", opening_type: "new_build", rooms_min: 40, rooms_max: 65, stage: "lead", score: 42 },
  { name: "Orient Express Mayan Coast", city: "Akumal", state: "Quintana Roo", lat: 20.3931, lon: -87.3100, segment: "luxury", opening_type: "new_build", rooms_min: 50, rooms_max: 80, stage: "qualified", score: 66 },

  // BAJA CALIFORNIA SUR — Los Cabos
  { name: "Raffles Los Cabos Trophy", city: "Cabo San Lucas", state: "Baja California Sur", lat: 22.8905, lon: -109.9167, segment: "luxury", opening_type: "conversion", rooms_min: 120, rooms_max: 200, stage: "loi", score: 84 },
  { name: "Fairmont SJdC Oceanfront", city: "San José del Cabo", state: "Baja California Sur", lat: 23.0598, lon: -109.7006, segment: "luxury", opening_type: "new_build", rooms_min: 160, rooms_max: 240, stage: "underwriting", score: 77 },
  { name: "Emblems Collection Pedregal", city: "Cabo San Lucas", state: "Baja California Sur", lat: 22.8780, lon: -109.9250, segment: "luxury", opening_type: "conversion", rooms_min: 55, rooms_max: 85, stage: "qualified", score: 69 },
  { name: "Orient Express Palmilla", city: "San José del Cabo", state: "Baja California Sur", lat: 23.0350, lon: -109.7200, segment: "luxury", opening_type: "new_build", rooms_min: 65, rooms_max: 100, stage: "lead", score: 51 },
  { name: "SLS Cabo Lifestyle Hub", city: "Cabo San Lucas", state: "Baja California Sur", lat: 22.9100, lon: -109.8850, segment: "luxury_lifestyle", opening_type: "new_build", rooms_min: 140, rooms_max: 220, stage: "underwriting", score: 72 },
  { name: "Sofitel Todos Santos Baja", city: "Todos Santos", state: "Baja California Sur", lat: 23.4500, lon: -110.2270, segment: "luxury_lifestyle", opening_type: "conversion", rooms_min: 60, rooms_max: 90, stage: "lead", score: 44 },

  // CDMX — Ciudad de México
  { name: "Delano Polanco Urban", city: "Ciudad de México", state: "Ciudad de México", lat: 19.4326, lon: -99.1680, segment: "luxury", opening_type: "new_build", rooms_min: 180, rooms_max: 280, stage: "negotiation", score: 81 },
  { name: "Mondrian Condesa Arte", city: "Ciudad de México", state: "Ciudad de México", lat: 19.4100, lon: -99.1750, segment: "luxury_lifestyle", opening_type: "conversion", rooms_min: 110, rooms_max: 160, stage: "loi", score: 74 },
  { name: "Sofitel Legend Reforma", city: "Ciudad de México", state: "Ciudad de México", lat: 19.4270, lon: -99.1570, segment: "luxury", opening_type: "conversion", rooms_min: 200, rooms_max: 350, stage: "underwriting", score: 86 },
  { name: "MGallery Coyoacán Heritage", city: "Ciudad de México", state: "Ciudad de México", lat: 19.3500, lon: -99.1614, segment: "luxury_lifestyle", opening_type: "conversion", rooms_min: 70, rooms_max: 110, stage: "qualified", score: 61 },
  { name: "SLS Santa Fe Mixed-Use", city: "Ciudad de México", state: "Ciudad de México", lat: 19.3600, lon: -99.2600, segment: "upper_upscale", opening_type: "new_build", rooms_min: 220, rooms_max: 380, stage: "underwriting", score: 67 },
  { name: "Raffles Paseo de la Reforma", city: "Ciudad de México", state: "Ciudad de México", lat: 19.4300, lon: -99.1520, segment: "luxury", opening_type: "new_build", rooms_min: 150, rooms_max: 250, stage: "loi", score: 88 },
  { name: "Emblems Roma Norte", city: "Ciudad de México", state: "Ciudad de México", lat: 19.4200, lon: -99.1620, segment: "luxury", opening_type: "conversion", rooms_min: 40, rooms_max: 65, stage: "lead", score: 39 },

  // NAYARIT — Riviera Nayarit / Punta Mita
  { name: "Raffles Punta Mita Flagship", city: "Punta de Mita", state: "Nayarit", lat: 20.7700, lon: -105.5200, segment: "luxury", opening_type: "new_build", rooms_min: 100, rooms_max: 160, stage: "underwriting", score: 80 },
  { name: "Fairmont Riviera Nayarit", city: "Nuevo Vallarta", state: "Nayarit", lat: 20.6976, lon: -105.2970, segment: "luxury", opening_type: "new_build", rooms_min: 200, rooms_max: 360, stage: "negotiation", score: 83 },
  { name: "Emblems Sayulita Surf Lodge", city: "Sayulita", state: "Nayarit", lat: 20.8680, lon: -105.4000, segment: "luxury_lifestyle", opening_type: "new_build", rooms_min: 35, rooms_max: 55, stage: "qualified", score: 57 },
  { name: "MGallery San Pancho", city: "San Francisco", state: "Nayarit", lat: 21.0100, lon: -105.2900, segment: "luxury_lifestyle", opening_type: "conversion", rooms_min: 50, rooms_max: 80, stage: "lead", score: 46 },

  // JALISCO — Guadalajara / Puerto Vallarta
  { name: "Sofitel Guadalajara Metropolitan", city: "Guadalajara", state: "Jalisco", lat: 20.6597, lon: -103.3496, segment: "upper_upscale", opening_type: "new_build", rooms_min: 250, rooms_max: 400, stage: "underwriting", score: 71 },
  { name: "Mondrian Puerto Vallarta Lifestyle", city: "Puerto Vallarta", state: "Jalisco", lat: 20.6534, lon: -105.2253, segment: "luxury_lifestyle", opening_type: "new_build", rooms_min: 120, rooms_max: 200, stage: "qualified", score: 63 },
  { name: "MGallery Tlaquepaque Heritage", city: "San Pedro Tlaquepaque", state: "Jalisco", lat: 20.6400, lon: -103.2900, segment: "luxury_lifestyle", opening_type: "conversion", rooms_min: 60, rooms_max: 95, stage: "lead", score: 41 },
  { name: "Fairmont Puerto Vallarta Resort", city: "Puerto Vallarta", state: "Jalisco", lat: 20.6800, lon: -105.2500, segment: "luxury", opening_type: "new_build", rooms_min: 180, rooms_max: 300, stage: "loi", score: 75 },
  { name: "SLS Guadalajara Zapopan", city: "Zapopan", state: "Jalisco", lat: 20.7200, lon: -103.3900, segment: "upper_upscale", opening_type: "new_build", rooms_min: 200, rooms_max: 320, stage: "lead", score: 52 },

  // NUEVO LÉON — Monterrey
  { name: "Sofitel Monterrey Valle", city: "Monterrey", state: "Nuevo León", lat: 25.6866, lon: -100.3161, segment: "upper_upscale", opening_type: "new_build", rooms_min: 220, rooms_max: 360, stage: "underwriting", score: 69 },
  { name: "MGallery Centro Histórico MTY", city: "Monterrey", state: "Nuevo León", lat: 25.6700, lon: -100.3100, segment: "luxury_lifestyle", opening_type: "conversion", rooms_min: 80, rooms_max: 130, stage: "qualified", score: 58 },
  { name: "Delano San Pedro Garza García", city: "San Pedro Garza García", state: "Nuevo León", lat: 25.6530, lon: -100.4000, segment: "luxury", opening_type: "new_build", rooms_min: 140, rooms_max: 220, stage: "lead", score: 47 },

  // OAXACA
  { name: "Emblems Oaxaca de Juárez", city: "Oaxaca de Juárez", state: "Oaxaca", lat: 17.0732, lon: -96.7266, segment: "luxury", opening_type: "conversion", rooms_min: 35, rooms_max: 55, stage: "qualified", score: 60 },
  { name: "MGallery Monte Albán Heritage", city: "Oaxaca de Juárez", state: "Oaxaca", lat: 17.0900, lon: -96.7400, segment: "luxury_lifestyle", opening_type: "conversion", rooms_min: 50, rooms_max: 80, stage: "lead", score: 43 },
  { name: "Fairmont Huatulco Resort", city: "Santa María Huatulco", state: "Oaxaca", lat: 15.7720, lon: -96.1360, segment: "luxury", opening_type: "new_build", rooms_min: 120, rooms_max: 200, stage: "underwriting", score: 70 },

  // GUERRERO — Acapulco / Ixtapa
  { name: "Sofitel Acapulco Diamante", city: "Acapulco", state: "Guerrero", lat: 16.8534, lon: -99.8237, segment: "upper_upscale", opening_type: "conversion", rooms_min: 200, rooms_max: 380, stage: "lead", score: 38 },
  { name: "MGallery Ixtapa Boutique", city: "Ixtapa-Zihuatanejo", state: "Guerrero", lat: 17.6700, lon: -101.5500, segment: "luxury_lifestyle", opening_type: "new_build", rooms_min: 80, rooms_max: 130, stage: "qualified", score: 55 },

  // YUCATÁN — Mérida
  { name: "Mondrian Mérida Centro", city: "Mérida", state: "Yucatán", lat: 20.9674, lon: -89.5926, segment: "luxury_lifestyle", opening_type: "conversion", rooms_min: 100, rooms_max: 160, stage: "underwriting", score: 65 },
  { name: "MGallery Progreso Yucatán", city: "Progreso", state: "Yucatán", lat: 21.2830, lon: -89.6620, segment: "luxury_lifestyle", opening_type: "new_build", rooms_min: 60, rooms_max: 100, stage: "lead", score: 40 },
  { name: "Emblems Mérida Heritage", city: "Mérida", state: "Yucatán", lat: 20.9700, lon: -89.6100, segment: "luxury", opening_type: "conversion", rooms_min: 40, rooms_max: 65, stage: "qualified", score: 59 },

  // SINALOA — Mazatlán
  { name: "Fairmont Mazatlán Golden Zone", city: "Mazatlán", state: "Sinaloa", lat: 23.2494, lon: -106.4111, segment: "luxury", opening_type: "new_build", rooms_min: 160, rooms_max: 260, stage: "loi", score: 73 },
  { name: "Sofitel Mazatlán Marina", city: "Mazatlán", state: "Sinaloa", lat: 23.2600, lon: -106.4300, segment: "upper_upscale", opening_type: "new_build", rooms_min: 180, rooms_max: 280, stage: "underwriting", score: 66 },

  // SONORA — Puerto Peñasco / Sea of Cortez
  { name: "MGallery Rocky Point Boutique", city: "Puerto Peñasco", state: "Sonora", lat: 31.3100, lon: -113.5400, segment: "luxury_lifestyle", opening_type: "new_build", rooms_min: 70, rooms_max: 120, stage: "lead", score: 37 },

  // HIDALGO — Real del Monte
  { name: "MGallery Real del Monte Heritage", city: "Mineral del Monte", state: "Hidalgo", lat: 20.1300, lon: -98.6700, segment: "luxury_lifestyle", opening_type: "conversion", rooms_min: 45, rooms_max: 70, stage: "lead", score: 36 },

  // PUEBLA
  { name: "MGallery Puebla Centro Histórico", city: "Puebla", state: "Puebla", lat: 19.0432, lon: -98.1979, segment: "luxury_lifestyle", opening_type: "conversion", rooms_min: 80, rooms_max: 130, stage: "qualified", score: 61 },
  { name: "Sofitel Puebla Angelópolis", city: "Puebla", state: "Puebla", lat: 19.0300, lon: -98.2400, segment: "upper_upscale", opening_type: "new_build", rooms_min: 180, rooms_max: 300, stage: "underwriting", score: 64 },

  // BAJÍO — Querétaro / Guanajuato / San Miguel de Allende
  { name: "Emblems San Miguel de Allende", city: "San Miguel de Allende", state: "Guanajuato", lat: 20.9144, lon: -100.7452, segment: "luxury", opening_type: "conversion", rooms_min: 45, rooms_max: 75, stage: "loi", score: 78 },
  { name: "MGallery Guanajuato Capital", city: "Guanajuato", state: "Guanajuato", lat: 21.0190, lon: -101.2574, segment: "luxury_lifestyle", opening_type: "conversion", rooms_min: 60, rooms_max: 100, stage: "underwriting", score: 67 },
  { name: "Fairmont Querétaro Corporate", city: "Santiago de Querétaro", state: "Querétaro", lat: 20.5888, lon: -100.3899, segment: "upper_upscale", opening_type: "new_build", rooms_min: 200, rooms_max: 350, stage: "negotiation", score: 74 },
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { org_id } = await req.json();
    if (!org_id) return new Response(JSON.stringify({ error: "org_id required" }), { status: 400, headers: corsHeaders });

    // Check existing count
    const { count } = await supabase.from("deals").select("*", { count: "exact", head: true }).eq("org_id", org_id);
    if ((count || 0) >= 10) {
      return new Response(JSON.stringify({ message: "Already has deals", count }), { headers: corsHeaders });
    }

    const inserts = MEXICO_DEALS.map(d => ({
      org_id,
      name: d.name,
      city: d.city,
      state: d.state,
      lat: d.lat,
      lon: d.lon,
      segment: d.segment,
      opening_type: d.opening_type,
      rooms_min: d.rooms_min,
      rooms_max: d.rooms_max,
      stage: d.stage,
      score_total: d.score,
      score_breakdown: {},
    }));

    const { data: inserted, error } = await supabase.from("deals").insert(inserts).select("id, name, stage");
    if (error) throw error;

    // Seed some tasks
    const taskDeals = (inserted || []).slice(0, 10);
    const tasks = taskDeals.map((d: any) => ({
      org_id,
      deal_id: d.id,
      title: ["Appel de qualification owner", "Envoi de la proposition de marque", "Analyse de faisabilité complète", "Réunion IC interne", "Draft LOI"][Math.floor(Math.random() * 5)],
      status: "pending",
      due_date: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    }));
    await supabase.from("tasks").insert(tasks);

    // Seed benchmark cities
    const benchmarks = [
      { org_id, city: "Cancún", state: "Quintana Roo", adr_low: 4500, adr_high: 9000, occ_low: 0.65, occ_high: 0.82, gop_low: 0.33, gop_high: 0.46, cap_rate_low: 0.07, cap_rate_high: 0.10, source_note: "Internal placeholder — replace with proprietary data" },
      { org_id, city: "Ciudad de México", state: "Ciudad de México", adr_low: 3000, adr_high: 7500, occ_low: 0.60, occ_high: 0.78, gop_low: 0.30, gop_high: 0.44, cap_rate_low: 0.07, cap_rate_high: 0.10, source_note: "Internal placeholder — replace with proprietary data" },
      { org_id, city: "Guadalajara", state: "Jalisco", adr_low: 2000, adr_high: 4500, occ_low: 0.58, occ_high: 0.75, gop_low: 0.28, gop_high: 0.40, cap_rate_low: 0.08, cap_rate_high: 0.11, source_note: "Internal placeholder — replace with proprietary data" },
      { org_id, city: "Los Cabos", state: "Baja California Sur", adr_low: 5000, adr_high: 18000, occ_low: 0.62, occ_high: 0.80, gop_low: 0.35, gop_high: 0.50, cap_rate_low: 0.06, cap_rate_high: 0.09, source_note: "Internal placeholder — replace with proprietary data" },
      { org_id, city: "Tulum", state: "Quintana Roo", adr_low: 4000, adr_high: 14000, occ_low: 0.60, occ_high: 0.78, gop_low: 0.30, gop_high: 0.45, cap_rate_low: 0.07, cap_rate_high: 0.10, source_note: "Internal placeholder — replace with proprietary data" },
    ];
    const { count: benchCount } = await supabase.from("city_benchmarks").select("*", { count: "exact", head: true }).eq("org_id", org_id);
    if ((benchCount || 0) === 0) {
      await supabase.from("city_benchmarks").insert(benchmarks);
    }

    return new Response(JSON.stringify({ ok: true, inserted: inserted?.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
