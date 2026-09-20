import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const backupSecret = Deno.env.get("BACKUP_VPS_SECRET")!;
    const vpsEndpoint = Deno.env.get("BACKUP_VPS_ENDPOINT")?.trim() ||
      "http://46.224.136.98:4000/upload-backup";


    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get all public tables
    const { data: tables, error: tablesError } = await supabase.rpc(
      "exec_sql_readonly",
      {
        query: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name`,
      }
    );

    if (tablesError) throw new Error(`Tables query failed: ${tablesError.message}`);

    const tableNames: string[] = (tables as any[]).map((t: any) => t.table_name);

    // Export each table in pages. A read error must fail the whole backup:
    // an empty table in the archive would silently lose data on restore.
    const PAGE_SIZE = 1000;
    const MAX_ROWS = 200000;
    const data: Record<string, any[]> = {};
    for (const tableName of tableNames) {
      const rowsAll: any[] = [];
      let from = 0;
      while (from < MAX_ROWS) {
        const { data: page, error } = await supabase
          .from(tableName)
          .select("*")
          .range(from, from + PAGE_SIZE - 1);

        if (error) {
          throw new Error(
            `Backup aborted: failed to read table "${tableName}" (rows ${from}-${from + PAGE_SIZE - 1}): ${error.message}`
          );
        }

        const batch = page || [];
        rowsAll.push(...batch);
        if (batch.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }

      if (rowsAll.length >= MAX_ROWS) {
        throw new Error(
          `Backup aborted: table "${tableName}" exceeds the ${MAX_ROWS} row export limit`
        );
      }

      data[tableName] = rowsAll;
    }

    // Build filename
    const now = new Date();
    const ts = now.toISOString().replace(/[:.]/g, "-");
    const filename = `backup_${ts}.json`;

    // POST to VPS
    const payload = { data, filename, secret: backupSecret };

    let response: Response;
    try {
      response = await fetch(vpsEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(60_000),
      });
    } catch (netErr) {
      throw new Error(
        `Backup destination unreachable (${vpsEndpoint}). Set the BACKUP_VPS_ENDPOINT secret to a reachable URL or bring the backup server online. Details: ${(netErr as Error).message}`
      );
    }


    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(`VPS responded ${response.status}: ${responseText}`);
    }

    console.log(`Backup sent: ${filename}, tables: ${tableNames.length}, VPS: ${response.status}`);

    return new Response(
      JSON.stringify({
        success: true,
        filename,
        tables_count: tableNames.length,
        vps_status: response.status,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Backup failed:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
