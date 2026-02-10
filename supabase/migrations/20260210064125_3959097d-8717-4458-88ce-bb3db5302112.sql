
-- Vista: etapa actual de cada proyecto (la más reciente por created_at)
CREATE OR REPLACE VIEW public.v_project_current_stage
WITH (security_invoker = on)
AS
SELECT DISTINCT ON (ps.project_id)
  ps.project_id,
  ps.id AS stage_id,
  ps.stage_name,
  ps.system_state,
  ps.official_state,
  ps.final_grade,
  ps.observations,
  ps.created_at AS stage_created_at,
  ps.updated_at AS stage_updated_at,
  p.title AS project_title,
  p.global_status,
  p.program_id,
  p.modality_id,
  p.director_id,
  p.created_at AS project_created_at,
  prog.name AS program_name,
  m.name AS modality_name
FROM public.project_stages ps
JOIN public.projects p ON p.id = ps.project_id
LEFT JOIN public.programs prog ON prog.id = p.program_id
LEFT JOIN public.modalities m ON m.id = p.modality_id
ORDER BY ps.project_id, ps.created_at DESC;

-- Vista: deadlines con info de riesgo
CREATE OR REPLACE VIEW public.v_deadlines_risk
WITH (security_invoker = on)
AS
SELECT
  d.id AS deadline_id,
  d.due_date,
  d.description AS deadline_description,
  d.created_at AS deadline_created_at,
  ps.id AS stage_id,
  ps.stage_name,
  ps.system_state,
  ps.official_state,
  ps.project_id,
  p.title AS project_title,
  p.global_status,
  prog.name AS program_name,
  EXTRACT(DAY FROM (d.due_date - now()))::integer AS days_remaining,
  CASE
    WHEN d.due_date < now() THEN 'VENCIDO'
    WHEN d.due_date <= now() + interval '3 days' THEN 'POR_VENCER'
    ELSE 'ACTIVO'
  END AS risk_status
FROM public.deadlines d
JOIN public.project_stages ps ON ps.id = d.project_stage_id
JOIN public.projects p ON p.id = ps.project_id
LEFT JOIN public.programs prog ON prog.id = p.program_id
ORDER BY d.due_date ASC;
