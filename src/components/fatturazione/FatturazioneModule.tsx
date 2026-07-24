import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import {
  Plus, Search, Eye, Trash2, FileCode, Send, Lock, Clock, Loader2,
  AlertCircle, FileText, Package,
} from "lucide-react";
import { toast } from "sonner";
import { NuovaFatturaDialog } from "./NuovaFatturaDialog";
import { FatturaViewerDialog } from "./FatturaViewerDialog";
import { NoleggiTab } from "./NoleggiTab";

interface Props { tenantId?: string; }

type Stato = "cortesia" | "inviata" | "annullata";

const STATO_COLORS: Record<Stato, string> = {
  cortesia: "bg-amber-500/15 border-amber-500/40 text-amber-300",
  inviata: "bg-blue-600/20 border-blue-500/60 text-blue-200",
  annullata: "bg-red-500/15 border-red-500/40 text-red-300",
};

const STATO_ROW: Record<Stato, string> = {
  cortesia: "bg-amber-500/[0.06] hover:bg-amber-500/[0.12]",
  inviata: "bg-blue-600/[0.10] hover:bg-blue-600/[0.18]",
  annullata: "bg-red-500/[0.06] hover:bg-red-500/[0.12]",
};

const STATO_LABEL: Record<Stato, string> = {
  cortesia: "Cortesia",
  inviata: "Inviata SdI",
  annullata: "Annullata",
};

export function FatturazioneModule({ tenantId }: Props) {
  const [tab, setTab] = useState<"fatture" | "noleggi">("fatture");
  const [search, setSearch] = useState("");
  const [filterStato, setFilterStato] = useState<"tutti" | Stato>("tutti");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data: fatture = [], isLoading } = useQuery({
    queryKey: ["fatture", tenantId],
    queryFn: async () => {
      let q = supabase.from("fatture" as any).select("*").order("anno", { ascending: false }).order("numero", { ascending: false });
      if (tenantId) q = q.eq("tenant_id", tenantId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("fatture" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["fatture"] }); toast.success("Fattura eliminata"); },
    onError: (e: any) => toast.error(e.message || "Impossibile eliminare"),
  });

  const sendXmlMut = useMutation({
    mutationFn: async (f: any) => {
      const created = new Date(f.created_at).getTime();
      if (Date.now() - created < 24 * 3600 * 1000) {
        throw new Error("Attendere 24 ore dalla generazione prima dell'invio al Cassetto Fiscale");
      }
      const { buildFatturaPAXml, creaPrimaNotaDaFattura } = await import("@/lib/fatturaPA");

      const { data: righe } = await supabase.from("fatture_righe" as any).select("*").eq("fattura_id", f.id).order("ordine");
      const rows = (righe || []) as any[];

      const xml = buildFatturaPAXml(f, rows.map(r => ({
        descrizione: r.descrizione, quantita: Number(r.quantita || 1),
        unita_misura: r.unita_misura || "n", prezzo_unitario: Number(r.prezzo_unitario || r.imponibile),
        imponibile: Number(r.imponibile), aliquota_iva: Number(r.aliquota_iva || 22),
        reverse_charge: !!r.reverse_charge,
      })));

      const blob = new Blob([xml], { type: "application/xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `IT${f.cliente_partita_iva || "00000000000"}_${String(f.numero).padStart(5, "0")}.xml`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);

      const tipo = (f.note || "").toLowerCase().includes("noleggio") ? "noleggio" : "servizi";
      try {
        await creaPrimaNotaDaFattura(f, tipo as any);
      } catch (e: any) {
        toast.warning(`XML generato ma Prima Nota non registrata: ${e.message}`);
      }

      const { error } = await supabase.from("fatture" as any).update({
        stato: "inviata", locked: true, inviata_at: new Date().toISOString(), xml_generato_at: new Date().toISOString(),
      }).eq("id", f.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["fatture"] }); toast.success("XML FatturaPA generato, Prima Nota registrata, fattura bloccata"); },
    onError: (e: any) => toast.error(e.message || "Errore invio"),
  });

  const filtered = useMemo(() => fatture.filter(f => {
    if (filterStato !== "tutti" && f.stato !== filterStato) return false;
    if (filterFrom && f.data_emissione < filterFrom) return false;
    if (filterTo && f.data_emissione > filterTo) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!(String(f.numero_completo).includes(s) || f.cliente_ragione_sociale?.toLowerCase().includes(s))) return false;
    }
    return true;
  }), [fatture, filterStato, filterFrom, filterTo, search]);

  const eur = (v: number) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(v || 0);

  return (
    <div className="space-y-4">
      {/* Tabs Fatture / Noleggi */}
      <div className="flex gap-2">
        <button onClick={() => setTab("fatture")} className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 border ${tab === "fatture" ? "bg-primary/20 border-primary/40 text-primary" : "bg-card/40 border-border/30 text-muted-foreground"}`}>
          <FileText className="h-4 w-4" /> Fatture
        </button>
        <button onClick={() => setTab("noleggi")} className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 border ${tab === "noleggi" ? "bg-primary/20 border-primary/40 text-primary" : "bg-card/40 border-border/30 text-muted-foreground"}`}>
          <Package className="h-4 w-4" /> Noleggi (mese scorso)
        </button>
      </div>

      {tab === "noleggi" ? (
        <NoleggiTab tenantId={tenantId} onCreated={() => qc.invalidateQueries({ queryKey: ["fatture"] })} />
      ) : (
        <>
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3 p-4 rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Numero o cliente..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-background/60 border border-border/30 text-sm" />
            </div>
            <select value={filterStato} onChange={e => setFilterStato(e.target.value as any)}
              className="px-3 py-2 rounded-xl bg-background/60 border border-border/30 text-sm">
              <option value="tutti">Tutti gli stati</option>
              <option value="cortesia">🟡 Cortesia</option>
              <option value="inviata">🔵 Inviate SdI</option>
              <option value="annullata">Annullate</option>
            </select>
            <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)}
              className="px-3 py-2 rounded-xl bg-background/60 border border-border/30 text-sm" />
            <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)}
              className="px-3 py-2 rounded-xl bg-background/60 border border-border/30 text-sm" />
            <button onClick={() => setShowNew(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
              <Plus className="h-4 w-4" /> Nuova Fattura
            </button>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryCard label="Totale Fatture" value={String(fatture.length)} tone="text-foreground" />
            <SummaryCard label="🟡 Cortesia" value={String(fatture.filter(f => f.stato === "cortesia").length)} tone="text-amber-300" />
            <SummaryCard label="🔵 Inviate SdI" value={String(fatture.filter(f => f.stato === "inviata").length)} tone="text-blue-300" />
            <SummaryCard label="Totale €" value={eur(fatture.reduce((s, f) => s + Number(f.totale || 0), 0))} tone="text-primary" />
          </div>

          {/* Lista */}
          <div className="rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Caricamento...
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">Nessuna fattura</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/30 text-left">
                      {["Numero", "Data", "Cliente", "P.IVA", "Imponibile", "IVA", "Totale", "Stato", "Azioni"].map(h => (
                        <th key={h} className="px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(f => {
                      const stato = (f.stato || "cortesia") as Stato;
                      const canSendXml = stato === "cortesia" && (Date.now() - new Date(f.created_at).getTime()) >= 24 * 3600 * 1000;
                      return (
                        <tr key={f.id} className={`border-b border-border/10 transition-colors ${STATO_ROW[stato]}`}>
                          <td className="px-4 py-3 font-mono font-semibold text-foreground">{f.numero_completo}</td>
                          <td className="px-4 py-3 text-muted-foreground">{f.data_emissione}</td>
                          <td className="px-4 py-3 text-foreground">{f.cliente_ragione_sociale}</td>
                          <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{f.cliente_partita_iva || "—"}</td>
                          <td className="px-4 py-3 font-mono text-muted-foreground">{eur(Number(f.imponibile))}</td>
                          <td className="px-4 py-3 font-mono text-muted-foreground">{eur(Number(f.iva))}</td>
                          <td className="px-4 py-3 font-mono font-semibold">{eur(Number(f.totale))}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-medium ${STATO_COLORS[stato]}`}>
                              {stato === "inviata" ? <Lock className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                              {STATO_LABEL[stato]}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <button onClick={() => setViewId(f.id)} className="p-1.5 rounded-lg hover:bg-muted/20 text-muted-foreground hover:text-foreground" title="Visualizza / PDF">
                                <Eye className="h-3.5 w-3.5" />
                              </button>
                              {stato === "cortesia" && (
                                <>
                                  <button
                                    onClick={() => canSendXml
                                      ? (confirm(`Generare XML e bloccare fattura ${f.numero_completo}?`) && sendXmlMut.mutate(f))
                                      : toast.warning("Attendere 24h dalla generazione")}
                                    className={`p-1.5 rounded-lg text-xs flex items-center gap-1 ${canSendXml ? "bg-blue-500/20 text-blue-300 hover:bg-blue-500/30" : "bg-muted/20 text-muted-foreground cursor-not-allowed"}`}
                                    title="Invia a Cassetto Fiscale (XML)"
                                  >
                                    <FileCode className="h-3.5 w-3.5" /> XML
                                  </button>
                                  <button onClick={() => confirm(`Eliminare fattura ${f.numero_completo}?`) && delMut.mutate(f.id)}
                                    className="p-1.5 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive" title="Elimina">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              )}
                              {stato === "inviata" && (
                                <span className="text-xs text-blue-300 flex items-center gap-1"><Send className="h-3 w-3" />Inviata</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Nota informativa */}
          <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs text-amber-200/80">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="text-amber-300">Workflow Cortesia → SdI:</strong> ogni fattura resta in stato "Cortesia" (modificabile) per almeno 24 ore.
              Al termine è possibile generare l'XML ufficiale, che blocca la fattura in modo definitivo.
              Le fatture <span className="text-blue-300 font-semibold">BLU</span> sono inviate e non modificabili;
              le <span className="text-amber-300 font-semibold">GIALLE</span> sono ancora bozze di cortesia.
            </div>
          </div>
        </>
      )}

      {showNew && (
        <NuovaFatturaDialog tenantId={tenantId} onClose={() => setShowNew(false)}
          onCreated={() => { setShowNew(false); qc.invalidateQueries({ queryKey: ["fatture"] }); }} />
      )}
      {viewId && (
        <FatturaViewerDialog fatturaId={viewId} onClose={() => setViewId(null)} />
      )}
    </div>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="p-3 rounded-xl bg-card/60 border border-border/30 backdrop-blur-xl">
      <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-lg font-semibold ${tone}`}>{value}</p>
    </div>
  );
}

function buildFatturaXml(f: any): string {
  const esc = (s: any) => String(s ?? "").replace(/[<>&"']/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[c]!));
  return `<?xml version="1.0" encoding="UTF-8"?>
<FatturaElettronica versione="FPR12">
  <FatturaElettronicaHeader>
    <DatiTrasmissione>
      <ProgressivoInvio>${esc(f.numero_completo)}</ProgressivoInvio>
      <FormatoTrasmissione>FPR12</FormatoTrasmissione>
      <CodiceDestinatario>${esc(f.cliente_codice_destinatario || "0000000")}</CodiceDestinatario>
    </DatiTrasmissione>
    <CessionarioCommittente>
      <DatiAnagrafici>
        <IdFiscaleIVA><IdPaese>IT</IdPaese><IdCodice>${esc(f.cliente_partita_iva || "")}</IdCodice></IdFiscaleIVA>
        <Anagrafica><Denominazione>${esc(f.cliente_ragione_sociale)}</Denominazione></Anagrafica>
      </DatiAnagrafici>
    </CessionarioCommittente>
  </FatturaElettronicaHeader>
  <FatturaElettronicaBody>
    <DatiGenerali>
      <DatiGeneraliDocumento>
        <TipoDocumento>TD01</TipoDocumento>
        <Divisa>EUR</Divisa>
        <Data>${esc(f.data_emissione)}</Data>
        <Numero>${esc(f.numero_completo)}</Numero>
        <ImportoTotaleDocumento>${Number(f.totale).toFixed(2)}</ImportoTotaleDocumento>
      </DatiGeneraliDocumento>
    </DatiGenerali>
  </FatturaElettronicaBody>
</FatturaElettronica>`;
}
