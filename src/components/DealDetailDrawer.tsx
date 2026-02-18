import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { STAGE_LABELS, STAGE_COLORS, SEGMENT_LABELS, OPENING_TYPE_LABELS } from "@/lib/constants";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { FeasibilityTab } from "@/components/FeasibilityTab";
import { ICDecisionPanel } from "@/components/ICDecisionPanel";
import { LOITab } from "@/components/LOITab";
import { generateICMemo } from "@/lib/pdf-export";
import { computeFeasibility, DEFAULT_INPUTS, type FeasibilityInputs } from "@/lib/feasibility";
import { computeCompleteness } from "@/lib/ic-engine";
import { DESTINATION_BRANDS, LUXURY_PROSPECTS, BRAND_STRATEGY_NOTES, LUXURY_PITCH_POINTS } from "@/lib/accor-brands";
import { FileDown, Star, CheckSquare, Gauge } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  deal: any;
  onClose: () => void;
  onUpdate: () => void;
}

function getBrandsForDeal(deal: any): string[] {
  for (const [dest, brands] of Object.entries(DESTINATION_BRANDS)) {
    if (deal.city?.toLowerCase().includes(dest.toLowerCase()) ||
      deal.name?.toLowerCase().includes(dest.toLowerCase())) return brands;
  }
  const prospect = LUXURY_PROSPECTS.find(p =>
    deal.name?.toLowerCase().includes(p.name.toLowerCase().split("—")[0].trim())
  );
  if (prospect) return prospect.brands;
  return ["Emblems Collection", "Sofitel", "MGallery"];
}

const COMPLETENESS_COLOR = (score: number) =>
  score >= 80 ? "text-ic-go" : score >= 55 ? "text-ic-conditions" : "text-ic-nogo";

export function DealDetailDrawer({ deal, onClose, onUpdate }: Props) {
  const { orgId } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [newTask, setNewTask] = useState("");
  const [newNote, setNewNote] = useState("");
  const [feasInputs, setFeasInputs] = useState<FeasibilityInputs | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (!deal || !orgId) return;
    Promise.all([
      supabase.from("tasks").select("*").eq("deal_id", deal.id).order("created_at", { ascending: false }),
      supabase.from("deal_notes").select("*").eq("deal_id", deal.id).order("created_at", { ascending: false }),
      supabase.from("contacts").select("*").eq("deal_id", deal.id),
      supabase.from("feasibility_inputs").select("inputs").eq("deal_id", deal.id).maybeSingle(),
    ]).then(([t, n, c, f]) => {
      setTasks(t.data || []);
      setNotes(n.data || []);
      setContacts(c.data || []);
      if (f.data?.inputs) setFeasInputs(f.data.inputs as unknown as FeasibilityInputs);
    });
  }, [deal, orgId]);

  const completeness = deal ? computeCompleteness(deal, !!feasInputs, contacts.length) : { score: 0, missing: [] };

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
    generateICMemo(deal, tasks, inputs, outputs, brands, contacts);
    toast({ title: "IC Memo exported", description: "Investment memo PDF downloaded." });
  };

  const brands = deal ? getBrandsForDeal(deal) : [];

  return (
    <Sheet open={!!deal} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-0">
        {deal && (
          <>
            {/* Sticky header */}
            <div className="sticky top-0 z-10 bg-background border-b border-border p-4">
              <SheetHeader>
                <SheetTitle className="flex items-start gap-2 flex-wrap">
                  <span className="leading-tight">{deal.name}</span>
                  <Badge className={STAGE_COLORS[deal.stage]}>{STAGE_LABELS[deal.stage]}</Badge>
                </SheetTitle>
                <div className="flex items-center gap-3 mt-1">
                  <p className="text-xs text-muted-foreground">{deal.city}, {deal.state}</p>
                  <div className="flex items-center gap-1.5 ml-auto">
                    <Gauge className={cn("h-3.5 w-3.5", COMPLETENESS_COLOR(completeness.score))} />
                    <span className={cn("text-xs font-semibold", COMPLETENESS_COLOR(completeness.score))}>
                      {completeness.score}% complete
                    </span>
                  </div>
                </div>
                <Progress value={completeness.score} className="h-1 mt-1" />
              </SheetHeader>
            </div>

            <div className="p-4">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full grid grid-cols-6 h-8 mb-4">
                  <TabsTrigger value="overview" className="text-[10px]">Overview</TabsTrigger>
                  <TabsTrigger value="brands" className="text-[10px]">Brands</TabsTrigger>
                  <TabsTrigger value="feasibility" className="text-[10px]">Feas.</TabsTrigger>
                  <TabsTrigger value="ic" className="text-[10px]">IC</TabsTrigger>
                  <TabsTrigger value="loi" className="text-[10px]">LOI</TabsTrigger>
                  <TabsTrigger value="tasks" className="text-[10px]">Tasks</TabsTrigger>
                </TabsList>

                {/* ── OVERVIEW ── */}
                <TabsContent value="overview" className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {[
                      { label: "Segment", value: SEGMENT_LABELS[deal.segment] || deal.segment },
                      { label: "Opening Type", value: OPENING_TYPE_LABELS[deal.opening_type] || deal.opening_type },
                      { label: "Rooms", value: `${deal.rooms_min || '?'} – ${deal.rooms_max || '?'}` },
                      { label: "Qual. Score", value: `${deal.score_total || 0}/100` },
                      deal.lat && deal.lon && { label: "Coords", value: `${Number(deal.lat).toFixed(4)}, ${Number(deal.lon).toFixed(4)}` },
                      deal.address && { label: "Address", value: deal.address },
                    ].filter(Boolean).map((f: any) => (
                      <div key={f.label}>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{f.label}</p>
                        <p className="font-medium text-sm">{f.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Quick actions */}
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={exportPDF}>
                      <FileDown className="h-3.5 w-3.5" /> Export IC Memo
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setActiveTab("ic")}>
                      <Star className="h-3.5 w-3.5" /> View IC Decision
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setActiveTab("loi")}>
                      <CheckSquare className="h-3.5 w-3.5" /> LOI Checklist
                    </Button>
                  </div>

                  {/* Notes */}
                  <div className="pt-2 border-t border-border">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Notes</p>
                    <div className="flex gap-2 mb-2">
                      <Textarea placeholder="Add note..." value={newNote} onChange={(e) => setNewNote(e.target.value)} className="min-h-[44px] text-xs" />
                    </div>
                    <Button size="sm" onClick={addNote} className="w-full h-7 mb-2 text-xs">Add Note</Button>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {notes.map((note) => (
                        <div key={note.id} className="p-2 bg-secondary rounded text-xs">
                          <p className="leading-relaxed">{note.content}</p>
                          <p className="text-muted-foreground mt-1">{new Date(note.created_at).toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                {/* ── BRANDS ── */}
                <TabsContent value="brands" className="space-y-4">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 mb-3">
                      <Star className="h-3.5 w-3.5 text-aurora-gold" /> Recommended Accor Brands
                    </h3>
                    <div className="space-y-2">
                      {brands.map((brand) => (
                        <div key={brand} className="p-2.5 bg-secondary rounded-lg border border-border">
                          <p className="text-sm font-semibold">{brand}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{BRAND_STRATEGY_NOTES[brand]}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="pt-2 border-t border-border">
                    <h4 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Key Pitch Points</h4>
                    {LUXURY_PITCH_POINTS.map(p => (
                      <div key={p} className="flex items-center gap-2 text-xs py-0.5">
                        <span className="text-aurora-gold font-bold">✓</span><span>{p}</span>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                {/* ── FEASIBILITY ── */}
                <TabsContent value="feasibility">
                  <FeasibilityTab dealId={deal.id} deal={deal} onInputsChange={setFeasInputs} />
                </TabsContent>

                {/* ── IC DECISION ── */}
                <TabsContent value="ic">
                  <ICDecisionPanel
                    deal={deal}
                    feasInputs={feasInputs}
                    contactCount={contacts.length}
                    onSave={onUpdate}
                  />
                </TabsContent>

                {/* ── LOI ── */}
                <TabsContent value="loi">
                  <LOITab deal={deal} feasInputs={feasInputs} />
                </TabsContent>

                {/* ── TASKS ── */}
                <TabsContent value="tasks" className="space-y-3">
                  <div className="flex gap-2">
                    <Input placeholder="New task..." value={newTask} onChange={(e) => setNewTask(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addTask()} className="text-xs h-8" />
                    <Button size="sm" onClick={addTask} className="h-8">Add</Button>
                  </div>
                  <div className="space-y-1">
                    {tasks.map((task) => (
                      <div key={task.id} className="flex items-center gap-2 py-1.5 border-b border-border">
                        <input type="checkbox" checked={task.status === "done"}
                          onChange={() => toggleTask(task.id, task.status)} className="rounded" />
                        <span className={cn("text-sm flex-1", task.status === "done" && "line-through text-muted-foreground")}>
                          {task.title}
                        </span>
                        {task.due_date && <span className="text-xs text-muted-foreground">{task.due_date}</span>}
                      </div>
                    ))}
                    {tasks.length === 0 && <p className="text-xs text-muted-foreground">No tasks yet.</p>}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
