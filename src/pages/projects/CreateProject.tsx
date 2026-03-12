import { useState, useEffect } from "react";
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

export default function CreateProject() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [programId, setProgramId] = useState("");
  const [modalityId, setModalityId] = useState("");
  const [secondAuthorEmail, setSecondAuthorEmail] = useState("");
  const [programs, setPrograms] = useState<any[]>([]);
  const [modalities, setModalities] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadLookups();
  }, []);

  async function loadLookups() {
    const [{ data: progs }, { data: mods }] = await Promise.all([
      supabase.from("programs").select("*"),
      supabase.from("modalities").select("*"),
    ]);
    setPrograms(progs || []);
    setModalities(mods || []);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);

    try {
      // Create project
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

      if (projErr) throw projErr;

      // Add creator as AUTHOR
      const { error: memberErr } = await supabase
        .from("project_members")
        .insert({
          project_id: project.id,
          user_id: user.id,
          role: "AUTHOR",
        });
      if (memberErr) throw memberErr;

      // Add second author if provided
      if (secondAuthorEmail.trim()) {
        const { data: secondProfile } = await supabase
          .from("user_profiles")
          .select("id")
          .eq("email", secondAuthorEmail.trim())
          .maybeSingle();

        if (!secondProfile) {
          toast({
            title: "Advertencia",
            description: "No se encontró el segundo estudiante. El proyecto fue creado solo con tu autoría.",
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
            toast({
              title: "Advertencia",
              description: secondErr.message,
              variant: "destructive",
            });
          }
        }
      }

      // Create PROPUESTA stage
      await supabase.from("project_stages").insert({
        project_id: project.id,
        stage_name: "PROPUESTA",
      });

      // Audit event
      await supabase.from("audit_events").insert({
        project_id: project.id,
        user_id: user.id,
        event_type: "PROJECT_CREATED",
        description: `Proyecto "${title}" creado`,
      });

      toast({ title: "Proyecto creado exitosamente" });
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
          <CardTitle>Crear Proyecto de Trabajo de Grado</CardTitle>
          <CardDescription>
            Completa la información para registrar tu proyecto. Puedes agregar un segundo autor opcionalmente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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
                    {modalities.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="secondAuthor">Segundo autor (opcional)</Label>
              <Input
                id="secondAuthor"
                type="email"
                value={secondAuthorEmail}
                onChange={(e) => setSecondAuthorEmail(e.target.value)}
                placeholder="correo@del.segundo.autor"
              />
              <p className="text-xs text-muted-foreground">
                Máximo 2 autores por proyecto. El segundo autor debe estar registrado en el sistema.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={submitting || !programId || !modalityId}>
                {submitting ? "Creando..." : "Crear Proyecto"}
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
