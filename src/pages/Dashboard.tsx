import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { STAGE_LABELS, STAGE_COLORS } from "@/lib/constants";
import { Plus, TrendingUp, Target, Clock, BarChart3, CheckCircle2, XCircle, AlertTriangle, ArrowRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const STAGE_ORDER = ['lead', 'qualified', 'underwriting', 'loi', 'negotiation', 'signed'];

const IC_DECISION_STYLES: Record<string, { label: string; color: string; icon: any }> = {
  go: { label: "GO", color: "text-ic-go", icon: CheckCircle2 },
  go_with_conditions: { label: "CONDITIONS", color: "text-ic-conditions", icon: AlertTriangle },
  no_go: { label: "NO-GO", color: "text-ic-nogo", icon: XCircle },
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
        toast({ title: "Pipeline déjà chargé", description: `${data.count} deals existants.` });
      } else {
        toast({ title: `✅ ${data.inserted} deals Mexico créés`, description: "Pipeline de test complet avec tâches et benchmarks" });
        loadData();
      }
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
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

  const topDeals = useMemo(() =>
    [...deals].sort((a, b) => (b.score_total || 0) - (a.score_total || 0)).slice(0, 5),
    [deals]
  );

  const kpis = [
    { label: "Total Deals", value: totalDeals, icon: Target, sub: `${recentDeals.length} this week` },
    { label: "Avg IC Score", value: avgScore, icon: BarChart3, sub: "Qualification" },
    { label: "Tasks", value: tasks.length, icon: Clock, sub: "Pending" },
    { label: "IC Decisions", value: decisions.length, icon: TrendingUp, sub: `${icSummary.go} GO` },
  ];

  if (loading) {
    return (
      <div className="p-4 space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-muted rounded-lg" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-xl lg:text-2xl font-semibold tracking-tight">Deal Engine</h1>
          <p className="text-xs lg:text-sm text-muted-foreground">Accor Luxury &amp; Lifestyle — Mexico</p>
        </div>
        <div className="flex gap-2 shrink-0">
          {totalDeals < 10 && (
            <Button variant="outline" size="sm" onClick={seedDeals} disabled={seeding} className="gap-1 text-xs h-8">
              <Sparkles className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{seeding ? "Génération..." : "Charger 50 deals"}</span>
              <span className="sm:hidden">{seeding ? "..." : "Seed"}</span>
            </Button>
          )}
          <Button size="sm" onClick={() => navigate("/pipeline")} className="gap-1 text-xs h-8">
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">New Deal</span>
            <span className="sm:hidden">New</span>
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="border-border/60">
            <CardContent className="p-3 lg:p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-7 w-7 lg:h-9 lg:w-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                  <kpi.icon className="h-3.5 w-3.5 lg:h-4 lg:w-4 text-muted-foreground" />
                </div>
                <p className="text-xl lg:text-2xl font-semibold">{kpi.value}</p>
              </div>
              <p className="text-xs font-medium text-foreground">{kpi.label}</p>
              <p className="text-[10px] text-muted-foreground">{kpi.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pipeline Bar Chart */}
      <Card className="border-border/60">
        <CardHeader className="pb-2 px-4 pt-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm lg:text-base">Pipeline by Stage</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs gap-1 h-7" onClick={() => navigate("/pipeline")}>
              View all <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-2 px-4 pb-4">
          {totalDeals === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 gap-3">
              <p className="text-sm text-muted-foreground">No deals yet.</p>
              <Button variant="outline" size="sm" onClick={seedDeals} className="gap-2">
                <Sparkles className="h-3.5 w-3.5" /> Charger 50 deals test
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {STAGE_ORDER.map((stage) => {
                const count = dealsByStage[stage] || 0;
                const pct = maxStageCount > 0 ? (count / maxStageCount) * 100 : 0;
                return (
                  <div key={stage} className="flex items-center gap-2">
                    <span className="text-[10px] lg:text-xs text-muted-foreground w-20 lg:w-24 shrink-0">{STAGE_LABELS[stage]}</span>
                    <div className="flex-1 bg-secondary rounded-full h-4 relative overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary/80 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium w-5 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-3 lg:gap-4">
        {/* IC Decision Summary */}
        <Card className="border-border/60">
          <CardHeader className="pb-2 px-4 pt-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm lg:text-base">IC Decisions</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs gap-1 h-7" onClick={() => navigate("/ic")}>
                View <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-2 px-4 pb-4">
            {decisions.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No IC decisions yet.<br />Run feasibility to generate.</p>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2 text-center">
                  {(["go", "go_with_conditions", "no_go"] as const).map((d) => {
                    const s = IC_DECISION_STYLES[d];
                    const Icon = s.icon;
                    return (
                      <div key={d} className="bg-secondary/40 rounded-lg p-2">
                        <Icon className={cn("h-4 w-4 mx-auto mb-1", s.color)} />
                        <p className="text-lg font-semibold">{icSummary[d]}</p>
                        <p className={cn("text-[9px] font-bold tracking-wide", s.color)}>{s.label}</p>
                      </div>
                    );
                  })}
                </div>
                <div className="space-y-1.5 mt-2">
                  {decisions.slice(0, 4).map((dec) => {
                    const s = IC_DECISION_STYLES[dec.decision];
                    const Icon = s.icon;
                    const deal = deals.find(d => d.id === dec.deal_id);
                    return (
                      <div key={dec.id} className="flex items-center gap-2 py-1 border-b border-border/50 last:border-0">
                        <Icon className={cn("h-3 w-3 shrink-0", s.color)} />
                        <span className="text-xs flex-1 truncate">{deal?.name || "Deal"}</span>
                        <span className="text-[10px] text-muted-foreground">{dec.ic_score}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Top Deals by Score */}
        <Card className="border-border/60">
          <CardHeader className="pb-2 px-4 pt-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm lg:text-base">Top Deals</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs gap-1 h-7" onClick={() => navigate("/pipeline")}>
                Pipeline <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-2 px-4 pb-4 space-y-2">
            {topDeals.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No scored deals.</p>
            ) : topDeals.map((deal, i) => (
              <div key={deal.id} className="flex items-center gap-2 py-1.5 border-b border-border/50 last:border-0">
                <span className="text-[10px] text-muted-foreground font-mono w-4">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{deal.name}</p>
                  <p className="text-[10px] text-muted-foreground">{deal.city}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold">{deal.score_total || 0}</p>
                  <Badge variant="secondary" className={cn("text-[9px] py-0", STAGE_COLORS[deal.stage])}>
                    {STAGE_LABELS[deal.stage]}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Pending Tasks */}
        <Card className="border-border/60">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-sm lg:text-base">Upcoming Tasks</CardTitle>
          </CardHeader>
          <CardContent className="pt-2 px-4 pb-4 space-y-2">
            {tasks.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No pending tasks.</p>
            ) : tasks.map((task) => (
              <div key={task.id} className="flex items-start gap-2 py-1.5 border-b border-border/50 last:border-0">
                <Clock className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{task.title}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{(task as any).deals?.name}</p>
                </div>
                {task.due_date && (
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {new Date(task.due_date).toLocaleDateString("fr-MX", { day: "numeric", month: "short" })}
                  </span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="border-border/60">
        <CardHeader className="pb-2 px-4 pt-4">
          <CardTitle className="text-sm lg:text-base">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="pt-2 px-4 pb-4">
          <div className="divide-y divide-border/50">
            {recentDeals.slice(0, 6).map((deal) => (
              <div key={deal.id} className="flex items-center justify-between py-2.5 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-7 w-7 rounded-md bg-secondary flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-bold text-muted-foreground">{deal.name.slice(0, 2).toUpperCase()}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs lg:text-sm font-medium truncate">{deal.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{deal.city} · {deal.segment}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {deal.score_total > 0 && (
                    <span className="text-xs font-mono text-muted-foreground hidden sm:block">{deal.score_total}pts</span>
                  )}
                  <Badge variant="secondary" className={cn("text-[9px]", STAGE_COLORS[deal.stage])}>
                    {STAGE_LABELS[deal.stage]}
                  </Badge>
                </div>
              </div>
            ))}
            {recentDeals.length === 0 && (
              <p className="text-xs text-muted-foreground py-4 text-center">No recent activity.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
