import { useEffect, useState } from "react";
import { InlineSpinner } from "@/components/LoadingSpinner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "react-router-dom";
import { Users, ChevronDown, ChevronRight, ArrowLeft } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface AsesorRow {
  asesorId: string;
  asesorName: string;
  asesorEmail: string;
  students: {
    id: string;
    fullName: string;
    email: string;
    projectTitle: string;
    projectId: string;
    globalStatus: string;
  }[];
}

export default function AsesoresReport() {
  const [rows, setRows] = useState<AsesorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    // Get all projects that have an asesor
    const { data: projects } = await supabase
      .from("projects")
      .select("id, title, global_status, asesor_id");

    if (!projects) {
      setLoading(false);
      return;
    }

    const projectsWithAsesor = projects.filter((p) => p.asesor_id);
    if (projectsWithAsesor.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }

    // Get all authors for those projects
    const projectIds = projectsWithAsesor.map((p) => p.id);
    const { data: members } = await supabase
      .from("project_members")
      .select("project_id, user_id")
      .in("project_id", projectIds)
      .eq("role", "AUTHOR");

    // Get all relevant user profiles (asesores + students)
    const asesorIds = [...new Set(projectsWithAsesor.map((p) => p.asesor_id!))];
    const studentIds = [...new Set((members || []).map((m) => m.user_id))];
    const allUserIds = [...new Set([...asesorIds, ...studentIds])];

    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("id, full_name, email")
      .in("id", allUserIds);

    const profileMap = new Map((profiles || []).map((p) => [p.id, p]));
    const membersByProject = new Map<string, string[]>();
    for (const m of members || []) {
      const list = membersByProject.get(m.project_id) || [];
      list.push(m.user_id);
      membersByProject.set(m.project_id, list);
    }

    // Group by asesor
    const asesorMap = new Map<string, AsesorRow>();
    for (const proj of projectsWithAsesor) {
      const aid = proj.asesor_id!;
      if (!asesorMap.has(aid)) {
        const profile = profileMap.get(aid);
        asesorMap.set(aid, {
          asesorId: aid,
          asesorName: profile?.full_name || "Sin nombre",
          asesorEmail: profile?.email || "",
          students: [],
        });
      }
      const row = asesorMap.get(aid)!;
      const studentUserIds = membersByProject.get(proj.id) || [];
      for (const sid of studentUserIds) {
        const sp = profileMap.get(sid);
        row.students.push({
          id: sid,
          fullName: sp?.full_name || "Sin nombre",
          email: sp?.email || "",
          projectTitle: proj.title,
          projectId: proj.id,
          globalStatus: proj.global_status,
        });
      }
    }

    const result = [...asesorMap.values()].sort((a, b) =>
      b.students.length - a.students.length
    );
    setRows(result);
    setLoading(false);
  }

  function toggleOpen(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (loading) return <InlineSpinner text="Cargando reporte de asesores..." />;

  const statusColors: Record<string, string> = {
    VIGENTE: "bg-primary/10 text-primary",
    FINALIZADO: "bg-muted text-muted-foreground",
    VENCIDO: "bg-destructive/10 text-destructive",
    CANCELADO: "bg-destructive/20 text-destructive",
  };

  const totalStudents = rows.reduce((sum, r) => sum + r.students.length, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Asesores y Estudiantes Asignados</h1>
          <p className="text-muted-foreground text-sm">
            {rows.length} asesor(es) — {totalStudents} estudiante(s) asignado(s) en total
          </p>
        </div>
        <Link to="/reports">
          <Button variant="outline" size="sm" className="gap-2 text-xs">
            <ArrowLeft className="h-3.5 w-3.5" /> Indicadores
          </Button>
        </Link>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No hay asesores con estudiantes asignados
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((asesor) => (
            <Card key={asesor.asesorId}>
              <Collapsible
                open={openIds.has(asesor.asesorId)}
                onOpenChange={() => toggleOpen(asesor.asesorId)}
              >
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {openIds.has(asesor.asesorId) ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        <div>
                          <CardTitle className="text-sm font-semibold">
                            {asesor.asesorName}
                          </CardTitle>
                          <p className="text-xs text-muted-foreground">{asesor.asesorEmail}</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="gap-1">
                        <Users className="h-3 w-3" />
                        {asesor.students.length} estudiante{asesor.students.length !== 1 ? "s" : ""}
                      </Badge>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Estudiante</TableHead>
                          <TableHead>Correo</TableHead>
                          <TableHead>Proyecto</TableHead>
                          <TableHead>Estado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {asesor.students.map((s, idx) => (
                          <TableRow key={`${s.id}-${s.projectId}-${idx}`}>
                            <TableCell className="text-sm font-medium">{s.fullName}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{s.email}</TableCell>
                            <TableCell className="text-sm max-w-[250px] truncate">
                              <Link
                                to={`/projects/${s.projectId}`}
                                className="text-primary hover:underline"
                              >
                                {s.projectTitle}
                              </Link>
                            </TableCell>
                            <TableCell>
                              <Badge className={`text-xs ${statusColors[s.globalStatus] || "bg-muted"}`}>
                                {s.globalStatus}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
