
-- Función helper para verificar rol DECANO
CREATE OR REPLACE FUNCTION public.is_decano(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(uid, 'DECANO')
$$;

-- projects: DECANO puede leer todos
DROP POLICY IF EXISTS "projects_select" ON public.projects;
CREATE POLICY "projects_select" ON public.projects
FOR SELECT USING (
  is_coordinator(auth.uid())
  OR is_decano(auth.uid())
  OR is_project_member(id, auth.uid())
  OR is_assigned_to_project(id, auth.uid())
  OR (director_id = auth.uid())
);

-- project_stages
DROP POLICY IF EXISTS "stages_select" ON public.project_stages;
CREATE POLICY "stages_select" ON public.project_stages
FOR SELECT USING (
  has_project_access(project_id, auth.uid())
  OR is_decano(auth.uid())
);

-- project_members
DROP POLICY IF EXISTS "members_select" ON public.project_members;
CREATE POLICY "members_select" ON public.project_members
FOR SELECT USING (
  has_project_access(project_id, auth.uid())
  OR is_decano(auth.uid())
);

-- submissions
DROP POLICY IF EXISTS "submissions_select" ON public.submissions;
CREATE POLICY "submissions_select" ON public.submissions
FOR SELECT USING (
  (submitted_by = auth.uid())
  OR is_coordinator(auth.uid())
  OR is_decano(auth.uid())
  OR (EXISTS (
    SELECT 1 FROM project_stages ps
    WHERE ps.id = submissions.project_stage_id
    AND has_project_access(ps.project_id, auth.uid())
  ))
);

-- evaluations
DROP POLICY IF EXISTS "evaluations_select" ON public.evaluations;
CREATE POLICY "evaluations_select" ON public.evaluations
FOR SELECT USING (
  (evaluator_id = auth.uid())
  OR is_coordinator(auth.uid())
  OR is_decano(auth.uid())
);

-- audit_events
DROP POLICY IF EXISTS "audit_select" ON public.audit_events;
CREATE POLICY "audit_select" ON public.audit_events
FOR SELECT USING (
  is_coordinator(auth.uid())
  OR is_decano(auth.uid())
);

-- user_profiles
DROP POLICY IF EXISTS "profiles_select" ON public.user_profiles;
CREATE POLICY "profiles_select" ON public.user_profiles
FOR SELECT USING (
  (id = auth.uid())
  OR is_coordinator(auth.uid())
  OR has_role(auth.uid(), 'DIRECTOR')
  OR has_role(auth.uid(), 'JUROR')
  OR is_decano(auth.uid())
);

-- assignments
DROP POLICY IF EXISTS "assignments_select" ON public.assignments;
CREATE POLICY "assignments_select" ON public.assignments
FOR SELECT USING (
  (user_id = auth.uid())
  OR is_coordinator(auth.uid())
  OR is_decano(auth.uid())
);

-- deadlines
DROP POLICY IF EXISTS "deadlines_select" ON public.deadlines;
CREATE POLICY "deadlines_select" ON public.deadlines
FOR SELECT USING (
  is_coordinator(auth.uid())
  OR is_decano(auth.uid())
  OR (EXISTS (
    SELECT 1 FROM project_stages ps
    WHERE ps.id = deadlines.project_stage_id
    AND has_project_access(ps.project_id, auth.uid())
  ))
);

-- user_roles
DROP POLICY IF EXISTS "roles_select" ON public.user_roles;
CREATE POLICY "roles_select" ON public.user_roles
FOR SELECT USING (
  (user_id = auth.uid())
  OR is_coordinator(auth.uid())
  OR is_decano(auth.uid())
);
