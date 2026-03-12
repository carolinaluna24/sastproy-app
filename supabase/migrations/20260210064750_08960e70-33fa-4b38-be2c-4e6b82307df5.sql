
-- Vista catálogo: solo campos públicos permitidos (sin documentos, sin observaciones, sin datos personales)
CREATE OR REPLACE VIEW public.v_catalog_projects
WITH (security_invoker = on)
AS
SELECT
  v.project_id,
  v.project_title AS title,
  v.program_name,
  v.modality_name,
  v.global_status,
  v.project_created_at AS created_at,
  v.stage_name AS current_stage,
  v.official_state AS current_official_state,
  (SELECT COUNT(*)::integer FROM public.project_members pm WHERE pm.project_id = v.project_id AND pm.role = 'AUTHOR') AS author_count
FROM public.v_project_current_stage v;
