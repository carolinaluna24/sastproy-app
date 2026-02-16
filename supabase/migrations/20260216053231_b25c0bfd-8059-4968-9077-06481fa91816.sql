
-- Drop the restrictive policy and recreate as permissive
DROP POLICY IF EXISTS "projects_insert" ON public.projects;

CREATE POLICY "projects_insert"
ON public.projects
FOR INSERT
TO authenticated
WITH CHECK ((created_by = auth.uid()) AND has_role(auth.uid(), 'STUDENT'::app_role));
