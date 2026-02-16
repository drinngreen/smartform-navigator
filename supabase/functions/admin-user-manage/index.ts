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
      const { data: users, error } = await adminClient.auth.admin.listUsers({ perPage: 500 });
      if (error) throw error;

      const { data: profiles } = await adminClient.from("profiles").select("*");
      const { data: roles } = await adminClient.from("user_roles").select("*");
      const { data: statuses } = await adminClient.from("online_status").select("*");

      const enriched = users.users.map((u: any) => {
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

    // ACTION: list_fir_forms - list all fir_forms for admin
    if (action === "list_fir_forms") {
      const { data, error } = await adminClient
        .from("fir_forms")
        .select("*, profiles!fir_forms_user_id_fkey(nome, cognome, codice_fiscale)")
        .eq("deleted_by_user", false)
        .order("updated_at", { ascending: false });

      // If the join fails due to missing FK, fallback
      if (error) {
        const { data: forms, error: e2 } = await adminClient
          .from("fir_forms")
          .select("*")
          .eq("deleted_by_user", false)
          .order("updated_at", { ascending: false });
        if (e2) throw e2;

        // Enrich with profiles manually
        const { data: allProfiles } = await adminClient.from("profiles").select("user_id, nome, cognome, codice_fiscale");
        const enriched = (forms || []).map((f: any) => {
          const p = allProfiles?.find((pr: any) => pr.user_id === f.user_id);
          return { ...f, user_profile: p || null };
        });
        return new Response(JSON.stringify({ forms: enriched }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const enriched = (data || []).map((f: any) => ({
        ...f,
        user_profile: f.profiles || null,
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
