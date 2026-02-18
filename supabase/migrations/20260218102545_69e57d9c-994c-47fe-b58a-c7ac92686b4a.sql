-- Add unique constraint for (query_hash, layer) to support upsert
CREATE UNIQUE INDEX IF NOT EXISTS cached_overpass_hash_layer_unique 
ON public.cached_overpass (query_hash, layer);
