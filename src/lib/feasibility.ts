/**
 * AURORA DevOS MX — Extended Feasibility Model
 * Enhanced with brand/owner economics
 */

export interface FeasibilityInputs {
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
  // Extended
  keyMoney?: number;
  debtEnabled?: boolean;
  ltv?: number;
  interestRate?: number;
  capRate?: number;
  perspective?: "brand" | "owner";
  waterRisk?: "low" | "medium" | "high";
  permittingRisk?: "low" | "medium" | "high";
}

export interface FeasibilityYear {
  year: number;
  occupancy: number;
  roomsRevenue: number;
  totalRevenue: number;
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
    severe: FeasibilityYear[]; // occ -15% + adr -10%
  };
}

export const DEFAULT_INPUTS: FeasibilityInputs = {
  rooms: 150,
  segment: 'upper_upscale',
  openingType: 'new_build',
  adr: 3500,
  occupancy: 0.65,
  fnbRevenuePct: 0.25,
  otherRevenuePct: 0.05,
  rampUpYears: 2,
  capexPerKey: 2800000,
  ffePerKey: 450000,
  baseFee: 0.03,
  incentiveFee: 0.08,
  gopMargin: 0.38,
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

function computeYears(
  inputs: FeasibilityInputs,
  adrOverride?: number,
  occOverride?: number,
  fxOverride?: number,
): FeasibilityYear[] {
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

export function computeFeasibility(inputs: FeasibilityInputs): FeasibilityOutputs {
  const years = computeYears(inputs);
  const totalCapex = inputs.rooms * (inputs.capexPerKey + inputs.ffePerKey);
  const avgNoi = years.reduce((sum, y) => sum + y.noi, 0) / years.length;
  const simplePayback = avgNoi > 0 ? totalCapex / avgNoi : Infinity;

  // Severe downside: occ -15% + adr -10%
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
