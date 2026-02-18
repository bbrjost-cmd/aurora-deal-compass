// Accor Luxury & Lifestyle Brands for Mexico market
export const ACCOR_BRANDS = [
  "Raffles",
  "Fairmont",
  "Sofitel",
  "Sofitel Legend",
  "Orient Express",
  "Emblems Collection",
  "MGallery",
  "Delano",
  "Mondrian",
  "SLS",
] as const;

export type AccorBrand = typeof ACCOR_BRANDS[number];

export interface LuxuryProspect {
  name: string;
  owner: string;
  city: string;
  state: string;
  lat: number;
  lon: number;
  segment: string;
  opening_type: string;
  rooms_min: number;
  rooms_max: number;
  brands: AccorBrand[];
  notes: string;
  destination: string;
}

export const BRAND_STRATEGY_NOTES: Record<string, string> = {
  "Raffles": "Ultra-luxe, trophy assets, branded residences potential",
  "Fairmont": "Iconic resort positioning, established luxury",
  "Sofitel": "International luxury, urban or resort",
  "Sofitel Legend": "Heritage/landmark properties only",
  "Orient Express": "Exceptional one-of-a-kind assets",
  "Emblems Collection": "Independent ultra-luxe signature properties",
  "MGallery": "Soft brand, cultural/experiential luxury",
  "Delano": "Urban lifestyle luxury",
  "Mondrian": "Luxury lifestyle, art-driven",
  "SLS": "Premium lifestyle, F&B driven",
};

// Brand fit criteria for scoring engine
// Each brand defines its ideal positioning parameters
interface BrandCriteria {
  // Segment fit: which segments score high
  segments: { [key: string]: number }; // 0-40 pts
  // Rooms range fit: [min, ideal_min, ideal_max, max]
  roomsRange: [number, number, number, number];
  // Opening type preference
  openingTypes: { [key: string]: number }; // 0-20 pts
  // Base success rate (historical win rate proxy for Mexico market)
  baseSuccessRate: number; // 50-95
}

const BRAND_CRITERIA: Record<AccorBrand, BrandCriteria> = {
  "Raffles": {
    segments: { luxury: 40, luxury_lifestyle: 20, upper_upscale: 5 },
    roomsRange: [60, 80, 200, 350],
    openingTypes: { conversion: 30, new_build: 25, renovation: 20 },
    baseSuccessRate: 72,
  },
  "Fairmont": {
    segments: { luxury: 38, luxury_lifestyle: 22, upper_upscale: 8 },
    roomsRange: [80, 120, 300, 500],
    openingTypes: { new_build: 28, conversion: 28, renovation: 18 },
    baseSuccessRate: 76,
  },
  "Sofitel": {
    segments: { luxury: 30, luxury_lifestyle: 30, upper_upscale: 20 },
    roomsRange: [80, 120, 350, 600],
    openingTypes: { new_build: 25, conversion: 25, renovation: 20 },
    baseSuccessRate: 78,
  },
  "Sofitel Legend": {
    segments: { luxury: 40, luxury_lifestyle: 10, upper_upscale: 0 },
    roomsRange: [50, 60, 150, 250],
    openingTypes: { conversion: 35, renovation: 30, new_build: 5 },
    baseSuccessRate: 58,
  },
  "Orient Express": {
    segments: { luxury: 40, luxury_lifestyle: 15, upper_upscale: 0 },
    roomsRange: [30, 40, 100, 150],
    openingTypes: { conversion: 30, new_build: 25, renovation: 20 },
    baseSuccessRate: 55,
  },
  "Emblems Collection": {
    segments: { luxury: 40, luxury_lifestyle: 25, upper_upscale: 5 },
    roomsRange: [25, 35, 120, 200],
    openingTypes: { conversion: 30, new_build: 28, renovation: 22 },
    baseSuccessRate: 65,
  },
  "MGallery": {
    segments: { luxury_lifestyle: 38, luxury: 28, upper_upscale: 22 },
    roomsRange: [40, 60, 200, 350],
    openingTypes: { conversion: 32, renovation: 28, new_build: 18 },
    baseSuccessRate: 82,
  },
  "Delano": {
    segments: { luxury_lifestyle: 40, luxury: 20, upper_upscale: 20 },
    roomsRange: [80, 120, 280, 400],
    openingTypes: { new_build: 30, conversion: 25, renovation: 20 },
    baseSuccessRate: 68,
  },
  "Mondrian": {
    segments: { luxury_lifestyle: 40, luxury: 18, upper_upscale: 18 },
    roomsRange: [80, 100, 250, 400],
    openingTypes: { new_build: 28, conversion: 28, renovation: 18 },
    baseSuccessRate: 70,
  },
  "SLS": {
    segments: { luxury_lifestyle: 40, upper_upscale: 25, luxury: 15 },
    roomsRange: [100, 150, 350, 600],
    openingTypes: { new_build: 30, conversion: 22, renovation: 18 },
    baseSuccessRate: 73,
  },
};

export interface BrandRecommendation {
  brand: AccorBrand;
  fitScore: number;       // 0–100 brand-deal alignment score
  successRate: number;    // % success rate for this brand in this context
  note: string;
  reasons: string[];      // Why this brand fits
}

/**
 * Score a brand against deal metrics.
 * Returns a 0–100 fit score and a contextual success rate.
 */
function scoreBrand(brand: AccorBrand, deal: any): { fitScore: number; successRate: number; reasons: string[] } {
  const criteria = BRAND_CRITERIA[brand];
  const rooms = ((deal.rooms_min || 80) + (deal.rooms_max || 150)) / 2;
  const segment = deal.segment || "upper_upscale";
  const openingType = deal.opening_type || "new_build";
  const icScore = deal.score_total || 0;

  const reasons: string[] = [];
  let score = 0;

  // 1. Segment fit (0–40 pts)
  const segPts = criteria.segments[segment] ?? 0;
  score += segPts;
  if (segPts >= 35) reasons.push(`Segment ${segment.replace(/_/g, " ")} idéal`);
  else if (segPts >= 20) reasons.push(`Segment compatible`);
  else if (segPts > 0) reasons.push(`Segment acceptable`);

  // 2. Rooms fit (0–20 pts)
  const [rMin, rIdealMin, rIdealMax, rMax] = criteria.roomsRange;
  let roomsPts = 0;
  if (rooms >= rIdealMin && rooms <= rIdealMax) {
    roomsPts = 20;
    reasons.push(`${Math.round(rooms)} keys dans la fenêtre idéale`);
  } else if (rooms >= rMin && rooms < rIdealMin) {
    roomsPts = Math.round(20 * ((rooms - rMin) / (rIdealMin - rMin)));
    reasons.push(`${Math.round(rooms)} keys, légèrement sous le seuil optimal`);
  } else if (rooms > rIdealMax && rooms <= rMax) {
    roomsPts = Math.round(20 * (1 - (rooms - rIdealMax) / (rMax - rIdealMax)));
    reasons.push(`${Math.round(rooms)} keys, au-dessus de la fenêtre optimale`);
  } else {
    roomsPts = 0;
  }
  score += roomsPts;

  // 3. Opening type fit (0–30 pts)
  const typePts = criteria.openingTypes[openingType] ?? 10;
  score += typePts;
  if (typePts >= 28) reasons.push(`${openingType.replace(/_/g, " ")} fortement préféré par cette marque`);
  else if (typePts >= 20) reasons.push(`${openingType.replace(/_/g, " ")} compatible`);

  // 4. IC score bonus (0–10 pts)
  const icBonus = Math.round((icScore / 100) * 10);
  score += icBonus;
  if (icScore >= 75) reasons.push(`Score IC ${icScore}/100 renforce la crédibilité`);

  // Clamp to 0–100
  const fitScore = Math.min(100, Math.max(0, score));

  // Success rate = base ± adjustment based on fit
  // If fit is 100%, success rate approaches base + 15
  // If fit is 0%, success rate = base - 20
  const delta = ((fitScore - 50) / 50) * 18;
  const successRate = Math.min(95, Math.max(30, Math.round(criteria.baseSuccessRate + delta)));

  return { fitScore, successRate, reasons };
}

/**
 * Main brand recommender.
 * Returns top brands sorted by fit score, all with >0 fit.
 */
export function recommendBrands(deal: any): BrandRecommendation[] {
  const results: BrandRecommendation[] = ACCOR_BRANDS.map((brand) => {
    const { fitScore, successRate, reasons } = scoreBrand(brand, deal);
    return {
      brand,
      fitScore,
      successRate,
      note: BRAND_STRATEGY_NOTES[brand],
      reasons,
    };
  });

  // Sort by fit score desc, return top 5 with fitScore > 10
  return results
    .filter((r) => r.fitScore > 10)
    .sort((a, b) => b.fitScore - a.fitScore)
    .slice(0, 5);
}

export const DESTINATION_BRANDS: Record<string, AccorBrand[]> = {
  "Tulum": ["Emblems Collection", "MGallery", "Mondrian", "Delano"],
  "Riviera Maya": ["Raffles", "Fairmont", "Emblems Collection", "Sofitel"],
  "Los Cabos": ["Raffles", "Fairmont", "Sofitel", "Emblems Collection"],
  "Mexico City": ["Delano", "Mondrian", "SLS", "Sofitel", "Emblems Collection"],
  "Punta Mita / Nayarit": ["Raffles", "Fairmont", "Emblems Collection", "SLS"],
};

export const LUXURY_PROSPECTS: LuxuryProspect[] = [
  {
    name: "RLH Properties — Riviera Maya",
    owner: "Borja Escalada",
    city: "Playa del Carmen",
    state: "Quintana Roo",
    lat: 20.6296,
    lon: -87.0739,
    segment: "luxury",
    opening_type: "conversion",
    rooms_min: 80,
    rooms_max: 150,
    brands: ["Emblems Collection", "Raffles", "Fairmont"],
    notes: "Owner of Rosewood Mayakoba & One&Only Mandarina. Asset value enhancement + branded residences pitch. Ultra-luxe independent positioning.",
    destination: "Riviera Maya",
  },
  {
    name: "Grupo Xcaret — Experiential Resort",
    owner: "Grupo Xcaret (Development Team)",
    city: "Playa del Carmen",
    state: "Quintana Roo",
    lat: 20.5810,
    lon: -87.1180,
    segment: "luxury",
    opening_type: "new_build",
    rooms_min: 150,
    rooms_max: 300,
    brands: ["Emblems Collection", "MGallery"],
    notes: "Experiential/cultural resort operators. MGallery ideal for cultural positioning. Emphasis on sustainability + unique guest experience.",
    destination: "Riviera Maya",
  },
  {
    name: "Tulum Eco-Luxury Boutique",
    owner: "Independent Owner (Boutique)",
    city: "Tulum",
    state: "Quintana Roo",
    lat: 20.2114,
    lon: -87.4654,
    segment: "luxury",
    opening_type: "conversion",
    rooms_min: 40,
    rooms_max: 80,
    brands: ["Emblems Collection", "MGallery"],
    notes: "Boutique eco-luxury property. Perfect for Emblems Collection signature positioning. ADR uplift + global distribution power key selling points.",
    destination: "Tulum",
  },
  {
    name: "Pueblo Bonito — Los Cabos Ultra-Luxe",
    owner: "Pueblo Bonito Resorts",
    city: "Cabo San Lucas",
    state: "Baja California Sur",
    lat: 22.8905,
    lon: -109.9167,
    segment: "luxury",
    opening_type: "conversion",
    rooms_min: 120,
    rooms_max: 250,
    brands: ["Raffles", "Fairmont", "Sofitel"],
    notes: "Premium resort portfolio. Raffles repositioning for ultra-luxe segment. Branded Residences economics as key value proposition.",
    destination: "Los Cabos",
  },
  {
    name: "Los Cabos Trophy Asset",
    owner: "JV / Local Developer",
    city: "San José del Cabo",
    state: "Baja California Sur",
    lat: 23.0598,
    lon: -109.7006,
    segment: "luxury",
    opening_type: "new_build",
    rooms_min: 80,
    rooms_max: 120,
    brands: ["Emblems Collection", "Orient Express", "Raffles"],
    notes: "One&Only / Montage / Auberge type owner. Orient Express for exceptional asset. US UHNW clientele focus.",
    destination: "Los Cabos",
  },
  {
    name: "Thor Urbana — CDMX Mixed-Use Luxury",
    owner: "Jaime Fasja",
    city: "Ciudad de México",
    state: "Ciudad de México",
    lat: 19.4326,
    lon: -99.1680,
    segment: "luxury",
    opening_type: "new_build",
    rooms_min: 150,
    rooms_max: 250,
    brands: ["Delano", "Mondrian", "SLS", "Sofitel"],
    notes: "Mixed-use high-end development. Delano for urban lifestyle luxury. Branded Residences + F&B driven concept. Polanco / Reforma corridor.",
    destination: "Mexico City",
  },
  {
    name: "RLH Properties — CDMX Urban Luxury",
    owner: "Borja Escalada",
    city: "Ciudad de México",
    state: "Ciudad de México",
    lat: 19.4284,
    lon: -99.2042,
    segment: "luxury",
    opening_type: "conversion",
    rooms_min: 100,
    rooms_max: 180,
    brands: ["Raffles", "Sofitel Legend", "Emblems Collection"],
    notes: "Urban luxury asset repositioning. Sofitel Legend for heritage property. Raffles for trophy positioning with residences component.",
    destination: "Mexico City",
  },
  {
    name: "Grupo Danhos / GICSA — CDMX Premium",
    owner: "Abraham Cababie",
    city: "Ciudad de México",
    state: "Ciudad de México",
    lat: 19.4400,
    lon: -99.2050,
    segment: "luxury",
    opening_type: "new_build",
    rooms_min: 200,
    rooms_max: 350,
    brands: ["Sofitel", "MGallery", "Delano", "Mondrian"],
    notes: "Premium/luxury developer. Mixed-use expertise. Sofitel for international luxury positioning. Mondrian for art-driven lifestyle.",
    destination: "Mexico City",
  },
  {
    name: "Grupo Vidanta — Nayarit Mega Resort",
    owner: "Iván Chávez",
    city: "Nuevo Vallarta",
    state: "Nayarit",
    lat: 20.6976,
    lon: -105.2970,
    segment: "luxury",
    opening_type: "new_build",
    rooms_min: 200,
    rooms_max: 500,
    brands: ["Raffles", "Fairmont", "SLS", "Delano", "Emblems Collection"],
    notes: "Mega resort + residences + entertainment. Multiple brand opportunities. Raffles for flagship. SLS/Delano for lifestyle component. Giga-project approach.",
    destination: "Punta Mita / Nayarit",
  },
  {
    name: "Punta Mita Luxury Development",
    owner: "Punta Mita Owner Group",
    city: "Punta de Mita",
    state: "Nayarit",
    lat: 20.7700,
    lon: -105.5200,
    segment: "luxury",
    opening_type: "conversion",
    rooms_min: 60,
    rooms_max: 120,
    brands: ["Emblems Collection", "Raffles", "Fairmont"],
    notes: "Riviera Nayarit luxury corridor. Emblems for independent signature. Fairmont for established resort luxury. ADR uplift + brand premium key pitch.",
    destination: "Punta Mita / Nayarit",
  },
];

// Key selling points for luxury owners in Mexico
export const LUXURY_PITCH_POINTS = [
  "Asset value enhancement",
  "ADR uplift / brand premium",
  "Global distribution power",
  "Branded Residences economics",
  "Repositioning strategy",
];
