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
    // Timeout de seguridad: si loading no se resuelve en 5s, forzar fin
    const safetyTimeout = setTimeout(() => {
      setLoading(false);
    }, 5000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "TOKEN_REFRESHED" && !session) {
          setUser(null);
          setRoles([]);
          setLoading(false);
          clearTimeout(safetyTimeout);
          return;
        }
        setUser(session?.user ?? null);
        if (session?.user) {
          // Diferir la llamada async para no bloquear el callback
          getCurrentUserRoles().then((r) => {
            setRoles(r);
            setLoading(false);
            clearTimeout(safetyTimeout);
          }).catch(() => {
            setRoles([]);
            setLoading(false);
            clearTimeout(safetyTimeout);
          });
        } else {
          setRoles([]);
          setLoading(false);
          clearTimeout(safetyTimeout);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
      clearTimeout(safetyTimeout);
    };
  }, []);

  const primaryRole = roles[0] ?? null;

  return { user, roles, primaryRole, loading };
}
