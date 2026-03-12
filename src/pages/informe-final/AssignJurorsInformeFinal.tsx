import { useState, useEffect } from "react";
import { InlineSpinner } from "@/components/LoadingSpinner";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Users } from "lucide-react";

/** Coordinador asigna 2 jurados para evaluar el informe final */
export default function AssignJurorsInformeFinal() {
  const { stageId } = useParams<{ stageId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [stage, setStage] = useState<any>(null);
  const [project, setProject] = useState<any>(null);
  const [jurors, setJurors] = useState<any[]>([]);
  const [juror1, setJuror1] = useState("");
  const [juror2, setJuror2] = useState("");
  const [hasEndorsement, setHasEndorsement] = useState(false);
  const [existingAssignments, setExistingAssignments] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [stageId]);

  async function loadData() {
    if (!stageId) return;
    const { data: stageData } = await supabase.from("project_stages").select("*").eq("id", stageId).maybeSingle();
    setStage(stageData);
    if (!stageData) { setLoading(false); return; }

    const { data: proj } = await supabase.from("projects").select("*, programs(name)").eq("id", stageData.project_id).maybeSingle();
    setProject(proj);

    // Verificar aval
    const { data: subs } = await supabase.from("submissions").select("id").eq("project_stage_id", stageId).order("version", { ascending: false }).limit(1);
    if (subs && subs.length > 0) {
      const { data: endorsements } = await supabase.from("endorsements").select("*").eq("submission_id", subs[0].id).eq("approved", true);
      setHasEndorsement((endorsements?.length || 0) > 0);
    }

    // Jurados disponibles
    const { data: jurorRoles } = await supabase.from("user_roles").select("user_id").eq("role", "JUROR");
    if (jurorRoles && jurorRoles.length > 0) {
      const { data: profiles } = await supabase.from("user_profiles").select("id, full_name, email").in("id", jurorRoles.map((r) => r.user_id));
      setJurors(profiles || []);
    }

    // Asignaciones existentes (sin FK join, cargar perfiles aparte)
    const { data: existing } = await supabase.from("assignments").select("*").eq("project_id", stageData.project_id).eq("stage_name", "INFORME_FINAL");
    if (existing && existing.length > 0) {
      const assignedUserIds = existing.map((a) => a.user_id);
      const { data: assignedProfiles } = await supabase.from("user_profiles").select("id, full_name, email").in("id", assignedUserIds);
      const profileMap: Record<string, any> = {};
      (assignedProfiles || []).forEach((p) => { profileMap[p.id] = p; });
      setExistingAssignments(existing.map((a) => ({ ...a, user_profiles: profileMap[a.user_id] || null })));

      // Si ya hay jurados asignados y el estado es AVALADO/RADICADA (re-radicación), transicionar a EN_REVISION
      if (stageData.system_state === "AVALADO" || stageData.system_state === "RADICADA") {
        await supabase.from("project_stages").update({ system_state: "EN_REVISION" as any }).eq("id", stageData.id);
      }
    } else {
      setExistingAssignments([]);
    }
    setLoading(false);
  }

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !stage || !project) return;
    if (juror1 === juror2) { toast({ title: "Error", description: "Selecciona dos jurados diferentes", variant: "destructive" }); return; }
    setSubmitting(true);

    try {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 15);

      const { error } = await supabase.from("assignments").insert([
        { project_id: project.id, user_id: juror1, assigned_by: user.id, stage_name: "INFORME_FINAL" as const, due_date: dueDate.toISOString() },
        { project_id: project.id, user_id: juror2, assigned_by: user.id, stage_name: "INFORME_FINAL" as const, due_date: dueDate.toISOString() },
      ]);
      if (error) throw error;

      await supabase.from("project_stages").update({ system_state: "EN_REVISION" }).eq("id", stage.id);

      const j1Name = jurors.find((j) => j.id === juror1)?.full_name || juror1;
      const j2Name = jurors.find((j) => j.id === juror2)?.full_name || juror2;
      await supabase.from("audit_events").insert({
        project_id: project.id, user_id: user.id, event_type: "JURORS_ASSIGNED_INFORME",
        description: `Jurados asignados para informe final: ${j1Name}, ${j2Name}. Plazo: ${dueDate.toLocaleDateString("es-CO")}`,
        metadata: { juror1, juror2, due_date: dueDate.toISOString() },
      });

      toast({ title: "Jurados asignados exitosamente" });
      navigate("/dashboard");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally { setSubmitting(false); }
  }

  if (loading) return <InlineSpinner text="Cargando..." />;
  if (!stage || !project) return <div className="py-8 text-center text-muted-foreground">No encontrado</div>;

  if (existingAssignments.length > 0) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base">{project.title}</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">Jurados ya asignados:</p>
            {existingAssignments.map((a) => (
              <div key={a.id} className="flex items-center gap-2 text-sm mb-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>{(a.user_profiles as any)?.full_name || (a.user_profiles as any)?.email}</span>
                {a.due_date && <Badge variant="outline" className="text-xs">Plazo: {new Date(a.due_date).toLocaleDateString("es-CO")}</Badge>}
              </div>
            ))}
            <Button variant="outline" className="mt-4" onClick={() => navigate("/dashboard")}>Volver</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hasEndorsement) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="py-8 text-center space-y-3">
            <AlertCircle className="h-10 w-10 text-warning mx-auto" />
            <p className="font-medium">Aval pendiente</p>
            <p className="text-sm text-muted-foreground">El asesor debe dar su aval antes de asignar jurados.</p>
            <Button variant="outline" onClick={() => navigate("/dashboard")}>Volver</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{project.title}</CardTitle>
          <CardDescription>{project.programs?.name}</CardDescription>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Asignar Jurados — Informe Final</CardTitle>
          <CardDescription>Selecciona 2 jurados. Tendrán 15 días calendario.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAssign} className="space-y-4">
            <div className="space-y-2">
              <Label>Jurado 1</Label>
              <Select value={juror1} onValueChange={setJuror1} required>
                <SelectTrigger><SelectValue placeholder="Seleccionar jurado" /></SelectTrigger>
                <SelectContent>
                  {jurors.filter((j) => j.id !== juror2).map((j) => (
                    <SelectItem key={j.id} value={j.id}>{j.full_name} ({j.email})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Jurado 2</Label>
              <Select value={juror2} onValueChange={setJuror2} required>
                <SelectTrigger><SelectValue placeholder="Seleccionar jurado" /></SelectTrigger>
                <SelectContent>
                  {jurors.filter((j) => j.id !== juror1).map((j) => (
                    <SelectItem key={j.id} value={j.id}>{j.full_name} ({j.email})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={submitting || !juror1 || !juror2}>{submitting ? "Asignando..." : "Asignar Jurados"}</Button>
              <Button type="button" variant="outline" onClick={() => navigate("/dashboard")}>Cancelar</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
