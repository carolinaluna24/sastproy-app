import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Loader2, CheckCircle, AlertCircle, Database } from "lucide-react";

const TABLES = [
  { name: "projects", label: "Proyectos", description: "Todos los proyectos de grado" },
  { name: "project_stages", label: "Etapas", description: "Etapas de cada proyecto" },
  { name: "project_members", label: "Miembros", description: "Estudiantes, directores y jurados por proyecto" },
  { name: "programs", label: "Programas", description: "Programas académicos" },
  { name: "modalities", label: "Modalidades", description: "Modalidades de trabajo de grado" },
  { name: "modality_configs", label: "Config. Modalidades", description: "Configuración de modalidades" },
  { name: "user_profiles", label: "Perfiles de Usuario", description: "Información de todos los usuarios" },
  { name: "user_roles", label: "Roles de Usuario", description: "Roles asignados a cada usuario" },
  { name: "submissions", label: "Entregas", description: "Documentos entregados por etapa" },
  { name: "endorsements", label: "Avales", description: "Avales de directores" },
  { name: "evaluations", label: "Evaluaciones", description: "Evaluaciones de jurados" },
  { name: "evaluation_scores", label: "Puntajes", description: "Puntajes por ítem de rúbrica" },
  { name: "rubrics", label: "Rúbricas", description: "Rúbricas de evaluación" },
  { name: "rubric_items", label: "Ítems de Rúbrica", description: "Criterios de evaluación" },
  { name: "assignments", label: "Asignaciones", description: "Jurados asignados a etapas" },
  { name: "deadlines", label: "Plazos", description: "Fechas límite por etapa" },
  { name: "defense_sessions", label: "Sustentaciones", description: "Sesiones de sustentación programadas" },
  { name: "audit_events", label: "Auditoría", description: "Registro de eventos del sistema" },
];

type TableStatus = "idle" | "loading" | "success" | "error";

export default function ExportData() {
  const [statuses, setStatuses] = useState<Record<string, TableStatus>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function downloadTable(tableName: string) {
    setStatuses((s) => ({ ...s, [tableName]: "loading" }));
    setErrors((e) => ({ ...e, [tableName]: "" }));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No autenticado");

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const url = `https://${projectId}.supabase.co/functions/v1/export-table?table=${tableName}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(json.error || res.statusText);
      }

      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = `${tableName}_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(objUrl);

      setStatuses((s) => ({ ...s, [tableName]: "success" }));
      setTimeout(() => setStatuses((s) => ({ ...s, [tableName]: "idle" })), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatuses((s) => ({ ...s, [tableName]: "error" }));
      setErrors((e) => ({ ...e, [tableName]: msg }));
    }
  }

  async function downloadAll() {
    for (const t of TABLES) {
      await downloadTable(t.name);
      // Small delay between downloads
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Database className="h-6 w-6" />
            Exportar Base de Datos
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Descarga cada tabla en formato CSV. Solo disponible para Coordinadores y Decanos.
          </p>
        </div>
        <Button onClick={downloadAll} className="gap-2 shrink-0">
          <Download className="h-4 w-4" />
          Exportar Todo
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {TABLES.map((t) => {
          const status = statuses[t.name] || "idle";
          const err = errors[t.name];
          return (
            <Card key={t.name} className="flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">{t.label}</CardTitle>
                  {status === "success" && (
                    <Badge className="bg-primary/10 text-primary text-xs gap-1">
                      <CheckCircle className="h-3 w-3" /> Descargado
                    </Badge>
                  )}
                  {status === "error" && (
                    <Badge className="bg-destructive/10 text-destructive text-xs gap-1">
                      <AlertCircle className="h-3 w-3" /> Error
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-xs">{t.description}</CardDescription>
                <p className="text-xs text-muted-foreground font-mono">{t.name}</p>
              </CardHeader>
              <CardContent className="pt-0 mt-auto">
                {err && <p className="text-xs text-destructive mb-2">{err}</p>}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2 text-xs"
                  onClick={() => downloadTable(t.name)}
                  disabled={status === "loading"}
                >
                  {status === "loading" ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Download className="h-3 w-3" />
                  )}
                  {status === "loading" ? "Exportando..." : "Descargar CSV"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
