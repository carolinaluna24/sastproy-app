
-- Sprint 2: Tabla defense_sessions para programar sustentación

CREATE TABLE public.defense_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stage_id uuid NOT NULL REFERENCES public.project_stages(id),
  scheduled_at timestamp with time zone NOT NULL,
  location text NOT NULL,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.defense_sessions ENABLE ROW LEVEL SECURITY;

-- Solo coordinador puede crear
CREATE POLICY "defense_sessions_insert" ON public.defense_sessions
  FOR INSERT WITH CHECK (is_coordinator(auth.uid()));

-- Coordinador, miembros del proyecto y asignados pueden ver
CREATE POLICY "defense_sessions_select" ON public.defense_sessions
  FOR SELECT USING (
    is_coordinator(auth.uid())
    OR EXISTS (
      SELECT 1 FROM project_stages ps
      WHERE ps.id = defense_sessions.stage_id
        AND has_project_access(ps.project_id, auth.uid())
    )
  );

-- Solo coordinador puede actualizar
CREATE POLICY "defense_sessions_update" ON public.defense_sessions
  FOR UPDATE USING (is_coordinator(auth.uid()));
