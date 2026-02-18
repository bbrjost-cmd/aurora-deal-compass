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
  initialTab?: string;
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

export function DealDetailDrawer({ deal, onClose, onUpdate, initialTab }: Props) {
  const { orgId } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [newTask, setNewTask] = useState("");
  const [newNote, setNewNote] = useState("");
  const [feasInputs, setFeasInputs] = useState<FeasibilityInputs | null>(null);
  const [activeTab, setActiveTab] = useState(initialTab || "overview");

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab, deal?.id]);

  useEffect(() => {
    if (!deal || !orgId) return;
    setActiveTab(initialTab || "overview");
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
  }, [deal?.id, orgId]);

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
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-0" side="right">
        {deal && (
          <>
            {/* Sticky header */}
            <div className="sticky top-0 z-10 bg-background border-b border-border px-4 pt-4 pb-3">
              <SheetHeader>
                <SheetTitle className="flex items-start gap-2 flex-wrap text-base">
                  <span className="leading-tight">{deal.name}</span>
                  <Badge className={cn("text-xs shrink-0", STAGE_COLORS[deal.stage])}>{STAGE_LABELS[deal.stage]}</Badge>
                </SheetTitle>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-muted-foreground truncate flex-1">{deal.city}, {deal.state}</p>
                  <div className="flex items-center gap-1 shrink-0">
                    <Gauge className={cn("h-3 w-3", COMPLETENESS_COLOR(completeness.score))} />
                    <span className={cn("text-xs font-semibold", COMPLETENESS_COLOR(completeness.score))}>
                      {completeness.score}%
                    </span>
                  </div>
                </div>
                <Progress value={completeness.score} className="h-1 mt-1" />
              </SheetHeader>
            </div>

            <div className="p-4">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                {/* Tabs — scrollable on mobile */}
                <div className="overflow-x-auto -mx-4 px-4 mb-4">
                  <TabsList className="flex w-max min-w-full h-8 gap-0">
                    <TabsTrigger value="overview" className="text-[10px] px-3 flex-1 min-w-[60px]">Overview</TabsTrigger>
                    <TabsTrigger value="brands" className="text-[10px] px-3 flex-1 min-w-[55px]">Brands</TabsTrigger>
                    <TabsTrigger value="feasibility" className="text-[10px] px-3 flex-1 min-w-[55px]">Feas.</TabsTrigger>
                    <TabsTrigger value="ic" className="text-[10px] px-3 flex-1 min-w-[40px]">IC</TabsTrigger>
                    <TabsTrigger value="loi" className="text-[10px] px-3 flex-1 min-w-[40px]">LOI</TabsTrigger>
                    <TabsTrigger value="tasks" className="text-[10px] px-3 flex-1 min-w-[50px]">Tasks</TabsTrigger>
                  </TabsList>
                </div>

                {/* ── OVERVIEW ── */}
                <TabsContent value="overview" className="space-y-3 mt-0">
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
                        <p className="font-medium text-xs lg:text-sm">{f.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Quick actions */}
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={exportPDF}>
                      <FileDown className="h-3 w-3" /> IC Memo PDF
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setActiveTab("ic")}>
                      <Star className="h-3 w-3" /> IC Decision
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setActiveTab("loi")}>
                      <CheckSquare className="h-3 w-3" /> LOI
                    </Button>
                  </div>

                  {/* Notes */}
                  <div className="pt-2 border-t border-border">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Notes</p>
                    <Textarea
                      placeholder="Add note..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      className="min-h-[60px] text-xs"
                      onKeyDown={(e) => e.key === "Enter" && e.ctrlKey && addNote()}
                    />
                    <Button size="sm" onClick={addNote} className="w-full h-7 mt-2 mb-3 text-xs">Add Note</Button>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {notes.map((note) => (
                        <div key={note.id} className="p-2 bg-secondary rounded text-xs">
                          <p className="leading-relaxed">{note.content}</p>
                          <p className="text-muted-foreground mt-1 text-[10px]">{new Date(note.created_at).toLocaleString("fr-MX")}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                {/* ── BRANDS ── */}
                <TabsContent value="brands" className="space-y-4 mt-0">
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
                        <span className="text-aurora-gold font-bold shrink-0">✓</span><span>{p}</span>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                {/* ── FEASIBILITY ── */}
                <TabsContent value="feasibility" className="mt-0">
                  <FeasibilityTab dealId={deal.id} deal={deal} onInputsChange={setFeasInputs} />
                </TabsContent>

                {/* ── IC DECISION ── */}
                <TabsContent value="ic" className="mt-0">
                  <ICDecisionPanel
                    deal={deal}
                    feasInputs={feasInputs}
                    contactCount={contacts.length}
                    onSave={onUpdate}
                  />
                </TabsContent>

                {/* ── LOI ── */}
                <TabsContent value="loi" className="mt-0">
                  <LOITab deal={deal} feasInputs={feasInputs} />
                </TabsContent>

                {/* ── TASKS ── */}
                <TabsContent value="tasks" className="space-y-3 mt-0">
                  <div className="flex gap-2">
                    <Input placeholder="New task..." value={newTask} onChange={(e) => setNewTask(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addTask()} className="text-xs h-8" />
                    <Button size="sm" onClick={addTask} className="h-8 px-3">Add</Button>
                  </div>
                  <div className="space-y-1">
                    {tasks.map((task) => (
                      <div key={task.id} className="flex items-center gap-2 py-2 border-b border-border">
                        <input type="checkbox" checked={task.status === "done"}
                          onChange={() => toggleTask(task.id, task.status)}
                          className="rounded h-4 w-4 shrink-0" />
                        <span className={cn("text-xs flex-1", task.status === "done" && "line-through text-muted-foreground")}>
                          {task.title}
                        </span>
                        {task.due_date && <span className="text-[10px] text-muted-foreground shrink-0">{task.due_date}</span>}
                      </div>
                    ))}
                    {tasks.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No tasks yet.</p>}
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
