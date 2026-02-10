import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FolderOpen } from "lucide-react";

/** Dashboard del director: muestra proyectos donde es director */
export default function DirectorDashboard() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadProjects();
  }, [user]);

  async function loadProjects() {
    const { data } = await supabase
      .from("projects")
      .select("*, programs(name), modalities(name)")
      .eq("director_id", user!.id)
      .order("created_at", { ascending: false });

    // Para cada proyecto, buscar etapas de anteproyecto pendientes de aval
    const enriched = await Promise.all(
      (data || []).map(async (p) => {
        const { data: stages } = await supabase
          .from("project_stages")
          .select("id, stage_name, system_state, official_state")
          .eq("project_id", p.id)
          .eq("stage_name", "ANTEPROYECTO");

        const anteStage = stages?.[0] || null;

        // Verificar si hay submissions sin aval
        let needsEndorsement = false;
        if (anteStage && anteStage.system_state === "RADICADA") {
          const { data: subs } = await supabase
            .from("submissions")
            .select("id")
            .eq("project_stage_id", anteStage.id)
            .order("version", { ascending: false })
            .limit(1);

          if (subs && subs.length > 0) {
            const { count } = await supabase
              .from("endorsements")
              .select("*", { count: "exact", head: true })
              .eq("submission_id", subs[0].id);
            needsEndorsement = (count || 0) === 0;
          }
        }

        return { ...p, anteStage, needsEndorsement };
      })
    );

    setProjects(enriched);
    setLoading(false);
  }

  if (loading) {
    return <div className="py-8 text-center text-muted-foreground animate-pulse">Cargando...</div>;
  }

  const statusColor: Record<string, string> = {
    VIGENTE: "bg-success text-success-foreground",
    FINALIZADO: "bg-muted text-muted-foreground",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Panel del Director</h1>
        <p className="text-muted-foreground text-sm">Proyectos bajo tu dirección</p>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <div className="rounded-full bg-muted p-6">
            <FolderOpen className="h-10 w-10 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-sm">No tienes proyectos asignados como director</p>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((p) => (
            <Card key={p.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-medium text-sm">{p.title}</p>
                  <p className="text-xs text-muted-foreground">{p.programs?.name}</p>
                  <Badge className={`text-xs mt-1 ${statusColor[p.global_status] || "bg-muted"}`}>
                    {p.global_status}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  {p.needsEndorsement && p.anteStage && (
                    <Link to={`/anteproyecto/${p.anteStage.id}/endorse`}>
                      <Button size="sm">Dar Aval</Button>
                    </Link>
                  )}
                  <Link to={`/projects/${p.id}`}>
                    <Button size="sm" variant="outline">Ver</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
