import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { STAGES, STAGE_LABELS, STAGE_COLORS } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, GripVertical } from "lucide-react";
import { DealCreateDialog } from "@/components/DealCreateDialog";
import { DealDetailDrawer } from "@/components/DealDetailDrawer";
import { toast } from "@/hooks/use-toast";

export default function Pipeline() {
  const { orgId } = useAuth();
  const [deals, setDeals] = useState<any[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<any>(null);
  const [dragging, setDragging] = useState<string | null>(null);

  const loadDeals = () => {
    if (!orgId) return;
    supabase.from("deals").select("*").eq("org_id", orgId).order("updated_at", { ascending: false }).then(({ data }) => {
      setDeals(data || []);
    });
  };

  useEffect(loadDeals, [orgId]);

  const handleDragStart = (dealId: string) => setDragging(dealId);

  const handleDrop = async (stage: string) => {
    if (!dragging) return;
    const { error } = await supabase.from("deals").update({ stage }).eq("id", dragging);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setDeals(prev => prev.map(d => d.id === dragging ? { ...d, stage } : d));
    }
    setDragging(null);
  };

  const activeStages = STAGES.filter(s => s !== 'opened' && s !== 'lost');

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pipeline</h1>
          <p className="text-sm text-muted-foreground">Drag deals between stages</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> New Deal
        </Button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4">
        {activeStages.map((stage) => {
          const stageDeals = deals.filter((d) => d.stage === stage);
          return (
            <div
              key={stage}
              className="min-w-[220px] flex-shrink-0"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(stage)}
            >
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className={STAGE_COLORS[stage]}>
                  {STAGE_LABELS[stage]}
                </Badge>
                <span className="text-xs text-muted-foreground">{stageDeals.length}</span>
              </div>
              <div className="space-y-2 min-h-[200px] bg-secondary/30 rounded-lg p-2">
                {stageDeals.map((deal) => (
                  <Card
                    key={deal.id}
                    draggable
                    onDragStart={() => handleDragStart(deal.id)}
                    onClick={() => setSelectedDeal(deal)}
                    className="p-3 cursor-pointer hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 cursor-grab" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{deal.name}</p>
                        <p className="text-xs text-muted-foreground">{deal.city}{deal.state ? `, ${deal.state}` : ''}</p>
                        {deal.score_total > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">Score: {deal.score_total}</p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <DealCreateDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={loadDeals} />
      <DealDetailDrawer deal={selectedDeal} onClose={() => setSelectedDeal(null)} onUpdate={loadDeals} />
    </div>
  );
}
