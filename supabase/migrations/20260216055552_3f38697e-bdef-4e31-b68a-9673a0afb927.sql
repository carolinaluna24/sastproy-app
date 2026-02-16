-- Fix: allow project creator to SELECT their own project
DROP POLICY IF EXISTS "projects_select" ON public.projects;
CREATE POLICY "projects_select" ON public.projects
  FOR SELECT
  USING (
    created_by = auth.uid()
    OR is_coordinator(auth.uid())
    OR is_decano(auth.uid())
    OR is_project_member(id, auth.uid())
    OR is_assigned_to_project(id, auth.uid())
    OR director_id = auth.uid()
  );