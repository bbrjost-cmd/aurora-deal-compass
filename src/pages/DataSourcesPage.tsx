import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Database, Globe, Map, Droplets } from "lucide-react";

const SOURCES = [
  {
    name: "OpenStreetMap Overpass API",
    icon: Globe,
    description: "Hotels, airports, restaurants, and attractions. Queried live with 7-day cache.",
    url: "https://overpass-api.de/api/interpreter",
    badge: "Live",
  },
  {
    name: "INEGI Datos Abiertos",
    icon: Map,
    description: "State and municipality boundaries (GeoJSON). Imported via admin panel.",
    url: "https://www.inegi.org.mx/temas/mg/",
    badge: "Import",
  },
  {
    name: "datos.gob.mx",
    icon: Database,
    description: "Federal open data catalog. Reference for national datasets.",
    url: "https://datos.gob.mx/",
    badge: "Reference",
  },
  {
    name: 'CDMX CKAN — "Uso de Suelo"',
    icon: Database,
    description: "Land-use dataset for Ciudad de México. Queried via CKAN API or CSV import.",
    url: "https://datos.cdmx.gob.mx/dataset/uso-de-suelo",
    badge: "CDMX Only",
  },
  {
    name: "CONAGUA ArcGIS REST",
    icon: Droplets,
    description: "Water infrastructure context layer. Optional ArcGIS REST queries.",
    url: "https://sigagis.conagua.gob.mx/arcgis/rest/services",
    badge: "Optional",
  },
];

export default function DataSourcesPage() {
  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Data Sources</h1>
        <p className="text-sm text-muted-foreground">All data sources are free and open. No paid APIs required.</p>
      </div>

      <div className="space-y-3">
        {SOURCES.map((source) => (
          <Card key={source.name}>
            <CardContent className="p-4 flex items-start gap-4">
              <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                <source.icon className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-medium">{source.name}</h3>
                  <Badge variant="secondary" className="text-[10px]">{source.badge}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{source.description}</p>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-foreground underline inline-flex items-center gap-1 mt-1"
                >
                  {source.url} <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
