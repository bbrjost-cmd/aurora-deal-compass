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
import { cn } from "@/lib/utils";
import { useSearchParams } from "react-router-dom";

export default function Pipeline() {
  const { orgId } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [deals, setDeals] = useState<any[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<any>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const loadDeals = () => {
    if (!orgId) return;
    supabase.from("deals").select("*").eq("org_id", orgId).order("updated_at", { ascending: false }).then(({ data }) => {
      const dealsList = data || [];
      setDeals(dealsList);
      // Auto-open deal from URL param
      const dealId = searchParams.get("deal");
      if (dealId) {
        const found = dealsList.find(d => d.id === dealId);
        if (found) setSelectedDeal(found);
      }
    });
  };

  useEffect(loadDeals, [orgId]);

  const handleDragStart = (dealId: string) => setDragging(dealId);

  const handleDrop = async (stage: string) => {
    if (!dragging || !dragOver) return;
    const { error } = await supabase.from("deals").update({ stage }).eq("id", dragging);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setDeals(prev => prev.map(d => d.id === dragging ? { ...d, stage } : d));
      toast({ title: "Stage updated", description: `Moved to ${STAGE_LABELS[stage]}` });
    }
    setDragging(null);
    setDragOver(null);
  };

  const activeStages = STAGES.filter(s => s !== 'opened' && s !== 'lost');

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div>
          <h1 className="text-lg lg:text-2xl font-semibold tracking-tight">Pipeline</h1>
          <p className="text-xs text-muted-foreground hidden sm:block">Drag deals between stages</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-1.5 h-8 text-xs lg:h-9 lg:text-sm">
          <Plus className="h-3.5 w-3.5" /> New Deal
        </Button>
      </div>

      {/* Kanban Board — horizontal scroll */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex gap-3 h-full p-4" style={{ minWidth: `${activeStages.length * 230}px` }}>
          {activeStages.map((stage) => {
            const stageDeals = deals.filter((d) => d.stage === stage);
            const isDragOver = dragOver === stage;
            return (
              <div
                key={stage}
                className="w-[210px] flex-shrink-0 flex flex-col"
                onDragOver={(e) => { e.preventDefault(); setDragOver(stage); }}
                onDragLeave={() => setDragOver(null)}
                onDrop={() => handleDrop(stage)}
              >
                <div className="flex items-center gap-2 mb-2 shrink-0">
                  <Badge variant="secondary" className={cn("text-xs", STAGE_COLORS[stage])}>
                    {STAGE_LABELS[stage]}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{stageDeals.length}</span>
                </div>
                <div className={cn(
                  "flex-1 space-y-2 rounded-lg p-2 overflow-y-auto transition-colors",
                  isDragOver ? "bg-primary/10 border border-primary/30" : "bg-secondary/30"
                )}>
                  {stageDeals.map((deal) => (
                    <Card
                      key={deal.id}
                      draggable
                      onDragStart={() => handleDragStart(deal.id)}
                      onDragEnd={() => { setDragging(null); setDragOver(null); }}
                      onClick={() => setSelectedDeal(deal)}
                      className={cn(
                        "p-3 cursor-pointer hover:shadow-md transition-all select-none",
                        dragging === deal.id && "opacity-50 scale-95"
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <GripVertical className="h-3.5 w-3.5 text-muted-foreground mt-0.5 cursor-grab shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium truncate leading-snug">{deal.name}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{deal.city}{deal.state ? `, ${deal.state}` : ''}</p>
                          {deal.score_total > 0 && (
                            <div className="flex items-center justify-between mt-1.5">
                              <span className="text-[10px] text-muted-foreground">Score</span>
                              <span className="text-[10px] font-semibold">{deal.score_total}</span>
                            </div>
                          )}
                          {deal.segment && (
                            <Badge variant="secondary" className="text-[9px] px-1 py-0 mt-1 capitalize">
                              {deal.segment.replace(/_/g, ' ')}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                  {stageDeals.length === 0 && (
                    <div className="flex items-center justify-center h-16 text-[10px] text-muted-foreground/50">
                      Drop here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <DealCreateDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={loadDeals} />
      <DealDetailDrawer
        deal={selectedDeal}
        onClose={() => {
          setSelectedDeal(null);
          setSearchParams({});
        }}
        onUpdate={loadDeals}
      />
    </div>
  );
}
