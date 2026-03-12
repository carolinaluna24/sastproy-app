import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    // 1. Seed programs
    const { data: programs } = await supabase.from("programs").upsert([
      { name: "Ingeniería Informática" },
      { name: "Ingeniería Mecánica" },
    ], { onConflict: "name" }).select();

    // 2. Seed modalities
    await supabase.from("modalities").upsert([
      { name: "TRABAJO_GRADO" },
    ], { onConflict: "name" });

    // 3. Create test users
    const users = [
      { email: "student1@test.com", password: "Test1234!", name: "Ana García", role: "STUDENT", program: "Ingeniería Informática" },
      { email: "student2@test.com", password: "Test1234!", name: "Carlos López", role: "STUDENT", program: "Ingeniería Informática" },
      { email: "coordinator@test.com", password: "Test1234!", name: "María Rodríguez", role: "COORDINATOR", program: null },
      { email: "director@test.com", password: "Test1234!", name: "Pedro Martínez", role: "DIRECTOR", program: null },
      { email: "juror1@test.com", password: "Test1234!", name: "Laura Sánchez", role: "JUROR", program: null },
      { email: "juror2@test.com", password: "Test1234!", name: "José Hernández", role: "JUROR", program: null },
    ];

    const createdUsers = [];
    for (const u of users) {
      // Check if user exists
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existing = existingUsers?.users?.find((eu: any) => eu.email === u.email);
      
      let userId: string;
      if (existing) {
        userId = existing.id;
      } else {
        const { data, error } = await supabase.auth.admin.createUser({
          email: u.email,
          password: u.password,
          email_confirm: true,
          user_metadata: { full_name: u.name },
        });
        if (error) throw new Error(`Failed to create user ${u.email}: ${error.message}`);
        userId = data.user.id;
      }

      // Update profile with program if student
      if (u.program && programs) {
        const prog = programs.find((p: any) => p.name === u.program);
        if (prog) {
          await supabase.from("user_profiles").update({ program_id: prog.id }).eq("id", userId);
        }
      }

      // Assign role
      await supabase.from("user_roles").upsert({
        user_id: userId,
        role: u.role,
      }, { onConflict: "user_id,role" });

      createdUsers.push({ email: u.email, role: u.role, id: userId });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Seed data created successfully",
      users: createdUsers.map(u => ({ email: u.email, role: u.role, password: "Test1234!" }))
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Seed error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
