/**
 * useAuth.ts
 * ==========
 * Hook personalizado para manejar el estado de autenticación.
 *
 * Escucha cambios en la sesión de Supabase Auth y carga los roles
 * del usuario desde la tabla user_roles.
 *
 * Retorna: user (objeto del usuario), roles (lista de roles),
 * primaryRole (primer rol, usado para determinar el dashboard),
 * loading (estado de carga).
 */

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { type AppRole, getCurrentUserRoles } from "@/lib/auth";
import type { User } from "@supabase/supabase-js";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "TOKEN_REFRESHED" && !session) {
          // El refresh falló: sesión expirada
          setUser(null);
          setRoles([]);
          setLoading(false);
          return;
        }
        setUser(session?.user ?? null);
        if (session?.user) {
          const r = await getCurrentUserRoles();
          setRoles(r);
        } else {
          setRoles([]);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const r = await getCurrentUserRoles();
        setRoles(r);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const primaryRole = roles[0] ?? null;

  return { user, roles, primaryRole, loading };
}
