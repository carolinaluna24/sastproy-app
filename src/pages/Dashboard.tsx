import { useAuth } from "@/hooks/useAuth";
import StudentDashboard from "./dashboard/StudentDashboard";
import CoordinatorDashboard from "./dashboard/CoordinatorDashboard";

export default function Dashboard() {
  const { primaryRole } = useAuth();

  switch (primaryRole) {
    case "STUDENT":
      return <StudentDashboard />;
    case "COORDINATOR":
      return <CoordinatorDashboard />;
    case "DIRECTOR":
      return (
        <div className="py-8 text-center text-muted-foreground">
          <h1 className="text-2xl font-bold text-foreground mb-2">Panel del Director</h1>
          <p>Los proyectos asignados se mostrarán aquí en próximas etapas.</p>
        </div>
      );
    case "JUROR":
      return (
        <div className="py-8 text-center text-muted-foreground">
          <h1 className="text-2xl font-bold text-foreground mb-2">Panel del Jurado</h1>
          <p>Las asignaciones de evaluación se mostrarán aquí en próximas etapas.</p>
        </div>
      );
    default:
      return <div className="py-8 text-center text-muted-foreground">Sin rol asignado</div>;
  }
}
