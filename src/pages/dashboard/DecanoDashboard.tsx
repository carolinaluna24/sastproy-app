/**
 * DecanoDashboard.tsx
 * ====================
 * Dashboard de solo lectura para el rol DECANO (Directivo Académico).
 * Muestra indicadores globales del programa: proyectos por estado,
 * etapa actual, plazos en riesgo y acceso a reportes detallados.
 * No permite acciones de escritura.
 */

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FolderOpen, Layers, CheckCircle, AlertTriangle,
  List, Clock, BarChart3, BookOpen, Eye
} from "lucide-react";

function countBy<T>(items: T[], key: keyof T): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const val = String(item[key] ?? "SIN_DATO");
    counts[val] = (counts[val] || 0) + 1;
  }
  return counts;
}

export default function DecanoDashboard() {
  const [projects, setProjects] = useState<any[]>([]);
  const [currentStages, setCurrentStages] = useState<any[]>([]);
  const [deadlines, setDeadlines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [projRes, stagesRes, deadlinesRes] = await Promise.all([
      supabase.from("projects").select("id, global_status, title, programs(name)"),
      supabase.from("v_project_current_stage").select("*"),
      supabase.from("v_deadlines_risk").select("*"),
    ]);
    setProjects(projRes.data || []);
    setCurrentStages(stagesRes.data || []);
    setDeadlines(deadlinesRes.data || []);
    setLoading(false);
  }

  if (loading) return <div className="py-8 text-center text-muted-foreground animate-pulse">Cargando indicadores...</div>;

  const byStatus = countBy(projects, "global_status");
  const byStage = countBy(currentStages, "stage_name");
  const byOfficialState = countBy(currentStages, "official_state");
  const byRisk = countBy(deadlines, "risk_status");

  const statusColors: Record<string, string> = {
    VIGENTE: "bg-primary/10 text-primary",
    FINALIZADO: "bg-muted text-muted-foreground",
    VENCIDO: "bg-destructive/10 text-destructive",
    CANCELADO: "bg-destructive/20 text-destructive",
  };

  const stageLabels: Record<string, string> = {
    PROPUESTA: "Propuesta", ANTEPROYECTO: "Anteproyecto",
    INFORME_FINAL: "Informe Final", SUSTENTACION: "Sustentación",
  };

  const officialLabels: Record<string, string> = {
    APROBADA: "Aprobada", APROBADA_CON_MODIFICACIONES: "Con Modificaciones",
    NO_APROBADA: "No Aprobada", PENDIENTE: "Pendiente",
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Panel Directivo</h1>
          <p className="text-muted-foreground text-sm">Indicadores del programa — Solo lectura</p>
        </div>
        <div className="flex gap-2">
          <Link to="/reports"><Button variant="outline" size="sm" className="gap-2 text-xs"><BarChart3 className="h-3.5 w-3.5" />Reportes</Button></Link>
          <Link to="/catalog"><Button variant="outline" size="sm" className="gap-2 text-xs"><BookOpen className="h-3.5 w-3.5" />Catálogo</Button></Link>
        </div>
      </div>

      {/* KPI: Estado global */}
      <section>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <FolderOpen className="h-4 w-4" /> Proyectos por Estado ({projects.length} total)
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {(["VIGENTE", "FINALIZADO", "VENCIDO", "CANCELADO"] as const).map((status) => (
            <Card key={status}>
              <CardContent className="py-4">
                <p className="text-3xl font-bold">{byStatus[status] || 0}</p>
                <Badge className={`mt-1 text-xs ${statusColors[status]}`}>{status}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* KPI: Etapa actual */}
      <section>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Layers className="h-4 w-4" /> Distribución por Etapa
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {(["PROPUESTA", "ANTEPROYECTO", "INFORME_FINAL", "SUSTENTACION"] as const).map((stage) => (
            <Card key={stage}>
              <CardContent className="py-4">
                <p className="text-3xl font-bold">{byStage[stage] || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">{stageLabels[stage]}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* KPI: Estado oficial */}
      <section>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <CheckCircle className="h-4 w-4" /> Estado Oficial (Etapa Actual)
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {(["PENDIENTE", "APROBADA", "APROBADA_CON_MODIFICACIONES", "NO_APROBADA"] as const).map((state) => (
            <Card key={state}>
              <CardContent className="py-4">
                <p className="text-3xl font-bold">{byOfficialState[state] || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">{officialLabels[state]}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* KPI: Plazos */}
      <section>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" /> Alertas de Plazos
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-destructive/30">
            <CardContent className="py-4">
              <p className="text-3xl font-bold text-destructive">{byRisk["VENCIDO"] || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Vencidos</p>
            </CardContent>
          </Card>
          <Card className="border-warning/30">
            <CardContent className="py-4">
              <p className="text-3xl font-bold text-warning">{byRisk["POR_VENCER"] || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Por Vencer</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <p className="text-3xl font-bold">{byRisk["ACTIVO"] || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Activos</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Listado de proyectos vigentes (solo lectura) */}
      <section>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Eye className="h-4 w-4" /> Proyectos Vigentes
        </h2>
        <div className="space-y-2">
          {projects.filter(p => p.global_status === "VIGENTE").map((p) => (
            <Card key={p.id}>
              <CardContent className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-sm">{p.title}</p>
                  <p className="text-xs text-muted-foreground">{(p as any).programs?.name}</p>
                </div>
                <Link to={`/projects/${p.id}`}>
                  <Button size="sm" variant="outline" className="gap-1 text-xs">
                    <Eye className="h-3 w-3" /> Ver
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
          {projects.filter(p => p.global_status === "VIGENTE").length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No hay proyectos vigentes</p>
          )}
        </div>
      </section>
    </div>
  );
}
