import { useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Upload, FileJson, Database } from "lucide-react";

export default function AdminPage() {
  const { orgId } = useAuth();

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <p className="text-sm text-muted-foreground">Data imports and configuration</p>
      </div>

      <INEGIBoundaryImport orgId={orgId} />
      <CDMXLandUse />
    </div>
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
                <p className="font-medium text-green-700">✓ Datastore active</p>
                <p className="text-xs text-muted-foreground">Resource ID: {resourceInfo.id}</p>
              </>
            ) : (
              <>
                <p className="font-medium text-orange-700">⚠ Datastore not available</p>
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
