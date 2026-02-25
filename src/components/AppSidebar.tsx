import { useAuth } from "@/hooks/useAuth";
import { useActiveRole } from "@/contexts/RoleContext";
import { useLocation, Link } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarHeader,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  GraduationCap,
  LayoutDashboard,
  FolderPlus,
  FileCheck,
  Clock,
  BarChart3,
  BookOpen,
  Info,
  UserPlus,
  Users,
  KeyRound,
  DatabaseZap,
  LogOut,
  User,
  BookUser,
  Scale,
  ShieldCheck,
  Building2,
  List,
} from "lucide-react";
import { signOut } from "@/lib/auth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { type AppRole } from "@/lib/auth";
import { cn } from "@/lib/utils";

const roleConfig: Record<AppRole, { label: string; icon: React.ElementType; color: string }> = {
  STUDENT: { label: "Estudiante", icon: GraduationCap, color: "text-blue-400" },
  ASESOR: { label: "Asesor", icon: BookUser, color: "text-emerald-400" },
  JUROR: { label: "Jurado", icon: Scale, color: "text-amber-400" },
  COORDINATOR: { label: "Coordinador", icon: ShieldCheck, color: "text-violet-400" },
  DECANO: { label: "Directivo", icon: Building2, color: "text-rose-400" },
};

const navItems: Record<AppRole, { label: string; path: string; icon: React.ElementType }[]> = {
  STUDENT: [
    { label: "Mi Proyecto", path: "/dashboard", icon: LayoutDashboard },
    { label: "Crear Proyecto", path: "/projects/new", icon: FolderPlus },
    { label: "Catálogo", path: "/catalog", icon: BookOpen },
  ],
  COORDINATOR: [
    { label: "Proyectos", path: "/dashboard", icon: LayoutDashboard },
    { label: "Propuestas", path: "/proposals", icon: FileCheck },
    { label: "Crear Usuario", path: "/users/new", icon: UserPlus },
    { label: "Editar Usuarios", path: "/users", icon: Users },
    { label: "Reportes", path: "/reports", icon: BarChart3 },
    { label: "Catálogo", path: "/catalog", icon: BookOpen },
    { label: "Exportar BD", path: "/admin/export", icon: DatabaseZap },
    { label: "Escalabilidad", path: "/about/scalability", icon: Info },
  ],
  ASESOR: [
    { label: "Mis Proyectos", path: "/dashboard", icon: LayoutDashboard },
    { label: "Catálogo", path: "/catalog", icon: BookOpen },
  ],
  JUROR: [
    { label: "Asignaciones", path: "/dashboard", icon: Clock },
    { label: "Catálogo", path: "/catalog", icon: BookOpen },
  ],
  DECANO: [
    { label: "Indicadores", path: "/dashboard", icon: LayoutDashboard },
    { label: "Reportes", path: "/reports", icon: BarChart3 },
    { label: "Proyectos", path: "/reports/projects", icon: List },
    { label: "Plazos", path: "/reports/deadlines", icon: Clock },
    { label: "Catálogo", path: "/catalog", icon: BookOpen },
    { label: "Exportar BD", path: "/admin/export", icon: DatabaseZap },
  ],
};

export default function AppSidebar() {
  const { user, roles } = useAuth();
  const { activeRole, setActiveRole } = useActiveRole();
  const location = useLocation();
  const navigate = useNavigate();

  const items = activeRole ? navItems[activeRole] || [] : [];

  const handleSignOut = async () => {
    try { await signOut(); } catch {}
    navigate("/login");
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <GraduationCap className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
            Trabajo de Grado
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Roles Section */}
        <SidebarGroup>
          <SidebarGroupLabel>Mis Roles</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {roles.map((role) => {
                const cfg = roleConfig[role];
                const Icon = cfg.icon;
                const isActive = activeRole === role;
                return (
                  <SidebarMenuItem key={role}>
                    <SidebarMenuButton
                      onClick={() => setActiveRole(role)}
                      isActive={isActive}
                      tooltip={cfg.label}
                      className={cn(
                        "transition-all",
                        isActive && "bg-sidebar-accent font-semibold"
                      )}
                    >
                      <Icon className={cn("h-4 w-4", cfg.color)} />
                      <span>{cfg.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Navigation for active role */}
        {activeRole && (
          <SidebarGroup>
            <SidebarGroupLabel>
              {roleConfig[activeRole]?.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item) => {
                  const Icon = item.icon;
                  const active = location.pathname === item.path;
                  return (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                        <Link to={item.path}>
                          <Icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarSeparator />

        {/* Settings */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.pathname === "/settings/password"} tooltip="Cambiar contraseña">
                  <Link to="/settings/password">
                    <KeyRound className="h-4 w-4" />
                    <span>Cambiar contraseña</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent">
            <User className="h-4 w-4 text-sidebar-foreground" />
          </div>
          <div className="flex-1 overflow-hidden group-data-[collapsible=icon]:hidden">
            <p className="truncate text-xs font-medium text-sidebar-foreground">{user?.email}</p>
            <p className="truncate text-xs text-sidebar-foreground/60">
              {activeRole ? roleConfig[activeRole]?.label : "Sin rol"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSignOut}
            className="shrink-0 text-sidebar-foreground/60 hover:text-sidebar-foreground group-data-[collapsible=icon]:hidden"
            title="Cerrar sesión"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
