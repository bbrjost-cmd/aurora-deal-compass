import { useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { Upload, FileJson, Database, Building2, Plus, Trash2, Users, Search, X } from "lucide-react";
import { DESTINATION_BRANDS } from "@/lib/accor-brands";

// Demo owner library for PMS&E development pipeline
const DEMO_OWNERS: OwnerEntity[] = [
  { id: 'demo-0', company: 'Grupo Husa / Camino Real', knownAssets: ['Camino Real Polanco', 'Camino Real Aeropuerto'], city: 'Ciudad de México', state: 'Ciudad de México', segment: 'premium', notes: 'Strong conversion candidate — Pullman/Swissôtel repositioning. Existing management infrastructure.', destination: 'Mexico City' },
  { id: 'demo-1', company: 'Hoteles Misión', knownAssets: ['Misión Monterrey', 'Misión Guadalajara'], city: 'Monterrey', state: 'Nuevo León', segment: 'midscale', notes: 'National chain, 40+ hotels. ibis/Mercure franchise conversion priority. High-volume target.', destination: 'Monterrey' },
  { id: 'demo-2', company: 'City Express (MARRIOTT-acquired)', knownAssets: ['City Express Plus CDMX', 'City Express Cancún'], city: 'Ciudad de México', state: 'Ciudad de México', segment: 'economy', notes: 'Post-acquisition rebranding opportunity. ibis Styles or greet conversion feasible.', destination: 'Mexico City' },
  { id: 'demo-3', company: 'Grupo Posadas (One2One)', knownAssets: ['One2One Guadalajara', 'One2One León'], city: 'Guadalajara', state: 'Jalisco', segment: 'midscale', notes: 'Economy/midscale brand in transition. Novotel or Mercure franchise takeover viable.', destination: 'Guadalajara' },
  { id: 'demo-4', company: 'Inversiones Hoteleras del Bajío', knownAssets: ['Hotel Galería Querétaro'], city: 'Querétaro', state: 'Querétaro', segment: 'midscale', notes: 'Independent hotel, Mercure conversion candidate. Business demand corridor.', destination: 'Querétaro' },
  { id: 'demo-5', company: 'Real Turismo (Fiesta Inn)', knownAssets: ['Fiesta Inn Monterrey', 'Fiesta Inn Puebla'], city: 'Monterrey', state: 'Nuevo León', segment: 'midscale', notes: 'Business midscale segment. Novotel or Mercure rebranding opportunity.', destination: 'Monterrey' },
];

interface OwnerEntity {
  id: string;
  company: string;
  knownAssets: string[];
  city: string;
  state: string;
  segment: string;
  notes: string;
  destination?: string;
  brands?: string[];
}

export default function AdminPage() {
  const { orgId } = useAuth();

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <p className="text-sm text-muted-foreground">Data imports, configuration, and owner intelligence</p>
      </div>

      <OwnerIntelligencePanel />
      <INEGIBoundaryImport orgId={orgId} />
      <CDMXLandUse />
    </div>
  );
}

function OwnerIntelligencePanel() {
  const [owners, setOwners] = useState<OwnerEntity[]>(DEMO_OWNERS);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newCompany, setNewCompany] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newNotes, setNewNotes] = useState("");

  const filtered = owners.filter(o =>
    search === "" ||
    o.company.toLowerCase().includes(search.toLowerCase()) ||
    o.city.toLowerCase().includes(search.toLowerCase()) ||
    o.knownAssets.some(a => a.toLowerCase().includes(search.toLowerCase()))
  );

  const addOwner = () => {
    if (!newCompany) return;
    setOwners(prev => [...prev, {
      id: `user-${Date.now()}`,
      company: newCompany,
      knownAssets: [],
      city: newCity,
      state: "",
      segment: "luxury",
      notes: newNotes,
    }]);
    setNewCompany(""); setNewCity(""); setNewNotes("");
    setShowAdd(false);
    toast({ title: "Owner added", description: newCompany });
  };

  const removeOwner = (id: string) => {
    setOwners(prev => prev.filter(o => o.id !== id));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4" /> Owner Intelligence Library
        </CardTitle>
        <CardDescription>
          Target owner entities for Accor luxury/lifestyle conversion pipeline. Demo data pre-loaded from internal prospect list.
          <span className="block mt-1 text-xs text-muted-foreground/70 italic">
            ⚠ Demo data only — replace with proprietary research. Do not share externally.
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search + Add */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search owners, assets, cities…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2.5 top-2">
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
          <Button size="sm" variant="outline" className="h-8" onClick={() => setShowAdd(!showAdd)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Owner
          </Button>
        </div>

        {/* Add form */}
        {showAdd && (
          <div className="border border-border rounded-lg p-3 space-y-2 bg-muted/30">
            <p className="text-xs font-medium">New Owner Entity</p>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Company / Owner name *" value={newCompany} onChange={e => setNewCompany(e.target.value)} className="h-8 text-xs col-span-2" />
              <Input placeholder="City" value={newCity} onChange={e => setNewCity(e.target.value)} className="h-8 text-xs" />
              <Input placeholder="Notes / approach angle" value={newNotes} onChange={e => setNewNotes(e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={addOwner} disabled={!newCompany} className="h-7 text-xs">Save</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)} className="h-7 text-xs">Cancel</Button>
            </div>
          </div>
        )}

        {/* Owner list */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          <p className="text-xs text-muted-foreground">{filtered.length} owner{filtered.length !== 1 ? "s" : ""}</p>
          {filtered.map(owner => (
            <div key={owner.id} className="border border-border rounded-lg p-3 hover:bg-muted/30 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium truncate">{owner.company}</p>
                    {owner.destination && (
                      <Badge variant="secondary" className="text-xs">{owner.destination}</Badge>
                    )}
                    {owner.segment && (
                      <Badge variant="outline" className="text-xs capitalize">{owner.segment}</Badge>
                    )}
                  </div>
                  {owner.city && (
                    <p className="text-xs text-muted-foreground mt-0.5">{owner.city}{owner.state ? `, ${owner.state}` : ""}</p>
                  )}
                  {owner.knownAssets.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Assets: {owner.knownAssets.slice(0, 2).join(", ")}{owner.knownAssets.length > 2 ? ` +${owner.knownAssets.length - 2}` : ""}
                    </p>
                  )}
                  {owner.brands && owner.brands.length > 0 && (
                    <div className="flex gap-1 flex-wrap mt-1">
                      {owner.brands.slice(0, 3).map(b => (
                        <Badge key={b} className="text-[10px] px-1 py-0 bg-aurora-gold text-aurora-gold-foreground">{b}</Badge>
                      ))}
                    </div>
                  )}
                  {owner.notes && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{owner.notes}</p>
                  )}
                </div>
                {!owner.id.startsWith("demo-") && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeOwner(owner.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground italic border-t border-border pt-3">
          Owner matching: when clicking a hotel on the map → Intelligence Drawer → select owner group from this library to link an approach.
        </p>
      </CardContent>
    </Card>
  );
}

function INEGIBoundaryImport({ orgId }: { orgId: string | null }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !orgId) return;
    setLoading(true);

    try {
      const text = await file.text();
      const geojson = JSON.parse(text);
      const name = file.name.replace(".geojson", "").replace(".json", "");
      await supabase.from("geo_boundaries").insert({
        org_id: orgId,
        type: "state",
        name,
        geojson: geojson as any,
      });
      toast({ title: "Boundary imported", description: `${name} uploaded successfully.` });
    } catch {
      toast({ title: "Error", description: "Invalid GeoJSON file.", variant: "destructive" });
    }
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileJson className="h-4 w-4" /> INEGI Boundary Import
        </CardTitle>
        <CardDescription>Upload GeoJSON files for state/municipality boundaries</CardDescription>
      </CardHeader>
      <CardContent>
        <input type="file" accept=".geojson,.json" ref={fileRef} className="hidden" onChange={handleUpload} />
        <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={loading || !orgId}>
          <Upload className="h-4 w-4 mr-2" /> {loading ? "Uploading..." : "Upload GeoJSON"}
        </Button>
      </CardContent>
    </Card>
  );
}

function CDMXLandUse() {
  const [loading, setLoading] = useState(false);
  const [resourceInfo, setResourceInfo] = useState<any>(null);

  const checkCKAN = async () => {
    setLoading(true);
    try {
      const res = await fetch("https://datos.cdmx.gob.mx/api/3/action/package_show?id=uso-de-suelo");
      const data = await res.json();
      if (data.success && data.result?.resources) {
        const activeResource = data.result.resources.find((r: any) => r.datastore_active);
        if (activeResource) {
          setResourceInfo({ ...activeResource, datastoreActive: true });
          toast({ title: "Datastore available", description: `Resource ID: ${activeResource.id}` });
        } else {
          setResourceInfo({ datastoreActive: false, resources: data.result.resources });
          toast({ title: "Datastore not active", description: "Download CSV from the resource URL and import manually.", variant: "destructive" });
        }
      }
    } catch {
      toast({ title: "CKAN error", description: "Could not reach CDMX CKAN API.", variant: "destructive" });
    }
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Database className="h-4 w-4" /> CDMX Land Use (CKAN)
        </CardTitle>
        <CardDescription>Check availability of "Uso de Suelo" dataset</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button variant="outline" onClick={checkCKAN} disabled={loading}>
          {loading ? "Checking..." : "Check CKAN API"}
        </Button>

        {resourceInfo && (
          <div className="text-sm space-y-1 p-3 bg-secondary rounded-lg">
            {resourceInfo.datastoreActive ? (
              <>
                <p className="font-medium text-success">✓ Datastore active</p>
                <p className="text-xs text-muted-foreground">Resource ID: {resourceInfo.id}</p>
              </>
            ) : (
              <>
                <p className="font-medium text-warning">⚠ Datastore not available</p>
                <p className="text-xs text-muted-foreground">Download CSV from resource URLs and import manually.</p>
                {resourceInfo.resources?.slice(0, 3).map((r: any) => (
                  <a key={r.id} href={r.url} target="_blank" rel="noopener" className="text-xs underline block">
                    {r.name || r.format || "Resource"}
                  </a>
                ))}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
