
-- ================================================================
-- AURORA DevOS MX — IC Platform Database Additions
-- ================================================================

-- 1. Decision history table
CREATE TABLE public.decision_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  deal_id uuid REFERENCES public.deals(id) ON DELETE CASCADE,
  decision text NOT NULL CHECK (decision IN ('go', 'go_with_conditions', 'no_go')),
  ic_score numeric NOT NULL DEFAULT 0,
  confidence text NOT NULL DEFAULT 'low' CHECK (confidence IN ('high', 'medium', 'low')),
  hard_gates_json jsonb DEFAULT '{}'::jsonb,
  thresholds_json jsonb DEFAULT '{}'::jsonb,
  conditions_json jsonb DEFAULT '[]'::jsonb,
  red_flags_json jsonb DEFAULT '[]'::jsonb,
  narrative_text text,
  data_completeness numeric DEFAULT 0,
  overridden_by_profile_id uuid REFERENCES public.profiles(id),
  override_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.decision_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org decisions" ON public.decision_history
  FOR SELECT USING (org_id = get_user_org_id(auth.uid()));

CREATE POLICY "Users can insert org decisions" ON public.decision_history
  FOR INSERT WITH CHECK (org_id = get_user_org_id(auth.uid()));

CREATE POLICY "Users can update org decisions" ON public.decision_history
  FOR UPDATE USING (org_id = get_user_org_id(auth.uid()));

-- 2. Audit log table
CREATE TABLE public.audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  action text NOT NULL,
  actor_profile_id uuid REFERENCES public.profiles(id),
  diff_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org audit log" ON public.audit_log
  FOR SELECT USING (org_id = get_user_org_id(auth.uid()));

CREATE POLICY "Users can insert audit log" ON public.audit_log
  FOR INSERT WITH CHECK (org_id = get_user_org_id(auth.uid()));

-- 3. Org thresholds (editable IC parameters per org)
CREATE TABLE public.org_thresholds (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL UNIQUE REFERENCES public.orgs(id) ON DELETE CASCADE,
  min_net_fees_usd numeric NOT NULL DEFAULT 350000,
  min_roi_pct numeric NOT NULL DEFAULT 18,
  max_payback_years numeric NOT NULL DEFAULT 6,
  min_yoc_upscale numeric NOT NULL DEFAULT 0.08,
  min_yoc_luxury numeric NOT NULL DEFAULT 0.07,
  min_dscr numeric NOT NULL DEFAULT 1.30,
  min_rooms_upscale integer NOT NULL DEFAULT 70,
  competitor_density_threshold integer NOT NULL DEFAULT 3,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.org_thresholds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org thresholds" ON public.org_thresholds
  FOR SELECT USING (org_id = get_user_org_id(auth.uid()));

CREATE POLICY "Users can insert org thresholds" ON public.org_thresholds
  FOR INSERT WITH CHECK (org_id = get_user_org_id(auth.uid()));

CREATE POLICY "Users can update org thresholds" ON public.org_thresholds
  FOR UPDATE USING (org_id = get_user_org_id(auth.uid()));

-- 4. City benchmarks table
CREATE TABLE public.city_benchmarks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  city text NOT NULL,
  state text,
  adr_low numeric NOT NULL DEFAULT 2000,
  adr_high numeric NOT NULL DEFAULT 6000,
  occ_low numeric NOT NULL DEFAULT 0.55,
  occ_high numeric NOT NULL DEFAULT 0.80,
  gop_low numeric NOT NULL DEFAULT 0.30,
  gop_high numeric NOT NULL DEFAULT 0.45,
  cap_rate_low numeric NOT NULL DEFAULT 0.06,
  cap_rate_high numeric NOT NULL DEFAULT 0.10,
  source_note text DEFAULT 'Internal placeholder — replace with proprietary data',
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(org_id, city)
);

ALTER TABLE public.city_benchmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org benchmarks" ON public.city_benchmarks
  FOR SELECT USING (org_id = get_user_org_id(auth.uid()));

CREATE POLICY "Users can insert org benchmarks" ON public.city_benchmarks
  FOR INSERT WITH CHECK (org_id = get_user_org_id(auth.uid()));

CREATE POLICY "Users can update org benchmarks" ON public.city_benchmarks
  FOR UPDATE USING (org_id = get_user_org_id(auth.uid()));

CREATE POLICY "Users can delete org benchmarks" ON public.city_benchmarks
  FOR DELETE USING (org_id = get_user_org_id(auth.uid()));

-- 5. LOI checklist items table
CREATE TABLE public.loi_checklist (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  item text NOT NULL,
  checked boolean NOT NULL DEFAULT false,
  stage_requirement text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.loi_checklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org loi checklist" ON public.loi_checklist
  FOR SELECT USING (org_id = get_user_org_id(auth.uid()));

CREATE POLICY "Users can insert org loi checklist" ON public.loi_checklist
  FOR INSERT WITH CHECK (org_id = get_user_org_id(auth.uid()));

CREATE POLICY "Users can update org loi checklist" ON public.loi_checklist
  FOR UPDATE USING (org_id = get_user_org_id(auth.uid()));

CREATE POLICY "Users can delete org loi checklist" ON public.loi_checklist
  FOR DELETE USING (org_id = get_user_org_id(auth.uid()));

-- 6. Add trigger for updated_at on org_thresholds
CREATE TRIGGER update_org_thresholds_updated_at
  BEFORE UPDATE ON public.org_thresholds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_city_benchmarks_updated_at
  BEFORE UPDATE ON public.city_benchmarks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
