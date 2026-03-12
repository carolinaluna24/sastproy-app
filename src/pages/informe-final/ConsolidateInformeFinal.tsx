import { useState, useEffect } from "react";
import { InlineSpinner } from "@/components/LoadingSpinner";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, XCircle, CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

const resultLabels: Record<string, string> = {
  APROBADO: "Aprobado",
  APLAZADO_POR_MODIFICACIONES: "Aplazado por Modificaciones",
  NO_APROBADO: "No Aprobado",
};
const resultIcons: Record<string, React.ElementType> = { APROBADO: CheckCircle, APLAZADO_POR_MODIFICACIONES: AlertTriangle, NO_APROBADO: XCircle };
const resultColors: Record<string, string> = { APROBADO: "text-success", APLAZADO_POR_MODIFICACIONES: "text-warning", NO_APROBADO: "text-destructive" };

/**
 * Coordinador consolida evaluaciones del informe final.
 * Si APROBADA => habilita SUSTENTACION
 * Si APLAZADO => deadline 10 días
 */
export default function ConsolidateInformeFinal() {
  const { stageId } = useParams<{ stageId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [stage, setStage] = useState<any>(null);
  const [project, setProject] = useState<any>(null);
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [consolidatedResult, setConsolidatedResult] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
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
      // Obtener las últimas 2 submissions
      const { data: subs } = await supabase
        .from("submissions")
        .select("id, version")
        .eq("project_stage_id", stageId)
        .order("version", { ascending: false })
        .limit(2);

      const latestSub = subs?.[0] || null;
      const previousSub = subs?.[1] || null;

      // Cargar evaluaciones de la última submission
      let evalsList: any[] = [];
      if (latestSub) {
        const { data: evals } = await supabase
          .from("evaluations")
          .select("*")
          .eq("project_stage_id", stageId)
          .eq("submission_id", latestSub.id);
        evalsList = evals || [];
      }

      // Si es versión > 1, traer evaluaciones APROBADO de la versión anterior
      if (latestSub && latestSub.version > 1 && previousSub) {
        const { data: prevEvals } = await supabase
          .from("evaluations")
          .select("*")
          .eq("project_stage_id", stageId)
          .eq("submission_id", previousSub.id);

        const currentEvaluatorIds = new Set(evalsList.map(e => e.evaluator_id));
        for (const pe of (prevEvals || [])) {
          if (pe.official_result === "APROBADO" && !currentEvaluatorIds.has(pe.evaluator_id)) {
            evalsList.push({ ...pe, _carriedOver: true });
          }
        }
      }

      // Fetch profiles separately (no FK relation)
      const evaluatorIds = [...new Set(evalsList.map(e => e.evaluator_id))];
      let profilesMap: Record<string, any> = {};
      if (evaluatorIds.length > 0) {
        const { data: profiles } = await supabase.from("user_profiles").select("id, full_name, email").in("id", evaluatorIds);
        (profiles || []).forEach(p => { profilesMap[p.id] = p; });
      }
      const evalsWithProfiles = evalsList.map(e => ({ ...e, user_profiles: profilesMap[e.evaluator_id] || null }));
      setEvaluations(evalsWithProfiles);
      if (evalsList.length >= 2) {
        const results = evalsList.map((e) => e.official_result);
        const allApproved = results.every((r) => r === "APROBADO");
        const allRejected = results.every((r) => r === "NO_APROBADO");
        if (allApproved) setConsolidatedResult("APROBADA");
        else if (allRejected) setConsolidatedResult("NO_APROBADA");
        else setConsolidatedResult("APROBADA_CON_MODIFICACIONES");
      }
    }
    setLoading(false);
  }

  async function handleConsolidate() {
    if (!user || !stage || !consolidatedResult) return;
    if (consolidatedResult === "APROBADA_CON_MODIFICACIONES" && !dueDate) {
      toast({ title: "Selecciona una fecha límite para las correcciones", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      // Si APROBADA_CON_MODIFICACIONES, se deja en CON_OBSERVACIONES para que el estudiante pueda radicar la versión 2
      const newSystemState = consolidatedResult === "APROBADA_CON_MODIFICACIONES" ? "CON_OBSERVACIONES" : "CERRADA";
      const { error } = await supabase.from("project_stages").update({
        official_state: consolidatedResult as any,
        system_state: newSystemState as any,
        observations: evaluations.map((e) =>
          `${(e.user_profiles as any)?.full_name}: ${e.official_result} - ${e.observations || "Sin observaciones"}`
        ).join("\n"),
      }).eq("id", stage.id);
      if (error) throw error;

      // Si APLAZADO => deadline con la fecha seleccionada
      if (consolidatedResult === "APROBADA_CON_MODIFICACIONES" && dueDate) {
        await supabase.from("deadlines").insert({
          project_stage_id: stage.id,
          description: "Plazo para correcciones del informe final",
          due_date: dueDate.toISOString(),
          created_by: user.id,
        });
      }

      // Si APROBADA => crear etapa SUSTENTACION
      if (consolidatedResult === "APROBADA") {
        await supabase.from("project_stages").insert({
          project_id: stage.project_id,
          stage_name: "SUSTENTACION" as const,
          system_state: "BORRADOR" as const,
        });
        await supabase.from("audit_events").insert({
          project_id: stage.project_id, user_id: user.id,
          event_type: "SUSTENTACION_STAGE_CREATED",
          description: "Etapa SUSTENTACIÓN habilitada tras aprobación del informe final",
        });
      }

      await supabase.from("audit_events").insert({
        project_id: stage.project_id, user_id: user.id,
        event_type: "INFORME_FINAL_CONSOLIDATED",
        description: `Informe final consolidado: ${consolidatedResult}`,
        metadata: { consolidated_result: consolidatedResult, evaluations: evaluations.map((e) => ({ evaluator: (e.user_profiles as any)?.full_name, result: e.official_result })) },
      });

      toast({ title: "Estado consolidado registrado" });
      navigate("/dashboard");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally { setSubmitting(false); }
  }

  if (loading) return <InlineSpinner text="Cargando..." />;
  if (!stage || !project) return <div className="py-8 text-center text-muted-foreground">No encontrado</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Card><CardHeader><CardTitle className="text-base">{project.title}</CardTitle><CardDescription>{project.programs?.name}</CardDescription></CardHeader></Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Evaluaciones de Jurados</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {evaluations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Aún no hay evaluaciones registradas</p>
          ) : evaluations.map((ev) => {
            const Icon = resultIcons[ev.official_result] || AlertTriangle;
            const color = resultColors[ev.official_result] || "";
            return (
              <div key={ev.id} className="rounded-lg border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${color}`} />
                    <span className="font-medium text-sm">{(ev.user_profiles as any)?.full_name || (ev.user_profiles as any)?.email}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {ev._carriedOver && <Badge variant="secondary" className="text-xs">Versión anterior</Badge>}
                    <Badge variant="outline" className="text-xs">{resultLabels[ev.official_result] || ev.official_result}</Badge>
                  </div>
                </div>
                {ev.observations && <p className="text-sm text-muted-foreground">📝 {ev.observations}</p>}
                <p className="text-xs text-muted-foreground">{new Date(ev.created_at).toLocaleString("es-CO")}</p>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {consolidatedResult && (
        <Card>
          <CardHeader>
            <CardTitle>Consolidar Estado Final</CardTitle>
            <CardDescription>Resultado consolidado basado en evaluaciones:</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-accent p-4 text-center">
              <p className="text-lg font-bold">{consolidatedResult.replace(/_/g, " ")}</p>
              {consolidatedResult === "APROBADA_CON_MODIFICACIONES" && (
                <div className="mt-3 space-y-2 text-left">
                  <Label>Fecha límite para correcciones <span className="text-destructive">*</span></Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn("w-full justify-start text-left font-normal", !dueDate && "text-muted-foreground")}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dueDate ? format(dueDate, "PPP", { locale: es }) : "Seleccionar fecha límite"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dueDate}
                        onSelect={setDueDate}
                        disabled={(date) => date <= new Date()}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-muted-foreground">
                    Se creará un plazo hasta esta fecha para que el estudiante radique las correcciones.
                  </p>
                </div>
              )}
              {consolidatedResult === "APROBADA" && <p className="text-sm text-muted-foreground mt-1">Se habilitará la etapa SUSTENTACIÓN automáticamente.</p>}
            </div>
            {stage.official_state !== "PENDIENTE" && stage.system_state === "CERRADA" ? (
              <div className="text-center"><Badge className="text-sm">Ya consolidado: {stage.official_state}</Badge></div>
            ) : (
              <div className="flex gap-3 justify-center">
                <Button onClick={handleConsolidate} disabled={submitting}>{submitting ? "Consolidando..." : "Confirmar y Consolidar"}</Button>
                <Button variant="outline" onClick={() => navigate("/dashboard")}>Cancelar</Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {evaluations.length < 2 && (
        <Card><CardContent className="py-6 text-center text-muted-foreground text-sm">Se requieren al menos 2 evaluaciones para consolidar. ({evaluations.length}/2 completadas)</CardContent></Card>
      )}
    </div>
  );
}
