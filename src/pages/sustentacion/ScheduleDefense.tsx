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

/** Coordinador programa la sesión de sustentación (fecha, hora, lugar) */
export default function ScheduleDefense() {
  const { stageId } = useParams<{ stageId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [stage, setStage] = useState<any>(null);
  const [project, setProject] = useState<any>(null);
  const [existingSession, setExistingSession] = useState<any>(null);
  const [scheduledAt, setScheduledAt] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
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
      setExistingSession(session);
    }
    setLoading(false);
  }

  async function handleSchedule(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !stage) return;
    setSubmitting(true);

    try {
      const { error } = await supabase.from("defense_sessions").insert({
        stage_id: stage.id,
        scheduled_at: new Date(scheduledAt).toISOString(),
        location,
        notes,
        created_by: user.id,
      });
      if (error) throw error;

      // Actualizar estado de la etapa a RADICADA (programada)
      await supabase.from("project_stages").update({ system_state: "RADICADA" }).eq("id", stage.id);

      await supabase.from("audit_events").insert({
        project_id: stage.project_id, user_id: user.id,
        event_type: "DEFENSE_SCHEDULED",
        description: `Sustentación programada: ${new Date(scheduledAt).toLocaleString("es-CO")} en ${location}`,
        metadata: { scheduled_at: scheduledAt, location },
      });

      toast({ title: "Sustentación programada exitosamente" });
      navigate("/dashboard");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally { setSubmitting(false); }
  }

  if (loading) return <div className="py-8 text-center text-muted-foreground animate-pulse">Cargando...</div>;
  if (!stage || !project) return <div className="py-8 text-center text-muted-foreground">No encontrado</div>;

  if (existingSession) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base">{project.title}</CardTitle><CardDescription>{project.programs?.name}</CardDescription></CardHeader>
        </Card>
        <Card>
          <CardHeader><CardTitle>Sustentación Programada</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">Fecha:</span> {new Date(existingSession.scheduled_at).toLocaleString("es-CO")}</p>
            <p><span className="text-muted-foreground">Lugar:</span> {existingSession.location}</p>
            {existingSession.notes && <p><span className="text-muted-foreground">Notas:</span> {existingSession.notes}</p>}
            <div className="flex gap-3 pt-4">
              <Button onClick={() => navigate(`/sustentacion/${stageId}/record-result`)}>Registrar Resultado</Button>
              <Button variant="outline" onClick={() => navigate("/dashboard")}>Volver</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">{project.title}</CardTitle><CardDescription>{project.programs?.name}</CardDescription></CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Programar Sustentación</CardTitle>
          <CardDescription>Ingresa la fecha, hora y lugar de la sustentación.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSchedule} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="datetime">Fecha y Hora</Label>
              <Input id="datetime" type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Lugar</Label>
              <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ej: Sala de Juntas, Bloque A" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas opcionales" rows={3} />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={submitting}>{submitting ? "Programando..." : "Programar Sustentación"}</Button>
              <Button type="button" variant="outline" onClick={() => navigate("/dashboard")}>Cancelar</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
