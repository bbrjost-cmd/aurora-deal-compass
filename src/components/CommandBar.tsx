import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard, Map, Kanban, Calculator, Database, Settings,
  Building2, Search, FileText, Plus, BarChart3,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { STAGE_LABELS } from "@/lib/constants";

interface CommandBarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandBar({ open, onOpenChange }: CommandBarProps) {
  const navigate = useNavigate();
  const { orgId } = useAuth();
  const [deals, setDeals] = useState<any[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!orgId || !open) return;
    supabase.from("deals").select("id, name, city, state, stage, score_total")
      .eq("org_id", orgId)
      .order("updated_at", { ascending: false })
      .limit(50)
      .then(({ data }) => setDeals(data || []));
  }, [orgId, open]);

  const filteredDeals = query.length > 0
    ? deals.filter(d =>
        d.name.toLowerCase().includes(query.toLowerCase()) ||
        (d.city || "").toLowerCase().includes(query.toLowerCase()) ||
        (d.state || "").toLowerCase().includes(query.toLowerCase())
      )
    : deals.slice(0, 6);

  const run = useCallback((fn: () => void) => {
    fn();
    onOpenChange(false);
    setQuery("");
  }, [onOpenChange]);

  const NAV_ACTIONS = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/" },
    { label: "Map View", icon: Map, path: "/map" },
    { label: "Pipeline (Kanban)", icon: Kanban, path: "/pipeline" },
    { label: "Feasibility", icon: Calculator, path: "/feasibility" },
    { label: "IC Decision Center", icon: BarChart3, path: "/ic" },
    { label: "Data Sources", icon: Database, path: "/data-sources" },
    { label: "Admin Settings", icon: Settings, path: "/admin" },
  ];

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Rechercher deals, pages, actions..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          <div className="flex flex-col items-center gap-2 py-4">
            <Search className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm">Aucun résultat pour « {query} »</p>
          </div>
        </CommandEmpty>

        {filteredDeals.length > 0 && (
          <CommandGroup heading="Deals">
            {filteredDeals.map((deal) => (
              <CommandItem
                key={deal.id}
                value={`deal-${deal.id}`}
                onSelect={() => run(() => navigate(`/pipeline?deal=${deal.id}`))}
                className="gap-3"
              >
                <div className="h-7 w-7 rounded-md bg-secondary flex items-center justify-center shrink-0">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{deal.name}</p>
                  <p className="text-xs text-muted-foreground">{deal.city}, {deal.state} · {STAGE_LABELS[deal.stage] || deal.stage}</p>
                </div>
                {deal.score_total > 0 && (
                  <span className="text-xs text-muted-foreground font-mono">{deal.score_total}pts</span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandSeparator />

        <CommandGroup heading="Navigation">
          {NAV_ACTIONS.map((item) => (
            <CommandItem
              key={item.path}
              value={`nav-${item.label}`}
              onSelect={() => run(() => navigate(item.path))}
              className="gap-3"
            >
              <item.icon className="h-4 w-4 text-muted-foreground" />
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Actions rapides">
          <CommandItem
            value="action-new-deal"
            onSelect={() => run(() => navigate("/pipeline"))}
            className="gap-3"
          >
            <Plus className="h-4 w-4 text-muted-foreground" />
            <span>Nouveau deal</span>
          </CommandItem>
          <CommandItem
            value="action-export-pdf"
            onSelect={() => run(() => navigate("/feasibility"))}
            className="gap-3"
          >
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span>Exporter mémo PDF</span>
          </CommandItem>
          <CommandItem
            value="action-ic-compare"
            onSelect={() => run(() => navigate("/ic"))}
            className="gap-3"
          >
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <span>Comparer deals IC</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
