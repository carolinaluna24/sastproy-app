
-- Actualizar mensaje de error de check_max_authors al español
CREATE OR REPLACE FUNCTION public.check_max_authors()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE author_count INT;
BEGIN
  IF NEW.role = 'AUTHOR' THEN
    SELECT COUNT(*) INTO author_count
    FROM public.project_members
    WHERE project_id = NEW.project_id AND role = 'AUTHOR';
    IF author_count >= 2 THEN
      RAISE EXCEPTION 'Un proyecto puede tener máximo 2 autores';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
