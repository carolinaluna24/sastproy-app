
-- Permitir que miembros del proyecto vean las evaluaciones de sus etapas
DROP POLICY IF EXISTS "evaluations_select" ON public.evaluations;
CREATE POLICY "evaluations_select" ON public.evaluations
FOR SELECT USING (
  evaluator_id = auth.uid()
  OR is_coordinator(auth.uid())
  OR is_decano(auth.uid())
  OR EXISTS (
    SELECT 1 FROM project_stages ps
    WHERE ps.id = evaluations.project_stage_id
    AND has_project_access(ps.project_id, auth.uid())
  )
);
