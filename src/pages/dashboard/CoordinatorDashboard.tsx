/**
 * CoordinatorDashboard.tsx
 * ========================
 * Dashboard principal para el rol COORDINATOR.
 * Muestra KPIs rápidos, propuestas pendientes, etapas activas de
 * anteproyecto/informe final/sustentación, y la tabla completa de proyectos.
 *
 * Conexiones:
 * - Consulta projects, project_stages para conteos y listados.
 * - Enlaza a páginas de evaluación, asignación de jurados y consolidación.
 */

import { useEffect, useState } from "react";
import { InlineSpinner } from "@/components/LoadingSpinner";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FolderOpen, FileCheck, Users, BookOpen, Award, GraduationCap, Eye, ClipboardCheck } from "lucide-react";

export default function CoordinatorDashboard() {
  const [projects, setProjects] = useState<any[]>([]);
  const [pendingProposals, setPendingProposals] = useState<any[]>([]);
  const [anteproyectoStages, setAnteproyectoStages] = useState<any[]>([]);
  const [informeFinalStages, setInformeFinalStages] = useState<any[]>([]);
  const [sustentacionStages, setSustentacionStages] = useState<any[]>([]);
  const [directors, setDirectors] = useState<any[]>([]);
  const [jurors, setJurors] = useState<any[]>([]);
  const [projectAuthors, setProjectAuthors] = useState<Record<string, string[]>>({});
  const [projectCurrentStage, setProjectCurrentStage] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const [stageAssignments, setStageAssignments] = useState<Record<string, boolean>>({});

  async function loadData() {
    setLoading(true);
    const [projectsRes, proposalsRes, anteRes, informeRes, sustRes, dirRolesRes, jurorRolesRes, membersRes] = await Promise.all([
      supabase.from("projects").select("*, programs(name), modalities(name), user_profiles!projects_director_id_fkey(full_name)").order("created_at", { ascending: false }),
      supabase.from("project_stages").select("*, projects(id, title, programs(name))").eq("stage_name", "PROPUESTA").eq("system_state", "RADICADA"),
      supabase.from("project_stages").select("*, projects(id, title, programs(name))").eq("stage_name", "ANTEPROYECTO").neq("system_state", "CERRADA"),
      supabase.from("project_stages").select("*, projects(id, title, programs(name))").eq("stage_name", "INFORME_FINAL").neq("system_state", "CERRADA"),
      supabase.from("project_stages").select("*, projects(id, title, programs(name))").eq("stage_name", "SUSTENTACION").neq("system_state", "CERRADA"),
      supabase.from("user_roles").select("user_id").eq("role", "ASESOR"),
      supabase.from("user_roles").select("user_id").eq("role", "JUROR"),
      supabase.from("project_members").select("project_id, user_id, role").eq("role", "AUTHOR"),
    ]);
    setProjects(projectsRes.data || []);
    setPendingProposals(proposalsRes.data || []);
    setAnteproyectoStages(anteRes.data || []);
    setInformeFinalStages(informeRes.data || []);
    setSustentacionStages(sustRes.data || []);

    // Cargar asignaciones existentes para determinar si ya hay jurados asignados
    const { data: allAssignments } = await supabase
      .from("assignments")
      .select("project_id, stage_name");
    const assignMap: Record<string, boolean> = {};
    (allAssignments || []).forEach((a) => {
      assignMap[`${a.project_id}_${a.stage_name}`] = true;
    });
    setStageAssignments(assignMap);

    // Cargar nombres de autores
    const authorMembers = membersRes.data || [];
    const authorUserIds = [...new Set(authorMembers.map(m => m.user_id))];
    let authorProfilesMap: Record<string, string> = {};
    if (authorUserIds.length > 0) {
      const { data: authorProfiles } = await supabase.from("user_profiles").select("id, full_name").in("id", authorUserIds);
      (authorProfiles || []).forEach(p => { authorProfilesMap[p.id] = p.full_name; });
    }
    // Build project -> author names map
    const projectAuthorsMap: Record<string, string[]> = {};
    authorMembers.forEach(m => {
      if (!projectAuthorsMap[m.project_id]) projectAuthorsMap[m.project_id] = [];
      const name = authorProfilesMap[m.user_id];
      if (name) projectAuthorsMap[m.project_id].push(name);
    });
    setProjectAuthors(projectAuthorsMap);

    // Cargar etapa actual por proyecto (la más reciente)
    const { data: allStages } = await supabase.from("project_stages").select("id, project_id, stage_name, system_state").order("created_at", { ascending: false });
    const stageMap: Record<string, any> = {};
    (allStages || []).forEach(s => {
      if (!stageMap[s.project_id]) stageMap[s.project_id] = s;
    });
    setProjectCurrentStage(stageMap);

    // Cargar perfiles de directores y jurados
    const dirIds = (dirRolesRes.data || []).map(r => r.user_id);
    const jurorIds = (jurorRolesRes.data || []).map(r => r.user_id);
    if (dirIds.length > 0) {
      const { data: dirProfiles } = await supabase.from("user_profiles").select("id, full_name, email").in("id", dirIds);
      setDirectors(dirProfiles || []);
    }
    if (jurorIds.length > 0) {
      const { data: jurorProfiles } = await supabase.from("user_profiles").select("id, full_name, email").in("id", jurorIds);
      setJurors(jurorProfiles || []);
    }

    setLoading(false);
  }

  if (loading) return <InlineSpinner text="Cargando..." />;

  const statusColor: Record<string, string> = {
    VIGENTE: "bg-success text-success-foreground", FINALIZADO: "bg-muted text-muted-foreground",
    VENCIDO: "bg-destructive text-destructive-foreground", CANCELADO: "bg-destructive/80 text-destructive-foreground",
  };

  // Proyectos sin asesor asignado
  const projectsWithoutAsesor = projects.filter(p => !p.asesor_id && p.global_status === "VIGENTE");

  function getEvaluateLink(projectId: string) {
    const stage = projectCurrentStage[projectId];
    if (!stage) return null;
    const { stage_name, system_state, id } = stage;
    if (stage_name === "PROPUESTA" && system_state === "RADICADA") return `/proposals/${id}/evaluate`;
    if (stage_name === "ANTEPROYECTO") {
      const hasJurors = stageAssignments[`${projectId}_ANTEPROYECTO`];
      if ((system_state === "RADICADA" || system_state === "AVALADO") && !hasJurors) return `/anteproyecto/${id}/assign-jurors`;
      if ((system_state === "RADICADA" || system_state === "AVALADO") && hasJurors) return `/anteproyecto/${id}/consolidate`;
      if (system_state === "EN_REVISION") return `/anteproyecto/${id}/consolidate`;
    }
    if (stage_name === "INFORME_FINAL") {
      const hasJurors = stageAssignments[`${projectId}_INFORME_FINAL`];
      if ((system_state === "RADICADA" || system_state === "AVALADO") && !hasJurors) return `/informe-final/${id}/assign-jurors`;
      if ((system_state === "RADICADA" || system_state === "AVALADO") && hasJurors) return `/informe-final/${id}/consolidate`;
      if (system_state === "EN_REVISION") return `/informe-final/${id}/consolidate`;
    }
    if (stage_name === "SUSTENTACION") {
      if (system_state === "BORRADOR") return `/sustentacion/${id}/schedule`;
      if (system_state === "RADICADA") return `/sustentacion/${id}/record-result`;
    }
    return null;
  }

  function getStageAction(stage: any, type: string) {
    if (type === "ANTEPROYECTO") {
      const hasJurors = stageAssignments[`${stage.projects?.id}_ANTEPROYECTO`];
      if (stage.system_state === "RADICADA" && !hasJurors) return <Link to={`/anteproyecto/${stage.id}/assign-jurors`}><Button size="sm" variant="outline" className="text-xs">Asignar Jurados</Button></Link>;
      if (stage.system_state === "AVALADO" && !hasJurors) return <Link to={`/anteproyecto/${stage.id}/assign-jurors`}><Button size="sm" variant="outline" className="text-xs">Asignar Jurados</Button></Link>;
      if ((stage.system_state === "RADICADA" || stage.system_state === "AVALADO") && hasJurors) return <Link to={`/anteproyecto/${stage.id}/consolidate`}><Button size="sm" variant="outline" className="text-xs">En espera de evaluaciones</Button></Link>;
      if (stage.system_state === "EN_REVISION") return <Link to={`/anteproyecto/${stage.id}/consolidate`}><Button size="sm" variant="outline" className="text-xs">Consolidar</Button></Link>;
    }
    if (type === "INFORME_FINAL") {
      const hasJurors = stageAssignments[`${stage.projects?.id}_INFORME_FINAL`];
      if (stage.system_state === "RADICADA" && !hasJurors) return <Link to={`/informe-final/${stage.id}/assign-jurors`}><Button size="sm" variant="outline" className="text-xs">Asignar Jurados</Button></Link>;
      if (stage.system_state === "AVALADO" && !hasJurors) return <Link to={`/informe-final/${stage.id}/assign-jurors`}><Button size="sm" variant="outline" className="text-xs">Asignar Jurados</Button></Link>;
      if ((stage.system_state === "RADICADA" || stage.system_state === "AVALADO") && hasJurors) return <Link to={`/informe-final/${stage.id}/consolidate`}><Button size="sm" variant="outline" className="text-xs">En espera de evaluaciones</Button></Link>;
      if (stage.system_state === "EN_REVISION") return <Link to={`/informe-final/${stage.id}/consolidate`}><Button size="sm" variant="outline" className="text-xs">Consolidar</Button></Link>;
    }
    if (type === "SUSTENTACION") {
      if (stage.system_state === "BORRADOR") return <Link to={`/sustentacion/${stage.id}/schedule`}><Button size="sm" variant="outline" className="text-xs">Programar</Button></Link>;
      if (stage.system_state === "RADICADA") return <Link to={`/sustentacion/${stage.id}/record-result`}><Button size="sm" variant="outline" className="text-xs">Registrar Resultado</Button></Link>;
    }
    return null;
  }

  function StageSection({ title, icon: Icon, stages, type }: { title: string; icon: React.ElementType; stages: any[]; type: string }) {
    if (stages.length === 0) return null;
    return (
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Icon className="h-4 w-4" />{title} ({stages.length})</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stages.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium text-sm">{s.projects?.title}</p>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">{s.system_state}</Badge>
                    <Badge variant="outline" className="text-xs">{s.official_state}</Badge>
                  </div>
                </div>
                {getStageAction(s, type)}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Panel del Coordinador</h1>
        <p className="text-muted-foreground text-sm">Gestión de proyectos de trabajo de grado</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card><CardContent className="flex items-center gap-3 py-4"><div className="rounded-lg bg-primary/10 p-2.5"><FolderOpen className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-bold">{projects.length}</p><p className="text-xs text-muted-foreground">Proyectos</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 py-4"><div className="rounded-lg bg-warning/10 p-2.5"><FileCheck className="h-5 w-5 text-warning" /></div><div><p className="text-2xl font-bold">{pendingProposals.length}</p><p className="text-xs text-muted-foreground">Propuestas</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 py-4"><div className="rounded-lg bg-accent p-2.5"><BookOpen className="h-5 w-5 text-accent-foreground" /></div><div><p className="text-2xl font-bold">{anteproyectoStages.length + informeFinalStages.length}</p><p className="text-xs text-muted-foreground">En revisión</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 py-4"><div className="rounded-lg bg-success/10 p-2.5"><GraduationCap className="h-5 w-5 text-success" /></div><div><p className="text-2xl font-bold">{sustentacionStages.length}</p><p className="text-xs text-muted-foreground">Sustentaciones</p></div></CardContent></Card>
      </div>

      {/* Proyectos sin asesor */}
      {projectsWithoutAsesor.length > 0 && (
        <Card className="border-warning/50">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4 text-warning" />Proyectos sin Asesor ({projectsWithoutAsesor.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {projectsWithoutAsesor.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div><p className="font-medium text-sm">{p.title}</p><p className="text-xs text-muted-foreground">{p.programs?.name}</p></div>
                  <Link to={`/projects/${p.id}`}><Button size="sm" variant="outline" className="text-xs gap-1"><Users className="h-3 w-3" />Asignar Asesor</Button></Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Propuestas pendientes */}
      {pendingProposals.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Propuestas Pendientes</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingProposals.map((ps) => (
                <div key={ps.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div><p className="font-medium text-sm">{ps.projects?.title}</p><p className="text-xs text-muted-foreground">{ps.projects?.programs?.name}</p></div>
                  <Link to={`/proposals/${ps.id}/evaluate`}><Button size="sm" variant="outline" className="text-xs">Evaluar</Button></Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <StageSection title="Anteproyectos" icon={BookOpen} stages={anteproyectoStages} type="ANTEPROYECTO" />
      <StageSection title="Informes Finales" icon={Award} stages={informeFinalStages} type="INFORME_FINAL" />
      <StageSection title="Sustentaciones" icon={GraduationCap} stages={sustentacionStages} type="SUSTENTACION" />

      {/* Tabla de proyectos */}
      <Card>
        <CardHeader><CardTitle className="text-base">Todos los Proyectos</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Título</TableHead><TableHead>Autor(es)</TableHead><TableHead>Programa</TableHead><TableHead>Asesor</TableHead><TableHead>Etapa</TableHead><TableHead>Estado</TableHead><TableHead>Fecha</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
            <TableBody>
              {projects.map((p) => {
                const evalLink = getEvaluateLink(p.id);
                const currentStage = projectCurrentStage[p.id];
                return (
                <TableRow key={p.id}>
                  <TableCell className="font-medium text-sm">{p.title}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{(projectAuthors[p.id] || []).join(", ") || "—"}</TableCell>
                  <TableCell className="text-sm">{p.programs?.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.user_profiles?.full_name || "—"}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{currentStage?.stage_name || "—"}</Badge></TableCell>
                  <TableCell><Badge className={`text-xs ${statusColor[p.global_status] || "bg-muted"}`}>{p.global_status}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString("es-CO")}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link to={`/projects/${p.id}`}>
                        <Button variant="outline" size="sm" className="text-xs gap-1">
                          <Eye className="h-3.5 w-3.5" />
                          Ver
                        </Button>
                      </Link>
                      {evalLink && (
                        <Link to={evalLink}>
                          <Button size="sm" className="text-xs gap-1 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm">
                            <ClipboardCheck className="h-3.5 w-3.5" />
                            Evaluar
                          </Button>
                        </Link>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
                );
              })}
              {projects.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No hay proyectos</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
