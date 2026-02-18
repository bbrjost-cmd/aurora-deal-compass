import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  CheckCircle2, XCircle, AlertTriangle, TrendingUp, BarChart3,
  Filter, RefreshCw, Zap, ChevronRight
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { STAGE_LABELS, STAGE_COLORS, SEGMENT_LABELS } from "@/lib/constants";

const DECISION_CONFIG = {
  go: { label: "GO", color: "text-ic-go", bg: "bg-ic-go/10 border-ic-go/30", icon: CheckCircle2 },
  go_with_conditions: { label: "GO / CONDITIONS", color: "text-ic-conditions", bg: "bg-ic-conditions/10 border-ic-conditions/30", icon: AlertTriangle },
  no_go: { label: "NO-GO", color: "text-ic-nogo", bg: "bg-ic-nogo/10 border-ic-nogo/30", icon: XCircle },
};

const CONFIDENCE_COLORS = {
  high: "bg-green-500/20 text-green-700 dark:text-green-400",
  medium: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400",
  low: "bg-red-500/20 text-red-700 dark:text-red-400",
};

/** Normalise hard_gates_json: accepte objet {key: {name, passed}} ou tableau [{name, passed}] */
function normalizeHardGates(raw: any): Array<{ name: string; passed: boolean; reason?: string }> {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  // Objet keyed: {completeness: {name, passed}, minRooms: {name, passed}, ...}
  if (typeof raw === "object") {
    return Object.values(raw).map((v: any) => ({
      name: v?.name ?? String(v),
      passed: Boolean(v?.passed),
      reason: v?.reason,
    }));
  }
  return [];
}

export default function ICPage() {
  const { orgId } = useAuth();
  const [deals, setDeals] = useState<any[]>([]);
  const [decisions, setDecisions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [filterDecision, setFilterDecision] = useState<string>("all");
  const [filterStage, setFilterStage] = useState<string>("all");
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  const loadData = () => {
    if (!orgId) return;
    Promise.all([
      supabase.from("deals").select("*").eq("org_id", orgId).order("updated_at", { ascending: false }),
      supabase.from("decision_history").select("*").eq("org_id", orgId).order("created_at", { ascending: false }),
    ]).then(([dealsRes, decisionsRes]) => {
      setDeals(dealsRes.data || []);
      setDecisions(decisionsRes.data || []);
      setLoading(false);
    });
  };

  const seedICDecisions = async () => {
    if (!orgId) return;
    setSeeding(true);
    try {
      const { data, error } = await supabase.functions.invoke("seed-ic-decisions", {
        body: { org_id: orgId, limit: 10 },
      });
      if (error) throw error;
      if (data?.skipped > 0 && data?.processed === 0) {
        toast({ title: "Déjà à jour", description: `${data.skipped} décisions IC existantes.` });
      } else {
        toast({
          title: `✅ ${data.processed} décisions IC générées`,
          description: data.results?.map((r: any) => `${r.deal}: ${r.decision.toUpperCase()} (${r.ic_score}/100)`).join(" · "),
        });
        loadData();
      }
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
    setSeeding(false);
  };

  useEffect(loadData, [orgId]);

  const enrichedDecisions = useMemo(() => {
    return decisions.map(dec => ({
      ...dec,
      deal: deals.find(d => d.id === dec.deal_id),
    })).filter(dec => dec.deal);
  }, [decisions, deals]);

  const dealsWithoutDecision = useMemo(() =>
    deals.filter(d => !decisions.find(dec => dec.deal_id === d.id)),
    [deals, decisions]
  );

  const filtered = useMemo(() => {
    return enrichedDecisions.filter(dec => {
      if (filterDecision !== "all" && dec.decision !== filterDecision) return false;
      if (filterStage !== "all" && dec.deal?.stage !== filterStage) return false;
      return true;
    });
  }, [enrichedDecisions, filterDecision, filterStage]);

  const scoreDistribution = useMemo(() => {
    const bins = [
      { label: "0-40", min: 0, max: 40, count: 0 },
      { label: "41-59", min: 41, max: 59, count: 0 },
      { label: "60-74", min: 60, max: 74, count: 0 },
      { label: "75-89", min: 75, max: 89, count: 0 },
      { label: "90-100", min: 90, max: 100, count: 0 },
    ];
    enrichedDecisions.forEach(dec => {
      const score = dec.ic_score || 0;
      const bin = bins.find(b => score >= b.min && score <= b.max);
      if (bin) bin.count++;
    });
    return bins;
  }, [enrichedDecisions]);

  const selectedDecision = selectedDealId
    ? enrichedDecisions.find(d => d.deal_id === selectedDealId)
    : filtered[0];

  const stats = {
    go: enrichedDecisions.filter(d => d.decision === "go").length,
    conditions: enrichedDecisions.filter(d => d.decision === "go_with_conditions").length,
    nogo: enrichedDecisions.filter(d => d.decision === "no_go").length,
    avgScore: enrichedDecisions.length > 0
      ? Math.round(enrichedDecisions.reduce((s, d) => s + (d.ic_score || 0), 0) / enrichedDecisions.length)
      : 0,
  };

  const handleSelectDeal = (dealId: string) => {
    setSelectedDealId(dealId);
    setMobileSheetOpen(true);
  };

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground animate-pulse">Chargement...</div>;
  }

  return (
    <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-xl lg:text-2xl font-semibold tracking-tight">IC Decision Center</h1>
          <p className="text-sm text-muted-foreground">
            {enrichedDecisions.length} décision{enrichedDecisions.length !== 1 ? "s" : ""} IC enregistrée{enrichedDecisions.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          {dealsWithoutDecision.length > 0 && (
            <Button size="sm" onClick={seedICDecisions} disabled={seeding} className="gap-2 h-8 text-xs">
              <Zap className="h-3.5 w-3.5" />
              {seeding ? "Génération…" : `Générer IC (${Math.min(dealsWithoutDecision.length, 10)})`}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={loadData} className="gap-2 h-8 text-xs">
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Rafraîchir</span>
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "GO", value: stats.go, color: "text-ic-go", icon: CheckCircle2 },
          { label: "CONDITIONS", value: stats.conditions, color: "text-ic-conditions", icon: AlertTriangle },
          { label: "NO-GO", value: stats.nogo, color: "text-ic-nogo", icon: XCircle },
          { label: "Score Moyen", value: stats.avgScore, color: "text-foreground", icon: BarChart3 },
        ].map(s => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="border-border/60">
              <CardContent className="p-3 lg:p-4 flex items-center gap-3">
                <Icon className={cn("h-7 w-7 lg:h-8 lg:w-8 shrink-0", s.color)} />
                <div>
                  <p className="text-xl lg:text-2xl font-semibold">{s.value}</p>
                  <p className="text-[10px] lg:text-xs text-muted-foreground font-medium">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Score Distribution */}
      {enrichedDecisions.length > 0 && (
        <Card className="border-border/60">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-sm lg:text-base">Distribution IC Score</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-4 pb-4">
            <div className="flex gap-2 h-16 lg:h-20 items-end">
              {scoreDistribution.map((bin) => {
                const max = Math.max(...scoreDistribution.map(b => b.count), 1);
                const pct = (bin.count / max) * 100;
                const color = bin.min >= 75 ? "bg-ic-go" : bin.min >= 60 ? "bg-ic-conditions" : "bg-ic-nogo";
                return (
                  <div key={bin.label} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[9px] lg:text-[10px] text-muted-foreground">{bin.count}</span>
                    <div
                      className={cn("w-full rounded-t transition-all", color, "opacity-80")}
                      style={{ height: `${Math.max(pct, 4)}%` }}
                    />
                    <span className="text-[8px] lg:text-[9px] text-muted-foreground">{bin.label}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-2 items-center flex-wrap">
        <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
        <Select value={filterDecision} onValueChange={setFilterDecision}>
          <SelectTrigger className="w-36 h-8 text-xs">
            <SelectValue placeholder="Décision" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes décisions</SelectItem>
            <SelectItem value="go">GO</SelectItem>
            <SelectItem value="go_with_conditions">CONDITIONS</SelectItem>
            <SelectItem value="no_go">NO-GO</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStage} onValueChange={setFilterStage}>
          <SelectTrigger className="w-36 h-8 text-xs">
            <SelectValue placeholder="Stage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les stages</SelectItem>
            {["lead","qualified","underwriting","loi","negotiation","signed"].map(s => (
              <SelectItem key={s} value={s}>{STAGE_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} résultat{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Main content: list + desktop detail */}
      <div className="grid lg:grid-cols-5 gap-4">
        {/* Deal list */}
        <div className="lg:col-span-2 space-y-2">
          {filtered.length === 0 && (
            <Card className="border-border/60">
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                <BarChart3 className="h-10 w-10 mx-auto mb-2 opacity-20" />
                <p>Aucune décision IC.</p>
                <p className="text-xs mt-1">Lancez une analyse de faisabilité pour générer des décisions.</p>
              </CardContent>
            </Card>
          )}
          {filtered.map((dec) => {
            const cfg = DECISION_CONFIG[dec.decision as keyof typeof DECISION_CONFIG];
            const Icon = cfg?.icon || BarChart3;
            const isSelected = selectedDecision?.id === dec.id;
            return (
              <Card
                key={dec.id}
                onClick={() => handleSelectDeal(dec.deal_id)}
                className={cn(
                  "border cursor-pointer transition-all",
                  isSelected ? "border-primary shadow-sm" : "border-border/60 hover:border-border"
                )}
              >
                <CardContent className="p-3">
                  <div className="flex items-start gap-2.5">
                    <Icon className={cn("h-5 w-5 shrink-0 mt-0.5", cfg?.color)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{dec.deal?.name}</p>
                      <p className="text-xs text-muted-foreground">{dec.deal?.city}, {dec.deal?.state}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded border", cfg?.bg, cfg?.color)}>
                          {cfg?.label}
                        </span>
                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded", CONFIDENCE_COLORS[dec.confidence as keyof typeof CONFIDENCE_COLORS])}>
                          {dec.confidence}
                        </span>
                        <span className="text-[10px] text-muted-foreground ml-auto font-mono">{dec.ic_score}/100</span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0 lg:hidden" />
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {dealsWithoutDecision.length > 0 && (
            <div className="pt-2">
              <p className="text-xs text-muted-foreground px-1 mb-2 font-medium">Sans décision ({dealsWithoutDecision.length})</p>
              {dealsWithoutDecision.slice(0, 5).map(deal => (
                <div key={deal.id} className="flex items-center gap-2 py-2 px-3 border border-dashed border-border/60 rounded-lg mb-1.5 text-xs text-muted-foreground">
                  <BarChart3 className="h-3.5 w-3.5" />
                  <span className="truncate">{deal.name}</span>
                  <Badge variant="secondary" className={cn("ml-auto text-[9px]", STAGE_COLORS[deal.stage])}>
                    {STAGE_LABELS[deal.stage]}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Desktop detail panel */}
        <div className="lg:col-span-3 hidden lg:block">
          {!selectedDecision ? (
            <Card className="border-border/60 h-full flex items-center justify-center min-h-64">
              <CardContent className="text-center text-muted-foreground p-10">
                <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">Sélectionnez un deal pour voir le détail IC</p>
              </CardContent>
            </Card>
          ) : (
            <ICDetailPanel decision={selectedDecision} />
          )}
        </div>
      </div>

      {/* Mobile detail sheet */}
      <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
        <SheetContent side="bottom" className="h-[92vh] overflow-y-auto rounded-t-2xl px-4 pb-8 lg:hidden">
          <SheetHeader className="pb-3">
            <SheetTitle className="text-sm text-left">
              {selectedDecision?.deal?.name ?? "Détail IC"}
            </SheetTitle>
          </SheetHeader>
          {selectedDecision && <ICDetailPanel decision={selectedDecision} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ICDetailPanel({ decision }: { decision: any }) {
  const cfg = DECISION_CONFIG[decision.decision as keyof typeof DECISION_CONFIG];
  const Icon = cfg?.icon || BarChart3;

  // Handle both array and object formats from DB
  const hardGates = normalizeHardGates(decision.hard_gates_json);
  const conditions = Array.isArray(decision.conditions_json) ? decision.conditions_json as string[] : [];
  const redFlags = Array.isArray(decision.red_flags_json) ? decision.red_flags_json as string[] : [];

  const scoreSegments = [
    { label: "Brand Écon.", value: Math.round((decision.ic_score || 0) * 0.35), max: 35, color: "bg-primary" },
    { label: "Owner Écon.", value: Math.round((decision.ic_score || 0) * 0.25), max: 25, color: "bg-chart-2" },
    { label: "Localisation", value: Math.round((decision.ic_score || 0) * 0.20), max: 20, color: "bg-chart-3" },
    { label: "Exécution", value: Math.round((decision.ic_score || 0) * 0.20), max: 20, color: "bg-chart-4" },
  ];

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3 px-4 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1">{decision.deal?.name}</p>
            <p className="text-[11px] text-muted-foreground">{decision.deal?.city} · {decision.deal?.segment}</p>
            <div className="flex items-center gap-2 mt-1">
              <Icon className={cn("h-6 w-6", cfg?.color)} />
              <h2 className={cn("text-xl font-bold", cfg?.color)}>{cfg?.label}</h2>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-4xl font-bold font-mono leading-none">{decision.ic_score}</p>
            <p className="text-xs text-muted-foreground">/ 100</p>
          </div>
        </div>
        <Progress value={decision.ic_score} className="h-2 mt-3" />
        <div className="flex gap-2 mt-2 flex-wrap">
          <Badge variant="outline" className={cn("text-xs", CONFIDENCE_COLORS[decision.confidence as keyof typeof CONFIDENCE_COLORS])}>
            Confiance: {decision.confidence}
          </Badge>
          <Badge variant="outline" className="text-xs">
            Complétude: {Math.round(decision.data_completeness || 0)}%
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 px-4 pb-4">
        {/* Score breakdown */}
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">Score Breakdown</p>
          <div className="space-y-2.5">
            {scoreSegments.map(seg => (
              <div key={seg.label} className="flex items-center gap-2.5">
                <span className="text-[11px] text-muted-foreground w-24 shrink-0">{seg.label}</span>
                <div className="flex-1 bg-secondary rounded-full h-2.5 overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", seg.color)}
                    style={{ width: `${(seg.value / seg.max) * 100}%` }}
                  />
                </div>
                <span className="text-[11px] font-mono w-10 text-right tabular-nums">{seg.value}/{seg.max}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Hard Gates */}
        {hardGates.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">Hard Gates</p>
            <div className="space-y-1.5">
              {hardGates.map((gate, i) => (
                <div key={i} className={cn(
                  "flex items-start gap-2 text-xs p-2.5 rounded-md",
                  gate.passed ? "bg-ic-go/10 text-ic-go" : "bg-ic-nogo/10 text-ic-nogo"
                )}>
                  {gate.passed
                    ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    : <XCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  }
                  <div>
                    <p className="font-medium">{gate.name}</p>
                    {gate.reason && <p className="opacity-75 mt-0.5">{gate.reason}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Conditions */}
        {conditions.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">Conditions to GO</p>
            <div className="space-y-1.5">
              {conditions.map((c: string, i: number) => (
                <div key={i} className="flex items-start gap-2 text-xs p-2.5 rounded-md bg-ic-conditions/10 text-ic-conditions">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <p>{c}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Red Flags */}
        {redFlags.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">Red Flags</p>
            <div className="space-y-1.5">
              {redFlags.map((rf: string, i: number) => (
                <div key={i} className="flex items-start gap-2 text-xs p-2.5 rounded-md bg-ic-nogo/10 text-ic-nogo">
                  <XCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <p>{rf}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* IC Narrative */}
        {decision.narrative_text && (
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">Narrative IC</p>
            <div className="text-xs text-foreground/80 leading-relaxed bg-secondary/40 rounded-lg p-3.5 whitespace-pre-line border border-border/40">
              {decision.narrative_text}
            </div>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground pt-2 border-t border-border/50">
          Généré le {new Date(decision.created_at).toLocaleDateString("fr-MX", {
            day: "numeric", month: "long", year: "numeric",
            hour: "2-digit", minute: "2-digit"
          })}
          {decision.override_reason && ` · Override: ${decision.override_reason}`}
        </p>
      </CardContent>
    </Card>
  );
}
