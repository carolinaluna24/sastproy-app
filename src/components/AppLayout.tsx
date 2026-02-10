import { useAuth } from "@/hooks/useAuth";
import { signOut } from "@/lib/auth";
import { useNavigate, Outlet, Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GraduationCap, LogOut, LayoutDashboard, FolderPlus, FileCheck, Clock, Shield, BarChart3 } from "lucide-react";

const navItems: Record<string, { label: string; path: string; icon: React.ElementType }[]> = {
  STUDENT: [
    { label: "Mi Proyecto", path: "/dashboard", icon: LayoutDashboard },
    { label: "Crear Proyecto", path: "/projects/new", icon: FolderPlus },
  ],
  COORDINATOR: [
    { label: "Proyectos", path: "/dashboard", icon: LayoutDashboard },
    { label: "Propuestas", path: "/proposals", icon: FileCheck },
    { label: "Reportes", path: "/reports", icon: BarChart3 },
  ],
  DIRECTOR: [
    { label: "Mis Proyectos", path: "/dashboard", icon: LayoutDashboard },
  ],
  JUROR: [
    { label: "Asignaciones", path: "/dashboard", icon: Clock },
  ],
};

export default function AppLayout() {
  const { user, primaryRole, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  if (!user) {
    navigate("/login");
    return null;
  }

  const items = primaryRole ? navItems[primaryRole] || [] : [];
  const roleLabel: Record<string, string> = {
    STUDENT: "Estudiante",
    COORDINATOR: "Coordinador",
    DIRECTOR: "Director",
    JUROR: "Jurado",
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold hidden sm:inline">Trabajo de Grado</span>
          </div>

          <nav className="flex items-center gap-1">
            {items.map((item) => {
              const Icon = item.icon;
              const active = location.pathname === item.path;
              return (
                <Link key={item.path} to={item.path}>
                  <Button
                    variant={active ? "secondary" : "ghost"}
                    size="sm"
                    className="gap-2 text-xs"
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{item.label}</span>
                  </Button>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <div className="text-right text-xs">
              <p className="font-medium">{user.email}</p>
              <p className="text-muted-foreground">{roleLabel[primaryRole || ""] || "Sin rol"}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleSignOut} title="Cerrar sesión">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
