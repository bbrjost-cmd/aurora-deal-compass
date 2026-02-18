import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { STAGE_LABELS, STAGE_COLORS } from "@/lib/constants";
import { Plus, TrendingUp, Target, Clock, BarChart3, CheckCircle2, XCircle, AlertTriangle, ArrowRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import DealsMiniMap from "@/components/DealsMiniMap";

const STAGE_ORDER = ['lead', 'qualified', 'underwriting', 'loi', 'negotiation', 'signed'];

const IC_DECISION_STYLES: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  go: { label: "GO", color: "text-ic-go", bg: "bg-ic-go-muted", icon: CheckCircle2 },
  go_with_conditions: { label: "Conditions", color: "text-ic-conditions", bg: "bg-ic-conditions-muted", icon: AlertTriangle },
  no_go: { label: "NO-GO", color: "text-ic-nogo", bg: "bg-ic-nogo-muted", icon: XCircle },
};

export default function Dashboard() {
  const { orgId } = useAuth();
  const navigate = useNavigate();
  const [deals, setDeals] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [decisions, setDecisions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  const loadData = () => {
    if (!orgId) return;
    Promise.all([
      supabase.from("deals").select("*").eq("org_id", orgId).order("updated_at", { ascending: false }),
      supabase.from("tasks").select("*, deals(name)").eq("org_id", orgId).eq("status", "pending").order("due_date", { ascending: true }).limit(5),
      supabase.from("decision_history").select("*").eq("org_id", orgId).order("created_at", { ascending: false }).limit(20),
    ]).then(([dealsRes, tasksRes, decisionsRes]) => {
      setDeals(dealsRes.data || []);
      setTasks(tasksRes.data || []);
      setDecisions(decisionsRes.data || []);
      setLoading(false);
    });
  };

  useEffect(loadData, [orgId]);

  const seedDeals = async () => {
    if (!orgId) return;
    setSeeding(true);
    try {
      const { data, error } = await supabase.functions.invoke("seed-deals", { body: { org_id: orgId } });
      if (error) throw error;
      if (data?.message) {
        toast({ title: "Pipeline already loaded", description: `${data.count} existing deals.` });
      } else {
        toast({ title: `${data.inserted} deals created`, description: "Mexico pipeline loaded." });
        loadData();
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setSeeding(false);
  };

  const totalDeals = deals.length;

  const dealsByStage = useMemo(() =>
    STAGE_ORDER.reduce((acc, s) => {
      acc[s] = deals.filter(d => d.stage === s).length;
      return acc;
    }, {} as Record<string, number>),
    [deals]
  );

  const maxStageCount = Math.max(...Object.values(dealsByStage), 1);

  const avgScore = totalDeals > 0
    ? Math.round(deals.reduce((sum, d) => sum + (d.score_total || 0), 0) / totalDeals)
    : 0;

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const recentDeals = deals.filter((d) => d.updated_at >= sevenDaysAgo);

  const icSummary = useMemo(() => ({
    go: decisions.filter(d => d.decision === "go").length,
    go_with_conditions: decisions.filter(d => d.decision === "go_with_conditions").length,
    no_go: decisions.filter(d => d.decision === "no_go").length,
  }), [decisions]);

  // Map: dealId → latest decision
  const decisionMap = useMemo(() => {
    const map: Record<string, string> = {};
    // decisions are ordered desc by created_at, so first occurrence = latest
    decisions.forEach(dec => {
      if (dec.deal_id && !map[dec.deal_id]) {
        map[dec.deal_id] = dec.decision;
      }
    });
    return map;
  }, [decisions]);

  const topDeals = useMemo(() =>
    [...deals].sort((a, b) => (b.score_total || 0) - (a.score_total || 0)).slice(0, 5),
    [deals]
  );

  if (loading) {
    return (
      <div className="px-6 py-8 space-y-6 animate-pulse">
        <div className="h-10 w-56 bg-muted rounded-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-muted rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 lg:px-8 py-7 lg:py-10 space-y-8 max-w-5xl mx-auto">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight">Deal Engine</h1>
          <p className="text-sm text-muted-foreground mt-1">Accor Luxury & Lifestyle — Mexico</p>
        </div>
        <div className="flex gap-2 shrink-0">
          {totalDeals < 10 && (
            <Button
              variant="outline"
              size="sm"
              onClick={seedDeals}
              disabled={seeding}
              className="gap-1.5 text-xs rounded-xl border-border h-9"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {seeding ? "Loading..." : "Load deals"}
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => navigate("/pipeline")}
            className="gap-1.5 text-xs rounded-xl h-9"
          >
            <Plus className="h-3.5 w-3.5" />
            New Deal
          </Button>
        </div>
      </div>

      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Deals", value: totalDeals, sub: `${recentDeals.length} this week`, icon: Target },
          { label: "Avg IC Score", value: avgScore, sub: "Out of 100", icon: BarChart3 },
          { label: "Active Tasks", value: tasks.length, sub: "Pending", icon: Clock },
          { label: "IC Decisions", value: decisions.length, sub: `${icSummary.go} GO`, icon: TrendingUp },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-card border border-border rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground font-medium">{kpi.label}</p>
              <kpi.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-3xl font-semibold tracking-tight">{kpi.value}</p>
            <p className="text-xs text-muted-foreground">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Pipeline funnel ── */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-semibold">Pipeline</h2>
          <button
            onClick={() => navigate("/pipeline")}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            View all <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
        {totalDeals === 0 ? (
          <div className="flex flex-col items-center py-10 gap-3">
            <p className="text-sm text-muted-foreground">No deals yet.</p>
            <Button variant="outline" size="sm" onClick={seedDeals} className="gap-2 rounded-xl">
              <Sparkles className="h-3.5 w-3.5" /> Load 50 sample deals
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {STAGE_ORDER.map((stage) => {
              const count = dealsByStage[stage] || 0;
              const pct = maxStageCount > 0 ? (count / maxStageCount) * 100 : 0;
              return (
                <div key={stage} className="flex items-center gap-4">
                  <span className="text-xs text-muted-foreground w-24 shrink-0">{STAGE_LABELS[stage]}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-foreground transition-all duration-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium tabular-nums w-5 text-right text-muted-foreground">{count}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Deals Map ── */}
      {topDeals.some(d => d.lat && d.lon) && (
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold">Locations</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Top 5 deals — color by IC decision</p>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-medium">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#22c55e] inline-block" />GO</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#f59e0b] inline-block" />Conditions</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#ef4444] inline-block" />NO-GO</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#6b7280] inline-block" />—</span>
            </div>
          </div>
          <div className="h-56 rounded-xl overflow-hidden border border-border">
            <DealsMiniMap
              deals={topDeals}
              decisionMap={decisionMap}
              onDealClick={(deal) => navigate(`/pipeline?deal=${deal.id}`)}
            />
          </div>
        </div>
      )}

      {/* ── Bottom row ── */}
      <div className="grid lg:grid-cols-2 gap-4">

        {/* Top Deals */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold">Top Deals</h2>
            <button
              onClick={() => navigate("/pipeline")}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Pipeline <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          {topDeals.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">No scored deals yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {topDeals.map((deal, i) => (
                <div
                  key={deal.id}
                  className="flex items-center gap-3 py-3 cursor-pointer hover:opacity-70 transition-opacity"
                  onClick={() => navigate(`/pipeline?deal=${deal.id}`)}
                >
                  <span className="text-xs text-muted-foreground tabular-nums w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{deal.name}</p>
                    <p className="text-xs text-muted-foreground">{deal.city}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-lg font-semibold tabular-nums">{deal.score_total || 0}</span>
                    <Badge className={cn("text-[9px] px-1.5 rounded-md", STAGE_COLORS[deal.stage])}>
                      {STAGE_LABELS[deal.stage]}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* IC Decisions */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold">IC Decisions</h2>
            <button
              onClick={() => navigate("/ic")}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              IC Center <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          {decisions.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">No IC decisions yet.<br />Run a feasibility analysis.</p>
          ) : (
            <>
              {/* Summary chips */}
              <div className="flex gap-2 mb-5">
                {(["go", "go_with_conditions", "no_go"] as const).map((d) => {
                  const s = IC_DECISION_STYLES[d];
                  const Icon = s.icon;
                  return (
                    <div key={d} className={cn("flex-1 flex flex-col items-center gap-1 py-3 rounded-xl", s.bg)}>
                      <Icon className={cn("h-4 w-4", s.color)} />
                      <p className={cn("text-xl font-semibold", s.color)}>{icSummary[d]}</p>
                      <p className={cn("text-[9px] font-semibold tracking-wide uppercase", s.color)}>{s.label}</p>
                    </div>
                  );
                })}
              </div>
              {/* Recent decisions */}
              <div className="divide-y divide-border">
                {decisions.slice(0, 4).map((dec) => {
                  const s = IC_DECISION_STYLES[dec.decision];
                  const Icon = s.icon;
                  const deal = deals.find(d => d.id === dec.deal_id);
                  return (
                    <div key={dec.id} className="flex items-center gap-3 py-2.5">
                      <Icon className={cn("h-3.5 w-3.5 shrink-0", s.color)} />
                      <span className="text-sm flex-1 truncate">{deal?.name || "Deal"}</span>
                      <span className="text-sm font-semibold tabular-nums">{dec.ic_score}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Tasks ── */}
      {tasks.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-6">
          <h2 className="text-base font-semibold mb-5">Upcoming Tasks</h2>
          <div className="divide-y divide-border">
            {tasks.map((task) => (
              <div key={task.id} className="flex items-center gap-4 py-3">
                <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{task.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{(task as any).deals?.name}</p>
                </div>
                {task.due_date && (
                  <span className="text-xs text-muted-foreground shrink-0">
                    {new Date(task.due_date).toLocaleDateString("en-US", { day: "numeric", month: "short" })}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
