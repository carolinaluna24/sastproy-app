import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { UserPlus } from "lucide-react";

const ROLES = [
  { value: "STUDENT", label: "Estudiante" },
  { value: "COORDINATOR", label: "Coordinador" },
  { value: "DIRECTOR", label: "Director" },
  { value: "JUROR", label: "Jurado" },
  { value: "DECANO", label: "Directivo" },
];

export default function CreateUser() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [idType, setIdType] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [programId, setProgramId] = useState("");
  const [programs, setPrograms] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("programs").select("id, name").then(({ data }) => {
      setPrograms(data || []);
    });
  }, []);

  function toggleRole(role: string) {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim() || selectedRoles.length === 0 || !idType || !idNumber.trim()) {
      toast({ title: "Error", description: "Todos los campos marcados son obligatorios. Selecciona al menos un rol.", variant: "destructive" });
      return;
    }

    if (password.length < 6) {
      toast({ title: "Error", description: "La contraseña debe tener al menos 6 caracteres.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, string> = {
        email: email.trim(),
        password,
        full_name: `${firstName.trim()} ${lastName.trim()}`,
        roles: selectedRoles.join(","),
      };
      if (phone.trim()) payload.phone = phone.trim();
      if (idType) payload.id_type = idType;
      if (idNumber.trim()) payload.id_number = idNumber.trim();
      if (programId) payload.program_id = programId;

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/create-user`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );
      const result = await res.json();
      if (!res.ok || result.error) {
        throw new Error(result.error || "Error al crear usuario");
      }


      const roleLabels = selectedRoles.map((r) => ROLES.find((rl) => rl.value === r)?.label).join(", ");
      toast({ title: "Usuario creado", description: `${firstName} ${lastName} fue registrado con roles: ${roleLabels}.` });
      setFirstName("");
      setLastName("");
      setIdType("");
      setIdNumber("");
      setPhone("");
      setEmail("");
      setPassword("");
      setSelectedRoles([]);
      setProgramId("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  const showProgram = selectedRoles.includes("STUDENT") || selectedRoles.includes("DIRECTOR");

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <UserPlus className="h-6 w-6" /> Crear Usuario
        </h1>
        <p className="text-muted-foreground text-sm">Registra un nuevo usuario y asígnale uno o más roles en el sistema.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos del usuario</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Nombres *</Label>
                <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Ej: Juan Carlos" maxLength={100} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Apellidos *</Label>
                <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Ej: García López" maxLength={100} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de documento *</Label>
                <Select value={idType} onValueChange={setIdType}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CC">Cédula de Ciudadanía (CC)</SelectItem>
                    <SelectItem value="TI">Tarjeta de Identidad (TI)</SelectItem>
                    <SelectItem value="CE">Cédula de Extranjería (CE)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="idNumber">Número de documento *</Label>
                <Input id="idNumber" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} placeholder="Ej: 1234567890" maxLength={20} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Ej: 3001234567" maxLength={20} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico *</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="usuario@correo.edu.co" maxLength={255} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña *</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" maxLength={72} />
            </div>

            <div className="space-y-2">
              <Label>Roles * <span className="text-muted-foreground font-normal">(selecciona uno o más)</span></Label>
              <div className="grid grid-cols-2 gap-2 pt-1">
                {ROLES.map((r) => (
                  <label key={r.value} className="flex items-center gap-2 cursor-pointer text-sm">
                    <Checkbox
                      checked={selectedRoles.includes(r.value)}
                      onCheckedChange={() => toggleRole(r.value)}
                    />
                    {r.label}
                  </label>
                ))}
              </div>
            </div>

            {showProgram && (
              <div className="space-y-2">
                <Label>Programa académico</Label>
                <Select value={programId} onValueChange={setProgramId}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar programa" /></SelectTrigger>
                  <SelectContent>
                    {programs.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? "Creando..." : "Crear Usuario"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
