import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function buildSystemPrompt(userName: string, userRole: string, memories: any[], currentFirData: any) {
  const memoryBlock = memories.length > 0
    ? `\n\n### Memoria utente (fatti appresi dalle conversazioni precedenti):\n${memories.map(m => `- ${m.fact_key}: ${m.fact_value}`).join("\n")}`
    : "";

  const firBlock = currentFirData
    ? `\n\nDati FIR attualmente nel form:\n${JSON.stringify(currentFirData, null, 2)}`
    : "";

  return `Sei ZOLI DRAGON AI, l'assistente personale di ${userName} (ruolo: ${userRole}).
Sei un agente completo che può aiutare con FIR, social network, messaggi e comunicazioni.

## Capacità disponibili (usa i tool forniti):
1. **FIR**: Compilare e aggiornare formulari rifiuti, leggere cronologia FIR
2. **Social**: Pubblicare post, leggere il feed, cercare membri
3. **Messaggi**: Inviare e leggere messaggi diretti tra membri
4. **Sede**: Inviare e leggere messaggi dalla/alla sede (admin)
5. **Notifiche**: Leggere le notifiche dell'utente
6. **Memoria**: Salvare fatti importanti sull'utente per ricordarli in futuro
7. **RENTRI Impianto** (SOLO ADMIN): Consultare FIR in arrivo, controllare dettagli e firmare come DESTINATARIO

## Regole RENTRI Firma Destinatario:
⚠️ La firma RENTRI come destinatario è un'operazione CRITICA e IRREVERSIBILE.
- Solo gli admin possono eseguire questa operazione
- Prima di firmare, MOSTRA SEMPRE i dettagli del FIR e chiedi conferma esplicita
- L'admin DEVE scrivere esplicitamente "CONFERMO" o "AUTORIZZATO" nella chat
- NON firmare MAI senza questa autorizzazione esplicita scritta
- Dopo la firma, conferma l'esito all'utente con i dettagli dell'operazione

### ⚠️ IMPORTANTE — Dati RENTRI vs Database locale:
- I tool "rentri_lista_fir_arrivo", "rentri_dettaglio_fir", "rentri_firma_destinatario" interrogano DIRETTAMENTE il sistema ministeriale RENTRI tramite VPS Proxy
- I risultati di questi tool contengono GIÀ tutti i dati necessari (UUID, produttore, CER, quantità, stato)
- NON cercare MAI questi dati nel database locale (tabelle fir_forms, impianto_fir_inbox, ecc.) — non esistono lì
- NON inventare query SQL per cercare FIR "in attesa" — usa SOLO i risultati restituiti dai tool RENTRI
- Quando l'utente chiede "controlla FIR in arrivo", usa il tool rentri_lista_fir_arrivo e mostra DIRETTAMENTE i risultati

### Flusso consigliato per la firma:
1. L'admin chiede "controlla FIR in arrivo" → usa rentri_lista_fir_arrivo
2. Il tool restituisce la lista completa → MOSTRA i FIR pendenti con dettagli (produttore, CER, quantità, UUID)
3. L'admin dice "firma il FIR X" → chiedi conferma esplicita con "Scrivi CONFERMO per procedere"
4. L'admin scrive "CONFERMO" → esegui rentri_firma_destinatario con l'UUID dal risultato precedente
5. Conferma l'esito

## Regole FIR:
⚠️ SOGGETTI PROTETTI (NON MODIFICABILI):
- PRODUTTORE: sempre "Global Reco S.r.l." (CF: 08934760961, Via Alba 11, 10024 Moncalieri TO)
- INTERMEDIARIO: sempre "Multyproget S.r.l." (CF: 12347770013, Albo: 205.213, Via Rivarossa 18/20 Piscina TO)
- NON includere MAI nei firUpdates i campi protetti (produttore*, intermediario*)

Campi FIR modificabili: destinatarioDenominazione, destinatarioUnitaLocale, destinatarioCF, destinatarioOperazione, destinatarioCodiceOperazione, trasportatoreDenominazione, trasportatoreCF, trasportatoreNumeroAlbo, codiceEER, statoFisico, descrizione, quantita, unitaMisura, conducenteNomeCognome, targaAutomezzo, targaRimorchio, caratteristicheHP

Quando aggiorni il FIR, usa il tool update_fir.

## Regole generali:
- Rispondi SEMPRE in italiano, conciso e pratico
- Usa i tool per azioni concrete, non inventare dati
- Per le azioni social/messaggi, cerca prima il membro se serve il suo ID
- Salva fatti utili con save_memory (es. targa preferita, destinatari frequenti)
${memoryBlock}${firBlock}`;
}

const tools = [
  {
    type: "function",
    function: {
      name: "update_fir",
      description: "Aggiorna i campi del FIR corrente nel form dell'utente",
      parameters: {
        type: "object",
        properties: {
          updates: {
            type: "object",
            description: "Oggetto con i campi da aggiornare (es. {destinatarioDenominazione: 'Eco Green', codiceEER: '170405'})"
          },
          reset: { type: "boolean", description: "Se true, resetta il form FIR" }
        },
        required: ["updates"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_my_firs",
      description: "Leggi i FIR dell'utente (bozze, inviati, completati). Puoi filtrare per stato.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", description: "Filtra per stato: bozza, inviato, completato (opzionale)" },
          limit: { type: "number", description: "Numero max risultati (default 10)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "send_social_post",
      description: "Pubblica un post nel social feed della community Global Reco",
      parameters: {
        type: "object",
        properties: {
          content: { type: "string", description: "Testo del post" },
          post_type: { type: "string", enum: ["general", "safety_tip", "announcement"], description: "Tipo post (default: general)" }
        },
        required: ["content"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "read_social_feed",
      description: "Leggi gli ultimi post dal social feed",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Numero post da leggere (default 10)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "send_dm",
      description: "Invia un messaggio diretto a un membro della community",
      parameters: {
        type: "object",
        properties: {
          receiver_id: { type: "string", description: "UUID del destinatario" },
          content: { type: "string", description: "Testo del messaggio" }
        },
        required: ["receiver_id", "content"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "read_dms",
      description: "Leggi i messaggi diretti recenti (inviati e ricevuti)",
      parameters: {
        type: "object",
        properties: {
          partner_id: { type: "string", description: "UUID di un utente specifico (opzionale)" },
          limit: { type: "number", description: "Numero messaggi (default 20)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "send_hq_message",
      description: "Invia un messaggio alla sede (admin del tenant)",
      parameters: {
        type: "object",
        properties: {
          content: { type: "string", description: "Testo del messaggio" }
        },
        required: ["content"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "read_hq_messages",
      description: "Leggi i messaggi scambiati con la sede",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Numero messaggi (default 20)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_members",
      description: "Cerca membri della community per nome o cognome",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Nome o cognome da cercare" }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_notifications",
      description: "Leggi le notifiche dell'utente",
      parameters: {
        type: "object",
        properties: {
          unread_only: { type: "boolean", description: "Solo non lette (default true)" },
          limit: { type: "number", description: "Numero notifiche (default 10)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "save_memory",
      description: "Salva un fatto importante sull'utente per ricordarlo nelle conversazioni future (es. targa preferita, destinatario abituale)",
      parameters: {
        type: "object",
        properties: {
          fact_key: { type: "string", description: "Chiave del fatto (es. 'targa_preferita', 'destinatario_abituale')" },
          fact_value: { type: "string", description: "Valore del fatto" }
        },
        required: ["fact_key", "fact_value"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "rentri_lista_fir_arrivo",
      description: "Controlla i FIR in arrivo all'impianto (pendenze RENTRI). Mostra i formulari che devono essere firmati come DESTINATARIO. Richiede autorizzazione admin.",
      parameters: {
        type: "object",
        properties: {
          cliente: { type: "string", enum: ["multy", "niyol", "global"], description: "Tenant/società (default: multy)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "rentri_dettaglio_fir",
      description: "Recupera il dettaglio completo di un FIR dal RENTRI tramite il suo UUID o numero FIR",
      parameters: {
        type: "object",
        properties: {
          cliente: { type: "string", enum: ["multy", "niyol", "global"], description: "Tenant/società" },
          uuid_fir: { type: "string", description: "UUID del FIR su RENTRI (se disponibile)" },
          numero_fir: { type: "string", description: "Numero FIR da cercare (alternativo a uuid_fir)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "rentri_firma_destinatario",
      description: "Firma un FIR come DESTINATARIO (accettazione rifiuto all'impianto). ATTENZIONE: operazione irreversibile! Richiede SEMPRE autorizzazione esplicita scritta dall'admin prima di procedere. Se l'utente non è admin, rifiuta l'operazione.",
      parameters: {
        type: "object",
        properties: {
          cliente: { type: "string", enum: ["multy", "niyol", "global"], description: "Tenant/società (default: multy)" },
          uuid_fir: { type: "string", description: "UUID del FIR su RENTRI da firmare" },
          quantita_kg: { type: "number", description: "Quantità ricevuta in kg" },
          data_ora_ricezione: { type: "string", description: "Data/ora ricezione formato ISO (es. 2026-04-13T10:30:00)" },
          esito: { type: "string", enum: ["ACCETTATO_TOTALMENTE", "ACCETTATO_PARZIALMENTE", "RESPINTO"], description: "Esito conferimento (default: ACCETTATO_TOTALMENTE)" },
          motivazione: { type: "string", description: "Motivazione (obbligatoria se parziale o respinto)" },
          conferma_admin: { type: "string", description: "Testo esatto di conferma dell'admin (deve contenere 'CONFERMO' o 'AUTORIZZATO')" }
        },
        required: ["uuid_fir", "quantita_kg", "conferma_admin"]
      }
    }
  }
];

async function executeTool(db: any, userId: string, toolName: string, args: any): Promise<any> {
  switch (toolName) {
    case "update_fir": {
      if (args.reset) return { firUpdates: { __reset: true } };
      const PROTECTED = [
        "produttoreDenominazione", "produttoreUnitaLocale", "produttoreCF",
        "produttoreNumeroAut", "produttoreTipoAut", "produttoreDataAut",
        "intermediarioDenominazione", "intermediarioCF", "intermediarioNumeroAlbo",
      ];
      const updates = { ...args.updates };
      for (const key of PROTECTED) delete updates[key];
      return { firUpdates: updates };
    }

    case "get_my_firs": {
      let query = db.from("fir_forms").select("id, numero_fir, status, codice_eer, descrizione_rifiuto, destinatario_denominazione, quantita, created_at, updated_at")
        .eq("user_id", userId).eq("deleted_by_user", false).order("updated_at", { ascending: false }).limit(args.limit || 10);
      if (args.status) query = query.eq("status", args.status);
      const { data, error } = await query;
      if (error) return { error: error.message };
      return { firs: data, count: data?.length || 0 };
    }

    case "send_social_post": {
      const { data, error } = await db.from("social_posts").insert({
        author_id: userId,
        content: args.content,
        post_type: args.post_type || "general",
      }).select("id").single();
      if (error) return { error: error.message };
      return { success: true, post_id: data.id, message: "Post pubblicato!" };
    }

    case "read_social_feed": {
      const { data, error } = await db.from("social_posts")
        .select("id, content, post_type, created_at, likes_count, comments_count, author_id")
        .eq("is_hidden", false).order("created_at", { ascending: false }).limit(args.limit || 10);
      if (error) return { error: error.message };
      // Enrich with author names
      if (data && data.length > 0) {
        const authorIds = [...new Set(data.map((p: any) => p.author_id))];
        const { data: profiles } = await db.from("profiles").select("user_id, nome, cognome").in("user_id", authorIds);
        const profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.user_id, `${p.nome || ""} ${p.cognome || ""}`.trim()]));
        return { posts: data.map((p: any) => ({ ...p, author_name: profileMap[p.author_id] || "Utente" })) };
      }
      return { posts: data || [] };
    }

    case "send_dm": {
      const { data, error } = await db.from("messages").insert({
        sender_id: userId,
        receiver_id: args.receiver_id,
        content: args.content,
      }).select("id").single();
      if (error) return { error: error.message };
      return { success: true, message: "Messaggio inviato!" };
    }

    case "read_dms": {
      let query = db.from("messages")
        .select("id, sender_id, receiver_id, content, is_read, created_at")
        .order("created_at", { ascending: false }).limit(args.limit || 20);
      if (args.partner_id) {
        query = query.or(`and(sender_id.eq.${userId},receiver_id.eq.${args.partner_id}),and(sender_id.eq.${args.partner_id},receiver_id.eq.${userId})`);
      } else {
        query = query.or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
      }
      const { data, error } = await query;
      if (error) return { error: error.message };
      return { messages: data || [] };
    }

    case "send_hq_message": {
      // Find admin user for this tenant
      const { data: profile } = await db.from("profiles").select("tenant_id").eq("user_id", userId).single();
      const tenantId = profile?.tenant_id;
      const { data: admins } = await db.from("user_roles").select("user_id").eq("role", "admin");
      let adminId = admins?.[0]?.user_id;
      // Try to find admin of same tenant
      if (admins && admins.length > 1 && tenantId) {
        const { data: adminProfiles } = await db.from("profiles").select("user_id").eq("tenant_id", tenantId).in("user_id", admins.map((a: any) => a.user_id));
        if (adminProfiles && adminProfiles.length > 0) adminId = adminProfiles[0].user_id;
      }
      if (!adminId) return { error: "Nessun admin trovato" };
      const { error } = await db.from("messages").insert({ sender_id: userId, receiver_id: adminId, content: args.content });
      if (error) return { error: error.message };
      return { success: true, message: "Messaggio inviato alla sede!" };
    }

    case "read_hq_messages": {
      const { data: admins } = await db.from("user_roles").select("user_id").eq("role", "admin");
      const adminIds = (admins || []).map((a: any) => a.user_id);
      if (adminIds.length === 0) return { messages: [] };
      const { data, error } = await db.from("messages")
        .select("id, sender_id, receiver_id, content, is_read, created_at")
        .or(`and(sender_id.eq.${userId},receiver_id.in.(${adminIds.join(",")})),and(receiver_id.eq.${userId},sender_id.in.(${adminIds.join(",")}))`)
        .order("created_at", { ascending: false }).limit(args.limit || 20);
      if (error) return { error: error.message };
      return { messages: data || [] };
    }

    case "search_members": {
      const q = `%${args.query}%`;
      const { data, error } = await db.from("profiles")
        .select("user_id, nome, cognome, ruolo, email")
        .or(`nome.ilike.${q},cognome.ilike.${q}`)
        .limit(10);
      if (error) return { error: error.message };
      return { members: data || [] };
    }

    case "get_notifications": {
      let query = db.from("notifications").select("id, type, title, body, is_read, created_at")
        .eq("user_id", userId).order("created_at", { ascending: false }).limit(args.limit || 10);
      if (args.unread_only !== false) query = query.eq("is_read", false);
      const { data, error } = await query;
      if (error) return { error: error.message };
      return { notifications: data || [] };
    }

    case "save_memory": {
      // Upsert: update if same key exists
      const { data: existing } = await db.from("ai_user_memory")
        .select("id").eq("user_id", userId).eq("fact_key", args.fact_key).single();
      if (existing) {
        await db.from("ai_user_memory").update({ fact_value: args.fact_value }).eq("id", existing.id);
      } else {
        await db.from("ai_user_memory").insert({ user_id: userId, fact_key: args.fact_key, fact_value: args.fact_value });
      }
      return { success: true, message: `Memorizzato: ${args.fact_key} = ${args.fact_value}` };
    }

    case "rentri_lista_fir_arrivo": {
      // Check admin role
      const { data: roleCheck } = await db.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").single();
      if (!roleCheck) return { error: "⛔ Solo gli admin possono consultare i FIR in arrivo RENTRI" };

      const cliente = args.cliente || "multy";
      // identificativo_soggetto = Codice Fiscale del tenant
      const cfMap: Record<string, string> = {
        multy: "12347770013",
        niyol: "09879800010",
        global: "08934760961",
      };
      const unitIdMap: Record<string, string> = {
        multy: "OP2501XMQ021914-TO0001",
        niyol: "OP2501SXW021767-TO0001",
        global: "OP2501RMK022692-TO0001",
      };
      const tenantMap: Record<string, string> = {
        multy: "77ec9a3d-602e-438f-97bf-1c69abd8f691",
        niyol: "819c783e-78dd-4080-8265-802e75b0d813",
        global: "167d07ad-9184-484e-85a6-da5ceafa42a3",
      };
      const tenantId = tenantMap[cliente] || tenantMap.multy;
      const codiceFiscale = cfMap[cliente] || cfMap.multy;
      const numIscrSito = unitIdMap[cliente] || unitIdMap.multy;

      // Call VPS proxy to get pending FIR
      const vpsUrl = Deno.env.get("SUPABASE_URL")! + "/functions/v1/rentri-vps-proxy";
      const vpsRes = await fetch(vpsUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          cliente,
          tipo_operazione: "CUSTOM",
          rentri_method: "GET",
          rentri_path: `/formulari/v1.0?identificativo_soggetto=${encodeURIComponent(codiceFiscale)}&ruolo=DESTINATARIO&pendenza_arrivo=true`,
          payload: null,
        }),
      });
      const vpsData = await vpsRes.json();
      if (!vpsData.success) return { error: "Errore RENTRI: " + (vpsData.error || "sconosciuto") };

      // Parse response
      const items = Array.isArray(vpsData.data) ? vpsData.data
        : (vpsData.data?.formulari || vpsData.data?.items || vpsData.data?.content || []);

      return {
        fir_in_arrivo: items,
        count: items.length,
        num_iscr_sito: numIscrSito,
        message: items.length === 0
          ? "✅ Nessun FIR in attesa di firma all'impianto"
          : `📋 ${items.length} FIR in arrivo da firmare come destinatario`
      };
    }

    case "rentri_dettaglio_fir": {
      const { data: roleCheck } = await db.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").single();
      if (!roleCheck) return { error: "⛔ Solo gli admin possono consultare i dettagli FIR RENTRI" };

      const cliente = args.cliente || "multy";
      const vpsUrl = Deno.env.get("SUPABASE_URL")! + "/functions/v1/rentri-vps-proxy";

      if (args.uuid_fir) {
        const res = await fetch(vpsUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({ cliente, tipo_operazione: "DETTAGLIO_FIR", payload: { uuid_fir: args.uuid_fir } }),
        });
        const data = await res.json();
        return data.success ? { fir: data.data } : { error: data.error || "FIR non trovato" };
      }

      if (args.numero_fir) {
        const res = await fetch(vpsUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({ cliente, tipo_operazione: "RICERCA_FIR", payload: { numero_fir: args.numero_fir } }),
        });
        const data = await res.json();
        return data.success ? { fir: data.data } : { error: data.error || "FIR non trovato" };
      }

      return { error: "Specifica uuid_fir o numero_fir" };
    }

    case "rentri_firma_destinatario": {
      // CRITICAL: Admin-only check
      const { data: roleCheck } = await db.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").single();
      if (!roleCheck) return { error: "⛔ OPERAZIONE NEGATA: Solo gli admin possono firmare i FIR come destinatario" };

      // Verify explicit authorization text
      const conferma = (args.conferma_admin || "").toUpperCase().trim();
      if (!conferma.includes("CONFERMO") && !conferma.includes("AUTORIZZATO") && !conferma.includes("AUTORIZZA")) {
        return { error: "⚠️ Autorizzazione mancante. L'admin deve scrivere esplicitamente 'CONFERMO' o 'AUTORIZZATO' nella chat prima di procedere con la firma." };
      }

      const cliente = args.cliente || "multy";
      const unitIdMap: Record<string, string> = {
        multy: "OP2501XMQ021914-TO0001",
        niyol: "OP2501SXW021767-TO0001",
        global: "OP2501RMK022692-TO0001",
      };
      const tenantMap: Record<string, string> = {
        multy: "77ec9a3d-602e-438f-97bf-1c69abd8f691",
        niyol: "819c783e-78dd-4080-8265-802e75b0d813",
        global: "167d07ad-9184-484e-85a6-da5ceafa42a3",
      };
      const tenantId = tenantMap[cliente] || tenantMap.multy;
      const numIscrSito = unitIdMap[cliente] || unitIdMap.multy;

      const dataOra = args.data_ora_ricezione || new Date().toISOString();
      const esito = args.esito || "ACCETTATO_TOTALMENTE";

      const accettazionePayload = {
        data_ora_ricezione: dataOra,
        quantita_ricevuta: { valore: args.quantita_kg, unita_misura: "kg" },
        esito_conferimento: esito,
        num_iscr_sito: numIscrSito,
        ...(args.motivazione ? { motivazione: args.motivazione } : {}),
      };

      const vpsUrl = Deno.env.get("SUPABASE_URL")! + "/functions/v1/rentri-vps-proxy";
      const res = await fetch(vpsUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          cliente,
          tipo_operazione: "CUSTOM",
          rentri_method: "POST",
          rentri_path: `/formulari/v1.0/${args.uuid_fir}/accettazione`,
          payload: accettazionePayload,
        }),
      });
      const result = await res.json();

      if (result.success) {
        // Log the operation
        await db.from("rentri_logs").insert({
          tenant_id: tenantId,
          operazione: "FIRMA_DESTINATARIO",
          payload: { uuid_fir: args.uuid_fir, quantita_kg: args.quantita_kg, esito, conferma: args.conferma_admin },
          risposta: result.data,
          esito: "successo",
          created_by: userId,
        });
        return {
          success: true,
          message: `✅ FIR firmato come DESTINATARIO! Quantità: ${args.quantita_kg} kg, Esito: ${esito}`,
          rentri_response: result.data,
        };
      } else {
        await db.from("rentri_logs").insert({
          tenant_id: tenantId,
          operazione: "FIRMA_DESTINATARIO",
          payload: { uuid_fir: args.uuid_fir, quantita_kg: args.quantita_kg, esito },
          risposta: result,
          esito: "errore",
          created_by: userId,
        });
        return { error: `❌ Errore firma RENTRI: ${result.error || JSON.stringify(result)}` };
      }
    }

    default:
      return { error: `Tool sconosciuto: ${toolName}` };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return new Response(JSON.stringify({ error: "Richiesta non valida" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { messages, conversation_id, currentFirData } = body as any;

    // --- Input validation ---
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 80) {
      return new Response(JSON.stringify({ error: "Formato messaggi non valido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    for (const m of messages) {
      if (!m || typeof m !== "object") {
        return new Response(JSON.stringify({ error: "Formato messaggi non valido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (!["user", "assistant", "system", "tool"].includes(m.role)) {
        return new Response(JSON.stringify({ error: "Ruolo messaggio non valido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (typeof m.content === "string" && m.content.length > 20000) {
        return new Response(JSON.stringify({ error: "Messaggio troppo lungo" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }
    if (conversation_id !== undefined && conversation_id !== null && typeof conversation_id !== "string") {
      return new Response(JSON.stringify({ error: "conversation_id non valido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (currentFirData !== undefined && currentFirData !== null) {
      if (typeof currentFirData !== "object" || Array.isArray(currentFirData) || JSON.stringify(currentFirData).length > 50000) {
        return new Response(JSON.stringify({ error: "Dati FIR non validi" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY_NEW") ?? Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY non configurata");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const db = createClient(supabaseUrl, supabaseServiceKey);

    // --- Authentication required ---
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "").trim();
    let userId = "";
    let userName = "Utente";
    let userRole = "trasportatore";

    if (!token) {
      return new Response(JSON.stringify({ error: "Autenticazione richiesta" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: { user } } = await createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    }).auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Autenticazione richiesta" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    userId = user.id;
    const { data: profile } = await db.from("profiles").select("nome, cognome, ruolo").eq("user_id", user.id).single();
    if (profile) {
      userName = `${profile.nome || ""} ${profile.cognome || ""}`.trim() || "Utente";
      userRole = profile.ruolo || "trasportatore";
    }

    // Load user memories
    let memories: any[] = [];
    {
      const { data } = await db.from("ai_user_memory").select("fact_key, fact_value").eq("user_id", userId).order("updated_at", { ascending: false }).limit(30);
      memories = data || [];
    }


    const systemPrompt = buildSystemPrompt(userName, userRole, memories, currentFirData);

    // Build conversation
    const conversationMessages: any[] = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    // Iterative tool-calling loop (max 5 iterations)
    let finalContent = "";
    let firUpdates: any = undefined;

    for (let iteration = 0; iteration < 5; iteration++) {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://zolidragon.app",
          "X-Title": "Zoli Dragon AI",
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-120b",
          messages: conversationMessages,
          tools,
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("OpenRouter error:", response.status, errorText);
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Troppe richieste, riprova tra poco." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error(`OpenRouter error: ${response.status}`);
      }

      const data = await response.json();
      const choice = data.choices?.[0];
      if (!choice) throw new Error("No response from model");

      const assistantMsg = choice.message;
      conversationMessages.push(assistantMsg);

      if (!assistantMsg.tool_calls || assistantMsg.tool_calls.length === 0) {
        finalContent = assistantMsg.content || "";
        break;
      }

      // Process tool calls
      for (const toolCall of assistantMsg.tool_calls) {
        const fn = toolCall.function;
        let args: any;
        try {
          args = JSON.parse(fn.arguments);
        } catch {
          conversationMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify({ error: "JSON non valido" }) });
          continue;
        }

        const result = await executeTool(db, userId, fn.name, args);

        // Capture firUpdates from update_fir tool
        if (fn.name === "update_fir" && result.firUpdates) {
          firUpdates = result.firUpdates;
        }

        conversationMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(result) });
      }
    }

    return new Response(JSON.stringify({ content: finalContent, firUpdates }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("AI agent error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Errore sconosciuto",
      content: `❌ Errore: ${error instanceof Error ? error.message : "Errore sconosciuto"}`
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
