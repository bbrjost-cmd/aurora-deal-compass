import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { STAGE_LABELS, STAGE_COLORS, SEGMENT_LABELS, OPENING_TYPE_LABELS } from "@/lib/constants";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { FeasibilityTab } from "@/components/FeasibilityTab";
import { generateDealPDF } from "@/lib/pdf-export";
import { computeFeasibility, DEFAULT_INPUTS, type FeasibilityInputs } from "@/lib/feasibility";
import { DESTINATION_BRANDS, LUXURY_PROSPECTS, BRAND_STRATEGY_NOTES, LUXURY_PITCH_POINTS } from "@/lib/accor-brands";
import { FileDown, Star } from "lucide-react";

interface Props {
  deal: any;
  onClose: () => void;
  onUpdate: () => void;
}

function getBrandsForDeal(deal: any): string[] {
  // Try matching by city/destination
  for (const [dest, brands] of Object.entries(DESTINATION_BRANDS)) {
    if (deal.city?.toLowerCase().includes(dest.toLowerCase()) ||
        deal.name?.toLowerCase().includes(dest.toLowerCase())) {
      return brands;
    }
  }
  // Check luxury prospects
  const prospect = LUXURY_PROSPECTS.find(p =>
    deal.name?.toLowerCase().includes(p.owner.toLowerCase()) ||
    deal.name?.toLowerCase().includes(p.name.toLowerCase().split("—")[0].trim())
  );
  if (prospect) return prospect.brands;

  // Default luxury brands
  return ["Emblems Collection", "Sofitel", "MGallery"];
}

export function DealDetailDrawer({ deal, onClose, onUpdate }: Props) {
  const { orgId } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [newTask, setNewTask] = useState("");
  const [newNote, setNewNote] = useState("");
  const [feasInputs, setFeasInputs] = useState<FeasibilityInputs | null>(null);

  useEffect(() => {
    if (!deal || !orgId) return;
    supabase.from("tasks").select("*").eq("deal_id", deal.id).order("created_at", { ascending: false }).then(({ data }) => setTasks(data || []));
    supabase.from("deal_notes").select("*").eq("deal_id", deal.id).order("created_at", { ascending: false }).then(({ data }) => setNotes(data || []));
    supabase.from("feasibility_inputs").select("inputs").eq("deal_id", deal.id).maybeSingle().then(({ data }) => {
      if (data?.inputs) setFeasInputs(data.inputs as unknown as FeasibilityInputs);
    });
  }, [deal, orgId]);

  const addTask = async () => {
    if (!newTask.trim() || !orgId || !deal) return;
    await supabase.from("tasks").insert({ org_id: orgId, deal_id: deal.id, title: newTask });
    setNewTask("");
    supabase.from("tasks").select("*").eq("deal_id", deal.id).order("created_at", { ascending: false }).then(({ data }) => setTasks(data || []));
  };

  const toggleTask = async (id: string, current: string) => {
    await supabase.from("tasks").update({ status: current === "done" ? "pending" : "done" }).eq("id", id);
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: current === "done" ? "pending" : "done" } : t));
  };

  const addNote = async () => {
    if (!newNote.trim() || !orgId || !deal) return;
    await supabase.from("deal_notes").insert({ org_id: orgId, deal_id: deal.id, content: newNote });
    setNewNote("");
    supabase.from("deal_notes").select("*").eq("deal_id", deal.id).order("created_at", { ascending: false }).then(({ data }) => setNotes(data || []));
  };

  const exportPDF = () => {
    if (!deal) return;
    const inputs = feasInputs || DEFAULT_INPUTS;
    const outputs = computeFeasibility(inputs);
    const brands = getBrandsForDeal(deal);
    generateDealPDF(deal, tasks, outputs, brands);
    toast({ title: "PDF exported", description: "Investment memo downloaded." });
  };

  const brands = deal ? getBrandsForDeal(deal) : [];

  return (
    <Sheet open={!!deal} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        {deal && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                {deal.name}
                <Badge className={STAGE_COLORS[deal.stage]}>{STAGE_LABELS[deal.stage]}</Badge>
              </SheetTitle>
              <p className="text-sm text-muted-foreground">{deal.city}, {deal.state}</p>
            </SheetHeader>

            <Tabs defaultValue="overview" className="mt-4">
              <TabsList className="w-full grid grid-cols-5">
                <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
                <TabsTrigger value="brands" className="text-xs">Brands</TabsTrigger>
                <TabsTrigger value="feasibility" className="text-xs">Feasibility</TabsTrigger>
                <TabsTrigger value="tasks" className="text-xs">Tasks</TabsTrigger>
                <TabsTrigger value="export" className="text-xs">Export</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-3 mt-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Segment</p>
                    <p className="font-medium">{SEGMENT_LABELS[deal.segment] || deal.segment}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Opening Type</p>
                    <p className="font-medium">{OPENING_TYPE_LABELS[deal.opening_type] || deal.opening_type}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Rooms</p>
                    <p className="font-medium">{deal.rooms_min || '?'} – {deal.rooms_max || '?'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Score</p>
                    <p className="font-medium">{deal.score_total || 0}/100</p>
                  </div>
                  {deal.lat && deal.lon && (
                    <div>
                      <p className="text-xs text-muted-foreground">Coordinates</p>
                      <p className="font-medium text-xs">{Number(deal.lat).toFixed(4)}, {Number(deal.lon).toFixed(4)}</p>
                    </div>
                  )}
                </div>
                {deal.address && (
                  <div>
                    <p className="text-xs text-muted-foreground">Address</p>
                    <p className="text-sm">{deal.address}</p>
                  </div>
                )}

                {/* Notes section inline */}
                <div className="pt-2 border-t border-border">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Notes</p>
                  <div className="flex gap-2 mb-2">
                    <Textarea placeholder="Add note..." value={newNote} onChange={(e) => setNewNote(e.target.value)} className="min-h-[50px]" />
                  </div>
                  <Button size="sm" onClick={addNote} className="w-full mb-2">Add Note</Button>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {notes.map((note) => (
                      <div key={note.id} className="p-2 bg-secondary rounded text-sm">
                        <p>{note.content}</p>
                        <p className="text-xs text-muted-foreground mt-1">{new Date(note.created_at).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="brands" className="mt-3 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-2">
                    <Star className="h-4 w-4 text-[hsl(var(--aurora-gold))]" />
                    Recommended Accor Brands
                  </h3>
                  <div className="space-y-2">
                    {brands.map((brand) => (
                      <div key={brand} className="p-2.5 bg-secondary rounded-lg">
                        <p className="text-sm font-medium">{brand}</p>
                        <p className="text-xs text-muted-foreground">{BRAND_STRATEGY_NOTES[brand]}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="pt-2 border-t border-border">
                  <h4 className="text-xs font-semibold text-muted-foreground mb-2">KEY PITCH POINTS</h4>
                  <div className="space-y-1">
                    {LUXURY_PITCH_POINTS.map(p => (
                      <div key={p} className="flex items-center gap-2 text-xs">
                        <span className="text-[hsl(var(--aurora-gold))]">✓</span>
                        <span>{p}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="feasibility" className="mt-3">
                <FeasibilityTab dealId={deal.id} />
              </TabsContent>

              <TabsContent value="tasks" className="mt-3 space-y-3">
                <div className="flex gap-2">
                  <Input placeholder="New task..." value={newTask} onChange={(e) => setNewTask(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTask()} />
                  <Button size="sm" onClick={addTask}>Add</Button>
                </div>
                <div className="space-y-1">
                  {tasks.map((task) => (
                    <div key={task.id} className="flex items-center gap-2 py-1.5 border-b border-border">
                      <input type="checkbox" checked={task.status === "done"} onChange={() => toggleTask(task.id, task.status)} className="rounded" />
                      <span className={`text-sm flex-1 ${task.status === "done" ? "line-through text-muted-foreground" : ""}`}>{task.title}</span>
                      {task.due_date && <span className="text-xs text-muted-foreground">{task.due_date}</span>}
                    </div>
                  ))}
                  {tasks.length === 0 && <p className="text-sm text-muted-foreground">No tasks yet.</p>}
                </div>
              </TabsContent>

              <TabsContent value="export" className="mt-3 space-y-3">
                <p className="text-sm text-muted-foreground">Generate a 1-page Investment Memo PDF with deal details, Accor brand recommendations, feasibility projection, and next steps.</p>
                <Button onClick={exportPDF} className="w-full gap-2">
                  <FileDown className="h-4 w-4" />
                  Download PDF Memo
                </Button>
              </TabsContent>
            </Tabs>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
