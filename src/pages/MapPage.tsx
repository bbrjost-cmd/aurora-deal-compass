import { useEffect, useState, useCallback, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { queryOverpass, OverpassResult, OverpassLayer } from "@/lib/overpass";
import { MEXICO_CENTER } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Hotel, Plane, MapPin } from "lucide-react";
import { DealCreateDialog } from "@/components/DealCreateDialog";
import { DealDetailDrawer } from "@/components/DealDetailDrawer";

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

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lon: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function FlyToHandler({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.5 });
  }, [center, zoom, map]);
  return null;
}

function InvalidateSizeHandler() {
  const map = useMap();
  useEffect(() => {
    // Leaflet needs invalidateSize after the container is fully rendered
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 100);
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    const container = map.getContainer();
    if (container.parentElement) {
      resizeObserver.observe(container.parentElement);
    }
    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
    };
  }, [map]);
  return null;
}

export default function MapPage() {
  const { orgId } = useAuth();
  const [deals, setDeals] = useState<any[]>([]);
  const [hotels, setHotels] = useState<OverpassResult[]>([]);
  const [airports, setAirports] = useState<OverpassResult[]>([]);
  const [showHotels, setShowHotels] = useState(true);
  const [showAirports, setShowAirports] = useState(true);
  const [radius, setRadius] = useState(5000);
  const [center, setCenter] = useState<[number, number]>([MEXICO_CENTER.lat, MEXICO_CENTER.lon]);
  const [zoom, setZoom] = useState(6);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createLatLon, setCreateLatLon] = useState<{ lat: number; lon: number } | null>(null);
  const [selectedDeal, setSelectedDeal] = useState<any>(null);

  useEffect(() => {
    if (!orgId) return;
    supabase.from("deals").select("*").eq("org_id", orgId).then(({ data }) => {
      setDeals(data || []);
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
        toast({ title: "Using cached data", description: "Live data unavailable. Showing older results.", variant: "destructive" });
      }
      if (hotelsRes.fromCache && !hotelsRes.stale) {
        toast({ title: "Loaded from cache", description: `${hotelsRes.results.length} hotels, ${airportsRes.results.length} airports` });
      }
    } catch {
      toast({ title: "Overpass error", description: "Could not fetch map data. Try again later.", variant: "destructive" });
    }
    setLoading(false);
  }, [showHotels, showAirports]);

  const handleSearch = () => {
    loadOverpass(center[0], center[1], radius);
  };

  const handleDestination = (idx: string) => {
    const dest = DESTINATIONS[parseInt(idx)];
    if (dest) {
      setCenter([dest.lat, dest.lon]);
      setZoom(dest.zoom);
    }
  };

  const handleMapClick = (lat: number, lon: number) => {
    setCreateLatLon({ lat, lon });
    setCreateOpen(true);
  };

  const handleDealCreated = () => {
    setCreateOpen(false);
    if (orgId) {
      supabase.from("deals").select("*").eq("org_id", orgId).then(({ data }) => setDeals(data || []));
    }
  };

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 3.5rem)" }}>
      {/* Controls */}
      <div className="p-3 border-b border-border flex flex-wrap items-center gap-3 bg-background shrink-0">
        <Select onValueChange={handleDestination}>
          <SelectTrigger className="w-44 h-8 text-xs">
            <SelectValue placeholder="Go to destination..." />
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

        <div className="flex items-center gap-1.5 text-xs">
          <Hotel className="h-3.5 w-3.5" />
          <Switch checked={showHotels} onCheckedChange={setShowHotels} />
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <Plane className="h-3.5 w-3.5" />
          <Switch checked={showAirports} onCheckedChange={setShowAirports} />
        </div>

        <Button size="sm" className="h-8 text-xs" onClick={handleSearch} disabled={loading}>
          {loading ? "Loading..." : "Search Area"}
        </Button>

        <span className="text-xs text-muted-foreground ml-auto">
          Click map to add deal • {hotels.length} hotels • {airports.length} airports
        </span>
      </div>

      {/* Map */}
      <div className="flex-1 relative" style={{ minHeight: 0 }}>
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
          {deals.filter(d => d.lat && d.lon).map((deal) => (
            <Marker key={deal.id} position={[deal.lat, deal.lon]} icon={dealIcon}
              eventHandlers={{ click: () => setSelectedDeal(deal) }}
            >
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold">{deal.name}</p>
                  <p className="text-xs text-gray-500">{deal.city}, {deal.state}</p>
                  <p className="text-xs">Stage: {deal.stage} • Score: {deal.score_total}</p>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Hotels */}
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
        </MapContainer>
        </div>
      </div>

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
