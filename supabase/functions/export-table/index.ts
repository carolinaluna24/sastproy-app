import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version",
};

const ALLOWED_TABLES = [
  "projects",
  "project_stages",
  "project_members",
  "programs",
  "modalities",
  "modality_configs",
  "user_profiles",
  "user_roles",
  "submissions",
  "endorsements",
  "evaluations",
  "evaluation_scores",
  "rubrics",
  "rubric_items",
  "assignments",
  "deadlines",
  "defense_sessions",
  "audit_events",
];

// Virtual table: export auth users via Admin API
const VIRTUAL_TABLES = ["auth_users"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role to bypass RLS
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Validate caller is coordinator or decano
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const userRoles = (roles || []).map((r: { role: string }) => r.role);
    if (!userRoles.includes("COORDINATOR") && !userRoles.includes("DECANO")) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const table = url.searchParams.get("table");

    if (!table || (!ALLOWED_TABLES.includes(table) && !VIRTUAL_TABLES.includes(table))) {
      return new Response(
        JSON.stringify({ error: "Tabla no válida", allowed: [...ALLOWED_TABLES, ...VIRTUAL_TABLES] }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const escape = (v: unknown): string => {
      if (v === null || v === undefined) return "";
      const s = typeof v === "object" ? JSON.stringify(v) : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    };

    // ── Auth users export via Admin API ──────────────────────────────────────
    if (table === "auth_users") {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

      let allUsers: Record<string, unknown>[] = [];
      let page = 1;
      const perPage = 1000;

      while (true) {
        const res = await fetch(
          `${supabaseUrl}/auth/v1/admin/users?page=${page}&per_page=${perPage}`,
          { headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey } }
        );
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Auth Admin API error: ${text}`);
        }
        const json = await res.json();
        const users: Record<string, unknown>[] = json.users ?? [];
        allUsers = allUsers.concat(users);
        if (users.length < perPage) break;
        page++;
      }

      if (allUsers.length === 0) {
        return new Response("sin_datos\n", {
          headers: { ...corsHeaders, "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="auth_users.csv"` },
        });
      }

      // Select meaningful columns (flatten user_metadata)
      const csvHeaders = [
        "id", "email", "phone", "email_confirmed_at", "created_at", "updated_at",
        "last_sign_in_at", "role", "full_name", "raw_user_meta_data",
      ];

      const csvLines = [
        csvHeaders.join(","),
        ...allUsers.map((u) => {
          const meta = (u.user_metadata ?? u.raw_user_meta_data ?? {}) as Record<string, unknown>;
          return [
            escape(u.id),
            escape(u.email),
            escape(u.phone),
            escape(u.email_confirmed_at),
            escape(u.created_at),
            escape(u.updated_at),
            escape(u.last_sign_in_at),
            escape(u.role),
            escape(meta.full_name),
            escape(u.raw_user_meta_data),
          ].join(",");
        }),
      ];

      return new Response(csvLines.join("\n"), {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="auth_users.csv"`,
        },
      });
    }

    // ── Regular table export ─────────────────────────────────────────────────
    const { data, error } = await supabase.from(table).select("*");
    if (error) throw error;

    if (!data || data.length === 0) {
      return new Response("sin_datos\n", {
        headers: { ...corsHeaders, "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${table}.csv"` },
      });
    }

    const colHeaders = Object.keys(data[0]);
    const csvLines = [
      colHeaders.join(","),
      ...data.map((row: Record<string, unknown>) =>
        colHeaders.map((h) => escape(row[h])).join(",")
      ),
    ];

    return new Response(csvLines.join("\n"), {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${table}.csv"`,
      },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});