import { useState, useEffect } from "react";
import { InlineSpinner } from "@/components/LoadingSpinner";
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

type JurorResult = "APROBADO" | "APLAZADO_POR_MODIFICACIONES" | "NO_APROBADO";

/** Página para que un jurado evalúe el anteproyecto */
export default function EvaluateAnteproject() {
  const { stageId } = useParams<{ stageId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [stage, setStage] = useState<any>(null);
  const [project, setProject] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [result, setResult] = useState<JurorResult | "">("");
  const [observations, setObservations] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

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
      const subsList = subs || [];
      setSubmissions(subsList);

      // Pre-cargar signed URLs para archivos del bucket privado
      const filePaths = subsList.map((s: any) => s.file_url).filter(Boolean);
      if (filePaths.length > 0) {
        const results = await Promise.all(
          filePaths.map((path: string) =>
            supabase.storage.from("documents").createSignedUrl(path, 3600)
          )
        );
        const urlMap: Record<string, string> = {};
        results.forEach((res, i) => {
          if (res.data?.signedUrl) urlMap[filePaths[i]] = res.data.signedUrl;
        });
        setSignedUrls(urlMap);
      }
    }
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !stage || !result) return;
    setSubmitting(true);

    try {
      // Obtener la última submission para vincular
      const latestSub = submissions[0];
      if (!latestSub) throw new Error("No hay radicación para evaluar");

      // Crear evaluación con resultado oficial del jurado
      const { error } = await supabase.from("evaluations").insert({
        submission_id: latestSub.id,
        evaluator_id: user.id,
        project_stage_id: stage.id,
        official_result: result,
        observations,
      });
      if (error) throw error;

      // Auditoría
      await supabase.from("audit_events").insert({
        project_id: stage.project_id,
        user_id: user.id,
        event_type: "ANTEPROYECTO_EVALUATED",
        description: `Jurado evaluó anteproyecto: ${result}`,
        metadata: { result, observations },
      });

      toast({ title: "Evaluación registrada exitosamente" });
      navigate("/dashboard");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <InlineSpinner text="Cargando..." />;
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

      {/* Documentos */}
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
                  {s.external_url && (
                    <a href={s.external_url} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                      URL externa
                    </a>
                  )}
                  {s.file_url && signedUrls[s.file_url] && (
                    <a href={signedUrls[s.file_url]} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                      Archivo PDF
                    </a>
                  )}
                  {!s.external_url && !s.file_url && (
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

      {/* Formulario de evaluación */}
      <Card>
        <CardHeader>
          <CardTitle>Evaluación del Anteproyecto</CardTitle>
          <CardDescription>Registra tu evaluación como jurado.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Resultado</Label>
              <Select value={result} onValueChange={(v) => setResult(v as JurorResult)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar resultado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="APROBADO">Aprobado</SelectItem>
                  <SelectItem value="APLAZADO_POR_MODIFICACIONES">Aplazado por Modificaciones</SelectItem>
                  <SelectItem value="NO_APROBADO">No Aprobado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="observations">Observaciones</Label>
              <Textarea
                id="observations"
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Escribe tus observaciones detalladas"
                rows={5}
                required
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={submitting || !result}>
                {submitting ? "Registrando..." : "Registrar Evaluación"}
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
