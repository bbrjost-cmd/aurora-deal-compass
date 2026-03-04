// Posadas brand catalog for Mexico / LATAM expansion
import { BRANDS_BY_SEGMENT, ALL_BRANDS } from './constants';
import type { PosadasBrand } from './constants';

export type { PosadasBrand };
export { ALL_BRANDS as ACCOR_BRANDS, ALL_BRANDS as POSADAS_BRANDS };

export const BRAND_STRATEGY_NOTES: Record<string, string> = {
  // Economy
  'one': 'Lean economy brand with strong domestic mobility demand and efficient conversion profile.',
  'Gamma': 'Conversion-friendly soft brand for independent assets needing commercial uplift without heavy CAPEX.',
  // Midscale
  'Fiesta Inn': 'Business-led midscale flag with strong corporate recognition across Mexico.',
  'Fiesta Americana': 'Full-service upper-upscale brand for urban and resort repositioning with broad owner appeal.',
  // Premium
  'Grand Fiesta Americana': 'Flagship premium brand for landmark assets in gateway cities and resorts.',
  'Live Aqua': 'High-ADR lifestyle luxury play for resort or trophy urban assets with strong experience positioning.',
  'The Explorean': 'Experiential premium resort concept suited to destination-led nature and leisure assets.',
};

export const DESTINATION_BRANDS: Record<string, string[]> = {
  'Mexico City': ['Grand Fiesta Americana', 'Fiesta Americana', 'Fiesta Inn', 'Gamma'],
  'Monterrey': ['Grand Fiesta Americana', 'Fiesta Inn', 'Gamma'],
  'Guadalajara': ['Fiesta Americana', 'Fiesta Inn', 'Gamma', 'one'],
  'Cancún': ['Live Aqua', 'Grand Fiesta Americana', 'Fiesta Americana', 'one'],
  'Riviera Maya': ['Live Aqua', 'Grand Fiesta Americana', 'The Explorean'],
  'Los Cabos': ['Grand Fiesta Americana', 'Live Aqua', 'Fiesta Americana'],
  'Puebla': ['Fiesta Americana', 'Fiesta Inn', 'one'],
  'Querétaro': ['Fiesta Inn', 'Gamma', 'one'],
};

interface BrandCriteria {
  segments: Record<string, number>;
  roomsRange: [number, number, number, number];
  openingTypes: Record<string, number>;
  contractPreference: 'franchise' | 'management' | 'both';
  baseSuccessRate: number;
}

const BRAND_CRITERIA: Record<string, BrandCriteria> = {
  'one': {
    segments: { economy: 42, midscale: 10 },
    roomsRange: [60, 80, 220, 320],
    openingTypes: { conversion: 38, franchise_takeover: 36, new_build: 22, rebranding: 30 },
    contractPreference: 'franchise',
    baseSuccessRate: 87,
  },
  'Gamma': {
    segments: { economy: 20, midscale: 36, premium: 10 },
    roomsRange: [50, 70, 180, 300],
    openingTypes: { conversion: 40, franchise_takeover: 34, new_build: 18, rebranding: 38 },
    contractPreference: 'franchise',
    baseSuccessRate: 84,
  },
  'Fiesta Inn': {
    segments: { midscale: 42, economy: 15, premium: 10 },
    roomsRange: [80, 110, 260, 380],
    openingTypes: { conversion: 34, franchise_takeover: 32, new_build: 24, rebranding: 30 },
    contractPreference: 'both',
    baseSuccessRate: 86,
  },
  'Fiesta Americana': {
    segments: { premium: 24, midscale: 30 },
    roomsRange: [110, 140, 320, 480],
    openingTypes: { conversion: 30, franchise_takeover: 24, new_build: 30, rebranding: 28 },
    contractPreference: 'both',
    baseSuccessRate: 80,
  },
  'Grand Fiesta Americana': {
    segments: { premium: 40, midscale: 10 },
    roomsRange: [150, 180, 420, 620],
    openingTypes: { conversion: 26, franchise_takeover: 20, new_build: 32, rebranding: 22 },
    contractPreference: 'management',
    baseSuccessRate: 76,
  },
  'Live Aqua': {
    segments: { premium: 42, midscale: 6 },
    roomsRange: [120, 160, 350, 520],
    openingTypes: { conversion: 24, franchise_takeover: 18, new_build: 34, rebranding: 20 },
    contractPreference: 'management',
    baseSuccessRate: 72,
  },
  'The Explorean': {
    segments: { premium: 32, midscale: 12 },
    roomsRange: [40, 60, 140, 220],
    openingTypes: { conversion: 20, franchise_takeover: 15, new_build: 28, rebranding: 18 },
    contractPreference: 'management',
    baseSuccessRate: 68,
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

  const segPts = criteria.segments[segment] ?? 0;
  score += segPts;
  if (segPts >= 35) reasons.push(`Ideal segment match (${segment})`);
  else if (segPts >= 20) reasons.push('Compatible segment');

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

  const typePts = criteria.openingTypes[openingType] ?? 10;
  score += typePts;
  if (typePts >= 32) reasons.push(`${openingType.replace(/_/g, ' ')} strongly preferred`);
  else if (typePts >= 22) reasons.push(`${openingType.replace(/_/g, ' ')} compatible`);

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

export interface ConversionScore {
  score: number;
  label: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  factors: string[];
}

export function assessConversionSuitability(deal: any): ConversionScore {
  let score = 0;
  const factors: string[] = [];

  if (['conversion', 'rebranding', 'franchise_takeover'].includes(deal.opening_type)) {
    score += 30;
    factors.push('Existing hotel structure — conversion viable');
  }

  const rooms = ((deal.rooms_min || 0) + (deal.rooms_max || 0)) / 2;
  if (rooms >= 60 && rooms <= 300) {
    score += 25;
    factors.push(`${Math.round(rooms)} keys within conversion sweet spot`);
  } else if (rooms >= 40) {
    score += 12;
  }

  if (deal.segment === 'economy') { score += 25; factors.push('Economy segment — highest conversion velocity'); }
  else if (deal.segment === 'midscale') { score += 20; factors.push('Midscale segment — strong conversion potential'); }
  else if (deal.segment === 'premium') { score += 12; factors.push('Premium segment — selective conversion'); }

  if ((deal.score_total || 0) >= 70) { score += 20; factors.push('High qualification score'); }
  else if ((deal.score_total || 0) >= 50) { score += 10; }

  const capped = Math.min(100, score);
  const label: ConversionScore['label'] =
    capped >= 75 ? 'Excellent' :
    capped >= 55 ? 'Good' :
    capped >= 35 ? 'Fair' : 'Poor';

  return { score: capped, label, factors };
}

export const DEVELOPMENT_PITCH_POINTS = [
  'Fast conversion into Posadas commercial platform — immediate domestic distribution uplift',
  'Flexible franchise and management structures aligned with owner return targets',
  'Fiesta Rewards ecosystem supports repeat demand and direct channel share',
  'Strong brand recognition in Mexico helps reduce OTA dependency',
  'Brand ladder from one to Grand Fiesta Americana enables tailored repositioning',
];
