/**
 * CreateProject.tsx
 * ================
 * Página para que un ESTUDIANTE cree un nuevo proyecto de grado.
 *
 * Lógica de escalabilidad:
 * - Se cargan las modalidades y su configuración (modality_configs).
 * - Si la modalidad seleccionada está implementada (ej: TRABAJO_GRADO),
 *   se crea el proyecto con la etapa PROPUESTA como siempre.
 * - Si la modalidad NO está implementada, se crea el expediente (proyecto + miembros)
 *   pero NO se crean etapas ni flujos. Se registra un audit_event indicando
 *   que es una modalidad pendiente de implementación.
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Info, CheckCircle2, XCircle, Loader2 } from "lucide-react";

/** Tipo para la configuración de modalidad */
interface ModalityConfig {
  modality_id: string;
  enabled: boolean;
  implemented: boolean;
  description: string;
}

export default function CreateProject() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Estado del formulario
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [programId, setProgramId] = useState("");
  const [modalityId, setModalityId] = useState("");
  const [secondAuthorEmail, setSecondAuthorEmail] = useState("");

  // Validación del segundo autor
  const [secondAuthorStatus, setSecondAuthorStatus] = useState<"idle" | "checking" | "found" | "not_found">("idle");
  const [secondAuthorName, setSecondAuthorName] = useState("");

  // Datos de referencia
  const [programs, setPrograms] = useState<any[]>([]);
  const [modalities, setModalities] = useState<any[]>([]);
  const [modalityConfigs, setModalityConfigs] = useState<ModalityConfig[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Cargar programas, modalidades y configuración al montar
  async function loadLookups() {
    const [{ data: progs }, { data: mods }, { data: configs }] = await Promise.all([
      supabase.from("programs").select("*"),
      supabase.from("modalities").select("*"),
      supabase.from("modality_configs").select("*"),
    ]);
    setPrograms(progs || []);
    setModalities(mods || []);
    setModalityConfigs((configs as ModalityConfig[]) || []);
  }

  useEffect(() => {
    loadLookups();
  }, []);

  // Validar correo del segundo autor con debounce
  useEffect(() => {
    const email = secondAuthorEmail.trim();
    if (!email) {
      setSecondAuthorStatus("idle");
      setSecondAuthorName("");
      return;
    }
    // Validar formato básico de email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setSecondAuthorStatus("idle");
      setSecondAuthorName("");
      return;
    }
    // No permitir el mismo correo del usuario actual
    if (user && email.toLowerCase() === user.email?.toLowerCase()) {
      setSecondAuthorStatus("not_found");
      setSecondAuthorName("No puedes agregarte a ti mismo como segundo autor");
      return;
    }

    setSecondAuthorStatus("checking");
    const timeout = setTimeout(async () => {
      const { data } = await supabase
        .from("user_profiles")
        .select("id, full_name")
        .eq("email", email)
        .maybeSingle();

      if (data) {
        setSecondAuthorStatus("found");
        setSecondAuthorName(data.full_name);
      } else {
        setSecondAuthorStatus("not_found");
        setSecondAuthorName("Correo no registrado en el sistema");
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [secondAuthorEmail, user]);

  /**
   * Obtener la configuración de la modalidad seleccionada.
   * Si no existe config, se asume no implementada.
   */
  function getSelectedConfig(): ModalityConfig | null {
    if (!modalityId) return null;
    return modalityConfigs.find((c) => c.modality_id === modalityId) || null;
  }

  const selectedConfig = getSelectedConfig();
  const isImplemented = selectedConfig?.implemented ?? false;

  // Determinar si el segundo autor bloquea el envío
  const secondAuthorBlocks = secondAuthorEmail.trim() !== "" && secondAuthorStatus !== "found";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (secondAuthorBlocks) {
      toast({ title: "Error", description: "El correo del segundo autor no está registrado en el sistema.", variant: "destructive" });
      return;
    }
    setSubmitting(true);

    try {
      // 1. Crear el proyecto en la tabla projects
      console.log("Creating project with:", { title, description, programId, modalityId, userId: user.id });
      const { data: project, error: projErr } = await supabase
        .from("projects")
        .insert({
          title,
          description,
          program_id: programId,
          modality_id: modalityId,
          created_by: user.id,
        })
        .select()
        .single();

      if (projErr) {
        console.error("Project insert error:", JSON.stringify(projErr));
        throw projErr;
      }

      // 2. Agregar al creador como AUTOR del proyecto
      const { error: memberErr } = await supabase
        .from("project_members")
        .insert({
          project_id: project.id,
          user_id: user.id,
          role: "AUTHOR",
        });
      if (memberErr) throw memberErr;

      // 3. Agregar segundo autor si se proporcionó
      if (secondAuthorEmail.trim()) {
        const { data: secondProfile } = await supabase
          .from("user_profiles")
          .select("id")
          .eq("email", secondAuthorEmail.trim())
          .maybeSingle();

        if (!secondProfile) {
          toast({
            title: "Advertencia",
            description: "No se encontró el segundo estudiante. Proyecto creado solo con tu autoría.",
            variant: "destructive",
          });
        } else {
          const { error: secondErr } = await supabase
            .from("project_members")
            .insert({
              project_id: project.id,
              user_id: secondProfile.id,
              role: "AUTHOR",
            });
          if (secondErr) {
            toast({ title: "Advertencia", description: secondErr.message, variant: "destructive" });
          }
        }
      }

      // 4. Si la modalidad está implementada, crear la etapa PROPUESTA
      if (isImplemented) {
        await supabase.from("project_stages").insert({
          project_id: project.id,
          stage_name: "PROPUESTA",
        });
      }

      // 5. Registrar evento de auditoría
      const modalityName = modalities.find((m) => m.id === modalityId)?.name || "Desconocida";
      await supabase.from("audit_events").insert({
        project_id: project.id,
        user_id: user.id,
        event_type: "PROJECT_CREATED",
        description: isImplemented
          ? `Proyecto "${title}" creado bajo modalidad ${modalityName}`
          : `Proyecto "${title}" creado bajo modalidad ${modalityName} (pendiente de implementación)`,
      });

      toast({
        title: isImplemented
          ? "Proyecto creado exitosamente"
          : "Expediente creado (modalidad pendiente)",
        description: isImplemented
          ? undefined
          : "La modalidad seleccionada aún no tiene flujo detallado implementado.",
      });

      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Error al crear proyecto",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Crear Proyecto de Grado</CardTitle>
          <CardDescription>
            Completa la información para registrar tu proyecto. Puedes agregar un segundo autor opcionalmente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Título */}
            <div className="space-y-2">
              <Label htmlFor="title">Título del proyecto</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título descriptivo del proyecto"
                required
              />
            </div>

            {/* Descripción */}
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Breve descripción del proyecto"
                rows={3}
              />
            </div>

            {/* Programa y Modalidad */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Programa</Label>
                <Select value={programId} onValueChange={setProgramId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {programs.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Modalidad</Label>
                <Select value={modalityId} onValueChange={setModalityId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {modalities.map((m) => {
                      const config = modalityConfigs.find((c) => c.modality_id === m.id);
                      const impl = config?.implemented ?? false;
                      return (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name} {impl ? "" : "(pendiente)"}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Aviso de modalidad no implementada */}
            {modalityId && !isImplemented && (
              <div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/5 p-3">
                <Info className="h-5 w-5 text-warning mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-warning">Modalidad preparada para escalabilidad</p>
                  <p className="text-muted-foreground mt-1">
                    {selectedConfig?.description || "El flujo detallado de esta modalidad aún no ha sido implementado."}
                    {" "}Se creará el expediente del proyecto, pero las etapas de evaluación no estarán disponibles.
                  </p>
                </div>
              </div>
            )}

            {/* Segundo autor */}
            <div className="space-y-2">
              <Label htmlFor="secondAuthor">Segundo autor (opcional)</Label>
              <div className="relative">
                <Input
                  id="secondAuthor"
                  type="email"
                  value={secondAuthorEmail}
                  onChange={(e) => setSecondAuthorEmail(e.target.value)}
                  placeholder="correo@del.segundo.autor"
                  className={secondAuthorStatus === "not_found" ? "border-destructive" : secondAuthorStatus === "found" ? "border-green-500" : ""}
                />
                {secondAuthorStatus === "checking" && (
                  <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                )}
                {secondAuthorStatus === "found" && (
                  <CheckCircle2 className="absolute right-3 top-2.5 h-4 w-4 text-green-500" />
                )}
                {secondAuthorStatus === "not_found" && (
                  <XCircle className="absolute right-3 top-2.5 h-4 w-4 text-destructive" />
                )}
              </div>
              {secondAuthorStatus === "found" && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> {secondAuthorName}
                </p>
              )}
              {secondAuthorStatus === "not_found" && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <XCircle className="h-3 w-3" /> {secondAuthorName}
                </p>
              )}
              {secondAuthorStatus === "idle" && (
                <p className="text-xs text-muted-foreground">
                  Máximo 2 autores por proyecto. El segundo autor debe estar registrado en el sistema.
                </p>
              )}
            </div>

            {/* Botones */}
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={submitting || !programId || !modalityId || secondAuthorBlocks}>
                {submitting ? "Creando..." : isImplemented ? "Crear Proyecto" : "Crear Expediente"}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate("/dashboard")}>
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
