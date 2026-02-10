
-- ENUMS
CREATE TYPE public.app_role AS ENUM ('STUDENT', 'COORDINATOR', 'DIRECTOR', 'JUROR');
CREATE TYPE public.global_status AS ENUM ('VIGENTE', 'FINALIZADO', 'VENCIDO', 'CANCELADO');
CREATE TYPE public.stage_name AS ENUM ('PROPUESTA', 'ANTEPROYECTO', 'INFORME_FINAL', 'SUSTENTACION');
CREATE TYPE public.system_state AS ENUM ('BORRADOR', 'RADICADA', 'EN_REVISION', 'CON_OBSERVACIONES', 'CERRADA');
CREATE TYPE public.official_state AS ENUM ('APROBADA', 'APROBADA_CON_MODIFICACIONES', 'NO_APROBADA', 'PENDIENTE');
CREATE TYPE public.member_role AS ENUM ('AUTHOR', 'DIRECTOR', 'JUROR');

-- PROGRAMS
CREATE TABLE public.programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- MODALITIES
CREATE TABLE public.modalities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- USER PROFILES (1:1 with auth.users)
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  program_id UUID REFERENCES public.programs(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- USER ROLES (separate table per security requirements)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

-- PROJECTS
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  program_id UUID NOT NULL REFERENCES public.programs(id),
  modality_id UUID NOT NULL REFERENCES public.modalities(id),
  global_status global_status NOT NULL DEFAULT 'VIGENTE',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- PROJECT MEMBERS
CREATE TABLE public.project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  role member_role NOT NULL DEFAULT 'AUTHOR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id, role)
);

-- PROJECT STAGES
CREATE TABLE public.project_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  stage_name stage_name NOT NULL,
  system_state system_state NOT NULL DEFAULT 'BORRADOR',
  official_state official_state NOT NULL DEFAULT 'PENDIENTE',
  final_grade NUMERIC(3,1),
  observations TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, stage_name)
);

-- SUBMISSIONS (versioned)
CREATE TABLE public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_stage_id UUID NOT NULL REFERENCES public.project_stages(id) ON DELETE CASCADE,
  submitted_by UUID NOT NULL REFERENCES auth.users(id),
  version INTEGER NOT NULL DEFAULT 1,
  file_url TEXT,
  external_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ENDORSEMENTS
CREATE TABLE public.endorsements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  endorsed_by UUID NOT NULL REFERENCES auth.users(id),
  approved BOOLEAN NOT NULL DEFAULT false,
  comments TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ASSIGNMENTS (jurors in later stages only)
CREATE TABLE public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  assigned_by UUID NOT NULL REFERENCES auth.users(id),
  stage_name stage_name NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id, stage_name)
);

-- RUBRICS
CREATE TABLE public.rubrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  stage_name stage_name NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RUBRIC ITEMS
CREATE TABLE public.rubric_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rubric_id UUID NOT NULL REFERENCES public.rubrics(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  max_score NUMERIC(5,2) NOT NULL,
  weight NUMERIC(3,2) NOT NULL DEFAULT 1.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- EVALUATIONS
CREATE TABLE public.evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  evaluator_id UUID NOT NULL REFERENCES auth.users(id),
  observations TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- EVALUATION SCORES
CREATE TABLE public.evaluation_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id UUID NOT NULL REFERENCES public.evaluations(id) ON DELETE CASCADE,
  rubric_item_id UUID NOT NULL REFERENCES public.rubric_items(id),
  score NUMERIC(5,2),
  comments TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- DEADLINES
CREATE TABLE public.deadlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_stage_id UUID NOT NULL REFERENCES public.project_stages(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  due_date TIMESTAMPTZ NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- AUDIT EVENTS
CREATE TABLE public.audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  event_type TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- SECURITY DEFINER HELPER FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_coordinator(uid UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.has_role(uid, 'COORDINATOR')
$$;

CREATE OR REPLACE FUNCTION public.is_project_member(p_project_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members WHERE project_id = p_project_id AND user_id = p_user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_assigned_to_project(p_project_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.assignments WHERE project_id = p_project_id AND user_id = p_user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.has_project_access(p_project_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_coordinator(p_user_id)
    OR public.is_project_member(p_project_id, p_user_id)
    OR public.is_assigned_to_project(p_project_id, p_user_id)
$$;

-- ============================================================
-- TRIGGERS: Business rule enforcement
-- ============================================================

-- Trigger: max 2 AUTHORS per project
CREATE OR REPLACE FUNCTION public.check_max_authors()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public
AS $$
DECLARE author_count INTEGER;
BEGIN
  IF NEW.role = 'AUTHOR' THEN
    SELECT COUNT(*) INTO author_count
    FROM public.project_members
    WHERE project_id = NEW.project_id AND role = 'AUTHOR';
    IF author_count >= 2 THEN
      RAISE EXCEPTION 'A project can have a maximum of 2 authors';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_max_authors
BEFORE INSERT ON public.project_members
FOR EACH ROW EXECUTE FUNCTION public.check_max_authors();

-- Trigger: student cannot be AUTHOR in more than one VIGENTE project
CREATE OR REPLACE FUNCTION public.check_single_active_project()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public
AS $$
DECLARE active_count INTEGER;
BEGIN
  IF NEW.role = 'AUTHOR' THEN
    SELECT COUNT(*) INTO active_count
    FROM public.project_members pm
    JOIN public.projects p ON pm.project_id = p.id
    WHERE pm.user_id = NEW.user_id
      AND pm.role = 'AUTHOR'
      AND p.global_status = 'VIGENTE';
    IF active_count >= 1 THEN
      RAISE EXCEPTION 'A student cannot be part of more than one active project';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_single_active_project
BEFORE INSERT ON public.project_members
FOR EACH ROW EXECUTE FUNCTION public.check_single_active_project();

-- Trigger: auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_project_stages_updated_at BEFORE UPDATE ON public.project_stages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Trigger: auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modalities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.endorsements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rubrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rubric_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deadlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

-- Programs & Modalities: readable by all authenticated
CREATE POLICY "programs_select" ON public.programs FOR SELECT TO authenticated USING (true);
CREATE POLICY "modalities_select" ON public.modalities FOR SELECT TO authenticated USING (true);

-- Rubrics: readable by all authenticated
CREATE POLICY "rubrics_select" ON public.rubrics FOR SELECT TO authenticated USING (true);
CREATE POLICY "rubric_items_select" ON public.rubric_items FOR SELECT TO authenticated USING (true);

-- User profiles
CREATE POLICY "profiles_select" ON public.user_profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_coordinator(auth.uid()));
CREATE POLICY "profiles_update" ON public.user_profiles FOR UPDATE TO authenticated
  USING (id = auth.uid());

-- User roles
CREATE POLICY "roles_select" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_coordinator(auth.uid()));

-- Projects
CREATE POLICY "projects_select" ON public.projects FOR SELECT TO authenticated
  USING (
    public.is_coordinator(auth.uid())
    OR public.is_project_member(id, auth.uid())
    OR public.is_assigned_to_project(id, auth.uid())
  );
CREATE POLICY "projects_insert" ON public.projects FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND public.has_role(auth.uid(), 'STUDENT'));
CREATE POLICY "projects_update" ON public.projects FOR UPDATE TO authenticated
  USING (
    public.is_coordinator(auth.uid())
    OR public.is_project_member(id, auth.uid())
  );

-- Project members
CREATE POLICY "members_select" ON public.project_members FOR SELECT TO authenticated
  USING (public.has_project_access(project_id, auth.uid()));
CREATE POLICY "members_insert" ON public.project_members FOR INSERT TO authenticated
  WITH CHECK (true); -- triggers enforce business rules
CREATE POLICY "members_delete" ON public.project_members FOR DELETE TO authenticated
  USING (public.is_coordinator(auth.uid()));

-- Project stages
CREATE POLICY "stages_select" ON public.project_stages FOR SELECT TO authenticated
  USING (public.has_project_access(project_id, auth.uid()));
CREATE POLICY "stages_insert" ON public.project_stages FOR INSERT TO authenticated
  WITH CHECK (true); -- created during project creation
CREATE POLICY "stages_update" ON public.project_stages FOR UPDATE TO authenticated
  USING (public.is_coordinator(auth.uid()) OR public.is_project_member(project_id, auth.uid()));

-- Submissions
CREATE POLICY "submissions_select" ON public.submissions FOR SELECT TO authenticated
  USING (
    submitted_by = auth.uid()
    OR public.is_coordinator(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.project_stages ps
      WHERE ps.id = project_stage_id
      AND public.has_project_access(ps.project_id, auth.uid())
    )
  );
CREATE POLICY "submissions_insert" ON public.submissions FOR INSERT TO authenticated
  WITH CHECK (submitted_by = auth.uid());

-- Endorsements
CREATE POLICY "endorsements_select" ON public.endorsements FOR SELECT TO authenticated USING (true);
CREATE POLICY "endorsements_insert" ON public.endorsements FOR INSERT TO authenticated WITH CHECK (true);

-- Assignments
CREATE POLICY "assignments_select" ON public.assignments FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_coordinator(auth.uid()));
CREATE POLICY "assignments_insert" ON public.assignments FOR INSERT TO authenticated
  WITH CHECK (public.is_coordinator(auth.uid()));

-- Evaluations
CREATE POLICY "evaluations_select" ON public.evaluations FOR SELECT TO authenticated
  USING (evaluator_id = auth.uid() OR public.is_coordinator(auth.uid()));
CREATE POLICY "evaluations_insert" ON public.evaluations FOR INSERT TO authenticated
  WITH CHECK (evaluator_id = auth.uid() OR public.is_coordinator(auth.uid()));

-- Evaluation scores
CREATE POLICY "eval_scores_select" ON public.evaluation_scores FOR SELECT TO authenticated USING (true);
CREATE POLICY "eval_scores_insert" ON public.evaluation_scores FOR INSERT TO authenticated WITH CHECK (true);

-- Deadlines
CREATE POLICY "deadlines_select" ON public.deadlines FOR SELECT TO authenticated
  USING (
    public.is_coordinator(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.project_stages ps
      WHERE ps.id = project_stage_id
      AND public.has_project_access(ps.project_id, auth.uid())
    )
  );
CREATE POLICY "deadlines_insert" ON public.deadlines FOR INSERT TO authenticated
  WITH CHECK (public.is_coordinator(auth.uid()));

-- Audit events: coordinators can read, all authenticated can insert
CREATE POLICY "audit_select" ON public.audit_events FOR SELECT TO authenticated
  USING (public.is_coordinator(auth.uid()));
CREATE POLICY "audit_insert" ON public.audit_events FOR INSERT TO authenticated
  WITH CHECK (true);
