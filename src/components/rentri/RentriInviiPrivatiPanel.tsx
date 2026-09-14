import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  caricaInviiPrivati,
  caricaPrivatiDaInviare,
  inviaConferimentiPrivati,
  verificaInvioPrivato,
  type ConferimentoPrivatoRow,
  type InvioPrivatoRow,
} from "@/lib/rentriPrivatiSync";
import type { RentriCliente } from "@/lib/rentriVpsApi";
import { exportToExcel, exportToPdf } from "@/lib/exportUtils";
import { Copy, Download, FileText, Loader2, RefreshCw, Send, Search } from "lucide-react";

const fmtData = (s: string) => {
  if (!s) return "—";
  const [y, m, d] = s.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
};

const statoBadge = (stato: string) => {
  const map: Record<string, string> = {
    CONFERMATO: "border-emerald-500/40 text-emerald-300 bg-emerald-500/10",
    IN_VERIFICA: "border-amber-500/40 text-amber-300 bg-amber-500/10",
    NON_CONFERMATO: "border-orange-500/40 text-orange-300 bg-orange-500/10",
    DA_ANALIZZARE: "border-rose-500/40 text-rose-300 bg-rose-500/10",
    ERRORE: "border-rose-500/40 text-rose-300 bg-rose-500/10",
  };
  return map[stato] ?? "border-border/50 text-muted-foreground";
};

export function RentriInviiPrivatiPanel({
  tenantId,
  cliente,
}: {
  tenantId: string;
  cliente: RentriCliente;
}) {
  const [invii, setInvii] = useState<InvioPrivatoRow[]>([]);
  const [daInviare, setDaInviare] = useState<ConferimentoPrivatoRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviando, setInviando] = useState(false);
  const [verificando, setVerificando] = useState<string | null>(null);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [mese, setMese] = useState("all");
  const [origine, setOrigine] = useState("all");

  const load = async () => {
    setLoading(true);
    try {
      const rows = await caricaInviiPrivati(tenantId);
      setInvii(rows);
      setDaInviare(await caricaPrivatiDaInviare(tenantId, rows));
    } catch (e: unknown) {
      toast.error(`Errore caricamento: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  const mesi = useMemo(() => {
    const s = new Set<string>();
    invii.forEach((i) => s.add(i.data_movimento.slice(0, 7)));
    return Array.from(s).sort().reverse();
  }, [invii]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return invii.filter((i) => {
      if (mese !== "all" && !i.data_movimento.startsWith(mese)) return false;
      if (origine !== "all" && i.origine !== origine) return false;
      if (!t) return true;
      return [i.produttore, i.cer, i.progressivo_rentri, i.id_ricevuta, i.transazione_id, i.mezzo]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(t);
    });
  }, [invii, q, mese, origine]);

  const totali = useMemo(() => {
    const kg = filtered.reduce((a, b) => a + Number(b.kg ?? 0), 0);
    return {
      tot: filtered.length,
      kg,
      confermati: filtered.filter((i) => i.stato === "CONFERMATO").length,
      aperti: filtered.filter((i) => i.stato !== "CONFERMATO").length,
      terminale: filtered.filter((i) => i.origine === "TERMINALE").length,
    };
  }, [filtered]);

  const exportCols = [
    { header: "N.", key: "numero_riga", width: 6 },
    { header: "Data", key: "data_movimento", width: 12, format: (v: string) => fmtData(v) },
    { header: "Data invio", key: "data_invio", width: 12, format: (v: string) => (v ? fmtData(v) : "—") },
    { header: "CER", key: "cer", width: 14 },
    { header: "Kg", key: "kg", width: 10 },
    { header: "Produttore", key: "produttore", width: 40 },
    { header: "Mezzo", key: "mezzo", width: 22 },
    { header: "Progr. RENTRI", key: "progressivo_rentri", width: 14 },
    { header: "ID transazione", key: "transazione_id", width: 38 },
    { header: "ID ricevuta", key: "id_ricevuta", width: 24 },
    { header: "Origine", key: "origine", width: 12 },
    { header: "Stato", key: "stato", width: 16 },
  ];

  const copia = async (v: string) => {
    try {
      await navigator.clipboard.writeText(v);
      toast.success(`Copiato: ${v}`);
    } catch {
      toast.error("Copia non riuscita");
    }
  };

  const toggle = (id: string) =>
    setSel((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const invia = async (rows: ConferimentoPrivatoRow[]) => {
    if (rows.length === 0) {
      toast.error("Nessun conferimento selezionato");
      return;
    }
    setInviando(true);
    try {
      const { response, inseriti } = await inviaConferimentiPrivati({
        cliente,
        tenantId,
        conferimenti: rows,
      });
      if (response.success) toast.success(`Inviati ${inseriti} conferimenti al RENTRI`);
      else toast.error(response.userMessage ?? "Invio non riuscito");
      setSel(new Set());
      await load();
    } catch (e: unknown) {
      toast.error(`Errore invio: ${(e as Error).message}`);
    } finally {
      setInviando(false);
    }
  };

  const verifica = async (riga: InvioPrivatoRow) => {
    setVerificando(riga.id);
    try {
      const res = await verificaInvioPrivato(riga, cliente);
      if (!res) toast.error("Nessuna transazione da verificare");
      else toast.success("Stato aggiornato");
      await load();
    } catch (e: unknown) {
      toast.error(`Errore verifica: ${(e as Error).message}`);
    } finally {
      setVerificando(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Da inviare */}
      <div className="rounded-2xl bg-card/60 border border-border/30 p-6 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-base font-display tracking-wider flex items-center gap-2">
            <Send size={16} /> Privati da inviare al RENTRI
          </h3>
          <span className="text-xs text-muted-foreground">
            {daInviare.length} conferimenti non ancora presenti nell'archivio invii
          </span>
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => void invia(daInviare.filter((c) => sel.has(c.id)))}
              disabled={inviando || sel.size === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40"
            >
              {inviando ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Invia selezionati ({sel.size})
            </button>
            <button
              onClick={() => void load()}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary text-xs font-semibold"
            >
              {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Aggiorna
            </button>
          </div>
        </div>

        {daInviare.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nessun conferimento privato in attesa: i movimenti fino ad agosto risultano già inviati da terminale.
            I nuovi conferimenti compariranno qui e potranno essere inviati al RENTRI dal bridge.
          </p>
        ) : (
          <div className="max-h-[280px] overflow-auto rounded-xl border border-border/30">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 w-8"></th>
                  <th className="px-3 py-2 text-left">Data</th>
                  <th className="px-3 py-2 text-left">CER</th>
                  <th className="px-3 py-2 text-right">Kg</th>
                  <th className="px-3 py-2 text-left">Produttore</th>
                  <th className="px-3 py-2 text-left">Mezzo</th>
                </tr>
              </thead>
              <tbody>
                {daInviare.map((c) => (
                  <tr key={c.id} className="border-t border-border/20 hover:bg-primary/5">
                    <td className="px-3 py-2">
                      <input type="checkbox" checked={sel.has(c.id)} onChange={() => toggle(c.id)} />
                    </td>
                    <td className="px-3 py-2">{fmtData(String(c.data))}</td>
                    <td className="px-3 py-2 font-mono text-xs">{c.cer}</td>
                    <td className="px-3 py-2 text-right font-mono">{Number(c.kg_pesati ?? 0).toLocaleString("it-IT")}</td>
                    <td className="px-3 py-2">{c.nome_privato ?? "—"}</td>
                    <td className="px-3 py-2 text-xs">
                      {[c.modello_automezzo, c.targa_automezzo].filter(Boolean).join(" ") || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Riepilogo */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Invii", value: totali.tot.toLocaleString("it-IT"), c: "text-primary" },
          { label: "Kg totali", value: totali.kg.toLocaleString("it-IT"), c: "text-cyan-300" },
          { label: "Confermati", value: totali.confermati.toLocaleString("it-IT"), c: "text-emerald-300" },
          { label: "Da confermare", value: totali.aperti.toLocaleString("it-IT"), c: "text-amber-300" },
          { label: "Da terminale", value: totali.terminale.toLocaleString("it-IT"), c: "text-violet-300" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl bg-card/60 border border-border/30 p-3">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-2xl font-bold ${s.c}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Archivio */}
      <div className="rounded-2xl bg-card/60 border border-border/30 overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 p-4 border-b border-border/30">
          <Search size={14} className="text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cerca per nome, CER, progressivo, ricevuta…"
            className="w-72 rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm"
          />
          <select
            value={mese}
            onChange={(e) => setMese(e.target.value)}
            className="rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm"
          >
            <option value="all">Tutti i mesi</option>
            {mesi.map((m) => (
              <option key={m} value={m}>
                {m.split("-").reverse().join("/")}
              </option>
            ))}
          </select>
          <select
            value={origine}
            onChange={(e) => setOrigine(e.target.value)}
            className="rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm"
          >
            <option value="all">Tutte le origini</option>
            <option value="TERMINALE">Eseguito da terminale</option>
            <option value="APP">Inviato dall'app</option>
          </select>
          <div className="ml-auto flex gap-2">
            <button
              disabled={!filtered.length}
              onClick={() => exportToExcel(filtered, exportCols, "invii-rentri-privati", "Invii privati")}
              className="flex items-center gap-1 px-3 py-2 rounded-lg border border-border/50 text-xs font-semibold disabled:opacity-40"
            >
              <Download size={12} /> Excel
            </button>
            <button
              disabled={!filtered.length}
              onClick={() =>
                exportToPdf(filtered, exportCols, "invii-rentri-privati", "Invii RENTRI movimenti privati 2026")
              }
              className="flex items-center gap-1 px-3 py-2 rounded-lg border border-border/50 text-xs font-semibold disabled:opacity-40"
            >
              <FileText size={12} /> PDF
            </button>
          </div>
        </div>

        <div className="overflow-auto max-h-[60vh]">
          <table className="w-full min-w-max text-sm">
            <thead className="sticky top-0 bg-card border-b border-border/30 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">N.</th>
                <th className="px-3 py-2 text-left">Data</th>
                <th className="px-3 py-2 text-left">Data invio</th>
                <th className="px-3 py-2 text-left">CER</th>
                <th className="px-3 py-2 text-right">Kg</th>
                <th className="px-3 py-2 text-left">Produttore</th>
                <th className="px-3 py-2 text-left">Mezzo</th>
                <th className="px-3 py-2 text-left">Progr. RENTRI</th>
                <th className="px-3 py-2 text-left">ID transazione</th>
                <th className="px-3 py-2 text-left">ID ricevuta</th>
                <th className="px-3 py-2 text-left">Origine</th>
                <th className="px-3 py-2 text-left">Stato</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={13} className="text-center py-10 text-muted-foreground">
                    Nessun invio trovato
                  </td>
                </tr>
              ) : (
                filtered.map((i) => (
                  <tr key={i.id} className="border-b border-border/10 hover:bg-primary/5">
                    <td className="px-3 py-2 text-xs text-muted-foreground">{i.numero_riga ?? "—"}</td>
                    <td className="px-3 py-2 text-xs">{fmtData(i.data_movimento)}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {i.data_invio ? fmtData(i.data_invio) : "—"}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{i.cer}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs">
                      {Number(i.kg ?? 0).toLocaleString("it-IT")}
                    </td>
                    <td className="px-3 py-2 text-xs max-w-[260px] truncate" title={i.produttore ?? ""}>
                      {i.produttore ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-xs max-w-[160px] truncate" title={i.mezzo ?? ""}>
                      {i.mezzo || "—"}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-primary">{i.progressivo_rentri ?? "—"}</td>
                    <td className="px-3 py-2 font-mono text-[11px]">
                      {i.transazione_id ? (
                        <button
                          onClick={() => copia(i.transazione_id!)}
                          className="inline-flex items-center gap-1 hover:text-primary"
                          title="Copia ID transazione"
                        >
                          {i.transazione_id.slice(0, 13)}… <Copy size={11} />
                        </button>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px]">
                      {i.id_ricevuta ? (
                        <button
                          onClick={() => copia(i.id_ricevuta!)}
                          className="inline-flex items-center gap-1 hover:text-primary"
                          title="Copia ID ricevuta"
                        >
                          {i.id_ricevuta} <Copy size={11} />
                        </button>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`px-2 py-0.5 rounded-full border text-[11px] font-semibold ${
                          i.origine === "TERMINALE"
                            ? "border-amber-500/40 text-amber-300 bg-amber-500/10"
                            : "border-emerald-500/40 text-emerald-300 bg-emerald-500/10"
                        }`}
                      >
                        {i.origine === "TERMINALE" ? "Eseguito da terminale" : "Inviato dall'app"}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`px-2 py-0.5 rounded-full border text-[11px] font-semibold ${statoBadge(i.stato)}`}
                        title={i.esito ?? ""}
                      >
                        {i.stato.replace("_", " ").toLowerCase()}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {i.origine === "APP" && i.transazione_id && (
                        <button
                          onClick={() => void verifica(i)}
                          disabled={verificando === i.id}
                          className="px-2 py-1 rounded-md border border-border/50 text-[11px] font-semibold disabled:opacity-40"
                        >
                          {verificando === i.id ? "…" : "Verifica"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 text-xs text-muted-foreground border-t border-border/20">
          {filtered.length.toLocaleString("it-IT")} di {invii.length.toLocaleString("it-IT")} invii
        </div>
      </div>
    </div>
  );
}
