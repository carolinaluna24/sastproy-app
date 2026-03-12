import { useAuth } from "@/hooks/useAuth";
import StudentDashboard from "./dashboard/StudentDashboard";
import CoordinatorDashboard from "./dashboard/CoordinatorDashboard";
import DirectorDashboard from "./dashboard/DirectorDashboard";
import JurorDashboard from "./dashboard/JurorDashboard";

export default function Dashboard() {
  const { primaryRole } = useAuth();

  switch (primaryRole) {
    case "STUDENT":
      return <StudentDashboard />;
    case "COORDINATOR":
      return <CoordinatorDashboard />;
    case "DIRECTOR":
      return <DirectorDashboard />;
    case "JUROR":
      return <JurorDashboard />;
    default:
      return <div className="py-8 text-center text-muted-foreground">Sin rol asignado</div>;
  }
}
