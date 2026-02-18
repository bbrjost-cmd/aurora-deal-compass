export const STAGES = [
  'lead', 'qualified', 'underwriting', 'loi', 'negotiation', 'signed', 'opened', 'lost'
] as const;

export const STAGE_LABELS: Record<string, string> = {
  lead: 'Lead',
  qualified: 'Qualified',
  underwriting: 'Underwriting',
  loi: 'LOI',
  negotiation: 'Negotiation',
  signed: 'Signed',
  opened: 'Opened',
  lost: 'Lost',
};

export const STAGE_COLORS: Record<string, string> = {
  lead: 'bg-muted text-muted-foreground',
  qualified: 'bg-blue-100 text-blue-800',
  underwriting: 'bg-yellow-100 text-yellow-800',
  loi: 'bg-purple-100 text-purple-800',
  negotiation: 'bg-orange-100 text-orange-800',
  signed: 'bg-green-100 text-green-800',
  opened: 'bg-emerald-100 text-emerald-800',
  lost: 'bg-red-100 text-red-800',
};

// ─── Segments (Economy / Midscale / Premium only) ────────────────────────────
export const SEGMENTS = ['economy', 'midscale', 'premium'] as const;

export const SEGMENT_LABELS: Record<string, string> = {
  economy: 'Economy',
  midscale: 'Midscale',
  premium: 'Premium',
};

// ─── Brands by segment ───────────────────────────────────────────────────────
export const BRANDS_BY_SEGMENT: Record<string, string[]> = {
  economy: ['ibis', 'ibis Styles', 'ibis Budget', 'greet'],
  midscale: ['Mercure', 'Novotel', 'Adagio'],
  premium: ['Pullman', 'Swissôtel', 'Mövenpick'],
};

export const ALL_BRANDS = [
  'ibis', 'ibis Styles', 'ibis Budget', 'greet',
  'Mercure', 'Novotel', 'Adagio',
  'Pullman', 'Swissôtel', 'Mövenpick',
] as const;

export type AccorBrand = typeof ALL_BRANDS[number];

// ─── Opening Types (Conversion as default/primary) ───────────────────────────
export const OPENING_TYPES = ['conversion', 'new_build', 'franchise_takeover', 'rebranding'] as const;

export const OPENING_TYPE_LABELS: Record<string, string> = {
  conversion: 'Conversion',
  new_build: 'New Build',
  franchise_takeover: 'Franchise Takeover',
  rebranding: 'Rebranding Opportunity',
};

// ─── Contract Types ───────────────────────────────────────────────────────────
export const CONTRACT_TYPES = ['franchise', 'management'] as const;

export const CONTRACT_TYPE_LABELS: Record<string, string> = {
  franchise: 'Franchise (Default)',
  management: 'Management',
};

// ─── Geography ───────────────────────────────────────────────────────────────
export const MEXICO_CENTER = { lat: 23.6345, lon: -102.5528 };
export const CDMX_CENTER = { lat: 19.4326, lon: -99.1332 };
export const CANCUN_CENTER = { lat: 21.1619, lon: -86.8515 };
export const GDL_CENTER = { lat: 20.6597, lon: -103.3496 };

export const MEXICO_STATES = [
  'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Chiapas',
  'Chihuahua', 'Ciudad de México', 'Coahuila', 'Colima', 'Durango', 'Estado de México',
  'Guanajuato', 'Guerrero', 'Hidalgo', 'Jalisco', 'Michoacán', 'Morelos', 'Nayarit',
  'Nuevo León', 'Oaxaca', 'Puebla', 'Querétaro', 'Quintana Roo', 'San Luis Potosí',
  'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala', 'Veracruz', 'Yucatán', 'Zacatecas',
];
