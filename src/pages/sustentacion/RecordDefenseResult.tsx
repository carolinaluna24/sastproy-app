import { useState, useEffect } from "react";
import { InlineSpinner } from "@/components/LoadingSpinner";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/**
 * Coordinador registra el resultado de la sustentación.
 * Escala: REPROBADA (<69), APROBADA (70-94), MERITORIA (95-99), LAUREADA (100)
 * La nota la registra manualmente el coordinador (NO promedios automáticos).
 */

function getGradeLabel(grade: number): string {
  if (grade < 70) return "REPROBADA";
  if (grade <= 94) return "APROBADA";
  if (grade <= 99) return "MERITORIA";
  return "LAUREADA";
}

function getGradeOfficialState(grade: number): string {
  if (grade < 70) return "NO_APROBADA";
  return "APROBADA";
}

export default function RecordDefenseResult() {
  const { stageId } = useParams<{ stageId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [stage, setStage] = useState<any>(null);
  const [project, setProject] = useState<any>(null);
  const [defenseSession, setDefenseSession] = useState<any>(null);
  const [grade, setGrade] = useState("");
  const [observations, setObservations] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [stageId]);

  async function loadData() {
    if (!stageId) return;
    const { data: stageData } = await supabase.from("project_stages").select("*").eq("id", stageId).maybeSingle();
    setStage(stageData);
    if (stageData) {
      const { data: proj } = await supabase.from("projects").select("*, programs(name)").eq("id", stageData.project_id).maybeSingle();
      setProject(proj);
      const { data: session } = await supabase.from("defense_sessions").select("*").eq("stage_id", stageId).maybeSingle();
      setDefenseSession(session);
    }
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !stage) return;
    const gradeNum = parseInt(grade, 10);
    if (isNaN(gradeNum) || gradeNum < 0 || gradeNum > 100) {
      toast({ title: "Error", description: "La nota debe estar entre 0 y 100", variant: "destructive" });
      return;
    }
    setSubmitting(true);

    try {
      const label = getGradeLabel(gradeNum);
      const officialState = getGradeOfficialState(gradeNum);

      // Actualizar etapa con nota y estado
      const { error } = await supabase.from("project_stages").update({
        final_grade: gradeNum,
        official_state: officialState as any,
        system_state: "CERRADA" as const,
        observations: `${label} (${gradeNum}/100). ${observations}`,
      }).eq("id", stage.id);
      if (error) throw error;

      // Si aprobada (>=70), crear deadline de 8 días para entrega final
      if (gradeNum >= 70) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 8);
        await supabase.from("deadlines").insert({
          project_stage_id: stage.id,
          description: "Plazo para entrega final post-sustentación (8 días calendario)",
          due_date: dueDate.toISOString(),
          created_by: user.id,
        });
      }

      // Auditoría
      await supabase.from("audit_events").insert({
        project_id: stage.project_id, user_id: user.id,
        event_type: "DEFENSE_RESULT_RECORDED",
        description: `Sustentación: ${label} (${gradeNum}/100)`,
        metadata: { grade: gradeNum, label, observations },
      });

      toast({ title: `Resultado registrado: ${label} (${gradeNum}/100)` });
      navigate("/dashboard");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally { setSubmitting(false); }
  }

  if (loading) return <InlineSpinner text="Cargando..." />;
  if (!stage || !project) return <div className="py-8 text-center text-muted-foreground">No encontrado</div>;

  // Si ya tiene nota registrada
  if (stage.final_grade !== null) {
    const label = getGradeLabel(stage.final_grade);
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base">{project.title}</CardTitle></CardHeader>
          <CardContent className="text-center space-y-3">
            <p className="text-3xl font-bold">{stage.final_grade}/100</p>
            <p className="text-lg font-semibold">{label}</p>
            {stage.observations && <p className="text-sm text-muted-foreground">{stage.observations}</p>}
            <Button variant="outline" onClick={() => navigate("/dashboard")}>Volver</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Validar que la sustentación ya haya ocurrido
  const defensePending = !defenseSession || new Date(defenseSession.scheduled_at) > new Date();
  if (defensePending) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base">{project.title}</CardTitle><CardDescription>{project.programs?.name}</CardDescription></CardHeader>
          <CardContent className="text-center space-y-3">
            {!defenseSession ? (
              <p className="text-muted-foreground">No se ha programado una sustentación para este proyecto.</p>
            ) : (
              <>
                <p className="text-muted-foreground">
                  La sustentación está programada para el <span className="font-semibold text-foreground">{new Date(defenseSession.scheduled_at).toLocaleString("es-CO")}</span>.
                </p>
                <p className="text-sm text-muted-foreground">Solo se puede registrar el resultado después de la fecha de sustentación.</p>
              </>
            )}
            <Button variant="outline" onClick={() => navigate("/dashboard")}>Volver</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const gradeNum = parseInt(grade, 10);
  const gradePreview = !isNaN(gradeNum) && gradeNum >= 0 && gradeNum <= 100 ? getGradeLabel(gradeNum) : null;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">{project.title}</CardTitle><CardDescription>{project.programs?.name}</CardDescription></CardHeader>
      </Card>

      {defenseSession && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Datos de la Sustentación</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <p><span className="text-muted-foreground">Fecha:</span> {new Date(defenseSession.scheduled_at).toLocaleString("es-CO")}</p>
            <p><span className="text-muted-foreground">Lugar:</span> {defenseSession.location}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Registrar Resultado de Sustentación</CardTitle>
          <CardDescription>
            Escala: Reprobada (0-69) · Aprobada (70-94) · Meritoria (95-99) · Laureada (100)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="grade">Nota Final (0-100)</Label>
              <Input
                id="grade"
                type="number"
                min={0}
                max={100}
                step={1}
                value={grade}
                onChange={(e) => {
                  const val = e.target.value;
                  // Solo permitir enteros entre 0 y 100
                  if (val === "") {
                    setGrade("");
                    return;
                  }
                  const num = parseInt(val, 10);
                  if (!isNaN(num) && num >= 0 && num <= 100) {
                    setGrade(String(num));
                  }
                }}
                onKeyDown={(e) => {
                  // Bloquear punto, coma, "e" para evitar decimales/notación científica
                  if (e.key === "." || e.key === "," || e.key === "e" || e.key === "E") {
                    e.preventDefault();
                  }
                }}
                placeholder="Ej: 85"
                required
              />
              {gradePreview && (
                <p className="text-sm font-medium">
                  Mención: <span className={gradeNum < 69 ? "text-destructive" : "text-success"}>{gradePreview}</span>
                </p>
              )}
            </div>

            {gradePreview && gradeNum >= 70 && (
              <div className="rounded-lg bg-success/10 p-3 text-sm text-success">
                Se creará un plazo de 8 días calendario para entrega final post-sustentación.
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="observations">Observaciones</Label>
              <Textarea id="observations" value={observations} onChange={(e) => setObservations(e.target.value)} placeholder="Observaciones de la sustentación" rows={4} />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={submitting || !grade}>{submitting ? "Registrando..." : "Registrar Resultado"}</Button>
              <Button type="button" variant="outline" onClick={() => navigate("/dashboard")}>Cancelar</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
