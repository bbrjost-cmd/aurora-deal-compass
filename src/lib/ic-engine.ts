/**
 * AURORA DevOS MX — IC Decision Engine (PMS&E Edition)
 * Economy / Midscale / Premium scoring: Location, Demand, Conversion Ease, Owner Quality, Execution Risk
 */

import { FeasibilityInputs, FeasibilityOutputs } from "./feasibility";

// ─── Segment Presets ──────────────────────────────────────────────────────────
export interface SegmentPreset {
  label: string;
  adrLow: number;
  adrHigh: number;
  occLow: number;
  occHigh: number;
  gopLow: number;
  gopHigh: number;
  fnbCapture: number;
  otherRevPct: number;
  capexPerKeyLow: number;
  capexPerKeyHigh: number;
  ffePerKeyLow: number;
  ffePerKeyHigh: number;
  baseFeeTypical: number;
  incentiveFeeTypical: number;
  royaltyTypical: number;
  minYoC: number;
  minRooms: number;
}

export const SEGMENT_PRESETS: Record<string, SegmentPreset> = {
  economy: {
    label: "Economy",
    adrLow: 600, adrHigh: 1400,
    occLow: 0.68, occHigh: 0.84,
    gopLow: 0.36, gopHigh: 0.48,
    fnbCapture: 0.04, otherRevPct: 0.02,
    capexPerKeyLow: 500000, capexPerKeyHigh: 1000000,
    ffePerKeyLow: 80000, ffePerKeyHigh: 180000,
    baseFeeTypical: 0.035, incentiveFeeTypical: 0.10,
    royaltyTypical: 0.05,
    minYoC: 0.08,
    minRooms: 50,
  },
  midscale: {
    label: "Midscale",
    adrLow: 1100, adrHigh: 2500,
    occLow: 0.62, occHigh: 0.80,
    gopLow: 0.30, gopHigh: 0.42,
    fnbCapture: 0.10, otherRevPct: 0.03,
    capexPerKeyLow: 900000, capexPerKeyHigh: 1800000,
    ffePerKeyLow: 150000, ffePerKeyHigh: 280000,
    baseFeeTypical: 0.030, incentiveFeeTypical: 0.09,
    royaltyTypical: 0.045,
    minYoC: 0.08,
    minRooms: 60,
  },
  premium: {
    label: "Premium",
    adrLow: 2000, adrHigh: 5000,
    occLow: 0.58, occHigh: 0.78,
    gopLow: 0.28, gopHigh: 0.40,
    fnbCapture: 0.18, otherRevPct: 0.05,
    capexPerKeyLow: 1800000, capexPerKeyHigh: 3500000,
    ffePerKeyLow: 300000, ffePerKeyHigh: 600000,
    baseFeeTypical: 0.030, incentiveFeeTypical: 0.08,
    royaltyTypical: 0.04,
    minYoC: 0.07,
    minRooms: 100,
  },
};

export function getPresetWarnings(inputs: FeasibilityInputs): Array<{ field: string; message: string; level: "amber" | "red" }> {
  const preset = SEGMENT_PRESETS[inputs.segment] || SEGMENT_PRESETS.midscale;
  const warnings: Array<{ field: string; message: string; level: "amber" | "red" }> = [];

  if (inputs.adr < preset.adrLow) {
    const severity = inputs.adr < preset.adrLow * 0.75 ? "red" : "amber";
    warnings.push({ field: "ADR", message: `ADR ${inputs.adr.toLocaleString()} MXN below ${preset.label} floor (${preset.adrLow.toLocaleString()} MXN). Risk of brand under-positioning.`, level: severity });
  }
  if (inputs.adr > preset.adrHigh * 1.3) {
    warnings.push({ field: "ADR", message: `ADR unusually high for ${preset.label}. Validate market comparables.`, level: "amber" });
  }
  if (inputs.occupancy < preset.occLow) {
    warnings.push({ field: "Occupancy", message: `Occupancy ${(inputs.occupancy * 100).toFixed(0)}% below typical ${preset.label} range (${(preset.occLow * 100).toFixed(0)}%–${(preset.occHigh * 100).toFixed(0)}%).`, level: "amber" });
  }
  if (inputs.gopMargin < preset.gopLow) {
    warnings.push({ field: "GOP Margin", message: `GOP ${(inputs.gopMargin * 100).toFixed(0)}% below ${preset.label} standard (${(preset.gopLow * 100).toFixed(0)}%–${(preset.gopHigh * 100).toFixed(0)}%). Review cost structure.`, level: inputs.gopMargin < preset.gopLow * 0.8 ? "red" : "amber" });
  }
  if (inputs.capexPerKey > preset.capexPerKeyHigh * 1.2) {
    warnings.push({ field: "CAPEX/Key", message: `CAPEX/key above ${preset.label} typical high (${(preset.capexPerKeyHigh / 1000000).toFixed(1)}M MXN). Consider conversion vs new build.`, level: "red" });
  }
  if (inputs.capexPerKey < preset.capexPerKeyLow * 0.6) {
    warnings.push({ field: "CAPEX/Key", message: `CAPEX/key very low for ${preset.label}. Validate scope — may indicate under-specification.`, level: "amber" });
  }
  return warnings;
}

// ─── Brand & Owner Economics ──────────────────────────────────────────────────
export interface BrandEconomics {
  contractType: "management" | "franchise";
  baseFeeAnnual: number;
  incentiveFeeAnnual: number;
  royaltyAnnual?: number;
  marketingFeeAnnual?: number;
  distributionFeeAnnual?: number;
  totalGrossFees: number;
  supportCostsEstimate: number;
  netFees: number;
  netFeesUSD: number;
  keyMoney: number;
  keyMoneyROI: number;
  keyMoneyPayback: number;
  simplePaybackBrand: number;
}

export interface OwnerEconomics {
  ebitdaY5: number;
  yieldOnCost: number;
  debtEnabled: boolean;
  ltv: number;
  interestRate: number;
  dscr: number;
  annualDebtService: number;
  capRate: number;
  exitValue: number;
  unleveragedIRR: number;
  leveragedIRR: number;
  breakEvenOccupancy: number;
  breakEvenADR: number;
}

export interface TwoSidedEconomics {
  brand: BrandEconomics;
  owner: OwnerEconomics;
  perspective: "brand" | "owner";
}

export function computeBrandEconomics(
  inputs: FeasibilityInputs,
  outputs: FeasibilityOutputs,
  contractType: "management" | "franchise",
  keyMoney: number = 0,
): BrandEconomics {
  const stabYear = outputs.years[2] || outputs.years[outputs.years.length - 1];
  const totalRevStab = stabYear.totalRevenue;
  const roomsRevStab = stabYear.roomsRevenue;

  let baseFeeAnnual = 0, incentiveFeeAnnual = 0;
  let royaltyAnnual = 0, marketingFeeAnnual = 0, distributionFeeAnnual = 0;
  let totalGrossFees = 0;

  if (contractType === "franchise") {
    const royaltyPct = (inputs as any).royaltyPct ?? 0.045;
    const marketingPct = (inputs as any).marketingPct ?? 0.015;
    const distributionPct = (inputs as any).distributionPct ?? 0.010;
    royaltyAnnual = roomsRevStab * royaltyPct;
    marketingFeeAnnual = roomsRevStab * marketingPct;
    distributionFeeAnnual = roomsRevStab * distributionPct;
    totalGrossFees = royaltyAnnual + marketingFeeAnnual + distributionFeeAnnual;
  } else {
    baseFeeAnnual = totalRevStab * inputs.baseFee;
    incentiveFeeAnnual = stabYear.gop * inputs.incentiveFee;
    totalGrossFees = baseFeeAnnual + incentiveFeeAnnual;
  }

  const supportCostsEstimate = contractType === "management"
    ? totalGrossFees * 0.18
    : totalGrossFees * 0.06; // franchise has lower support overhead
  const netFees = totalGrossFees - supportCostsEstimate;
  const netFeesUSD = netFees / inputs.fxRate;

  const keyMoneyROI = keyMoney > 0 ? (netFees / keyMoney) * 100 : 0;
  const keyMoneyPayback = keyMoney > 0 && netFees > 0 ? keyMoney / netFees : 0;

  return {
    contractType,
    baseFeeAnnual: Math.round(baseFeeAnnual),
    incentiveFeeAnnual: Math.round(incentiveFeeAnnual),
    royaltyAnnual: Math.round(royaltyAnnual),
    marketingFeeAnnual: Math.round(marketingFeeAnnual),
    distributionFeeAnnual: Math.round(distributionFeeAnnual),
    totalGrossFees: Math.round(totalGrossFees),
    supportCostsEstimate: Math.round(supportCostsEstimate),
    netFees: Math.round(netFees),
    netFeesUSD: Math.round(netFeesUSD),
    keyMoney,
    keyMoneyROI: Math.round(keyMoneyROI * 10) / 10,
    keyMoneyPayback: Math.round(keyMoneyPayback * 10) / 10,
    simplePaybackBrand: Math.round((keyMoney > 0 && netFees > 0 ? keyMoney / netFees : 0) * 10) / 10,
  };
}

export function computeOwnerEconomics(
  inputs: FeasibilityInputs,
  outputs: FeasibilityOutputs,
  debtEnabled: boolean = false,
  ltv: number = 0.55,
  interestRate: number = 0.09,
  capRate: number = 0.08,
): OwnerEconomics {
  const stabYear = outputs.years[2] || outputs.years[outputs.years.length - 1];
  const ebitdaY5 = stabYear.noi;
  const totalCapex = outputs.totalCapex;

  const yieldOnCost = totalCapex > 0 ? ebitdaY5 / totalCapex : 0;

  const debtAmount = totalCapex * ltv;
  const annualDebtService = debtEnabled ? debtAmount * interestRate * 1.15 : 0;
  const dscr = annualDebtService > 0 ? ebitdaY5 / annualDebtService : 0;

  const exitValue = capRate > 0 ? ebitdaY5 / capRate : 0;

  const equity = debtEnabled ? totalCapex * (1 - ltv) : totalCapex;
  const unleveragedIRR = computeSimpleIRR(totalCapex, outputs.years.map(y => y.noi), exitValue);
  const leveredCashFlows = outputs.years.map(y => y.noi - annualDebtService);
  const leveragedIRR = debtEnabled
    ? computeSimpleIRR(equity, leveredCashFlows, exitValue - debtAmount)
    : unleveragedIRR;

  const preset = SEGMENT_PRESETS[inputs.segment] || SEGMENT_PRESETS.midscale;
  const minYoC = preset.minYoC;
  const minNOI = totalCapex * minYoC;
  const netMargin = inputs.gopMargin - (inputs.baseFee + inputs.incentiveFee * inputs.gopMargin);
  const revPerRoomNight = inputs.adr * (1 + inputs.fnbRevenuePct + inputs.otherRevenuePct);
  const breakEvenOccupancy = netMargin > 0 && inputs.rooms > 0
    ? minNOI / (inputs.rooms * 365 * revPerRoomNight * netMargin)
    : 0;
  const breakEvenADR = inputs.occupancy > 0 && netMargin > 0 && inputs.rooms > 0
    ? minNOI / (inputs.rooms * 365 * inputs.occupancy * (1 + inputs.fnbRevenuePct + inputs.otherRevenuePct) * netMargin)
    : 0;

  return {
    ebitdaY5: Math.round(ebitdaY5),
    yieldOnCost: Math.round(yieldOnCost * 1000) / 1000,
    debtEnabled,
    ltv,
    interestRate,
    dscr: Math.round(dscr * 100) / 100,
    annualDebtService: Math.round(annualDebtService),
    capRate,
    exitValue: Math.round(exitValue),
    unleveragedIRR: Math.round(unleveragedIRR * 1000) / 10,
    leveragedIRR: Math.round(leveragedIRR * 1000) / 10,
    breakEvenOccupancy: Math.min(Math.max(breakEvenOccupancy, 0), 0.99),
    breakEvenADR: Math.round(breakEvenADR),
  };
}

function computeSimpleIRR(investment: number, cashFlows: number[], exitValue: number): number {
  if (investment <= 0) return 0;
  let r = 0.10;
  for (let iter = 0; iter < 50; iter++) {
    let npv = -investment, dnpv = 0;
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

// ─── Data Completeness ───────────────────────────────────────────────────────
export interface CompletenessScore {
  score: number;
  breakdown: Record<string, { weight: number; earned: number; label: string }>;
  missing: string[];
}

export function computeCompleteness(deal: any, hasFeasInputs: boolean, contactCount: number = 0): CompletenessScore {
  const fields: Record<string, { weight: number; check: () => boolean; label: string }> = {
    location: { weight: 10, label: "Location (city/state)", check: () => !!(deal.city && deal.state) },
    coordinates: { weight: 5, label: "GPS coordinates", check: () => !!(deal.lat && deal.lon) },
    segment: { weight: 8, label: "Segment", check: () => !!deal.segment },
    rooms: { weight: 8, label: "Rooms range", check: () => !!(deal.rooms_min && deal.rooms_max) },
    opening_type: { weight: 5, label: "Opening type", check: () => !!deal.opening_type },
    stage: { weight: 5, label: "Stage defined", check: () => !!deal.stage && deal.stage !== "lead" },
    address: { weight: 5, label: "Address", check: () => !!deal.address },
    score: { weight: 8, label: "Qualification score", check: () => (deal.score_total || 0) > 0 },
    feasibility: { weight: 30, label: "Feasibility inputs", check: () => hasFeasInputs },
    contact: { weight: 8, label: "Contact information", check: () => contactCount > 0 },
    tasks: { weight: 8, label: "Next steps / tasks", check: () => false },
  };

  const breakdown: Record<string, { weight: number; earned: number; label: string }> = {};
  const missing: string[] = [];
  let total = 0;

  for (const [key, def] of Object.entries(fields)) {
    const passed = def.check();
    const earned = passed ? def.weight : 0;
    breakdown[key] = { weight: def.weight, earned, label: def.label };
    total += earned;
    if (!passed) missing.push(def.label);
  }

  return { score: Math.min(100, total), breakdown, missing };
}

// ─── IC Decision Engine ───────────────────────────────────────────────────────
export interface ICThresholds {
  minNetFeesUSD: number;
  minROI: number;
  maxPaybackYears: number;
  minYoCPremium: number;
  minYoCMidscaleEconomy: number;
  minDSCR: number;
  minRoomsEconomy: number;
  minRoomsMidscale: number;
  minRoomsPremium: number;
}

export const DEFAULT_THRESHOLDS: ICThresholds = {
  minNetFeesUSD: 120000,   // Lower for PMS&E franchise model
  minROI: 15,
  maxPaybackYears: 8,
  minYoCPremium: 0.07,
  minYoCMidscaleEconomy: 0.08,
  minDSCR: 1.30,
  minRoomsEconomy: 50,
  minRoomsMidscale: 60,
  minRoomsPremium: 100,
};

export interface HardGateResult {
  passed: boolean;
  name: string;
  reason?: string;
}

export interface ICDecision {
  decision: "go" | "go_with_conditions" | "no_go";
  icScore: number;
  confidence: "high" | "medium" | "low";
  hardGates: HardGateResult[];
  hardGateFailed: boolean;
  locationScore: number;     // 0–25
  demandScore: number;       // 0–25
  conversionScore: number;   // 0–20
  ownerScore: number;        // 0–15
  executionScore: number;    // 0–15
  conditions: string[];
  redFlags: string[];
  narrative: string;
  dataCompleteness: number;
}

// Legacy field alias for backward compat
export interface ICDecisionLegacy extends ICDecision {
  brandScore: number;
}

export function computeICDecision(
  deal: any,
  inputs: FeasibilityInputs,
  outputs: FeasibilityOutputs,
  brandEcon: BrandEconomics,
  ownerEcon: OwnerEconomics,
  completeness: CompletenessScore,
  thresholds: ICThresholds = DEFAULT_THRESHOLDS,
): ICDecision {
  const redFlags: string[] = [];
  const conditions: string[] = [];

  const segment = deal.segment || inputs.segment || 'midscale';
  // Normalise any legacy segment values to supported PMS&E segments
  const normSegment = segment === 'premium' ? 'premium'
    : segment === 'economy' ? 'economy'
    : 'midscale';
  const preset = SEGMENT_PRESETS[normSegment] || SEGMENT_PRESETS.midscale;
  const isPremium = normSegment === 'premium';
  const isConversion = ['conversion', 'rebranding', 'franchise_takeover'].includes(deal.opening_type || inputs.openingType || '');

  // Min rooms threshold by segment
  const minRooms = isPremium ? thresholds.minRoomsPremium : segment === 'midscale' ? thresholds.minRoomsMidscale : thresholds.minRoomsEconomy;
  const roomsMax = deal.rooms_max || inputs.rooms;
  const minYoC = isPremium ? thresholds.minYoCPremium : thresholds.minYoCMidscaleEconomy;

  // ── Hard Gates ────────────────────────────────────────────
  const hardGates: HardGateResult[] = [];

  hardGates.push({
    name: "Data Completeness ≥ 50",
    passed: completeness.score >= 50,
    reason: completeness.score < 50 ? `Completeness ${completeness.score}% — insufficient data. Missing: ${completeness.missing.slice(0, 3).join(", ")}.` : undefined,
  });

  hardGates.push({
    name: `Min Rooms (${minRooms}) for ${preset.label}`,
    passed: roomsMax >= minRooms,
    reason: roomsMax < minRooms ? `${roomsMax} rooms below ${minRooms} minimum for ${preset.label} brand economics.` : undefined,
  });

  hardGates.push({
    name: "ADR in Segment Range",
    passed: inputs.adr >= preset.adrLow * 0.7,
    reason: inputs.adr < preset.adrLow * 0.7 ? `ADR ${inputs.adr.toLocaleString()} MXN incompatible with ${preset.label} segment. Cannot support brand fee structure.` : undefined,
  });

  hardGates.push({
    name: "CAPEX/Key Realistic",
    passed: inputs.capexPerKey <= preset.capexPerKeyHigh * 1.5,
    reason: inputs.capexPerKey > preset.capexPerKeyHigh * 1.5 ? `CAPEX/key ${inputs.capexPerKey.toLocaleString()} MXN far exceeds ${preset.label} typical maximum. Deal economics broken.` : undefined,
  });

  const hardGateFailed = hardGates.some(g => !g.passed);

  // ── Weighted Scoring (100 pts total) ─────────────────────
  // Location (0–25)
  const locationRaw = (deal.score_breakdown as any)?.location || 0;
  const locationScore = Math.min(25, Math.round((locationRaw / 25) * 25));

  // Demand Strength (0–25)
  let demandScore = 0;
  const occRatio = inputs.occupancy / preset.occHigh;
  demandScore += Math.min(12, Math.round(12 * Math.min(occRatio, 1)));
  const adrRatio = Math.min(inputs.adr / preset.adrHigh, 1.2);
  demandScore += Math.min(8, Math.round(8 * Math.min(adrRatio, 1)));
  if (brandEcon.netFeesUSD >= thresholds.minNetFeesUSD) demandScore += 5;
  else demandScore += Math.round(5 * brandEcon.netFeesUSD / thresholds.minNetFeesUSD);
  demandScore = Math.min(25, Math.round(demandScore));

  // Conversion Ease (0–20) — critical for PMS&E strategy
  let conversionScore = 0;
  if (isConversion) conversionScore += 8; // Existing hotel structure
  else conversionScore += 2;             // New build baseline
  if (roomsMax >= minRooms && roomsMax <= minRooms * 4) conversionScore += 5; // Room count compatible
  const capexRatio = inputs.capexPerKey / preset.capexPerKeyHigh;
  if (capexRatio <= 0.8) conversionScore += 4; // CAPEX efficient
  else if (capexRatio <= 1.0) conversionScore += 2;
  if (inputs.adr >= preset.adrLow && inputs.adr <= preset.adrHigh) conversionScore += 3; // Brand ADR viable
  conversionScore = Math.min(20, Math.round(conversionScore));

  // Owner / Asset Quality (0–15)
  let ownerScore = 0;
  const yocRatio = ownerEcon.yieldOnCost / minYoC;
  ownerScore += Math.min(10, Math.round(10 * Math.min(yocRatio, 1.5) / 1.5));
  if (ownerEcon.debtEnabled) {
    ownerScore += ownerEcon.dscr >= thresholds.minDSCR ? 5 : Math.round(5 * ownerEcon.dscr / thresholds.minDSCR);
  } else {
    ownerScore += 5;
  }
  ownerScore = Math.min(15, Math.round(ownerScore));

  // Execution Risk (0–15) — inverse of risk
  const riskRaw = (deal.score_breakdown as any)?.risk || 0;
  const executionScore = Math.min(15, Math.round(((25 - riskRaw) / 25) * 15));

  const icScore = locationScore + demandScore + conversionScore + ownerScore + executionScore;

  // ── Decision Mapping ──────────────────────────────────────
  let decision: "go" | "go_with_conditions" | "no_go";
  if (hardGateFailed || icScore < 55) {
    decision = "no_go";
  } else if (icScore >= 72) {
    decision = "go";
  } else {
    decision = "go_with_conditions";
  }

  // ── Conditions Generator ──────────────────────────────────
  if (inputs.capexPerKey > preset.capexPerKeyHigh) {
    conditions.push(`Reduce CAPEX/key to ≤ ${(preset.capexPerKeyHigh / 1000000).toFixed(1)}M MXN (currently ${(inputs.capexPerKey / 1000000).toFixed(1)}M). Consider phased renovation or conversion scope reduction.`);
  }
  if (inputs.adr < preset.adrLow) {
    conditions.push(`Reposition ADR strategy to ≥ ${preset.adrLow.toLocaleString()} MXN. Validate comp set and demand generators.`);
  }
  if (ownerEcon.yieldOnCost < minYoC) {
    conditions.push(`Improve YoC to ≥ ${(minYoC * 100).toFixed(0)}% (currently ${(ownerEcon.yieldOnCost * 100).toFixed(1)}%). Reduce CAPEX, increase ADR, or optimize operating model.`);
  }
  if (brandEcon.contractType === 'management' && brandEcon.netFeesUSD < thresholds.minNetFeesUSD) {
    conditions.push(`Switch to Franchise contract — management fees $${brandEcon.netFeesUSD.toLocaleString()} USD below viability threshold. Franchise royalties more efficient at this scale.`);
  }
  if (ownerEcon.debtEnabled && ownerEcon.dscr < thresholds.minDSCR) {
    conditions.push(`DSCR ${ownerEcon.dscr.toFixed(2)}x below ${thresholds.minDSCR}x minimum. Reduce LTV or improve NOI before debt drawdown.`);
  }
  if (completeness.score < 65) {
    conditions.push(`Complete underwriting data (currently ${completeness.score}%). Add: ${completeness.missing.slice(0, 3).join(", ")}.`);
  }
  if (!isConversion && segment === 'economy') {
    conditions.push(`Prefer Conversion or Franchise Takeover over New Build for Economy segment — faster time-to-market and lower CAPEX risk.`);
  }

  // ── Red Flags ─────────────────────────────────────────────
  if (inputs.gopMargin < preset.gopLow * 0.8) redFlags.push(`GOP ${(inputs.gopMargin * 100).toFixed(0)}% critically below ${preset.label} minimum — operational viability at risk.`);
  if (completeness.score < 50) redFlags.push(`Data completeness ${completeness.score}% — insufficient for IC review.`);
  if (roomsMax < minRooms) redFlags.push(`${roomsMax} rooms below ${minRooms} minimum for ${preset.label} brand.`);
  if (outputs.simplePayback > 12) redFlags.push(`Simple payback ${outputs.simplePayback} years — marginal for segment.`);
  if (ownerEcon.yieldOnCost < minYoC * 0.70) redFlags.push(`YoC ${(ownerEcon.yieldOnCost * 100).toFixed(1)}% — significantly below ${(minYoC * 100).toFixed(0)}% owner threshold.`);
  for (const gate of hardGates.filter(g => !g.passed)) {
    redFlags.push(`Hard gate failed: ${gate.name} — ${gate.reason}`);
  }

  // ── Confidence ────────────────────────────────────────────
  const sensitivityVolatility = Math.abs(
    (outputs.years[4]?.noi || 0) - (outputs.sensitivities.occDown10[4]?.noi || 0)
  ) / Math.max(1, outputs.years[4]?.noi || 1);

  let confidence: "high" | "medium" | "low";
  if (completeness.score >= 80 && sensitivityVolatility < 0.20) confidence = "high";
  else if (completeness.score >= 60 && sensitivityVolatility < 0.35) confidence = "medium";
  else confidence = "low";

  // ── Narrative ─────────────────────────────────────────────
  const city = deal.city || "the target market";
  const brandName = inputs.brand || preset.label;
  const contractLabel = brandEcon.contractType === 'franchise' ? 'Franchise' : 'Management';
  const decisionLabel = decision === "go" ? "GO" : decision === "go_with_conditions" ? "GO WITH CONDITIONS" : "NO-GO";
  const yocStr = `${(ownerEcon.yieldOnCost * 100).toFixed(1)}%`;
  const paybackStr = `${outputs.simplePayback} years`;
  const convEase = isConversion ? 'as a conversion project' : 'as a new build';

  const narrative = `The Investment Committee has screened ${deal.name || "this opportunity"} ${convEase} for the ${brandName} brand in ${city} (${preset.label} segment). IC Score: ${icScore}/100 → ${decisionLabel} with ${confidence} confidence.

Brand economics under the ${contractLabel} contract: stabilized net fees estimated at $${brandEcon.netFeesUSD.toLocaleString()} USD/year. ${brandEcon.netFeesUSD >= thresholds.minNetFeesUSD ? "Meets minimum viability threshold." : "Below minimum threshold — requires restructuring."}

Owner economics: YoC ${yocStr} on total CAPEX of ${outputs.totalCapex > 0 ? `MXN ${(outputs.totalCapex / 1000000).toFixed(1)}M` : "TBD"}, simple payback ${paybackStr}. ${ownerEcon.yieldOnCost >= minYoC ? "Owner threshold met." : "Owner return below threshold — CAPEX reduction or ADR improvement required."}

Conversion Ease Score: ${conversionScore}/20. ${conversionScore >= 15 ? "Strong conversion suitability." : conversionScore >= 10 ? "Moderate conversion complexity — phased approach recommended." : "Low conversion suitability — validate structural and brand positioning fit."}

${redFlags.length > 0 ? `Key concerns: ${redFlags.slice(0, 2).join("; ")}.` : "No critical red flags identified."} ${conditions.length > 0 ? `Conditions to advance: ${conditions.slice(0, 2).join("; ")}.` : "Recommend advancement to LOI preparation."}`;

  return {
    decision,
    icScore,
    confidence,
    hardGates,
    hardGateFailed,
    locationScore,
    demandScore,
    conversionScore,
    ownerScore,
    executionScore,
    conditions,
    redFlags,
    narrative,
    dataCompleteness: completeness.score,
  };
}

// ─── Sensitivity Heatmap ─────────────────────────────────────────────────────
export interface HeatmapCell {
  occ: number;
  adr: number;
  value: number;
  tier: "strong" | "good" | "marginal" | "weak";
}

export function computeHeatmap(
  inputs: FeasibilityInputs,
  mode: "net_fees" | "yoc",
  fxRate: number,
): HeatmapCell[][] {
  const occs = [0.50, 0.55, 0.60, 0.65, 0.70, 0.75, 0.80];
  const adrs = [
    inputs.adr * 0.70, inputs.adr * 0.80, inputs.adr * 0.90,
    inputs.adr, inputs.adr * 1.10, inputs.adr * 1.20,
  ].map(a => Math.round(a / 100) * 100);

  const { computeFeasibility } = require("./feasibility");

  return occs.map(occ => {
    return adrs.map(adr => {
      const modInputs = { ...inputs, adr, occupancy: occ };
      const out = computeFeasibility(modInputs);
      const stabYear = out.years[2] || out.years[0];
      let value = 0;
      let tier: HeatmapCell["tier"] = "weak";
      const preset = SEGMENT_PRESETS[inputs.segment] || SEGMENT_PRESETS.midscale;

      if (mode === "net_fees") {
        const royaltyPct = (inputs as any).royaltyPct ?? preset.royaltyTypical;
        const totalFeePct = royaltyPct + 0.015 + 0.01;
        const fees = stabYear.roomsRevenue * totalFeePct;
        value = Math.round(fees * 0.94 / fxRate);
        if (value >= 250000) tier = "strong";
        else if (value >= 120000) tier = "good";
        else if (value >= 60000) tier = "marginal";
        else tier = "weak";
      } else {
        const yoc = stabYear.noi / out.totalCapex;
        value = Math.round(yoc * 1000) / 10;
        if (yoc >= preset.minYoC * 1.3) tier = "strong";
        else if (yoc >= preset.minYoC) tier = "good";
        else if (yoc >= preset.minYoC * 0.8) tier = "marginal";
        else tier = "weak";
      }

      return { occ, adr, value, tier };
    });
  });
}
