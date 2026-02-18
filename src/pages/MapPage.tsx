import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap, CircleMarker } from "react-leaflet";
import L from "leaflet";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { queryOverpass, OverpassResult, OverpassLayer } from "@/lib/overpass";
import { fetchIndependentHotels, CDMX_BBOX, BBox } from "@/lib/overpass-bbox";
import { ClassifiedHotel, HotelClassification } from "@/lib/hotel-classifier";
import { MEXICO_CENTER, CDMX_CENTER, STAGE_LABELS, SEGMENT_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Hotel, Plane, MapPin, Building2, Layers, Filter, ChevronLeft, ChevronRight, CheckCircle2, XCircle, AlertTriangle, Minus } from "lucide-react";
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

const IC_STYLES: Record<string, { color: string; bg: string; icon: any; label: string }> = {
  go:                 { color: "text-ic-go",         bg: "bg-ic-go-muted",         icon: CheckCircle2,   label: "GO" },
  go_with_conditions: { color: "text-ic-conditions", bg: "bg-ic-conditions-muted", icon: AlertTriangle,  label: "Conditions" },
  no_go:              { color: "text-ic-nogo",       bg: "bg-ic-nogo-muted",       icon: XCircle,        label: "NO-GO" },
};

const DECISION_PIN_COLORS: Record<string, { fill: string; stroke: string }> = {
  go:                 { fill: "#22c55e", stroke: "#16a34a" },
  go_with_conditions: { fill: "#f59e0b", stroke: "#d97706" },
  no_go:              { fill: "#ef4444", stroke: "#dc2626" },
  none:               { fill: "#111111", stroke: "#444444" },
};

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
  const [decisions, setDecisions] = useState<any[]>([]);
  const [hotels, setHotels] = useState<OverpassResult[]>([]);
  const [airports, setAirports] = useState<OverpassResult[]>([]);
  const [independentHotels, setIndependentHotels] = useState<ClassifiedHotel[]>([]);

  // Layer visibility
  const [showDeals, setShowDeals] = useState(true);
  const [showHotels, setShowHotels] = useState(false);
  const [showAirports, setShowAirports] = useState(true);
  const [showIndependent, setShowIndependent] = useState(false);

  // Deal panel filters
  const [panelOpen, setPanelOpen] = useState(true);
  const [filterSegment, setFilterSegment] = useState("all");
  const [filterStage, setFilterStage] = useState("all");
  const [filterDecision, setFilterDecision] = useState("all");

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
    Promise.all([
      supabase.from("deals").select("*").eq("org_id", orgId),
      supabase.from("decision_history").select("deal_id, decision, ic_score, created_at").eq("org_id", orgId).order("created_at", { ascending: false }),
    ]).then(([dealsRes, decisionsRes]) => {
      setDeals(dealsRes.data || []);
      setDecisions(decisionsRes.data || []);
    });
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

  // IC Decision map: dealId → latest decision
  const decisionMap = useMemo(() => {
    const map: Record<string, { decision: string; ic_score: number }> = {};
    decisions.forEach(dec => {
      if (dec.deal_id && !map[dec.deal_id]) {
        map[dec.deal_id] = { decision: dec.decision, ic_score: dec.ic_score };
      }
    });
    return map;
  }, [decisions]);

  // Deals with geo + panel filters
  const geoDeals = useMemo(() =>
    deals.filter(d => d.lat && d.lon),
    [deals]
  );

  const panelDeals = useMemo(() => {
    return geoDeals.filter(d => {
      if (filterSegment !== "all" && d.segment !== filterSegment) return false;
      if (filterStage !== "all" && d.stage !== filterStage) return false;
      if (filterDecision !== "all") {
        const dec = decisionMap[d.id]?.decision || "none";
        if (filterDecision !== dec) return false;
      }
      return true;
    });
  }, [geoDeals, filterSegment, filterStage, filterDecision, decisionMap]);

  // Distinct segments/stages present in geo deals
  const availableSegments = useMemo(() => [...new Set(geoDeals.map(d => d.segment).filter(Boolean))], [geoDeals]);
  const availableStages   = useMemo(() => [...new Set(geoDeals.map(d => d.stage).filter(Boolean))],   [geoDeals]);

  // Custom colored deal pin
  const getDealIcon = (dealId: string) => {
    const dec = decisionMap[dealId]?.decision || "none";
    const c = DECISION_PIN_COLORS[dec] || DECISION_PIN_COLORS.none;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="28" viewBox="0 0 22 28">
      <path d="M11 0C4.924 0 0 4.924 0 11c0 7.333 11 17 11 17S22 18.333 22 11C22 4.924 17.076 0 11 0z"
        fill="${c.fill}" stroke="${c.stroke}" stroke-width="1.2"/>
      <circle cx="11" cy="11" r="5" fill="white" opacity="0.9"/>
    </svg>`;
    return L.divIcon({ className: "", html: svg, iconSize: [22, 28], iconAnchor: [11, 28], popupAnchor: [0, -30] });
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
    <div className="flex flex-col" style={{ height: "calc(100vh - 6.5rem)" }}>
      {/* Controls Bar — compact on mobile */}
      <div className="px-2 py-2 border-b border-border flex flex-wrap items-center gap-2 bg-background shrink-0">
        {/* Destination + radius */}
        <Select onValueChange={handleDestination}>
          <SelectTrigger className="w-36 sm:w-44 h-8 text-xs">
            <SelectValue placeholder="Destination…" />
          </SelectTrigger>
          <SelectContent>
            {DESTINATIONS.map((d, i) => (
              <SelectItem key={d.label} value={i.toString()}>{d.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={radius.toString()} onValueChange={(v) => setRadius(Number(v))}>
          <SelectTrigger className="w-16 sm:w-20 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1000">1 km</SelectItem>
            <SelectItem value="3000">3 km</SelectItem>
            <SelectItem value="5000">5 km</SelectItem>
            <SelectItem value="10000">10 km</SelectItem>
          </SelectContent>
        </Select>

        {/* Layer toggles — horizontally scrollable on mobile */}
        <div className="flex items-center gap-2 overflow-x-auto flex-1 min-w-0">
          <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">
            <Layers className="h-3 w-3 inline mr-1" />
          </span>

          <label className="flex items-center gap-1 text-xs cursor-pointer shrink-0">
            <Switch checked={showDeals} onCheckedChange={setShowDeals} className="scale-75" />
            <MapPin className="h-3 w-3 text-destructive" />
            <span className="hidden sm:inline">Deals</span>
            <Badge variant="secondary" className="text-xs px-1 py-0 h-4">{deals.filter(d => d.lat && d.lon).length}</Badge>
          </label>

          <label className="flex items-center gap-1 text-xs cursor-pointer shrink-0">
            <Switch checked={showHotels} onCheckedChange={setShowHotels} className="scale-75" />
            <Hotel className="h-3 w-3 text-[hsl(var(--hotel-chain))]" />
            <span className="hidden sm:inline">Hotels</span>
          </label>

          <label className="flex items-center gap-1 text-xs cursor-pointer shrink-0">
            <Switch checked={showAirports} onCheckedChange={setShowAirports} className="scale-75" />
            <Plane className="h-3 w-3 text-[hsl(var(--success))]" />
            <span className="hidden sm:inline">Airports</span>
          </label>

          <label className="flex items-center gap-1 text-xs cursor-pointer shrink-0">
            <Switch checked={showIndependent} onCheckedChange={setShowIndependent} className="scale-75" />
            <Building2 className="h-3 w-3 text-[hsl(var(--hotel-independent))]" />
            <span className="font-medium text-xs">Indep.</span>
            {loadingIndep ? (
              <span className="text-[10px] text-muted-foreground animate-pulse">…</span>
            ) : (
              <Badge className="text-[10px] px-1 py-0 h-4 bg-[hsl(var(--hotel-independent))] text-background">
                {indepCounts.all}
              </Badge>
            )}
          </label>
        </div>

        <Button size="sm" className="h-8 text-xs shrink-0" onClick={handleSearch} disabled={loading}>
          {loading ? "…" : "Search"}
        </Button>
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

      {/* Map + Panel layout */}
      <div className="flex-1 relative flex min-h-0">

        {/* ── Deals Panel (left) ── */}
        <div className={cn(
          "relative flex flex-col bg-background border-r border-border shrink-0 transition-all duration-300 z-[500]",
          panelOpen ? "w-72" : "w-0 overflow-hidden"
        )}>
          {/* Panel header */}
          <div className="px-4 pt-4 pb-3 border-b border-border shrink-0">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold">Deals ({panelDeals.length})</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{geoDeals.length} géolocalisés</p>
              </div>
            </div>
            {/* Filters */}
            <div className="space-y-2">
              <Select value={filterSegment} onValueChange={setFilterSegment}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue placeholder="Segment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous segments</SelectItem>
                  {availableSegments.map(s => (
                    <SelectItem key={s} value={s}>{SEGMENT_LABELS[s] || s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStage} onValueChange={setFilterStage}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue placeholder="Stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous stages</SelectItem>
                  {availableStages.map(s => (
                    <SelectItem key={s} value={s}>{STAGE_LABELS[s] || s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterDecision} onValueChange={setFilterDecision}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue placeholder="Décision IC" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes décisions</SelectItem>
                  <SelectItem value="go">✅ GO</SelectItem>
                  <SelectItem value="go_with_conditions">🟡 Conditions</SelectItem>
                  <SelectItem value="no_go">❌ NO-GO</SelectItem>
                  <SelectItem value="none">— Sans décision</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Deal list */}
          <div className="flex-1 overflow-y-auto divide-y divide-border">
            {panelDeals.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-24 text-xs text-muted-foreground gap-1">
                <MapPin className="h-4 w-4 opacity-30" />
                Aucun deal correspondant
              </div>
            ) : (
              panelDeals.map(deal => {
                const dec = decisionMap[deal.id];
                const decKey = dec?.decision || "none";
                const style = IC_STYLES[decKey];
                const Icon = style?.icon;
                const pinColor = DECISION_PIN_COLORS[decKey] || DECISION_PIN_COLORS.none;
                const isSelected = selectedDeal?.id === deal.id;
                return (
                  <button
                    key={deal.id}
                    onClick={() => {
                      setSelectedHotel(null);
                      setSelectedDeal(deal);
                      if (deal.lat && deal.lon) {
                        setCenter([deal.lat, deal.lon]);
                        setZoom(14);
                      }
                    }}
                    className={cn(
                      "w-full text-left px-4 py-3 transition-colors hover:bg-accent",
                      isSelected && "bg-accent"
                    )}
                  >
                    <div className="flex items-start gap-2.5">
                      {/* colored dot */}
                      <span
                        className="mt-1 shrink-0 inline-block w-2.5 h-2.5 rounded-full"
                        style={{ background: pinColor.fill, border: `1.5px solid ${pinColor.stroke}` }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate leading-snug">{deal.name}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                          {deal.city}{deal.state ? `, ${deal.state}` : ""}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {dec ? (
                            <span className={cn("text-[9px] font-semibold flex items-center gap-0.5", style?.color)}>
                              {Icon && <Icon className="h-2.5 w-2.5" />}
                              {style?.label}
                            </span>
                          ) : (
                            <span className="text-[9px] text-muted-foreground">—</span>
                          )}
                          {dec?.ic_score != null && (
                            <span className="text-[9px] font-semibold tabular-nums">{dec.ic_score}</span>
                          )}
                          {deal.segment && (
                            <Badge variant="secondary" className="text-[8px] px-1 py-0 h-3.5 capitalize">
                              {(SEGMENT_LABELS[deal.segment] || deal.segment).split(" ")[0]}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Toggle panel button */}
        <button
          onClick={() => setPanelOpen(p => !p)}
          className="absolute top-1/2 -translate-y-1/2 z-[600] flex items-center justify-center w-5 h-12 bg-background border border-border rounded-r-lg shadow-sm hover:bg-accent transition-colors"
          style={{ left: panelOpen ? "288px" : "0px" }}
        >
          {panelOpen
            ? <ChevronLeft className="h-3 w-3 text-muted-foreground" />
            : <ChevronRight className="h-3 w-3 text-muted-foreground" />
          }
        </button>

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

              {/* Deal pins — colored by IC decision */}
              {showDeals && geoDeals.map((deal) => (
                <Marker
                  key={deal.id}
                  position={[deal.lat, deal.lon]}
                  icon={getDealIcon(deal.id)}
                  eventHandlers={{ click: () => { setSelectedHotel(null); setSelectedDeal(deal); } }}
                >
                  <Popup>
                    <div className="text-sm min-w-[150px]">
                      <p className="font-semibold">{deal.name}</p>
                      <p className="text-xs text-muted-foreground">{deal.city}, {deal.state}</p>
                      {decisionMap[deal.id] && (
                        <p className="text-xs font-semibold mt-1">
                          IC {decisionMap[deal.id].decision.replace(/_/g, " ")} · {decisionMap[deal.id].ic_score}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">Score: {deal.score_total} · {STAGE_LABELS[deal.stage]}</p>
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

              {/* Independent Hotels */}
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
        <div className="absolute bottom-4 z-[400] bg-background/95 border border-border rounded-lg p-3 shadow-lg text-xs space-y-1.5 pointer-events-none"
          style={{ left: panelOpen ? "292px" : "8px" }}>
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
