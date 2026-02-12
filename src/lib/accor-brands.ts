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
