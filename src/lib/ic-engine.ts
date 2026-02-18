/**
 * AURORA DevOS MX — IC Decision Engine
 * Deterministic rule-based + weighted scoring system
 */

import { FeasibilityInputs, FeasibilityOutputs, FeasibilityYear } from "./feasibility";

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
  minYoC: number;
}

export const SEGMENT_PRESETS: Record<string, SegmentPreset> = {
  luxury: {
    label: "Luxury",
    adrLow: 6000, adrHigh: 20000,
    occLow: 0.55, occHigh: 0.72,
    gopLow: 0.35, gopHigh: 0.50,
    fnbCapture: 0.35, otherRevPct: 0.10,
    capexPerKeyLow: 4000000, capexPerKeyHigh: 10000000,
    ffePerKeyLow: 800000, ffePerKeyHigh: 2000000,
    baseFeeTypical: 0.03, incentiveFeeTypical: 0.08,
    minYoC: 0.07,
  },
  luxury_lifestyle: {
    label: "Luxury Lifestyle",
    adrLow: 3500, adrHigh: 8000,
    occLow: 0.60, occHigh: 0.78,
    gopLow: 0.32, gopHigh: 0.45,
    fnbCapture: 0.30, otherRevPct: 0.08,
    capexPerKeyLow: 3000000, capexPerKeyHigh: 7000000,
    ffePerKeyLow: 600000, ffePerKeyHigh: 1500000,
    baseFeeTypical: 0.03, incentiveFeeTypical: 0.08,
    minYoC: 0.075,
  },
  upper_upscale: {
    label: "Upper Upscale",
    adrLow: 2000, adrHigh: 5000,
    occLow: 0.62, occHigh: 0.80,
    gopLow: 0.30, gopHigh: 0.42,
    fnbCapture: 0.22, otherRevPct: 0.05,
    capexPerKeyLow: 1500000, capexPerKeyHigh: 4000000,
    ffePerKeyLow: 350000, ffePerKeyHigh: 800000,
    baseFeeTypical: 0.03, incentiveFeeTypical: 0.08,
    minYoC: 0.08,
  },
  midscale: {
    label: "Midscale",
    adrLow: 900, adrHigh: 2200,
    occLow: 0.65, occHigh: 0.82,
    gopLow: 0.28, gopHigh: 0.38,
    fnbCapture: 0.10, otherRevPct: 0.03,
    capexPerKeyLow: 700000, capexPerKeyHigh: 2000000,
    ffePerKeyLow: 150000, ffePerKeyHigh: 350000,
    baseFeeTypical: 0.04, incentiveFeeTypical: 0.10,
    minYoC: 0.08,
  },
};

export function getPresetWarnings(inputs: FeasibilityInputs): Array<{ field: string; message: string; level: "amber" | "red" }> {
  const preset = SEGMENT_PRESETS[inputs.segment];
  if (!preset) return [];
  const warnings: Array<{ field: string; message: string; level: "amber" | "red" }> = [];

  if (inputs.adr < preset.adrLow) {
    const severity = inputs.adr < preset.adrLow * 0.8 ? "red" : "amber";
    warnings.push({ field: "ADR", message: `ADR ${inputs.adr.toLocaleString()} MXN below ${preset.label} low bound (${preset.adrLow.toLocaleString()} MXN). Risk of brand dilution / revenue shortfall.`, level: severity });
  }
  if (inputs.adr > preset.adrHigh * 1.3) {
    warnings.push({ field: "ADR", message: `ADR seems exceptionally high for ${preset.label}. Validate with market data.`, level: "amber" });
  }
  if (inputs.occupancy < preset.occLow) {
    warnings.push({ field: "Occupancy", message: `Occupancy ${(inputs.occupancy * 100).toFixed(0)}% below typical ${preset.label} range (${(preset.occLow * 100).toFixed(0)}%–${(preset.occHigh * 100).toFixed(0)}%).`, level: "amber" });
  }
  if (inputs.gopMargin < preset.gopLow) {
    warnings.push({ field: "GOP Margin", message: `GOP ${(inputs.gopMargin * 100).toFixed(0)}% below ${preset.label} typical (${(preset.gopLow * 100).toFixed(0)}%–${(preset.gopHigh * 100).toFixed(0)}%). Check cost structure.`, level: inputs.gopMargin < preset.gopLow * 0.8 ? "red" : "amber" });
  }
  if (inputs.capexPerKey < preset.capexPerKeyLow * 0.7) {
    warnings.push({ field: "CAPEX/Key", message: `CAPEX/key very low for ${preset.label}. May indicate under-specification or conversion.`, level: "amber" });
  }
  if (inputs.capexPerKey > preset.capexPerKeyHigh * 1.2) {
    warnings.push({ field: "CAPEX/Key", message: `CAPEX/key above ${preset.label} typical high (${(preset.capexPerKeyHigh / 1000000).toFixed(1)}M MXN). Verify scope.`, level: "red" });
  }
  return warnings;
}

// ─── Two-Sided Economics ─────────────────────────────────────────────────────
export interface BrandEconomics {
  contractType: "management" | "franchise";
  // Revenues to brand
  baseFeeAnnual: number;
  incentiveFeeAnnual: number;
  royaltyAnnual?: number;
  marketingFeeAnnual?: number;
  totalGrossFees: number;
  supportCostsEstimate: number;
  netFees: number;
  netFeesUSD: number;
  // Key money (if applicable)
  keyMoney: number;
  keyMoneyROI: number; // net fees / key money
  keyMoneyPayback: number; // years
  // Brand payback
  simplePaybackBrand: number;
}

export interface OwnerEconomics {
  // Core metrics
  ebitdaY5: number; // = NOI proxy
  yieldOnCost: number; // ebitda / totalCapex
  // Debt scenario (optional)
  debtEnabled: boolean;
  ltv: number; // 0.55 default
  interestRate: number; // 0.09 default
  dscr: number; // NOI / annual debt service
  annualDebtService: number;
  // Exit
  capRate: number; // 0.08 default
  exitValue: number; // ebitda / capRate
  // IRR proxies (simplified)
  unleveragedIRR: number; // simple NPV-based proxy
  leveragedIRR: number;
  // Break-even
  breakEvenOccupancy: number; // occ needed for YoC >= threshold
  breakEvenADR: number; // ADR needed for YoC >= threshold
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
  // Use Year 3 as stabilized
  const stabYear = outputs.years[2] || outputs.years[outputs.years.length - 1];
  const totalRevStab = stabYear.totalRevenue;

  let baseFeeAnnual = 0;
  let incentiveFeeAnnual = 0;
  let royaltyAnnual = 0;
  let marketingFeeAnnual = 0;
  let totalGrossFees = 0;

  if (contractType === "management") {
    baseFeeAnnual = totalRevStab * inputs.baseFee;
    incentiveFeeAnnual = stabYear.gop * inputs.incentiveFee;
    totalGrossFees = baseFeeAnnual + incentiveFeeAnnual;
  } else {
    // Franchise: royalty ~3.5%, marketing ~1.5%, distribution ~1%, loyalty ~1%
    royaltyAnnual = totalRevStab * 0.035;
    marketingFeeAnnual = totalRevStab * 0.015;
    const distributionFee = totalRevStab * 0.01;
    const loyaltyFee = totalRevStab * 0.01;
    totalGrossFees = royaltyAnnual + marketingFeeAnnual + distributionFee + loyaltyFee;
  }

  const supportCostsEstimate = contractType === "management" ? totalGrossFees * 0.18 : totalGrossFees * 0.05;
  const netFees = totalGrossFees - supportCostsEstimate;
  const netFeesUSD = netFees / inputs.fxRate;

  const keyMoneyROI = keyMoney > 0 ? (netFees / keyMoney) * 100 : 0;
  const keyMoneyPayback = keyMoney > 0 && netFees > 0 ? keyMoney / netFees : 0;
  const simplePaybackBrand = netFees > 0 && keyMoney > 0 ? keyMoney / netFees : 0;

  return {
    contractType,
    baseFeeAnnual: Math.round(baseFeeAnnual),
    incentiveFeeAnnual: Math.round(incentiveFeeAnnual),
    royaltyAnnual: Math.round(royaltyAnnual),
    marketingFeeAnnual: Math.round(marketingFeeAnnual),
    totalGrossFees: Math.round(totalGrossFees),
    supportCostsEstimate: Math.round(supportCostsEstimate),
    netFees: Math.round(netFees),
    netFeesUSD: Math.round(netFeesUSD),
    keyMoney,
    keyMoneyROI: Math.round(keyMoneyROI * 10) / 10,
    keyMoneyPayback: Math.round(keyMoneyPayback * 10) / 10,
    simplePaybackBrand: Math.round(simplePaybackBrand * 10) / 10,
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

  // Debt
  const debtAmount = totalCapex * ltv;
  const annualDebtService = debtEnabled ? debtAmount * interestRate * 1.15 : 0; // simple amortization proxy
  const dscr = annualDebtService > 0 ? ebitdaY5 / annualDebtService : 0;

  // Exit
  const exitValue = capRate > 0 ? ebitdaY5 / capRate : 0;

  // Simplified IRR proxy (unlevered): assuming Year 5 exit, constant NOI
  const equity = debtEnabled ? totalCapex * (1 - ltv) : totalCapex;
  const noiAvg = outputs.years.reduce((s, y) => s + y.noi, 0) / outputs.years.length;
  // Unlevered IRR proxy: solve for r where sum(NOI/((1+r)^t)) + exitValue/((1+r)^5) = totalCapex
  const unleveragedIRR = computeSimpleIRR(totalCapex, outputs.years.map(y => y.noi), exitValue);
  // Levered: higher risk/return
  const leveredCashFlows = outputs.years.map(y => y.noi - annualDebtService);
  const leveredIRR = debtEnabled
    ? computeSimpleIRR(equity, leveredCashFlows, exitValue - debtAmount)
    : unleveragedIRR;

  // Break-even occupancy for YoC >= minYoC
  const preset = SEGMENT_PRESETS[inputs.segment];
  const minYoC = preset?.minYoC || 0.08;
  const minNOI = totalCapex * minYoC;
  // NOI = TotalRev * gopMargin - TotalRev * (baseFee + incentiveFee * gopMargin)
  // simplified: NOI ≈ TotalRev * (gopMargin - fees)
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
    leveragedIRR: Math.round(leveredIRR * 1000) / 10,
    breakEvenOccupancy: Math.min(Math.max(breakEvenOccupancy, 0), 0.99),
    breakEvenADR: Math.round(breakEvenADR),
  };
}

function computeSimpleIRR(investment: number, cashFlows: number[], exitValue: number): number {
  // Newton-Raphson on IRR
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

// ─── Data Completeness ───────────────────────────────────────────────────────
export interface CompletenessScore {
  score: number; // 0-100
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
    tasks: { weight: 8, label: "Next steps / tasks", check: () => false }, // checked externally
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
  minYoCUpscale: number;
  minYoCLuxury: number;
  minDSCR: number;
  minRoomsUpscale: number;
}

export const DEFAULT_THRESHOLDS: ICThresholds = {
  minNetFeesUSD: 350000,
  minROI: 18,
  maxPaybackYears: 6,
  minYoCUpscale: 0.08,
  minYoCLuxury: 0.07,
  minDSCR: 1.30,
  minRoomsUpscale: 70,
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
  brandScore: number; // 0-35
  ownerScore: number; // 0-25
  locationScore: number; // 0-20
  executionScore: number; // 0-20
  conditions: string[];
  redFlags: string[];
  narrative: string;
  dataCompleteness: number;
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

  // ── Hard Gates ───────────────────────────────────────────
  const hardGates: HardGateResult[] = [];
  const isLuxury = ["luxury", "luxury_lifestyle"].includes(deal.segment || inputs.segment);
  const isUpscalePlus = ["luxury", "luxury_lifestyle", "upper_upscale"].includes(deal.segment || inputs.segment);

  hardGates.push({
    name: "Data Completeness ≥ 55",
    passed: completeness.score >= 55,
    reason: completeness.score < 55 ? `Completeness ${completeness.score}% — insufficient underwriting data. Missing: ${completeness.missing.slice(0, 3).join(", ")}.` : undefined,
  });

  const roomsMax = deal.rooms_max || inputs.rooms;
  hardGates.push({
    name: `Min Rooms (${thresholds.minRoomsUpscale}) for Upscale+`,
    passed: !isUpscalePlus || roomsMax >= thresholds.minRoomsUpscale,
    reason: isUpscalePlus && roomsMax < thresholds.minRoomsUpscale
      ? `${roomsMax} rooms below ${thresholds.minRoomsUpscale} minimum for ${deal.segment} segment. Consider boutique flag or segment repositioning.`
      : undefined,
  });

  hardGates.push({
    name: "Net Fees USD ≥ Min Threshold",
    passed: brandEcon.netFeesUSD >= thresholds.minNetFeesUSD,
    reason: brandEcon.netFeesUSD < thresholds.minNetFeesUSD
      ? `Net fees $${brandEcon.netFeesUSD.toLocaleString()} USD below minimum $${thresholds.minNetFeesUSD.toLocaleString()} USD.`
      : undefined,
  });

  const hardGateFailed = hardGates.some(g => !g.passed);

  // ── Weighted Scoring ──────────────────────────────────────

  // Brand Economics (35%)
  let brandScore = 0;
  const netFeesRatio = brandEcon.netFeesUSD / thresholds.minNetFeesUSD;
  brandScore += Math.min(20, 20 * Math.min(netFeesRatio, 2) / 2); // 0-20 based on net fees vs threshold
  if (brandEcon.keyMoney > 0) {
    const roiScore = brandEcon.keyMoneyROI >= thresholds.minROI ? 10 : (brandEcon.keyMoneyROI / thresholds.minROI) * 10;
    brandScore += Math.min(10, roiScore);
    const paybackScore = brandEcon.keyMoneyPayback <= thresholds.maxPaybackYears ? 5 : Math.max(0, 5 - (brandEcon.keyMoneyPayback - thresholds.maxPaybackYears));
    brandScore += paybackScore;
  } else {
    brandScore += 15; // No key money risk — full allocation
  }
  brandScore = Math.min(35, Math.round(brandScore));

  // Owner Economics (25%)
  let ownerScore = 0;
  const minYoC = isLuxury ? thresholds.minYoCLuxury : thresholds.minYoCUpscale;
  const yocRatio = ownerEcon.yieldOnCost / minYoC;
  ownerScore += Math.min(15, 15 * Math.min(yocRatio, 1.5) / 1.5);
  if (ownerEcon.debtEnabled) {
    const dscrScore = ownerEcon.dscr >= thresholds.minDSCR ? 5 : Math.max(0, 5 * ownerEcon.dscr / thresholds.minDSCR);
    ownerScore += dscrScore;
  } else {
    ownerScore += 5; // No debt risk
  }
  const exitScore = ownerEcon.exitValue > outputs.totalCapex * 1.5 ? 5 : Math.max(0, 5 * (ownerEcon.exitValue - outputs.totalCapex) / (outputs.totalCapex * 0.5));
  ownerScore += exitScore;
  ownerScore = Math.min(25, Math.round(ownerScore));

  // Location/Market (20%)
  const locationRaw = (deal.score_breakdown as any)?.location || 0;
  const locationScore = Math.min(20, Math.round((locationRaw / 25) * 20));

  // Execution Risk (20%) — inverse of risk score
  const riskRaw = (deal.score_breakdown as any)?.risk || 0;
  const executionScore = Math.min(20, Math.round(((25 - riskRaw) / 25) * 20));

  const icScore = brandScore + ownerScore + locationScore + executionScore;

  // ── Decision Mapping ───────────────────────────────────────
  let decision: "go" | "go_with_conditions" | "no_go";
  if (hardGateFailed || icScore < 60) {
    decision = "no_go";
  } else if (icScore >= 75) {
    decision = "go";
  } else {
    decision = "go_with_conditions";
  }

  // ── Conditions Generator ────────────────────────────────────
  const preset = SEGMENT_PRESETS[inputs.segment] || SEGMENT_PRESETS.upper_upscale;

  if (brandEcon.netFeesUSD < thresholds.minNetFeesUSD) {
    conditions.push(`Increase net fees to ≥ $${thresholds.minNetFeesUSD.toLocaleString()} USD — currently $${brandEcon.netFeesUSD.toLocaleString()} USD. Explore larger room count or ADR upside.`);
  }
  if (ownerEcon.yieldOnCost < minYoC) {
    conditions.push(`Improve YoC to ≥ ${(minYoC * 100).toFixed(0)}% (currently ${(ownerEcon.yieldOnCost * 100).toFixed(1)}%). Reduce CAPEX/key, increase ADR, or renegotiate scope.`);
  }
  if (ownerEcon.debtEnabled && ownerEcon.dscr < thresholds.minDSCR) {
    conditions.push(`DSCR ${ownerEcon.dscr.toFixed(2)}x below minimum ${thresholds.minDSCR}x. Reduce leverage (LTV), improve NOI, or secure debt reserve.`);
  }
  if (inputs.adr < preset.adrLow) {
    conditions.push(`ADR ${inputs.adr.toLocaleString()} MXN below ${preset.label} low bound. Secure brand positioning premium or validate comp set support.`);
  }
  if (inputs.capexPerKey > preset.capexPerKeyHigh) {
    conditions.push(`CAPEX/key ${inputs.capexPerKey.toLocaleString()} MXN exceeds ${preset.label} typical high. Reduce to ≤ ${preset.capexPerKeyHigh.toLocaleString()} MXN or renegotiate construction scope.`);
  }
  if (completeness.score < 70) {
    conditions.push(`Complete underwriting data (currently ${completeness.score}%). Add: ${completeness.missing.slice(0, 3).join(", ")}.`);
  }
  if (!deal.lat || !deal.lon) {
    conditions.push("Confirm exact land parcel and obtain land-use compliance (e.g., CDMX SEDUVI or state municipal).");
  }

  // ── Red Flags ──────────────────────────────────────────────
  if (inputs.gopMargin < preset.gopLow * 0.8) redFlags.push(`GOP margin ${(inputs.gopMargin * 100).toFixed(0)}% critically below ${preset.label} standard — operational viability at risk.`);
  if (brandEcon.keyMoneyPayback > thresholds.maxPaybackYears * 1.5) redFlags.push(`Key money payback ${brandEcon.keyMoneyPayback} years — exceeds ${thresholds.maxPaybackYears * 1.5} year tolerance.`);
  if (completeness.score < 55) redFlags.push(`Data completeness ${completeness.score}% — insufficient for IC review. Underwriting is speculative.`);
  if (roomsMax < 50 && isUpscalePlus) redFlags.push(`${roomsMax} rooms — below viable threshold for brand economics. Consider boutique repositioning.`);
  if (outputs.simplePayback > 15) redFlags.push(`Simple payback ${outputs.simplePayback} years — marginal capital efficiency.`);
  if (ownerEcon.yieldOnCost < minYoC * 0.75) redFlags.push(`YoC ${(ownerEcon.yieldOnCost * 100).toFixed(1)}% — significantly below owner threshold. Difficult to compete with alternative allocations.`);
  for (const gate of hardGates.filter(g => !g.passed)) {
    redFlags.push(`Hard gate failed: ${gate.name} — ${gate.reason}`);
  }

  // ── Confidence ──────────────────────────────────────────────
  const sensitivityVolatility = Math.abs(
    (outputs.years[4]?.noi || 0) - (outputs.sensitivities.occDown10[4]?.noi || 0)
  ) / Math.max(1, outputs.years[4]?.noi || 1);

  let confidence: "high" | "medium" | "low";
  if (completeness.score >= 80 && sensitivityVolatility < 0.20) confidence = "high";
  else if (completeness.score >= 60 && sensitivityVolatility < 0.35) confidence = "medium";
  else confidence = "low";

  // ── Narrative ─────────────────────────────────────────────
  const city = deal.city || "the target market";
  const segment = preset.label;
  const decisionLabel = decision === "go" ? "GO" : decision === "go_with_conditions" ? "GO WITH CONDITIONS" : "NO-GO";
  const netFeesStr = `$${brandEcon.netFeesUSD.toLocaleString()} USD`;
  const yocStr = `${(ownerEcon.yieldOnCost * 100).toFixed(1)}%`;
  const paybackStr = `${outputs.simplePayback} years`;

  const narrative = `The Investment Committee has evaluated ${deal.name || "this opportunity"} as a ${segment} hotel project in ${city}. The overall IC Score is ${icScore}/100, leading to a ${decisionLabel} recommendation with ${confidence} confidence.

From a brand economics perspective, stabilized net fees to Accor are estimated at ${netFeesStr} annually under the ${brandEcon.contractType === "management" ? "management" : "franchise"} contract structure. ${brandEcon.netFeesUSD >= thresholds.minNetFeesUSD ? "This exceeds the minimum threshold, demonstrating viable brand economics." : "This falls below the minimum threshold, requiring corrective action."}

Owner economics indicate a yield on cost of ${yocStr} on total invested capital of ${outputs.totalCapex > 0 ? `MXN ${outputs.totalCapex.toLocaleString()}` : "TBD"}, with a simple payback of ${paybackStr}. ${ownerEcon.yieldOnCost >= minYoC ? "YoC meets the owner threshold, supporting a compelling investment case." : "YoC is below the owner minimum — the deal requires restructuring."}

${redFlags.length > 0 ? `Key concerns include: ${redFlags.slice(0, 2).join("; ")}. ` : "No critical red flags were identified. "}${conditions.length > 0 ? `To advance to LOI, the team must resolve the following: ${conditions.slice(0, 2).join("; ")}.` : "The deal is recommended for immediate advancement to LOI preparation."}`;

  return {
    decision,
    icScore,
    confidence,
    hardGates,
    hardGateFailed,
    brandScore,
    ownerScore,
    locationScore,
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
  tier: "strong" | "good" | "marginal" | "weak"; // for color coding
}

export function computeHeatmap(
  inputs: FeasibilityInputs,
  mode: "net_fees" | "yoc",
  fxRate: number,
): HeatmapCell[][] {
  const occs = [0.50, 0.55, 0.60, 0.65, 0.70, 0.75, 0.80];
  const adrs = [
    inputs.adr * 0.70,
    inputs.adr * 0.80,
    inputs.adr * 0.90,
    inputs.adr,
    inputs.adr * 1.10,
    inputs.adr * 1.20,
  ].map(a => Math.round(a / 100) * 100);

  return occs.map(occ => {
    return adrs.map(adr => {
      const modInputs = { ...inputs, adr, occupancy: occ };
      const { computeFeasibility } = require("./feasibility");
      const out = computeFeasibility(modInputs);
      const stabYear = out.years[2] || out.years[0];
      let value = 0;
      let tier: HeatmapCell["tier"] = "weak";

      if (mode === "net_fees") {
        const fees = stabYear.totalRevenue * (inputs.baseFee + inputs.incentiveFee * inputs.gopMargin);
        const netFees = fees * 0.82; // approx 18% support costs
        value = Math.round(netFees / fxRate);
        if (value >= 600000) tier = "strong";
        else if (value >= 400000) tier = "good";
        else if (value >= 250000) tier = "marginal";
        else tier = "weak";
      } else {
        const preset = SEGMENT_PRESETS[inputs.segment] || SEGMENT_PRESETS.upper_upscale;
        const yoc = stabYear.noi / out.totalCapex;
        value = Math.round(yoc * 1000) / 10; // percentage
        if (yoc >= preset.minYoC * 1.3) tier = "strong";
        else if (yoc >= preset.minYoC) tier = "good";
        else if (yoc >= preset.minYoC * 0.8) tier = "marginal";
        else tier = "weak";
      }

      return { occ, adr, value, tier };
    });
  });
}
