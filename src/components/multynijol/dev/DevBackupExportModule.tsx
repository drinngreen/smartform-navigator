import { useState } from "react";
import { zipSync, strToU8 } from "fflate";
import { supabase } from "@/lib/supabaseClient";
import { Archive, Loader2, Download } from "lucide-react";
import { toast } from "sonner";

type Esito = { tabella: string; righe: number; errore?: string };

const toCsv = (rows: Record<string, unknown>[]) => {
  const cols = Array.from(rows.reduce((s, r) => { Object.keys(r).forEach((k) => s.add(k)); return s; }, new Set<string>()));
  const esc = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "\uFEFF" + [cols.join(";"), ...rows.map((r) => cols.map((c) => esc(r[c])).join(";"))].join("\r\n");
};

async function call(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("db-export-all", { body });
  if (error) throw new Error((data as any)?.error || error.message);
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as any;
}

export function DevBackupExportModule() {
  const [busy, setBusy] = useState(false);
  const [stato, setStato] = useState("");
  const [esiti, setEsiti] = useState<Esito[]>([]);

  const esporta = async () => {
    setBusy(true); setEsiti([]);
    try {
      const { tables } = await call({ action: "list" });
      const files: Record<string, Uint8Array> = {};
      const out: Esito[] = [];
      for (let i = 0; i < tables.length; i++) {
        const t = tables[i] as string;
        setStato(`Tabella ${i + 1} di ${tables.length}: ${t}`);
        try {
          const rows: any[] = []; let from = 0;
          for (;;) {
            const r = await call({ action: "table", table: t, from });
            rows.push(...r.rows);
            if (r.done) break;
            from += 1000;
          }
          files[`tabelle/${t}/${t}.json`] = strToU8(JSON.stringify(rows, null, 2));
          files[`tabelle/${t}/${t}.csv`] = strToU8(toCsv(rows));
          out.push({ tabella: t, righe: rows.length });
        } catch (e) {
          out.push({ tabella: t, righe: 0, errore: (e as Error).message });
        }
        setEsiti([...out]);
      }
      const now = new Date();
      const indice = [
        `Esportazione integrale Multydev — ${now.toLocaleString("it-IT")}`,
        `Tabelle: ${out.length} · Righe totali: ${out.reduce((s, e) => s + e.righe, 0)}`,
        "",
        "Cartella;Righe;File;Esito",
        ...out.map((e) => `tabelle/${e.tabella};${e.righe};${e.tabella}.json, ${e.tabella}.csv;${e.errore ? "ERRORE: " + e.errore : "OK"}`),
      ].join("\r\n");
      files["INDICE.csv"] = strToU8("\uFEFF" + indice);
      files["indice.json"] = strToU8(JSON.stringify({ generato: now.toISOString(), tabelle: out }, null, 2));
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
