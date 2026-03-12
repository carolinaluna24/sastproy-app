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

    const { data: callerRoles } = await createClient(supabaseUrl, supabaseServiceKey)
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "COORDINATOR");

    if (!callerRoles || callerRoles.length === 0) {
      return new Response(JSON.stringify({ error: "Solo coordinadores pueden crear usuarios" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Read params from POST body
    const body = await req.json();
    const email = body.email || "";
    const password = body.password || "";
    const full_name = body.full_name || "";
    const phone = body.phone || "";
    const rolesParam = body.roles || "";
    const role = body.role || "";
    const program_id = body.program_id || "";
    const id_type = body.id_type || "";
    const id_number = body.id_number || "";

    // Support both comma-separated roles and single role
    const roleList: string[] = Array.isArray(rolesParam) ? rolesParam : rolesParam ? rolesParam.split(",") : role ? [role] : [];

    if (!email || !password || !full_name || roleList.length === 0) {
      return new Response(JSON.stringify({ error: "Campos requeridos: email, password, full_name, al menos un rol" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const validRoles = ["STUDENT", "COORDINATOR", "ASESOR", "JUROR", "DECANO"];
    const invalidRole = roleList.find((r: string) => !validRoles.includes(r));
    if (invalidRole) {
      return new Response(JSON.stringify({ error: `Rol inválido: ${invalidRole}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = newUser.user.id;

    const profileUpdate: Record<string, unknown> = {};
    if (phone) profileUpdate.phone = phone;
    if (program_id) profileUpdate.program_id = program_id;
    if (id_type) profileUpdate.id_type = id_type;
    if (id_number) profileUpdate.id_number = id_number;

    if (Object.keys(profileUpdate).length > 0) {
      await adminClient.from("user_profiles").update(profileUpdate).eq("id", userId);
    }

    const roleInserts = roleList.map((r: string) => ({ user_id: userId, role: r }));
    const { error: roleError } = await adminClient.from("user_roles").insert(roleInserts);

    if (roleError) {
      return new Response(JSON.stringify({ error: roleError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: true, user_id: userId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
