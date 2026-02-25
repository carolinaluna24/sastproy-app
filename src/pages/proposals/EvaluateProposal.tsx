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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

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
  const [directorId, setDirectorId] = useState("");
  const [directors, setDirectors] = useState<any[]>([]);
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
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

      // Cargar directores disponibles para asignar si se aprueba
      const { data: dirRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "ASESOR");
      if (dirRoles && dirRoles.length > 0) {
        const dirIds = dirRoles.map((r) => r.user_id);
        const { data: profiles } = await supabase
          .from("user_profiles")
          .select("id, full_name, email")
          .in("id", dirIds);
        setDirectors(profiles || []);
      }
    }
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !stage || !result) return;
    if (result === "APROBADA_CON_MODIFICACIONES" && !dueDate) {
      toast({ title: "Selecciona una fecha límite para las correcciones", variant: "destructive" });
      return;
    }
    setSubmitting(true);

    try {
      // Actualizar etapa
      // Si APROBADA_CON_MODIFICACIONES, se deja en CON_OBSERVACIONES para que el estudiante pueda radicar la versión 2
      const newSystemState = result === "APROBADA_CON_MODIFICACIONES" ? "CON_OBSERVACIONES" : "CERRADA";
      const { error: updateErr } = await supabase
        .from("project_stages")
        .update({
          system_state: newSystemState,
          official_state: result,
          observations,
        })
        .eq("id", stage.id);
      if (updateErr) throw updateErr;

      // Si APROBADA, crear etapa ANTEPROYECTO y asignar director
      if (result === "APROBADA") {
        await supabase.from("project_stages").insert({
          project_id: stage.project_id,
          stage_name: "ANTEPROYECTO" as const,
          system_state: "BORRADOR" as const,
        });

        // Asignar director al proyecto si se seleccionó
        if (directorId) {
          await supabase
            .from("projects")
            .update({ asesor_id: directorId })
            .eq("id", stage.project_id);
        }

        await supabase.from("audit_events").insert({
          project_id: stage.project_id,
          user_id: user.id,
          event_type: "ANTEPROYECTO_STAGE_CREATED",
          description: "Etapa ANTEPROYECTO habilitada tras aprobación de propuesta",
        });
      }

      // Si APROBADA_CON_MODIFICACIONES, crear deadline con la fecha seleccionada
      if (result === "APROBADA_CON_MODIFICACIONES" && dueDate) {
        await supabase.from("deadlines").insert({
          project_stage_id: stage.id,
          description: "Plazo para correcciones de propuesta",
          due_date: dueDate.toISOString(),
          created_by: user.id,
        });
      }

      // Auditoría
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
    return <InlineSpinner text="Cargando..." />;
  }

  if (!stage || !project) {
    return <div className="py-8 text-center text-muted-foreground">No encontrado</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{project.title}</CardTitle>
          <CardDescription>{project.programs?.name}</CardDescription>
        </CardHeader>
      </Card>

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
                  {s.file_url && !signedUrls[s.file_url] && (
                    <span className="text-muted-foreground">Sin enlace</span>
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

      <Card>
        <CardHeader>
          <CardTitle>Registrar Resultado del Comité</CardTitle>
          <CardDescription>Ingrese el resultado de la evaluación de la propuesta.</CardDescription>
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

            {/* Asignar director si se aprueba */}
            {result === "APROBADA" && directors.length > 0 && (
              <div className="space-y-2">
                <Label>Asignar Asesor de Proyecto</Label>
                <Select value={directorId} onValueChange={setDirectorId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar asesor" />
                  </SelectTrigger>
                  <SelectContent>
                    {directors.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.full_name} ({d.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Se habilitará la etapa ANTEPROYECTO automáticamente.
                </p>
              </div>
            )}

            {result === "APROBADA_CON_MODIFICACIONES" && (
              <div className="space-y-2">
                <Label>Fecha límite para correcciones <span className="text-destructive">*</span></Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start text-left font-normal", !dueDate && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dueDate ? format(dueDate, "PPP", { locale: es }) : "Seleccionar fecha"}
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
