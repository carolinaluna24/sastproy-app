import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Users } from "lucide-react";

interface CatalogRow {
  project_id: string;
  title: string;
  program_name: string;
  modality_name: string;
  global_status: string;
  created_at: string;
  current_stage: string;
  current_official_state: string;
  author_count: number;
}

const ALL = "__ALL__";

const stageLabels: Record<string, string> = {
  PROPUESTA: "Propuesta",
  ANTEPROYECTO: "Anteproyecto",
  INFORME_FINAL: "Informe Final",
  SUSTENTACION: "Sustentación",
};

const statusColors: Record<string, string> = {
  VIGENTE: "bg-primary/10 text-primary",
  FINALIZADO: "bg-muted text-muted-foreground",
  VENCIDO: "bg-destructive/10 text-destructive",
  CANCELADO: "bg-destructive/20 text-destructive",
};

export default function Catalog() {
  const [rows, setRows] = useState<CatalogRow[]>([]);
  const [programs, setPrograms] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [search, setSearch] = useState("");
  const [filterProgram, setFilterProgram] = useState(ALL);
  const [filterStage, setFilterStage] = useState(ALL);
  const [filterOfficial, setFilterOfficial] = useState(ALL);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [dataRes, progRes] = await Promise.all([
        supabase.from("v_catalog_projects").select("*"),
        supabase.from("programs").select("id, name"),
      ]);
      setRows((dataRes.data as CatalogRow[]) || []);
      setPrograms(progRes.data || []);
      setLoading(false);
    }
    load();
  }, []);

  // Aplicar filtros
  const filtered = rows.filter((r) => {
    if (search && !r.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterProgram !== ALL && r.program_name !== filterProgram) return false;
    if (filterStage !== ALL && r.current_stage !== filterStage) return false;
    if (filterOfficial !== ALL && r.current_official_state !== filterOfficial) return false;
    return true;
  });

  if (loading) {
    return <div className="animate-pulse text-muted-foreground py-8 text-center">Cargando catálogo...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Catálogo de Proyectos</h1>
        <p className="text-muted-foreground text-sm">
          Consulta académica de trabajos de grado
        </p>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Búsqueda por título */}
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Buscar</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Título..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Programa</label>
              <Select value={filterProgram} onValueChange={setFilterProgram}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos</SelectItem>
                  {programs.map((p) => (
                    <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Etapa</label>
              <Select value={filterStage} onValueChange={setFilterStage}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="Todas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todas</SelectItem>
                  <SelectItem value="PROPUESTA">Propuesta</SelectItem>
                  <SelectItem value="ANTEPROYECTO">Anteproyecto</SelectItem>
                  <SelectItem value="INFORME_FINAL">Informe Final</SelectItem>
                  <SelectItem value="SUSTENTACION">Sustentación</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Estado Oficial</label>
              <Select value={filterOfficial} onValueChange={setFilterOfficial}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos</SelectItem>
                  <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                  <SelectItem value="APROBADA">Aprobada</SelectItem>
                  <SelectItem value="APROBADA_CON_MODIFICACIONES">Con Modificaciones</SelectItem>
                  <SelectItem value="NO_APROBADA">No Aprobada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resultados */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{filtered.length} proyecto(s)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Programa</TableHead>
                <TableHead>Autores</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Etapa</TableHead>
                <TableHead>Estado Oficial</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.project_id}>
                  <TableCell className="font-medium text-sm max-w-[200px] truncate">
                    {r.title}
                  </TableCell>
                  <TableCell className="text-sm">{r.program_name || "—"}</TableCell>
                  <TableCell className="text-sm">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      {r.author_count}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge className={`text-xs ${statusColors[r.global_status] || "bg-muted"}`}>
                      {r.global_status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{stageLabels[r.current_stage] || r.current_stage}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{r.current_official_state}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString("es-CO")}
                  </TableCell>
                  <TableCell>
                    <Link to={`/catalog/${r.project_id}`}>
                      <Button variant="ghost" size="sm" className="text-xs">Ver</Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No se encontraron proyectos
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
