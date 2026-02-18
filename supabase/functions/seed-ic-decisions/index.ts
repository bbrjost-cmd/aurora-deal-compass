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

// ─── IC Engine (inlined core logic) ─────────────────────────────────────────
const SEGMENT_PRESETS: Record<string, any> = {
  luxury: { adrLow: 6000, adrHigh: 20000, occLow: 0.55, occHigh: 0.72, gopLow: 0.35, gopHigh: 0.50, fnbCapture: 0.35, otherRevPct: 0.10, capexPerKeyLow: 4000000, capexPerKeyHigh: 10000000, ffePerKeyLow: 800000, ffePerKeyHigh: 2000000, baseFeeTypical: 0.03, incentiveFeeTypical: 0.08, minYoC: 0.07, label: "Luxury" },
  luxury_lifestyle: { adrLow: 3500, adrHigh: 8000, occLow: 0.60, occHigh: 0.78, gopLow: 0.32, gopHigh: 0.45, fnbCapture: 0.30, otherRevPct: 0.08, capexPerKeyLow: 3000000, capexPerKeyHigh: 7000000, ffePerKeyLow: 600000, ffePerKeyHigh: 1500000, baseFeeTypical: 0.03, incentiveFeeTypical: 0.08, minYoC: 0.075, label: "Luxury Lifestyle" },
  upper_upscale: { adrLow: 2000, adrHigh: 5000, occLow: 0.62, occHigh: 0.80, gopLow: 0.30, gopHigh: 0.42, fnbCapture: 0.22, otherRevPct: 0.05, capexPerKeyLow: 1500000, capexPerKeyHigh: 4000000, ffePerKeyLow: 350000, ffePerKeyHigh: 800000, baseFeeTypical: 0.03, incentiveFeeTypical: 0.08, minYoC: 0.08, label: "Upper Upscale" },
  midscale: { adrLow: 900, adrHigh: 2200, occLow: 0.65, occHigh: 0.82, gopLow: 0.28, gopHigh: 0.38, fnbCapture: 0.10, otherRevPct: 0.03, capexPerKeyLow: 700000, capexPerKeyHigh: 2000000, ffePerKeyLow: 150000, ffePerKeyHigh: 350000, baseFeeTypical: 0.04, incentiveFeeTypical: 0.10, minYoC: 0.08, label: "Midscale" },
};

function buildInputs(deal: any): FeasibilityInputs {
  const preset = SEGMENT_PRESETS[deal.segment] || SEGMENT_PRESETS.upper_upscale;
  const rooms = Math.round(((deal.rooms_min || 100) + (deal.rooms_max || 200)) / 2);
  // Use midpoint ADR between low/high for the segment, scaled by deal score
  const scoreNorm = (deal.score_total || 60) / 100;
  const adr = Math.round(preset.adrLow + scoreNorm * (preset.adrHigh - preset.adrLow));
  const occupancy = preset.occLow + scoreNorm * (preset.occHigh - preset.occLow);
  const isLuxury = ["luxury", "luxury_lifestyle"].includes(deal.segment);
  const capexPerKey = isLuxury ? 5500000 : 2500000;
  const ffePerKey = isLuxury ? 1200000 : 450000;
  return {
    rooms,
    segment: deal.segment || "upper_upscale",
    openingType: deal.opening_type || "new_build",
    adr,
    occupancy: Math.round(occupancy * 100) / 100,
    fnbRevenuePct: preset.fnbCapture,
    otherRevenuePct: preset.otherRevPct,
    rampUpYears: deal.opening_type === "conversion" ? 1 : 2,
    capexPerKey,
    ffePerKey,
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
  const MIN_NET_FEES_USD = 350000;
  const MIN_YOC_LUXURY = 0.07;
  const MIN_YOC_UPSCALE = 0.08;
  const MAX_PAYBACK = 6;
  const MIN_ROOMS_UPSCALE = 70;

  const isLuxury = ["luxury", "luxury_lifestyle"].includes(deal.segment || inputs.segment);
  const isUpscalePlus = ["luxury", "luxury_lifestyle", "upper_upscale"].includes(deal.segment || inputs.segment);
  const preset = SEGMENT_PRESETS[inputs.segment] || SEGMENT_PRESETS.upper_upscale;
  const minYoC = isLuxury ? MIN_YOC_LUXURY : MIN_YOC_UPSCALE;

  // Brand economics
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
  const unleveragedIRR = computeSimpleIRR(totalCapex, outputs.years.map(y => y.noi), exitValue);

  // Completeness (simplified: deal has rooms/segment/location = ~65%)
  const completenessScore = Math.min(85, 40 + // base
    (deal.rooms_min ? 8 : 0) +
    (deal.segment ? 8 : 0) +
    (deal.city && deal.state ? 10 : 0) +
    (deal.lat && deal.lon ? 5 : 0) +
    (deal.address ? 5 : 0) +
    (deal.score_total ? 8 : 0) +
    15 // feasibility inputs provided (we're computing them now)
  );

  // Hard gates
  const roomsMax = deal.rooms_max || inputs.rooms;
  const hardGates = {
    completeness: { passed: completenessScore >= 55, name: "Data Completeness ≥ 55" },
    minRooms: { passed: !isUpscalePlus || roomsMax >= MIN_ROOMS_UPSCALE, name: `Min Rooms (${MIN_ROOMS_UPSCALE})` },
    netFees: { passed: netFeesUSD >= MIN_NET_FEES_USD, name: "Net Fees USD ≥ Threshold" },
  };
  const hardGateFailed = Object.values(hardGates).some(g => !g.passed);

  // Scoring
  const netFeesRatio = netFeesUSD / MIN_NET_FEES_USD;
  const brandScore = Math.min(35, Math.round(Math.min(20, 20 * Math.min(netFeesRatio, 2) / 2) + 15));
  const yocRatio = yieldOnCost / minYoC;
  const ownerScore = Math.min(25, Math.round(
    Math.min(15, 15 * Math.min(yocRatio, 1.5) / 1.5) +
    5 + // no debt
    Math.min(5, 5 * (exitValue > totalCapex * 1.5 ? 1 : Math.max(0, (exitValue - totalCapex) / (totalCapex * 0.5))))
  ));
  const locationScore = Math.min(20, Math.round(((deal.score_total || 60) / 100) * 20));
  const executionScore = Math.min(20, deal.opening_type === "conversion" ? 15 : 12);

  const icScore = brandScore + ownerScore + locationScore + executionScore;

  let decision: "go" | "go_with_conditions" | "no_go";
  if (hardGateFailed || icScore < 60) decision = "no_go";
  else if (icScore >= 75) decision = "go";
  else decision = "go_with_conditions";

  const confidence = completenessScore >= 80 ? "high" : completenessScore >= 60 ? "medium" : "low";

  // Conditions
  const conditions: string[] = [];
  if (netFeesUSD < MIN_NET_FEES_USD) conditions.push(`Increase net fees to ≥ $${MIN_NET_FEES_USD.toLocaleString()} USD — currently $${Math.round(netFeesUSD).toLocaleString()} USD.`);
  if (yieldOnCost < minYoC) conditions.push(`Improve YoC to ≥ ${(minYoC * 100).toFixed(0)}% (currently ${(yieldOnCost * 100).toFixed(1)}%).`);
  if (completenessScore < 70) conditions.push(`Complete underwriting data (currently ${completenessScore}%). Add full feasibility study, contact info.`);

  // Red flags
  const redFlags: string[] = [];
  if (roomsMax < 50 && isUpscalePlus) redFlags.push(`${roomsMax} rooms below viable threshold for brand economics.`);
  if (outputs.simplePayback > 15) redFlags.push(`Simple payback ${outputs.simplePayback} years — marginal capital efficiency.`);
  if (yieldOnCost < minYoC * 0.75) redFlags.push(`YoC ${(yieldOnCost * 100).toFixed(1)}% significantly below owner threshold.`);
  for (const g of Object.values(hardGates).filter(g => !g.passed)) {
    redFlags.push(`Hard gate failed: ${g.name}`);
  }

  // Narrative
  const decisionLabel = decision === "go" ? "GO" : decision === "go_with_conditions" ? "GO WITH CONDITIONS" : "NO-GO";
  const narrative = `The Investment Committee has evaluated ${deal.name} as a ${preset.label} hotel project in ${deal.city}. IC Score: ${icScore}/100 → ${decisionLabel} (${confidence} confidence).\n\nBrand economics: stabilized net fees ~$${Math.round(netFeesUSD).toLocaleString()} USD/yr. ${netFeesUSD >= MIN_NET_FEES_USD ? "Exceeds minimum threshold." : "Below minimum threshold — corrective action required."}\n\nOwner economics: YoC ${(yieldOnCost * 100).toFixed(1)}% on MXN ${totalCapex.toLocaleString()} total CAPEX, simple payback ${outputs.simplePayback} yrs. ${yieldOnCost >= minYoC ? "Owner threshold met." : "Below owner threshold — deal requires restructuring."}\n\n${redFlags.length > 0 ? `Key concerns: ${redFlags.slice(0, 2).join("; ")}.` : "No critical red flags."} ${conditions.length > 0 ? `Conditions to advance: ${conditions.slice(0, 2).join("; ")}.` : "Recommend advance to LOI."}`;

  return {
    decision,
    ic_score: icScore,
    confidence,
    hard_gates_json: hardGates,
    conditions_json: conditions,
    red_flags_json: redFlags,
    thresholds_json: { MIN_NET_FEES_USD, MIN_YOC_LUXURY, MIN_YOC_UPSCALE, MAX_PAYBACK, MIN_ROOMS_UPSCALE },
    data_completeness: completenessScore,
    narrative_text: narrative,
    // Extra data for saving to other tables
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
