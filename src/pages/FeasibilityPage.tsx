import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { DEFAULT_INPUTS, computeFeasibility, formatMXN, type FeasibilityInputs } from "@/lib/feasibility";
import { SEGMENTS, SEGMENT_LABELS, OPENING_TYPES, OPENING_TYPE_LABELS } from "@/lib/constants";

export default function FeasibilityPage() {
  const [inputs, setInputs] = useState<FeasibilityInputs>(DEFAULT_INPUTS);
  const [showUSD, setShowUSD] = useState(false);
  const [showSensitivity, setShowSensitivity] = useState<string | null>(null);

  const outputs = computeFeasibility(inputs);
  const fmt = (v: number) => showUSD ? `$${Math.round(v / inputs.fxRate).toLocaleString()} USD` : formatMXN(v);

  const updateInput = (key: keyof FeasibilityInputs, value: number | string) => {
    setInputs(prev => ({ ...prev, [key]: value }));
  };

  const sensitivityYears = showSensitivity === "occ_down"
    ? outputs.sensitivities.occDown10
    : showSensitivity === "adr_down"
    ? outputs.sensitivities.adrDown10
    : showSensitivity === "fx_shock"
    ? outputs.sensitivities.fxShock
    : null;

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Feasibility Builder</h1>
        <p className="text-sm text-muted-foreground">Quick underwriting model for hotel developments</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Inputs */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Inputs</CardTitle>
              <Button variant="outline" size="sm" onClick={() => setShowUSD(!showUSD)}>
                {showUSD ? "USD" : "MXN"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Rooms</label>
                <Input type="number" value={inputs.rooms} onChange={(e) => updateInput("rooms", parseInt(e.target.value) || 0)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Segment</label>
                <Select value={inputs.segment} onValueChange={(v) => updateInput("segment", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SEGMENTS.map(s => <SelectItem key={s} value={s}>{SEGMENT_LABELS[s]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Opening Type</label>
                <Select value={inputs.openingType} onValueChange={(v) => updateInput("openingType", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {OPENING_TYPES.map(t => <SelectItem key={t} value={t}>{OPENING_TYPE_LABELS[t]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">ADR (MXN)</label>
                <Input type="number" value={inputs.adr} onChange={(e) => updateInput("adr", parseInt(e.target.value) || 0)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Occupancy</label>
                <Input type="number" step="0.01" min={0} max={1} value={inputs.occupancy} onChange={(e) => updateInput("occupancy", parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">F&B Revenue %</label>
                <Input type="number" step="0.01" value={inputs.fnbRevenuePct} onChange={(e) => updateInput("fnbRevenuePct", parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Other Revenue %</label>
                <Input type="number" step="0.01" value={inputs.otherRevenuePct} onChange={(e) => updateInput("otherRevenuePct", parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Ramp-up Years</label>
                <Input type="number" min={1} max={3} value={inputs.rampUpYears} onChange={(e) => updateInput("rampUpYears", parseInt(e.target.value) || 2)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">CAPEX/Key (MXN)</label>
                <Input type="number" value={inputs.capexPerKey} onChange={(e) => updateInput("capexPerKey", parseInt(e.target.value) || 0)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">FF&E/Key (MXN)</label>
                <Input type="number" value={inputs.ffePerKey} onChange={(e) => updateInput("ffePerKey", parseInt(e.target.value) || 0)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Base Fee %</label>
                <Input type="number" step="0.01" value={inputs.baseFee} onChange={(e) => updateInput("baseFee", parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Incentive Fee %</label>
                <Input type="number" step="0.01" value={inputs.incentiveFee} onChange={(e) => updateInput("incentiveFee", parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">GOP Margin</label>
                <Input type="number" step="0.01" value={inputs.gopMargin} onChange={(e) => updateInput("gopMargin", parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">FX Rate MXN/USD</label>
                <Input type="number" step="0.1" value={inputs.fxRate} onChange={(e) => updateInput("fxRate", parseFloat(e.target.value) || 17.5)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Outputs */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">5-Year Projection</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left py-2 font-medium">Year</th>
                      <th className="text-right py-2 font-medium">Occ%</th>
                      <th className="text-right py-2 font-medium">Rooms Rev</th>
                      <th className="text-right py-2 font-medium">Total Rev</th>
                      <th className="text-right py-2 font-medium">GOP</th>
                      <th className="text-right py-2 font-medium">Fees</th>
                      <th className="text-right py-2 font-medium">NOI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {outputs.years.map(y => (
                      <tr key={y.year} className="border-b border-border">
                        <td className="py-2 font-medium">Y{y.year}</td>
                        <td className="text-right">{(y.occupancy * 100).toFixed(0)}%</td>
                        <td className="text-right">{fmt(y.roomsRevenue)}</td>
                        <td className="text-right">{fmt(y.totalRevenue)}</td>
                        <td className="text-right">{fmt(y.gop)}</td>
                        <td className="text-right">{fmt(y.fees)}</td>
                        <td className="text-right font-medium">{fmt(y.noi)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="p-3 bg-secondary rounded-lg">
                  <p className="text-xs text-muted-foreground">Total CAPEX</p>
                  <p className="text-lg font-semibold">{fmt(outputs.totalCapex)}</p>
                </div>
                <div className="p-3 bg-secondary rounded-lg">
                  <p className="text-xs text-muted-foreground">Simple Payback</p>
                  <p className="text-lg font-semibold">{outputs.simplePayback} yrs</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sensitivities */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Sensitivity Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {[
                  { key: "occ_down", label: "Occ -10%" },
                  { key: "adr_down", label: "ADR -10%" },
                  { key: "capex_up", label: "CAPEX +15%" },
                  { key: "fx_shock", label: "FX +15%" },
                ].map(s => (
                  <Button
                    key={s.key}
                    variant={showSensitivity === s.key ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowSensitivity(showSensitivity === s.key ? null : s.key)}
                  >
                    {s.label}
                  </Button>
                ))}
              </div>

              {showSensitivity === "capex_up" && (
                <div className="p-3 bg-destructive/10 rounded-lg text-sm">
                  <p>CAPEX +15%: {fmt(outputs.sensitivities.capexUp15.totalCapex)}</p>
                  <p>Payback: {outputs.sensitivities.capexUp15.simplePayback} yrs</p>
                </div>
              )}

              {sensitivityYears && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-1">Year</th>
                        <th className="text-right py-1">Revenue</th>
                        <th className="text-right py-1">NOI</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sensitivityYears.map(y => (
                        <tr key={y.year} className="border-b border-border">
                          <td className="py-1">Y{y.year}</td>
                          <td className="text-right">{fmt(y.totalRevenue)}</td>
                          <td className="text-right">{fmt(y.noi)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
