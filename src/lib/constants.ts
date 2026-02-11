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

export const SEGMENTS = ['luxury', 'lifestyle', 'upper_upscale', 'midscale'] as const;
export const SEGMENT_LABELS: Record<string, string> = {
  luxury: 'Luxury',
  lifestyle: 'Lifestyle',
  upper_upscale: 'Upper Upscale',
  midscale: 'Midscale',
};

export const OPENING_TYPES = ['new_build', 'conversion', 'franchise'] as const;
export const OPENING_TYPE_LABELS: Record<string, string> = {
  new_build: 'New Build',
  conversion: 'Conversion',
  franchise: 'Franchise',
};

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
