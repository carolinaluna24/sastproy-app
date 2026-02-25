import { useEffect, useState } from "react";
import { InlineSpinner } from "@/components/LoadingSpinner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardCheck, Clock } from "lucide-react";

/** Dashboard del jurado: muestra sus asignaciones de evaluación */
export default function JurorDashboard() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadAssignments();
  }, [user]);

  async function loadAssignments() {
    // Traer asignaciones del jurado con info del proyecto
    const { data } = await supabase
      .from("assignments")
      .select("*, projects(id, title, programs(name))")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });

    // Para cada asignación, verificar si ya evaluó
    const enriched = await Promise.all(
      (data || []).map(async (a) => {
        // Buscar la etapa correspondiente
        const { data: stage } = await supabase
          .from("project_stages")
          .select("id, system_state, official_state")
          .eq("project_id", a.project_id)
          .eq("stage_name", a.stage_name)
          .maybeSingle();

        // Verificar si ya existe evaluación del jurado para la ÚLTIMA submission de esta etapa
        let alreadyEvaluated = false;
        // Si es re-evaluación tras correcciones, verificar si ESTE jurado necesita re-evaluar
        // (solo los que no dieron APROBADO en la submission anterior deben re-evaluar)
        let needsReEvaluation = false;
        if (stage) {
          // Obtener las últimas 2 submissions para comparar
          const { data: subs } = await supabase
            .from("submissions")
            .select("id, version")
            .eq("project_stage_id", stage.id)
            .order("version", { ascending: false })
            .limit(2);

          const latestSub = subs?.[0] || null;
          const previousSub = subs?.[1] || null;

          if (latestSub) {
            // Verificar si ya evaluó la última submission
            const { count } = await supabase
              .from("evaluations")
              .select("*", { count: "exact", head: true })
              .eq("evaluator_id", user!.id)
              .eq("submission_id", latestSub.id);
            alreadyEvaluated = (count || 0) > 0;

            // Si es versión > 1 y no ha evaluado aún, verificar si debe re-evaluar
            if (!alreadyEvaluated && latestSub.version > 1 && previousSub) {
              const { data: prevEval } = await supabase
                .from("evaluations")
                .select("official_result")
                .eq("evaluator_id", user!.id)
                .eq("submission_id", previousSub.id)
                .maybeSingle();

              // Solo necesita re-evaluar si su resultado anterior NO fue APROBADO
              if (prevEval && prevEval.official_result !== "APROBADO") {
                needsReEvaluation = true;
              }
              // Si aprobó en la versión anterior, se marca como ya evaluado (no necesita volver)
              if (prevEval && prevEval.official_result === "APROBADO") {
                alreadyEvaluated = true;
              }
            }
          }
        }

        return { ...a, stage, alreadyEvaluated, needsReEvaluation };
      })
    );

    setAssignments(enriched);
    setLoading(false);
  }

  if (loading) {
    return <InlineSpinner text="Cargando asignaciones..." />;
  }

  const pending = assignments.filter((a) => !a.alreadyEvaluated);
  const completed = assignments.filter((a) => a.alreadyEvaluated);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Panel del Jurado</h1>
        <p className="text-muted-foreground text-sm">Tus asignaciones de evaluación</p>
      </div>

      {/* Pendientes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pendientes ({pending.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {pending.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium text-sm">{a.projects?.title}</p>
                <p className="text-xs text-muted-foreground">
                  {a.projects?.programs?.name} — Etapa: {a.stage_name}
                  {a.stage && <span className="ml-1">({a.stage.system_state === "CON_OBSERVACIONES" ? "Esperando nueva versión" : a.stage.system_state})</span>}
                </p>
                {a.due_date && (
                  <p className="text-xs text-muted-foreground">
                    Plazo: {new Date(a.due_date).toLocaleDateString("es-CO")}
                  </p>
                )}
              </div>
              {a.stage && ["RADICADA", "AVALADO", "EN_REVISION"].includes(a.stage.system_state) ? (
                <Link to={`/${a.stage_name === "INFORME_FINAL" ? "informe-final" : "anteproyecto"}/${a.stage.id}/evaluate`}>
                  <Button size="sm">Evaluar</Button>
                </Link>
              ) : a.stage && a.stage.system_state === "CON_OBSERVACIONES" ? (
                <Badge variant="outline" className="text-xs">Esperando correcciones</Badge>
              ) : null}
            </div>
          ))}
          {pending.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No tienes evaluaciones pendientes
            </p>
          )}
        </CardContent>
      </Card>

      {/* Completadas */}
      {completed.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4" />
              Completadas ({completed.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {completed.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium text-sm">{a.projects?.title}</p>
                  <p className="text-xs text-muted-foreground">{a.stage_name}</p>
                </div>
                <Badge variant="outline" className="text-xs">Evaluado</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
