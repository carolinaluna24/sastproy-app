import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

type OfficialState = "APROBADA" | "APROBADA_CON_MODIFICACIONES" | "NO_APROBADA";

export default function EvaluateProposal() {
  const { stageId } = useParams<{ stageId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [stage, setStage] = useState<any>(null);
  const [project, setProject] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [result, setResult] = useState<OfficialState | "">("");
  const [observations, setObservations] = useState("");
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

      const { data: subs } = await supabase
        .from("submissions")
        .select("*")
        .eq("project_stage_id", stageId)
        .order("version", { ascending: false });
      setSubmissions(subs || []);
    }
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !stage || !result) return;
    setSubmitting(true);

    try {
      // Update stage
      const { error: updateErr } = await supabase
        .from("project_stages")
        .update({
          system_state: "CERRADA",
          official_state: result,
          observations,
        })
        .eq("id", stage.id);
      if (updateErr) throw updateErr;

      // If APROBADA_CON_MODIFICACIONES, create 5 business day deadline
      if (result === "APROBADA_CON_MODIFICACIONES") {
        const dueDate = new Date();
        let businessDays = 0;
        while (businessDays < 5) {
          dueDate.setDate(dueDate.getDate() + 1);
          const day = dueDate.getDay();
          if (day !== 0 && day !== 6) businessDays++;
        }

        await supabase.from("deadlines").insert({
          project_stage_id: stage.id,
          description: "Plazo para correcciones de propuesta",
          due_date: dueDate.toISOString(),
          created_by: user.id,
        });
      }

      // Audit
      await supabase.from("audit_events").insert({
        project_id: stage.project_id,
        user_id: user.id,
        event_type: "PROPOSAL_EVALUATED",
        description: `Propuesta evaluada: ${result}`,
        metadata: { result, observations },
      });

      toast({ title: "Resultado registrado exitosamente" });
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
      {/* Project info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{project.title}</CardTitle>
          <CardDescription>{project.programs?.name}</CardDescription>
        </CardHeader>
      </Card>

      {/* Submissions */}
      {submissions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Documentos Radicados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {submissions.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                <div>
                  <Badge variant="outline" className="mr-2">v{s.version}</Badge>
                  {s.external_url ? (
                    <a href={s.external_url} target="_blank" rel="noopener" className="text-primary underline">
                      Ver documento
                    </a>
                  ) : (
                    <span className="text-muted-foreground">Sin enlace</span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(s.created_at).toLocaleDateString("es-CO")}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Evaluation form */}
      <Card>
        <CardHeader>
          <CardTitle>Registrar Resultado del Comité</CardTitle>
          <CardDescription>
            Ingrese el resultado de la evaluación de la propuesta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Resultado</Label>
              <Select value={result} onValueChange={(v) => setResult(v as OfficialState)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar resultado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="APROBADA">Aprobada</SelectItem>
                  <SelectItem value="APROBADA_CON_MODIFICACIONES">Aprobada con Modificaciones</SelectItem>
                  <SelectItem value="NO_APROBADA">No Aprobada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {result === "APROBADA_CON_MODIFICACIONES" && (
              <div className="rounded-lg bg-warning/10 p-3 text-sm text-warning">
                Se creará un plazo de 5 días hábiles para las correcciones.
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="observations">Observaciones</Label>
              <Textarea
                id="observations"
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Observaciones del comité"
                rows={4}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={submitting || !result}>
                {submitting ? "Registrando..." : "Registrar Resultado"}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate("/dashboard")}>
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
