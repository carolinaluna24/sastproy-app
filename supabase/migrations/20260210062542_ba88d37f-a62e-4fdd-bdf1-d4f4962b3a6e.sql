
-- Sprint 1: Cambios DB para flujo ANTEPROYECTO

-- 1. Agregar director_id a projects
ALTER TABLE public.projects ADD COLUMN director_id uuid REFERENCES public.user_profiles(id);

-- 2. Agregar due_date a assignments (plazo de evaluación para jurados)
ALTER TABLE public.assignments ADD COLUMN due_date timestamp with time zone;

-- 3. Agregar official_result y project_stage_id a evaluations
ALTER TABLE public.evaluations ADD COLUMN official_result text;
ALTER TABLE public.evaluations ADD COLUMN project_stage_id uuid REFERENCES public.project_stages(id);

-- 4. Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_assignments_user_id ON public.assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_assignments_stage_name ON public.assignments(stage_name);

-- 5. Actualizar has_project_access para incluir director
CREATE OR REPLACE FUNCTION public.has_project_access(p_project_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_coordinator(p_user_id)
    OR public.is_project_member(p_project_id, p_user_id)
    OR public.is_assigned_to_project(p_project_id, p_user_id)
    OR EXISTS (SELECT 1 FROM public.projects WHERE id = p_project_id AND director_id = p_user_id)
$$;

-- 6. Actualizar policy de projects_select para incluir director
DROP POLICY IF EXISTS "projects_select" ON public.projects;
CREATE POLICY "projects_select" ON public.projects FOR SELECT
  USING (
    is_coordinator(auth.uid())
    OR is_project_member(id, auth.uid())
    OR is_assigned_to_project(id, auth.uid())
    OR director_id = auth.uid()
  );

-- 7. Permitir al coordinador actualizar assignments (para asignar jurados)
DROP POLICY IF EXISTS "assignments_insert" ON public.assignments;
CREATE POLICY "assignments_insert" ON public.assignments FOR INSERT
  WITH CHECK (is_coordinator(auth.uid()));

-- 8. Permitir que jurados vean evaluaciones de sus propias stages asignadas
DROP POLICY IF EXISTS "evaluations_select" ON public.evaluations;
CREATE POLICY "evaluations_select" ON public.evaluations FOR SELECT
  USING (
    evaluator_id = auth.uid()
    OR is_coordinator(auth.uid())
  );

-- 9. Permitir que el director vea endorsements y pueda crear
DROP POLICY IF EXISTS "endorsements_insert" ON public.endorsements;
CREATE POLICY "endorsements_insert" ON public.endorsements FOR INSERT
  WITH CHECK (
    is_coordinator(auth.uid())
    OR has_role(auth.uid(), 'DIRECTOR'::app_role)
  );

-- 10. Permitir a directores ver perfiles (para que el sistema funcione)
DROP POLICY IF EXISTS "profiles_select" ON public.user_profiles;
CREATE POLICY "profiles_select" ON public.user_profiles FOR SELECT
  USING (
    id = auth.uid()
    OR is_coordinator(auth.uid())
    OR has_role(auth.uid(), 'DIRECTOR'::app_role)
    OR has_role(auth.uid(), 'JUROR'::app_role)
  );
