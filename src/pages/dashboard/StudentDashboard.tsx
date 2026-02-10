/**
 * StudentDashboard.tsx
 * ====================
 * Dashboard principal para el rol STUDENT.
 * Muestra el proyecto activo con etapas 1-4, evaluaciones,
 * observaciones, estados y acciones disponibles (radicar, solicitar aval).
 */

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FolderPlus, FileText, Clock, CheckCircle, AlertCircle, Eye, Send } from "lucide-react";

const statusColors: Record<string, string> = {
  VIGENTE: "bg-success text-success-foreground",
  FINALIZADO: "bg-muted text-muted-foreground",
  VENCIDO: "bg-destructive text-destructive-foreground",
  CANCELADO: "bg-destructive/80 text-destructive-foreground",
};

const stateLabels: Record<string, string> = {
  BORRADOR: "Borrador", RADICADA: "Radicada", EN_REVISION: "En Revisión",
  CON_OBSERVACIONES: "Con Observaciones", CERRADA: "Cerrada",
};

const officialLabels: Record<string, string> = {
  PENDIENTE: "Pendiente", APROBADA: "Aprobada",
  APROBADA_CON_MODIFICACIONES: "Aprobada con Modificaciones", NO_APROBADA: "No Aprobada",
};

const stageNameLabels: Record<string, string> = {
  PROPUESTA: "1. Propuesta", ANTEPROYECTO: "2. Anteproyecto",
  INFORME_FINAL: "3. Informe Final", SUSTENTACION: "4. Sustentación",
};

const stageOrder = ["PROPUESTA", "ANTEPROYECTO", "INFORME_FINAL", "SUSTENTACION"];

export default function StudentDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [project, setProject] = useState<any>(null);
  const [stages, setStages] = useState<any[]>([]);
  const [evaluationsByStage, setEvaluationsByStage] = useState<Record<string, any[]>>({});
  const [endorsementsByStage, setEndorsementsByStage] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (!user) return; loadProject(); }, [user]);

  async function loadProject() {
    setLoading(true);
    const { data: memberships } = await supabase
      .from("project_members").select("project_id").eq("user_id", user!.id).eq("role", "AUTHOR");

    if (memberships && memberships.length > 0) {
      const projectId = memberships[0].project_id;
      const { data: proj } = await supabase
        .from("projects").select("*, programs(name), modalities(name), user_profiles!projects_director_id_fkey(full_name)")
        .eq("id", projectId).maybeSingle();
      setProject(proj);

      if (proj) {
        const { data: stg } = await supabase
          .from("project_stages").select("*").eq("project_id", proj.id).order("created_at", { ascending: true });
        const stagesList = stg || [];
        setStages(stagesList);

        // Cargar evaluaciones y avales por etapa
        const evalMap: Record<string, any[]> = {};
        const endorseMap: Record<string, any[]> = {};

        for (const stage of stagesList) {
          // Evaluaciones de jurados
          const { data: subs } = await supabase
            .from("submissions").select("id").eq("project_stage_id", stage.id);
          if (subs && subs.length > 0) {
            const subIds = subs.map(s => s.id);
            const { data: evals } = await supabase
              .from("evaluations").select("*, user_profiles:evaluator_id(full_name)")
              .in("submission_id", subIds);
            evalMap[stage.id] = evals || [];

            // Avales del director
            const { data: endorsements } = await supabase
              .from("endorsements").select("*, user_profiles:endorsed_by(full_name)")
              .in("submission_id", subIds);
            endorseMap[stage.id] = endorsements || [];
          }
        }
        setEvaluationsByStage(evalMap);
        setEndorsementsByStage(endorseMap);
      }
    }
    setLoading(false);
  }

  async function handleRequestEndorsement(stage: any) {
    if (!user || !project) return;
    // Verificar que la etapa esté RADICADA
    if (stage.system_state !== "RADICADA") {
      toast({ title: "La etapa debe estar radicada para solicitar aval", variant: "destructive" });
      return;
    }

    try {
      await supabase.from("audit_events").insert({
        project_id: project.id,
        user_id: user.id,
        event_type: "ENDORSEMENT_REQUESTED",
        description: `Estudiante solicita aval del director para ${stage.stage_name}`,
        metadata: { stage_id: stage.id, stage_name: stage.stage_name },
      });
      toast({ title: "Solicitud de aval enviada", description: "Tu director será notificado." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  }

  if (loading) return <div className="animate-pulse text-muted-foreground py-8 text-center">Cargando proyecto...</div>;

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <div className="rounded-full bg-muted p-6"><FolderPlus className="h-10 w-10 text-muted-foreground" /></div>
        <h2 className="text-lg font-semibold">No tienes un proyecto activo</h2>
        <p className="text-muted-foreground text-sm">Crea tu proyecto de trabajo de grado para comenzar.</p>
        <Link to="/projects/new"><Button><FolderPlus className="mr-2 h-4 w-4" />Crear Proyecto</Button></Link>
      </div>
    );
  }

  /** Acciones del estudiante según etapa y estado */
  function getStageActions(stage: any) {
    const { stage_name, system_state, official_state, final_grade } = stage;
    const actions: React.ReactNode[] = [];

    // Botón de radicar según etapa
    if (stage_name === "PROPUESTA" && system_state === "BORRADOR") {
      actions.push(
        <Link key="submit" to={`/projects/${project.id}/submit-proposal`}>
          <Button size="sm" variant="outline" className="text-xs gap-1"><FileText className="h-3 w-3" />Radicar Propuesta</Button>
        </Link>
      );
    }
    if (stage_name === "ANTEPROYECTO" && system_state === "BORRADOR") {
      actions.push(
        <Link key="submit" to={`/projects/${project.id}/submit-anteproject`}>
          <Button size="sm" variant="outline" className="text-xs gap-1"><FileText className="h-3 w-3" />Radicar Anteproyecto</Button>
        </Link>
      );
    }
    if (stage_name === "INFORME_FINAL" && system_state === "BORRADOR") {
      actions.push(
        <Link key="submit" to={`/projects/${project.id}/submit-informe-final`}>
          <Button size="sm" variant="outline" className="text-xs gap-1"><FileText className="h-3 w-3" />Radicar Informe Final</Button>
        </Link>
      );
    }

    // Botón solicitar aval (para ANTEPROYECTO e INFORME_FINAL cuando está RADICADA)
    if ((stage_name === "ANTEPROYECTO" || stage_name === "INFORME_FINAL") && system_state === "RADICADA") {
      const hasEndorsement = (endorsementsByStage[stage.id] || []).length > 0;
      if (!hasEndorsement) {
        actions.push(
          <Button key="endorse" size="sm" variant="secondary" className="text-xs gap-1" onClick={() => handleRequestEndorsement(stage)}>
            <Send className="h-3 w-3" />Solicitar Aval al Director
          </Button>
        );
      }
    }

    // Post-sustentación
    if (stage_name === "SUSTENTACION" && system_state === "CERRADA" && final_grade !== null && final_grade >= 70 && project.global_status === "VIGENTE") {
      actions.push(
        <Link key="final" to={`/projects/${project.id}/submit-final-delivery`}>
          <Button size="sm" variant="outline" className="text-xs gap-1"><FileText className="h-3 w-3" />Entregar Documento Final</Button>
        </Link>
      );
    }

    return actions;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mi Proyecto</h1>
        <p className="text-muted-foreground text-sm">Seguimiento de tu trabajo de grado</p>
      </div>

      {/* Info del proyecto */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div><CardTitle className="text-lg">{project.title}</CardTitle><CardDescription>{project.description}</CardDescription></div>
            <Badge className={statusColors[project.global_status] || "bg-muted"}>{project.global_status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><span className="text-muted-foreground">Programa:</span> {project.programs?.name}</p>
          <p><span className="text-muted-foreground">Modalidad:</span> {project.modalities?.name}</p>
          <p><span className="text-muted-foreground">Director:</span> {project.user_profiles?.full_name || <span className="text-muted-foreground italic">Sin asignar</span>}</p>
        </CardContent>
      </Card>

      {/* Etapas 1-4 */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Avance por Etapas</h2>
        <div className="space-y-4">
          {stageOrder.map((stageName, idx) => {
            const stage = stages.find(s => s.stage_name === stageName);
            if (!stage) {
              return (
                <Card key={stageName} className="opacity-50">
                  <CardContent className="py-4">
                    <p className="font-medium text-sm text-muted-foreground">{stageNameLabels[stageName]}</p>
                    <p className="text-xs text-muted-foreground">Aún no habilitada</p>
                  </CardContent>
                </Card>
              );
            }

            const evals = evaluationsByStage[stage.id] || [];
            const endorsements = endorsementsByStage[stage.id] || [];
            const actions = getStageActions(stage);

            return (
              <Card key={stage.id}>
                <CardContent className="py-4 space-y-3">
                  {/* Encabezado de etapa */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-accent p-2">
                        {stage.system_state === "CERRADA" && stage.official_state === "APROBADA"
                          ? <CheckCircle className="h-4 w-4 text-success" />
                          : stage.official_state === "NO_APROBADA"
                            ? <AlertCircle className="h-4 w-4 text-destructive" />
                            : <Clock className="h-4 w-4 text-accent-foreground" />
                        }
                      </div>
                      <div>
                        <p className="font-medium text-sm">{stageNameLabels[stageName]}</p>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">{stateLabels[stage.system_state]}</Badge>
                          <Badge variant="outline" className="text-xs">{officialLabels[stage.official_state]}</Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                      {stage.final_grade !== null && <Badge className="text-sm">Nota: {stage.final_grade}/100</Badge>}
                    </div>
                  </div>

                  {/* Observaciones de la etapa */}
                  {stage.observations && (
                    <div className="rounded-lg bg-muted/50 p-3 text-sm">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Observaciones de la etapa:</p>
                      <p className="text-sm">{stage.observations}</p>
                    </div>
                  )}

                  {/* Avales del director */}
                  {endorsements.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Aval del Director:</p>
                      {endorsements.map((end: any) => (
                        <div key={end.id} className="rounded-lg border p-2 text-sm flex items-start gap-2">
                          {end.approved
                            ? <CheckCircle className="h-4 w-4 text-success mt-0.5 shrink-0" />
                            : <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                          }
                          <div>
                            <p className="text-xs"><span className="font-medium">{end.user_profiles?.full_name}</span> — {end.approved ? "Avalado" : "Denegado"}</p>
                            {end.comments && <p className="text-xs text-muted-foreground mt-0.5">{end.comments}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Evaluaciones de jurados */}
                  {evals.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Evaluaciones de jurados:</p>
                      {evals.map((ev: any) => (
                        <div key={ev.id} className="rounded-lg border p-2 text-sm">
                          <div className="flex items-center gap-2">
                            <Eye className="h-3 w-3 text-muted-foreground" />
                            <span className="font-medium text-xs">{ev.user_profiles?.full_name || "Jurado"}</span>
                            {ev.official_result && (
                              <Badge variant="outline" className="text-xs">
                                {ev.official_result === "APROBADO" ? "Aprobado" :
                                  ev.official_result === "APLAZADO_POR_MODIFICACIONES" ? "Con modificaciones" : "No aprobado"}
                              </Badge>
                            )}
                          </div>
                          {ev.observations && <p className="text-xs text-muted-foreground mt-1 ml-5">{ev.observations}</p>}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Acciones */}
                  {actions.length > 0 && (
                    <div className="flex gap-2 flex-wrap pt-1">
                      {actions}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
