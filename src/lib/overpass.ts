import { supabase } from "@/integrations/supabase/client";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

// Rate limiting
let lastCallTime = 0;
const MIN_INTERVAL = 3000; // 3 seconds between calls

function queryHash(query: string): string {
  let hash = 0;
  for (let i = 0; i < query.length; i++) {
    const char = query.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash.toString(36);
}

export interface OverpassResult {
  id: number;
  name: string;
  lat: number;
  lon: number;
  tags: Record<string, string>;
}

function buildHotelQuery(lat: number, lon: number, radius: number): string {
  return `[out:json][timeout:25];
(
  node["tourism"="hotel"](around:${radius},${lat},${lon});
  way["tourism"="hotel"](around:${radius},${lat},${lon});
  relation["tourism"="hotel"](around:${radius},${lat},${lon});
);
out center tags;`;
}

function buildAirportQuery(lat: number, lon: number, radius: number): string {
  return `[out:json][timeout:25];
(
  node["aeroway"="aerodrome"](around:${radius},${lat},${lon});
  way["aeroway"="aerodrome"](around:${radius},${lat},${lon});
  relation["aeroway"="aerodrome"](around:${radius},${lat},${lon});
);
out center tags;`;
}

function buildPOIQuery(lat: number, lon: number, radius: number): string {
  return `[out:json][timeout:25];
(
  node["tourism"="attraction"](around:${radius},${lat},${lon});
  node["amenity"="restaurant"](around:${radius},${lat},${lon});
);
out center tags;`;
}

function normalizeResults(data: any): OverpassResult[] {
  if (!data?.elements) return [];
  return data.elements.map((el: any) => ({
    id: el.id,
    name: el.tags?.name || el.tags?.["name:es"] || el.tags?.["name:en"] || "Unknown",
    lat: el.lat ?? el.center?.lat ?? 0,
    lon: el.lon ?? el.center?.lon ?? 0,
    tags: el.tags || {},
  })).filter((r: OverpassResult) => r.lat !== 0 && r.lon !== 0);
}

async function getCached(hash: string, layer: string): Promise<OverpassResult[] | null> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("cached_overpass")
    .select("geojson, fetched_at")
    .eq("query_hash", hash)
    .eq("layer", layer)
    .gte("fetched_at", sevenDaysAgo)
    .maybeSingle();
  
  if (data?.geojson) {
    return data.geojson as unknown as OverpassResult[];
  }
  return null;
}

async function getStaleCached(hash: string, layer: string): Promise<OverpassResult[] | null> {
  const { data } = await supabase
    .from("cached_overpass")
    .select("geojson")
    .eq("query_hash", hash)
    .eq("layer", layer)
    .order("fetched_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  
  if (data?.geojson) {
    return data.geojson as unknown as OverpassResult[];
  }
  return null;
}

async function setCache(hash: string, layer: string, lat: number, lon: number, radius: number, results: OverpassResult[]) {
  await supabase.from("cached_overpass").insert({
    query_hash: hash,
    layer,
    center_lat: lat,
    center_lon: lon,
    radius_m: radius,
    geojson: results as any,
  });
}

async function fetchOverpass(query: string): Promise<any> {
  const now = Date.now();
  const timeSinceLast = now - lastCallTime;
  if (timeSinceLast < MIN_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_INTERVAL - timeSinceLast));
  }
  lastCallTime = Date.now();

  const response = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (response.status === 429) {
    throw new Error("rate_limited");
  }
  if (!response.ok) {
    throw new Error(`overpass_error_${response.status}`);
  }
  return response.json();
}

export type OverpassLayer = "hotels" | "airports" | "pois";

export async function queryOverpass(
  layer: OverpassLayer,
  lat: number,
  lon: number,
  radius: number
): Promise<{ results: OverpassResult[]; fromCache: boolean; stale: boolean }> {
  const queryBuilders: Record<OverpassLayer, (lat: number, lon: number, r: number) => string> = {
    hotels: buildHotelQuery,
    airports: buildAirportQuery,
    pois: buildPOIQuery,
  };

  const query = queryBuilders[layer](lat, lon, radius);
  const hash = queryHash(query);

  // Check fresh cache
  const cached = await getCached(hash, layer);
  if (cached) {
    return { results: cached, fromCache: true, stale: false };
  }

  // Try live query
  try {
    const data = await fetchOverpass(query);
    const results = normalizeResults(data);
    await setCache(hash, layer, lat, lon, radius, results);
    return { results, fromCache: false, stale: false };
  } catch (err: any) {
    // Fallback to stale cache
    const stale = await getStaleCached(hash, layer);
    if (stale) {
      return { results: stale, fromCache: true, stale: true };
    }
    throw err;
  }
}

export function distanceBetween(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
