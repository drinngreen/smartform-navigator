import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

const normFir = (v?: string | null) => String(v ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const normCer = (v?: string | null) => String(v ?? "").toUpperCase().replace(/[^0-9]/g, "");

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

interface MovimentoLink {
  id: string;
  stato_movimento: string | null;
  impianto_id: string | null;
}

interface Props {
  tenantId: string;
  compact?: boolean;
  /** Mostra la colonna con la conferma pesata (default: true). */
  showConferma?: boolean;
  onConfermato?: () => void;
}

export function RentriFirCartaceiPanel({ tenantId, compact, showConferma = true, onConfermato }: Props) {
  const [rows, setRows] = useState<FirCartaceoRow[]>([]);
  const [movimenti, setMovimenti] = useState<Record<string, MovimentoLink>>({});
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [confermaRow, setConfermaRow] = useState<FirCartaceoRow | null>(null);
  const [peso, setPeso] = useState("");
  const [confermando, setConfermando] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const forms = await caricaFirCartacei(tenantId);
      setRows(forms);
      const { data: movs } = await supabase
        .from("movimenti_impianto")
        .select("id, numero_fir, stato_movimento, impianto_id")
        .eq("tenant_id", tenantId)
        .limit(2000);
      const map: Record<string, MovimentoLink> = {};
      (movs ?? []).forEach((m: any) => {
        const k = normFir(m.numero_fir);
        if (!k) return;
        // un movimento effettivo ha sempre la precedenza sul potenziale
        if (!map[k] || m.stato_movimento === "effettivo") {
          map[k] = { id: m.id, stato_movimento: m.stato_movimento, impianto_id: m.impianto_id };
        }
      });
      setMovimenti(map);
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

  const apriConferma = (r: FirCartaceoRow) => {
    setConfermaRow(r);
    setPeso(r.quantita != null ? String(r.quantita) : "");
  };

  /** Cartaceo: le giacenze si muovono SOLO qui, con il peso reale confermato da una persona. */
  const confermaPesata = async () => {
    if (!confermaRow) return;
    const kg = parseFloat(String(peso).replace(",", "."));
    if (!Number.isFinite(kg) || kg <= 0) {
      toast.error("Inserisci il peso reale riscontrato (maggiore di zero)");
      return;
    }
    const cer = normCer(confermaRow.codice_eer);
    if (!cer) {
      toast.error("CER mancante sul formulario: non posso aggiornare le giacenze");
      return;
    }
    setConfermando(true);
    try {
      const key = normFir(confermaRow.numero_fir);
      let mov = movimenti[key];

      if (!mov) {
        const { data: imp } = await supabase
          .from("impianti")
          .select("id")
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();
        const impiantoId = (imp as any)?.id;
        if (!impiantoId) throw new Error("Nessun impianto disponibile per questo tenant");

        const { data: inserted, error: insErr } = await supabase
          .from("movimenti_impianto")
          .insert({
            impianto_id: impiantoId,
            tenant_id: tenantId,
            cer,
            descrizione_rifiuto: confermaRow.descrizione_rifiuto,
            quantita_kg: kg,
            data_movimento: (confermaRow.data_partenza || confermaRow.created_at).slice(0, 10),
            tipo_movimento: "CARICO",
            ruolo_impianto: "DESTINATARIO",
            origine: "fir_cartaceo",
            numero_fir: confermaRow.numero_fir,
            produttore_denominazione: confermaRow.produttore_denominazione,
            trasportatore_denominazione: confermaRow.trasportatore_denominazione,
            destinatario_denominazione: confermaRow.destinatario_denominazione,
            esito_accettazione: "accettato",
            stato_movimento: "potenziale",
            note: `FIR cartaceo ${confermaRow.numero_fir ?? ""}`.trim(),
          } as any)
          .select("id, stato_movimento, impianto_id")
          .single();
        if (insErr) throw insErr;
        mov = inserted as unknown as MovimentoLink;
      }

      if (mov.stato_movimento === "effettivo") {
        toast.info("Questo formulario è già in giacenza");
        setConfermaRow(null);
        return;
      }

      const { error } = await (supabase as any).rpc("conferma_movimento_cartaceo_giacenza", {
        p_movimento_id: mov.id,
        p_quantita_kg: kg,
        p_documento: `FIR_CARTACEO:${confermaRow.numero_fir || confermaRow.id}`,
      });
      if (error) throw error;

      toast.success("Pesata confermata: movimento effettivo e giacenze aggiornate");
      setConfermaRow(null);
      await load();
      onConfermato?.();
    } catch (e: any) {
      toast.error("Conferma non riuscita: " + (e?.message ?? "sconosciuto"));
    } finally {
      setConfermando(false);
    }
  };

  const colSpan = showConferma ? 9 : 8;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div>
          <p className="text-sm font-semibold text-amber-300">Formulari cartacei salvati nel programma</p>
          <p className="text-xs text-muted-foreground">
            Non sono sul RENTRI digitale: le giacenze si muovono solo quando confermi qui la pesata reale.
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
                {showConferma && <th className="text-center px-3 py-2 font-medium">Giacenze</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={colSpan} className="text-center py-10 text-muted-foreground">Caricamento…</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} className="text-center py-12 text-muted-foreground">
                    <FileText className="h-6 w-6 mx-auto mb-2 opacity-40" />
                    Nessun formulario cartaceo trovato
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const mov = movimenti[normFir(r.numero_fir)];
                  const inGiacenza = mov?.stato_movimento === "effettivo";
                  return (
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
                      {showConferma && (
                        <td className="px-3 py-2 text-center">
                          {inGiacenza ? (
                            <Badge variant="outline" className="border-emerald-500/40 text-emerald-300">In giacenza</Badge>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[11px] border-amber-500/50 text-amber-200 hover:bg-amber-500/10"
                              onClick={() => apriConferma(r)}
                            >
                              Conferma pesata e aggiorna giacenze
                            </Button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!confermaRow} onOpenChange={(o) => !o && setConfermaRow(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Conferma pesata formulario cartaceo</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              FIR {confermaRow?.numero_fir || "—"} · CER {confermaRow?.codice_eer || "—"}. Le giacenze si aggiornano
              solo adesso, con il peso realmente riscontrato.
            </p>
            <div>
              <p className="text-[11px] uppercase text-muted-foreground mb-1">Peso reale (kg)</p>
              <Input value={peso} onChange={(e) => setPeso(e.target.value)} inputMode="decimal" placeholder="0" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setConfermaRow(null)} disabled={confermando}>
                Annulla
              </Button>
              <Button size="sm" onClick={() => void confermaPesata()} disabled={confermando} className="gap-1">
                {confermando ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                Conferma e aggiorna giacenze
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
