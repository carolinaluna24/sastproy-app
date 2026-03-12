
-- Add identification document fields to user_profiles
ALTER TABLE public.user_profiles
  ADD COLUMN id_type text,
  ADD COLUMN id_number text;

-- Add a unique constraint on id_type + id_number to prevent duplicates
CREATE UNIQUE INDEX idx_user_profiles_id_document ON public.user_profiles (id_type, id_number)
  WHERE id_type IS NOT NULL AND id_number IS NOT NULL;
