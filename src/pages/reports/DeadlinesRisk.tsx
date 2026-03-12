import { useEffect, useState } from "react";
import { InlineSpinner } from "@/components/LoadingSpinner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

const ALL = "__ALL__";

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
  const [programs, setPrograms] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterProgram, setFilterProgram] = useState(ALL);
  const [filterStage, setFilterStage] = useState(ALL);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [deadlinesRes, progRes] = await Promise.all([
        supabase.from("v_deadlines_risk").select("*").order("due_date", { ascending: true }),
        supabase.from("programs").select("id, name"),
      ]);
      setDeadlines((deadlinesRes.data as DeadlineRisk[]) || []);
      setPrograms(progRes.data || []);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return <InlineSpinner text="Cargando plazos..." />;
  }

  const filtered = deadlines.filter(d => {
    if (filterProgram !== ALL && d.program_name !== filterProgram) return false;
    if (filterStage !== ALL && d.stage_name !== filterStage) return false;
    return true;
  });

  const vencidos = filtered.filter((d) => d.risk_status === "VENCIDO");
  const porVencer = filtered.filter((d) => d.risk_status === "POR_VENCER");
  const activos = filtered.filter((d) => d.risk_status === "ACTIVO");

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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Bandeja de Plazos</h1>
          <p className="text-muted-foreground text-sm">Deadlines activos, por vencer y vencidos</p>
        </div>
        <Link to="/reports"><Button variant="outline" size="sm" className="text-xs">← Indicadores</Button></Link>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Programa</label>
              <Select value={filterProgram} onValueChange={setFilterProgram}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos</SelectItem>
                  {programs.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Etapa</label>
              <Select value={filterStage} onValueChange={setFilterStage}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="Todas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todas</SelectItem>
                  <SelectItem value="PROPUESTA">Propuesta</SelectItem>
                  <SelectItem value="ANTEPROYECTO">Anteproyecto</SelectItem>
                  <SelectItem value="INFORME_FINAL">Informe Final</SelectItem>
                  <SelectItem value="SUSTENTACION">Sustentación</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

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
