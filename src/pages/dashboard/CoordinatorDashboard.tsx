import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FolderOpen, FileCheck, Users, BookOpen } from "lucide-react";

export default function CoordinatorDashboard() {
  const [projects, setProjects] = useState<any[]>([]);
  const [pendingProposals, setPendingProposals] = useState<any[]>([]);
  const [anteproyectoStages, setAnteproyectoStages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    const [projectsRes, proposalsRes, anteRes] = await Promise.all([
      supabase
        .from("projects")
        .select("*, programs(name), modalities(name)")
        .order("created_at", { ascending: false }),
      supabase
        .from("project_stages")
        .select("*, projects(id, title, programs(name))")
        .eq("stage_name", "PROPUESTA")
        .eq("system_state", "RADICADA"),
      supabase
        .from("project_stages")
        .select("*, projects(id, title, programs(name))")
        .eq("stage_name", "ANTEPROYECTO")
        .neq("system_state", "CERRADA"),
    ]);

    setProjects(projectsRes.data || []);
    setPendingProposals(proposalsRes.data || []);
    setAnteproyectoStages(anteRes.data || []);
    setLoading(false);
  }

  if (loading) {
    return <div className="animate-pulse text-muted-foreground py-8 text-center">Cargando...</div>;
  }

  const statusColor: Record<string, string> = {
    VIGENTE: "bg-success text-success-foreground",
    FINALIZADO: "bg-muted text-muted-foreground",
    VENCIDO: "bg-destructive text-destructive-foreground",
    CANCELADO: "bg-destructive/80 text-destructive-foreground",
  };

  /** Determina la acción del coordinador para cada etapa de anteproyecto */
  function getAnteAction(stage: any) {
    if (stage.system_state === "RADICADA") {
      return (
        <Link to={`/anteproyecto/${stage.id}/assign-jurors`}>
          <Button size="sm" variant="outline" className="text-xs">Asignar Jurados</Button>
        </Link>
      );
    }
    if (stage.system_state === "EN_REVISION") {
      return (
        <Link to={`/anteproyecto/${stage.id}/consolidate`}>
          <Button size="sm" variant="outline" className="text-xs">Consolidar</Button>
        </Link>
      );
    }
    return null;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Panel del Coordinador</h1>
        <p className="text-muted-foreground text-sm">Gestión de proyectos de trabajo de grado</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="rounded-lg bg-primary/10 p-2.5">
              <FolderOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{projects.length}</p>
              <p className="text-xs text-muted-foreground">Proyectos totales</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="rounded-lg bg-warning/10 p-2.5">
              <FileCheck className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingProposals.length}</p>
              <p className="text-xs text-muted-foreground">Propuestas pendientes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="rounded-lg bg-accent p-2.5">
              <BookOpen className="h-5 w-5 text-accent-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{anteproyectoStages.length}</p>
              <p className="text-xs text-muted-foreground">Anteproyectos activos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="rounded-lg bg-success/10 p-2.5">
              <Users className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{projects.filter(p => p.global_status === "VIGENTE").length}</p>
              <p className="text-xs text-muted-foreground">Proyectos vigentes</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Propuestas pendientes */}
      {pendingProposals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Propuestas Pendientes de Evaluación</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingProposals.map((ps) => (
                <div key={ps.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium text-sm">{ps.projects?.title}</p>
                    <p className="text-xs text-muted-foreground">{ps.projects?.programs?.name}</p>
                  </div>
                  <Link to={`/proposals/${ps.id}/evaluate`}>
                    <Button size="sm" variant="outline" className="text-xs">Evaluar</Button>
                  </Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Anteproyectos activos */}
      {anteproyectoStages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Anteproyectos en Curso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {anteproyectoStages.map((as_) => (
                <div key={as_.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium text-sm">{as_.projects?.title}</p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">{as_.system_state}</Badge>
                      <Badge variant="outline" className="text-xs">{as_.official_state}</Badge>
                    </div>
                  </div>
                  {getAnteAction(as_)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabla de todos los proyectos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Todos los Proyectos</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Programa</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium text-sm">{p.title}</TableCell>
                  <TableCell className="text-sm">{p.programs?.name}</TableCell>
                  <TableCell>
                    <Badge className={`text-xs ${statusColor[p.global_status] || "bg-muted"}`}>
                      {p.global_status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(p.created_at).toLocaleDateString("es-CO")}
                  </TableCell>
                  <TableCell>
                    <Link to={`/projects/${p.id}`}>
                      <Button variant="ghost" size="sm" className="text-xs">Ver</Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              {projects.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No hay proyectos registrados
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
