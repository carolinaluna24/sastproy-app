
-- Drop the existing restrictive SELECT policy
DROP POLICY "profiles_select" ON public.user_profiles;

-- Create a new policy allowing all authenticated users to read profiles
CREATE POLICY "profiles_select"
  ON public.user_profiles
  FOR SELECT
  USING (auth.uid() IS NOT NULL);
