import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is coordinator
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user: caller },
    } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: callerRoles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "COORDINATOR");

    if (!callerRoles || callerRoles.length === 0) {
      return new Response(JSON.stringify({ error: "Solo coordinadores pueden editar usuarios" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { user_id, full_name, email, phone, role, roles, program_id, id_type, id_number } = await req.json();

    if (!user_id) {
      return new Response(JSON.stringify({ error: "user_id es requerido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update auth email if changed
    if (email) {
      const { error: authError } = await adminClient.auth.admin.updateUserById(user_id, {
        email,
        user_metadata: full_name ? { full_name } : undefined,
      });
      if (authError) {
        return new Response(JSON.stringify({ error: authError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else if (full_name) {
      const { error: authError } = await adminClient.auth.admin.updateUserById(user_id, {
        user_metadata: { full_name },
      });
      if (authError) {
        return new Response(JSON.stringify({ error: authError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Update profile
    const profileUpdate: Record<string, unknown> = {};
    if (full_name) profileUpdate.full_name = full_name;
    if (email) profileUpdate.email = email;
    if (phone !== undefined) profileUpdate.phone = phone || null;
    if (program_id !== undefined) profileUpdate.program_id = program_id || null;
    if (id_type !== undefined) profileUpdate.id_type = id_type || null;
    if (id_number !== undefined) profileUpdate.id_number = id_number || null;

    if (Object.keys(profileUpdate).length > 0) {
      const { error: profileError } = await adminClient.from("user_profiles").update(profileUpdate).eq("id", user_id);
      if (profileError) {
        return new Response(JSON.stringify({ error: profileError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Update roles if provided (support both single and multiple)
    const roleList: string[] = roles && Array.isArray(roles) ? roles : role ? [role] : [];
    if (roleList.length > 0) {
      const validRoles = ["STUDENT", "COORDINATOR", "DIRECTOR", "JUROR", "DECANO"];
      const invalidRole = roleList.find((r: string) => !validRoles.includes(r));
      if (invalidRole) {
        return new Response(JSON.stringify({ error: `Rol inválido: ${invalidRole}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Delete existing roles and insert new ones
      await adminClient.from("user_roles").delete().eq("user_id", user_id);
      const roleInserts = roleList.map((r: string) => ({ user_id, role: r }));
      const { error: roleError } = await adminClient.from("user_roles").insert(roleInserts);
      if (roleError) {
        return new Response(JSON.stringify({ error: roleError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
