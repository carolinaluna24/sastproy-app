import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, User, FileText, CheckCircle, AlertCircle, Users } from "lucide-react";

const eventIcons: Record<string, React.ElementType> = {
  PROJECT_CREATED: FileText,
  PROPOSAL_SUBMITTED: FileText,
  PROPOSAL_EVALUATED: CheckCircle,
};

export default function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const { primaryRole } = useAuth();
  const { toast } = useToast();
  const [project, setProject] = useState<any>(null);
  const [stages, setStages] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [auditEvents, setAuditEvents] = useState<any[]>([]);
  const [directors, setDirectors] = useState<any[]>([]);
  const [selectedDirector, setSelectedDirector] = useState("");
  const [assigningDirector, setAssigningDirector] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (projectId) loadData();
  }, [projectId, primaryRole]);

  async function loadData() {
    const [projRes, stagesRes, membersRes, auditRes] = await Promise.all([
      supabase.from("projects").select("*, programs(name), modalities(name), user_profiles!projects_director_id_fkey(full_name)").eq("id", projectId!).maybeSingle(),
      supabase.from("project_stages").select("*").eq("project_id", projectId!).order("created_at"),
      supabase.from("project_members").select("*").eq("project_id", projectId!),
      (primaryRole === "COORDINATOR" || primaryRole === "DECANO")
        ? supabase.from("audit_events").select("*").eq("project_id", projectId!).order("created_at", { ascending: false })
        : Promise.resolve({ data: [] }),
    ]);

    setProject(projRes.data);
    setStages(stagesRes.data || []);
    setAuditEvents(auditRes.data || []);

    // Fetch member profiles separately (no FK between project_members and user_profiles)
    const rawMembers = membersRes.data || [];
    if (rawMembers.length > 0) {
      const userIds = rawMembers.map((m: any) => m.user_id);
      const { data: profiles } = await supabase.from("user_profiles").select("id, full_name, email").in("id", userIds);
      const profileMap = (profiles || []).reduce((acc: any, p: any) => { acc[p.id] = p; return acc; }, {});
      setMembers(rawMembers.map((m: any) => ({ ...m, user_profiles: profileMap[m.user_id] || null })));
    } else {
      setMembers([]);
    }

    // Cargar directores disponibles si es coordinador
    if (primaryRole === "COORDINATOR") {
      const { data: dirRoles } = await supabase.from("user_roles").select("user_id").eq("role", "DIRECTOR");
      if (dirRoles && dirRoles.length > 0) {
        const { data: dirProfiles } = await supabase.from("user_profiles").select("id, full_name, email").in("id", dirRoles.map(r => r.user_id));
        setDirectors(dirProfiles || []);
      }
    }

    setLoading(false);
  }

  async function handleAssignDirector() {
    if (!selectedDirector || !projectId) return;
    setAssigningDirector(true);
    try {
      const { error } = await supabase.from("projects").update({ director_id: selectedDirector }).eq("id", projectId);
      if (error) throw error;

      // Agregar como miembro del proyecto
      await supabase.from("project_members").insert({
        project_id: projectId,
        user_id: selectedDirector,
        role: "DIRECTOR" as any,
      });

      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("audit_events").insert({
        project_id: projectId,
        user_id: user?.id,
        event_type: "DIRECTOR_ASSIGNED",
        description: "Director asignado al proyecto",
      });

      toast({ title: "Director asignado exitosamente" });
      loadData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setAssigningDirector(false);
    }
  }

  if (loading) return <div className="py-8 text-center text-muted-foreground animate-pulse">Cargando...</div>;
  if (!project) return <div className="py-8 text-center text-muted-foreground">Proyecto no encontrado</div>;

  const statusColor: Record<string, string> = {
    VIGENTE: "bg-success text-success-foreground",
    FINALIZADO: "bg-muted text-muted-foreground",
    VENCIDO: "bg-destructive text-destructive-foreground",
    CANCELADO: "bg-destructive/80 text-destructive-foreground",
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{project.title}</h1>
          <p className="text-muted-foreground text-sm">{project.description}</p>
        </div>
        <Badge className={statusColor[project.global_status] || "bg-muted"}>
          {project.global_status}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <Card>
          <CardContent className="py-3">
            <p className="text-muted-foreground text-xs">Programa</p>
            <p className="font-medium">{project.programs?.name}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <p className="text-muted-foreground text-xs">Modalidad</p>
            <p className="font-medium">{project.modalities?.name}</p>
          </CardContent>
        </Card>
      </div>

      {/* Director */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Director del Proyecto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {project.director_id && (
            <div className="flex items-center gap-3 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>{project.user_profiles?.full_name}</span>
              <Badge variant="outline" className="text-xs">Director</Badge>
            </div>
          )}
          {primaryRole === "COORDINATOR" && directors.length > 0 && (
            <div className="space-y-2">
              {!project.director_id && (
                <p className="text-sm text-muted-foreground">Este proyecto no tiene director asignado.</p>
              )}
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Select value={selectedDirector} onValueChange={setSelectedDirector}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar director" />
                    </SelectTrigger>
                    <SelectContent>
                      {directors.map(d => (
                        <SelectItem key={d.id} value={d.id}>{d.full_name} ({d.email})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button size="sm" onClick={handleAssignDirector} disabled={!selectedDirector || assigningDirector} className="gap-1">
                  <Users className="h-3 w-3" />{project.director_id ? "Cambiar" : "Asignar"}
                </Button>
              </div>
            </div>
          )}
          {!project.director_id && primaryRole !== "COORDINATOR" && (
            <p className="text-sm text-muted-foreground italic">Sin director asignado</p>
          )}
        </CardContent>
      </Card>

      {/* Members */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Integrantes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {members.filter((m) => m.role === "AUTHOR").map((m) => (
            <div key={m.id} className="flex items-center gap-3 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>{m.user_profiles?.full_name || m.user_profiles?.email}</span>
              <Badge variant="outline" className="text-xs">{m.role}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Stages */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Etapas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {stages.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium text-sm">{s.stage_name}</p>
                <p className="text-xs text-muted-foreground">
                  {s.system_state} — {s.official_state}
                </p>
                {s.observations && (
                  <p className="text-xs text-muted-foreground mt-1">📝 {s.observations}</p>
                )}
              </div>
              {s.final_grade !== null && (
                <Badge className="text-sm">{s.final_grade}</Badge>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Audit trail (coordinator/decano) */}
      {auditEvents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Línea de Tiempo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {auditEvents.map((evt) => {
                const Icon = eventIcons[evt.event_type] || Clock;
                return (
                  <div key={evt.id} className="flex gap-3 text-sm">
                    <div className="mt-0.5">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p>{evt.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(evt.created_at).toLocaleString("es-CO")}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
