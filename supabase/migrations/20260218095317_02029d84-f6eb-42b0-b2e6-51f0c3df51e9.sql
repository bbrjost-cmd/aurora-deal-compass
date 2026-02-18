
-- Drop the conflicting policy and recreate
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Orgs: allow insert (needed for trigger)
DROP POLICY IF EXISTS "Orgs insert on signup" ON public.orgs;
CREATE POLICY "Orgs insert on signup" ON public.orgs
  FOR INSERT WITH CHECK (true);

-- Cached overpass extras
DROP POLICY IF EXISTS "Anyone can update cache" ON public.cached_overpass;
CREATE POLICY "Anyone can update cache" ON public.cached_overpass FOR UPDATE USING (true);

-- Update trigger to handle anon users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id uuid;
BEGIN
  INSERT INTO public.orgs (name)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'full_name', 'My Organization'))
  RETURNING id INTO new_org_id;

  INSERT INTO public.profiles (id, email, full_name, org_id)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    new_org_id
  )
  ON CONFLICT (id) DO UPDATE SET org_id = new_org_id WHERE profiles.org_id IS NULL;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
