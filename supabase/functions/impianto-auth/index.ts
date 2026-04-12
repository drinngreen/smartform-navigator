import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { action, email, password, tenant_id, impianto_account_id, fir_inbox_id, peso_verificato, note_impianto, stato, new_password } = await req.json();

    // ─── LOGIN ───
    if (action === "login") {
      if (!email || !password) throw new Error("Email e password obbligatori");
      if (!tenant_id) throw new Error("Tenant non specificato");

      // Find account matching email AND tenant
      const { data: account, error } = await supabase
        .from("impianti_accounts")
        .select("id, ragione_sociale, email, password_hash, tenant_id, attivo")
        .eq("email", email.toLowerCase().trim())
        .eq("tenant_id", tenant_id)
        .maybeSingle();

      if (error) throw error;
      if (!account) throw new Error("Account non trovato per questo tenant");
      if (!account.attivo) throw new Error("Account disabilitato");

      const { data: match } = await supabase.rpc("verify_impianto_password" as any, {
        p_email: email.toLowerCase().trim(),
        p_password: password,
      });

      if (!match) throw new Error("Password errata");

      await supabase.from("impianti_accounts").update({ ultimo_accesso: new Date().toISOString() }).eq("id", account.id);

      const sessionToken = btoa(JSON.stringify({ id: account.id, tenant_id: account.tenant_id, ts: Date.now(), exp: Date.now() + 24 * 60 * 60 * 1000 }));

      return new Response(JSON.stringify({
        success: true,
        account: { id: account.id, ragione_sociale: account.ragione_sociale, email: account.email, tenant_id: account.tenant_id },
        token: sessionToken,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── GET INBOX (FIR ricevuti) ───
    if (action === "get_inbox") {
      if (!impianto_account_id) throw new Error("ID account obbligatorio");

      const { data: inbox, error } = await supabase
        .from("impianto_fir_inbox")
        .select(`
          id, stato, peso_verificato, note_impianto, data_conferma, created_at,
          fir_form_id,
          fir_forms:fir_form_id (
            id, numero_fir, codice_eer, descrizione_rifiuto, quantita, unita_misura,
            produttore_denominazione, trasportatore_denominazione,
            destinatario_denominazione, data_partenza, data_arrivo,
            completed_at, status, tenant_id
          )
        `)
        .eq("impianto_account_id", impianto_account_id)
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      return new Response(JSON.stringify({ success: true, inbox: inbox || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── CONFIRM / CONTEST FIR ───
    if (action === "update_fir_status") {
      if (!fir_inbox_id || !stato) throw new Error("ID inbox e stato obbligatori");

      const updateData: any = {
        stato,
        updated_at: new Date().toISOString(),
      };
      if (stato === "confermato") updateData.data_conferma = new Date().toISOString();
      if (peso_verificato !== undefined) updateData.peso_verificato = peso_verificato;
      if (note_impianto !== undefined) updateData.note_impianto = note_impianto;

      const { error } = await supabase
        .from("impianto_fir_inbox")
        .update(updateData)
        .eq("id", fir_inbox_id);

      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── ADMIN: list accounts (optionally filtered by tenant) ───
    if (action === "admin_list") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) throw new Error("Non autorizzato");
      
      const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
      if (authErr || !user) throw new Error("Non autorizzato");

      const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      if (!isAdmin) throw new Error("Non autorizzato");

      let query = supabase
        .from("impianti_accounts")
        .select("id, ragione_sociale, email, tenant_id, attivo, ultimo_accesso, created_at")
        .order("ragione_sociale");

      if (tenant_id) {
        query = query.eq("tenant_id", tenant_id);
      }

      const { data: accounts, error } = await query;

      if (error) throw error;
      return new Response(JSON.stringify({ success: true, accounts: accounts || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── ADMIN: toggle active ───
    if (action === "admin_toggle_active") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) throw new Error("Non autorizzato");
      const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
      if (!user) throw new Error("Non autorizzato");
      const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      if (!isAdmin) throw new Error("Non autorizzato");

      const { data: current } = await supabase.from("impianti_accounts").select("attivo").eq("id", impianto_account_id).maybeSingle();
      if (!current) throw new Error("Account non trovato");

      await supabase.from("impianti_accounts").update({ attivo: !current.attivo }).eq("id", impianto_account_id);
      return new Response(JSON.stringify({ success: true, attivo: !current.attivo }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── ADMIN: change password ───
    if (action === "admin_change_password") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) throw new Error("Non autorizzato");
      const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
      if (!user) throw new Error("Non autorizzato");
      const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      if (!isAdmin) throw new Error("Non autorizzato");

      if (!new_password || new_password.length < 4) throw new Error("Password troppo corta");

      const { error } = await supabase.rpc("update_impianto_password" as any, {
        p_account_id: impianto_account_id,
        p_new_password: new_password,
      });

      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── ADMIN: view inbox for specific impianto ───
    if (action === "admin_view_inbox") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) throw new Error("Non autorizzato");
      const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
      if (!user) throw new Error("Non autorizzato");
      const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      if (!isAdmin) throw new Error("Non autorizzato");

      const { data: inbox, error } = await supabase
        .from("impianto_fir_inbox")
        .select(`
          id, stato, peso_verificato, note_impianto, data_conferma, created_at,
          fir_forms:fir_form_id (
            id, numero_fir, codice_eer, descrizione_rifiuto, quantita,
            produttore_denominazione, trasportatore_denominazione,
            completed_at, status
          )
        `)
        .eq("impianto_account_id", impianto_account_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return new Response(JSON.stringify({ success: true, inbox: inbox || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Azione non valida: " + action);
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
