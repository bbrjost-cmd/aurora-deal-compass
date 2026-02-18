// ============================================================
// Hotel Chain & Independence Classifier
// Uses OSM tags to determine if a hotel is independent or chain
// ============================================================

export type HotelClassification = "likely_independent" | "likely_chain" | "unknown";

export interface ClassifiedHotel {
  id: number;
  osmType: "node" | "way" | "relation";
  name: string;
  lat: number;
  lon: number;
  tags: Record<string, string>;
  classification: HotelClassification;
  independenceScore: number; // 0–100
  tourismType: "hotel" | "motel" | "guest_house" | "other";
  hasWebsite: boolean;
  hasPhone: boolean;
  stars?: number;
  rooms?: number;
  address?: string;
}

// Comprehensive chain dictionary — editable in Admin
export const KNOWN_CHAINS: string[] = [
  // Accor
  "accor", "raffles", "fairmont", "sofitel", "novotel", "ibis", "mercure",
  "pullman", "mgallery", "swissôtel", "swissotel", "21c", "emblems", "mövenpick",
  "movenpick", "mantis", "orient express", "delano", "mondrian", "sls", "mama shelter",
  "adagio", "rixos", "greet", "tribe", "jo&joe",
  // Marriott
  "marriott", "sheraton", "westin", "w hotel", "st. regis", "st regis", "ritz-carlton",
  "ritz carlton", "jw marriott", "autograph collection", "renaissance", "le méridien",
  "le meridien", "tribute portfolio", "aloft", "moxy", "courtyard", "four points",
  "residence inn", "fairfield", "ac hotel", "element",
  // Hilton
  "hilton", "waldorf astoria", "curio collection", "doubletree", "embassy suites",
  "hampton inn", "homewood suites", "home2 suites", "tapestry collection", "tempo",
  "canopy", "signia", "lxr",
  // IHG
  "intercontinental", "six senses", "regent", "vignette", "kimpton", "indigo",
  "crowne plaza", "voco", "holiday inn", "avid", "atwell", "staybridge",
  "candlewood",
  // Hyatt
  "hyatt", "park hyatt", "andaz", "grand hyatt", "alila", "thompson", "caption",
  "ame", "destination by hyatt", "joie de vivre", "the unbound collection",
  "hyatt regency", "hyatt place", "hyatt house", "hyatt ziva", "hyatt zilara",
  // Wyndham
  "wyndham", "la quinta", "days inn", "super 8", "ramada", "baymont",
  "microtel", "wingate", "hawthorn", "tryp", "trademark",
  // Choice
  "choice hotels", "comfort inn", "quality inn", "sleep inn", "clarion",
  "cambria", "mainstay", "suburban", "econo lodge", "rodeway",
  // Best Western
  "best western", "sure hotel", "glo", "aiden", "vib", "sadie",
  // Other global
  "four seasons", "aman", "mandarin oriental", "peninsula", "oberoi",
  "one&only", "rosewood", "belmond", "rocco forte", "langham", "taj",
  "banyan tree", "como hotels", "anantara", "six senses",
  // Mexican chains
  "camino real", "fiesta americana", "fiesta inn", "live aqua", "krystal",
  "posadas", "grupo posadas", "hotsson", "galeria plaza", "real inn",
  "brisas", "misión hotels", "misión", "presidente", "real de minas",
  "pueblo bonito", "xcaret", "vidanta", "palace resorts", "grand palladium",
  "bahia principe", "grand coral", "royal hideaway", "iberostar", "riu",
  "sandos", "barceló", "barcelo", "oasis hotels", "be live", "sunset royal",
];

// Chain domain suffixes
const CHAIN_DOMAINS = [
  "marriott.com", "hilton.com", "ihg.com", "hyatt.com", "wyndham.com",
  "accor.com", "bestwestern.com", "choicehotels.com", "fourseasons.com",
  "rosewoodhotels.com", "mandarinoriental.com", "peninsula.com", "amanresorts.com",
  "oneandonlyresorts.com", "belmond.com", "aman.com",
];

function containsChainKeyword(text: string): boolean {
  const lower = text.toLowerCase();
  return KNOWN_CHAINS.some(chain => lower.includes(chain));
}

function hasChainDomain(url: string): boolean {
  const lower = url.toLowerCase();
  return CHAIN_DOMAINS.some(d => lower.includes(d));
}

export function classifyHotel(el: any): ClassifiedHotel {
  const tags = el.tags || {};
  const name: string = tags.name || tags["name:es"] || tags["name:en"] || "Unknown";
  const lat: number = el.lat ?? el.center?.lat ?? 0;
  const lon: number = el.lon ?? el.center?.lon ?? 0;
  const osmType: "node" | "way" | "relation" = el.type || "node";

  const tourismType: ClassifiedHotel["tourismType"] =
    tags.tourism === "hotel" ? "hotel"
    : tags.tourism === "motel" ? "motel"
    : tags.tourism === "guest_house" ? "guest_house"
    : "other";

  const brand: string = tags.brand || "";
  const operator: string = tags.operator || "";
  const website: string = tags.website || tags["contact:website"] || "";
  const phone: string = tags.phone || tags["contact:phone"] || "";

  const hasWebsite = !!website;
  const hasPhone = !!phone;
  const stars = tags.stars ? parseInt(tags.stars) : undefined;
  const rooms = tags.rooms ? parseInt(tags.rooms) : undefined;

  // Build address
  const addrParts = [
    tags["addr:street"],
    tags["addr:housenumber"],
    tags["addr:neighbourhood"] || tags["addr:suburb"],
    tags["addr:city"],
  ].filter(Boolean);
  const address = addrParts.length > 0 ? addrParts.join(", ") : undefined;

  // — Classification Logic —
  let score = 50; // start neutral
  let classification: HotelClassification = "unknown";

  const nameIsChain = containsChainKeyword(name);
  const brandIsChain = brand && containsChainKeyword(brand);
  const operatorIsChain = operator && containsChainKeyword(operator);
  const websiteIsChain = website && hasChainDomain(website);

  if (nameIsChain || brandIsChain || operatorIsChain || websiteIsChain) {
    score -= 50;
    classification = "likely_chain";
  }

  if (!brand && !operator) score += 40;
  if (hasWebsite && website && !hasChainDomain(website)) score += 20;
  if (hasPhone) score += 10;
  if (tourismType === "guest_house") score += 10; // guest houses tend to be independent

  const independenceScore = Math.max(0, Math.min(100, score));

  if (classification !== "likely_chain") {
    if (independenceScore >= 60) classification = "likely_independent";
    else classification = "unknown";
  }

  return {
    id: el.id,
    osmType,
    name,
    lat,
    lon,
    tags,
    classification,
    independenceScore,
    tourismType,
    hasWebsite,
    hasPhone,
    stars,
    rooms,
    address,
  };
}

export function classifyAll(elements: any[]): ClassifiedHotel[] {
  return elements
    .map(classifyHotel)
    .filter(h => h.lat !== 0 && h.lon !== 0);
}
