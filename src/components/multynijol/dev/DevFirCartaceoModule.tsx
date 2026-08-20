import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Loader2, Plus, RefreshCw, Send, Truck } from "lucide-react";
import { ContoTerziManualDialog } from "./ContoTerziManualDialog";
import {
  mapMovimentiToRentri,
  inviaRegistroRentri,
  type MovimentoImpiantoRow,
} from "@/lib/rentriRegistroSync";
import { registriDisponibili } from "@/lib/rentriVpsApi";

const MULTY_TENANT_ID = "77ec9a3d-602e-438f-97bf-1c69abd8f691";
const CLIENTE = "multy" as const;
const ORIGINI_CARTACEE = ["conto_terzi_cartaceo", "fir_cartaceo"];

const fmtDate = (v: string | null) => {
  if (!v) return "—";
  const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(v);
};

export function DevFirCartaceoModule() {
  const registri = registriDisponibili(CLIENTE);
  const [registroId, setRegistroId] = useState(registri[0]?.id ?? "");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [rows, setRows] = useState<MovimentoImpiantoRow[]>([]);
  const [inviatiIds, setInviatiIds] = useState<Set<string>>(new Set());
  const [selezione, setSelezione] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [inviando, setInviando] = useState(false);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("movimenti_impianto")
        .select(
          "id, cer, descrizione_rifiuto, quantita_kg, data_movimento, tipo_movimento, numero_fir, produttore_denominazione, destinatario_denominazione, origine",
        )
        .eq("tenant_id", MULTY_TENANT_ID)
        .in("origine", ORIGINI_CARTACEE)
        .order("data_movimento", { ascending: false })
        .limit(300);
      if (error) throw error;
      setRows((data ?? []) as unknown as MovimentoImpiantoRow[]);

      const { data: invii } = await supabase
        .from("rentri_invii_registri")
        .select("movimenti")
        .order("created_at", { ascending: false })
        .limit(200);
      const sent = new Set<string>();
      (invii ?? []).forEach((inv: any) => {
        (Array.isArray(inv.movimenti) ? inv.movimenti : []).forEach((m: any) => {
          if (m?.riferimento_interno) sent.add(String(m.riferimento_interno));
        });
      });
      setInviatiIds(sent);
    } catch (e: any) {
      toast.error("Errore caricamento formulari cartacei: " + (e?.message ?? "sconosciuto"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.numero_fir, r.cer, r.descrizione_rifiuto, r.produttore_denominazione, r.destinatario_denominazione]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [rows, search]);

  const toggle = (id: string) =>
    setSelezione((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const invia = async (target: MovimentoImpiantoRow[]) => {
    if (!registroId) return toast.error("Seleziona un registro RENTRI");
    const payload = mapMovimentiToRentri(target, CLIENTE);
    if (payload.length === 0) return toast.error("Nessun movimento valido da inviare");
    setInviando(true);
    try {
      const { response } = await inviaRegistroRentri({
        cliente: CLIENTE,
        registroId,
        tenantId: MULTY_TENANT_ID,
        movimenti: payload,
      });
      if (response.success) {
        toast.success(`Registro inviato al RENTRI: ${payload.length} movimenti`);
        setSelezione(new Set());
      } else {
        toast.error(response.userMessage ?? response.error ?? "Invio registro fallito");
      }
      await load();
    } catch (e: any) {
      toast.error("Errore invio: " + (e?.message ?? "sconosciuto"));
    } finally {
      setInviando(false);
    }
  };

  const daInviare = filtered.filter((r) => !inviatiIds.has(r.id));

  return (
    <div className="space-y-4">
      <Card className="bg-card/60 border-amber-500/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-amber-300 text-base">
            <Truck className="h-4 w-4" />
            Formulari cartacei arrivati in impianto
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Inserisci i dati del FIR cartaceo consegnato con il carico: aggiorna registro, movimenti e giacenze, poi
            invialo al RENTRI come registrazione di registro.
          </p>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-2">
          <Button onClick={() => setDialogOpen(true)} className="gap-2 bg-amber-500/20 text-amber-200 hover:bg-amber-500/30 border border-amber-500/40">
            <Plus className="h-4 w-4" /> Nuovo FIR cartaceo
          </Button>
          <div className="min-w-[240px]">
            <p className="text-[11px] uppercase text-muted-foreground mb-1">Registro RENTRI</p>
            <Select value={registroId} onValueChange={setRegistroId}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Registro" /></SelectTrigger>
              <SelectContent>
                {registri.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Input
            placeholder="Cerca FIR, CER, produttore…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-64"
          />
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading} className="gap-1">
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />} Aggiorna
          </Button>
          <Button
            size="sm"
            disabled={inviando || selezione.size === 0}
            onClick={() => void invia(filtered.filter((r) => selezione.has(r.id)))}
            className="gap-1 bg-violet-500/20 text-violet-200 border border-violet-500/40 hover:bg-violet-500/30"
          >
            {inviando ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
            Invia selezionati ({selezione.size})
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={inviando || daInviare.length === 0}
            onClick={() => void invia(daInviare)}
            className="gap-1 border-violet-500/40 text-violet-300 hover:bg-violet-500/10"
          >
            <Send className="h-3 w-3" /> Invia tutti i non inviati ({daInviare.length})
          </Button>
        </CardContent>
      </Card>

      <div className="bg-card/60 border border-border/30 rounded-xl overflow-hidden">
        <div className="overflow-auto max-h-[60vh]">
          <table className="w-full min-w-max text-sm">
            <thead className="sticky top-0 z-10 bg-card border-b border-border/30">
              <tr className="text-xs text-muted-foreground">
                <th className="px-3 py-2 w-8"></th>
                <th className="text-left px-3 py-2 font-medium">Data</th>
                <th className="text-left px-3 py-2 font-medium">N° FIR</th>
                <th className="text-left px-3 py-2 font-medium">CER</th>
                <th className="text-left px-3 py-2 font-medium">Descrizione</th>
                <th className="text-right px-3 py-2 font-medium">Kg</th>
                <th className="text-left px-3 py-2 font-medium">Produttore</th>
                <th className="text-left px-3 py-2 font-medium">Destinatario</th>
                <th className="text-center px-3 py-2 font-medium">RENTRI</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-muted-foreground">
                    <FileText className="h-6 w-6 mx-auto mb-2 opacity-40" />
                    Nessun formulario cartaceo registrato
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const inviato = inviatiIds.has(r.id);
                  return (
                    <tr key={r.id} className="border-b border-border/10 hover:bg-amber-500/5">
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selezione.has(r.id)}
                          onChange={() => toggle(r.id)}
                          disabled={inviato}
                          className="accent-violet-500"
                        />
                      </td>
                      <td className="px-3 py-2 text-xs">{fmtDate(r.data_movimento)}</td>
                      <td className="px-3 py-2 font-mono text-xs text-amber-300">{r.numero_fir || "—"}</td>
                      <td className="px-3 py-2 font-mono text-xs">{r.cer || "—"}</td>
                      <td className="px-3 py-2 text-xs max-w-[240px] truncate" title={r.descrizione_rifiuto || ""}>
                        {r.descrizione_rifiuto || "—"}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs">
                        {r.quantita_kg != null ? Number(r.quantita_kg).toLocaleString("it-IT") : "—"}
                      </td>
                      <td className="px-3 py-2 text-xs max-w-[200px] truncate">{r.produttore_denominazione || "—"}</td>
                      <td className="px-3 py-2 text-xs max-w-[200px] truncate">{r.destinatario_denominazione || "—"}</td>
                      <td className="px-3 py-2 text-center">
                        {inviato ? (
                          <Badge variant="outline" className="border-emerald-500/40 text-emerald-300">Inviato</Badge>
                        ) : (
                          <Badge variant="outline" className="border-amber-500/40 text-amber-300">Da inviare</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ContoTerziManualDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={() => void load()}
      />
    </div>
  );
}
