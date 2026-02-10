import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * Estudiante sube la entrega final post-sustentación.
 * Al completar, project.global_status = FINALIZADO
 */
export default function SubmitFinalDelivery() {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [stage, setStage] = useState<any>(null);
  const [submissionType, setSubmissionType] = useState<"url" | "file">("url");
  const [externalUrl, setExternalUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadStage(); }, [projectId]);

  async function loadStage() {
    if (!projectId) return;
    // Buscar etapa SUSTENTACION cerrada con nota aprobatoria
    const { data } = await supabase
      .from("project_stages")
      .select("*")
      .eq("project_id", projectId)
      .eq("stage_name", "SUSTENTACION")
      .maybeSingle();
    setStage(data);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !stage) return;
    setSubmitting(true);

    try {
      const { count } = await supabase
        .from("submissions")
        .select("*", { count: "exact", head: true })
        .eq("project_stage_id", stage.id);
      const version = (count || 0) + 1;

      const { error: subErr } = await supabase.from("submissions").insert({
        project_stage_id: stage.id,
        submitted_by: user.id,
        version,
        external_url: submissionType === "url" ? externalUrl : null,
        file_url: null,
        notes,
      });
      if (subErr) throw subErr;

      // Marcar proyecto como FINALIZADO
      const { error: projErr } = await supabase
        .from("projects")
        .update({ global_status: "FINALIZADO" as const })
        .eq("id", projectId);
      if (projErr) throw projErr;

      await supabase.from("audit_events").insert({
        project_id: projectId,
        user_id: user.id,
        event_type: "FINAL_DELIVERY_SUBMITTED",
        description: `Entrega final post-sustentación completada. Proyecto FINALIZADO.`,
        metadata: { version },
      });

      toast({ title: "¡Entrega final completada! Proyecto finalizado." });
      navigate("/dashboard");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally { setSubmitting(false); }
  }

  if (loading) return <div className="py-8 text-center text-muted-foreground animate-pulse">Cargando...</div>;
  if (!stage) return <div className="py-8 text-center text-muted-foreground">Etapa de sustentación no encontrada</div>;

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Entrega Final Post-Sustentación</CardTitle>
          <CardDescription>
            Sube el documento final corregido. Al completar, tu proyecto quedará como FINALIZADO.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Tabs value={submissionType} onValueChange={(v) => setSubmissionType(v as "url" | "file")}>
              <TabsList className="w-full">
                <TabsTrigger value="url" className="flex-1">Enlace URL</TabsTrigger>
                <TabsTrigger value="file" className="flex-1">Archivo PDF</TabsTrigger>
              </TabsList>
              <TabsContent value="url" className="space-y-2 mt-4">
                <Label htmlFor="url">URL del documento final</Label>
                <Input id="url" type="url" value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} placeholder="https://drive.google.com/..." required={submissionType === "url"} />
              </TabsContent>
              <TabsContent value="file" className="space-y-2 mt-4">
                <Label>Archivo PDF</Label>
                <div className="rounded-lg border-2 border-dashed border-muted p-6 text-center text-muted-foreground text-sm">
                  Carga de archivos disponible próximamente. Usa la opción de enlace URL.
                </div>
              </TabsContent>
            </Tabs>
            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas opcionales" rows={3} />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={submitting}>{submitting ? "Entregando..." : "Entregar y Finalizar Proyecto"}</Button>
              <Button type="button" variant="outline" onClick={() => navigate("/dashboard")}>Cancelar</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
