import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [role, setRole] = useState("");
  const [programId, setProgramId] = useState("");
  const [programs, setPrograms] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("programs").select("id, name").then(({ data }) => {
      setPrograms(data || []);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim() || !role || !idType || !idNumber.trim()) {
      toast({ title: "Error", description: "Todos los campos marcados son obligatorios.", variant: "destructive" });
      return;
    }

    if (password.length < 6) {
      toast({ title: "Error", description: "La contraseña debe tener al menos 6 caracteres.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const response = await supabase.functions.invoke("create-user", {
        body: {
          email: email.trim(),
          password,
          full_name: `${firstName.trim()} ${lastName.trim()}`,
          phone: phone.trim() || null,
          id_type: idType || null,
          id_number: idNumber.trim() || null,
          role,
          program_id: programId || null,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Error al crear usuario");
      }

      const result = response.data;
      if (result.error) {
        throw new Error(result.error);
      }

      toast({ title: "Usuario creado", description: `${firstName} ${lastName} fue registrado como ${ROLES.find(r => r.value === role)?.label}.` });
      setFirstName("");
      setLastName("");
      setIdType("");
      setIdNumber("");
      setPhone("");
      setEmail("");
      setPassword("");
      setRole("");
      setProgramId("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <UserPlus className="h-6 w-6" /> Crear Usuario
        </h1>
        <p className="text-muted-foreground text-sm">Registra un nuevo usuario y asígnale un rol en el sistema.</p>
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
              <Label>Rol *</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger><SelectValue placeholder="Seleccionar rol" /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(role === "STUDENT" || role === "DIRECTOR") && (
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
