import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// PMS&E only — Economy / Midscale / Premium
const MEXICO_DEALS = [
  // ─── ECONOMY — ibis / ibis Styles / ibis Budget / greet ───────────────────
  { name: "ibis CDMX Reforma", city: "Ciudad de México", state: "Ciudad de México", lat: 19.4326, lon: -99.1680, segment: "economy", opening_type: "conversion", rooms_min: 110, rooms_max: 160, stage: "underwriting", score: 78 },
  { name: "ibis Monterrey Centro", city: "Monterrey", state: "Nuevo León", lat: 25.6866, lon: -100.3161, segment: "economy", opening_type: "franchise_takeover", rooms_min: 90, rooms_max: 130, stage: "qualified", score: 72 },
  { name: "ibis Styles Guadalajara Expo", city: "Guadalajara", state: "Jalisco", lat: 20.6597, lon: -103.3496, segment: "economy", opening_type: "conversion", rooms_min: 100, rooms_max: 150, stage: "loi", score: 81 },
  { name: "ibis Budget Querétaro Aeropuerto", city: "Santiago de Querétaro", state: "Querétaro", lat: 20.5888, lon: -100.3899, segment: "economy", opening_type: "new_build", rooms_min: 120, rooms_max: 200, stage: "lead", score: 58 },
  { name: "ibis Puebla Angelópolis", city: "Puebla", state: "Puebla", lat: 19.0432, lon: -98.1979, segment: "economy", opening_type: "conversion", rooms_min: 80, rooms_max: 120, stage: "qualified", score: 67 },
  { name: "ibis Styles Cancún Aeropuerto", city: "Cancún", state: "Quintana Roo", lat: 21.1619, lon: -86.8515, segment: "economy", opening_type: "new_build", rooms_min: 150, rooms_max: 220, stage: "underwriting", score: 74 },
  { name: "greet Mérida Centro", city: "Mérida", state: "Yucatán", lat: 20.9674, lon: -89.5926, segment: "economy", opening_type: "conversion", rooms_min: 65, rooms_max: 95, stage: "lead", score: 51 },
  { name: "ibis Tijuana Via Rápida", city: "Tijuana", state: "Baja California", lat: 32.5149, lon: -117.0382, segment: "economy", opening_type: "franchise_takeover", rooms_min: 100, rooms_max: 160, stage: "qualified", score: 63 },
  { name: "ibis Budget León Aeropuerto", city: "León", state: "Guanajuato", lat: 20.9144, lon: -101.7068, segment: "economy", opening_type: "new_build", rooms_min: 130, rooms_max: 190, stage: "lead", score: 55 },
  { name: "ibis Styles Veracruz Puerto", city: "Veracruz", state: "Veracruz", lat: 19.1738, lon: -96.1342, segment: "economy", opening_type: "conversion", rooms_min: 75, rooms_max: 110, stage: "lead", score: 47 },

  // ─── MIDSCALE — Mercure / Novotel / Adagio ────────────────────────────────
  { name: "Novotel Guadalajara Centro", city: "Guadalajara", state: "Jalisco", lat: 20.6700, lon: -103.3400, segment: "midscale", opening_type: "new_build", rooms_min: 180, rooms_max: 260, stage: "underwriting", score: 79 },
  { name: "Mercure CDMX Pedregal", city: "Ciudad de México", state: "Ciudad de México", lat: 19.3600, lon: -99.1900, segment: "midscale", opening_type: "conversion", rooms_min: 130, rooms_max: 190, stage: "loi", score: 83 },
  { name: "Novotel Monterrey Valle", city: "Monterrey", state: "Nuevo León", lat: 25.6700, lon: -100.4100, segment: "midscale", opening_type: "new_build", rooms_min: 200, rooms_max: 300, stage: "negotiation", score: 85 },
  { name: "Mercure Querétaro Centro Histórico", city: "Santiago de Querétaro", state: "Querétaro", lat: 20.5930, lon: -100.3930, segment: "midscale", opening_type: "conversion", rooms_min: 90, rooms_max: 140, stage: "qualified", score: 69 },
  { name: "Adagio CDMX Reforma Aparthotel", city: "Ciudad de México", state: "Ciudad de México", lat: 19.4280, lon: -99.1630, segment: "midscale", opening_type: "new_build", rooms_min: 100, rooms_max: 160, stage: "underwriting", score: 71 },
  { name: "Novotel Cancún Zona Hotelera", city: "Cancún", state: "Quintana Roo", lat: 21.1750, lon: -86.8300, segment: "midscale", opening_type: "conversion", rooms_min: 200, rooms_max: 320, stage: "underwriting", score: 76 },
  { name: "Mercure Puebla Historicc", city: "Puebla", state: "Puebla", lat: 19.0450, lon: -98.2020, segment: "midscale", opening_type: "rebranding", rooms_min: 80, rooms_max: 130, stage: "qualified", score: 62 },
  { name: "Novotel Guadalajara Zapopan", city: "Zapopan", state: "Jalisco", lat: 20.7200, lon: -103.3900, segment: "midscale", opening_type: "new_build", rooms_min: 160, rooms_max: 240, stage: "lead", score: 54 },
  { name: "Mercure San Luis Potosí", city: "San Luis Potosí", state: "San Luis Potosí", lat: 22.1565, lon: -100.9855, segment: "midscale", opening_type: "franchise_takeover", rooms_min: 100, rooms_max: 155, stage: "lead", score: 48 },
  { name: "Adagio Monterrey Estudio", city: "Monterrey", state: "Nuevo León", lat: 25.6800, lon: -100.3200, segment: "midscale", opening_type: "new_build", rooms_min: 85, rooms_max: 130, stage: "lead", score: 44 },

  // ─── PREMIUM — Pullman / Swissôtel / Mövenpick ────────────────────────────
  { name: "Pullman Cancún Zona Hotelera", city: "Cancún", state: "Quintana Roo", lat: 21.1200, lon: -86.7800, segment: "premium", opening_type: "conversion", rooms_min: 280, rooms_max: 400, stage: "loi", score: 86 },
  { name: "Pullman CDMX Santa Fe", city: "Ciudad de México", state: "Ciudad de México", lat: 19.3600, lon: -99.2600, segment: "premium", opening_type: "new_build", rooms_min: 250, rooms_max: 380, stage: "underwriting", score: 80 },
  { name: "Swissôtel Monterrey Corporativo", city: "Monterrey", state: "Nuevo León", lat: 25.6530, lon: -100.3900, segment: "premium", opening_type: "new_build", rooms_min: 200, rooms_max: 300, stage: "negotiation", score: 82 },
  { name: "Mövenpick Cancún Beachfront", city: "Cancún", state: "Quintana Roo", lat: 21.1400, lon: -86.7900, segment: "premium", opening_type: "conversion", rooms_min: 220, rooms_max: 350, stage: "underwriting", score: 77 },
  { name: "Pullman Guadalajara Forum", city: "Guadalajara", state: "Jalisco", lat: 20.6400, lon: -103.4200, segment: "premium", opening_type: "new_build", rooms_min: 220, rooms_max: 340, stage: "qualified", score: 68 },
  { name: "Swissôtel CDMX Polanco", city: "Ciudad de México", state: "Ciudad de México", lat: 19.4326, lon: -99.2000, segment: "premium", opening_type: "conversion", rooms_min: 180, rooms_max: 260, stage: "loi", score: 84 },
  { name: "Mövenpick Los Cabos Marina", city: "Cabo San Lucas", state: "Baja California Sur", lat: 22.8905, lon: -109.9167, segment: "premium", opening_type: "new_build", rooms_min: 160, rooms_max: 240, stage: "underwriting", score: 75 },
  { name: "Pullman Querétaro Ejecutivo", city: "Santiago de Querétaro", state: "Querétaro", lat: 20.5888, lon: -100.3899, segment: "premium", opening_type: "new_build", rooms_min: 180, rooms_max: 280, stage: "lead", score: 58 },
  { name: "Swissôtel Puerto Vallarta Bay", city: "Puerto Vallarta", state: "Jalisco", lat: 20.6534, lon: -105.2253, segment: "premium", opening_type: "new_build", rooms_min: 200, rooms_max: 300, stage: "lead", score: 52 },
  { name: "Mövenpick Mazatlán Resort", city: "Mazatlán", state: "Sinaloa", lat: 23.2494, lon: -106.4111, segment: "premium", opening_type: "conversion", rooms_min: 180, rooms_max: 260, stage: "qualified", score: 65 },
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

    // Seed tasks
    const taskDeals = (inserted || []).slice(0, 10);
    const tasks = taskDeals.map((d: any) => ({
      org_id,
      deal_id: d.id,
      title: [
        "Owner qualification call",
        "Send brand proposal",
        "Complete feasibility analysis",
        "Internal IC review",
        "Draft LOI",
      ][Math.floor(Math.random() * 5)],
      status: "pending",
      due_date: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    }));
    await supabase.from("tasks").insert(tasks);

    // Seed PMS&E city benchmarks
    const benchmarks = [
      { org_id, city: "Cancún", state: "Quintana Roo", adr_low: 1400, adr_high: 3500, occ_low: 0.65, occ_high: 0.82, gop_low: 0.33, gop_high: 0.46, cap_rate_low: 0.07, cap_rate_high: 0.10, source_note: "Internal placeholder — replace with proprietary data" },
      { org_id, city: "Ciudad de México", state: "Ciudad de México", adr_low: 900, adr_high: 3000, occ_low: 0.62, occ_high: 0.78, gop_low: 0.32, gop_high: 0.44, cap_rate_low: 0.07, cap_rate_high: 0.10, source_note: "Internal placeholder — replace with proprietary data" },
      { org_id, city: "Guadalajara", state: "Jalisco", adr_low: 800, adr_high: 2200, occ_low: 0.60, occ_high: 0.76, gop_low: 0.30, gop_high: 0.42, cap_rate_low: 0.08, cap_rate_high: 0.11, source_note: "Internal placeholder — replace with proprietary data" },
      { org_id, city: "Monterrey", state: "Nuevo León", adr_low: 900, adr_high: 2500, occ_low: 0.62, occ_high: 0.78, gop_low: 0.32, gop_high: 0.44, cap_rate_low: 0.07, cap_rate_high: 0.10, source_note: "Internal placeholder — replace with proprietary data" },
      { org_id, city: "Querétaro", state: "Querétaro", adr_low: 700, adr_high: 1800, occ_low: 0.60, occ_high: 0.75, gop_low: 0.30, gop_high: 0.42, cap_rate_low: 0.08, cap_rate_high: 0.11, source_note: "Internal placeholder — replace with proprietary data" },
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
