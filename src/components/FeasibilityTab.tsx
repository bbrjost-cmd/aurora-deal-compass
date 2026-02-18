import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DEFAULT_INPUTS, computeFeasibility, formatMXN, formatMillions, type FeasibilityInputs } from "@/lib/feasibility";
import { SEGMENTS, SEGMENT_LABELS } from "@/lib/constants";
import {
  SEGMENT_PRESETS, getPresetWarnings,
  computeBrandEconomics, computeOwnerEconomics,
} from "@/lib/ic-engine";
import { computeFeasibility as cf } from "@/lib/feasibility";
import { AlertTriangle, AlertCircle, Layers, BarChart2, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface Props {
  dealId: string;
  deal?: any;
  onInputsChange?: (inputs: FeasibilityInputs) => void;
}

const OCC_AXIS = [0.50, 0.55, 0.60, 0.65, 0.70, 0.75, 0.80];

function getHeatmapTier(value: number, mode: "net_fees" | "yoc"): string {
  if (mode === "net_fees") {
    if (value >= 600000) return "bg-ic-go-muted text-ic-go border-ic-go-border";
    if (value >= 350000) return "bg-ic-conditions-muted text-ic-conditions border-ic-conditions-border";
    return "bg-ic-nogo-muted text-ic-nogo border-ic-nogo-border";
  } else {
    if (value >= 8.5) return "bg-ic-go-muted text-ic-go border-ic-go-border";
    if (value >= 6.5) return "bg-ic-conditions-muted text-ic-conditions border-ic-conditions-border";
    return "bg-ic-nogo-muted text-ic-nogo border-ic-nogo-border";
  }
}

export function FeasibilityTab({ dealId, deal, onInputsChange }: Props) {
  const { orgId } = useAuth();
  const [inputs, setInputs] = useState<FeasibilityInputs>(DEFAULT_INPUTS);
  const [showUSD, setShowUSD] = useState(false);
  const [saved, setSaved] = useState(false);
  const [heatmapMode, setHeatmapMode] = useState<"net_fees" | "yoc">("net_fees");

  useEffect(() => {
    if (!orgId || !dealId) return;
    supabase.from("feasibility_inputs").select("inputs").eq("deal_id", dealId).maybeSingle().then(({ data }) => {
      if (data?.inputs) {
        const loaded = data.inputs as unknown as FeasibilityInputs;
        setInputs(loaded);
        onInputsChange?.(loaded);
      } else if (deal?.segment) {
        // Auto-fill from segment preset
        const preset = SEGMENT_PRESETS[deal.segment];
        if (preset) {
          const auto: FeasibilityInputs = {
            ...DEFAULT_INPUTS,
            segment: deal.segment,
            adr: Math.round((preset.adrLow + preset.adrHigh) / 2),
            occupancy: (preset.occLow + preset.occHigh) / 2,
            gopMargin: (preset.gopLow + preset.gopHigh) / 2,
            fnbRevenuePct: preset.fnbCapture,
            otherRevenuePct: preset.otherRevPct,
            capexPerKey: Math.round((preset.capexPerKeyLow + preset.capexPerKeyHigh) / 2),
            ffePerKey: Math.round((preset.ffePerKeyLow + preset.ffePerKeyHigh) / 2),
            baseFee: preset.baseFeeTypical,
            incentiveFee: preset.incentiveFeeTypical,
            rooms: deal.rooms_min ? Math.round((deal.rooms_min + (deal.rooms_max || deal.rooms_min)) / 2) : 150,
          };
          setInputs(auto);
          onInputsChange?.(auto);
        }
      }
    });
  }, [dealId, orgId, deal]);

  const outputs = useMemo(() => computeFeasibility(inputs), [inputs]);
  const warnings = useMemo(() => getPresetWarnings(inputs), [inputs]);

  const brandMgmt = useMemo(() => computeBrandEconomics(inputs, outputs, "management", inputs.keyMoney || 0), [inputs, outputs]);
  const brandFran = useMemo(() => computeBrandEconomics(inputs, outputs, "franchise", inputs.keyMoney || 0), [inputs, outputs]);
  const ownerEcon = useMemo(() => computeOwnerEconomics(inputs, outputs), [inputs, outputs]);

  // Heatmap data
  const heatmapData = useMemo(() => {
    const adrs = [0.70, 0.80, 0.90, 1.00, 1.10, 1.20].map(m => Math.round(inputs.adr * m / 100) * 100);
    return OCC_AXIS.map(occ => {
      return adrs.map(adr => {
        const modIn = { ...inputs, adr, occupancy: occ };
        const out = computeFeasibility(modIn);
        const stab = out.years[2] || out.years[0];
        let value = 0;
        if (heatmapMode === "net_fees") {
          const fees = stab.totalRevenue * inputs.baseFee + stab.gop * inputs.incentiveFee;
          value = Math.round(fees * 0.82 / inputs.fxRate);
        } else {
          value = out.totalCapex > 0 ? Math.round((stab.noi / out.totalCapex) * 1000) / 10 : 0;
        }
        return { occ, adr, value };
      });
    });
  }, [inputs, heatmapMode]);

  const adrsForHeader = [0.70, 0.80, 0.90, 1.00, 1.10, 1.20].map(m => Math.round(inputs.adr * m / 100) * 100);

  const fmt = (v: number) => showUSD ? `$${Math.round(v / inputs.fxRate).toLocaleString()}` : formatMXN(v);

  const updateInput = (key: keyof FeasibilityInputs, value: number | string) => {
    setInputs(prev => {
      const updated = { ...prev, [key]: value };
      onInputsChange?.(updated);
      return updated;
    });
  };

  const applyPreset = (segment: string) => {
    const preset = SEGMENT_PRESETS[segment];
    if (!preset) return;
    const updated: FeasibilityInputs = {
      ...inputs,
      segment,
      adr: Math.round((preset.adrLow + preset.adrHigh) / 2),
      occupancy: (preset.occLow + preset.occHigh) / 2,
      gopMargin: (preset.gopLow + preset.gopHigh) / 2,
      fnbRevenuePct: preset.fnbCapture,
      otherRevenuePct: preset.otherRevPct,
      capexPerKey: Math.round((preset.capexPerKeyLow + preset.capexPerKeyHigh) / 2),
      ffePerKey: Math.round((preset.ffePerKeyLow + preset.ffePerKeyHigh) / 2),
      baseFee: preset.baseFeeTypical,
      incentiveFee: preset.incentiveFeeTypical,
    };
    setInputs(updated);
    onInputsChange?.(updated);
  };

  const save = async () => {
    if (!orgId) return;
    const existing = await supabase.from("feasibility_inputs").select("id").eq("deal_id", dealId).maybeSingle();
    if (existing.data) {
      await supabase.from("feasibility_inputs").update({ inputs: inputs as any }).eq("id", existing.data.id);
    } else {
      await supabase.from("feasibility_inputs").insert({ org_id: orgId, deal_id: dealId, inputs: inputs as any });
    }
    const existingOut = await supabase.from("feasibility_outputs").select("id").eq("deal_id", dealId).maybeSingle();
    if (existingOut.data) {
      await supabase.from("feasibility_outputs").update({ outputs: outputs as any }).eq("id", existingOut.data.id);
    } else {
      await supabase.from("feasibility_outputs").insert({ org_id: orgId, deal_id: dealId, outputs: outputs as any });
    }
    await supabase.from("audit_log").insert({
      org_id: orgId, deal_id: dealId, action: "feasibility_inputs_saved",
      diff_json: { rooms: inputs.rooms, adr: inputs.adr, occupancy: inputs.occupancy } as any,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    toast({ title: "Saved", description: "Feasibility inputs & outputs persisted." });
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="inputs">
        <TabsList className="w-full grid grid-cols-4 h-8">
          <TabsTrigger value="inputs" className="text-[11px]">Inputs</TabsTrigger>
          <TabsTrigger value="outputs" className="text-[11px]">P&L</TabsTrigger>
          <TabsTrigger value="comparator" className="text-[11px]">Compare</TabsTrigger>
          <TabsTrigger value="heatmap" className="text-[11px]">Heatmap</TabsTrigger>
        </TabsList>

        {/* ── INPUTS TAB ── */}
        <TabsContent value="inputs" className="space-y-3 mt-3">
          {/* Segment + Brand + Contract */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-muted-foreground shrink-0" />
              <Select value={inputs.segment} onValueChange={(v) => { updateInput("segment", v); applyPreset(v); }}>
                <SelectTrigger className="h-8 text-xs flex-1">
                  <SelectValue placeholder="Segment..." />
                </SelectTrigger>
                <SelectContent>
                  {SEGMENTS.map(s => <SelectItem key={s} value={s}>{SEGMENT_LABELS[s]}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="h-8 text-xs shrink-0" onClick={() => setShowUSD(!showUSD)}>
                {showUSD ? "USD" : "MXN"}
              </Button>
            </div>
            {/* Contract type toggle */}
            <div className="grid grid-cols-2 gap-1.5">
              {(['franchise', 'management'] as const).map(ct => (
                <button
                  key={ct}
                  onClick={() => updateInput("contractType" as any, ct)}
                  className={cn(
                    "h-7 text-[11px] rounded border font-medium transition-colors",
                    (inputs as any).contractType === ct
                      ? "bg-foreground text-background border-foreground"
                      : "bg-background text-muted-foreground border-border hover:border-foreground/50"
                  )}
                >
                  {ct === 'franchise' ? 'Franchise (default)' : 'Management'}
                </button>
              ))}
            </div>
          </div>

          {/* Warnings */}
          {warnings.map((w, i) => (
            <div key={i} className={cn("flex gap-2 p-2 rounded text-xs", w.level === "red" ? "bg-ic-nogo-muted text-ic-nogo" : "bg-ic-conditions-muted text-ic-conditions")}>
              {w.level === "red" ? <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" /> : <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />}
              <span><strong>{w.field}:</strong> {w.message}</span>
            </div>
          ))}

          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              { label: "Rooms", key: "rooms", type: "int" },
              { label: "ADR (MXN)", key: "adr", type: "int" },
              { label: "Occupancy (0–1)", key: "occupancy", type: "float2" },
              { label: "GOP Margin (0–1)", key: "gopMargin", type: "float2" },
              { label: "F&B Rev %", key: "fnbRevenuePct", type: "float2" },
              { label: "Other Rev %", key: "otherRevenuePct", type: "float2" },
              { label: "CAPEX/Key (MXN)", key: "capexPerKey", type: "int" },
              { label: "FF&E/Key (MXN)", key: "ffePerKey", type: "int" },
              ...((inputs as any).contractType === 'franchise' ? [
                { label: "Royalty %", key: "royaltyPct", type: "float2" },
                { label: "Marketing %", key: "marketingPct", type: "float2" },
                { label: "Distribution %", key: "distributionPct", type: "float2" },
              ] : [
                { label: "Base Fee %", key: "baseFee", type: "float2" },
                { label: "Incentive Fee %", key: "incentiveFee", type: "float2" },
              ]),
              { label: "Ramp-up Years", key: "rampUpYears", type: "int" },
              { label: "FX Rate MXN/USD", key: "fxRate", type: "float1" },
            ].map(f => (
              <div key={f.key}>
                <label className="text-[10px] text-muted-foreground">{f.label}</label>
                <Input
                  type="number"
                  step={f.type === "float2" ? "0.01" : f.type === "float1" ? "0.1" : "1"}
                  value={(inputs as any)[f.key] ?? 0}
                  onChange={(e) => {
                    const v = f.type === "int" ? parseInt(e.target.value) || 0 : parseFloat(e.target.value) || 0;
                    updateInput(f.key as keyof FeasibilityInputs, v);
                  }}
                  className="h-7 text-xs"
                />
              </div>
            ))}
          </div>

          <Button size="sm" onClick={save} className="w-full h-8 text-xs">
            {saved ? "✓ Saved" : "Save & Calculate"}
          </Button>
        </TabsContent>

        {/* ── P&L TAB ── */}
        <TabsContent value="outputs" className="space-y-3 mt-3">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left py-1.5">Yr</th>
                  <th className="text-right py-1.5">Occ%</th>
                  <th className="text-right py-1.5">RevPAR</th>
                  <th className="text-right py-1.5">Rev</th>
                  <th className="text-right py-1.5">GOP</th>
                  <th className="text-right py-1.5">Fees</th>
                  <th className="text-right py-1.5 font-bold">NOI</th>
                </tr>
              </thead>
              <tbody>
                {outputs.years.map(y => {
                  const revpar = y.roomsRevenue / (inputs.rooms * 365);
                  return (
                    <tr key={y.year} className="border-b border-border hover:bg-secondary/30">
                      <td className="py-1.5 font-medium">Y{y.year}</td>
                      <td className="text-right">{(y.occupancy * 100).toFixed(0)}%</td>
                      <td className="text-right">{Math.round(revpar).toLocaleString()}</td>
                      <td className="text-right">{showUSD ? `$${Math.round(y.totalRevenue / inputs.fxRate).toLocaleString()}` : formatMillions(y.totalRevenue)}</td>
                      <td className="text-right">{(y.gop / y.totalRevenue * 100).toFixed(0)}%</td>
                      <td className="text-right">{showUSD ? `$${Math.round(y.fees / inputs.fxRate).toLocaleString()}` : formatMillions(y.fees)}</td>
                      <td className="text-right font-bold">{showUSD ? `$${Math.round(y.noi / inputs.fxRate).toLocaleString()}` : formatMillions(y.noi)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 bg-secondary rounded-lg">
              <p className="text-[10px] text-muted-foreground">Total CAPEX</p>
              <p className="text-sm font-bold">{formatMillions(outputs.totalCapex)}</p>
            </div>
            <div className="p-2.5 bg-secondary rounded-lg">
              <p className="text-[10px] text-muted-foreground">Simple Payback</p>
              <p className="text-sm font-bold">{outputs.simplePayback} yrs</p>
            </div>
          </div>

          {/* Sensitivity table */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Sensitivity — Y3 NOI</p>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left py-1">Scenario</th>
                  <th className="text-right py-1">NOI</th>
                  <th className="text-right py-1">Δ vs Base</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "Base", noi: outputs.years[2]?.noi || 0 },
                  { label: "Occ -10%", noi: outputs.sensitivities.occDown10[2]?.noi || 0 },
                  { label: "ADR -10%", noi: outputs.sensitivities.adrDown10[2]?.noi || 0 },
                  { label: "Severe (Occ-15% + ADR-10%)", noi: outputs.sensitivities.severe[2]?.noi || 0 },
                ].map((s, i) => {
                  const base = outputs.years[2]?.noi || 1;
                  const delta = i === 0 ? 0 : ((s.noi - base) / base * 100);
                  return (
                    <tr key={s.label} className={cn("border-b border-border", i === 0 && "font-semibold")}>
                      <td className="py-1">{s.label}</td>
                      <td className="text-right">{formatMillions(s.noi)} MXN</td>
                      <td className={cn("text-right", delta < 0 ? "text-ic-nogo" : i === 0 ? "" : "text-ic-go")}>
                        {i === 0 ? "—" : `${delta.toFixed(1)}%`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ── COMPARATOR TAB ── */}
        <TabsContent value="comparator" className="space-y-3 mt-3">
          <p className="text-xs text-muted-foreground">Same inputs — Management vs Franchise contract economics (stabilized Year 3)</p>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left py-1.5">Metric</th>
                  <th className="text-right py-1.5">Management</th>
                  <th className="text-right py-1.5">Franchise</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "Gross Fees (MXN)", m: formatMXN(brandMgmt.totalGrossFees), f: formatMXN(brandFran.totalGrossFees) },
                  { label: "Support Costs", m: formatMXN(brandMgmt.supportCostsEstimate), f: formatMXN(brandFran.supportCostsEstimate) },
                  { label: "Net Fees (MXN)", m: formatMXN(brandMgmt.netFees), f: formatMXN(brandFran.netFees), bold: true },
                  { label: "Net Fees (USD)", m: `$${brandMgmt.netFeesUSD.toLocaleString()}`, f: `$${brandFran.netFeesUSD.toLocaleString()}`, bold: true },
                  { label: "Key Money ROI", m: inputs.keyMoney ? `${brandMgmt.keyMoneyROI}%` : "N/A", f: inputs.keyMoney ? `${brandFran.keyMoneyROI}%` : "N/A" },
                  { label: "Key Money Payback", m: inputs.keyMoney ? `${brandMgmt.keyMoneyPayback} yrs` : "N/A", f: inputs.keyMoney ? `${brandFran.keyMoneyPayback} yrs` : "N/A" },
                ].map(row => (
                  <tr key={row.label} className={cn("border-b border-border", row.bold && "font-semibold")}>
                    <td className="py-1.5">{row.label}</td>
                    <td className={cn("text-right py-1.5", brandMgmt.netFees >= brandFran.netFees && row.bold ? "text-ic-go" : "")}>{row.m}</td>
                    <td className={cn("text-right py-1.5", brandFran.netFees > brandMgmt.netFees && row.bold ? "text-ic-go" : "")}>{row.f}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-2 pt-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Why Management vs Franchise?</p>
            {[
              brandMgmt.netFees >= brandFran.netFees
                ? "Management generates higher net fees for Accor due to operational control and incentive fee upside."
                : "Franchise generates competitive net income with lower support costs and complexity.",
              "Management provides full brand standard enforcement, critical for Luxury/Upper-Upscale positioning.",
              "Franchise offers owner more operational flexibility and typically faster deal closure.",
            ].map((b, i) => (
              <div key={i} className="flex gap-2 text-xs">
                <span className="text-aurora-gold shrink-0">•</span>
                <span>{b}</span>
              </div>
            ))}
          </div>

          <Badge
            className={cn("text-xs w-full justify-center py-2",
              brandMgmt.netFees >= brandFran.netFees ? "bg-ic-go text-ic-go-foreground" : "bg-primary text-primary-foreground"
            )}
          >
            Recommended: {brandMgmt.netFees >= brandFran.netFees ? "Management" : "Franchise"} Contract
          </Badge>
        </TabsContent>

        {/* ── HEATMAP TAB ── */}
        <TabsContent value="heatmap" className="space-y-3 mt-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">ADR × Occupancy sensitivity</p>
            <div className="flex items-center gap-2 text-xs">
              <span className={heatmapMode === "net_fees" ? "font-semibold" : "text-muted-foreground"}>Net Fees</span>
              <Switch checked={heatmapMode === "yoc"} onCheckedChange={v => setHeatmapMode(v ? "yoc" : "net_fees")} />
              <span className={heatmapMode === "yoc" ? "font-semibold" : "text-muted-foreground"}>YoC %</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="text-[9px] w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left p-1 text-muted-foreground">Occ\ADR</th>
                  {adrsForHeader.map(a => (
                    <th key={a} className="p-1 text-center text-muted-foreground font-medium">
                      {(a / 1000).toFixed(1)}k
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatmapData.map((row, ri) => (
                  <tr key={OCC_AXIS[ri]}>
                    <td className="p-1 font-medium text-muted-foreground">{(OCC_AXIS[ri] * 100).toFixed(0)}%</td>
                    {row.map((cell, ci) => {
                      const tier = getHeatmapTier(cell.value, heatmapMode);
                      return (
                        <td key={ci} className={cn("p-1 text-center rounded border font-semibold", tier)}>
                          {heatmapMode === "net_fees"
                            ? cell.value >= 1000 ? `${(cell.value / 1000).toFixed(0)}k` : cell.value
                            : `${cell.value}%`}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-3 text-[10px] flex-wrap">
            <div className="flex items-center gap-1"><div className="h-3 w-3 rounded bg-ic-go-muted border border-ic-go-border" /><span>Strong</span></div>
            <div className="flex items-center gap-1"><div className="h-3 w-3 rounded bg-ic-conditions-muted border border-ic-conditions-border" /><span>Marginal</span></div>
            <div className="flex items-center gap-1"><div className="h-3 w-3 rounded bg-ic-nogo-muted border border-ic-nogo-border" /><span>Below threshold</span></div>
            <span className="text-muted-foreground ml-auto">USD for Net Fees | % for YoC</span>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
