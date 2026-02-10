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
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FolderOpen, FileCheck, Users, BookOpen, Award, GraduationCap } from "lucide-react";

export default function CoordinatorDashboard() {
  const [projects, setProjects] = useState<any[]>([]);
  const [pendingProposals, setPendingProposals] = useState<any[]>([]);
  const [anteproyectoStages, setAnteproyectoStages] = useState<any[]>([]);
  const [informeFinalStages, setInformeFinalStages] = useState<any[]>([]);
  const [sustentacionStages, setSustentacionStages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [projectsRes, proposalsRes, anteRes, informeRes, sustRes] = await Promise.all([
      supabase.from("projects").select("*, programs(name), modalities(name)").order("created_at", { ascending: false }),
      supabase.from("project_stages").select("*, projects(id, title, programs(name))").eq("stage_name", "PROPUESTA").eq("system_state", "RADICADA"),
      supabase.from("project_stages").select("*, projects(id, title, programs(name))").eq("stage_name", "ANTEPROYECTO").neq("system_state", "CERRADA"),
      supabase.from("project_stages").select("*, projects(id, title, programs(name))").eq("stage_name", "INFORME_FINAL").neq("system_state", "CERRADA"),
      supabase.from("project_stages").select("*, projects(id, title, programs(name))").eq("stage_name", "SUSTENTACION").neq("system_state", "CERRADA"),
    ]);
    setProjects(projectsRes.data || []);
    setPendingProposals(proposalsRes.data || []);
    setAnteproyectoStages(anteRes.data || []);
    setInformeFinalStages(informeRes.data || []);
    setSustentacionStages(sustRes.data || []);
    setLoading(false);
  }

  if (loading) return <div className="animate-pulse text-muted-foreground py-8 text-center">Cargando...</div>;

  const statusColor: Record<string, string> = {
    VIGENTE: "bg-success text-success-foreground", FINALIZADO: "bg-muted text-muted-foreground",
    VENCIDO: "bg-destructive text-destructive-foreground", CANCELADO: "bg-destructive/80 text-destructive-foreground",
  };

  function getStageAction(stage: any, type: string) {
    if (type === "ANTEPROYECTO") {
      if (stage.system_state === "RADICADA") return <Link to={`/anteproyecto/${stage.id}/assign-jurors`}><Button size="sm" variant="outline" className="text-xs">Asignar Jurados</Button></Link>;
      if (stage.system_state === "EN_REVISION") return <Link to={`/anteproyecto/${stage.id}/consolidate`}><Button size="sm" variant="outline" className="text-xs">Consolidar</Button></Link>;
    }
    if (type === "INFORME_FINAL") {
      if (stage.system_state === "RADICADA") return <Link to={`/informe-final/${stage.id}/assign-jurors`}><Button size="sm" variant="outline" className="text-xs">Asignar Jurados</Button></Link>;
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
            <TableHeader><TableRow><TableHead>Título</TableHead><TableHead>Programa</TableHead><TableHead>Estado</TableHead><TableHead>Fecha</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {projects.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium text-sm">{p.title}</TableCell>
                  <TableCell className="text-sm">{p.programs?.name}</TableCell>
                  <TableCell><Badge className={`text-xs ${statusColor[p.global_status] || "bg-muted"}`}>{p.global_status}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString("es-CO")}</TableCell>
                  <TableCell><Link to={`/projects/${p.id}`}><Button variant="ghost" size="sm" className="text-xs">Ver</Button></Link></TableCell>
                </TableRow>
              ))}
              {projects.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No hay proyectos</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
