import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FolderPlus, FileText, Clock } from "lucide-react";

const statusColors: Record<string, string> = {
  VIGENTE: "bg-success text-success-foreground",
  FINALIZADO: "bg-muted text-muted-foreground",
  VENCIDO: "bg-destructive text-destructive-foreground",
  CANCELADO: "bg-destructive/80 text-destructive-foreground",
};

const stateLabels: Record<string, string> = {
  BORRADOR: "Borrador",
  RADICADA: "Radicada",
  EN_REVISION: "En Revisión",
  CON_OBSERVACIONES: "Con Observaciones",
  CERRADA: "Cerrada",
};

const officialLabels: Record<string, string> = {
  PENDIENTE: "Pendiente",
  APROBADA: "Aprobada",
  APROBADA_CON_MODIFICACIONES: "Aprobada con Modificaciones",
  NO_APROBADA: "No Aprobada",
};

export default function StudentDashboard() {
  const { user } = useAuth();
  const [project, setProject] = useState<any>(null);
  const [stages, setStages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadProject();
  }, [user]);

  async function loadProject() {
    setLoading(true);
    // Get projects where user is a member
    const { data: memberships } = await supabase
      .from("project_members")
      .select("project_id")
      .eq("user_id", user!.id)
      .eq("role", "AUTHOR");

    if (memberships && memberships.length > 0) {
      const projectId = memberships[0].project_id;
      const { data: proj } = await supabase
        .from("projects")
        .select("*, programs(name), modalities(name)")
        .eq("id", projectId)
        .maybeSingle();
      setProject(proj);

      if (proj) {
        const { data: stg } = await supabase
          .from("project_stages")
          .select("*")
          .eq("project_id", proj.id)
          .order("created_at", { ascending: true });
        setStages(stg || []);
      }
    }
    setLoading(false);
  }

  if (loading) {
    return <div className="animate-pulse text-muted-foreground py-8 text-center">Cargando proyecto...</div>;
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <div className="rounded-full bg-muted p-6">
          <FolderPlus className="h-10 w-10 text-muted-foreground" />
        </div>
        <h2 className="text-lg font-semibold">No tienes un proyecto activo</h2>
        <p className="text-muted-foreground text-sm">Crea tu proyecto de trabajo de grado para comenzar.</p>
        <Link to="/projects/new">
          <Button>
            <FolderPlus className="mr-2 h-4 w-4" />
            Crear Proyecto
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mi Proyecto</h1>
        <p className="text-muted-foreground text-sm">Seguimiento de tu trabajo de grado</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">{project.title}</CardTitle>
              <CardDescription>{project.description}</CardDescription>
            </div>
            <Badge className={statusColors[project.global_status] || "bg-muted"}>
              {project.global_status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><span className="text-muted-foreground">Programa:</span> {project.programs?.name}</p>
          <p><span className="text-muted-foreground">Modalidad:</span> {project.modalities?.name}</p>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold mb-3">Etapas</h2>
        <div className="space-y-3">
          {stages.map((stage) => (
            <Card key={stage.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-accent p-2">
                    {stage.stage_name === "PROPUESTA" ? (
                      <FileText className="h-4 w-4 text-accent-foreground" />
                    ) : (
                      <Clock className="h-4 w-4 text-accent-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{stage.stage_name}</p>
                    <p className="text-xs text-muted-foreground">
                      Estado: {stateLabels[stage.system_state] || stage.system_state}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="text-xs">
                    {officialLabels[stage.official_state] || stage.official_state}
                  </Badge>
                  {stage.stage_name === "PROPUESTA" && stage.system_state === "BORRADOR" && (
                    <Link to={`/projects/${project.id}/submit-proposal`}>
                      <Button size="sm" variant="outline" className="mt-2 text-xs">
                        Radicar Propuesta
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
