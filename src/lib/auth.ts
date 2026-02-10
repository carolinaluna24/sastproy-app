/**
 * auth.ts
 * =======
 * Funciones de autenticación y gestión de roles.
 *
 * Usa Supabase Auth para login/logout y la tabla user_roles
 * para determinar el rol del usuario (STUDENT, COORDINATOR, DIRECTOR, JUROR).
 *
 * Los roles se almacenan en una tabla separada (user_roles) por seguridad,
 * nunca en el perfil del usuario, para evitar escalación de privilegios.
 */

import { supabase } from "@/integrations/supabase/client";
export type AppRole = "STUDENT" | "COORDINATOR" | "DIRECTOR" | "JUROR" | "DECANO";

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUserRoles(): Promise<AppRole[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);
  
  if (error) return [];
  return (data || []).map((r) => r.role as AppRole);
}

export async function getCurrentUserProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  
  return data;
}
