import { useEffect, useState, useCallback, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { queryOverpass, OverpassResult, OverpassLayer } from "@/lib/overpass";
import { MEXICO_CENTER } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Plus, Hotel, Plane, MapPin } from "lucide-react";
import { DealCreateDialog } from "@/components/DealCreateDialog";

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

export default function MapPage() {
  const { orgId } = useAuth();
  const [deals, setDeals] = useState<any[]>([]);
  const [hotels, setHotels] = useState<OverpassResult[]>([]);
  const [airports, setAirports] = useState<OverpassResult[]>([]);
  const [showHotels, setShowHotels] = useState(true);
  const [showAirports, setShowAirports] = useState(true);
  const [radius, setRadius] = useState(5000);
  const [center, setCenter] = useState<[number, number]>([MEXICO_CENTER.lat, MEXICO_CENTER.lon]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createLatLon, setCreateLatLon] = useState<{ lat: number; lon: number } | null>(null);
  const debounceRef = useRef<number>();

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
    } catch {
      toast({ title: "Overpass error", description: "Could not fetch map data. Try again later.", variant: "destructive" });
    }
    setLoading(false);
  }, [showHotels, showAirports]);

  const handleSearch = () => {
    loadOverpass(center[0], center[1], radius);
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
    <div className="h-full flex flex-col">
      {/* Controls */}
      <div className="p-3 border-b border-border flex flex-wrap items-center gap-3 bg-background shrink-0">
        <Select value={radius.toString()} onValueChange={(v) => setRadius(Number(v))}>
          <SelectTrigger className="w-28 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1000">1 km</SelectItem>
            <SelectItem value="3000">3 km</SelectItem>
            <SelectItem value="5000">5 km</SelectItem>
            <SelectItem value="10000">10 km</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2 text-xs">
          <Hotel className="h-3.5 w-3.5" />
          <Switch checked={showHotels} onCheckedChange={setShowHotels} />
        </div>
        <div className="flex items-center gap-2 text-xs">
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
      <div className="flex-1 relative">
        <MapContainer
          center={center}
          zoom={6}
          className="h-full w-full"
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
          />
          <MapClickHandler onMapClick={handleMapClick} />

          {/* Deal pins */}
          {deals.filter(d => d.lat && d.lon).map((deal) => (
            <Marker key={deal.id} position={[deal.lat, deal.lon]} icon={dealIcon}>
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold">{deal.name}</p>
                  <p className="text-xs text-muted-foreground">{deal.city}, {deal.state}</p>
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

      <DealCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleDealCreated}
        defaultLat={createLatLon?.lat}
        defaultLon={createLatLon?.lon}
      />
    </div>
  );
}
