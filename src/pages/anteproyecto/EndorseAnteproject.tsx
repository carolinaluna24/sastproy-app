import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle } from "lucide-react";

/** Página para que el director dé aval al anteproyecto */
export default function EndorseAnteproject() {
  const { stageId } = useParams<{ stageId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [stage, setStage] = useState<any>(null);
  const [project, setProject] = useState<any>(null);
  const [latestSubmission, setLatestSubmission] = useState<any>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [comments, setComments] = useState("");
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

      // Obtener última submission
      const { data: subs } = await supabase
        .from("submissions")
        .select("*")
        .eq("project_stage_id", stageId)
        .order("version", { ascending: false })
        .limit(1);
      const sub = subs?.[0] || null;
      setLatestSubmission(sub);

      // Pre-cargar signed URL si hay file_url
      if (sub?.file_url) {
        const { data: signed } = await supabase.storage
          .from("documents")
          .createSignedUrl(sub.file_url, 3600);
        if (signed?.signedUrl) setSignedUrl(signed.signedUrl);
      }
    }
    setLoading(false);
  }

  async function handleEndorse(approved: boolean) {
    if (!user || !latestSubmission || !stage) return;
    setSubmitting(true);

    try {
      // Crear endorsement
      const { error } = await supabase.from("endorsements").insert({
        submission_id: latestSubmission.id,
        endorsed_by: user.id,
        approved,
        comments,
      });
      if (error) throw error;

      // Evento de auditoría
      await supabase.from("audit_events").insert({
        project_id: stage.project_id,
        user_id: user.id,
        event_type: "ANTEPROYECTO_ENDORSED",
        description: `Director ${approved ? "aprobó" : "rechazó"} el aval del anteproyecto`,
        metadata: { approved, comments },
      });

      toast({
        title: approved ? "Aval otorgado" : "Aval denegado",
        description: approved
          ? "El coordinador puede asignar jurados."
          : "El estudiante debe corregir el documento.",
      });
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

  if (!stage || !project || !latestSubmission) {
    return <div className="py-8 text-center text-muted-foreground">No se encontró información</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Información del proyecto */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{project.title}</CardTitle>
          <CardDescription>{project.programs?.name}</CardDescription>
        </CardHeader>
      </Card>

      {/* Documento radicado */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Documento Radicado</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border p-3 text-sm">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline">v{latestSubmission.version}</Badge>
                {latestSubmission.external_url && (
                  <a href={latestSubmission.external_url} target="_blank" rel="noopener noreferrer" className="text-primary underline text-sm">
                    URL externa
                  </a>
                )}
                {signedUrl && (
                  <a href={signedUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline text-sm">
                    Archivo PDF
                  </a>
                )}
                {!latestSubmission.external_url && !signedUrl && (
                  <span className="text-muted-foreground text-sm">Sin enlace</span>
                )}
              </div>
            <span className="text-xs text-muted-foreground">
              {new Date(latestSubmission.created_at).toLocaleDateString("es-CO")}
            </span>
          </div>
          {latestSubmission.notes && (
            <p className="text-xs text-muted-foreground mt-2">📝 {latestSubmission.notes}</p>
          )}
        </CardContent>
      </Card>

      {/* Formulario de aval */}
      <Card>
        <CardHeader>
          <CardTitle>Aval del Director</CardTitle>
          <CardDescription>Revisa el anteproyecto y decide si otorgas tu aval.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="comments">Comentarios</Label>
            <Textarea
              id="comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Observaciones sobre el anteproyecto"
              rows={4}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              onClick={() => handleEndorse(true)}
              disabled={submitting}
              className="gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Otorgar Aval
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleEndorse(false)}
              disabled={submitting}
              className="gap-2"
            >
              <XCircle className="h-4 w-4" />
              Denegar Aval
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate("/dashboard")}>
              Cancelar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
