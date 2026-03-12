import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Users, Pencil, Search } from "lucide-react";

const ROLES = [
  { value: "STUDENT", label: "Estudiante" },
  { value: "COORDINATOR", label: "Coordinador" },
  { value: "DIRECTOR", label: "Director" },
  { value: "JUROR", label: "Jurado" },
  { value: "DECANO", label: "Directivo" },
];

interface UserRow {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  program_id: string | null;
  id_type: string | null;
  id_number: string | null;
  role: string | null;
}

export default function ManageUsers() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [programs, setPrograms] = useState<{ id: string; name: string }[]>([]);

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editIdType, setEditIdType] = useState("");
  const [editIdNumber, setEditIdNumber] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editProgramId, setEditProgramId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [usersRes, rolesRes, programsRes] = await Promise.all([
      supabase.from("user_profiles").select("id, full_name, email, phone, program_id, id_type, id_number"),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("programs").select("id, name"),
    ]);

    const rolesMap: Record<string, string> = {};
    (rolesRes.data || []).forEach((r: any) => {
      rolesMap[r.user_id] = r.role;
    });

    const merged = (usersRes.data || []).map((u: any) => ({
      ...u,
      role: rolesMap[u.id] || null,
    }));

    setUsers(merged);
    setPrograms(programsRes.data || []);
    setLoading(false);
  }

  function openEdit(user: UserRow) {
    setEditUser(user);
    setEditFullName(user.full_name);
    setEditEmail(user.email);
    setEditPhone(user.phone || "");
    setEditIdType(user.id_type || "");
    setEditIdNumber(user.id_number || "");
    setEditRole(user.role || "");
    setEditProgramId(user.program_id || "");
    setEditOpen(true);
  }

  async function handleSave() {
    if (!editUser) return;
    if (!editFullName.trim() || !editEmail.trim() || !editRole) {
      toast({ title: "Error", description: "Nombre, correo y rol son obligatorios.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const response = await supabase.functions.invoke("edit-user", {
        body: {
          user_id: editUser.id,
          full_name: editFullName.trim(),
          email: editEmail.trim(),
          phone: editPhone.trim() || null,
          id_type: editIdType || null,
          id_number: editIdNumber.trim() || null,
          role: editRole,
          program_id: editProgramId || null,
        },
      });

      if (response.error) throw new Error(response.error.message || "Error al actualizar");
      const result = response.data;
      if (result.error) throw new Error(result.error);

      toast({ title: "Usuario actualizado", description: `${editFullName} fue actualizado correctamente.` });
      setEditOpen(false);
      loadData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.full_name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.role || "").toLowerCase().includes(q)
    );
  });

  const getRoleLabel = (role: string | null) => ROLES.find((r) => r.value === role)?.label || "Sin rol";
  const getProgramName = (pid: string | null) => programs.find((p) => p.id === pid)?.name || "—";
  const getIdTypeLabel = (t: string | null) => {
    if (t === "CC") return "CC";
    if (t === "TI") return "TI";
    if (t === "CE") return "CE";
    return "—";
  };

  if (loading) return <div className="animate-pulse text-muted-foreground py-8 text-center">Cargando...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6" /> Gestión de Usuarios
        </h1>
        <p className="text-muted-foreground text-sm">Busca y edita la información de los usuarios del sistema.</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre, correo o rol..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Usuarios registrados ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Correo</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Programa</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium text-sm">{u.full_name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.id_type && u.id_number ? `${getIdTypeLabel(u.id_type)} ${u.id_number}` : "—"}</TableCell>
                  <TableCell className="text-sm">{u.email}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.phone || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{getRoleLabel(u.role)}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{getProgramName(u.program_id)}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => openEdit(u)}>
                      <Pencil className="h-3 w-3" /> Editar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No se encontraron usuarios
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="editFullName">Nombre completo *</Label>
              <Input
                id="editFullName"
                value={editFullName}
                onChange={(e) => setEditFullName(e.target.value)}
                maxLength={200}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editEmail">Correo electrónico *</Label>
              <Input
                id="editEmail"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                maxLength={255}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editPhone">Teléfono</Label>
              <Input
                id="editPhone"
                type="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                maxLength={20}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de documento</Label>
                <Select value={editIdType} onValueChange={setEditIdType}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CC">Cédula de Ciudadanía (CC)</SelectItem>
                    <SelectItem value="TI">Tarjeta de Identidad (TI)</SelectItem>
                    <SelectItem value="CE">Cédula de Extranjería (CE)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editIdNumber">Número de documento</Label>
                <Input
                  id="editIdNumber"
                  value={editIdNumber}
                  onChange={(e) => setEditIdNumber(e.target.value)}
                  maxLength={20}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Rol *</Label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger><SelectValue placeholder="Seleccionar rol" /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Programa académico</Label>
              <Select value={editProgramId} onValueChange={setEditProgramId}>
                <SelectTrigger><SelectValue placeholder="Sin programa" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin programa</SelectItem>
                  {programs.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
