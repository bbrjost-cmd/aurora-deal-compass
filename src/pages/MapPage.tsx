import { useEffect, useState, useCallback, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap, CircleMarker } from "react-leaflet";
import L from "leaflet";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { queryOverpass, OverpassResult, OverpassLayer } from "@/lib/overpass";
import { fetchIndependentHotels, CDMX_BBOX, BBox } from "@/lib/overpass-bbox";
import { ClassifiedHotel, HotelClassification } from "@/lib/hotel-classifier";
import { MEXICO_CENTER, CDMX_CENTER } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Hotel, Plane, MapPin, Building2, Layers, Filter } from "lucide-react";
import { DealCreateDialog } from "@/components/DealCreateDialog";
import { DealDetailDrawer } from "@/components/DealDetailDrawer";
import { HotelIntelligenceDrawer } from "@/components/HotelIntelligenceDrawer";
import { cn } from "@/lib/utils";

const DESTINATIONS = [
  { label: "Mexico Overview", lat: 23.6345, lon: -102.5528, zoom: 5 },
  { label: "Riviera Maya", lat: 20.6296, lon: -87.0739, zoom: 11 },
  { label: "Tulum", lat: 20.2114, lon: -87.4654, zoom: 12 },
  { label: "Los Cabos", lat: 22.89, lon: -109.92, zoom: 11 },
  { label: "Mexico City", lat: 19.4326, lon: -99.1680, zoom: 12 },
  { label: "Puerto Vallarta / Nayarit", lat: 20.6976, lon: -105.2970, zoom: 11 },
  { label: "Cancún", lat: 21.1619, lon: -86.8515, zoom: 11 },
];

const dealIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const hotelIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [20, 33], iconAnchor: [10, 33], popupAnchor: [1, -28], shadowSize: [33, 33],
});

const airportIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [20, 33], iconAnchor: [10, 33], popupAnchor: [1, -28], shadowSize: [33, 33],
});

// Color map for independent hotel circles
const INDEP_HOTEL_COLORS: Record<HotelClassification, string> = {
  likely_independent: "#B8860B", // gold
  likely_chain: "#3B82F6",       // blue
  unknown: "#D97706",            // amber
};

type FilterChip = "all" | HotelClassification | "has_website" | "has_phone";

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lon: number) => void }) {
  useMapEvents({
    click(e) { onMapClick(e.latlng.lat, e.latlng.lng); },
  });
  return null;
}

function FlyToHandler({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => { map.flyTo(center, zoom, { duration: 1.5 }); }, [center, zoom, map]);
  return null;
}

function InvalidateSizeHandler() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 100);
    const ro = new ResizeObserver(() => map.invalidateSize());
    const container = map.getContainer();
    if (container.parentElement) ro.observe(container.parentElement);
    return () => { clearTimeout(timer); ro.disconnect(); };
  }, [map]);
  return null;
}

export default function MapPage() {
  const { orgId } = useAuth();
  const [deals, setDeals] = useState<any[]>([]);
  const [hotels, setHotels] = useState<OverpassResult[]>([]);
  const [airports, setAirports] = useState<OverpassResult[]>([]);
  const [independentHotels, setIndependentHotels] = useState<ClassifiedHotel[]>([]);

  // Layer visibility
  const [showDeals, setShowDeals] = useState(true);
  const [showHotels, setShowHotels] = useState(false);
  const [showAirports, setShowAirports] = useState(true);
  const [showIndependent, setShowIndependent] = useState(false);

  // Filters
  const [indepFilter, setIndepFilter] = useState<FilterChip>("all");

  const [radius, setRadius] = useState(5000);
  const [center, setCenter] = useState<[number, number]>([MEXICO_CENTER.lat, MEXICO_CENTER.lon]);
  const [zoom, setZoom] = useState(6);
  const [loading, setLoading] = useState(false);
  const [loadingIndep, setLoadingIndep] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createLatLon, setCreateLatLon] = useState<{ lat: number; lon: number } | null>(null);
  const [selectedDeal, setSelectedDeal] = useState<any>(null);
  const [selectedHotel, setSelectedHotel] = useState<ClassifiedHotel | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!orgId) return;
    supabase.from("deals").select("*").eq("org_id", orgId).then(({ data }) => setDeals(data || []));
  }, [orgId]);

  const loadOverpass = useCallback(async (lat: number, lon: number, r: number) => {
    setLoading(true);
    try {
      const [hotelsRes, airportsRes] = await Promise.all([
        showHotels ? queryOverpass("hotels", lat, lon, r) : Promise.resolve({ results: [], fromCache: false, stale: false }),
        showAirports ? queryOverpass("airports", lat, lon, r) : Promise.resolve({ results: [], fromCache: false, stale: false }),
      ]);
      setHotels(hotelsRes.results);
      setAirports(airportsRes.results);
      if (hotelsRes.stale || airportsRes.stale) {
        toast({ title: "Using cached data", description: "Live data unavailable.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Overpass error", description: "Could not fetch map data.", variant: "destructive" });
    }
    setLoading(false);
  }, [showHotels, showAirports]);

  const loadIndependentHotels = useCallback(async (bbox: BBox) => {
    setLoadingIndep(true);
    try {
      const result = await fetchIndependentHotels(bbox, (msg) => {
        toast({ title: "Loading hotels…", description: msg });
      });
      setIndependentHotels(result.hotels);

      const indepCount = result.hotels.filter(h => h.classification === "likely_independent").length;
      toast({
        title: result.fromCache
          ? result.stale ? "Stale cache used" : "Loaded from cache"
          : "Hotels loaded",
        description: `${result.hotels.length} total · ${indepCount} likely independent${result.stale ? " (stale)" : ""}`,
      });
    } catch {
      toast({ title: "Error loading hotels", description: "Try again in a moment.", variant: "destructive" });
    }
    setLoadingIndep(false);
  }, []);

  // When layer toggled ON for CDMX area, auto-load
  useEffect(() => {
    if (showIndependent && independentHotels.length === 0) {
      loadIndependentHotels(CDMX_BBOX);
    }
  }, [showIndependent]);

  const handleSearch = () => loadOverpass(center[0], center[1], radius);

  const handleDestination = (idx: string) => {
    const dest = DESTINATIONS[parseInt(idx)];
    if (dest) {
      setCenter([dest.lat, dest.lon]);
      setZoom(dest.zoom);
    }
  };

  const handleMapClick = (lat: number, lon: number) => {
    if (selectedHotel) { setSelectedHotel(null); return; }
    setCreateLatLon({ lat, lon });
    setCreateOpen(true);
  };

  const handleDealCreated = () => {
    setCreateOpen(false);
    if (orgId) supabase.from("deals").select("*").eq("org_id", orgId).then(({ data }) => setDeals(data || []));
  };

  const handleHotelDealCreated = (deal: any) => {
    setSelectedDeal(deal);
    setSelectedHotel(null);
    if (orgId) supabase.from("deals").select("*").eq("org_id", orgId).then(({ data }) => setDeals(data || []));
  };

  // Filtered independent hotels for display
  const filteredIndepHotels = independentHotels.filter(h => {
    if (indepFilter === "all") return true;
    if (indepFilter === "has_website") return h.hasWebsite;
    if (indepFilter === "has_phone") return h.hasPhone;
    return h.classification === indepFilter;
  });

  const indepCounts = {
    all: independentHotels.length,
    likely_independent: independentHotels.filter(h => h.classification === "likely_independent").length,
    unknown: independentHotels.filter(h => h.classification === "unknown").length,
    likely_chain: independentHotels.filter(h => h.classification === "likely_chain").length,
    has_website: independentHotels.filter(h => h.hasWebsite).length,
    has_phone: independentHotels.filter(h => h.hasPhone).length,
  };

  const FILTER_CHIPS: { key: FilterChip; label: string }[] = [
    { key: "all", label: `All (${indepCounts.all})` },
    { key: "likely_independent", label: `Independent (${indepCounts.likely_independent})` },
    { key: "unknown", label: `Unknown (${indepCounts.unknown})` },
    { key: "likely_chain", label: `Chain (${indepCounts.likely_chain})` },
    { key: "has_website", label: `Has Website (${indepCounts.has_website})` },
    { key: "has_phone", label: `Has Phone (${indepCounts.has_phone})` },
  ];

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 3.5rem)" }}>
      {/* Controls Bar */}
      <div className="p-3 border-b border-border flex flex-wrap items-center gap-3 bg-background shrink-0">
        <Select onValueChange={handleDestination}>
          <SelectTrigger className="w-48 h-8 text-xs">
            <SelectValue placeholder="Go to destination…" />
          </SelectTrigger>
          <SelectContent>
            {DESTINATIONS.map((d, i) => (
              <SelectItem key={d.label} value={i.toString()}>{d.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={radius.toString()} onValueChange={(v) => setRadius(Number(v))}>
          <SelectTrigger className="w-24 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1000">1 km</SelectItem>
            <SelectItem value="3000">3 km</SelectItem>
            <SelectItem value="5000">5 km</SelectItem>
            <SelectItem value="10000">10 km</SelectItem>
          </SelectContent>
        </Select>

        {/* Layer toggles */}
        <div className="flex items-center gap-3 border border-border rounded-lg px-3 py-1.5">
          <span className="text-xs font-medium text-muted-foreground"><Layers className="h-3 w-3 inline mr-1" />Layers</span>
          
          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
            <Switch checked={showDeals} onCheckedChange={setShowDeals} className="scale-75" />
            <MapPin className="h-3 w-3 text-destructive" />
            <span>Deals</span>
            <Badge variant="secondary" className="text-xs px-1 py-0 h-4">{deals.filter(d => d.lat && d.lon).length}</Badge>
          </label>

          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
            <Switch checked={showHotels} onCheckedChange={setShowHotels} className="scale-75" />
            <Hotel className="h-3 w-3 text-[hsl(var(--hotel-chain))]" />
            <span>Comp Hotels</span>
            <Badge variant="secondary" className="text-xs px-1 py-0 h-4">{hotels.length}</Badge>
          </label>

          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
            <Switch checked={showAirports} onCheckedChange={setShowAirports} className="scale-75" />
            <Plane className="h-3 w-3 text-[hsl(var(--success))]" />
            <span>Airports</span>
          </label>

          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
            <Switch
              checked={showIndependent}
              onCheckedChange={setShowIndependent}
              className="scale-75"
            />
            <Building2 className="h-3 w-3 text-[hsl(var(--hotel-independent))]" />
            <span className="font-medium">Independent Hotels</span>
            {loadingIndep ? (
              <span className="text-xs text-muted-foreground animate-pulse">loading…</span>
            ) : (
              <Badge className="text-xs px-1 py-0 h-4 bg-[hsl(var(--hotel-independent))] text-background">
                {indepCounts.all}
              </Badge>
            )}
          </label>
        </div>

        <Button size="sm" className="h-8 text-xs" onClick={handleSearch} disabled={loading}>
          {loading ? "Loading…" : "Search Area"}
        </Button>

        <span className="text-xs text-muted-foreground ml-auto hidden lg:block">
          Click map to add deal
        </span>
      </div>

      {/* Filter chips for independent hotels */}
      {showIndependent && independentHotels.length > 0 && (
        <div className="px-3 py-2 border-b border-border bg-muted/30 flex items-center gap-2 flex-wrap shrink-0">
          <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground shrink-0">Filter:</span>
          {FILTER_CHIPS.map(chip => (
            <button
              key={chip.key}
              onClick={() => setIndepFilter(chip.key)}
              className={cn(
                "text-xs px-2.5 py-1 rounded-full border transition-colors",
                indepFilter === chip.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border hover:bg-accent"
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}

      {/* Map + Drawer layout */}
      <div className="flex-1 relative flex min-h-0">
        {/* Map */}
        <div className={cn("flex-1 relative", selectedHotel ? "mr-[420px]" : "")}>
          <div className="absolute inset-0">
            <MapContainer
              center={center}
              zoom={zoom}
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
              />
              <FlyToHandler center={center} zoom={zoom} />
              <InvalidateSizeHandler />
              <MapClickHandler onMapClick={handleMapClick} />

              {/* Deal pins */}
              {showDeals && deals.filter(d => d.lat && d.lon).map((deal) => (
                <Marker key={deal.id} position={[deal.lat, deal.lon]} icon={dealIcon}
                  eventHandlers={{ click: () => { setSelectedHotel(null); setSelectedDeal(deal); } }}
                >
                  <Popup>
                    <div className="text-sm">
                      <p className="font-semibold">{deal.name}</p>
                      <p className="text-xs text-muted-foreground">{deal.city}, {deal.state}</p>
                      <p className="text-xs">Stage: {deal.stage} · Score: {deal.score_total}</p>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Competitor Hotels */}
              {showHotels && hotels.map((h) => (
                <Marker key={`h-${h.id}`} position={[h.lat, h.lon]} icon={hotelIcon}>
                  <Popup>
                    <div className="text-sm">
                      <p className="font-semibold">{h.name}</p>
                      <p className="text-xs">{h.tags.stars ? `${h.tags.stars}★` : "Hotel"}</p>
                      {h.tags.rooms && <p className="text-xs">{h.tags.rooms} rooms</p>}
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Airports */}
              {showAirports && airports.map((a) => (
                <Marker key={`a-${a.id}`} position={[a.lat, a.lon]} icon={airportIcon}>
                  <Popup>
                    <div className="text-sm">
                      <p className="font-semibold">{a.name}</p>
                      <p className="text-xs">{a.tags.iata ? `IATA: ${a.tags.iata}` : "Airport"}</p>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Independent Hotels — rendered as CircleMarkers for performance */}
              {showIndependent && filteredIndepHotels.map((h) => (
                <CircleMarker
                  key={`ih-${h.id}`}
                  center={[h.lat, h.lon]}
                  radius={selectedHotel?.id === h.id ? 9 : 6}
                  pathOptions={{
                    color: INDEP_HOTEL_COLORS[h.classification],
                    fillColor: INDEP_HOTEL_COLORS[h.classification],
                    fillOpacity: selectedHotel?.id === h.id ? 1 : 0.7,
                    weight: selectedHotel?.id === h.id ? 2 : 1,
                    opacity: 0.9,
                  }}
                  eventHandlers={{
                    click: (e) => {
                      e.originalEvent.stopPropagation();
                      setSelectedDeal(null);
                      setSelectedHotel(h);
                    },
                  }}
                >
                  <Popup>
                    <div className="text-sm min-w-[160px]">
                      <p className="font-semibold truncate">{h.name}</p>
                      <p className="text-xs capitalize">{h.tourismType.replace("_", " ")}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {h.classification === "likely_independent" ? "🟡 Likely Independent" :
                         h.classification === "likely_chain" ? "🔵 Likely Chain" : "🟠 Unknown"}
                      </p>
                      <button
                        className="mt-2 text-xs text-primary underline"
                        onClick={() => setSelectedHotel(h)}
                      >
                        View Intelligence →
                      </button>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>
        </div>

        {/* Hotel Intelligence Drawer */}
        {selectedHotel && (
          <HotelIntelligenceDrawer
            hotel={selectedHotel}
            nearbyHotels={independentHotels}
            cityCenter={CDMX_CENTER}
            onClose={() => setSelectedHotel(null)}
            onDealCreated={handleHotelDealCreated}
          />
        )}
      </div>

      {/* Legend */}
      {showIndependent && (
        <div className="absolute bottom-4 left-4 z-[400] bg-background/95 border border-border rounded-lg p-3 shadow-lg text-xs space-y-1.5 pointer-events-none">
          <p className="font-semibold text-xs mb-2">Independent Hotels</p>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-[#B8860B]" />
            <span>Likely Independent ({indepCounts.likely_independent})</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-[#D97706]" />
            <span>Unknown ({indepCounts.unknown})</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-[#3B82F6]" />
            <span>Likely Chain ({indepCounts.likely_chain})</span>
          </div>
        </div>
      )}

      <DealCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleDealCreated}
        defaultLat={createLatLon?.lat}
        defaultLon={createLatLon?.lon}
      />

      <DealDetailDrawer
        deal={selectedDeal}
        onClose={() => setSelectedDeal(null)}
        onUpdate={() => {
          if (orgId) supabase.from("deals").select("*").eq("org_id", orgId).then(({ data }) => setDeals(data || []));
        }}
      />
    </div>
  );
}
