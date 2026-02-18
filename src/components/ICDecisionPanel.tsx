import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  computeICDecision, computeBrandEconomics, computeOwnerEconomics,
  computeCompleteness, DEFAULT_THRESHOLDS,
} from "@/lib/ic-engine";
import { computeFeasibility, DEFAULT_INPUTS, formatMXN, type FeasibilityInputs } from "@/lib/feasibility";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import {
  CheckCircle2, XCircle, AlertTriangle, Shield, Target, Zap, Save,
  ChevronDown, ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  deal: any;
  feasInputs?: FeasibilityInputs | null;
  contactCount?: number;
  onSave?: () => void;
}

const DECISION_CONFIG = {
  go: {
    label: "GO",
    badgeCls: "bg-ic-go text-ic-go-foreground",
    borderCls: "border-ic-go-border",
    bgCls: "bg-ic-go-muted",
    textCls: "text-ic-go",
    icon: CheckCircle2,
  },
  go_with_conditions: {
    label: "GO WITH CONDITIONS",
    badgeCls: "bg-ic-conditions text-ic-conditions-foreground",
    borderCls: "border-ic-conditions-border",
    bgCls: "bg-ic-conditions-muted",
    textCls: "text-ic-conditions",
    icon: AlertTriangle,
  },
  no_go: {
    label: "NO-GO",
    badgeCls: "bg-ic-nogo text-ic-nogo-foreground",
    borderCls: "border-ic-nogo-border",
    bgCls: "bg-ic-nogo-muted",
    textCls: "text-ic-nogo",
    icon: XCircle,
  },
};

const CONFIDENCE_CONFIG = {
  high: { label: "High Confidence", cls: "bg-ic-go-muted text-ic-go border-ic-go-border" },
  medium: { label: "Medium Confidence", cls: "bg-ic-conditions-muted text-ic-conditions border-ic-conditions-border" },
  low: { label: "Low Confidence", cls: "bg-ic-nogo-muted text-ic-nogo border-ic-nogo-border" },
};

const SCORE_COLORS = [
  { color: "bg-primary", label: "Brand Econ" },
  { color: "bg-aurora-gold", label: "Owner Econ" },
  { color: "bg-muted-foreground", label: "Location" },
  { color: "bg-secondary-foreground", label: "Execution" },
];

export function ICDecisionPanel({ deal, feasInputs, contactCount = 0, onSave }: Props) {
  const { orgId } = useAuth();
  const [showNarrative, setShowNarrative] = useState(false);
  const [contractType, setContractType] = useState<"management" | "franchise">("management");
  const [debtEnabled, setDebtEnabled] = useState(false);
  const [saving, setSaving] = useState(false);

  const inputs = feasInputs || DEFAULT_INPUTS;

  const { outputs, brandEcon, ownerEcon, completeness, decision } = useMemo(() => {
    const outputs = computeFeasibility(inputs);
    const brandEcon = computeBrandEconomics(inputs, outputs, contractType, inputs.keyMoney || 0);
    const ownerEcon = computeOwnerEconomics(
      inputs, outputs, debtEnabled,
      inputs.ltv || 0.55, inputs.interestRate || 0.09, inputs.capRate || 0.08,
    );
    const completeness = computeCompleteness(deal, !!feasInputs, contactCount);
    const decision = computeICDecision(deal, inputs, outputs, brandEcon, ownerEcon, completeness);
    return { outputs, brandEcon, ownerEcon, completeness, decision };
  }, [inputs, deal, contractType, debtEnabled, feasInputs, contactCount]);

  const cfg = DECISION_CONFIG[decision.decision];
  const confCfg = CONFIDENCE_CONFIG[decision.confidence];
  const DecIcon = cfg.icon;

  const saveDecision = async () => {
    if (!orgId || !deal) return;
    setSaving(true);
    try {
      await supabase.from("decision_history").insert({
        org_id: orgId,
        deal_id: deal.id,
        decision: decision.decision,
        ic_score: decision.icScore,
        confidence: decision.confidence,
        hard_gates_json: decision.hardGates as any,
        thresholds_json: DEFAULT_THRESHOLDS as any,
        conditions_json: decision.conditions as any,
        red_flags_json: decision.redFlags as any,
        narrative_text: decision.narrative,
        data_completeness: decision.dataCompleteness,
      });
      await supabase.from("audit_log").insert({
        org_id: orgId,
        deal_id: deal.id,
        action: "ic_decision_saved",
        diff_json: { decision: decision.decision, ic_score: decision.icScore } as any,
      });
      toast({ title: "IC Decision saved", description: `${cfg.label} — Score ${decision.icScore}/100` });
      onSave?.();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      {/* Main Decision Badge */}
      <div className={cn("rounded-xl border-2 p-5", cfg.borderCls, cfg.bgCls)}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <DecIcon className={cn("h-8 w-8", cfg.textCls)} />
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">IC Recommendation</p>
              <p className={cn("text-xl font-black mt-0.5 tracking-tight", cfg.textCls)}>{cfg.label}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-black tabular-nums text-foreground">{decision.icScore}</div>
            <div className="text-xs text-muted-foreground">/100</div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Badge className={cn("text-xs border", confCfg.cls)}>{confCfg.label}</Badge>
          <Badge variant="outline" className="text-xs">Completeness {decision.dataCompleteness}%</Badge>
          <Badge variant="outline" className="text-xs capitalize">{contractType}</Badge>
          {decision.hardGateFailed && <Badge className="text-xs bg-ic-nogo text-ic-nogo-foreground">Hard Gate Failed</Badge>}
        </div>
      </div>

      {/* Score Breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Target className="h-3.5 w-3.5" /> IC Score Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {[
            { label: "Location / Market", score: decision.locationScore, max: 25 },
            { label: "Demand Strength", score: decision.demandScore, max: 25 },
            { label: "Conversion Ease", score: decision.conversionScore, max: 20 },
            { label: "Owner / Asset Quality", score: decision.ownerScore, max: 15 },
            { label: "Execution Risk", score: decision.executionScore, max: 15 },
          ].map((s, i) => (
            <div key={s.label}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">{s.label}</span>
                <span className="font-semibold tabular-nums">{s.score}/{s.max}</span>
              </div>
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-500", SCORE_COLORS[i].color)}
                  style={{ width: `${(s.score / s.max) * 100}%` }}
                />
              </div>
            </div>
          ))}
          <div className="pt-1 flex justify-between text-xs font-bold border-t border-border">
            <span>Total IC Score</span>
            <span className="tabular-nums">{decision.icScore}/100</span>
          </div>
        </CardContent>
      </Card>

      {/* Contract & Debt Toggles */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-3 bg-secondary rounded-lg">
          <p className="text-xs font-medium mb-1">Contract</p>
          <div className="flex items-center gap-1.5 text-xs">
            <span className={contractType === "management" ? "font-semibold" : "text-muted-foreground"}>Mgmt</span>
            <Switch checked={contractType === "franchise"} onCheckedChange={v => setContractType(v ? "franchise" : "management")} />
            <span className={contractType === "franchise" ? "font-semibold" : "text-muted-foreground"}>Franchise</span>
          </div>
        </div>
        <div className="p-3 bg-secondary rounded-lg">
          <p className="text-xs font-medium mb-1">Debt</p>
          <div className="flex items-center gap-1.5 text-xs">
            <span className={!debtEnabled ? "font-semibold" : "text-muted-foreground"}>Unlev.</span>
            <Switch checked={debtEnabled} onCheckedChange={setDebtEnabled} />
            <span className={debtEnabled ? "font-semibold" : "text-muted-foreground"}>Levered</span>
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "Net Fees (Accor)", value: `$${brandEcon.netFeesUSD.toLocaleString()} USD`, ok: brandEcon.netFeesUSD >= DEFAULT_THRESHOLDS.minNetFeesUSD },
          { label: "Yield on Cost", value: `${(ownerEcon.yieldOnCost * 100).toFixed(1)}%`, ok: ownerEcon.yieldOnCost >= 0.07 },
          { label: "Simple Payback", value: `${outputs.simplePayback} yrs`, ok: outputs.simplePayback <= 12 },
          { label: "DSCR", value: debtEnabled ? `${ownerEcon.dscr.toFixed(2)}x` : "N/A", ok: !debtEnabled || ownerEcon.dscr >= DEFAULT_THRESHOLDS.minDSCR },
          { label: "Unlev. IRR", value: `${ownerEcon.unleveragedIRR.toFixed(1)}%`, ok: ownerEcon.unleveragedIRR > 10 },
          { label: "Exit Value", value: formatMXN(ownerEcon.exitValue), ok: ownerEcon.exitValue > outputs.totalCapex },
        ].map(kpi => (
          <div
            key={kpi.label}
            className={cn("p-2.5 rounded-lg border", kpi.ok ? "border-ic-go-border bg-ic-go-muted" : "border-ic-nogo-border bg-ic-nogo-muted")}
          >
            <p className="text-[10px] text-muted-foreground">{kpi.label}</p>
            <p className="text-sm font-bold">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Break-Even */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-3 bg-secondary rounded-lg">
          <p className="text-xs text-muted-foreground">Break-Even Occ.</p>
          <p className="text-lg font-bold">{(ownerEcon.breakEvenOccupancy * 100).toFixed(0)}%</p>
          <p className="text-[10px] text-muted-foreground">for target YoC</p>
        </div>
        <div className="p-3 bg-secondary rounded-lg">
          <p className="text-xs text-muted-foreground">Break-Even ADR</p>
          <p className="text-lg font-bold">{ownerEcon.breakEvenADR > 0 ? `${ownerEcon.breakEvenADR.toLocaleString()} MXN` : "—"}</p>
          <p className="text-[10px] text-muted-foreground">for target YoC</p>
        </div>
      </div>

      {/* Hard Gates */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Shield className="h-3.5 w-3.5" /> Hard Gates
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {decision.hardGates.map((gate, i) => (
            <div key={i} className="flex items-start gap-2">
              {gate.passed
                ? <CheckCircle2 className="h-4 w-4 text-ic-go mt-0.5 shrink-0" />
                : <XCircle className="h-4 w-4 text-ic-nogo mt-0.5 shrink-0" />}
              <div>
                <p className="text-xs font-medium">{gate.name}</p>
                {!gate.passed && <p className="text-xs text-ic-nogo">{gate.reason}</p>}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Conditions */}
      {decision.conditions.length > 0 && (
        <Card className="border-ic-conditions-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-widest text-ic-conditions flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5" /> Conditions to GO ({decision.conditions.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {decision.conditions.map((c, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-ic-conditions shrink-0 font-bold text-xs">{i + 1}.</span>
                <p className="text-xs leading-relaxed">{c}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Red Flags */}
      {decision.redFlags.length > 0 && (
        <Card className="border-ic-nogo-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-widest text-ic-nogo flex items-center gap-2">
              <XCircle className="h-3.5 w-3.5" /> Red Flags ({decision.redFlags.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {decision.redFlags.map((f, i) => (
              <p key={i} className="text-xs text-ic-nogo leading-relaxed">• {f}</p>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Narrative */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center justify-between">
            <span className="flex items-center gap-2"><Zap className="h-3.5 w-3.5" /> IC Narrative</span>
            <button onClick={() => setShowNarrative(!showNarrative)} className="hover:text-foreground transition-colors">
              {showNarrative ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className={cn("text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap", !showNarrative && "line-clamp-4")}>
            {decision.narrative}
          </p>
          {!showNarrative && (
            <button className="text-xs text-primary mt-1 hover:underline" onClick={() => setShowNarrative(true)}>
              Read full narrative →
            </button>
          )}
        </CardContent>
      </Card>

      <Button onClick={saveDecision} disabled={saving} className="w-full gap-2">
        <Save className="h-4 w-4" />
        {saving ? "Saving..." : "Save IC Decision"}
      </Button>
    </div>
  );
}
