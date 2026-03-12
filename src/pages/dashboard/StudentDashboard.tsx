/**
 * StudentDashboard.tsx - Dashboard del estudiante con upload de documentos por etapa
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FolderPlus, FileText, Clock, CheckCircle, AlertCircle, AlertTriangle, Eye, Send, Upload, Pencil } from "lucide-react";

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
  const [submissionsByStage, setSubmissionsByStage] = useState<Record<string, any[]>>({});
  const [evaluationsByStage, setEvaluationsByStage] = useState<Record<string, any[]>>({});
  const [endorsementsByStage, setEndorsementsByStage] = useState<Record<string, any[]>>({});
  const [deadlinesByStage, setDeadlinesByStage] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  // Upload dialog state
  const [uploadStage, setUploadStage] = useState<any>(null);
  const [uploadUrl, setUploadUrl] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadNotes, setUploadNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  // Edit dialog state
  const [editSubmission, setEditSubmission] = useState<any>(null);
  const [editUrl, setEditUrl] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editing, setEditing] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  // Signed URL cache: maps storage path -> temporary URL
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  useEffect(() => { if (user) loadProject(); }, [user]);

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

        const evalMap: Record<string, any[]> = {};
        const endorseMap: Record<string, any[]> = {};
        const subsMap: Record<string, any[]> = {};
        const deadlineMap: Record<string, any> = {};

        for (const stage of stagesList) {
          const { data: subs } = await supabase
            .from("submissions").select("id, version, external_url, file_url, notes, created_at")
            .eq("project_stage_id", stage.id).order("version", { ascending: false });
          subsMap[stage.id] = subs || [];

          if (subs && subs.length > 0) {
            const subIds = subs.map(s => s.id);
            const { data: evals } = await supabase
              .from("evaluations").select("*, user_profiles:evaluator_id(full_name)")
              .in("submission_id", subIds);
            evalMap[stage.id] = evals || [];

            const { data: endorsements } = await supabase
              .from("endorsements").select("*, user_profiles:endorsed_by(full_name)")
              .in("submission_id", subIds);
            endorseMap[stage.id] = endorsements || [];
          }

          // Cargar deadline para etapas CON_OBSERVACIONES
          if (stage.system_state === "CON_OBSERVACIONES") {
            const { data: deadlines } = await supabase
              .from("deadlines")
              .select("*")
              .eq("project_stage_id", stage.id)
              .order("created_at", { ascending: false })
              .limit(1);
            if (deadlines && deadlines.length > 0) {
              deadlineMap[stage.id] = deadlines[0];

              // Si la fecha límite ya venció, actualizar la etapa a NO_APROBADA / CERRADA
              const now = new Date();
              const due = new Date(deadlines[0].due_date);
              if (due < now) {
                await supabase.from("project_stages").update({
                  system_state: "CERRADA",
                  official_state: "NO_APROBADA",
                }).eq("id", stage.id);
                await supabase.from("audit_events").insert({
                  project_id: proj.id,
                  user_id: user!.id,
                  event_type: "STAGE_EXPIRED",
                  description: `Etapa ${stage.stage_name} marcada como NO_APROBADA por vencimiento del plazo de correcciones`,
                  metadata: { stage_id: stage.id },
                });
              }
            }
          }
        }
        setSubmissionsByStage(subsMap);
        setEvaluationsByStage(evalMap);
        setEndorsementsByStage(endorseMap);
        setDeadlinesByStage(deadlineMap);
      }
    }
    setLoading(false);
  }

  /** Genera una signed URL temporal (1 hora) para un path del bucket privado */
  async function getSignedUrl(path: string): Promise<string | null> {
    if (signedUrls[path]) return signedUrls[path];
    const { data, error } = await supabase.storage.from("documents").createSignedUrl(path, 3600);
    if (error || !data?.signedUrl) return null;
    setSignedUrls(prev => ({ ...prev, [path]: data.signedUrl }));
    return data.signedUrl;
  }

  async function openFileUrl(path: string) {
    const url = await getSignedUrl(path);
    if (url) window.open(url, "_blank", "noopener");
    else toast({ title: "No se pudo abrir el archivo", variant: "destructive" });
  }

  async function handleUploadDocument() {
    if (!user || !project || !uploadStage) return;
    setUploading(true);

    try {
      let fileUrl: string | null = null;

      // Upload file to storage if provided — store the path, not the public URL
      if (uploadFile) {
        const ext = uploadFile.name.split(".").pop();
        const storagePath = `${user.id}/${project.id}/${uploadStage.id}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("documents").upload(storagePath, uploadFile);
        if (uploadErr) throw uploadErr;
        fileUrl = storagePath; // store path, not public URL
      }

      const { count } = await supabase.from("submissions")
        .select("*", { count: "exact", head: true }).eq("project_stage_id", uploadStage.id);
      const version = (count || 0) + 1;

      const { error: subErr } = await supabase.from("submissions").insert({
        project_stage_id: uploadStage.id,
        submitted_by: user.id,
        version,
        external_url: uploadUrl || null,
        file_url: fileUrl,
        notes: uploadNotes || null,
      });
      if (subErr) throw subErr;

      // Update stage to RADICADA if BORRADOR or CON_OBSERVACIONES
      if (uploadStage.system_state === "BORRADOR" || uploadStage.system_state === "CON_OBSERVACIONES") {
        await supabase.from("project_stages").update({ system_state: "RADICADA" }).eq("id", uploadStage.id);
      }

      await supabase.from("audit_events").insert({
        project_id: project.id, user_id: user.id,
        event_type: `${uploadStage.stage_name}_SUBMITTED`,
        description: `Documento radicado para ${uploadStage.stage_name} (v${version})`,
        metadata: { version, stage_id: uploadStage.id },
      });

      toast({ title: "Documento radicado exitosamente" });
      setUploadOpen(false);
      setUploadUrl(""); setUploadFile(null); setUploadNotes(""); setUploadStage(null);
      loadProject();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  async function handleEditSubmission() {
    if (!user || !editSubmission || !project) return;
    setEditing(true);
    try {
      let fileUrl = editSubmission.file_url;

      if (editFile) {
        const ext = editFile.name.split(".").pop();
        const storagePath = `${user.id}/${project.id}/${editSubmission.project_stage_id}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("documents").upload(storagePath, editFile);
        if (uploadErr) throw uploadErr;
        fileUrl = storagePath; // store path, not public URL
      }

      const { error } = await supabase.from("submissions").update({
        external_url: editUrl || null,
        file_url: fileUrl,
        notes: editNotes || null,
      }).eq("id", editSubmission.id);
      if (error) throw error;

      await supabase.from("audit_events").insert({
        project_id: project.id, user_id: user.id,
        event_type: "SUBMISSION_EDITED",
        description: `Documento editado (v${editSubmission.version})`,
        metadata: { submission_id: editSubmission.id, version: editSubmission.version },
      });

      toast({ title: "Documento actualizado exitosamente" });
      setEditOpen(false);
      setEditSubmission(null);
      loadProject();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setEditing(false);
    }
  }

  function openEditDialog(sub: any) {
    setEditSubmission(sub);
    setEditUrl(sub.external_url || "");
    setEditNotes(sub.notes || "");
    setEditFile(null);
    setEditOpen(true);
  }

  async function handleRequestEndorsement(stage: any) {
    if (!user || !project) return;
    if (stage.system_state !== "RADICADA") {
      toast({ title: "La etapa debe estar radicada para solicitar aval", variant: "destructive" });
      return;
    }
    try {
      await supabase.from("audit_events").insert({
        project_id: project.id, user_id: user.id,
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

  function canUpload(stage: any) {
    return ["BORRADOR", "CON_OBSERVACIONES"].includes(stage.system_state) && stage.stage_name !== "SUSTENTACION";
  }

  function getStageActions(stage: any) {
    const actions: React.ReactNode[] = [];

    // Upload document button
    if (canUpload(stage)) {
      actions.push(
        <Button key="upload" size="sm" variant="outline" className="text-xs gap-1"
          onClick={() => { setUploadStage(stage); setUploadOpen(true); }}>
          <Upload className="h-3 w-3" />Subir Documento
        </Button>
      );
    }

    // Request endorsement (ANTEPROYECTO, INFORME_FINAL when RADICADA)
    if ((stage.stage_name === "ANTEPROYECTO" || stage.stage_name === "INFORME_FINAL") && stage.system_state === "RADICADA") {
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
    if (stage.stage_name === "SUSTENTACION" && stage.system_state === "CERRADA" && stage.final_grade !== null && stage.final_grade >= 70 && project.global_status === "VIGENTE") {
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

      <div>
        <h2 className="text-lg font-semibold mb-3">Avance por Etapas</h2>
        <div className="space-y-4">
          {stageOrder.map((stageName) => {
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
            const submissions = submissionsByStage[stage.id] || [];
            const deadline = deadlinesByStage[stage.id];
            const actions = getStageActions(stage);

            return (
              <Card key={stage.id}>
                <CardContent className="py-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-accent p-2">
                        {stage.system_state === "CERRADA" && stage.official_state === "APROBADA"
                          ? <CheckCircle className="h-4 w-4 text-success" />
                          : stage.official_state === "NO_APROBADA"
                            ? <AlertCircle className="h-4 w-4 text-destructive" />
                            : <Clock className="h-4 w-4 text-accent-foreground" />}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{stageNameLabels[stageName]}</p>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">{stateLabels[stage.system_state]}</Badge>
                          <Badge variant="outline" className="text-xs">{officialLabels[stage.official_state]}</Badge>
                        </div>
                      </div>
                    </div>
                    {stage.final_grade !== null && <Badge className="text-sm">Nota: {stage.final_grade}/100</Badge>}
                  </div>

                  {stage.observations && (
                    <div className="rounded-lg bg-muted/50 p-3 text-sm">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Observaciones:</p>
                      <p className="text-sm">{stage.observations}</p>
                    </div>
                  )}

                  {/* Alerta de fecha límite para correcciones */}
                  {stage.system_state === "CON_OBSERVACIONES" && deadline && (() => {
                    const due = new Date(deadline.due_date);
                    const now = new Date();
                    const diffMs = due.getTime() - now.getTime();
                    const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                    const isUrgent = daysLeft <= 2 && daysLeft >= 0;
                    const isOverdue = daysLeft < 0;
                    return (
                      <Alert variant={isOverdue ? "destructive" : "default"} className={isUrgent && !isOverdue ? "border-warning bg-warning/10" : ""}>
                        <AlertTriangle className={`h-4 w-4 ${isOverdue ? "" : isUrgent ? "text-warning" : "text-primary"}`} />
                        <AlertTitle className="text-sm font-semibold">
                          {isOverdue
                            ? "Plazo de correcciones vencido"
                            : "Debes radicar las correcciones antes de:"}
                        </AlertTitle>
                        <AlertDescription className="text-xs mt-1">
                          {isOverdue ? (
                            <span>El plazo venció el <strong>{due.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" })}</strong>. La etapa será marcada como <strong>No Aprobada</strong>.</span>
                          ) : (
                            <span>
                              <strong>{due.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" })}</strong>
                              {" — "}
                              {daysLeft === 0
                                ? <span className="font-semibold text-destructive">¡Vence hoy!</span>
                                : daysLeft === 1
                                  ? <span className="font-semibold text-warning">Queda 1 día</span>
                                  : <span>Quedan <strong>{daysLeft} días</strong></span>}
                            </span>
                          )}
                        </AlertDescription>
                      </Alert>
                    );
                  })()}

                  {/* Documentos subidos */}
                  {submissions.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Documentos radicados:</p>
                      {submissions.map((sub: any) => {
                        const canEdit = ["BORRADOR", "CON_OBSERVACIONES"].includes(stage.system_state);
                        return (
                          <div key={sub.id} className="rounded-lg border p-2 text-sm flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <FileText className="h-3 w-3 text-muted-foreground" />
                              <Badge variant="outline" className="text-xs">v{sub.version}</Badge>
                              {sub.external_url && <a href={sub.external_url} target="_blank" rel="noopener" className="text-primary underline text-xs">URL</a>}
                              {sub.file_url && (
                                <button onClick={() => openFileUrl(sub.file_url)} className="text-primary underline text-xs cursor-pointer">
                                  Archivo
                                </button>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {canEdit && (
                                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => openEditDialog(sub)} title="Editar documento">
                                  <Pencil className="h-3 w-3" />
                                </Button>
                              )}
                              <span className="text-xs text-muted-foreground">{new Date(sub.created_at).toLocaleDateString("es-CO")}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {endorsements.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Aval del Director:</p>
                      {endorsements.map((end: any) => (
                        <div key={end.id} className="rounded-lg border p-2 text-sm flex items-start gap-2">
                          {end.approved ? <CheckCircle className="h-4 w-4 text-success mt-0.5 shrink-0" /> : <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />}
                          <div>
                            <p className="text-xs"><span className="font-medium">{end.user_profiles?.full_name}</span> — {end.approved ? "Avalado" : "Denegado"}</p>
                            {end.comments && <p className="text-xs text-muted-foreground mt-0.5">{end.comments}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

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
                                {ev.official_result === "APROBADO" ? "Aprobado" : ev.official_result === "APLAZADO_POR_MODIFICACIONES" ? "Con modificaciones" : "No aprobado"}
                              </Badge>
                            )}
                          </div>
                          {ev.observations && <p className="text-xs text-muted-foreground mt-1 ml-5">{ev.observations}</p>}
                        </div>
                      ))}
                    </div>
                  )}

                  {actions.length > 0 && <div className="flex gap-2 flex-wrap pt-1">{actions}</div>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Subir Documento — {uploadStage && stageNameLabels[uploadStage.stage_name]}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Enlace URL (Google Drive, etc.)</Label>
              <Input type="url" value={uploadUrl} onChange={e => setUploadUrl(e.target.value)} placeholder="https://drive.google.com/..." />
            </div>
            <div className="space-y-2">
              <Label>O subir archivo PDF</Label>
              <Input type="file" accept=".pdf,.doc,.docx" onChange={e => setUploadFile(e.target.files?.[0] || null)} />
            </div>
            <div className="space-y-2">
              <Label>Notas adicionales</Label>
              <Textarea value={uploadNotes} onChange={e => setUploadNotes(e.target.value)} placeholder="Notas opcionales" rows={3} />
            </div>
            <div className="flex gap-3">
              <Button onClick={handleUploadDocument} disabled={uploading || (!uploadUrl && !uploadFile)}>
                {uploading ? "Subiendo..." : "Radicar Documento"}
              </Button>
              <Button variant="outline" onClick={() => setUploadOpen(false)}>Cancelar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Documento — v{editSubmission?.version}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Enlace URL (Google Drive, etc.)</Label>
              <Input type="url" value={editUrl} onChange={e => setEditUrl(e.target.value)} placeholder="https://drive.google.com/..." />
            </div>
            <div className="space-y-2">
              <Label>Reemplazar archivo PDF</Label>
              <Input type="file" accept=".pdf,.doc,.docx" onChange={e => setEditFile(e.target.files?.[0] || null)} />
              {editSubmission?.file_url && !editFile && (
                <p className="text-xs text-muted-foreground">
                  Archivo actual:{" "}
                  <button onClick={() => openFileUrl(editSubmission.file_url)} className="text-primary underline cursor-pointer">
                    Ver archivo
                  </button>
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Notas adicionales</Label>
              <Textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="Notas opcionales" rows={3} />
            </div>
            <div className="flex gap-3">
              <Button onClick={handleEditSubmission} disabled={editing || (!editUrl && !editFile && !editSubmission?.file_url)}>
                {editing ? "Guardando..." : "Guardar Cambios"}
              </Button>
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
