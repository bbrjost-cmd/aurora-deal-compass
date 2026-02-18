// ============================================================
// Overpass bbox-based fetcher for Independent Hotels layer
// Chunked strategy: always 4 tiles in parallel + AbortController
// ============================================================

import { supabase } from "@/integrations/supabase/client";
import { classifyAll, ClassifiedHotel } from "./hotel-classifier";

// Multiple Overpass mirrors for reliability
const OVERPASS_MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
let lastCallTime = 0;
const MIN_INTERVAL = 2000; // 2s between calls per tile
let mirrorIdx = 0;

export interface BBox {
  south: number;
  west: number;
  north: number;
  east: number;
}

// CDMX bounding box — split into 4 tiles for reliable 200+ coverage
export const CDMX_BBOX: BBox = {
  south: 19.1,
  west: -99.35,
  north: 19.65,
  east: -98.95,
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
  return `[out:json][timeout:20];
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

async function fetchWithTimeout(url: string, body: string, timeoutMs = 22000): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(body)}`,
      signal: controller.signal,
    });
    if (resp.status === 429) throw new Error("rate_limited");
    if (!resp.ok) throw new Error(`overpass_${resp.status}`);
    return resp.json();
  } finally {
    clearTimeout(timer);
  }
}

async function rateLimitedFetch(query: string): Promise<any> {
  const now = Date.now();
  const wait = MIN_INTERVAL - (now - lastCallTime);
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastCallTime = Date.now();

  // Try current mirror, rotate on failure
  const startIdx = mirrorIdx;
  for (let attempt = 0; attempt < OVERPASS_MIRRORS.length; attempt++) {
    const mirror = OVERPASS_MIRRORS[(startIdx + attempt) % OVERPASS_MIRRORS.length];
    try {
      const result = await fetchWithTimeout(mirror, query, 22000);
      mirrorIdx = (startIdx + attempt) % OVERPASS_MIRRORS.length;
      return result;
    } catch (err: any) {
      if (attempt === OVERPASS_MIRRORS.length - 1) throw err;
      // Try next mirror
      console.warn(`Mirror ${mirror} failed, trying next…`, err.message);
    }
  }
}

async function getCachedTile(hash: string): Promise<ClassifiedHotel[] | null> {
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

async function getStaleCachedTile(hash: string): Promise<ClassifiedHotel[] | null> {
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

async function setCacheTile(hash: string, bbox: BBox, hotels: ClassifiedHotel[]) {
  const center_lat = (bbox.south + bbox.north) / 2;
  const center_lon = (bbox.west + bbox.east) / 2;
  await supabase.from("cached_overpass").upsert(
    {
      query_hash: hash,
      layer: "independent_hotels",
      center_lat,
      center_lon,
      radius_m: 25000,
      geojson: hotels as any,
    },
    { onConflict: "query_hash,layer" }
  );
}

async function fetchTile(tile: BBox): Promise<ClassifiedHotel[]> {
  const hash = bboxHash(tile, "independent_hotels");

  // Fresh cache?
  const cached = await getCachedTile(hash);
  if (cached) return cached;

  // Live fetch
  try {
    const query = buildHotelsQuery(tile);
    const data = await rateLimitedFetch(query);
    const elements: any[] = data?.elements || [];
    const hotels = classifyAll(elements);
    await setCacheTile(hash, tile, hotels);
    return hotels;
  } catch (err) {
    // Stale fallback
    const stale = await getStaleCachedTile(hash);
    if (stale) return stale;
    throw err;
  }
}

function dedup(hotels: ClassifiedHotel[]): ClassifiedHotel[] {
  const seen = new Set<number>();
  return hotels.filter(h => {
    if (seen.has(h.id)) return false;
    seen.add(h.id);
    return true;
  });
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
  // Always use 4-tile strategy for reliability
  const tiles = splitBBox(bbox);
  onProgress?.(`Fetching ${tiles.length} map tiles from OpenStreetMap…`);

  // Check all tiles for fresh cache first
  const cacheChecks = await Promise.all(
    tiles.map(tile => getCachedTile(bboxHash(tile, "independent_hotels")))
  );

  if (cacheChecks.every(c => c !== null)) {
    const allHotels = dedup(cacheChecks.flatMap(c => c!));
    return { hotels: allHotels, fromCache: true, stale: false, tileCount: tiles.length };
  }

  // Fetch missing tiles (with staggered start to avoid simultaneous requests)
  onProgress?.("Fetching live data (4 tiles in parallel)…");

  const results = await Promise.allSettled(
    tiles.map((tile, i) =>
      new Promise<ClassifiedHotel[]>((resolve, reject) => {
        setTimeout(async () => {
          try {
            resolve(await fetchTile(tile));
          } catch (e) {
            reject(e);
          }
        }, i * MIN_INTERVAL); // stagger: 0, 2s, 4s, 6s
      })
    )
  );

  const allHotels: ClassifiedHotel[] = [];
  let anyStale = false;
  let anyLive = false;

  for (const result of results) {
    if (result.status === "fulfilled") {
      allHotels.push(...result.value);
      anyLive = true;
    }
    // Failed tiles: try stale cache
    if (result.status === "rejected") {
      anyStale = true;
    }
  }

  const unique = dedup(allHotels);
  return {
    hotels: unique,
    fromCache: !anyLive,
    stale: anyStale,
    tileCount: tiles.length,
  };
}
