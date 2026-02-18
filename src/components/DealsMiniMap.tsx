import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Deal {
  id: string;
  name: string;
  city?: string;
  lat?: number;
  lon?: number;
  score_total?: number;
}

interface DecisionMap {
  [dealId: string]: string; // "go" | "go_with_conditions" | "no_go"
}

interface DealsMiniMapProps {
  deals: Deal[];
  decisionMap: DecisionMap;
  onDealClick?: (deal: Deal) => void;
}

const DECISION_COLORS: Record<string, { fill: string; stroke: string; label: string }> = {
  go:                 { fill: "#22c55e", stroke: "#16a34a", label: "GO" },
  go_with_conditions: { fill: "#f59e0b", stroke: "#d97706", label: "Conditions" },
  no_go:              { fill: "#ef4444", stroke: "#dc2626", label: "NO-GO" },
  none:               { fill: "#6b7280", stroke: "#4b5563", label: "—" },
};

function createPin(color: { fill: string; stroke: string }, rank: number): L.DivIcon {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="34" viewBox="0 0 28 34">
      <path d="M14 0C6.268 0 0 6.268 0 14c0 9.333 14 20 14 20s14-10.667 14-20C28 6.268 21.732 0 14 0z"
        fill="${color.fill}" stroke="${color.stroke}" stroke-width="1.5"/>
      <circle cx="14" cy="14" r="7" fill="white" opacity="0.95"/>
      <text x="14" y="18" text-anchor="middle" font-size="9" font-weight="700"
        font-family="-apple-system, system-ui, sans-serif" fill="${color.stroke}">${rank}</text>
    </svg>`;
  return L.divIcon({
    className: "",
    html: svg,
    iconSize: [28, 34],
    iconAnchor: [14, 34],
    popupAnchor: [0, -36],
  });
}

export default function DealsMiniMap({ deals, decisionMap, onDealClick }: DealsMiniMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const geoDeals = deals.filter(d => d.lat && d.lon);
    if (geoDeals.length === 0) return;

    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false,
      dragging: true,
      doubleClickZoom: false,
    });
    mapRef.current = map;

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
    }).addTo(map);

    // Subtle label layer
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
      opacity: 0.6,
    }).addTo(map);

    const bounds = L.latLngBounds([]);

    geoDeals.forEach((deal, i) => {
      const decision = decisionMap[deal.id] || "none";
      const color = DECISION_COLORS[decision] || DECISION_COLORS.none;
      const icon = createPin(color, i + 1);
      const marker = L.marker([deal.lat!, deal.lon!], { icon }).addTo(map);

      marker.bindPopup(
        `<div style="font-family:-apple-system,system-ui,sans-serif;min-width:130px">
          <div style="font-weight:600;font-size:12px;color:#111;margin-bottom:2px">${deal.name}</div>
          <div style="font-size:11px;color:#6b7280">${deal.city || ""}</div>
          <div style="margin-top:4px;display:flex;align-items:center;gap:4px">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color.fill}"></span>
            <span style="font-size:10px;font-weight:600;color:${color.stroke}">${color.label}</span>
            ${deal.score_total ? `<span style="margin-left:auto;font-size:11px;font-weight:700;color:#111">${deal.score_total}</span>` : ""}
          </div>
        </div>`,
        { closeButton: false, className: "deal-popup" }
      );

      if (onDealClick) {
        marker.on("click", () => onDealClick(deal));
      }

      bounds.extend([deal.lat!, deal.lon!]);
    });

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [deals, decisionMap]);

  const geoDeals = deals.filter(d => d.lat && d.lon);

  if (geoDeals.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
        No coordinates available
      </div>
    );
  }

  return (
    <>
      <style>{`
        .deal-popup .leaflet-popup-content-wrapper {
          border-radius: 10px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.12);
          padding: 0;
          border: 1px solid #e5e7eb;
        }
        .deal-popup .leaflet-popup-content {
          margin: 10px 12px;
        }
        .deal-popup .leaflet-popup-tip {
          background: white;
        }
      `}</style>
      <div ref={containerRef} className="w-full h-full rounded-xl overflow-hidden" />
    </>
  );
}
