import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { FileSignature, Repeat, Search, Ban, RotateCcw, Play } from "lucide-react";

interface ContrattiTabProps {
  tenantId?: string;
}

const MESI = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];

const currency = (v: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(v || 0);

export function ContrattiTab({ tenantId }: ContrattiTabProps) {
  const queryClient = useQueryClient();
  const oggi = new Date();
  const [search, setSearch] = useState("");
  const [anno, setAnno] = useState(oggi.getFullYear());
  const [mese, setMese] = useState(oggi.getMonth() + 1);
  const [espanso, setEspanso] = useState<string | null>(null);

  const { data: contratti = [], isLoading } = useQuery({
    queryKey: ["contratti-clienti", tenantId],
    queryFn: async () => {
      let q = supabase
        .from("contratti_clienti" as any)
        .select("*, righe:contratti_clienti_righe(*), generate:contratti_fatture_generate(periodo, importo_totale)")
        .order("numero");
      if (tenantId) q = (q as any).eq("tenant_id", tenantId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const periodo = `${anno}-${String(mese).padStart(2, "0")}-01`;

  const genera = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("Azienda non selezionata");
      const { data, error } = await supabase.rpc("genera_fatture_contratti" as any, {
        p_tenant_id: tenantId,
        p_periodo: periodo,
      });
      if (error) throw error;
      return data as any;
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["contratti-clienti"] });
      queryClient.invalidateQueries({ queryKey: ["erp-fatture-vendita"] });
      const create = res?.fatture_create ?? 0;
      const gia = res?.gia_presenti ?? 0;
      toast.success(
        create > 0
          ? `${create} fatture create per ${MESI[mese - 1]} ${anno}${gia ? ` (${gia} già presenti)` : ""}`
          : `Nessuna nuova fattura: ${gia} contratti già fatturati per ${MESI[mese - 1]} ${anno}`
      );
    },
    onError: (e: any) => toast.error(e.message || "Errore nella generazione"),
  });

  const cambiaStato = useMutation({
    mutationFn: async ({ id, recesso }: { id: string; recesso: boolean }) => {
      const { error } = await supabase
        .from("contratti_clienti" as any)
        .update(
          recesso
            ? { stato: "cessato", data_recesso: new Date().toISOString().slice(0, 10) }
            : { stato: "attivo", data_recesso: null }
        )
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contratti-clienti"] });
      toast.success("Contratto aggiornato");
    },
    onError: (e: any) => toast.error(e.message || "Errore aggiornamento"),
  });

  const filtrati = contratti.filter((c: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      c.numero?.toLowerCase().includes(s) ||
      c.cliente_ragione_sociale?.toLowerCase().includes(s)
    );
  });

  const canoneMensile = (c: any) =>
    (c.righe || [])
      .filter((r: any) => r.ricorrente && r.attiva)
      .reduce((s: number, r: any) => s + Number(r.quantita || 0) * Number(r.prezzo_unitario || 0), 0);

  const attivi = contratti.filter((c: any) => c.stato === "attivo");
  const totaleCanoni = attivi.reduce((s: number, c: any) => s + canoneMensile(c), 0);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca contratto o cliente..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-background/60 border border-border/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <select
          value={mese}
          onChange={(e) => setMese(Number(e.target.value))}
          className="px-3 py-2 rounded-xl bg-background/60 border border-border/30 text-sm text-foreground"
        >
          {MESI.map((m, i) => (
            <option key={m} value={i + 1}>{m}</option>
          ))}
        </select>
        <input
          type="number"
          value={anno}
          onChange={(e) => setAnno(Number(e.target.value))}
          className="w-24 px-3 py-2 rounded-xl bg-background/60 border border-border/30 text-sm text-foreground"
        />
        <button
          onClick={() => genera.mutate()}
          disabled={genera.isPending}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
        >
          <Play className="h-4 w-4" />
          {genera.isPending ? "Generazione..." : "Genera fatture del mese"}
        </button>
      </div>

      {/* Riepilogo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Contratti", value: contratti.length },
          { label: "Attivi", value: attivi.length },
          { label: "Cessati", value: contratti.length - attivi.length },
          { label: "Canoni mensili", value: currency(totaleCanoni) },
        ].map((c) => (
          <div key={c.label} className="p-3 rounded-xl bg-card/60 border border-border/30 backdrop-blur-xl">
            <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">{c.label}</p>
            <p className="text-lg font-semibold text-foreground">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Elenco */}
      <div className="rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Caricamento...</div>
        ) : filtrati.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">Nessun contratto</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30 text-left">
                  {["Contratto", "Cliente", "Validità", "Canone/mese", "Fatture generate", "Stato", "Azioni"].map((h) => (
                    <th key={h} className="px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrati.map((c: any) => {
                  const aperto = espanso === c.id;
                  return (
                    <>
                      <tr
                        key={c.id}
                        className="border-b border-border/10 hover:bg-muted/10 transition-colors cursor-pointer"
                        onClick={() => setEspanso(aperto ? null : c.id)}
                      >
                        <td className="px-4 py-3 font-mono font-medium text-foreground">{c.numero}</td>
                        <td className="px-4 py-3 text-foreground">{c.cliente_ragione_sociale}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {c.data_inizio || "—"} → {c.data_recesso || c.data_fine || "—"}
                        </td>
                        <td className="px-4 py-3 font-mono text-foreground">{currency(canoneMensile(c))}</td>
                        <td className="px-4 py-3 text-muted-foreground">{(c.generate || []).length}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs ${c.stato === "attivo" ? "text-emerald-400" : "text-muted-foreground"}`}>
                            {c.stato === "attivo" ? "Attivo" : `Cessato${c.data_recesso ? ` il ${c.data_recesso}` : ""}`}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              cambiaStato.mutate({ id: c.id, recesso: c.stato === "attivo" });
                            }}
                            className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg hover:bg-muted/20 text-muted-foreground hover:text-foreground transition-colors"
                            title={c.stato === "attivo" ? "Registra recesso: da qui in poi niente più fatture" : "Riattiva il contratto"}
                          >
                            {c.stato === "attivo" ? <><Ban className="h-3.5 w-3.5" /> Recesso</> : <><RotateCcw className="h-3.5 w-3.5" /> Riattiva</>}
                          </button>
                        </td>
                      </tr>
                      {aperto && (
                        <tr key={`${c.id}-righe`} className="border-b border-border/10 bg-background/40">
                          <td colSpan={7} className="px-6 py-3">
                            <div className="space-y-1">
                              {(c.righe || []).map((r: any) => (
                                <div key={r.id} className="flex items-center gap-3 text-xs">
                                  {r.ricorrente ? (
                                    <Repeat className="h-3.5 w-3.5 text-emerald-400" />
                                  ) : (
                                    <FileSignature className="h-3.5 w-3.5 text-muted-foreground" />
                                  )}
                                  <span className="font-mono text-muted-foreground w-24">{r.articolo_cer || "—"}</span>
                                  <span className="flex-1 text-foreground">{r.descrizione}</span>
                                  <span className="font-mono text-muted-foreground">
                                    {Number(r.quantita)} × {currency(Number(r.prezzo_unitario))}
                                  </span>
                                  <span className="text-muted-foreground w-40 text-right">
                                    {r.ricorrente
                                      ? r.periodicita_mesi > 1
                                        ? `canone ogni ${r.periodicita_mesi} mesi`
                                        : "canone mensile"
                                      : r.servizio || "a consumo"}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground px-1">
        Le voci con il simbolo di ripetizione sono i canoni: ogni mese il pulsante qui sopra crea una fattura in bozza
        per ciascun contratto attivo, e si ferma da solo quando registri il recesso. Lo stesso mese non viene mai
        fatturato due volte.
      </p>
    </div>
  );
}
