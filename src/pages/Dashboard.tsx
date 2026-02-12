import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { STAGE_LABELS, STAGE_COLORS } from "@/lib/constants";
import { Plus, TrendingUp, Target, Clock, BarChart3, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { LUXURY_PROSPECTS } from "@/lib/accor-brands";
import { toast } from "@/hooks/use-toast";

export default function Dashboard() {
  const { orgId } = useAuth();
  const navigate = useNavigate();
  const [deals, setDeals] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  const loadData = () => {
    if (!orgId) return;
    Promise.all([
      supabase.from("deals").select("*").eq("org_id", orgId).order("updated_at", { ascending: false }),
      supabase.from("tasks").select("*, deals(name)").eq("org_id", orgId).eq("status", "pending").order("due_date", { ascending: true }).limit(5),
    ]).then(([dealsRes, tasksRes]) => {
      setDeals(dealsRes.data || []);
      setTasks(tasksRes.data || []);
      setLoading(false);
    });
  };

  useEffect(loadData, [orgId]);

  const seedProspects = async () => {
    if (!orgId) return;
    setSeeding(true);
    try {
      const inserts = LUXURY_PROSPECTS.map(p => ({
        org_id: orgId,
        name: p.name,
        city: p.city,
        state: p.state,
        lat: p.lat,
        lon: p.lon,
        segment: p.segment,
        opening_type: p.opening_type,
        rooms_min: p.rooms_min,
        rooms_max: p.rooms_max,
        stage: "lead" as const,
      }));
      const { error } = await supabase.from("deals").insert(inserts);
      if (error) throw error;

      // Add notes for each prospect
      const { data: newDeals } = await supabase.from("deals").select("id, name").eq("org_id", orgId).order("created_at", { ascending: false }).limit(10);
      if (newDeals) {
        const noteInserts = newDeals.map(d => {
          const prospect = LUXURY_PROSPECTS.find(p => p.name === d.name);
          return prospect ? {
            org_id: orgId,
            deal_id: d.id,
            content: `${prospect.notes}\n\nOwner: ${prospect.owner}\nDestination: ${prospect.destination}\nRecommended brands: ${prospect.brands.join(", ")}`,
          } : null;
        }).filter(Boolean);
        if (noteInserts.length > 0) {
          await supabase.from("deal_notes").insert(noteInserts as any);
        }
      }

      toast({ title: "10 luxury prospects seeded", description: "Riviera Maya, Tulum, Los Cabos, CDMX, Nayarit" });
      loadData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setSeeding(false);
  };

  const totalDeals = deals.length;
  const dealsByStage = deals.reduce((acc, d) => {
    acc[d.stage] = (acc[d.stage] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const avgScore = totalDeals > 0
    ? Math.round(deals.reduce((sum, d) => sum + (d.score_total || 0), 0) / totalDeals)
    : 0;

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const recentDeals = deals.filter((d) => d.updated_at >= sevenDaysAgo);

  const kpis = [
    { label: "Total Deals", value: totalDeals, icon: Target },
    { label: "Avg Score", value: avgScore, icon: BarChart3 },
    { label: "Updated (7d)", value: recentDeals.length, icon: TrendingUp },
    { label: "Pending Tasks", value: tasks.length, icon: Clock },
  ];

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Accor Luxury & Lifestyle — Mexico Pipeline</p>
        </div>
        <div className="flex gap-2">
          {totalDeals === 0 && (
            <Button variant="outline" onClick={seedProspects} disabled={seeding} className="gap-2">
              <Sparkles className="h-4 w-4" />
              {seeding ? "Seeding..." : "Load Luxury Prospects"}
            </Button>
          )}
          <Button onClick={() => navigate("/pipeline")} className="gap-2">
            <Plus className="h-4 w-4" /> Quick Add Deal
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center">
                <kpi.icon className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{kpi.value}</p>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pipeline summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Pipeline by Stage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Object.entries(dealsByStage).map(([stage, count]) => (
              <Badge key={stage} variant="secondary" className={STAGE_COLORS[stage]}>
                {STAGE_LABELS[stage] || stage}: {count as number}
              </Badge>
            ))}
            {totalDeals === 0 && (
              <p className="text-sm text-muted-foreground">No deals yet. Click "Load Luxury Prospects" to seed 10 high-priority targets.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Recent Activity */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentDeals.slice(0, 5).map((deal) => (
              <div key={deal.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium">{deal.name}</p>
                  <p className="text-xs text-muted-foreground">{deal.city}, {deal.state}</p>
                </div>
                <Badge variant="secondary" className={STAGE_COLORS[deal.stage]}>
                  {STAGE_LABELS[deal.stage]}
                </Badge>
              </div>
            ))}
            {recentDeals.length === 0 && (
              <p className="text-sm text-muted-foreground">No recent activity.</p>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Tasks */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Upcoming Tasks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {tasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium">{task.title}</p>
                  <p className="text-xs text-muted-foreground">{(task as any).deals?.name}</p>
                </div>
                {task.due_date && (
                  <span className="text-xs text-muted-foreground">
                    {new Date(task.due_date).toLocaleDateString()}
                  </span>
                )}
              </div>
            ))}
            {tasks.length === 0 && (
              <p className="text-sm text-muted-foreground">No pending tasks.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
