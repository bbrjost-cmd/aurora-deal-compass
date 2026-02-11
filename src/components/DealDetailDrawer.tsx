import { useState } from "react";
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
import { useEffect } from "react";
import { FeasibilityTab } from "@/components/FeasibilityTab";
import { generateDealPDF } from "@/lib/pdf-export";

interface Props {
  deal: any;
  onClose: () => void;
  onUpdate: () => void;
}

export function DealDetailDrawer({ deal, onClose, onUpdate }: Props) {
  const { orgId } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [newTask, setNewTask] = useState("");
  const [newNote, setNewNote] = useState("");

  useEffect(() => {
    if (!deal || !orgId) return;
    supabase.from("tasks").select("*").eq("deal_id", deal.id).order("created_at", { ascending: false }).then(({ data }) => setTasks(data || []));
    supabase.from("deal_notes").select("*").eq("deal_id", deal.id).order("created_at", { ascending: false }).then(({ data }) => setNotes(data || []));
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
    generateDealPDF(deal, tasks);
    toast({ title: "PDF exported" });
  };

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
                <TabsTrigger value="feasibility" className="text-xs">Feasibility</TabsTrigger>
                <TabsTrigger value="tasks" className="text-xs">Tasks</TabsTrigger>
                <TabsTrigger value="notes" className="text-xs">Notes</TabsTrigger>
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
                    <p className="font-medium">{deal.rooms_min || '?'} - {deal.rooms_max || '?'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Score</p>
                    <p className="font-medium">{deal.score_total || 0}/100</p>
                  </div>
                  {deal.lat && deal.lon && (
                    <>
                      <div>
                        <p className="text-xs text-muted-foreground">Coordinates</p>
                        <p className="font-medium text-xs">{deal.lat.toFixed(4)}, {deal.lon.toFixed(4)}</p>
                      </div>
                    </>
                  )}
                </div>
                {deal.address && (
                  <div>
                    <p className="text-xs text-muted-foreground">Address</p>
                    <p className="text-sm">{deal.address}</p>
                  </div>
                )}
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
                </div>
              </TabsContent>

              <TabsContent value="notes" className="mt-3 space-y-3">
                <div className="flex gap-2">
                  <Textarea placeholder="Add note..." value={newNote} onChange={(e) => setNewNote(e.target.value)} className="min-h-[60px]" />
                </div>
                <Button size="sm" onClick={addNote} className="w-full">Add Note</Button>
                <div className="space-y-2">
                  {notes.map((note) => (
                    <div key={note.id} className="p-2 bg-secondary rounded text-sm">
                      <p>{note.content}</p>
                      <p className="text-xs text-muted-foreground mt-1">{new Date(note.created_at).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="export" className="mt-3 space-y-3">
                <p className="text-sm text-muted-foreground">Generate a 1-page Investment Memo PDF for this deal.</p>
                <Button onClick={exportPDF} className="w-full">Download PDF Memo</Button>
              </TabsContent>
            </Tabs>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
