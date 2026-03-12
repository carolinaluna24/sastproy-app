/**
 * Scalability.tsx
 * ===============
 * Página informativa que explica cómo el sistema está diseñado
 * para escalar a otras modalidades de trabajo de grado.
 *
 * Accesible desde la navegación. No requiere rol específico.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, Clock, Database, Layers, Users, FileText, Shield, ArrowRight } from "lucide-react";

export default function Scalability() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-bold">Arquitectura y Escalabilidad</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Cómo el sistema actual soporta la extensión a otras modalidades de trabajo de grado
        </p>
      </div>

      {/* Estado de modalidades */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="h-4 w-4" /> Estado de Modalidades
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Implementada */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-sm">TRABAJO_GRADO</p>
                  <p className="text-xs text-muted-foreground">Flujo completo: Propuesta → Anteproyecto → Informe Final → Sustentación → Cierre</p>
                </div>
              </div>
              <Badge className="bg-primary/10 text-primary">Implementada</Badge>
            </div>

            {/* Pendientes */}
            {[
              { name: "CIP", desc: "Curso de Investigación Profesional" },
              { name: "PASANTIA", desc: "Pasantía académica" },
              { name: "PASANTIA_EMPRESARIAL", desc: "Pasantía en empresa" },
              { name: "POSGRADO_CREDITOS", desc: "Posgrado por créditos académicos" },
              { name: "GRUPO_INVESTIGACION", desc: "Vinculación a grupo de investigación" },
            ].map((m) => (
              <div key={m.name} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">{m.name}</p>
                    <p className="text-xs text-muted-foreground">{m.desc}</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">Pendiente</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Componentes reutilizables */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-4 w-4" /> Componentes Reutilizables
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Las siguientes tablas y módulos fueron diseñados de forma genérica para soportar cualquier modalidad:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { icon: Users, name: "users / user_profiles / user_roles", desc: "Autenticación y roles (STUDENT, COORDINATOR, DIRECTOR, JUROR)" },
              { icon: FileText, name: "projects / project_members", desc: "Expediente del proyecto con autores y director" },
              { icon: Layers, name: "project_stages", desc: "Etapas genéricas con estados (system_state, official_state)" },
              { icon: FileText, name: "submissions", desc: "Entregables versionados (PDF/URL)" },
              { icon: Shield, name: "evaluations / evaluation_scores", desc: "Evaluaciones con rúbricas configurables por etapa" },
              { icon: Clock, name: "deadlines", desc: "Plazos y fechas límite por etapa" },
              { icon: FileText, name: "audit_events", desc: "Trazabilidad completa de acciones" },
              { icon: Database, name: "rubrics / rubric_items", desc: "Rúbricas configurables por etapa y modalidad" },
            ].map((item) => (
              <div key={item.name} className="flex items-start gap-3 rounded-lg border p-3">
                <item.icon className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium text-xs font-mono">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Qué falta por modalidad */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowRight className="h-4 w-4" /> Qué Falta por Implementar
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Para cada modalidad nueva, se necesita definir:
          </p>
          <div className="space-y-2 text-sm">
            <div className="rounded-lg border p-3">
              <p className="font-medium">1. Etapas específicas</p>
              <p className="text-muted-foreground text-xs">Definir qué etapas aplican (ej: una pasantía puede no tener sustentación formal)</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="font-medium">2. Reglas de negocio</p>
              <p className="text-muted-foreground text-xs">Transiciones de estado, plazos, número de jurados, criterios de aprobación</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="font-medium">3. Rúbricas de evaluación</p>
              <p className="text-muted-foreground text-xs">Criterios y pesos específicos por etapa y modalidad</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="font-medium">4. Interfaz de usuario</p>
              <p className="text-muted-foreground text-xs">Dashboards y formularios adaptados al flujo de la modalidad</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="font-medium">5. Actualizar modality_configs</p>
              <p className="text-muted-foreground text-xs">Marcar implemented=true cuando el flujo esté completo</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sprints sugeridos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sprints Sugeridos para Futuras Modalidades</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="rounded-lg border p-3">
            <p className="font-medium">Sprint A — Análisis y diseño</p>
            <p className="text-muted-foreground text-xs">
              Levantar requisitos de la modalidad, definir etapas, roles involucrados y reglas de negocio.
              Crear rúbricas en BD.
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="font-medium">Sprint B — Flujo backend</p>
            <p className="text-muted-foreground text-xs">
              Implementar transiciones de estado en project_stages, crear validaciones y políticas RLS específicas.
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="font-medium">Sprint C — Interfaz y pruebas</p>
            <p className="text-muted-foreground text-xs">
              Crear páginas de radicación, evaluación y consolidación. Generar datos de prueba y validar el flujo completo.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
