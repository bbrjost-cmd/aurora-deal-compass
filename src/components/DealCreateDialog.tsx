import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SEGMENTS, SEGMENT_LABELS, OPENING_TYPES, OPENING_TYPE_LABELS, MEXICO_STATES } from "@/lib/constants";
import { toast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
  defaultLat?: number;
  defaultLon?: number;
}

export function DealCreateDialog({ open, onOpenChange, onCreated, defaultLat, defaultLon }: Props) {
  const { orgId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    state: "",
    city: "",
    address: "",
    lat: defaultLat?.toString() || "",
    lon: defaultLon?.toString() || "",
    segment: "luxury",
    opening_type: "conversion",
    rooms_min: "",
    rooms_max: "",
  });

  // Update lat/lon when defaults change
  useEffect(() => {
    if (defaultLat !== undefined) setForm(f => ({ ...f, lat: defaultLat.toString() }));
    if (defaultLon !== undefined) setForm(f => ({ ...f, lon: defaultLon.toString() }));
  }, [defaultLat, defaultLon]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) return;
    setLoading(true);

    const { error } = await supabase.from("deals").insert({
      org_id: orgId,
      name: form.name,
      state: form.state,
      city: form.city,
      address: form.address,
      lat: form.lat ? parseFloat(form.lat) : null,
      lon: form.lon ? parseFloat(form.lon) : null,
      segment: form.segment,
      opening_type: form.opening_type,
      rooms_min: form.rooms_min ? parseInt(form.rooms_min) : null,
      rooms_max: form.rooms_max ? parseInt(form.rooms_max) : null,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Deal created" });
      setForm({ name: "", state: "", city: "", address: "", lat: "", lon: "", segment: "midscale", opening_type: "new_build", rooms_min: "", rooms_max: "" });
      onCreated();
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Deal</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input placeholder="Deal name *" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} required />
          
          <div className="grid grid-cols-2 gap-2">
            <Select value={form.state} onValueChange={(v) => setForm(f => ({ ...f, state: v }))}>
              <SelectTrigger><SelectValue placeholder="State" /></SelectTrigger>
              <SelectContent>
                {MEXICO_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input placeholder="City" value={form.city} onChange={(e) => setForm(f => ({ ...f, city: e.target.value }))} />
          </div>

          <Input placeholder="Address" value={form.address} onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))} />

          <div className="grid grid-cols-2 gap-2">
            <Input type="number" step="any" placeholder="Latitude" value={form.lat} onChange={(e) => setForm(f => ({ ...f, lat: e.target.value }))} />
            <Input type="number" step="any" placeholder="Longitude" value={form.lon} onChange={(e) => setForm(f => ({ ...f, lon: e.target.value }))} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Select value={form.segment} onValueChange={(v) => setForm(f => ({ ...f, segment: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SEGMENTS.map(s => <SelectItem key={s} value={s}>{SEGMENT_LABELS[s]}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={form.opening_type} onValueChange={(v) => setForm(f => ({ ...f, opening_type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {OPENING_TYPES.map(t => <SelectItem key={t} value={t}>{OPENING_TYPE_LABELS[t]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Input type="number" placeholder="Rooms min" value={form.rooms_min} onChange={(e) => setForm(f => ({ ...f, rooms_min: e.target.value }))} />
            <Input type="number" placeholder="Rooms max" value={form.rooms_max} onChange={(e) => setForm(f => ({ ...f, rooms_max: e.target.value }))} />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating..." : "Create Deal"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
