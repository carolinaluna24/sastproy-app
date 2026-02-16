import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, ExternalLink } from "lucide-react";

const stageLabels: Record<string, string> = {
  PROPUESTA: "Propuesta",
  ANTEPROYECTO: "Anteproyecto",
  INFORME_FINAL: "Informe Final",
  SUSTENTACION: "Sustentación",
};

const statusColors: Record<string, string> = {
  VIGENTE: "bg-primary/10 text-primary",
  FINALIZADO: "bg-muted text-muted-foreground",
  VENCIDO: "bg-destructive/10 text-destructive",
  CANCELADO: "bg-destructive/20 text-destructive",
};

interface CatalogProject {
  project_id: string;
  title: string;
  program_name: string;
  modality_name: string;
  global_status: string;
  created_at: string;
  current_stage: string;
  current_official_state: string;
  author_count: number;
}

export default function CatalogProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const { primaryRole, user } = useAuth();
  const [project, setProject] = useState<CatalogProject | null>(null);
  const [stages, setStages] = useState<any[]>([]);
  const [authors, setAuthors] = useState<string[]>([]);
  const [hasFullAccess, setHasFullAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (projectId) loadData();
  }, [projectId]);

  async function loadData() {
    setLoading(true);

    // Cargar datos del catálogo (solo campos públicos)
    const { data: catalogData } = await supabase
      .from("v_catalog_projects")
      .select("*")
      .eq("project_id", projectId!)
      .maybeSingle();

    setProject(catalogData as CatalogProject | null);

    // Cargar etapas (solo nombre y estado, sin observaciones para catálogo)
    const { data: stagesData } = await supabase
      .from("project_stages")
      .select("id, stage_name, system_state, official_state, final_grade, created_at")
      .eq("project_id", projectId!)
      .order("created_at");

    setStages(stagesData || []);

    // Cargar nombres de autores
    const { data: membersData } = await supabase
      .from("project_members")
      .select("user_id, user_profiles(full_name)")
      .eq("project_id", projectId!)
      .eq("role", "AUTHOR");

    setAuthors(
      (membersData || []).map((m: any) => m.user_profiles?.full_name).filter(Boolean)
    );

    // Verificar si el usuario tiene acceso completo
    if (user && primaryRole) {
      if (primaryRole === "COORDINATOR") {
        setHasFullAccess(true);
      } else {
        // Verificar si es miembro del proyecto
        const { data: memberData } = await supabase
          .from("project_members")
          .select("id")
          .eq("project_id", projectId!)
          .eq("user_id", user.id)
          .maybeSingle();
        setHasFullAccess(!!memberData);
      }
    }

    setLoading(false);
  }

  if (loading) {
    return <div className="py-8 text-center text-muted-foreground animate-pulse">Cargando...</div>;
  }

  if (!project) {
    return <div className="py-8 text-center text-muted-foreground">Proyecto no encontrado</div>;
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Navegación */}
      <Link to="/catalog">
        <Button variant="ghost" size="sm" className="gap-2 text-xs">
          <ArrowLeft className="h-3.5 w-3.5" /> Volver al catálogo
        </Button>
      </Link>

      {/* Encabezado */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{project.title}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {project.program_name} · {project.modality_name}
          </p>
        </div>
        <Badge className={statusColors[project.global_status] || "bg-muted"}>
          {project.global_status}
        </Badge>
      </div>

      {/* Info general */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-3">
            <p className="text-muted-foreground text-xs">Autores</p>
            <div className="flex items-center gap-1 mt-0.5">
              <Users className="h-3.5 w-3.5 shrink-0" />
              <div className="text-sm font-medium">
                {authors.length > 0 ? authors.join(", ") : `${project.author_count} autor(es)`}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <p className="text-muted-foreground text-xs">Etapa Actual</p>
            <p className="font-medium text-sm">{stageLabels[project.current_stage] || project.current_stage}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <p className="text-muted-foreground text-xs">Estado Oficial</p>
            <Badge variant="outline" className="text-xs mt-0.5">{project.current_official_state}</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <p className="text-muted-foreground text-xs">Fecha de Creación</p>
            <p className="font-medium text-sm">{new Date(project.created_at).toLocaleDateString("es-CO")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Historial de etapas (solo info pública) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Historial de Etapas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {stages.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium text-sm">{stageLabels[s.stage_name] || s.stage_name}</p>
                <div className="flex gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">{s.system_state}</Badge>
                  <Badge variant="outline" className="text-xs">{s.official_state}</Badge>
                </div>
              </div>
              <div className="text-right">
                {s.final_grade !== null && (
                  <Badge className="text-sm">{s.final_grade}</Badge>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(s.created_at).toLocaleDateString("es-CO")}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Link a detalle completo (solo si tiene acceso) */}
      {hasFullAccess && (
        <Card className="border-primary/20">
          <CardContent className="py-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Tienes acceso al detalle completo de este proyecto
            </p>
            <Link to={`/projects/${project.project_id}`}>
              <Button variant="outline" size="sm" className="gap-2 text-xs">
                <ExternalLink className="h-3.5 w-3.5" /> Ver detalle completo
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
