import { useEffect, useState } from "react";
import { InlineSpinner } from "@/components/LoadingSpinner";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "react-router-dom";
import { Download } from "lucide-react";

interface ProjectRow {
  project_id: string;
  project_title: string;
  global_status: string;
  stage_name: string;
  official_state: string;
  program_name: string;
  project_created_at: string;
  final_grade: number | null;
}

const ALL = "__ALL__";

export default function ProjectsReport() {
  const [searchParams] = useSearchParams();
  const [rows, setRows] = useState<ProjectRow[]>([]);
  const [programs, setPrograms] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Initialize filters from URL params
  const [filterProgram, setFilterProgram] = useState(ALL);
  const [filterStatus, setFilterStatus] = useState(searchParams.get("status") || ALL);
  const [filterStage, setFilterStage] = useState(searchParams.get("stage") || ALL);
  const [filterOfficial, setFilterOfficial] = useState(searchParams.get("official") || ALL);
  const [filterYear, setFilterYear] = useState(ALL);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [dataRes, progRes] = await Promise.all([
        supabase.from("v_project_current_stage").select("*"),
        supabase.from("programs").select("id, name"),
      ]);
      setRows((dataRes.data as ProjectRow[]) || []);
      setPrograms(progRes.data || []);
      setLoading(false);
    }
    load();
  }, []);

  const availableYears = [...new Set(rows.map(r => new Date(r.project_created_at).getFullYear()))].sort((a, b) => b - a);

  const filtered = rows.filter((r) => {
    if (filterProgram !== ALL && r.program_name !== filterProgram) return false;
    if (filterStatus !== ALL && r.global_status !== filterStatus) return false;
    if (filterStage !== ALL && r.stage_name !== filterStage) return false;
    if (filterOfficial !== ALL && r.official_state !== filterOfficial) return false;
    if (filterYear !== ALL && new Date(r.project_created_at).getFullYear().toString() !== filterYear) return false;
    return true;
  });

  function exportCSV() {
    const headers = ["Título", "Programa", "Estado", "Etapa", "Estado Oficial", "Nota Final", "Creado"];
    const csvRows = [
      headers.join(","),
      ...filtered.map((r) =>
        [`"${r.project_title}"`, `"${r.program_name || ""}"`, r.global_status, r.stage_name, r.official_state, r.final_grade ?? "", new Date(r.project_created_at).toLocaleDateString("es-CO")].join(",")
      ),
    ];
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "reporte_proyectos.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return <InlineSpinner text="Cargando reporte..." />;
  }

  const statusColors: Record<string, string> = {
    VIGENTE: "bg-primary/10 text-primary",
    FINALIZADO: "bg-muted text-muted-foreground",
    VENCIDO: "bg-destructive/10 text-destructive",
    CANCELADO: "bg-destructive/20 text-destructive",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reporte de Proyectos</h1>
          <p className="text-muted-foreground text-sm">Listado filtrable con exportación CSV</p>
        </div>
        <div className="flex gap-2">
          <Link to="/reports"><Button variant="outline" size="sm" className="text-xs">← Indicadores</Button></Link>
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2"><Download className="h-4 w-4" /> Exportar CSV</Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Año</label>
              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos</SelectItem>
                  {availableYears.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Programa</label>
              <Select value={filterProgram} onValueChange={setFilterProgram}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos</SelectItem>
                  {programs.map((p) => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Estado Global</label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos</SelectItem>
                  <SelectItem value="VIGENTE">Vigente</SelectItem>
                  <SelectItem value="FINALIZADO">Finalizado</SelectItem>
                  <SelectItem value="VENCIDO">Vencido</SelectItem>
                  <SelectItem value="CANCELADO">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Etapa Actual</label>
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
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Estado Oficial</label>
              <Select value={filterOfficial} onValueChange={setFilterOfficial}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos</SelectItem>
                  <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                  <SelectItem value="APROBADA">Aprobada</SelectItem>
                  <SelectItem value="APROBADA_CON_MODIFICACIONES">Con Modificaciones</SelectItem>
                  <SelectItem value="NO_APROBADA">No Aprobada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">{filtered.length} proyecto(s) encontrado(s)</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Programa</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Etapa</TableHead>
                <TableHead>Estado Oficial</TableHead>
                <TableHead>Nota</TableHead>
                <TableHead>Creado</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.project_id}>
                  <TableCell className="font-medium text-sm max-w-[200px] truncate">{r.project_title}</TableCell>
                  <TableCell className="text-sm">{r.program_name || "—"}</TableCell>
                  <TableCell><Badge className={`text-xs ${statusColors[r.global_status] || "bg-muted"}`}>{r.global_status}</Badge></TableCell>
                  <TableCell className="text-sm">{r.stage_name}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{r.official_state}</Badge></TableCell>
                  <TableCell className="text-sm">{r.final_grade ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(r.project_created_at).toLocaleDateString("es-CO")}</TableCell>
                  <TableCell><Link to={`/projects/${r.project_id}`}><Button variant="ghost" size="sm" className="text-xs">Ver</Button></Link></TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No se encontraron proyectos con esos filtros</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
