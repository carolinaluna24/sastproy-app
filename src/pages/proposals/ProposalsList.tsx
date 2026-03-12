import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const stateColors: Record<string, string> = {
  RADICADA: "bg-warning/15 text-warning border-warning/30",
  CERRADA: "bg-muted text-muted-foreground",
  BORRADOR: "bg-secondary text-secondary-foreground",
};

export default function ProposalsList() {
  const [proposals, setProposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProposals();
  }, []);

  async function loadProposals() {
    const { data } = await supabase
      .from("project_stages")
      .select("*, projects(id, title, programs(name))")
      .eq("stage_name", "PROPUESTA")
      .order("updated_at", { ascending: false });
    setProposals(data || []);
    setLoading(false);
  }

  if (loading) {
    return <div className="py-8 text-center text-muted-foreground animate-pulse">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Propuestas</h1>
        <p className="text-muted-foreground text-sm">Gestión de propuestas de trabajo de grado</p>
      </div>

      <div className="space-y-3">
        {proposals.map((ps) => (
          <Card key={ps.id}>
            <CardContent className="flex items-center justify-between py-4">
              <div>
                <p className="font-medium text-sm">{ps.projects?.title}</p>
                <p className="text-xs text-muted-foreground">{ps.projects?.programs?.name}</p>
                <div className="flex gap-2 mt-1">
                  <Badge variant="outline" className={`text-xs ${stateColors[ps.system_state] || ""}`}>
                    {ps.system_state}
                  </Badge>
                  {ps.official_state !== "PENDIENTE" && (
                    <Badge variant="outline" className="text-xs">
                      {ps.official_state}
                    </Badge>
                  )}
                </div>
              </div>
              {ps.system_state === "RADICADA" && (
                <Link to={`/proposals/${ps.id}/evaluate`}>
                  <Button size="sm">Evaluar</Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ))}
        {proposals.length === 0 && (
          <div className="py-8 text-center text-muted-foreground">
            No hay propuestas registradas
          </div>
        )}
      </div>
    </div>
  );
}
