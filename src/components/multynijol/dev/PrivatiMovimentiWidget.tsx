import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, RefreshCw, FileSpreadsheet, ListOrdered, User } from "lucide-react";
import { exportToExcel } from "@/lib/exportUtils";
import { toast } from "sonner";
import { getCerDescrizioneCompleta } from "@/data/cerDescrizioni";

type Props = { tenantId: string };

const fmtDate = (v: string | null) => {
  if (!v) return "—";
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : v;
};

const INVALIDATE_KEYS = [
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
];

/**
 * Elenco unico di TUTTI i movimenti (conferimenti) dei privati.
 * Permette di selezionare un privato dalla tendina ed eliminare i suoi singoli movimenti
 * (anche in blocco): la cancellazione propaga in cascata su movimenti_impianto / ricevute /
 * pagamenti, le giacenze vengono ricalcolate e i progressivi DBT rinumerati.
 */
export function PrivatiMovimentiWidget({ tenantId }: Props) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [anno, setAnno] = useState<string>(String(new Date().getFullYear()));
  const [privato, setPrivato] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

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

  /** Elenco privati (chiave = CF se presente, altrimenti nome) ricavato dai movimenti. */
  const privatiOptions = useMemo(() => {
    const map = new Map<string, { key: string; label: string; count: number }>();
    for (const m of movimenti ?? []) {
      const key = String(m.cf_pi || m.nome_privato || "—").trim().toUpperCase();
      const label = `${m.nome_privato || "—"}${m.cf_pi ? ` · ${m.cf_pi}` : ""}`;
      const cur = map.get(key);
      if (cur) cur.count += 1;
      else map.set(key, { key, label, count: 1 });
    }
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label, "it"));
  }, [movimenti]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return (movimenti ?? []).filter((m) => {
      if (privato !== "all") {
        const key = String(m.cf_pi || m.nome_privato || "—").trim().toUpperCase();
        if (key !== privato) return false;
      }
      if (!s) return true;
      return [m.nome_privato, m.cf_pi, m.cer, m.targa_automezzo, m.modello_automezzo]
        .filter(Boolean)
        .some((v: string) => String(v).toLowerCase().includes(s));
    });
  }, [movimenti, search, privato]);

  const totKg = filtered.reduce((s, m) => s + Number(m.kg_pesati || 0), 0);
  const selectedRows = filtered.filter((m) => selected.has(m.id));

  const anni = useMemo(() => {
    const y = new Date().getFullYear();
    return [String(y), String(y - 1), String(y - 2), "all"];
  }, []);

  const toggleRow = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) =>
      prev.size === filtered.length && filtered.length > 0 ? new Set() : new Set(filtered.map((m) => m.id)),
    );
  };

  /** Rinumera i progressivi DBT rimasti per anno, in ordine cronologico. */
  const renumberProgressivi = async (anniToucher: number[]) => {
    for (const y of Array.from(new Set(anniToucher)).filter(Boolean)) {
      const { data, error } = await supabase
        .from("privati_conferimenti")
        .select("id, data, created_at, numero_progressivo")
        .eq("tenant_id", tenantId)
        .eq("anno_dbt", y)
        .order("data", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) { console.warn("Rinumerazione:", error.message); continue; }
      let n = 0;
      for (const row of (data ?? []) as any[]) {
        n += 1;
        if (Number(row.numero_progressivo) === n) continue;
        const { error: upErr } = await supabase
          .from("privati_conferimenti")
          .update({ numero_progressivo: n } as any)
          .eq("id", row.id);
        if (upErr) console.warn("Rinumerazione riga:", upErr.message);
      }
    }
  };

  /** Elimina un elenco di movimenti + ricalcolo giacenze + rinumerazione progressivi. */
  const deleteMovimenti = async (rows: any[]) => {
    const ids = rows.map((r) => r.id);
    const { error } = await supabase.from("privati_conferimenti").delete().in("id", ids);
    if (error) throw error;

    // Ricalcolo giacenze per ogni coppia impianto/CER coinvolta
    const pairs = new Map<string, { impianto: string; cer: string }>();
    for (const r of rows) {
      if (r.impianto_id && r.cer) {
        pairs.set(`${r.impianto_id}|${r.cer}`, { impianto: r.impianto_id, cer: String(r.cer).trim() });
      }
    }
    for (const p of pairs.values()) {
      const { error: recalcError } = await supabase.rpc("recalculate_magazzino_giacenza", {
        p_tenant_id: tenantId,
        p_impianto_id: p.impianto,
        p_cer: p.cer,
      } as any);
      if (recalcError) console.warn("Ricalcolo giacenza:", recalcError.message);
    }

    await renumberProgressivi(
      rows.map((r) => Number(r.anno_dbt) || Number(String(r.data).slice(0, 4))).filter(Boolean),
    );

    setSelected(new Set());
    INVALIDATE_KEYS.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
  };

  const handleDelete = async (m: any) => {
    const label = `${m.nome_privato || "privato"} · ${m.cer} · ${Number(m.kg_pesati).toLocaleString("it-IT")} kg · ${fmtDate(m.data)}`;
    if (!window.confirm(`Eliminare definitivamente questo movimento?\n\n${label}\n\nGiacenze e progressivi verranno aggiornati.`)) return;
    setDeletingId(m.id);
    try {
      await deleteMovimenti([m]);
      toast.success("Movimento eliminato: giacenze e progressivi aggiornati");
    } catch (e: any) {
      toast.error("Errore eliminazione: " + (e?.message || e));
    } finally {
      setDeletingId(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRows.length === 0) return;
    const kg = selectedRows.reduce((s, m) => s + Number(m.kg_pesati || 0), 0);
    if (!window.confirm(
      `Eliminare ${selectedRows.length} movimenti selezionati (${kg.toLocaleString("it-IT")} kg)?\n\n` +
      `Ricevute e pagamenti collegati saranno rimossi in cascata.\nGiacenze e progressivi verranno ricalcolati.\n\nOperazione irreversibile.`,
    )) return;
    setBulkBusy(true);
    try {
      await deleteMovimenti(selectedRows);
      toast.success(`✅ ${selectedRows.length} movimenti eliminati: giacenze e progressivi aggiornati`);
    } catch (e: any) {
      toast.error("Errore eliminazione: " + (e?.message || e));
    } finally {
      setBulkBusy(false);
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
          <Select value={privato} onValueChange={(v) => { setPrivato(v); setSelected(new Set()); }}>
            <SelectTrigger className="w-80 h-9">
              <User className="h-4 w-4 mr-1 text-emerald-400" />
              <SelectValue placeholder="Scegli privato..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti i privati</SelectItem>
              {privatiOptions.map((p) => (
                <SelectItem key={p.key} value={p.key}>{p.label} ({p.count})</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Cerca per nome, CF, CER o targa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64 h-9"
          />
          <Select value={anno} onValueChange={(v) => { setAnno(v); setSelected(new Set()); }}>
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
          <Button
            variant="destructive"
            size="sm"
            className="gap-1"
            disabled={selectedRows.length === 0 || bulkBusy}
            onClick={handleBulkDelete}
          >
            <Trash2 className="h-4 w-4" />
            {bulkBusy ? "Eliminazione..." : `Elimina selezionati (${selectedRows.length})`}
          </Button>
        </div>

        <div className="max-h-[520px] overflow-auto rounded-lg border border-border/30">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-background/95 backdrop-blur">
              <tr className="text-left text-xs text-muted-foreground">
                <th className="p-2 w-8">
                  <Checkbox
                    checked={filtered.length > 0 && selected.size === filtered.length}
                    onCheckedChange={toggleAll}
                    aria-label="Seleziona tutti"
                  />
                </th>
                <th className="p-2">Data</th>
                <th className="p-2">DBT</th>
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
                <tr><td colSpan={10} className="p-6 text-center text-muted-foreground">Caricamento...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={10} className="p-6 text-center text-muted-foreground">Nessun movimento trovato</td></tr>
              ) : (
                filtered.map((m) => (
                  <tr key={m.id} className="border-t border-border/20 hover:bg-muted/20">
                    <td className="p-2">
                      <Checkbox
                        checked={selected.has(m.id)}
                        onCheckedChange={() => toggleRow(m.id)}
                        aria-label="Seleziona movimento"
                      />
                    </td>
                    <td className="p-2 whitespace-nowrap">{fmtDate(m.data)}</td>
                    <td className="p-2 font-mono text-xs text-muted-foreground">
                      {m.numero_progressivo != null ? `#${m.numero_progressivo}/${m.anno_dbt ?? String(m.data).slice(0, 4)}` : "—"}
                    </td>
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
