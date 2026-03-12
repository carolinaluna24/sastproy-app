
-- Tabla de configuración por modalidad (escalabilidad)
CREATE TABLE public.modality_configs (
  modality_id uuid NOT NULL PRIMARY KEY REFERENCES public.modalities(id),
  enabled boolean NOT NULL DEFAULT true,
  implemented boolean NOT NULL DEFAULT false,
  description text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.modality_configs ENABLE ROW LEVEL SECURITY;

-- Lectura para todos los usuarios autenticados
CREATE POLICY "modality_configs_select"
  ON public.modality_configs FOR SELECT
  USING (true);

-- Solo coordinador puede modificar
CREATE POLICY "modality_configs_update"
  ON public.modality_configs FOR UPDATE
  USING (is_coordinator(auth.uid()));
