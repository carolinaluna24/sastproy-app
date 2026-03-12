
-- Fix overly permissive policies

-- members_insert: only allow if user is creator of project or coordinator
DROP POLICY "members_insert" ON public.project_members;
CREATE POLICY "members_insert" ON public.project_members FOR INSERT TO authenticated
  WITH CHECK (
    public.is_coordinator(auth.uid())
    OR EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND created_by = auth.uid())
  );

-- stages_insert: only project creators or coordinators
DROP POLICY "stages_insert" ON public.project_stages;
CREATE POLICY "stages_insert" ON public.project_stages FOR INSERT TO authenticated
  WITH CHECK (
    public.is_coordinator(auth.uid())
    OR EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND created_by = auth.uid())
  );

-- endorsements_insert: only coordinator or director
DROP POLICY "endorsements_insert" ON public.endorsements;
CREATE POLICY "endorsements_insert" ON public.endorsements FOR INSERT TO authenticated
  WITH CHECK (public.is_coordinator(auth.uid()) OR public.has_role(auth.uid(), 'DIRECTOR'));

-- eval_scores_insert: evaluator or coordinator
DROP POLICY "eval_scores_insert" ON public.evaluation_scores;
CREATE POLICY "eval_scores_insert" ON public.evaluation_scores FOR INSERT TO authenticated
  WITH CHECK (
    public.is_coordinator(auth.uid())
    OR EXISTS (SELECT 1 FROM public.evaluations WHERE id = evaluation_id AND evaluator_id = auth.uid())
  );

-- audit_insert: any authenticated user (this is intentional but let's restrict to logged-in users explicitly)
DROP POLICY "audit_insert" ON public.audit_events;
CREATE POLICY "audit_insert" ON public.audit_events FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
