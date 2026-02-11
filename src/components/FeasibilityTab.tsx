import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { DEFAULT_INPUTS, computeFeasibility, formatMXN, type FeasibilityInputs } from "@/lib/feasibility";
import { SEGMENTS, SEGMENT_LABELS, OPENING_TYPES, OPENING_TYPE_LABELS } from "@/lib/constants";

interface Props {
  dealId: string;
}

export function FeasibilityTab({ dealId }: Props) {
  const { orgId } = useAuth();
  const [inputs, setInputs] = useState<FeasibilityInputs>(DEFAULT_INPUTS);
  const [showUSD, setShowUSD] = useState(false);

  useEffect(() => {
    if (!orgId || !dealId) return;
    supabase.from("feasibility_inputs").select("inputs").eq("deal_id", dealId).maybeSingle().then(({ data }) => {
      if (data?.inputs) setInputs(data.inputs as unknown as FeasibilityInputs);
    });
  }, [dealId, orgId]);

  const outputs = computeFeasibility(inputs);

  const save = async () => {
    if (!orgId) return;
    const existing = await supabase.from("feasibility_inputs").select("id").eq("deal_id", dealId).maybeSingle();
    if (existing.data) {
      await supabase.from("feasibility_inputs").update({ inputs: inputs as any }).eq("id", existing.data.id);
    } else {
      await supabase.from("feasibility_inputs").insert({ org_id: orgId, deal_id: dealId, inputs: inputs as any });
    }
    // Save outputs
    const existingOut = await supabase.from("feasibility_outputs").select("id").eq("deal_id", dealId).maybeSingle();
    if (existingOut.data) {
      await supabase.from("feasibility_outputs").update({ outputs: outputs as any }).eq("id", existingOut.data.id);
    } else {
      await supabase.from("feasibility_outputs").insert({ org_id: orgId, deal_id: dealId, outputs: outputs as any });
    }
  };

  const fmt = (v: number) => showUSD ? `$${Math.round(v / inputs.fxRate).toLocaleString()} USD` : formatMXN(v);

  const updateInput = (key: keyof FeasibilityInputs, value: number | string) => {
    setInputs(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Inputs</p>
        <Button variant="outline" size="sm" onClick={() => setShowUSD(!showUSD)}>
          {showUSD ? "USD" : "MXN"}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <label className="text-xs text-muted-foreground">Rooms</label>
          <Input type="number" value={inputs.rooms} onChange={(e) => updateInput("rooms", parseInt(e.target.value) || 0)} className="h-8" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">ADR (MXN)</label>
          <Input type="number" value={inputs.adr} onChange={(e) => updateInput("adr", parseInt(e.target.value) || 0)} className="h-8" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Occupancy %</label>
          <Input type="number" step="0.01" value={inputs.occupancy} onChange={(e) => updateInput("occupancy", parseFloat(e.target.value) || 0)} className="h-8" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">GOP Margin %</label>
          <Input type="number" step="0.01" value={inputs.gopMargin} onChange={(e) => updateInput("gopMargin", parseFloat(e.target.value) || 0)} className="h-8" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">CAPEX/Key (MXN)</label>
          <Input type="number" value={inputs.capexPerKey} onChange={(e) => updateInput("capexPerKey", parseInt(e.target.value) || 0)} className="h-8" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">FF&E/Key (MXN)</label>
          <Input type="number" value={inputs.ffePerKey} onChange={(e) => updateInput("ffePerKey", parseInt(e.target.value) || 0)} className="h-8" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">FX Rate MXN/USD</label>
          <Input type="number" step="0.1" value={inputs.fxRate} onChange={(e) => updateInput("fxRate", parseFloat(e.target.value) || 17.5)} className="h-8" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Ramp-up Years</label>
          <Input type="number" min={1} max={3} value={inputs.rampUpYears} onChange={(e) => updateInput("rampUpYears", parseInt(e.target.value) || 2)} className="h-8" />
        </div>
      </div>

      <Button size="sm" onClick={save} className="w-full">Save & Calculate</Button>

      {/* Outputs */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">5-Year Projection</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-1">Year</th>
                  <th className="text-right py-1">Occ%</th>
                  <th className="text-right py-1">Revenue</th>
                  <th className="text-right py-1">GOP</th>
                  <th className="text-right py-1">NOI</th>
                </tr>
              </thead>
              <tbody>
                {outputs.years.map(y => (
                  <tr key={y.year} className="border-b border-border">
                    <td className="py-1">Y{y.year}</td>
                    <td className="text-right">{(y.occupancy * 100).toFixed(0)}%</td>
                    <td className="text-right">{fmt(y.totalRevenue)}</td>
                    <td className="text-right">{fmt(y.gop)}</td>
                    <td className="text-right">{fmt(y.noi)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-muted-foreground">Total CAPEX</p>
              <p className="font-medium">{fmt(outputs.totalCapex)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Simple Payback</p>
              <p className="font-medium">{outputs.simplePayback} years</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
