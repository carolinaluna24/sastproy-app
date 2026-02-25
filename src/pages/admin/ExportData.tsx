import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Loader2, CheckCircle, AlertCircle, Database, ShieldCheck } from "lucide-react";

const AUTH_TABLE = { name: "auth_users", label: "Usuarios Auth", description: "Todos los usuarios registrados: email, teléfono, fechas de creación, confirmación y último acceso", isAdmin: true };

const TABLES = [
  { name: "projects", label: "Proyectos", description: "Todos los proyectos de grado", isAdmin: false },
  { name: "project_stages", label: "Etapas", description: "Etapas de cada proyecto", isAdmin: false },
  { name: "project_members", label: "Miembros", description: "Estudiantes, asesores y jurados por proyecto", isAdmin: false },
  { name: "programs", label: "Programas", description: "Programas académicos", isAdmin: false },
  { name: "modalities", label: "Modalidades", description: "Modalidades de trabajo de grado", isAdmin: false },
  { name: "modality_configs", label: "Config. Modalidades", description: "Configuración de modalidades", isAdmin: false },
  { name: "user_profiles", label: "Perfiles de Usuario", description: "Información de todos los usuarios", isAdmin: false },
  { name: "user_roles", label: "Roles de Usuario", description: "Roles asignados a cada usuario", isAdmin: false },
  { name: "submissions", label: "Entregas", description: "Documentos entregados por etapa", isAdmin: false },
  { name: "endorsements", label: "Avales", description: "Avales de asesores", isAdmin: false },
  { name: "evaluations", label: "Evaluaciones", description: "Evaluaciones de jurados", isAdmin: false },
  { name: "evaluation_scores", label: "Puntajes", description: "Puntajes por ítem de rúbrica", isAdmin: false },
  { name: "rubrics", label: "Rúbricas", description: "Rúbricas de evaluación", isAdmin: false },
  { name: "rubric_items", label: "Ítems de Rúbrica", description: "Criterios de evaluación", isAdmin: false },
  { name: "assignments", label: "Asignaciones", description: "Jurados asignados a etapas", isAdmin: false },
  { name: "deadlines", label: "Plazos", description: "Fechas límite por etapa", isAdmin: false },
  { name: "defense_sessions", label: "Sustentaciones", description: "Sesiones de sustentación programadas", isAdmin: false },
  { name: "audit_events", label: "Auditoría", description: "Registro de eventos del sistema", isAdmin: false },
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
    await downloadTable(AUTH_TABLE.name);
    await new Promise((r) => setTimeout(r, 500));
    for (const t of TABLES) {
      await downloadTable(t.name);
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  function TableCard({ t }: { t: { name: string; label: string; description: string; isAdmin: boolean } }) {
    const status = statuses[t.name] || "idle";
    const err = errors[t.name];
    return (
      <Card className={`flex flex-col ${t.isAdmin ? "border-primary/40 bg-primary/5" : ""}`}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              {t.isAdmin && <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />}
              {t.label}
            </CardTitle>
            {status === "success" && (
              <Badge className="bg-primary/10 text-primary text-xs gap-1 shrink-0">
                <CheckCircle className="h-3 w-3" /> Descargado
              </Badge>
            )}
            {status === "error" && (
              <Badge className="bg-destructive/10 text-destructive text-xs gap-1 shrink-0">
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
            variant={t.isAdmin ? "default" : "outline"}
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

      {/* Auth users — destacado */}
      <div>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5" /> Acceso Administrativo
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <TableCard t={AUTH_TABLE} />
        </div>
      </div>

      {/* Regular tables */}
      <div>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Tablas de la Aplicación
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {TABLES.map((t) => <TableCard key={t.name} t={t} />)}
        </div>
      </div>
    </div>
  );
}
