import { useActiveRole } from "@/contexts/RoleContext";
import StudentDashboard from "./dashboard/StudentDashboard";
import CoordinatorDashboard from "./dashboard/CoordinatorDashboard";
import DirectorDashboard from "./dashboard/DirectorDashboard";
import JurorDashboard from "./dashboard/JurorDashboard";
import DecanoDashboard from "./dashboard/DecanoDashboard";

export default function Dashboard() {
  const { activeRole } = useActiveRole();

  switch (activeRole) {
    case "STUDENT":
      return <StudentDashboard />;
    case "COORDINATOR":
      return <CoordinatorDashboard />;
    case "ASESOR":
      return <DirectorDashboard />;
    case "JUROR":
      return <JurorDashboard />;
    case "DECANO":
      return <DecanoDashboard />;
    default:
      return <div className="py-8 text-center text-muted-foreground">Selecciona un rol en el menú lateral</div>;
  }
}
