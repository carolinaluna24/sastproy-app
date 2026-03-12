import { useAuth } from "@/hooks/useAuth";
import { Outlet, Navigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { RoleProvider } from "@/contexts/RoleContext";
import AppSidebar from "@/components/AppSidebar";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function AppLayout() {
  const { user, roles, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <RoleProvider roles={roles}>
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <div className="flex-1 flex flex-col">
            <header className="sticky top-0 z-40 flex h-12 items-center border-b bg-background/95 backdrop-blur px-4">
              <SidebarTrigger />
            </header>
            <main className="flex-1 p-6">
              <div className="mx-auto max-w-7xl">
                <Outlet />
              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    </RoleProvider>
  );
}
