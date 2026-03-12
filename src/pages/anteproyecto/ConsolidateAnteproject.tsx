import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, XCircle } from "lucide-react";

const resultLabels: Record<string, string> = {
  APROBADO: "Aprobado",
  APLAZADO_POR_MODIFICACIONES: "Aplazado por Modificaciones",
  NO_APROBADO: "No Aprobado",
};

const resultIcons: Record<string, React.ElementType> = {
  APROBADO: CheckCircle,
  APLAZADO_POR_MODIFICACIONES: AlertTriangle,
  NO_APROBADO: XCircle,
};

const resultColors: Record<string, string> = {
  APROBADO: "text-success",
  APLAZADO_POR_MODIFICACIONES: "text-warning",
  NO_APROBADO: "text-destructive",
};

/**
 * Página para que el coordinador consolide las evaluaciones del anteproyecto.
 * Regla de consolidación:
 *  - Si algún jurado NO_APROBADO => NO_APROBADA
 *  - Si algún jurado APLAZADO_POR_MODIFICACIONES => APROBADA_CON_MODIFICACIONES
 *  - Si todos APROBADO => APROBADA
 */
export default function ConsolidateAnteproject() {
  const { stageId } = useParams<{ stageId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [stage, setStage] = useState<any>(null);
  const [project, setProject] = useState<any>(null);
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [consolidatedResult, setConsolidatedResult] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [stageId]);

  async function loadData() {
    if (!stageId) return;

    const { data: stageData } = await supabase
      .from("project_stages")
      .select("*")
      .eq("id", stageId)
      .maybeSingle();
    setStage(stageData);

    if (stageData) {
      const { data: proj } = await supabase
        .from("projects")
        .select("*, programs(name)")
        .eq("id", stageData.project_id)
        .maybeSingle();
      setProject(proj);

      // Cargar evaluaciones con nombre del jurado
      const { data: evals } = await supabase
        .from("evaluations")
        .select("*, user_profiles:evaluator_id(full_name, email)")
        .eq("project_stage_id", stageId);

      const evalsList = evals || [];
      setEvaluations(evalsList);

      // Calcular resultado consolidado
      if (evalsList.length >= 2) {
        const results = evalsList.map((e) => e.official_result);
        if (results.includes("NO_APROBADO")) {
          setConsolidatedResult("NO_APROBADA");
        } else if (results.includes("APLAZADO_POR_MODIFICACIONES")) {
          setConsolidatedResult("APROBADA_CON_MODIFICACIONES");
        } else {
          setConsolidatedResult("APROBADA");
        }
      }
    }
    setLoading(false);
  }

  async function handleConsolidate() {
    if (!user || !stage || !consolidatedResult) return;
    setSubmitting(true);

    try {
      // Actualizar official_state de la etapa
      const { error } = await supabase
        .from("project_stages")
        .update({
          official_state: consolidatedResult as any,
          system_state: "CERRADA" as const,
          observations: evaluations.map((e) => 
            `${(e.user_profiles as any)?.full_name}: ${e.official_result} - ${e.observations || "Sin observaciones"}`
          ).join("\n"),
        })
        .eq("id", stage.id);
      if (error) throw error;

      // Si APROBADA_CON_MODIFICACIONES, crear deadline de 10 días calendario
      if (consolidatedResult === "APROBADA_CON_MODIFICACIONES") {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 10);

        await supabase.from("deadlines").insert({
          project_stage_id: stage.id,
          description: "Plazo para correcciones del anteproyecto (10 días calendario)",
          due_date: dueDate.toISOString(),
          created_by: user.id,
        });
      }

      // Si APROBADA => crear etapa INFORME_FINAL
      if (consolidatedResult === "APROBADA") {
        await supabase.from("project_stages").insert({
          project_id: stage.project_id,
          stage_name: "INFORME_FINAL" as const,
          system_state: "BORRADOR" as const,
        });
        await supabase.from("audit_events").insert({
          project_id: stage.project_id,
          user_id: user.id,
          event_type: "INFORME_FINAL_STAGE_CREATED",
          description: "Etapa INFORME FINAL habilitada tras aprobación del anteproyecto",
        });
      }

      // Auditoría
      await supabase.from("audit_events").insert({
        project_id: stage.project_id,
        user_id: user.id,
        event_type: "ANTEPROYECTO_CONSOLIDATED",
        description: `Anteproyecto consolidado: ${consolidatedResult}`,
        metadata: { 
          consolidated_result: consolidatedResult,
          evaluations: evaluations.map((e) => ({
            evaluator: (e.user_profiles as any)?.full_name,
            result: e.official_result,
          })),
        },
      });

      toast({ title: "Estado consolidado registrado" });
      navigate("/dashboard");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="py-8 text-center text-muted-foreground animate-pulse">Cargando...</div>;
  }

  if (!stage || !project) {
    return <div className="py-8 text-center text-muted-foreground">No encontrado</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Info del proyecto */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{project.title}</CardTitle>
          <CardDescription>{project.programs?.name}</CardDescription>
        </CardHeader>
      </Card>

      {/* Evaluaciones de los jurados */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Evaluaciones de Jurados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {evaluations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aún no hay evaluaciones registradas
            </p>
          ) : (
            evaluations.map((ev) => {
              const Icon = resultIcons[ev.official_result] || AlertTriangle;
              const color = resultColors[ev.official_result] || "";
              return (
                <div key={ev.id} className="rounded-lg border p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${color}`} />
                      <span className="font-medium text-sm">
                        {(ev.user_profiles as any)?.full_name || (ev.user_profiles as any)?.email}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {resultLabels[ev.official_result] || ev.official_result}
                    </Badge>
                  </div>
                  {ev.observations && (
                    <p className="text-sm text-muted-foreground">📝 {ev.observations}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {new Date(ev.created_at).toLocaleString("es-CO")}
                  </p>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Resultado consolidado */}
      {consolidatedResult && (
        <Card>
          <CardHeader>
            <CardTitle>Consolidar Estado Final</CardTitle>
            <CardDescription>
              Basado en las evaluaciones de los jurados, el resultado consolidado es:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-accent p-4 text-center">
              <p className="text-lg font-bold">{consolidatedResult.replace(/_/g, " ")}</p>
              {consolidatedResult === "APROBADA_CON_MODIFICACIONES" && (
                <p className="text-sm text-muted-foreground mt-1">
                  Se creará un plazo de 10 días calendario para correcciones.
                </p>
              )}
            </div>

            {stage.official_state !== "PENDIENTE" ? (
              <div className="text-center">
                <Badge className="text-sm">Ya consolidado: {stage.official_state}</Badge>
              </div>
            ) : (
              <div className="flex gap-3 justify-center">
                <Button onClick={handleConsolidate} disabled={submitting}>
                  {submitting ? "Consolidando..." : "Confirmar y Consolidar"}
                </Button>
                <Button variant="outline" onClick={() => navigate("/dashboard")}>
                  Cancelar
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {evaluations.length < 2 && (
        <Card>
          <CardContent className="py-6 text-center text-muted-foreground text-sm">
            Se requieren al menos 2 evaluaciones para consolidar. ({evaluations.length}/2 completadas)
          </CardContent>
        </Card>
      )}
    </div>
  );
}
