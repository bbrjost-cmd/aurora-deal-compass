import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ClassifiedHotel, KNOWN_CHAINS } from "@/lib/hotel-classifier";
import { distanceBetween } from "@/lib/overpass";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import {
  X, Copy, Globe, Phone, Star, BedDouble, Building2,
  MapPin, Wifi, ChevronDown, ChevronRight, Zap, User,
  Linkedin, Mail, ArrowRight, CheckCircle2, AlertTriangle,
  ShieldQuestion
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ACCOR_BRANDS } from "@/lib/accor-brands";

interface Props {
  hotel: ClassifiedHotel | null;
  nearbyHotels: ClassifiedHotel[];
  cityCenter: { lat: number; lon: number } | null;
  onClose: () => void;
  onDealCreated: (deal: any) => void;
}

const CLASSIFICATION_CONFIG = {
  likely_independent: {
    label: "Likely Independent",
    icon: CheckCircle2,
    color: "text-[hsl(var(--success))]",
    bg: "bg-[hsl(var(--success-muted))] border-[hsl(var(--success))]",
  },
  likely_chain: {
    label: "Likely Chain",
    icon: Building2,
    color: "text-[hsl(var(--hotel-chain))]",
    bg: "bg-secondary border-border",
  },
  unknown: {
    label: "Unknown",
    icon: ShieldQuestion,
    color: "text-[hsl(var(--warning))]",
    bg: "bg-[hsl(var(--warning-muted))] border-[hsl(var(--warning))]",
  },
};

const TOURISM_LABELS: Record<string, string> = {
  hotel: "Hotel",
  motel: "Motel",
  guest_house: "Guest House",
  other: "Accommodation",
};

const OWNER_GROUPS = [
  "Family Office / HNWI",
  "Local Developer",
  "Real Estate Fund",
  "Hospitality Group",
  "Mixed-Use Developer",
  "Institutional Investor",
  "Unknown",
];

export function HotelIntelligenceDrawer({ hotel, nearbyHotels, cityCenter, onClose, onDealCreated }: Props) {
  const { orgId } = useAuth();
  const [tagsOpen, setTagsOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [ownerGroup, setOwnerGroup] = useState("");
  const [contactName, setContactName] = useState("");
  const [outreachRoute, setOutreachRoute] = useState("");
  const [showApproachScript, setShowApproachScript] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<string>(ACCOR_BRANDS[5]);

  if (!hotel) return null;

  const cfg = CLASSIFICATION_CONFIG[hotel.classification];
  const Icon = cfg.icon;

  // Nearby competitors within 3km
  const nearbyCount = nearbyHotels.filter(h =>
    h.id !== hotel.id &&
    distanceBetween(hotel.lat, hotel.lon, h.lat, h.lon) <= 3
  ).length;

  const distToCity = cityCenter
    ? distanceBetween(hotel.lat, hotel.lon, cityCenter.lat, cityCenter.lon)
    : null;

  const copyCoords = () => {
    navigator.clipboard.writeText(`${hotel.lat.toFixed(6)}, ${hotel.lon.toFixed(6)}`);
    toast({ title: "Copied", description: "Coordinates copied to clipboard" });
  };

  const handleCreateDeal = async () => {
    if (!orgId) return;
    setCreating(true);
    try {
      const dealName = hotel.name !== "Unknown" ? hotel.name : `Hotel OSM #${hotel.id}`;
      const { data, error } = await supabase.from("deals").insert({
        org_id: orgId,
        name: dealName,
        lat: hotel.lat,
        lon: hotel.lon,
        city: hotel.tags["addr:city"] || "Ciudad de México",
        state: hotel.tags["addr:state"] || "Ciudad de México",
        address: hotel.address || null,
        segment: "upper_upscale",
        opening_type: "conversion",
        stage: "lead",
        score_breakdown: {
          source: "overpass_independent_hotels",
          osm_id: hotel.id,
          osm_type: hotel.osmType,
          tags_snapshot: hotel.tags,
          fetched_at: new Date().toISOString(),
          classification: hotel.classification,
          independence_score: hotel.independenceScore,
        } as any,
      }).select().single();

      if (error) throw error;
      toast({ title: "Deal created!", description: `${dealName} added to pipeline.` });
      onDealCreated(data);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setCreating(false);
  };

  const approachScript = showApproachScript ? [
    `Value angle: Repositioning to ${selectedBrand} would unlock ADR premium of 25–40% and global distribution (ALL network). Branded Residences economics add significant upside.`,
    `Ask: Request a 15-min intro call + confidential NDA to share preliminary feasibility study.`,
    `Why Accor (${selectedBrand}): Strongest luxury/lifestyle pipeline in Mexico; no competing brand in this micro-market; full revenue stack (F&B, Spa, Residences) integrated from day one.`,
    `Next step: Propose 2 specific dates, offer to present at owner's offices or virtually. Request current occupancy + ADR data for sharper underwriting.`,
  ] : [];

  const knownOwnerTags = [
    hotel.tags.operator,
    hotel.tags.brand,
    hotel.tags["contact:email"],
    hotel.tags["contact:phone"],
    hotel.tags["contact:website"],
  ].filter(Boolean);

  return (
    <div className="fixed right-0 top-0 h-full w-[420px] z-[500] flex flex-col bg-background border-l border-border shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-border shrink-0">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className={cn("text-xs border", cfg.bg, cfg.color)}>
              <Icon className="h-3 w-3 mr-1" />
              {cfg.label}
            </Badge>
            <span className={cn("text-xs font-medium", cfg.color)}>
              {hotel.independenceScore}/100
            </span>
          </div>
          <h2 className="text-base font-semibold leading-tight truncate">{hotel.name}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {TOURISM_LABELS[hotel.tourismType]} · OSM {hotel.osmType} #{hotel.id}
          </p>
        </div>
        <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* A) Identity */}
        <div className="p-4 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Identity</h3>

          <div className="grid grid-cols-2 gap-2 text-sm">
            {hotel.stars !== undefined && (
              <div className="flex items-center gap-1.5">
                <Star className="h-3.5 w-3.5 text-[hsl(var(--aurora-gold))]" />
                <span>{hotel.stars} stars</span>
              </div>
            )}
            {hotel.rooms !== undefined && (
              <div className="flex items-center gap-1.5">
                <BedDouble className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{hotel.rooms} rooms</span>
              </div>
            )}
            {hotel.hasWebsite && (
              <div className="flex items-center gap-1.5 col-span-2">
                <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                <a
                  href={hotel.tags.website?.startsWith("http") ? hotel.tags.website : `https://${hotel.tags.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary underline truncate"
                >
                  {hotel.tags.website || hotel.tags["contact:website"]}
                </a>
              </div>
            )}
            {hotel.hasPhone && (
              <div className="flex items-center gap-1.5 col-span-2">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                <a href={`tel:${hotel.tags.phone || hotel.tags["contact:phone"]}`} className="text-xs text-primary underline">
                  {hotel.tags.phone || hotel.tags["contact:phone"]}
                </a>
              </div>
            )}
            {hotel.address && (
              <div className="flex items-start gap-1.5 col-span-2">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                <span className="text-xs">{hotel.address}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 col-span-2">
              <span className="text-xs text-muted-foreground font-mono">
                {hotel.lat.toFixed(6)}, {hotel.lon.toFixed(6)}
              </span>
              <button onClick={copyCoords} className="ml-1 hover:text-primary">
                <Copy className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>

        <Separator />

        {/* B) Commercial Context */}
        <div className="p-4 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Commercial Context</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="text-lg font-bold">{nearbyCount}</div>
              <div className="text-xs text-muted-foreground">Competitors &lt;3km</div>
            </div>
            {distToCity !== null && (
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <div className="text-lg font-bold">{distToCity.toFixed(1)} km</div>
                <div className="text-xs text-muted-foreground">From city center</div>
              </div>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            Competitor density:{" "}
            <span className={cn("font-medium", nearbyCount >= 5 ? "text-destructive" : nearbyCount >= 3 ? "text-[hsl(var(--warning))]" : "text-[hsl(var(--success))]")}>
              {nearbyCount >= 5 ? "High" : nearbyCount >= 3 ? "Medium" : "Low"}
            </span>
          </div>
        </div>

        <Separator />

        {/* C) Owner / Approach */}
        <div className="p-4 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Owner Intelligence</h3>

          {knownOwnerTags.length > 0 ? (
            <div className="space-y-1">
              {hotel.tags.operator && (
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-medium">{hotel.tags.operator}</span>
                  <Badge variant="secondary" className="text-xs">Operator</Badge>
                </div>
              )}
              {hotel.tags.brand && (
                <div className="flex items-center gap-2 text-sm">
                  <Wifi className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{hotel.tags.brand}</span>
                  <Badge variant="outline" className="text-xs">Brand</Badge>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-[hsl(var(--warning-muted))] border border-[hsl(var(--warning))] rounded-lg p-3">
                <AlertTriangle className="h-3.5 w-3.5 text-[hsl(var(--warning))] shrink-0" />
                <span>Owner unknown — research needed</span>
              </div>

              {/* Mini workflow */}
              <div className="space-y-2">
                <select
                  value={ownerGroup}
                  onChange={e => setOwnerGroup(e.target.value)}
                  className="w-full text-xs border border-border rounded-md px-2 py-1.5 bg-background"
                >
                  <option value="">Select owner type…</option>
                  {OWNER_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                <input
                  value={contactName}
                  onChange={e => setContactName(e.target.value)}
                  placeholder="Contact name / title"
                  className="w-full text-xs border border-border rounded-md px-2 py-1.5 bg-background"
                />
                <select
                  value={outreachRoute}
                  onChange={e => setOutreachRoute(e.target.value)}
                  className="w-full text-xs border border-border rounded-md px-2 py-1.5 bg-background"
                >
                  <option value="">Outreach route…</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="email">Email</option>
                  <option value="intro">Warm intro</option>
                  <option value="event">Event / conference</option>
                </select>
              </div>
            </div>
          )}

          {/* Approach Script */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <select
                value={selectedBrand}
                onChange={e => setSelectedBrand(e.target.value)}
                className="flex-1 text-xs border border-border rounded-md px-2 py-1 bg-background"
              >
                {ACCOR_BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => setShowApproachScript(!showApproachScript)}
              >
                <Zap className="h-3 w-3 mr-1" />
                {showApproachScript ? "Hide" : "Script"}
              </Button>
            </div>

            {showApproachScript && (
              <div className="space-y-2">
                {approachScript.map((bullet, i) => (
                  <div key={i} className="flex gap-2 text-xs bg-muted/50 rounded-lg p-2.5">
                    <ArrowRight className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                    <span>{bullet}</span>
                  </div>
                ))}
                <div className="flex gap-2 text-xs mt-2">
                  <Button size="sm" variant="ghost" className="h-6 text-xs gap-1">
                    <Linkedin className="h-3 w-3" /> LinkedIn
                  </Button>
                  <Button size="sm" variant="ghost" className="h-6 text-xs gap-1">
                    <Mail className="h-3 w-3" /> Email
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* D) OSM Metadata / Raw Tags */}
        <div className="p-4">
          <button
            onClick={() => setTagsOpen(!tagsOpen)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground w-full"
          >
            {tagsOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            Raw OSM Tags ({Object.keys(hotel.tags).length})
          </button>
          {tagsOpen && (
            <div className="mt-2 max-h-40 overflow-y-auto space-y-0.5">
              {Object.entries(hotel.tags).map(([k, v]) => (
                <div key={k} className="flex gap-2 text-xs py-0.5">
                  <span className="text-muted-foreground font-mono w-32 shrink-0 truncate">{k}</span>
                  <span className="truncate">{v}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer CTA */}
      <div className="p-4 border-t border-border bg-background shrink-0">
        <Button
          className="w-full gap-2"
          onClick={handleCreateDeal}
          disabled={creating}
        >
          {creating ? (
            "Creating deal…"
          ) : (
            <>
              <Zap className="h-4 w-4" />
              Start Feasibility → Create Deal
            </>
          )}
        </Button>
        <p className="text-xs text-muted-foreground text-center mt-2">
          Creates deal with pre-filled location + opens Feasibility tab
        </p>
      </div>
    </div>
  );
}
