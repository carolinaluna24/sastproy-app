import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { type AppRole } from "@/lib/auth";

interface RoleContextType {
  activeRole: AppRole | null;
  setActiveRole: (role: AppRole) => void;
}

const RoleContext = createContext<RoleContextType>({
  activeRole: null,
  setActiveRole: () => {},
});

export function RoleProvider({
  roles,
  children,
}: {
  roles: AppRole[];
  children: ReactNode;
}) {
  const [activeRole, setActiveRole] = useState<AppRole | null>(null);

  // Auto-select first role or keep current if still valid
  useEffect(() => {
    if (roles.length === 0) {
      setActiveRole(null);
      return;
    }
    if (activeRole && roles.includes(activeRole)) return;
    setActiveRole(roles[0]);
  }, [roles]);

  return (
    <RoleContext.Provider value={{ activeRole, setActiveRole }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useActiveRole() {
  return useContext(RoleContext);
}
