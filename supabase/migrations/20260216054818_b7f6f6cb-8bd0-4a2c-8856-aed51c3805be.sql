
-- Fix projects_insert: change from RESTRICTIVE to PERMISSIVE
DROP POLICY IF EXISTS "projects_insert" ON public.projects;
CREATE POLICY "projects_insert" ON public.projects
  FOR INSERT
  WITH CHECK ((created_by = auth.uid()) AND has_role(auth.uid(), 'STUDENT'::app_role));

-- Fix project_members members_insert: change from RESTRICTIVE to PERMISSIVE
DROP POLICY IF EXISTS "members_insert" ON public.project_members;
CREATE POLICY "members_insert" ON public.project_members
  FOR INSERT
  WITH CHECK (is_coordinator(auth.uid()) OR (EXISTS (
    SELECT 1 FROM projects WHERE projects.id = project_members.project_id AND projects.created_by = auth.uid()
  )));

-- Fix project_stages stages_insert: change from RESTRICTIVE to PERMISSIVE
DROP POLICY IF EXISTS "stages_insert" ON public.project_stages;
CREATE POLICY "stages_insert" ON public.project_stages
  FOR INSERT
  WITH CHECK (is_coordinator(auth.uid()) OR (EXISTS (
    SELECT 1 FROM projects WHERE projects.id = project_stages.project_id AND projects.created_by = auth.uid()
  )));

-- Fix audit_events audit_insert: change from RESTRICTIVE to PERMISSIVE
DROP POLICY IF EXISTS "audit_insert" ON public.audit_events;
CREATE POLICY "audit_insert" ON public.audit_events
  FOR INSERT
  WITH CHECK (user_id = auth.uid());
