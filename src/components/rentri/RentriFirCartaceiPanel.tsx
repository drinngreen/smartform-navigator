import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, Loader2, RefreshCw } from "lucide-react";

export interface FirCartaceoRow {
  id: string;
  numero_fir: string | null;
  codice_eer: string | null;
  descrizione_rifiuto: string | null;
  quantita: number | null;
  unita_misura: string | null;
  produttore_denominazione: string | null;
  destinatario_denominazione: string | null;
  trasportatore_denominazione: string | null;
  status: string | null;
  data_partenza: string | null;
  created_at: string;
}

const fmtDate = (v: string | null) => {
  if (!v) return "—";
  const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(v);
};

/** Formulari cartacei salvati nel programma (fir_forms con formato "cartaceo"). */
export async function caricaFirCartacei(tenantId: string): Promise<FirCartaceoRow[]> {
  const { data, error } = await supabase
    .from("fir_forms")
    .select(
      "id, numero_fir, codice_eer, descrizione_rifiuto, quantita, unita_misura, produttore_denominazione, destinatario_denominazione, trasportatore_denominazione, status, data_partenza, created_at",
    )
    .eq("tenant_id", tenantId)
    .filter("form_data->>formato_fir", "eq", "cartaceo")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as unknown as FirCartaceoRow[];
}

interface Props {
  tenantId: string;
  compact?: boolean;
}

export function RentriFirCartaceiPanel({ tenantId, compact }: Props) {
  const [rows, setRows] = useState<FirCartaceoRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await caricaFirCartacei(tenantId));
    } catch (e: any) {
      toast.error("Errore caricamento formulari cartacei: " + (e?.message ?? "sconosciuto"));
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase().replace(/\s+/g, "");
    if (!q) return rows;
    return rows.filter((r) =>
      [r.numero_fir, r.codice_eer, r.descrizione_rifiuto, r.produttore_denominazione, r.destinatario_denominazione]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .replace(/\s+/g, "")
        .includes(q),
    );
  }, [rows, search]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div>
          <p className="text-sm font-semibold text-amber-300">Formulari cartacei salvati nel programma</p>
          <p className="text-xs text-muted-foreground">
            Non sono sul RENTRI digitale: restano qui finché non confermi la pesata in Impianto → FIR cartaceo.
          </p>
        </div>
        <Input
          placeholder="Cerca numero, CER, produttore…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 w-64 ml-auto"
        />
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading} className="gap-1">
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />} Aggiorna
        </Button>
      </div>

      <div className="bg-card/60 border border-border/30 rounded-xl overflow-hidden">
        <div className={`overflow-auto ${compact ? "max-h-[40vh]" : "max-h-[65vh]"}`}>
          <table className="w-full min-w-max text-sm">
            <thead className="sticky top-0 z-10 bg-card border-b border-border/30">
              <tr className="text-xs text-muted-foreground">
                <th className="text-left px-3 py-2 font-medium">Data</th>
                <th className="text-left px-3 py-2 font-medium">N° FIR</th>
                <th className="text-left px-3 py-2 font-medium">CER</th>
                <th className="text-left px-3 py-2 font-medium">Descrizione</th>
                <th className="text-right px-3 py-2 font-medium">Quantità</th>
                <th className="text-left px-3 py-2 font-medium">Produttore</th>
                <th className="text-left px-3 py-2 font-medium">Destinatario</th>
                <th className="text-center px-3 py-2 font-medium">Stato</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-muted-foreground">Caricamento…</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-muted-foreground">
                    <FileText className="h-6 w-6 mx-auto mb-2 opacity-40" />
                    Nessun formulario cartaceo trovato
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="border-b border-border/10 hover:bg-amber-500/5">
                    <td className="px-3 py-2 text-xs">{fmtDate(r.data_partenza || r.created_at)}</td>
                    <td className="px-3 py-2 font-mono text-xs text-amber-300">{r.numero_fir || "—"}</td>
                    <td className="px-3 py-2 font-mono text-xs">{r.codice_eer || "—"}</td>
                    <td className="px-3 py-2 text-xs max-w-[240px] truncate" title={r.descrizione_rifiuto || ""}>
                      {r.descrizione_rifiuto || "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs">
                      {r.quantita != null ? `${Number(r.quantita).toLocaleString("it-IT")} ${r.unita_misura || "kg"}` : "—"}
                    </td>
                    <td className="px-3 py-2 text-xs max-w-[200px] truncate">{r.produttore_denominazione || "—"}</td>
                    <td className="px-3 py-2 text-xs max-w-[200px] truncate">{r.destinatario_denominazione || "—"}</td>
                    <td className="px-3 py-2 text-center">
                      <Badge variant="outline" className="border-amber-500/40 text-amber-300">
                        {r.status === "completato" ? "Cartaceo completato" : "Cartaceo bozza"}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
