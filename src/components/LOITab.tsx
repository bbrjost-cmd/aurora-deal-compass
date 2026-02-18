import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SEGMENT_LABELS, OPENING_TYPE_LABELS } from "@/lib/constants";
import { formatMXN, type FeasibilityInputs } from "@/lib/feasibility";
import { computeFeasibility, DEFAULT_INPUTS } from "@/lib/feasibility";
import { computeBrandEconomics } from "@/lib/ic-engine";
import { FileDown } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Props {
  deal: any;
  feasInputs?: FeasibilityInputs | null;
}

const LOI_ITEMS_BY_STAGE: Record<string, string[]> = {
  qualified: [
    "Confirm owner identity and legal entity",
    "Obtain preliminary site documentation",
    "Validate land use / zoning compliance",
    "Sign NDA with owner",
    "Receive preliminary project brief",
  ],
  underwriting: [
    "Complete feasibility underwriting",
    "Obtain competitive set analysis",
    "Confirm room count and program",
    "Validate CAPEX estimates with QS",
    "IC internal pre-screening",
    "Confirm Accor brand recommendation",
  ],
  loi: [
    "Draft LOI / term sheet",
    "Negotiate base fee and incentive fee",
    "Agree on key money (if applicable)",
    "Confirm opening timeline",
    "Define FF&E and OS&E responsibilities",
    "Agree technical services scope",
    "Legal review of LOI",
    "Owner countersignature",
  ],
};

export function LOITab({ deal, feasInputs }: Props) {
  const { orgId } = useAuth();
  const [checklist, setChecklist] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!deal || !orgId) return;
    supabase.from("loi_checklist").select("*").eq("deal_id", deal.id).then(({ data }) => {
      if (data && data.length > 0) {
        setChecklist(data);
      } else {
        // Auto-seed based on stage
        const allStages = ["qualified", "underwriting", "loi"];
        const items = allStages.flatMap(stage =>
          (LOI_ITEMS_BY_STAGE[stage] || []).map(item => ({
            item,
            checked: false,
            stage_requirement: stage,
          }))
        );
        setChecklist(items.map((it, i) => ({ ...it, id: `new-${i}`, deal_id: deal.id, org_id: orgId })));
      }
      setLoading(false);
    });
  }, [deal, orgId]);

  const saveChecklist = async () => {
    if (!orgId || !deal) return;
    // Delete existing and re-insert
    await supabase.from("loi_checklist").delete().eq("deal_id", deal.id);
    const toInsert = checklist.map(it => ({
      org_id: orgId,
      deal_id: deal.id,
      item: it.item,
      checked: it.checked,
      stage_requirement: it.stage_requirement,
    }));
    await supabase.from("loi_checklist").insert(toInsert);
    toast({ title: "LOI Checklist saved" });
  };

  const toggleItem = (id: string) => {
    setChecklist(prev => prev.map(it => it.id === id ? { ...it, checked: !it.checked } : it));
  };

  const inputs = feasInputs || DEFAULT_INPUTS;
  const outputs = computeFeasibility(inputs);
  const brand = computeBrandEconomics(inputs, outputs, "management", inputs.keyMoney || 0);
  const checkedCount = checklist.filter(it => it.checked).length;

  const termSheet = {
    dealName: deal?.name || "—",
    city: deal?.city || "—",
    segment: SEGMENT_LABELS[deal?.segment] || deal?.segment || "—",
    openingType: OPENING_TYPE_LABELS[deal?.opening_type] || deal?.opening_type || "—",
    rooms: `${deal?.rooms_min || "?"} – ${deal?.rooms_max || "?"}`,
    contractType: "Management Agreement",
    term: "20 years (initial) + 2 × 5-year renewal options",
    baseFee: `${(inputs.baseFee * 100).toFixed(1)}% of Total Revenue`,
    incentiveFee: `${(inputs.incentiveFee * 100).toFixed(1)}% of GOP`,
    keyMoney: inputs.keyMoney ? formatMXN(inputs.keyMoney) : "To be negotiated",
    netFeesUSD: `$${brand.netFeesUSD.toLocaleString()} USD (stabilized Y3)`,
    openingTimeline: "TBD — subject to permitting",
    operatorObligations: "Brand standards, reservations, FF&E procurement support, technical services",
    ownerObligations: "CAPEX funding, FF&E, OS&E, land and permits, operating reserves",
    capex: formatMXN(outputs.totalCapex),
    payback: `${outputs.simplePayback} years (owner proxy)`,
  };

  if (loading) return <div className="text-xs text-muted-foreground p-4">Loading...</div>;

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{checkedCount}/{checklist.length} items completed</p>
        <Badge variant={checkedCount === checklist.length ? "default" : "secondary"} className="text-xs">
          {Math.round((checkedCount / Math.max(checklist.length, 1)) * 100)}% ready
        </Badge>
      </div>

      {/* Checklist by stage */}
      {["qualified", "underwriting", "loi"].map(stage => {
        const stageItems = checklist.filter(it => it.stage_requirement === stage);
        if (stageItems.length === 0) return null;
        const stageLabels: Record<string, string> = { qualified: "Qualification", underwriting: "Underwriting", loi: "LOI Prep" };
        return (
          <div key={stage}>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">{stageLabels[stage]}</p>
            <div className="space-y-2">
              {stageItems.map(it => (
                <div key={it.id} className="flex items-start gap-2">
                  <Checkbox
                    checked={it.checked}
                    onCheckedChange={() => toggleItem(it.id)}
                    className="mt-0.5"
                  />
                  <span className={`text-xs leading-relaxed ${it.checked ? "line-through text-muted-foreground" : ""}`}>
                    {it.item}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <Button size="sm" variant="outline" className="w-full h-8 text-xs" onClick={saveChecklist}>
        Save Checklist
      </Button>

      {/* Term Sheet Summary */}
      <div className="border-t border-border pt-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">Term Sheet Summary</p>
        <div className="space-y-2 text-xs bg-secondary rounded-lg p-3">
          {Object.entries(termSheet).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-2">
              <span className="text-muted-foreground capitalize">{k.replace(/([A-Z])/g, ' $1').trim()}</span>
              <span className="font-medium text-right max-w-[55%]">{v}</span>
            </div>
          ))}
        </div>
        <Button
          size="sm"
          variant="outline"
          className="w-full h-8 text-xs mt-2 gap-1"
          onClick={() => {
            const json = JSON.stringify(termSheet, null, 2);
            const blob = new Blob([json], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url; a.download = `${deal?.name?.replace(/[^a-zA-Z0-9]/g, "_") || "deal"}_TermSheet.json`;
            a.click(); URL.revokeObjectURL(url);
          }}
        >
          <FileDown className="h-3.5 w-3.5" /> Export Term Sheet JSON
        </Button>
      </div>
    </div>
  );
}
