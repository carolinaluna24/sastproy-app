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

/** Página para que el director dé aval al informe final */
export default function EndorseInformeFinal() {
  const { stageId } = useParams<{ stageId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [stage, setStage] = useState<any>(null);
  const [project, setProject] = useState<any>(null);
  const [latestSubmission, setLatestSubmission] = useState<any>(null);
  const [comments, setComments] = useState("");
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
      const { data: subs } = await supabase.from("submissions").select("*").eq("project_stage_id", stageId).order("version", { ascending: false }).limit(1);
      setLatestSubmission(subs?.[0] || null);
    }
    setLoading(false);
  }

  async function handleEndorse(approved: boolean) {
    if (!user || !latestSubmission || !stage) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("endorsements").insert({
        submission_id: latestSubmission.id,
        endorsed_by: user.id,
        approved,
        comments,
      });
      if (error) throw error;

      await supabase.from("audit_events").insert({
        project_id: stage.project_id,
        user_id: user.id,
        event_type: "INFORME_FINAL_ENDORSED",
        description: `Director ${approved ? "aprobó" : "rechazó"} el aval del informe final`,
        metadata: { approved, comments },
      });

      toast({ title: approved ? "Aval otorgado" : "Aval denegado" });
      navigate("/dashboard");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="py-8 text-center text-muted-foreground animate-pulse">Cargando...</div>;
  if (!stage || !project || !latestSubmission) return <div className="py-8 text-center text-muted-foreground">No se encontró información</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{project.title}</CardTitle>
          <CardDescription>{project.programs?.name}</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Documento Radicado</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border p-3 text-sm">
            <div>
              <Badge variant="outline" className="mr-2">v{latestSubmission.version}</Badge>
              {latestSubmission.external_url ? (
                <a href={latestSubmission.external_url} target="_blank" rel="noopener" className="text-primary underline">Ver documento</a>
              ) : <span className="text-muted-foreground">Sin enlace</span>}
            </div>
            <span className="text-xs text-muted-foreground">{new Date(latestSubmission.created_at).toLocaleDateString("es-CO")}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Aval del Director — Informe Final</CardTitle>
          <CardDescription>Revisa el informe final y decide si otorgas tu aval.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="comments">Comentarios</Label>
            <Textarea id="comments" value={comments} onChange={(e) => setComments(e.target.value)} placeholder="Observaciones" rows={4} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button onClick={() => handleEndorse(true)} disabled={submitting} className="gap-2">
              <CheckCircle className="h-4 w-4" /> Otorgar Aval
            </Button>
            <Button variant="destructive" onClick={() => handleEndorse(false)} disabled={submitting} className="gap-2">
              <XCircle className="h-4 w-4" /> Denegar Aval
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate("/dashboard")}>Cancelar</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
