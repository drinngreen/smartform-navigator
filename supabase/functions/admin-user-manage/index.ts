import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validate caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerId = claimsData.claims.sub as string;

    // Check admin role
    const adminClient = createClient(supabaseUrl, supabaseServiceKey) as ReturnType<typeof createClient<any>>;
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action } = body;

    // ACTION: list_users - list all users with profiles
    if (action === "list_users") {
      const perPage = 200;
      let page = 1;
      const allUsers: any[] = [];

      while (true) {
        const { data: usersPage, error } = await adminClient.auth.admin.listUsers({ page, perPage });
        if (error) throw error;

        const batch = usersPage?.users || [];
        allUsers.push(...batch);

        const nextPage = (usersPage as any)?.nextPage as number | null | undefined;
        if (nextPage) {
          page = nextPage;
          continue;
        }

        if (batch.length === perPage) {
          page += 1;
          continue;
        }

        break;
      }

      const users = Array.from(new Map(allUsers.map((u: any) => [u.id, u])).values());

      const { data: profiles } = await adminClient.from("profiles").select("*");
      const { data: roles } = await adminClient.from("user_roles").select("*");
      const { data: statuses } = await adminClient.from("online_status").select("*");

      const enriched = users.map((u: any) => {
        const profile = profiles?.find((p: any) => p.user_id === u.id);
        const role = roles?.find((r: any) => r.user_id === u.id);
        const status = statuses?.find((s: any) => s.user_id === u.id);
        return {
          id: u.id,
          email: u.email,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at,
          profile,
          role: role?.role || "user",
          online_status: status?.status || "offline",
        };
      });

      return new Response(JSON.stringify({ users: enriched }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: reset_password
    if (action === "reset_password") {
      const { user_id, new_password } = body;
      if (!user_id || !new_password) {
        return new Response(JSON.stringify({ error: "user_id and new_password required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await adminClient.auth.admin.updateUserById(user_id, {
        password: new_password,
      });

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: delete_user
    if (action === "delete_user") {
      const { user_id } = body;
      if (!user_id) {
        return new Response(JSON.stringify({ error: "user_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Delete profile and role first
      await adminClient.from("profiles").delete().eq("user_id", user_id);
      await adminClient.from("user_roles").delete().eq("user_id", user_id);
      await adminClient.from("online_status").delete().eq("user_id", user_id);

      const { error } = await adminClient.auth.admin.deleteUser(user_id);
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: list_fir_forms - list all fir_forms for admin (filtered by tenant_id if provided)
    if (action === "list_fir_forms") {
      const filterTenantId = body.tenant_id || null;

      let query = adminClient
        .from("fir_forms")
        .select("*")
        .eq("deleted_by_user", false)
        .order("updated_at", { ascending: false });

      if (filterTenantId) {
        query = query.eq("tenant_id", filterTenantId);
      }

      const { data: forms, error } = await query;
      if (error) throw error;

      // Enrich with profiles
      const userIds = [...new Set((forms || []).map((f: any) => f.user_id))];
      let profileMap: Record<string, any> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await adminClient
          .from("profiles")
          .select("user_id, nome, cognome, codice_fiscale")
          .in("user_id", userIds);
        if (profiles) {
          for (const p of profiles) profileMap[p.user_id] = p;
        }
      }

      const enriched = (forms || []).map((f: any) => ({
        ...f,
        user_profile: profileMap[f.user_id] || null,
      }));

      return new Response(JSON.stringify({ forms: enriched }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: update_fir_form - admin edits a draft
    if (action === "update_fir_form") {
      const { form_id, updates } = body;
      if (!form_id || !updates) {
        return new Response(JSON.stringify({ error: "form_id and updates required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await adminClient
        .from("fir_forms")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", form_id);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: create_user - admin creates a transporter user
    if (action === "create_user") {
      const { nome, cognome, codice_fiscale, password, tenant_id: targetTenantId, mn_context, org_id, targa_automezzo } = body;
      if (!nome || !cognome || !codice_fiscale || !password) {
        return new Response(JSON.stringify({ error: "nome, cognome, codice_fiscale, password required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const email = `${codice_fiscale.toLowerCase()}@zoli.internal`;

      // Create auth user
      const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { nome, cognome, codice_fiscale: codice_fiscale.toUpperCase() },
      });

      if (authError) {
        return new Response(JSON.stringify({ error: authError.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const newUserId = authData.user.id;

      // Create profile
      await adminClient.from("profiles").insert({
        user_id: newUserId,
        nome,
        cognome,
        codice_fiscale: codice_fiscale.toUpperCase(),
        tenant_id: targetTenantId || null,
        mn_context: mn_context || null,
        targa_automezzo: targa_automezzo || null,
      });

      // Assign user role
      await adminClient.from("user_roles").insert({ user_id: newUserId, role: "user" });

      // Create membership if org_id provided
      if (org_id) {
        await adminClient.from("memberships").insert({
          user_id: newUserId,
          organization_id: org_id,
          role: "operator",
        });
      }

      return new Response(JSON.stringify({ success: true, user_id: newUserId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("admin-user-manage error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
