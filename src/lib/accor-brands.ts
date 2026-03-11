// Choice Hotels brand catalog for Mexico expansion
import { BRANDS_BY_SEGMENT, ALL_BRANDS } from './constants';
import type { ChoiceBrand } from './constants';

export type PosadasBrand = ChoiceBrand;
export { ALL_BRANDS as ACCOR_BRANDS, ALL_BRANDS as POSADAS_BRANDS, ALL_BRANDS as CHOICE_BRANDS };

export const BRAND_STRATEGY_NOTES: Record<string, string> = {
  // Economy
  'Sleep Inn': 'Efficient new-build economy brand with strong Choice Privileges loyalty integration and lean operating model.',
  'Econo Lodge': 'High-conversion economy brand ideal for existing independent hotels seeking immediate distribution uplift.',
  'Rodeway Inn': 'Value-tier brand for budget-conscious markets with flexible conversion standards and low CAPEX requirements.',
  // Midscale
  'Comfort Inn': 'Flagship midscale brand with strong domestic and international recognition — high franchise demand.',
  'Comfort Suites': 'Extended-stay midscale brand with suite-only configuration and strong corporate demand profile.',
  'Quality Inn': 'Flexible midscale brand for conversion-friendly assets needing commercial uplift without heavy renovation.',
  // Upscale
  'Cambria Hotels': 'Upscale lifestyle brand for urban gateway markets with design-led positioning and premium ADR.',
  'Ascend Hotel Collection': 'Soft brand collection for unique independent hotels seeking global distribution while retaining identity.',
  'Clarion Pointe': 'Upper-midscale brand bridging midscale and upscale with streamlined services and modern design standards.',
};

export const DESTINATION_BRANDS: Record<string, string[]> = {
  'Mexico City': ['Cambria Hotels', 'Comfort Inn', 'Comfort Suites', 'Quality Inn'],
  'Monterrey': ['Cambria Hotels', 'Comfort Inn', 'Quality Inn'],
  'Guadalajara': ['Comfort Inn', 'Quality Inn', 'Sleep Inn'],
  'Cancún': ['Ascend Hotel Collection', 'Cambria Hotels', 'Comfort Inn'],
  'Riviera Maya': ['Ascend Hotel Collection', 'Cambria Hotels'],
  'Los Cabos': ['Ascend Hotel Collection', 'Cambria Hotels', 'Comfort Suites'],
  'Puebla': ['Comfort Inn', 'Quality Inn', 'Econo Lodge'],
  'Querétaro': ['Comfort Inn', 'Quality Inn', 'Sleep Inn'],
};

interface BrandCriteria {
  segments: Record<string, number>;
  roomsRange: [number, number, number, number];
  openingTypes: Record<string, number>;
  contractPreference: 'franchise' | 'management' | 'both';
  baseSuccessRate: number;
}

const BRAND_CRITERIA: Record<string, BrandCriteria> = {
  'Sleep Inn': {
    segments: { economy: 42, midscale: 10 },
    roomsRange: [60, 80, 180, 280],
    openingTypes: { conversion: 30, franchise_takeover: 28, new_build: 40, rebranding: 25 },
    contractPreference: 'franchise',
    baseSuccessRate: 87,
  },
  'Econo Lodge': {
    segments: { economy: 44, midscale: 8 },
    roomsRange: [40, 60, 160, 250],
    openingTypes: { conversion: 42, franchise_takeover: 38, new_build: 18, rebranding: 36 },
    contractPreference: 'franchise',
    baseSuccessRate: 85,
  },
  'Rodeway Inn': {
    segments: { economy: 40, midscale: 6 },
    roomsRange: [30, 50, 140, 220],
    openingTypes: { conversion: 44, franchise_takeover: 36, new_build: 14, rebranding: 38 },
    contractPreference: 'franchise',
    baseSuccessRate: 82,
  },
  'Comfort Inn': {
    segments: { midscale: 44, economy: 12, premium: 10 },
    roomsRange: [80, 110, 260, 380],
    openingTypes: { conversion: 36, franchise_takeover: 32, new_build: 28, rebranding: 30 },
    contractPreference: 'franchise',
    baseSuccessRate: 88,
  },
  'Comfort Suites': {
    segments: { midscale: 40, premium: 14 },
    roomsRange: [80, 100, 220, 340],
    openingTypes: { conversion: 30, franchise_takeover: 28, new_build: 34, rebranding: 26 },
    contractPreference: 'franchise',
    baseSuccessRate: 84,
  },
  'Quality Inn': {
    segments: { midscale: 42, economy: 16, premium: 8 },
    roomsRange: [60, 80, 220, 350],
    openingTypes: { conversion: 40, franchise_takeover: 36, new_build: 20, rebranding: 34 },
    contractPreference: 'franchise',
    baseSuccessRate: 86,
  },
  'Cambria Hotels': {
    segments: { premium: 44, midscale: 10 },
    roomsRange: [120, 150, 350, 500],
    openingTypes: { conversion: 26, franchise_takeover: 20, new_build: 36, rebranding: 22 },
    contractPreference: 'franchise',
    baseSuccessRate: 76,
  },
  'Ascend Hotel Collection': {
    segments: { premium: 40, midscale: 12 },
    roomsRange: [40, 60, 250, 400],
    openingTypes: { conversion: 38, franchise_takeover: 30, new_build: 20, rebranding: 36 },
    contractPreference: 'franchise',
    baseSuccessRate: 74,
  },
  'Clarion Pointe': {
    segments: { premium: 30, midscale: 22 },
    roomsRange: [70, 90, 220, 340],
    openingTypes: { conversion: 34, franchise_takeover: 28, new_build: 28, rebranding: 32 },
    contractPreference: 'franchise',
    baseSuccessRate: 80,
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
        contractPreference: criteria?.contractPreference || 'franchise',
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
  else if (deal.segment === 'premium') { score += 12; factors.push('Upscale segment — selective conversion'); }

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
  'Fast conversion into Choice Hotels commercial platform — immediate global distribution uplift via choicehotels.com',
  'Franchise-first model with predictable fee structure and lower operational overhead for owners',
  'Choice Privileges loyalty program drives repeat demand and direct channel share',
  'Strong brand recognition in US and growing presence in Mexico reduces OTA dependency',
  'Brand ladder from Econo Lodge to Cambria Hotels enables tailored repositioning by market',
];
