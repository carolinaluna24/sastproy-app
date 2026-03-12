import { useEffect, useState } from "react";
import { InlineSpinner } from "@/components/LoadingSpinner";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActiveRole } from "@/contexts/RoleContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, User, FileText, CheckCircle, AlertCircle, Users, CalendarClock, ExternalLink, ClipboardCheck, ShieldCheck } from "lucide-react";

const eventIcons: Record<string, React.ElementType> = {
  PROJECT_CREATED: FileText,
  PROPOSAL_SUBMITTED: FileText,
  PROPOSAL_EVALUATED: CheckCircle,
};

export default function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const { user, roles } = useAuth();
  const { activeRole } = useActiveRole();
  const { toast } = useToast();
  const [project, setProject] = useState<any>(null);
  const [stages, setStages] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [auditEvents, setAuditEvents] = useState<any[]>([]);
  const [deadlinesByStage, setDeadlinesByStage] = useState<Record<string, any>>({});
  const [submissionsByStage, setSubmissionsByStage] = useState<Record<string, any[]>>({});
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [evaluationsByStage, setEvaluationsByStage] = useState<Record<string, any[]>>({});
  const [directors, setDirectors] = useState<any[]>([]);
  const [selectedDirector, setSelectedDirector] = useState("");
  const [assigningDirector, setAssigningDirector] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (projectId) loadData();
  }, [projectId, activeRole]);

  async function loadData() {
    const [projRes, stagesRes, membersRes, auditRes] = await Promise.all([
      supabase.from("projects").select("*, programs(name), modalities(name), user_profiles!projects_director_id_fkey(full_name)").eq("id", projectId!).maybeSingle(),
      supabase.from("project_stages").select("*").eq("project_id", projectId!).order("created_at"),
      supabase.from("project_members").select("*").eq("project_id", projectId!),
      (activeRole === "COORDINATOR" || activeRole === "DECANO")
        ? supabase.from("audit_events").select("*").eq("project_id", projectId!).order("created_at", { ascending: false })
        : Promise.resolve({ data: [] }),
    ]);

    setProject(projRes.data);
    const stagesList = stagesRes.data || [];
    setStages(stagesList);
    setAuditEvents(auditRes.data || []);

    // Cargar deadlines de cada etapa que está en CON_OBSERVACIONES
    const deadlineMap: Record<string, any> = {};
    const stagesWithDeadline = stagesList.filter(s => s.system_state === "CON_OBSERVACIONES" || s.official_state === "APROBADA_CON_MODIFICACIONES");
    if (stagesWithDeadline.length > 0) {
      const stageIds = stagesWithDeadline.map(s => s.id);
      const { data: deadlines } = await supabase
        .from("deadlines")
        .select("*")
        .in("project_stage_id", stageIds)
        .order("created_at", { ascending: false });
      if (deadlines) {
        for (const dl of deadlines) {
          // Solo guardar el más reciente por etapa
          if (!deadlineMap[dl.project_stage_id]) {
            deadlineMap[dl.project_stage_id] = dl;
          }
        }
      }
    }
    setDeadlinesByStage(deadlineMap);

    // Cargar submissions por etapa (visible para DIRECTOR y COORDINATOR)
    const isAsesorOrCoord = roles.includes("ASESOR") || roles.includes("COORDINATOR") || roles.includes("DECANO");
    if (isAsesorOrCoord && stagesList.length > 0) {
      const stageIds = stagesList.map((s: any) => s.id);
      const { data: allSubs } = await supabase
        .from("submissions")
        .select("*")
        .in("project_stage_id", stageIds)
        .order("version", { ascending: false });

      // Agrupar por etapa
      const subsMap: Record<string, any[]> = {};
      for (const sub of allSubs || []) {
        if (!subsMap[sub.project_stage_id]) subsMap[sub.project_stage_id] = [];
        subsMap[sub.project_stage_id].push(sub);
      }
      setSubmissionsByStage(subsMap);

      // Pre-cargar signed URLs para archivos privados
      const filePaths = (allSubs || []).map((s: any) => s.file_url).filter(Boolean);
      if (filePaths.length > 0) {
        const results = await Promise.all(
          filePaths.map((path: string) => supabase.storage.from("documents").createSignedUrl(path, 3600))
        );
        const urlMap: Record<string, string> = {};
        results.forEach((res, i) => {
          if (res.data?.signedUrl) urlMap[filePaths[i]] = res.data.signedUrl;
        });
        setSignedUrls(urlMap);
      }
    }

    // Cargar evaluaciones por etapa
    if (stagesList.length > 0) {
      const stageIds = stagesList.map((s: any) => s.id);
      const { data: evals } = await supabase
        .from("evaluations")
        .select("*")
        .in("project_stage_id", stageIds);

      if (evals && evals.length > 0) {
        const evaluatorIds = [...new Set(evals.map((e: any) => e.evaluator_id))];
        const { data: evalProfiles } = await supabase
          .from("user_profiles")
          .select("id, full_name")
          .in("id", evaluatorIds);
        const profMap = (evalProfiles || []).reduce((acc: any, p: any) => { acc[p.id] = p; return acc; }, {});

        const evalsMap: Record<string, any[]> = {};
        for (const ev of evals) {
          const enriched = { ...ev, _evaluator: profMap[ev.evaluator_id] };
          if (!evalsMap[ev.project_stage_id!]) evalsMap[ev.project_stage_id!] = [];
          evalsMap[ev.project_stage_id!].push(enriched);
        }
        setEvaluationsByStage(evalsMap);
      } else {
        setEvaluationsByStage({});
      }
    }
    const rawMembers = membersRes.data || [];
    if (rawMembers.length > 0) {
      const userIds = rawMembers.map((m: any) => m.user_id);
      const { data: profiles } = await supabase.from("user_profiles").select("id, full_name, email").in("id", userIds);
      const profileMap = (profiles || []).reduce((acc: any, p: any) => { acc[p.id] = p; return acc; }, {});
      setMembers(rawMembers.map((m: any) => ({ ...m, user_profiles: profileMap[m.user_id] || null })));
    } else {
      setMembers([]);
    }

    // Cargar asesores disponibles si es coordinador
    if (activeRole === "COORDINATOR") {
      const { data: asesorRoles } = await supabase.from("user_roles").select("user_id").eq("role", "ASESOR");
      if (asesorRoles && asesorRoles.length > 0) {
        const { data: asesorProfiles } = await supabase.from("user_profiles").select("id, full_name, email").in("id", asesorRoles.map(r => r.user_id));
        setDirectors(asesorProfiles || []);
      }
    }

    setLoading(false);
  }

  async function handleAssignAsesor() {
    if (!selectedDirector || !projectId) return;
    setAssigningDirector(true);
    try {
      const { error } = await supabase.from("projects").update({ asesor_id: selectedDirector }).eq("id", projectId);
      if (error) throw error;

      // Agregar como miembro del proyecto
      await supabase.from("project_members").insert({
        project_id: projectId,
        user_id: selectedDirector,
        role: "ASESOR" as any,
      });

      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("audit_events").insert({
        project_id: projectId,
        user_id: user?.id,
        event_type: "ASESOR_ASSIGNED",
        description: "Asesor asignado al proyecto",
      });

      toast({ title: "Asesor asignado exitosamente" });
      loadData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setAssigningDirector(false);
    }
  }

  if (loading) return <InlineSpinner text="Cargando..." />;
  if (!project) return <div className="py-8 text-center text-muted-foreground">Proyecto no encontrado</div>;

  const statusColor: Record<string, string> = {
    VIGENTE: "bg-success text-success-foreground",
    FINALIZADO: "bg-muted text-muted-foreground",
    VENCIDO: "bg-destructive text-destructive-foreground",
    CANCELADO: "bg-destructive/80 text-destructive-foreground",
  };

  // Determinar enlace de evaluación según etapa actual
  const currentStage = stages.length > 0 ? stages[stages.length - 1] : null;
  function getEvalLink() {
    if (!currentStage || activeRole !== "COORDINATOR") return null;
    const { stage_name, system_state, id } = currentStage;
    if (stage_name === "PROPUESTA" && system_state === "RADICADA") return `/proposals/${id}/evaluate`;
    if (stage_name === "ANTEPROYECTO") {
      if (system_state === "RADICADA" || system_state === "AVALADO") return `/anteproyecto/${id}/assign-jurors`;
      if (system_state === "EN_REVISION") return `/anteproyecto/${id}/consolidate`;
    }
    if (stage_name === "INFORME_FINAL") {
      if (system_state === "RADICADA" || system_state === "AVALADO") return `/informe-final/${id}/assign-jurors`;
      if (system_state === "EN_REVISION") return `/informe-final/${id}/consolidate`;
    }
    if (stage_name === "SUSTENTACION") {
      if (system_state === "BORRADOR") return `/sustentacion/${id}/schedule`;
      if (system_state === "RADICADA") return `/sustentacion/${id}/record-result`;
    }
    return null;
  }
  const evalLink = getEvalLink();

  // Determinar enlace de aval para asesores
  function getEndorseLink() {
    if (!currentStage || activeRole !== "ASESOR") return null;
    if (project.asesor_id !== user?.id) return null;
    const { stage_name, system_state, id } = currentStage;
    if ((stage_name === "ANTEPROYECTO" || stage_name === "INFORME_FINAL") && system_state === "RADICADA") {
      const prefix = stage_name === "INFORME_FINAL" ? "informe-final" : "anteproyecto";
      return { url: `/${prefix}/${id}/endorse`, label: `Avalar ${stage_name === "INFORME_FINAL" ? "Informe Final" : "Anteproyecto"}` };
    }
    return null;
  }
  const endorseInfo = getEndorseLink();

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{project.title}</h1>
          <p className="text-muted-foreground text-sm">{project.description}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {endorseInfo && (
            <Link to={endorseInfo.url}>
              <Button size="sm" variant="default" className="gap-1.5 shadow-sm">
                <ShieldCheck className="h-4 w-4" />
                {endorseInfo.label}
              </Button>
            </Link>
          )}
          {evalLink && (
            <Link to={evalLink}>
              <Button size="sm" className="gap-1.5 shadow-sm">
                <ClipboardCheck className="h-4 w-4" />
                Evaluar
              </Button>
            </Link>
          )}
          <Badge className={statusColor[project.global_status] || "bg-muted"}>
            {project.global_status}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <Card>
          <CardContent className="py-3">
            <p className="text-muted-foreground text-xs">Programa</p>
            <p className="font-medium">{project.programs?.name}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <p className="text-muted-foreground text-xs">Modalidad</p>
            <p className="font-medium">{project.modalities?.name}</p>
          </CardContent>
        </Card>
      </div>

      {/* Asesor */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Asesor del Proyecto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {project.asesor_id && (
            <div className="flex items-center gap-3 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>{project.user_profiles?.full_name}</span>
              <Badge variant="outline" className="text-xs">Asesor</Badge>
            </div>
          )}
          {activeRole === "COORDINATOR" && directors.length > 0 && (
            <div className="space-y-2">
              {!project.asesor_id && (
                <p className="text-sm text-muted-foreground">Este proyecto no tiene asesor asignado.</p>
              )}
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Select value={selectedDirector} onValueChange={setSelectedDirector}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar asesor" />
                    </SelectTrigger>
                    <SelectContent>
                      {directors.map(d => (
                        <SelectItem key={d.id} value={d.id}>{d.full_name} ({d.email})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button size="sm" onClick={handleAssignAsesor} disabled={!selectedDirector || assigningDirector} className="gap-1">
                  <Users className="h-3 w-3" />{project.asesor_id ? "Cambiar" : "Asignar"}
                </Button>
              </div>
            </div>
          )}
          {!project.asesor_id && activeRole !== "COORDINATOR" && (
            <p className="text-sm text-muted-foreground italic">Sin asesor asignado</p>
          )}
        </CardContent>
      </Card>

      {/* Members */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Integrantes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {members.filter((m) => m.role === "AUTHOR").map((m) => (
            <div key={m.id} className="flex items-center gap-3 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>{m.user_profiles?.full_name || m.user_profiles?.email}</span>
              <Badge variant="outline" className="text-xs">{m.role}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Stages */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Etapas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {stages.map((s) => {
            const deadline = deadlinesByStage[s.id];
            const dueDate = deadline ? new Date(deadline.due_date) : null;
            const now = new Date();
            const daysLeft = dueDate ? Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
            const isOverdue = daysLeft !== null && daysLeft < 0;

            return (
              <div key={s.id} className="flex items-start justify-between rounded-lg border p-3 gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{s.stage_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.system_state} — {s.official_state}
                  </p>
                  {s.observations && (
                    <p className="text-xs text-muted-foreground mt-1">📝 {s.observations}</p>
                  )}
                  {deadline && dueDate && (
                    <div className={`flex items-center gap-1.5 mt-2 text-sm font-medium rounded-md px-3 py-1.5 w-fit border ${isOverdue ? "bg-destructive text-destructive-foreground border-destructive" : daysLeft !== null && daysLeft <= 2 ? "bg-destructive/15 text-destructive border-destructive/40" : "bg-primary/10 text-primary border-primary/30"}`}>
                      <CalendarClock className="h-3.5 w-3.5 shrink-0" />
                      <span>
                        <span className="font-medium">Fecha límite correcciones:</span>{" "}
                        {dueDate.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" })}
                        {" "}
                        {isOverdue
                          ? <span className="font-semibold">(Vencido)</span>
                          : daysLeft === 0
                            ? <span className="font-semibold">(Vence hoy)</span>
                            : <span>({daysLeft} {daysLeft === 1 ? "día" : "días"} restantes)</span>}
                      </span>
                    </div>
                  )}
                  {evaluationsByStage[s.id]?.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      <p className="text-xs font-semibold text-muted-foreground">Evaluaciones de Jurados:</p>
                      {evaluationsByStage[s.id].map((ev: any) => (
                        <div key={ev.id} className="flex items-center gap-2 text-xs flex-wrap">
                          <User className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="font-medium">{ev._evaluator?.full_name || "Evaluador"}</span>
                          <Badge variant={ev.official_result === "APROBADA" ? "default" : ev.official_result === "NO_APROBADA" ? "destructive" : "outline"} className="text-[10px]">
                            {ev.official_result || "Pendiente"}
                          </Badge>
                          {ev.observations && (
                            <span className="text-muted-foreground">— {ev.observations}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {s.final_grade !== null && (
                  <Badge className="text-sm shrink-0">{s.final_grade}</Badge>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Documentos por etapa (Director, Coordinador, Decano) */}
      {(roles.includes("ASESOR") || roles.includes("COORDINATOR") || roles.includes("DECANO")) &&
        Object.keys(submissionsByStage).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Documentos Radicados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {stages.map((s) => {
              const subs = submissionsByStage[s.id];
              if (!subs || subs.length === 0) return null;
              return (
                <div key={s.id}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">{s.stage_name}</p>
                  <div className="space-y-2">
                    {subs.map((sub: any) => (
                      <div key={sub.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline">v{sub.version}</Badge>
                          {sub.external_url && (
                            <a href={sub.external_url} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1 text-primary underline">
                              <ExternalLink className="h-3 w-3" /> URL externa
                            </a>
                          )}
                          {sub.file_url && signedUrls[sub.file_url] && (
                            <a href={signedUrls[sub.file_url]} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1 text-primary underline">
                              <FileText className="h-3 w-3" /> Archivo PDF
                            </a>
                          )}
                          {!sub.external_url && !sub.file_url && (
                            <span className="text-muted-foreground">Sin enlace</span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(sub.created_at).toLocaleDateString("es-CO")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Audit trail (coordinator/decano) */}
      {auditEvents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Línea de Tiempo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {auditEvents.map((evt) => {
                const Icon = eventIcons[evt.event_type] || Clock;
                return (
                  <div key={evt.id} className="flex gap-3 text-sm">
                    <div className="mt-0.5">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p>{evt.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(evt.created_at).toLocaleString("es-CO")}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
