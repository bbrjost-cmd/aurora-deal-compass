
-- Create orgs table
CREATE TABLE public.orgs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.orgs ENABLE ROW LEVEL SECURITY;

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.orgs(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create app_role enum and user_roles table
CREATE TYPE public.app_role AS ENUM ('admin', 'member');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Helper function to get user's org_id
CREATE OR REPLACE FUNCTION public.get_user_org_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_id FROM public.profiles WHERE id = _user_id
$$;

-- Deals table
CREATE TABLE public.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  lat DOUBLE PRECISION,
  lon DOUBLE PRECISION,
  state TEXT,
  city TEXT,
  address TEXT,
  segment TEXT DEFAULT 'midscale',
  opening_type TEXT DEFAULT 'new_build',
  rooms_min INTEGER,
  rooms_max INTEGER,
  stage TEXT NOT NULL DEFAULT 'lead',
  score_total INTEGER DEFAULT 0,
  score_breakdown JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

-- Contacts table
CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES public.deals(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT,
  company TEXT,
  email TEXT,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Tasks table
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES public.deals(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Notes table
CREATE TABLE public.deal_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES public.deals(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.deal_notes ENABLE ROW LEVEL SECURITY;

-- Docs table
CREATE TABLE public.docs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES public.deals(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT,
  storage_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.docs ENABLE ROW LEVEL SECURITY;

-- Feasibility inputs
CREATE TABLE public.feasibility_inputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES public.deals(id) ON DELETE CASCADE,
  inputs JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.feasibility_inputs ENABLE ROW LEVEL SECURITY;

-- Feasibility outputs
CREATE TABLE public.feasibility_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES public.deals(id) ON DELETE CASCADE,
  outputs JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.feasibility_outputs ENABLE ROW LEVEL SECURITY;

-- Cached Overpass results
CREATE TABLE public.cached_overpass (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_hash TEXT NOT NULL,
  layer TEXT NOT NULL,
  center_lat DOUBLE PRECISION NOT NULL,
  center_lon DOUBLE PRECISION NOT NULL,
  radius_m INTEGER NOT NULL,
  geojson JSONB NOT NULL DEFAULT '{}',
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.cached_overpass ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_cached_overpass_hash ON public.cached_overpass(query_hash);

-- Geo boundaries
CREATE TABLE public.geo_boundaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  geojson JSONB NOT NULL DEFAULT '{}',
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.geo_boundaries ENABLE ROW LEVEL SECURITY;

-- City settings
CREATE TABLE public.city_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  center_lat DOUBLE PRECISION NOT NULL,
  center_lon DOUBLE PRECISION NOT NULL
);
ALTER TABLE public.city_settings ENABLE ROW LEVEL SECURITY;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_deals_updated_at BEFORE UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_feasibility_inputs_updated_at BEFORE UPDATE ON public.feasibility_inputs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_feasibility_outputs_updated_at BEFORE UPDATE ON public.feasibility_outputs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies

-- Orgs: users can see their own org
CREATE POLICY "Users can view own org" ON public.orgs FOR SELECT USING (id = public.get_user_org_id(auth.uid()));

-- Profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (id = auth.uid());

-- User roles
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (user_id = auth.uid());

-- Deals: org-scoped
CREATE POLICY "Users can view org deals" ON public.deals FOR SELECT USING (org_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Users can insert org deals" ON public.deals FOR INSERT WITH CHECK (org_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Users can update org deals" ON public.deals FOR UPDATE USING (org_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Users can delete org deals" ON public.deals FOR DELETE USING (org_id = public.get_user_org_id(auth.uid()));

-- Contacts: org-scoped
CREATE POLICY "Users can view org contacts" ON public.contacts FOR SELECT USING (org_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Users can insert org contacts" ON public.contacts FOR INSERT WITH CHECK (org_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Users can update org contacts" ON public.contacts FOR UPDATE USING (org_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Users can delete org contacts" ON public.contacts FOR DELETE USING (org_id = public.get_user_org_id(auth.uid()));

-- Tasks: org-scoped
CREATE POLICY "Users can view org tasks" ON public.tasks FOR SELECT USING (org_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Users can insert org tasks" ON public.tasks FOR INSERT WITH CHECK (org_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Users can update org tasks" ON public.tasks FOR UPDATE USING (org_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Users can delete org tasks" ON public.tasks FOR DELETE USING (org_id = public.get_user_org_id(auth.uid()));

-- Notes: org-scoped
CREATE POLICY "Users can view org notes" ON public.deal_notes FOR SELECT USING (org_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Users can insert org notes" ON public.deal_notes FOR INSERT WITH CHECK (org_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Users can delete org notes" ON public.deal_notes FOR DELETE USING (org_id = public.get_user_org_id(auth.uid()));

-- Docs: org-scoped
CREATE POLICY "Users can view org docs" ON public.docs FOR SELECT USING (org_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Users can insert org docs" ON public.docs FOR INSERT WITH CHECK (org_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Users can delete org docs" ON public.docs FOR DELETE USING (org_id = public.get_user_org_id(auth.uid()));

-- Feasibility: org-scoped
CREATE POLICY "Users can view org feasibility inputs" ON public.feasibility_inputs FOR SELECT USING (org_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Users can insert org feasibility inputs" ON public.feasibility_inputs FOR INSERT WITH CHECK (org_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Users can update org feasibility inputs" ON public.feasibility_inputs FOR UPDATE USING (org_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Users can view org feasibility outputs" ON public.feasibility_outputs FOR SELECT USING (org_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Users can insert org feasibility outputs" ON public.feasibility_outputs FOR INSERT WITH CHECK (org_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Users can update org feasibility outputs" ON public.feasibility_outputs FOR UPDATE USING (org_id = public.get_user_org_id(auth.uid()));

-- Cached overpass: public read for caching, authenticated insert
CREATE POLICY "Anyone can read cached overpass" ON public.cached_overpass FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert cached overpass" ON public.cached_overpass FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Geo boundaries: org-scoped
CREATE POLICY "Users can view org boundaries" ON public.geo_boundaries FOR SELECT USING (org_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Users can insert org boundaries" ON public.geo_boundaries FOR INSERT WITH CHECK (org_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Users can delete org boundaries" ON public.geo_boundaries FOR DELETE USING (org_id = public.get_user_org_id(auth.uid()));

-- City settings: org-scoped
CREATE POLICY "Users can view org city settings" ON public.city_settings FOR SELECT USING (org_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Users can insert org city settings" ON public.city_settings FOR INSERT WITH CHECK (org_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Users can update org city settings" ON public.city_settings FOR UPDATE USING (org_id = public.get_user_org_id(auth.uid()));

-- Trigger to auto-create profile + demo org on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  _org_id UUID;
BEGIN
  -- Create a default org for the user
  INSERT INTO public.orgs (name) VALUES (COALESCE(NEW.raw_user_meta_data->>'full_name', 'My Organization') || '''s Org')
  RETURNING id INTO _org_id;
  
  -- Create profile
  INSERT INTO public.profiles (id, org_id, email, full_name)
  VALUES (NEW.id, _org_id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  
  -- Assign admin role
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
