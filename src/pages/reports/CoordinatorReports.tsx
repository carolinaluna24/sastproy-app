import { useEffect, useState } from "react";
import { InlineSpinner } from "@/components/LoadingSpinner";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FolderOpen, Layers, CheckCircle, AlertTriangle, List, Clock, BarChart3 } from "lucide-react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

function countBy<T>(items: T[], key: keyof T): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const val = String(item[key] ?? "SIN_DATO");
    counts[val] = (counts[val] || 0) + 1;
  }
  return counts;
}

const ALL = "__ALL__";

const COLORS = {
  VIGENTE: "hsl(var(--primary))",
  FINALIZADO: "hsl(var(--muted-foreground))",
  VENCIDO: "hsl(var(--destructive))",
  CANCELADO: "hsl(0 60% 40%)",
  PROPUESTA: "hsl(var(--primary))",
  ANTEPROYECTO: "hsl(200 70% 50%)",
  INFORME_FINAL: "hsl(280 60% 55%)",
  SUSTENTACION: "hsl(150 60% 45%)",
  PENDIENTE: "hsl(var(--muted-foreground))",
  APROBADA: "hsl(150 60% 45%)",
  APROBADA_CON_MODIFICACIONES: "hsl(40 90% 50%)",
  NO_APROBADA: "hsl(var(--destructive))",
  VENCIDO_RISK: "hsl(var(--destructive))",
  POR_VENCER: "hsl(40 90% 50%)",
  ACTIVO: "hsl(150 60% 45%)",
};

const statusLabels: Record<string, string> = {
  VIGENTE: "Vigente", FINALIZADO: "Finalizado", VENCIDO: "Vencido", CANCELADO: "Cancelado",
};
const stageLabels: Record<string, string> = {
  PROPUESTA: "Propuesta", ANTEPROYECTO: "Anteproyecto", INFORME_FINAL: "Informe Final", SUSTENTACION: "Sustentación",
};
const officialLabels: Record<string, string> = {
  APROBADA: "Aprobada", APROBADA_CON_MODIFICACIONES: "Con Modificaciones", NO_APROBADA: "No Aprobada", PENDIENTE: "Pendiente",
};
const riskLabels: Record<string, string> = {
  VENCIDO: "Vencidos", POR_VENCER: "Por Vencer", ACTIVO: "Activos",
};

export default function CoordinatorReports() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<any[]>([]);
  const [currentStages, setCurrentStages] = useState<any[]>([]);
  const [deadlines, setDeadlines] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [modalities, setModalities] = useState<any[]>([]);
  const [filterProgram, setFilterProgram] = useState(ALL);
  const [filterYear, setFilterYear] = useState(ALL);
  const [filterModality, setFilterModality] = useState(ALL);
  const [filterStatus, setFilterStatus] = useState(ALL);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [projRes, stagesRes, deadlinesRes, progRes, modRes] = await Promise.all([
      supabase.from("projects").select("id, global_status, program_id, created_at, modality_id, programs(name), modalities(name)"),
      supabase.from("v_project_current_stage").select("*"),
      supabase.from("v_deadlines_risk").select("*"),
      supabase.from("programs").select("id, name"),
      supabase.from("modalities").select("id, name"),
    ]);
    setProjects(projRes.data || []);
    setCurrentStages(stagesRes.data || []);
    setDeadlines(deadlinesRes.data || []);
    setPrograms(progRes.data || []);
    setModalities(modRes.data || []);
    setLoading(false);
  }

  if (loading) {
    return <InlineSpinner text="Cargando reportes..." />;
  }

  // Derive available years from projects
  const availableYears = [...new Set(projects.map(p => new Date(p.created_at).getFullYear()))].sort((a, b) => b - a);

  // Apply filters
  const filteredProjects = projects.filter(p => {
    if (filterProgram !== ALL && p.programs?.name !== filterProgram) return false;
    if (filterYear !== ALL && new Date(p.created_at).getFullYear().toString() !== filterYear) return false;
    if (filterModality !== ALL && p.modalities?.name !== filterModality) return false;
    if (filterStatus !== ALL && p.global_status !== filterStatus) return false;
    return true;
  });
  const filteredProjectIds = new Set(filteredProjects.map(p => p.id));
  const filteredStages = currentStages.filter(s => {
    if (filterProgram !== ALL && s.program_name !== filterProgram) return false;
    if (filterModality !== ALL && s.modality_name !== filterModality) return false;
    if (filterYear !== ALL && s.project_created_at && new Date(s.project_created_at).getFullYear().toString() !== filterYear) return false;
    if (filterStatus !== ALL && s.global_status !== filterStatus) return false;
    return true;
  });
  const filteredDeadlines = deadlines.filter(d => {
    if (filterProgram !== ALL && d.program_name !== filterProgram) return false;
    if (filterStatus !== ALL && d.global_status !== filterStatus) return false;
    return true;
  });

  const byStatus = countBy(filteredProjects, "global_status");
  const byStage = countBy(filteredStages, "stage_name");
  const byOfficialState = countBy(filteredStages, "official_state");
  const byRisk = countBy(filteredDeadlines, "risk_status");

  const statusData = ["VIGENTE", "FINALIZADO", "VENCIDO", "CANCELADO"].map(s => ({ name: statusLabels[s], value: byStatus[s] || 0, key: s })).filter(d => d.value > 0);
  const stageData = ["PROPUESTA", "ANTEPROYECTO", "INFORME_FINAL", "SUSTENTACION"].map(s => ({ name: stageLabels[s], value: byStage[s] || 0, key: s }));
  const officialData = ["PENDIENTE", "APROBADA", "APROBADA_CON_MODIFICACIONES", "NO_APROBADA"].map(s => ({ name: officialLabels[s], value: byOfficialState[s] || 0, key: s })).filter(d => d.value > 0);
  const riskData = ["VENCIDO", "POR_VENCER", "ACTIVO"].map(s => ({ name: riskLabels[s], value: byRisk[s] || 0, key: s })).filter(d => d.value > 0);

  const activeFilters = [filterProgram, filterYear, filterModality, filterStatus].filter(f => f !== ALL).length;

  function clearFilters() {
    setFilterProgram(ALL);
    setFilterYear(ALL);
    setFilterModality(ALL);
    setFilterStatus(ALL);
  }

  function handleStatusClick(status: string) {
    navigate(`/reports/projects?status=${status}`);
  }
  function handleStageClick(stage: string) {
    navigate(`/reports/projects?stage=${stage}`);
  }
  function handleOfficialClick(state: string) {
    navigate(`/reports/projects?official=${state}`);
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Reportes e Indicadores</h1>
          <p className="text-muted-foreground text-sm">
            Vista general del programa de Trabajo de Grado
            {activeFilters > 0 && <span className="ml-2 text-xs text-primary">({activeFilters} filtro{activeFilters > 1 ? "s" : ""} activo{activeFilters > 1 ? "s" : ""})</span>}
          </p>
        </div>
        <div className="flex gap-2 items-end">
          <Link to="/reports/deadlines"><Button variant="outline" size="sm" className="gap-2 text-xs"><Clock className="h-3.5 w-3.5" />Plazos</Button></Link>
          <Link to="/reports/projects"><Button variant="outline" size="sm" className="gap-2 text-xs"><List className="h-3.5 w-3.5" />Proyectos</Button></Link>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 items-end">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Año</label>
              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos los años</SelectItem>
                  {availableYears.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Programa</label>
              <Select value={filterProgram} onValueChange={setFilterProgram}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos los programas</SelectItem>
                  {programs.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Modalidad</label>
              <Select value={filterModality} onValueChange={setFilterModality}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="Todas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todas</SelectItem>
                  {modalities.map(m => <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>)}
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
            {activeFilters > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-muted-foreground">
                Limpiar filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Row 1: Status Pie + Stage Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><FolderOpen className="h-4 w-4" /> Proyectos por Estado</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {["VIGENTE", "FINALIZADO", "VENCIDO", "CANCELADO"].map(s => (
                <button key={s} onClick={() => handleStatusClick(s)} className="text-center rounded-lg border p-2 hover:bg-accent transition-colors cursor-pointer">
                  <p className="text-2xl font-bold">{byStatus[s] || 0}</p>
                  <p className="text-xs text-muted-foreground">{statusLabels[s]}</p>
                </button>
              ))}
            </div>
            {statusData.length > 0 && (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({ name, value }) => `${name}: ${value}`}>
                    {statusData.map(d => <Cell key={d.key} fill={COLORS[d.key as keyof typeof COLORS]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Layers className="h-4 w-4" /> Proyectos por Etapa Actual</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {["PROPUESTA", "ANTEPROYECTO", "INFORME_FINAL", "SUSTENTACION"].map(s => (
                <button key={s} onClick={() => handleStageClick(s)} className="text-center rounded-lg border p-2 hover:bg-accent transition-colors cursor-pointer">
                  <p className="text-2xl font-bold">{byStage[s] || 0}</p>
                  <p className="text-xs text-muted-foreground">{stageLabels[s]}</p>
                </button>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stageData}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" name="Proyectos" radius={[4, 4, 0, 0]}>
                  {stageData.map(d => <Cell key={d.key} fill={COLORS[d.key as keyof typeof COLORS]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Official State Pie + Deadlines */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><CheckCircle className="h-4 w-4" /> Estado Oficial (Etapa Actual)</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {["PENDIENTE", "APROBADA", "APROBADA_CON_MODIFICACIONES", "NO_APROBADA"].map(s => (
                <button key={s} onClick={() => handleOfficialClick(s)} className="text-center rounded-lg border p-2 hover:bg-accent transition-colors cursor-pointer">
                  <p className="text-2xl font-bold">{byOfficialState[s] || 0}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">{officialLabels[s]}</p>
                </button>
              ))}
            </div>
            {officialData.length > 0 && (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={officialData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({ name, value }) => `${name}: ${value}`}>
                    {officialData.map(d => <Cell key={d.key} fill={COLORS[d.key as keyof typeof COLORS]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Plazos</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <Link to="/reports/deadlines" className="text-center rounded-lg border border-destructive/30 p-3 hover:bg-accent transition-colors">
                <p className="text-2xl font-bold text-destructive">{byRisk["VENCIDO"] || 0}</p>
                <p className="text-xs text-muted-foreground">Vencidos</p>
              </Link>
              <Link to="/reports/deadlines" className="text-center rounded-lg border border-warning/30 p-3 hover:bg-accent transition-colors">
                <p className="text-2xl font-bold text-warning">{byRisk["POR_VENCER"] || 0}</p>
                <p className="text-xs text-muted-foreground">Por Vencer</p>
              </Link>
              <Link to="/reports/deadlines" className="text-center rounded-lg border p-3 hover:bg-accent transition-colors">
                <p className="text-2xl font-bold">{byRisk["ACTIVO"] || 0}</p>
                <p className="text-xs text-muted-foreground">Activos</p>
              </Link>
            </div>
            {riskData.length > 0 && (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={riskData} layout="vertical">
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" name="Plazos" radius={[0, 4, 4, 0]}>
                    {riskData.map(d => <Cell key={d.key} fill={d.key === "VENCIDO" ? COLORS.VENCIDO_RISK : d.key === "POR_VENCER" ? COLORS.POR_VENCER : COLORS.ACTIVO} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
