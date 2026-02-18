/**
 * AURORA DevOS MX — Feasibility Model (PMS&E Edition)
 * Economy / Midscale / Premium — Franchise & Management contracts
 */

export interface FeasibilityInputs {
  rooms: number;
  segment: string;          // economy | midscale | premium
  brand: string;            // specific brand (ibis, Novotel, Pullman…)
  openingType: string;      // conversion | new_build | franchise_takeover | rebranding
  contractType: string;     // franchise | management
  adr: number;              // MXN
  occupancy: number;        // 0–1
  fnbRevenuePct: number;
  otherRevenuePct: number;
  gopMargin: number;
  rampUpYears: number;
  capexPerKey: number;      // MXN
  ffePerKey: number;        // MXN
  // Franchise fees
  royaltyPct: number;       // % of rooms revenue
  marketingPct: number;     // % of rooms revenue
  distributionPct: number;  // % of rooms revenue
  // Management fees (if management contract)
  baseFee: number;          // % of total revenue
  incentiveFee: number;     // % of GOP
  // Financial
  fxRate: number;           // MXN/USD
  debtEnabled?: boolean;
  ltv?: number;
  interestRate?: number;
  capRate?: number;
  // Legacy compatibility
  keyMoney?: number;
  perspective?: 'brand' | 'owner';
  waterRisk?: 'low' | 'medium' | 'high';
  permittingRisk?: 'low' | 'medium' | 'high';
}

export interface FeasibilityYear {
  year: number;
  occupancy: number;
  roomsRevenue: number;
  totalRevenue: number;
  revpar: number;
  gop: number;
  fees: number;
  noi: number;
}

export interface FeasibilityOutputs {
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

// ─── Segment defaults ─────────────────────────────────────────────────────────
const SEGMENT_DEFAULTS: Record<string, Partial<FeasibilityInputs>> = {
  economy: {
    adr: 900,
    occupancy: 0.74,
    gopMargin: 0.40,
    fnbRevenuePct: 0.05,
    otherRevenuePct: 0.02,
    capexPerKey: 700000,
    ffePerKey: 120000,
    royaltyPct: 0.050,
    marketingPct: 0.015,
    distributionPct: 0.010,
    baseFee: 0.035,
    incentiveFee: 0.10,
    rampUpYears: 1,
  },
  midscale: {
    adr: 1600,
    occupancy: 0.68,
    gopMargin: 0.35,
    fnbRevenuePct: 0.12,
    otherRevenuePct: 0.03,
    capexPerKey: 1200000,
    ffePerKey: 200000,
    royaltyPct: 0.045,
    marketingPct: 0.015,
    distributionPct: 0.010,
    baseFee: 0.030,
    incentiveFee: 0.09,
    rampUpYears: 2,
  },
  premium: {
    adr: 3000,
    occupancy: 0.65,
    gopMargin: 0.33,
    fnbRevenuePct: 0.20,
    otherRevenuePct: 0.05,
    capexPerKey: 2500000,
    ffePerKey: 400000,
    royaltyPct: 0.040,
    marketingPct: 0.015,
    distributionPct: 0.010,
    baseFee: 0.030,
    incentiveFee: 0.08,
    rampUpYears: 2,
  },
};

export function getSegmentDefaults(segment: string): Partial<FeasibilityInputs> {
  return SEGMENT_DEFAULTS[segment] || SEGMENT_DEFAULTS.midscale;
}

export const DEFAULT_INPUTS: FeasibilityInputs = {
  rooms: 120,
  segment: 'midscale',
  brand: 'Novotel',
  openingType: 'conversion',
  contractType: 'franchise',
  adr: 1600,
  occupancy: 0.68,
  fnbRevenuePct: 0.12,
  otherRevenuePct: 0.03,
  gopMargin: 0.35,
  rampUpYears: 2,
  capexPerKey: 1200000,
  ffePerKey: 200000,
  royaltyPct: 0.045,
  marketingPct: 0.015,
  distributionPct: 0.010,
  baseFee: 0.030,
  incentiveFee: 0.09,
  fxRate: 17.5,
  keyMoney: 0,
  debtEnabled: false,
  ltv: 0.55,
  interestRate: 0.09,
  capRate: 0.08,
  perspective: 'brand',
  waterRisk: 'low',
  permittingRisk: 'low',
};

function computeFees(inputs: FeasibilityInputs, roomsRevenue: number, totalRevenue: number, gop: number): number {
  if (inputs.contractType === 'franchise') {
    return roomsRevenue * (inputs.royaltyPct + inputs.marketingPct + inputs.distributionPct);
  } else {
    return totalRevenue * inputs.baseFee + gop * inputs.incentiveFee;
  }
}

function computeYears(
  inputs: FeasibilityInputs,
  adrOverride?: number,
  occOverride?: number,
  _fxOverride?: number,
): FeasibilityYear[] {
  const years: FeasibilityYear[] = [];
  const adr = adrOverride ?? inputs.adr;
  const baseOcc = occOverride ?? inputs.occupancy;

  for (let y = 1; y <= 5; y++) {
    const rampFactor = y <= inputs.rampUpYears ? (0.65 + (0.35 * y / inputs.rampUpYears)) : 1;
    const occ = Math.min(baseOcc * rampFactor, 0.95);
    const roomNights = inputs.rooms * 365 * occ;
    const roomsRevenue = roomNights * adr;
    const totalRevenue = roomsRevenue * (1 + inputs.fnbRevenuePct + inputs.otherRevenuePct);
    const gop = totalRevenue * inputs.gopMargin;
    const fees = computeFees(inputs, roomsRevenue, totalRevenue, gop);
    const noi = gop - fees;
    const revpar = occ * adr;

    years.push({
      year: y,
      occupancy: occ,
      roomsRevenue: Math.round(roomsRevenue),
      totalRevenue: Math.round(totalRevenue),
      revpar: Math.round(revpar),
      gop: Math.round(gop),
      fees: Math.round(fees),
      noi: Math.round(noi),
    });
  }
  return years;
}

export function computeFeasibility(inputs: FeasibilityInputs): FeasibilityOutputs {
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
      fxShock: computeYears(inputs, undefined, undefined, inputs.fxRate * 1.15),
      severe,
    },
  };
}

export function formatMXN(value: number): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(value);
}

export function formatUSD(value: number, fxRate: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value / fxRate);
}

export function formatMillions(value: number, currency: string = 'MXN'): string {
  const m = value / 1000000;
  return `${m.toFixed(1)}M ${currency}`;
}
