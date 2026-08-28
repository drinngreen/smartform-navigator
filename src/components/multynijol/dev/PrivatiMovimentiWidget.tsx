import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, RefreshCw, FileSpreadsheet, ListOrdered } from "lucide-react";
import { exportToExcel } from "@/lib/exportUtils";
import { toast } from "sonner";
import { getCerDescrizioneCompleta } from "@/data/cerDescrizioni";

type Props = { tenantId: string };

const fmtDate = (v: string | null) => {
  if (!v) return "—";
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : v;
};

/**
 * Elenco unico di TUTTI i movimenti (conferimenti) dei privati.
 * Permette l'eliminazione del singolo movimento: la cancellazione propaga in cascata
 * su movimenti_impianto / ricevute / pagamenti e il trigger di magazzino ricalcola le giacenze.
 */
export function PrivatiMovimentiWidget({ tenantId }: Props) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [anno, setAnno] = useState<string>(String(new Date().getFullYear()));
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: movimenti, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["privati-movimenti-widget", tenantId, anno],
    queryFn: async () => {
      let q = supabase
        .from("privati_conferimenti")
        .select("id, data, nome_privato, cf_pi, cer, kg_pesati, importo_pagato, metodo_pag, targa_automezzo, modello_automezzo, numero_progressivo, anno_dbt, impianto_id, note")
        .eq("tenant_id", tenantId)
        .order("data", { ascending: false })
        .limit(5000);
      if (anno !== "all") {
        q = q.gte("data", `${anno}-01-01`).lte("data", `${anno}-12-31`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return movimenti ?? [];
    return (movimenti ?? []).filter((m) =>
      [m.nome_privato, m.cf_pi, m.cer, m.targa_automezzo, m.modello_automezzo]
        .filter(Boolean)
        .some((v: string) => String(v).toLowerCase().includes(s)),
    );
  }, [movimenti, search]);

  const totKg = filtered.reduce((s, m) => s + Number(m.kg_pesati || 0), 0);

  const anni = useMemo(() => {
    const y = new Date().getFullYear();
    return [String(y), String(y - 1), String(y - 2), "all"];
  }, []);

  const handleDelete = async (m: any) => {
    const label = `${m.nome_privato || "privato"} · ${m.cer} · ${Number(m.kg_pesati).toLocaleString("it-IT")} kg · ${fmtDate(m.data)}`;
    if (!window.confirm(`Eliminare definitivamente questo movimento?\n\n${label}\n\nLe giacenze verranno ricalcolate automaticamente.`)) return;
    setDeletingId(m.id);
    try {
      const { error } = await supabase.from("privati_conferimenti").delete().eq("id", m.id);
      if (error) throw error;

      // Ricalcolo esplicito della giacenza per il CER/impianto coinvolto
      if (m.impianto_id && m.cer) {
        const { error: recalcError } = await supabase.rpc("recalculate_magazzino_giacenza", {
          p_tenant_id: tenantId,
          p_impianto_id: m.impianto_id,
          p_cer: String(m.cer).trim(),
        } as any);
        if (recalcError) console.warn("Ricalcolo giacenza:", recalcError.message);
      }

      toast.success("Movimento eliminato e giacenze ricalcolate");
      [
        "privati-movimenti-widget",
        "dev-conferimenti-privato",
        "dev-conferimenti-anno",
        "privati-limiti-widget",
        "privati-targhe-widget",
        "dev-ricevute",
        "dev-ricevute-registro",
        "dev-registro-movimenti",
        "dev-movimenti-multy",
        "dev-mag-movimenti",
        "dev-mag-giacenze",
        "dev-giacenze",
      ].forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
    } catch (e: any) {
      toast.error("Errore eliminazione: " + (e?.message || e));
    } finally {
      setDeletingId(null);
    }
  };

  const handleExport = () => {
    exportToExcel(
      filtered.map((m) => ({
        ...m,
        descrizione: getCerDescrizioneCompleta(m.cer),
        data_it: fmtDate(m.data),
      })),
      [
        { header: "Data", key: "data_it", width: 12 },
        { header: "Privato", key: "nome_privato", width: 28 },
        { header: "CF/PI", key: "cf_pi", width: 20 },
        { header: "CER", key: "cer", width: 14 },
        { header: "Descrizione", key: "descrizione", width: 34 },
        { header: "Kg", key: "kg_pesati", width: 10 },
        { header: "Importo €", key: "importo_pagato", width: 12 },
        { header: "Mezzo", key: "modello_automezzo", width: 18 },
        { header: "Targa", key: "targa_automezzo", width: 12 },
      ],
      `movimenti_privati_${anno}`,
    );
  };

  return (
    <Card className="bg-card/60 border-border/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ListOrdered className="h-4 w-4 text-emerald-400" />
          Movimenti Privati — elenco completo
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            {filtered.length} movimenti · {totKg.toLocaleString("it-IT")} kg
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <Input
            placeholder="Cerca per nome, CF, CER o targa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-72 h-9"
          />
          <Select value={anno} onValueChange={setAnno}>
            <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {anni.map((a) => (
                <SelectItem key={a} value={a}>{a === "all" ? "Tutti gli anni" : a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-1">
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> Aggiorna
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-1">
            <FileSpreadsheet className="h-4 w-4" /> Excel
          </Button>
        </div>

        <div className="max-h-[520px] overflow-auto rounded-lg border border-border/30">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-background/95 backdrop-blur">
              <tr className="text-left text-xs text-muted-foreground">
                <th className="p-2">Data</th>
                <th className="p-2">Privato</th>
                <th className="p-2">CER</th>
                <th className="p-2">Descrizione</th>
                <th className="p-2 text-right">Kg</th>
                <th className="p-2 text-right">€</th>
                <th className="p-2">Targa</th>
                <th className="p-2 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">Caricamento...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">Nessun movimento trovato</td></tr>
              ) : (
                filtered.map((m) => (
                  <tr key={m.id} className="border-t border-border/20 hover:bg-muted/20">
                    <td className="p-2 whitespace-nowrap">{fmtDate(m.data)}</td>
                    <td className="p-2">{m.nome_privato || "—"}</td>
                    <td className="p-2 font-mono text-xs">{m.cer}</td>
                    <td className="p-2 text-xs text-muted-foreground">{getCerDescrizioneCompleta(m.cer)}</td>
                    <td className="p-2 text-right font-mono">{Number(m.kg_pesati || 0).toLocaleString("it-IT")}</td>
                    <td className="p-2 text-right font-mono">{Number(m.importo_pagato || 0).toLocaleString("it-IT", { minimumFractionDigits: 2 })}</td>
                    <td className="p-2 font-mono text-xs">{m.targa_automezzo || "—"}</td>
                    <td className="p-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={deletingId === m.id}
                        onClick={() => handleDelete(m)}
                        title="Elimina movimento e ricalcola giacenze"
                      >
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
