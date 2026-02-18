// Accor PMS&E Brands for Mexico / LATAM expansion
import { BRANDS_BY_SEGMENT, ALL_BRANDS } from './constants';
import type { AccorBrand } from './constants';

export type { AccorBrand };
export { ALL_BRANDS as ACCOR_BRANDS };

export const BRAND_STRATEGY_NOTES: Record<string, string> = {
  // Economy
  'ibis': 'High-volume economy flag. Conversion-friendly, strong RCP distribution.',
  'ibis Styles': 'Design-led economy, lifestyle angle, franchise model.',
  'ibis Budget': 'Budget flag for high-demand urban/suburban corridors.',
  'greet': 'Eco-responsible economy soft brand. Conversion-first.',
  // Midscale
  'Mercure': 'Local character midscale. Conversion priority, franchise-ready.',
  'Novotel': 'Global midscale standard. Business & family. New build or conversion.',
  'Adagio': 'Aparthotel / extended stay. Urban locations. Hybrid model.',
  // Premium
  'Pullman': 'Business premium. Meeting-driven. Tier-1 cities.',
  'Swissôtel': 'International premium. Corporate & leisure blend.',
  'Mövenpick': 'LATAM premium with food & beverage heritage.',
};

export const DESTINATION_BRANDS: Record<string, string[]> = {
  'Mexico City': ['Pullman', 'Novotel', 'Mercure', 'ibis Styles', 'ibis'],
  'Monterrey': ['Pullman', 'Novotel', 'Mercure', 'ibis'],
  'Guadalajara': ['Novotel', 'Mercure', 'ibis Styles', 'ibis'],
  'Cancún': ['Novotel', 'Mercure', 'ibis Styles', 'Swissôtel'],
  'Riviera Maya': ['Mövenpick', 'Novotel', 'Mercure'],
  'Los Cabos': ['Swissôtel', 'Mövenpick', 'Pullman'],
  'Puebla': ['Novotel', 'Mercure', 'ibis'],
  'Querétaro': ['Mercure', 'ibis Styles', 'Novotel'],
};

// Brand fit criteria for scoring
interface BrandCriteria {
  segments: Record<string, number>;
  roomsRange: [number, number, number, number];
  openingTypes: Record<string, number>;
  contractPreference: 'franchise' | 'management' | 'both';
  baseSuccessRate: number;
}

const BRAND_CRITERIA: Record<string, BrandCriteria> = {
  'ibis': {
    segments: { economy: 40, midscale: 10 },
    roomsRange: [60, 80, 250, 400],
    openingTypes: { conversion: 35, franchise_takeover: 35, new_build: 20, rebranding: 30 },
    contractPreference: 'franchise',
    baseSuccessRate: 88,
  },
  'ibis Styles': {
    segments: { economy: 40, midscale: 15 },
    roomsRange: [50, 70, 200, 350],
    openingTypes: { conversion: 38, franchise_takeover: 32, new_build: 22, rebranding: 35 },
    contractPreference: 'franchise',
    baseSuccessRate: 85,
  },
  'ibis Budget': {
    segments: { economy: 40, midscale: 5 },
    roomsRange: [80, 100, 300, 500],
    openingTypes: { new_build: 30, conversion: 30, franchise_takeover: 30, rebranding: 20 },
    contractPreference: 'franchise',
    baseSuccessRate: 82,
  },
  'greet': {
    segments: { economy: 38, midscale: 18 },
    roomsRange: [40, 55, 150, 250],
    openingTypes: { conversion: 40, rebranding: 35, franchise_takeover: 28, new_build: 15 },
    contractPreference: 'franchise',
    baseSuccessRate: 75,
  },
  'Mercure': {
    segments: { midscale: 40, economy: 15, premium: 15 },
    roomsRange: [60, 80, 220, 400],
    openingTypes: { conversion: 38, rebranding: 35, franchise_takeover: 30, new_build: 22 },
    contractPreference: 'franchise',
    baseSuccessRate: 84,
  },
  'Novotel': {
    segments: { midscale: 38, premium: 18, economy: 8 },
    roomsRange: [80, 120, 300, 500],
    openingTypes: { new_build: 32, conversion: 28, franchise_takeover: 22, rebranding: 25 },
    contractPreference: 'both',
    baseSuccessRate: 80,
  },
  'Adagio': {
    segments: { midscale: 40, premium: 15, economy: 10 },
    roomsRange: [50, 70, 180, 300],
    openingTypes: { new_build: 35, conversion: 30, rebranding: 28, franchise_takeover: 20 },
    contractPreference: 'management',
    baseSuccessRate: 72,
  },
  'Pullman': {
    segments: { premium: 40, midscale: 15 },
    roomsRange: [120, 180, 400, 600],
    openingTypes: { new_build: 32, conversion: 28, franchise_takeover: 20, rebranding: 22 },
    contractPreference: 'management',
    baseSuccessRate: 76,
  },
  'Swissôtel': {
    segments: { premium: 40, midscale: 10 },
    roomsRange: [100, 150, 350, 550],
    openingTypes: { new_build: 30, conversion: 28, franchise_takeover: 18, rebranding: 20 },
    contractPreference: 'management',
    baseSuccessRate: 70,
  },
  'Mövenpick': {
    segments: { premium: 38, midscale: 20 },
    roomsRange: [100, 140, 320, 500],
    openingTypes: { new_build: 28, conversion: 30, franchise_takeover: 20, rebranding: 25 },
    contractPreference: 'both',
    baseSuccessRate: 74,
  },
};

export interface BrandRecommendation {
  brand: string;
  fitScore: number;
  successRate: number;
  note: string;
  reasons: string[];
  contractPreference: string;
}

function scoreBrand(brand: string, deal: any): { fitScore: number; successRate: number; reasons: string[] } {
  const criteria = BRAND_CRITERIA[brand];
  if (!criteria) return { fitScore: 0, successRate: 0, reasons: [] };

  const rooms = ((deal.rooms_min || 80) + (deal.rooms_max || 150)) / 2;
  const segment = deal.segment || 'midscale';
  const openingType = deal.opening_type || 'conversion';
  const icScore = deal.score_total || 0;

  const reasons: string[] = [];
  let score = 0;

  // Segment fit (0–40)
  const segPts = criteria.segments[segment] ?? 0;
  score += segPts;
  if (segPts >= 35) reasons.push(`Ideal segment match (${segment})`);
  else if (segPts >= 20) reasons.push(`Compatible segment`);

  // Rooms fit (0–20)
  const [rMin, rIdealMin, rIdealMax, rMax] = criteria.roomsRange;
  let roomsPts = 0;
  if (rooms >= rIdealMin && rooms <= rIdealMax) {
    roomsPts = 20;
    reasons.push(`${Math.round(rooms)} keys in ideal range`);
  } else if (rooms >= rMin && rooms < rIdealMin) {
    roomsPts = Math.round(20 * ((rooms - rMin) / (rIdealMin - rMin)));
  } else if (rooms > rIdealMax && rooms <= rMax) {
    roomsPts = Math.round(20 * (1 - (rooms - rIdealMax) / (rMax - rIdealMax)));
  }
  score += roomsPts;

  // Opening type fit (0–30)
  const typePts = criteria.openingTypes[openingType] ?? 10;
  score += typePts;
  if (typePts >= 32) reasons.push(`${openingType.replace(/_/g, ' ')} strongly preferred`);
  else if (typePts >= 22) reasons.push(`${openingType.replace(/_/g, ' ')} compatible`);

  // IC score bonus (0–10)
  const icBonus = Math.round((icScore / 100) * 10);
  score += icBonus;

  const fitScore = Math.min(100, Math.max(0, score));
  const delta = ((fitScore - 50) / 50) * 18;
  const successRate = Math.min(95, Math.max(30, Math.round(criteria.baseSuccessRate + delta)));

  return { fitScore, successRate, reasons };
}

export function recommendBrands(deal: any): BrandRecommendation[] {
  const segment = deal.segment || 'midscale';
  const eligibleBrands = BRANDS_BY_SEGMENT[segment] || ALL_BRANDS;

  return eligibleBrands
    .map((brand) => {
      const { fitScore, successRate, reasons } = scoreBrand(brand, deal);
      const criteria = BRAND_CRITERIA[brand];
      return {
        brand,
        fitScore,
        successRate,
        note: BRAND_STRATEGY_NOTES[brand] || '',
        reasons,
        contractPreference: criteria?.contractPreference || 'both',
      };
    })
    .filter(r => r.fitScore > 10)
    .sort((a, b) => b.fitScore - a.fitScore)
    .slice(0, 5);
}

// Conversion suitability factors
export interface ConversionScore {
  score: number; // 0–100
  label: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  factors: string[];
}

export function assessConversionSuitability(deal: any): ConversionScore {
  let score = 0;
  const factors: string[] = [];

  // Is it already a hotel?
  if (['conversion', 'rebranding', 'franchise_takeover'].includes(deal.opening_type)) {
    score += 30;
    factors.push('Existing hotel structure — conversion viable');
  }

  // Room count compatibility
  const rooms = ((deal.rooms_min || 0) + (deal.rooms_max || 0)) / 2;
  if (rooms >= 60 && rooms <= 300) {
    score += 25;
    factors.push(`${Math.round(rooms)} keys within conversion sweet spot`);
  } else if (rooms >= 40) {
    score += 12;
  }

  // Segment fit for conversion
  if (deal.segment === 'economy') { score += 25; factors.push('Economy segment — highest conversion velocity'); }
  else if (deal.segment === 'midscale') { score += 20; factors.push('Midscale segment — strong conversion potential'); }
  else if (deal.segment === 'premium') { score += 12; factors.push('Premium segment — selective conversion'); }

  // Score bonus
  if ((deal.score_total || 0) >= 70) { score += 20; factors.push('High qualification score'); }
  else if ((deal.score_total || 0) >= 50) { score += 10; }

  const capped = Math.min(100, score);
  const label: ConversionScore['label'] =
    capped >= 75 ? 'Excellent' :
    capped >= 55 ? 'Good' :
    capped >= 35 ? 'Fair' : 'Poor';

  return { score: capped, label, factors };
}

// Development pitch points for PMS&E context
export const DEVELOPMENT_PITCH_POINTS = [
  'Fast conversion to Accor network — immediate distribution uplift',
  'Franchise model: low Accor overhead, high owner ROI',
  'RCP loyalty programme — 100M+ members driving occupancy',
  'Brand recognition reducing OTA dependency',
  'Proven CAPEX efficiency in Midscale/Economy conversions',
];
