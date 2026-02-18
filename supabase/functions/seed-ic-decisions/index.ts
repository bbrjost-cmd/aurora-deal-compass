import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── Feasibility Engine (inlined from src/lib/feasibility.ts) ────────────────
interface FeasibilityInputs {
  rooms: number;
  segment: string;
  openingType: string;
  adr: number;
  occupancy: number;
  fnbRevenuePct: number;
  otherRevenuePct: number;
  rampUpYears: number;
  capexPerKey: number;
  ffePerKey: number;
  baseFee: number;
  incentiveFee: number;
  gopMargin: number;
  fxRate: number;
  keyMoney?: number;
  debtEnabled?: boolean;
  ltv?: number;
  interestRate?: number;
  capRate?: number;
}

interface FeasibilityYear {
  year: number;
  occupancy: number;
  roomsRevenue: number;
  totalRevenue: number;
  gop: number;
  fees: number;
  noi: number;
}

interface FeasibilityOutputs {
  years: FeasibilityYear[];
  totalCapex: number;
  simplePayback: number;
  sensitivities: {
    occDown10: FeasibilityYear[];
    adrDown10: FeasibilityYear[];
    capexUp15: { totalCapex: number; simplePayback: number };
    fxShock: FeasibilityYear[];
    severe: FeasibilityYear[];
  };
}

function computeYears(inputs: FeasibilityInputs, adrOverride?: number, occOverride?: number): FeasibilityYear[] {
  const years: FeasibilityYear[] = [];
  const adr = adrOverride ?? inputs.adr;
  const baseOcc = occOverride ?? inputs.occupancy;
  for (let y = 1; y <= 5; y++) {
    const rampFactor = y <= inputs.rampUpYears ? (0.6 + (0.4 * y / inputs.rampUpYears)) : 1;
    const occ = Math.min(baseOcc * rampFactor, 0.95);
    const roomNights = inputs.rooms * 365 * occ;
    const roomsRevenue = roomNights * adr;
    const totalRevenue = roomsRevenue * (1 + inputs.fnbRevenuePct + inputs.otherRevenuePct);
    const gop = totalRevenue * inputs.gopMargin;
    const fees = totalRevenue * inputs.baseFee + gop * inputs.incentiveFee;
    const noi = gop - fees;
    years.push({
      year: y,
      occupancy: occ,
      roomsRevenue: Math.round(roomsRevenue),
      totalRevenue: Math.round(totalRevenue),
      gop: Math.round(gop),
      fees: Math.round(fees),
      noi: Math.round(noi),
    });
  }
  return years;
}

function computeFeasibility(inputs: FeasibilityInputs): FeasibilityOutputs {
  const years = computeYears(inputs);
  const totalCapex = inputs.rooms * (inputs.capexPerKey + inputs.ffePerKey);
  const avgNoi = years.reduce((sum, y) => sum + y.noi, 0) / years.length;
  const simplePayback = avgNoi > 0 ? totalCapex / avgNoi : Infinity;
  const severe = computeYears(inputs, inputs.adr * 0.90, inputs.occupancy * 0.85);
  return {
    years,
    totalCapex,
    simplePayback: Math.round(simplePayback * 10) / 10,
    sensitivities: {
      occDown10: computeYears(inputs, undefined, inputs.occupancy * 0.9),
      adrDown10: computeYears(inputs, inputs.adr * 0.9),
      capexUp15: {
        totalCapex: Math.round(totalCapex * 1.15),
        simplePayback: Math.round((totalCapex * 1.15 / avgNoi) * 10) / 10,
      },
      fxShock: computeYears(inputs),
      severe,
    },
  };
}

// ─── IC Engine (inlined core logic) — PMS&E ONLY ────────────────────────────
// Economy / Midscale / Premium — NO Luxury / Lifestyle
const SEGMENT_PRESETS: Record<string, any> = {
  economy: {
    adrLow: 500, adrHigh: 1200, occLow: 0.68, occHigh: 0.84,
    gopLow: 0.34, gopHigh: 0.46, fnbCapture: 0.03, otherRevPct: 0.02,
    capexPerKey: 600000, ffePerKey: 90000,
    royaltyPct: 0.050, marketingPct: 0.020, distributionPct: 0.015,
    baseFeeTypical: 0.005, incentiveFeeTypical: 0.05,
    minYoC: 0.08, minRooms: 50, label: "Economy",
  },
  midscale: {
    adrLow: 900, adrHigh: 2200, occLow: 0.65, occHigh: 0.82,
    gopLow: 0.28, gopHigh: 0.38, fnbCapture: 0.10, otherRevPct: 0.03,
    capexPerKey: 1200000, ffePerKey: 220000,
    royaltyPct: 0.045, marketingPct: 0.018, distributionPct: 0.012,
    baseFeeTypical: 0.005, incentiveFeeTypical: 0.05,
    minYoC: 0.08, minRooms: 80, label: "Midscale",
  },
  premium: {
    adrLow: 1800, adrHigh: 4500, occLow: 0.62, occHigh: 0.80,
    gopLow: 0.30, gopHigh: 0.42, fnbCapture: 0.18, otherRevPct: 0.05,
    capexPerKey: 2200000, ffePerKey: 420000,
    royaltyPct: 0.040, marketingPct: 0.015, distributionPct: 0.010,
    baseFeeTypical: 0.025, incentiveFeeTypical: 0.08,
    minYoC: 0.07, minRooms: 120, label: "Premium",
  },
};

function buildInputs(deal: any): FeasibilityInputs {
  // Normalize segment to PMS&E only
  const seg = ["economy", "midscale", "premium"].includes(deal.segment)
    ? deal.segment
    : "midscale";
  const preset = SEGMENT_PRESETS[seg];
  const rooms = Math.round(((deal.rooms_min || 100) + (deal.rooms_max || 200)) / 2);
  const scoreNorm = (deal.score_total || 60) / 100;
  const adr = Math.round(preset.adrLow + scoreNorm * (preset.adrHigh - preset.adrLow));
  const occupancy = preset.occLow + scoreNorm * (preset.occHigh - preset.occLow);
  return {
    rooms,
    segment: seg,
    openingType: deal.opening_type || "conversion",
    adr,
    occupancy: Math.round(occupancy * 100) / 100,
    fnbRevenuePct: preset.fnbCapture,
    otherRevenuePct: preset.otherRevPct,
    rampUpYears: deal.opening_type === "conversion" ? 1 : 2,
    capexPerKey: preset.capexPerKey,
    ffePerKey: preset.ffePerKey,
    baseFee: preset.baseFeeTypical,
    incentiveFee: preset.incentiveFeeTypical,
    gopMargin: (preset.gopLow + preset.gopHigh) / 2,
    fxRate: 17.5,
    keyMoney: 0,
    debtEnabled: false,
    ltv: 0.55,
    interestRate: 0.09,
    capRate: 0.08,
  };
}

function computeSimpleIRR(investment: number, cashFlows: number[], exitValue: number): number {
  if (investment <= 0) return 0;
  let r = 0.10;
  for (let iter = 0; iter < 50; iter++) {
    let npv = -investment;
    let dnpv = 0;
    cashFlows.forEach((cf, i) => {
      const t = i + 1;
      npv += cf / Math.pow(1 + r, t);
      dnpv -= t * cf / Math.pow(1 + r, t + 1);
    });
    const n = cashFlows.length;
    npv += exitValue / Math.pow(1 + r, n);
    dnpv -= n * exitValue / Math.pow(1 + r, n + 1);
    if (Math.abs(npv) < 1) break;
    if (Math.abs(dnpv) < 0.0001) break;
    r = r - npv / dnpv;
    if (r < -0.99) r = -0.99;
    if (r > 5) r = 5;
  }
  return r;
}

function runICEngine(deal: any, inputs: FeasibilityInputs, outputs: FeasibilityOutputs) {
  // PMS&E thresholds — NO luxury/lifestyle references
  const MIN_NET_FEES_USD = 120000; // PMS&E minimum viability
  const MAX_PAYBACK = 8;

  const seg = ["economy", "midscale", "premium"].includes(inputs.segment) ? inputs.segment : "midscale";
  const preset = SEGMENT_PRESETS[seg];
  const minYoC = preset.minYoC; // 8% economy/midscale, 7% premium
  const minRooms = preset.minRooms;

  // Brand economics (franchise model primary)
  const stabYear = outputs.years[2] || outputs.years[outputs.years.length - 1];
  const totalRevStab = stabYear.totalRevenue;
  const baseFeeAnnual = totalRevStab * inputs.baseFee;
  const incentiveFeeAnnual = stabYear.gop * inputs.incentiveFee;
  const totalGrossFees = baseFeeAnnual + incentiveFeeAnnual;
  const supportCosts = totalGrossFees * 0.18;
  const netFees = totalGrossFees - supportCosts;
  const netFeesUSD = netFees / inputs.fxRate;

  // Owner economics
  const ebitdaY5 = stabYear.noi;
  const totalCapex = outputs.totalCapex;
  const yieldOnCost = totalCapex > 0 ? ebitdaY5 / totalCapex : 0;
  const exitValue = inputs.capRate! > 0 ? ebitdaY5 / inputs.capRate! : 0;

  // Data completeness
  const completenessScore = Math.min(85, 40 +
    (deal.rooms_min ? 8 : 0) +
    (deal.segment ? 8 : 0) +
    (deal.city && deal.state ? 10 : 0) +
    (deal.lat && deal.lon ? 5 : 0) +
    (deal.address ? 5 : 0) +
    (deal.score_total ? 8 : 0) +
    15
  );

  // Hard gates — PMS&E logic
  const roomsMax = deal.rooms_max || inputs.rooms;
  const hardGates = {
    completeness: { passed: completenessScore >= 55, name: "Data Completeness ≥ 55%" },
    minRooms: { passed: roomsMax >= minRooms, name: `Min Rooms ≥ ${minRooms} for ${preset.label}` },
    netFees: { passed: netFeesUSD >= MIN_NET_FEES_USD, name: `Net Fees ≥ $${MIN_NET_FEES_USD.toLocaleString()} USD` },
  };
  const hardGateFailed = Object.values(hardGates).some(g => !g.passed);

  // Scoring — aligned with PMS&E scoring model
  const locationScore = Math.min(25, Math.round(((deal.score_total || 60) / 100) * 25));
  const demandScore = Math.min(25, Math.round((netFeesUSD / MIN_NET_FEES_USD) * 15 + 5));
  const conversionScore = Math.min(20, deal.opening_type === "conversion" ? 18 :
    deal.opening_type === "franchise_takeover" ? 16 :
    deal.opening_type === "rebranding" ? 14 : 10);
  const yocRatio = yieldOnCost / minYoC;
  const ownerScore = Math.min(15, Math.round(Math.min(15, 15 * Math.min(yocRatio, 1.5) / 1.5)));
  const executionScore = Math.min(15, deal.opening_type === "conversion" ? 13 : 10);

  const icScore = Math.min(100, locationScore + demandScore + conversionScore + ownerScore + executionScore);

  let decision: "go" | "go_with_conditions" | "no_go";
  if (hardGateFailed || icScore < 55) decision = "no_go";
  else if (icScore >= 72) decision = "go";
  else decision = "go_with_conditions";

  const confidence = completenessScore >= 80 ? "high" : completenessScore >= 60 ? "medium" : "low";

  // Conditions — PMS&E specific
  const conditions: string[] = [];
  if (netFeesUSD < MIN_NET_FEES_USD) conditions.push(`Increase net fees to ≥ $${MIN_NET_FEES_USD.toLocaleString()} USD — currently $${Math.round(netFeesUSD).toLocaleString()} USD.`);
  if (yieldOnCost < minYoC) conditions.push(`Improve YoC to ≥ ${(minYoC * 100).toFixed(0)}% (currently ${(yieldOnCost * 100).toFixed(1)}%) — reduce CAPEX/key or reposition ADR.`);
  if (completenessScore < 70) conditions.push(`Complete underwriting data (currently ${completenessScore}%).`);
  if (deal.opening_type === "new_build" && seg === "economy") conditions.push("Consider conversion vs new build — stronger CAPEX efficiency for Economy segment.");

  // Red flags
  const redFlags: string[] = [];
  if (roomsMax < minRooms) redFlags.push(`${roomsMax} rooms below ${preset.label} minimum (${minRooms} keys).`);
  if (outputs.simplePayback > MAX_PAYBACK) redFlags.push(`Simple payback ${outputs.simplePayback} yrs exceeds ${MAX_PAYBACK}-yr threshold.`);
  if (yieldOnCost < minYoC * 0.75) redFlags.push(`YoC ${(yieldOnCost * 100).toFixed(1)}% significantly below ${preset.label} threshold (${(minYoC * 100).toFixed(0)}%).`);
  for (const g of Object.values(hardGates).filter(g => !g.passed)) {
    redFlags.push(`Hard gate failed: ${g.name}`);
  }

  // Narrative — PMS&E tone
  const decisionLabel = decision === "go" ? "GO" : decision === "go_with_conditions" ? "GO WITH CONDITIONS" : "NO-GO";
  const narrative = `IC evaluation of ${deal.name} — ${preset.label} ${deal.opening_type?.replace(/_/g, " ") || "conversion"} in ${deal.city}. Score: ${icScore}/100 → ${decisionLabel} (${confidence} confidence).\n\nAccor fees: stabilised net fees ~$${Math.round(netFeesUSD).toLocaleString()} USD/yr. ${netFeesUSD >= MIN_NET_FEES_USD ? "Meets PMS&E minimum." : "Below PMS&E minimum — corrective action required."}\n\nOwner returns: YoC ${(yieldOnCost * 100).toFixed(1)}% vs ${(minYoC * 100).toFixed(0)}% threshold. CAPEX: MXN ${totalCapex.toLocaleString()}, payback ${outputs.simplePayback} yrs.\n\n${redFlags.length > 0 ? `Key issues: ${redFlags.slice(0, 2).join("; ")}.` : "No critical red flags."} ${conditions.length > 0 ? `Conditions: ${conditions.slice(0, 2).join("; ")}.` : "Recommend advance to LOI."}`;

  return {
    decision,
    ic_score: icScore,
    confidence,
    hard_gates_json: hardGates,
    conditions_json: conditions,
    red_flags_json: redFlags,
    thresholds_json: { MIN_NET_FEES_USD, minYoC, MAX_PAYBACK, minRooms, segment: seg },
    data_completeness: completenessScore,
    narrative_text: narrative,
    _inputs: inputs,
    _outputs: outputs,
    _netFeesUSD: netFeesUSD,
    _yieldOnCost: yieldOnCost,
  };
}

// ─── Main handler ────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { org_id, limit = 10 } = await req.json();
    if (!org_id) return new Response(JSON.stringify({ error: "org_id required" }), { status: 400, headers: corsHeaders });

    // Fetch top deals by score
    const { data: deals, error: dealsErr } = await supabase
      .from("deals")
      .select("*")
      .eq("org_id", org_id)
      .order("score_total", { ascending: false })
      .limit(limit);

    if (dealsErr) throw dealsErr;
    if (!deals || deals.length === 0) {
      return new Response(JSON.stringify({ error: "No deals found. Seed deals first." }), { status: 404, headers: corsHeaders });
    }

    const results: any[] = [];
    let skipped = 0;

    for (const deal of deals) {
      // Check if decision already exists for this deal
      const { data: existing } = await supabase
        .from("decision_history")
        .select("id")
        .eq("deal_id", deal.id)
        .eq("org_id", org_id)
        .maybeSingle();

      if (existing) {
        skipped++;
        continue;
      }

      // Build feasibility inputs from deal data
      const inputs = buildInputs(deal);
      const outputs = computeFeasibility(inputs);

      // Run IC engine
      const ic = runICEngine(deal, inputs, outputs);

      // Save feasibility_inputs (upsert)
      await supabase.from("feasibility_inputs").upsert({
        org_id,
        deal_id: deal.id,
        inputs: inputs as any,
        updated_at: new Date().toISOString(),
      }, { onConflict: "deal_id" });

      // Save feasibility_outputs (upsert)
      await supabase.from("feasibility_outputs").upsert({
        org_id,
        deal_id: deal.id,
        outputs: outputs as any,
        updated_at: new Date().toISOString(),
      }, { onConflict: "deal_id" });

      // Save decision_history
      const { data: savedDecision, error: decErr } = await supabase.from("decision_history").insert({
        org_id,
        deal_id: deal.id,
        decision: ic.decision,
        ic_score: ic.ic_score,
        confidence: ic.confidence,
        hard_gates_json: ic.hard_gates_json as any,
        conditions_json: ic.conditions_json as any,
        red_flags_json: ic.red_flags_json as any,
        thresholds_json: ic.thresholds_json as any,
        data_completeness: ic.data_completeness,
        narrative_text: ic.narrative_text,
      }).select().single();

      if (decErr) {
        console.error("Error inserting decision:", decErr);
        continue;
      }

      results.push({
        deal: deal.name,
        score: deal.score_total,
        decision: ic.decision,
        ic_score: ic.ic_score,
        confidence: ic.confidence,
        net_fees_usd: Math.round(ic._netFeesUSD),
        yoc_pct: Math.round(ic._yieldOnCost * 1000) / 10,
      });
    }

    return new Response(JSON.stringify({
      ok: true,
      processed: results.length,
      skipped,
      results,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: any) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
