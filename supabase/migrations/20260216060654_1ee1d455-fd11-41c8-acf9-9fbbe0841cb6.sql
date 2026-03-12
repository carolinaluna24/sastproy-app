
-- Actualizar mensaje de error al español
CREATE OR REPLACE FUNCTION public.check_single_active_project()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE active_count INT;
BEGIN
  IF NEW.role = 'AUTHOR' THEN
    SELECT COUNT(*) INTO active_count
    FROM project_members pm
    JOIN projects p ON p.id = pm.project_id
    WHERE pm.user_id = NEW.user_id
      AND pm.role = 'AUTHOR'
      AND p.global_status = 'VIGENTE';
    IF active_count >= 1 THEN
      RAISE EXCEPTION 'Un estudiante no puede participar en más de un proyecto activo';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
