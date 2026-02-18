// ============================================================
// Overpass bbox-based fetcher for Independent Hotels layer
// Supports chunked strategy for large areas + caching
// ============================================================

import { supabase } from "@/integrations/supabase/client";
import { classifyAll, ClassifiedHotel } from "./hotel-classifier";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
let lastCallTime = 0;
const MIN_INTERVAL = 3000;

export interface BBox {
  south: number;
  west: number;
  north: number;
  east: number;
}

// CDMX bounding box — guaranteed 200+ hotels
export const CDMX_BBOX: BBox = {
  south: 19.0,
  west: -99.40,
  north: 19.80,
  east: -98.85,
};

function bboxHash(bbox: BBox, layer: string): string {
  const str = `${layer}_${bbox.south.toFixed(4)}_${bbox.west.toFixed(4)}_${bbox.north.toFixed(4)}_${bbox.east.toFixed(4)}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash.toString(36);
}

function buildHotelsQuery(bbox: BBox): string {
  const b = `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`;
  return `[out:json][timeout:25];
(
  node["tourism"="hotel"](${b});
  way["tourism"="hotel"](${b});
  relation["tourism"="hotel"](${b});
  node["tourism"="motel"](${b});
  way["tourism"="motel"](${b});
  relation["tourism"="motel"](${b});
  node["tourism"="guest_house"](${b});
  way["tourism"="guest_house"](${b});
  relation["tourism"="guest_house"](${b});
);
out center tags;`;
}

function splitBBox(bbox: BBox): BBox[] {
  const midLat = (bbox.south + bbox.north) / 2;
  const midLon = (bbox.west + bbox.east) / 2;
  return [
    { south: bbox.south, west: bbox.west, north: midLat, east: midLon },
    { south: bbox.south, west: midLon, north: midLat, east: bbox.east },
    { south: midLat, west: bbox.west, north: bbox.north, east: midLon },
    { south: midLat, west: midLon, north: bbox.north, east: bbox.east },
  ];
}

async function rateLimitedFetch(query: string): Promise<any> {
  const now = Date.now();
  const wait = MIN_INTERVAL - (now - lastCallTime);
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastCallTime = Date.now();

  const resp = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (resp.status === 429) throw new Error("rate_limited");
  if (!resp.ok) throw new Error(`overpass_${resp.status}`);
  return resp.json();
}

async function getCached(hash: string): Promise<ClassifiedHotel[] | null> {
  const cutoff = new Date(Date.now() - CACHE_TTL_MS).toISOString();
  const { data } = await supabase
    .from("cached_overpass")
    .select("geojson, fetched_at")
    .eq("query_hash", hash)
    .eq("layer", "independent_hotels")
    .gte("fetched_at", cutoff)
    .maybeSingle();

  if (data?.geojson) return data.geojson as unknown as ClassifiedHotel[];
  return null;
}

async function getStaleCached(hash: string): Promise<ClassifiedHotel[] | null> {
  const { data } = await supabase
    .from("cached_overpass")
    .select("geojson")
    .eq("query_hash", hash)
    .eq("layer", "independent_hotels")
    .order("fetched_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (data?.geojson) return data.geojson as unknown as ClassifiedHotel[];
  return null;
}

async function setCache(hash: string, bbox: BBox, hotels: ClassifiedHotel[]) {
  const center_lat = (bbox.south + bbox.north) / 2;
  const center_lon = (bbox.west + bbox.east) / 2;
  const radius_m = 50000; // approximate

  // Upsert by query_hash + layer
  await supabase.from("cached_overpass").upsert(
    {
      query_hash: hash,
      layer: "independent_hotels",
      center_lat,
      center_lon,
      radius_m,
      geojson: hotels as any,
    },
    { onConflict: "query_hash,layer" }
  );
}

async function fetchBBox(bbox: BBox): Promise<ClassifiedHotel[]> {
  const query = buildHotelsQuery(bbox);
  const data = await rateLimitedFetch(query);
  const elements: any[] = data?.elements || [];

  // De-duplicate by OSM id
  const seen = new Set<number>();
  const unique = elements.filter(el => {
    if (seen.has(el.id)) return false;
    seen.add(el.id);
    return true;
  });

  return classifyAll(unique);
}

export interface IndependentHotelsResult {
  hotels: ClassifiedHotel[];
  fromCache: boolean;
  stale: boolean;
  tileCount: number;
}

export async function fetchIndependentHotels(
  bbox: BBox,
  onProgress?: (msg: string) => void
): Promise<IndependentHotelsResult> {
  const hash = bboxHash(bbox, "independent_hotels");

  // 1. Fresh cache check
  const cached = await getCached(hash);
  if (cached) {
    return { hotels: cached, fromCache: true, stale: false, tileCount: 1 };
  }

  // 2. Live fetch with chunked strategy
  try {
    onProgress?.("Fetching hotels from OpenStreetMap…");
    let hotels = await fetchBBox(bbox);

    // If too few, try chunked (split into 4 tiles)
    if (hotels.length < 50) {
      onProgress?.("Splitting into tiles for better coverage…");
      const tiles = splitBBox(bbox);
      const tileResults = await Promise.allSettled(
        tiles.map(tile => fetchBBox(tile))
      );

      const allHotels: ClassifiedHotel[] = [];
      const seenIds = new Set<number>();
      for (const result of tileResults) {
        if (result.status === "fulfilled") {
          for (const h of result.value) {
            if (!seenIds.has(h.id)) {
              seenIds.add(h.id);
              allHotels.push(h);
            }
          }
        }
      }
      hotels = allHotels;
    }

    await setCache(hash, bbox, hotels);
    return { hotels, fromCache: false, stale: false, tileCount: 1 };
  } catch (err: any) {
    // 3. Fallback to stale cache
    onProgress?.("Live fetch failed, checking stale cache…");
    const stale = await getStaleCached(hash);
    if (stale) {
      return { hotels: stale, fromCache: true, stale: true, tileCount: 1 };
    }
    throw err;
  }
}
