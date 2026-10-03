import { useState } from "react";
import { zipSync, strToU8 } from "fflate";
import { supabase } from "@/lib/supabaseClient";
import { Archive, Loader2, Download } from "lucide-react";
import { toast } from "sonner";

type Esito = { tabella: string; righe: number; errore?: string };

// Cartelle leggibili per area dell'applicazione; dentro, i nomi tecnici delle tabelle.
const AREE: [string, (t: string) => boolean][] = [
  ["01_Giacenze_Magazzino", (t) => /^(magazzino_|giacenze_)/.test(t) || ["dragon_stock_movements", "dragon_warehouses", "dragon_inventory_adjustments", "dragon_lots", "dragon_lot_movements", "dragon_movement_allocations"].includes(t)],
  ["02_Cernite", (t) => /^(cernit|dragon_transform)/.test(t)],
  ["03_Registri_Carico_Scarico", (t) => /^(registro_|register_movements|dragon_register|movimenti_)/.test(t)],
  ["04_Formulari_FIR", (t) => /^(fir|ddt_|impianto_fir)/.test(t)],
  ["05_Privati_e_Ricevute", (t) => /(privat|ricevut)/.test(t)],
  ["06_RENTRI", (t) => /^rentri_/.test(t)],
  ["07_Anagrafiche_Clienti", (t) => /^(anagrafica_|cliente_|rubrica_|intermediar|impianti|autorizzazioni|erp_anagrafiche)/.test(t)],
  ["08_Intermediazione", (t) => /^(intermediazion|listini_intermediazione)/.test(t)],
  ["09_Fatture_Contabilita", (t) => /^(fattur|erp_|contratti_|sibill_|pagamenti)/.test(t)],
  ["10_Configurazione_Dragon", (t) => /^dragon_/.test(t)],
  ["11_Utenti_e_Aziende", (t) => /^(profiles|user_roles|memberships|organizations|tenants|online_status|driver_locations|appuntamenti)/.test(t)],
  ["12_Comunicazioni_Telefono", (t) => /^(messages|message_|emails_|comunicazioni|notifications|calls|call_|office_calls|signals)/.test(t)],
  ["13_Social", (t) => /^social_/.test(t)],
  ["14_Assistente_AI", (t) => /^(ai_|system_prompt)/.test(t)],
];
const areaDi = (t: string) => AREE.find(([, m]) => m(t))?.[0] ?? "99_Altro_Tecnico";

const toCsv = (rows: Record<string, unknown>[]) => {
  const cols = Array.from(rows.reduce((s, r) => { Object.keys(r).forEach((k) => s.add(k)); return s; }, new Set<string>()));
  const esc = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "\uFEFF" + [cols.join(";"), ...rows.map((r) => cols.map((c) => esc(r[c])).join(";"))].join("\r\n");
};

const pausa = (ms: number) => new Promise((r) => setTimeout(r, ms));
const isTemporaneo = (m: string) => /TEMPORANEO|521|502|503|504|546|WORKER_RESOURCE|<html|Failed to fetch|Sessione non valida|amministratori/i.test(m);

const SB_URL = import.meta.env.VITE_SUPABASE_URL || "https://zungtspcixpxjpjlcwzy.supabase.co";
const SB_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

// Il token si legge senza restare appesi al rinnovo della sessione (che con il database lento può bloccarsi).
async function leggiToken(): Promise<string> {
  try {
    const r = await Promise.race([
      supabase.auth.getSession().then((s) => s.data.session?.access_token || ""),
      pausa(4000).then(() => ""),
    ]);
    if (r) return r;
  } catch { /* fallback sotto */ }
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i) || "";
      if (k.startsWith("sb-") && k.endsWith("-auth-token")) {
        const t = JSON.parse(localStorage.getItem(k) || "{}")?.access_token;
        if (t) return t;
      }
    }
  } catch { /* ignore */ }
  throw new Error("Sessione non trovata: esci e rientra nell'app, poi riprova");
}

async function callOnce(body: Record<string, unknown>) {
  const token = await leggiToken();
  let res: Response;
  try {
    res = await fetch(`${SB_URL}/functions/v1/db-export-all`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, apikey: SB_KEY },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(90000),
    });
  } catch (e) {
    throw new Error(`TEMPORANEO: Failed to fetch (${(e as Error).message})`);
  }
  const txt = await res.text();
  let data: any = null;
  try { data = JSON.parse(txt); } catch { /* risposta non JSON */ }
  if (!res.ok || data?.error) throw new Error(String(data?.error || `${res.status} ${txt}`).slice(0, 300));
  return data;
}

// Con il database sotto sforzo aspetta e riprova, invece di insistere.
async function call(body: Record<string, unknown>, onWait?: (s: string) => void) {
  for (let tentativo = 0; ; tentativo++) {
    try {
      const r = await callOnce(body);
      await pausa(150);
      return r;
    } catch (e) {
      const m = (e as Error).message;
      if (!isTemporaneo(m) || tentativo >= 6) throw e;
      const attesa = Math.min(60000, 5000 * 2 ** tentativo);
      onWait?.(`Database occupato, riprovo tra ${Math.round(attesa / 1000)} secondi…`);
      await pausa(attesa);
    }
  }
}

export function DevBackupExportModule() {
  const [busy, setBusy] = useState(false);
  const [stato, setStato] = useState("");
  const [esiti, setEsiti] = useState<Esito[]>([]);

  const esporta = async () => {
    setBusy(true); setEsiti([]); setStato("Avvio: lettura elenco tabelle…");
    toast.info("Backup avviato: lascia aperta questa pagina fino a «Completato»");
    try {
      const { tables } = await call({ action: "list" }, (s) => setStato(`Elenco tabelle: ${s}`));
      const files: Record<string, Uint8Array> = {};
      const dati: Record<string, any[]> = {};
      const out: Esito[] = [];
      let righeTot = 0;
      for (let i = 0; i < tables.length; i++) {
        const t = tables[i] as string;
        setStato(`Tabella ${i + 1} di ${tables.length}: ${t} · righe lette finora ${righeTot.toLocaleString("it-IT")}`);
        try {
          // Blocchi grandi per velocità; se il server non regge, il blocco si riduce da solo.
          const rows: any[] = []; let from = 0; let size = 1000;
          for (;;) {
            let r: any;
            try {
              r = await call({ action: "table", table: t, from, size }, (s) => setStato(`${t}: ${s}`));
            } catch (e) {
              if (size > 25) { size = Math.max(25, Math.floor(size / 4)); continue; }
              throw e;
            }
            rows.push(...r.rows);
            righeTot += r.rows.length;
            setStato(`Tabella ${i + 1} di ${tables.length}: ${t} · ${rows.length.toLocaleString("it-IT")} righe · totale ${righeTot.toLocaleString("it-IT")}`);
            if (r.rows.length < size) break;
            from += r.rows.length;
          }
          dati[t] = rows;
          files[`${areaDi(t)}/${t}/${t}.json`] = strToU8(JSON.stringify(rows, null, 2));
          files[`${areaDi(t)}/${t}/${t}.csv`] = strToU8(toCsv(rows));
          out.push({ tabella: t, righe: rows.length });
        } catch (e) {
          out.push({ tabella: t, righe: 0, errore: (e as Error).message });
        }
        setEsiti([...out]);
      }

      const items = new Map((dati.dragon_items || []).map((i: any) => [i.id, i]));
      const outs = dati.dragon_transform_batch_outputs || [];
      const cern = (dati.dragon_transform_batches || []).map((b: any) => {
        const src: any = items.get(b.source_item_id) || {};
        const comp = outs.filter((o: any) => o.batch_id === b.id);
        return {
          data: b.execution_date, stato: b.status,
          cer_ingresso: src.codice_cer || "", descrizione_ingresso: src.descrizione || "",
          kg_ingresso: b.input_quantity,
          kg_uscita: comp.reduce((t: number, o: any) => t + Number(o.output_quantity || 0), 0),
          componenti: comp.map((o: any) => { const it: any = items.get(o.output_item_id) || {}; return `${it.codice_cer || "?"} ${it.descrizione || ""}: ${o.output_quantity} kg`; }).join(" | "),
          note: b.notes || "", id: b.id,
        };
      }).sort((a: any, b: any) => String(a.data).localeCompare(String(b.data)));
      files["02_Cernite/CERNITE_COMPLETE.csv"] = strToU8(toCsv(cern));
      const now = new Date();
      const ordinati = [...out].sort((a, b) => (areaDi(a.tabella) + a.tabella).localeCompare(areaDi(b.tabella) + b.tabella));
      const indice = [
        `Esportazione integrale Multydev — ${now.toLocaleString("it-IT")}`,
        `Tabelle: ${out.length} · Righe totali: ${out.reduce((s, e) => s + e.righe, 0)}`,
        "",
        "Area;Cartella tabella;Righe;File;Esito",
        ...ordinati.map((e) => `${areaDi(e.tabella)};${areaDi(e.tabella)}/${e.tabella};${e.righe};${e.tabella}.json, ${e.tabella}.csv;${e.errore ? "ERRORE: " + e.errore : "OK"}`),
      ].join("\r\n");
      files["00_INDICE.csv"] = strToU8("\uFEFF" + indice);
      // Un piccolo indice dentro ogni area
      const perArea = new Map<string, Esito[]>();
      ordinati.forEach((e) => { const a = areaDi(e.tabella); perArea.set(a, [...(perArea.get(a) || []), e]); });
      perArea.forEach((lista, a) => {
        files[`${a}/_CONTENUTO.csv`] = strToU8("\uFEFF" + ["Cartella;Righe;Esito", ...lista.map((e) => `${e.tabella};${e.righe};${e.errore ? "ERRORE: " + e.errore : "OK"}`)].join("\r\n"));
      });
      files["00_indice.json"] = strToU8(JSON.stringify({ generato: now.toISOString(), tabelle: ordinati.map((e) => ({ area: areaDi(e.tabella), ...e })) }, null, 2));
      const zip = zipSync(files, { level: 6 });
      const blob = new Blob([zip], { type: "application/zip" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `Backup_Multydev_${now.toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
      const err = out.filter((e) => e.errore).length;
      err ? toast.warning(`Archivio scaricato, ma ${err} tabelle non leggibili (vedi INDICE)`) : toast.success("Archivio completo scaricato");
      setStato("Completato");
    } catch (e) {
      toast.error((e as Error).message); setStato("");
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/30 bg-card/60 p-4 flex flex-wrap items-center gap-3">
        <Archive className="h-6 w-6 text-primary" />
        <div className="flex-1 min-w-[220px]">
          <h2 className="text-lg font-semibold">Esportazione integrale dei dati</h2>
          <p className="text-xs text-muted-foreground">Un archivio ZIP con una cartella per ogni tabella (file JSON e CSV) e un indice ordinato. Sola lettura: nessun dato viene modificato.</p>
        </div>
        <button onClick={esporta} disabled={busy}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm disabled:opacity-40">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Scarica archivio completo
        </button>
      </div>
      {stato && <p className="text-sm text-muted-foreground">{stato}</p>}
      {esiti.length > 0 && (
        <div className="rounded-2xl border border-border/30 bg-card/60 max-h-[420px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-background/80"><tr className="text-xs text-muted-foreground uppercase"><th className="text-left p-2">Tabella</th><th className="text-right p-2">Righe</th><th className="text-left p-2">Esito</th></tr></thead>
            <tbody>{esiti.map((e) => (
              <tr key={e.tabella} className="border-t border-border/10">
                <td className="p-2 font-mono">{e.tabella}</td>
                <td className="p-2 text-right">{e.righe.toLocaleString("it-IT")}</td>
                <td className={`p-2 ${e.errore ? "text-destructive" : "text-muted-foreground"}`}>{e.errore || "OK"}</td>
              </tr>))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
