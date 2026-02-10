import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface DeadlineRisk {
  deadline_id: string;
  due_date: string;
  deadline_description: string;
  stage_name: string;
  project_id: string;
  project_title: string;
  program_name: string;
  days_remaining: number;
  risk_status: string;
}

const stageLabels: Record<string, string> = {
  PROPUESTA: "Propuesta",
  ANTEPROYECTO: "Anteproyecto",
  INFORME_FINAL: "Informe Final",
  SUSTENTACION: "Sustentación",
};

const riskBadge: Record<string, string> = {
  VENCIDO: "bg-destructive text-destructive-foreground",
  POR_VENCER: "bg-warning text-warning-foreground",
  ACTIVO: "bg-muted text-muted-foreground",
};

export default function DeadlinesRisk() {
  const [deadlines, setDeadlines] = useState<DeadlineRisk[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from("v_deadlines_risk")
        .select("*")
        .order("due_date", { ascending: true });
      setDeadlines((data as DeadlineRisk[]) || []);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return <div className="animate-pulse text-muted-foreground py-8 text-center">Cargando plazos...</div>;
  }

  const vencidos = deadlines.filter((d) => d.risk_status === "VENCIDO");
  const porVencer = deadlines.filter((d) => d.risk_status === "POR_VENCER");
  const activos = deadlines.filter((d) => d.risk_status === "ACTIVO");

  function DeadlineTable({ items }: { items: DeadlineRisk[] }) {
    if (items.length === 0) {
      return <p className="text-sm text-muted-foreground py-4 text-center">Sin plazos en esta categoría</p>;
    }
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Proyecto</TableHead>
            <TableHead>Programa</TableHead>
            <TableHead>Etapa</TableHead>
            <TableHead>Descripción</TableHead>
            <TableHead>Vence</TableHead>
            <TableHead>Días</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((d) => (
            <TableRow key={d.deadline_id}>
              <TableCell className="font-medium text-sm max-w-[200px] truncate">{d.project_title}</TableCell>
              <TableCell className="text-sm">{d.program_name || "—"}</TableCell>
              <TableCell className="text-sm">{stageLabels[d.stage_name] || d.stage_name}</TableCell>
              <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">{d.deadline_description}</TableCell>
              <TableCell className="text-xs">{new Date(d.due_date).toLocaleDateString("es-CO")}</TableCell>
              <TableCell className="text-sm font-medium">{d.days_remaining}</TableCell>
              <TableCell>
                <Badge className={`text-xs ${riskBadge[d.risk_status] || ""}`}>{d.risk_status}</Badge>
              </TableCell>
              <TableCell>
                <Link to={`/projects/${d.project_id}`}>
                  <Button variant="ghost" size="sm" className="text-xs">Ver</Button>
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bandeja de Plazos</h1>
        <p className="text-muted-foreground text-sm">Deadlines activos, por vencer y vencidos</p>
      </div>

      <Tabs defaultValue="vencidos">
        <TabsList>
          <TabsTrigger value="vencidos">Vencidos ({vencidos.length})</TabsTrigger>
          <TabsTrigger value="por-vencer">Por Vencer ({porVencer.length})</TabsTrigger>
          <TabsTrigger value="activos">Activos ({activos.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="vencidos">
          <Card>
            <CardContent className="pt-4"><DeadlineTable items={vencidos} /></CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="por-vencer">
          <Card>
            <CardContent className="pt-4"><DeadlineTable items={porVencer} /></CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="activos">
          <Card>
            <CardContent className="pt-4"><DeadlineTable items={activos} /></CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
