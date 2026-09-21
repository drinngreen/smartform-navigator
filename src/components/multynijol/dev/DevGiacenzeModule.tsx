/*
 * Vista documentale definitiva: nessuna query, sottoscrizione o scrittura.
 * I dati sono fissati dal 18/07/2026 al 21/09/2026 nel documento verificato.
 */
export { GiacenzeDocumentaliModule as DevGiacenzeModule } from "./GiacenzeDocumentaliModule";
/*
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Printer, RefreshCw, Package, ArrowDown, ArrowUp, FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { CER_CATALOG } from "@/data/cerCatalog";
import { getCerDescrizionePerStampa } from "@/data/cerDescrizioni";
import { logAgentActivity } from "@/stores/agentActivityStore";

import {
  normalizeCerCodice as normalizeCer,
} from "@/lib/dragonGiacenzeBaseline";
import {
  applicaMovimentiRealiPostSnapshot,
  GIACENZE_SNAPSHOT_18_DATE,
  GIACENZE_SNAPSHOT_18_MATTINA,
} from "@/lib/giacenzeSnapshot18Settembre";

const MULTY_TENANT_ID = "77ec9a3d-602e-438f-97bf-1c69abd8f691";

// Intestazione fissa per export (replica StRegRag)
const COMPANY = {
  ragione: "MULTY PROGET S.R.L. - VIA RIVAROSSA 18/20 Piscina 10060 TO",
  registroLabel: "Registro n. : 1   Reg. Produttore-Destinatario   Unità Locale: 1 - MULTY PROGET S.R.L. - VIA RIVAROSSA 18/20 Piscina",
};

const fmt = (n: number) =>
  n.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 3 });

const fmtDate = (d: Date) => d.toLocaleDateString("it-IT");

const getRomeToday = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
};


interface Movimento {
  cer: string;
  descrizione_rifiuto: string | null;
  tipo_movimento: string;
  quantita_kg: number;
  data_movimento: string;
  registrato_il: string;
}
*/

interface DragonStockRow {
  quantity: number;
  sign: "PLUS" | "MINUS";
  movement_date: string;
  created_at: string;
  source_register_movement_id: string | null;
  source_transform_batch_id: string | null;
  item: { codice_cer: string; descrizione: string | null } | null;
}

interface CerRow {
  cer: string;
  descrizione: string;
  carico: number;
  scarico: number;
  saldo: number;
}

interface GiacenzaRow {
  cer: string;
  descrizione_cer: string | null;
  quantita_kg: number;
}

interface MovimentoImpiantoReale {
  id: string;
  cer: string;
  tipo_movimento: string;
  quantita_kg: number;
  created_at: string;
}


export function DevGiacenzeModule() {
  const queryClient = useQueryClient();
  const [searchCer, setSearchCer] = useState("");
  // La fotografia del 12/09 è il punto di partenza contabile, non la data finale
  // della vista: all'apertura vanno mostrati anche tutti i movimenti successivi.
  const [dataAl, setDataAl] = useState<string>(getRomeToday);
  const [dataDal, setDataDal] = useState<string>("");
  const [showAllCer, setShowAllCer] = useState(false);

  // Lettura aggregata dello storico già consolidato. Questa vista non esegue scritture.
  const { data: movimenti, isLoading } = useQuery({
    queryKey: ["dragon-stock", MULTY_TENANT_ID, "all"],
    queryFn: async () => {
      const pageSize = 1000;
      const rows: Movimento[] = [];
      for (let from = 0; ; from += pageSize) {
        const { data, error } = await supabase
          .from("dragon_stock_movements")
          .select("quantity, sign, movement_date, created_at, source_register_movement_id, source_transform_batch_id, item:dragon_items!inner(codice_cer, descrizione)")
          .eq("company_id", MULTY_TENANT_ID)
          .eq("is_system_hidden", false)
          .order("movement_date", { ascending: true })
          .range(from, from + pageSize - 1);
        if (error) throw error;
        const page = (data ?? []) as unknown as DragonStockRow[];
        for (const movement of page) {
          if (!movement.item?.codice_cer) continue;
          // Solo movimenti con origine reale (formulario/registro o cernita).
          // Le rettifiche senza origine non sono movimenti e non vanno
          // mostrate come carico o scarico in una stampa ufficiale.
          if (!movement.source_register_movement_id && !movement.source_transform_batch_id) continue;
          const normalizedCer = normalizeCer(movement.item.codice_cer);
          rows.push({
            cer: normalizedCer,
            descrizione_rifiuto: movement.item.descrizione,
            tipo_movimento: movement.sign === "PLUS" ? "CARICO" : "SCARICO",
            quantita_kg: Number(movement.quantity) || 0,
            data_movimento: movement.movement_date,
            registrato_il: movement.created_at,
          });
        }
        if (page.length < pageSize) break;
      }
      return rows;
    },
  });

  // Elenco CER del magazzino (codici autorizzati): devono comparire SEMPRE, anche a zero.
  const { data: cerElenco } = useQuery({
    queryKey: ["magazzino-cer-elenco", MULTY_TENANT_ID],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("magazzino_giacenze")
        .select("cer, descrizione_cer, quantita_kg")
        .eq("tenant_id", MULTY_TENANT_ID);
      if (error) throw error;
      return (data ?? []) as GiacenzaRow[];
    },
  });

  // Dopo la fotografia certificata si applicano soltanto movimenti effettivi
  // con origine operativa. La chiave primaria impedisce doppi conteggi.
  const { data: movimentiRealiPostSnapshot = [] } = useQuery({
    queryKey: ["giacenze-movimenti-reali-post-snapshot", MULTY_TENANT_ID],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movimenti_impianto")
        .select("id, cer, tipo_movimento, quantita_kg, created_at")
        .eq("tenant_id", MULTY_TENANT_ID)
        .eq("stato_movimento", "effettivo")
        .eq("created_by_agent", false)
        .gte("created_at", "2026-09-18T15:01:39.000Z")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as MovimentoImpiantoReale[];
    },
  });

  // Aggregazione contabile per CER: Saldo = Carico − Scarico sui movimenti del periodo,
  // esattamente come la stampa ufficiale "Registrazioni per C.E.R.".
  const rows: CerRow[] = useMemo(() => {
    if (!movimenti) return [];
    const map: Record<string, CerRow> = {};
    const descriptionsByCer: Record<string, string> = {};

    for (const m of movimenti) {
      const d = m.descrizione_rifiuto?.trim();
      if (d) descriptionsByCer[m.cer] = d;
    }

    const addEmpty = (codice: string, descr?: string | null) => {
      const key = normalizeCer(codice);
      if (map[key]) return;
      map[key] = {
        cer: key,
        descrizione: getCerDescrizionePerStampa(key, descriptionsByCer[key] || descr || undefined),
        carico: 0,
        scarico: 0,
        saldo: 0,
      };
    };

    // Tutti i CER presenti nell'elenco giacenze (anche a saldo zero)
    for (const c of cerElenco ?? []) addEmpty(c.cer, c.descrizione_cer);

    // Se richiesto, mostra l'intero catalogo CER/EER (843 codici) con saldo 0 se senza movimenti
    if (showAllCer) {
      for (const c of CER_CATALOG) addEmpty(c.codice);
    }


    for (const m of movimenti) {
      const movementDay = m.data_movimento.slice(0, 10);
      if (dataAl && movementDay > dataAl) continue;
      if (dataDal && movementDay < dataDal) continue;
      const key = m.cer;
      if (!map[key]) {
        map[key] = {
          cer: m.cer,
          descrizione: getCerDescrizionePerStampa(m.cer, descriptionsByCer[key]),
          carico: 0,
          scarico: 0,
          saldo: 0,
        };
      }
      const q = Number(m.quantita_kg) || 0;
      if (m.tipo_movimento === "CARICO") map[key].carico += q;
      else map[key].scarico += q;
      
    }

    Object.values(map).forEach((r) => (r.saldo = r.carico - r.scarico));

    // Dal 18/09 in avanti la fonte è la stampa allegata certificata, che include
    // già le due cernite delle 17:01. Si aggiungono solo movimenti successivi,
    // evitando di conteggiare le cernite una seconda volta.
    if (!dataDal && dataAl >= GIACENZE_SNAPSHOT_18_DATE) {
      const snapshotAggiornato = applicaMovimentiRealiPostSnapshot(
        GIACENZE_SNAPSHOT_18_MATTINA,
        movimentiRealiPostSnapshot.map((m) => ({
          cer: normalizeCer(m.cer),
          tipo_movimento: m.tipo_movimento,
          quantita_kg: Number(m.quantita_kg) || 0,
          created_at: m.created_at,
        })),
        dataAl,
      );
      for (const [cer, snapshot] of Object.entries(snapshotAggiornato)) {
        addEmpty(cer);
        map[cer].carico = snapshot.carico;
        map[cer].scarico = snapshot.scarico;
      }
    }
    // Il saldo esposto non viene mai letto o riutilizzato da una fonte separata:
    // è sempre la sottrazione dei due numeri mostrati nella stessa riga.
    Object.values(map).forEach((r) => (r.saldo = r.carico - r.scarico));
    const elencoKeys = new Set((cerElenco ?? []).map((c) => normalizeCer(c.cer)));
    return Object.values(map)
      .filter((r) => showAllCer || elencoKeys.has(r.cer) || r.carico !== 0 || r.scarico !== 0)
      .sort((a, b) => a.cer.localeCompare(b.cer));
  }, [movimenti, dataAl, dataDal, showAllCer, cerElenco, movimentiRealiPostSnapshot]);





  const filtered = useMemo(
    () => rows.filter((r) => !searchCer || r.cer.toLowerCase().includes(searchCer.toLowerCase())),
    [rows, searchCer]
  );

  const totals = useMemo(
    () => {
      const sums = filtered.reduce(
        (acc, r) => ({ carico: acc.carico + r.carico, scarico: acc.scarico + r.scarico }),
        { carico: 0, scarico: 0 },
      );
      return { ...sums, saldo: sums.carico - sums.scarico };
    },
    [filtered]
  );

  // Aggiornamento automatico della sola vista quando cambia lo storico consolidato.
  useEffect(() => {
    const channel = supabase
      .channel("dev-giacenze-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "dragon_stock_movements" }, () => {
        queryClient.invalidateQueries({ queryKey: ["dragon-stock", MULTY_TENANT_ID] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "magazzino_giacenze" }, () => {
        queryClient.invalidateQueries({ queryKey: ["magazzino-cer-elenco", MULTY_TENANT_ID] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "movimenti_impianto" }, () => {
        queryClient.invalidateQueries({ queryKey: ["giacenze-movimenti-reali-post-snapshot", MULTY_TENANT_ID] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Aggiorna soltanto la vista: non scrive né ricalcola alcuna giacenza.
  const recalculate = useMutation({
    mutationFn: async () => {
      await queryClient.invalidateQueries({ queryKey: ["dragon-stock", MULTY_TENANT_ID] });
      await queryClient.invalidateQueries({ queryKey: ["magazzino-cer-elenco", MULTY_TENANT_ID] });
      await queryClient.invalidateQueries({ queryKey: ["giacenze-movimenti-reali-post-snapshot", MULTY_TENANT_ID] });
      const count = new Set((movimenti ?? []).map((row) => row.cer)).size;
      logAgentActivity("Rilettura registro CER", "ok", `${count} codici CER`);
      return count;
    },
    onSuccess: (count) => {
      ["dev-giacenze", "dev-giacenze-baseline", "dev-movimenti-multy", "dev-mag-giacenze", "dev-mag-movimenti", "dev-registro-movimenti"].forEach((k) =>
        queryClient.invalidateQueries({ queryKey: [k] })
      );
      toast.success(`Vista giacenze aggiornata (${count} codici CER, nessun dato modificato)`);
    },
    onError: (e: any) => toast.error("Errore: " + e.message),
  });


  // Costruisce intestazione testuale (riusata da PDF/Excel)
  const buildHeaderLines = () => {
    const oggi = new Date();
    const dal = dataDal ? fmtDate(new Date(dataDal)) : "";
    const al = fmtDate(new Date(dataAl));
    return [
      "STAMPA REGISTRAZIONI PER C.E.R.",
      `Stampa del ${fmtDate(oggi)}`,
      "",
      COMPANY.ragione,
      "",
      COMPANY.registroLabel,
      `Data: dal ${dal}   al ${al}        C.E.R.: * Tutti`,
      "Produttore: * Tutti                                            Trasportatore: * Tutti",
      "Destinatario: * Tutti                                          Intermediario: * Tutti",
      "Tipo Operaz.:                       Provenienza:",
    ];
  };

  // Nome file basato sul periodo richiesto (es. Registro_CER_dal_01-01-2025_al_31-12-2025)
  const buildFileName = () => {
    const slug = (d: string) => d.split("-").reverse().join("-"); // YYYY-MM-DD -> DD-MM-YYYY
    if (dataDal) return `Registro_CER_dal_${slug(dataDal)}_al_${slug(dataAl)}`;
    return `Registro_CER_al_${slug(dataAl)}`;
  };

  // PDF replica StRegRag
  const handleExportPdf = () => {
    if (!filtered.length) return toast.error("Nessun dato da esportare");
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const marginX = 10;
    const oggi = fmtDate(new Date());
    const al = fmtDate(new Date(dataAl));
    const dal = dataDal ? fmtDate(new Date(dataDal)) : "";

    const drawHeader = () => {
      let y = 12;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("STAMPA REGISTRAZIONI PER C.E.R.", pageW / 2, y, { align: "center" });
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Stampa del ${oggi}`, pageW / 2, y, { align: "center" });
      y += 6;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(COMPANY.ragione, marginX, y);
      y += 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(COMPANY.registroLabel, marginX, y);
      y += 4;
      doc.text(`Data: dal ${dal}   al ${al}`, marginX, y);
      doc.text("C.E.R.: * Tutti", pageW - marginX, y, { align: "right" });
      y += 4;
      doc.text("Produttore: * Tutti", marginX, y);
      doc.text("Trasportatore: * Tutti", pageW - marginX, y, { align: "right" });
      y += 4;
      doc.text("Destinatario: * Tutti", marginX, y);
      doc.text("Intermediario: * Tutti", pageW - marginX, y, { align: "right" });
      y += 4;
      doc.text("Tipo Operaz.:", marginX, y);
      doc.text("Provenienza:", marginX + 70, y);
      y += 3;
      doc.setDrawColor(120);
      doc.line(marginX, y, pageW - marginX, y);
      return y + 2;
    };

    const headerEndY = 50;
    const totalPagesExp = "{total_pages_count_string}";

    autoTable(doc, {
      startY: headerEndY,
      head: [
        [
          { content: "C.E.R.", rowSpan: 2, styles: { valign: "bottom" } },
          { content: "", rowSpan: 2 },
          { content: "Quantità", colSpan: 3, styles: { halign: "center" } },
        ],
        ["Carico", "Scarico", "Saldo"],
      ],
      body: filtered.map((r) => [
        { content: r.cer, styles: { fontStyle: "bold" } },
        r.descrizione,
        { content: fmt(r.carico), styles: { halign: "right" } },
        { content: fmt(r.scarico), styles: { halign: "right" } },
        { content: fmt(r.saldo), styles: { halign: "right", fontStyle: "bold" } },
      ]),
      foot: [
        [
          { content: "TOTALI GENERALI", colSpan: 2, styles: { fontStyle: "bold" } },
          { content: fmt(totals.carico), styles: { halign: "right", fontStyle: "bold" } },
          { content: fmt(totals.scarico), styles: { halign: "right", fontStyle: "bold" } },
          { content: fmt(totals.saldo), styles: { halign: "right", fontStyle: "bold" } },
        ],
      ],

      styles: { font: "helvetica", fontSize: 7.3, cellPadding: 1.1, lineColor: [180, 180, 180], lineWidth: 0.1, overflow: "linebreak" },
      headStyles: { fillColor: [240, 240, 240], textColor: 20, fontStyle: "bold" },
      footStyles: { fillColor: [230, 230, 230], textColor: 0 },
      columnStyles: {
        0: { cellWidth: 34, overflow: "visible" },
        1: { cellWidth: "auto" },
        2: { cellWidth: 22 },
        3: { cellWidth: 22 },
        4: { cellWidth: 22 },
      },
      margin: { left: marginX, right: marginX, top: headerEndY, bottom: 14 },
      showHead: "everyPage",
      showFoot: "lastPage",
      willDrawPage: () => {
        drawHeader();
      },
      didDrawPage: () => {
        const pageNumber = (doc as any).internal.getCurrentPageInfo().pageNumber;
        doc.setFontSize(7.5);
        doc.setTextColor(80);
        doc.text("Salvo diversa indicazione l'unità di misura di riferimento è il kg.", marginX, pageH - 8);
        doc.setTextColor(120);
        doc.text(`Pagina ${pageNumber} di ${totalPagesExp}`, pageW - marginX, pageH - 4, { align: "right" });
      },
    });

    if (typeof (doc as any).putTotalPages === "function") {
      (doc as any).putTotalPages(totalPagesExp);
    }

    doc.save(`${buildFileName()}.pdf`);
  };

  // Excel con intestazione identica
  const handleExportExcel = () => {
    if (!filtered.length) return toast.error("Nessun dato da esportare");
    const headerLines = buildHeaderLines();
    const aoa: any[][] = headerLines.map((l) => [l]);
    aoa.push([]);
    aoa.push(["C.E.R.", "Descrizione", "Quantità Carico", "Quantità Scarico", "Quantità Saldo"]);
    filtered.forEach((r) => aoa.push([r.cer, r.descrizione, r.carico, r.scarico, r.saldo]));
    aoa.push([]);
    aoa.push(["TOTALI GENERALI", "", totals.carico, totals.scarico, totals.saldo]);

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = [{ wch: 18 }, { wch: 60 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Registro CER");
    XLSX.writeFile(wb, `${buildFileName()}.xlsx`);
  };

  const positiveCers = filtered.filter((r) => r.saldo > 0).length;
  const totaleKg = totals.saldo;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card/60 border-emerald-500/30">
          <CardContent className="p-4 flex items-center gap-3">
            <Package className="h-8 w-8 text-emerald-400" />
            <div>
              <p className="text-xs text-muted-foreground">Codici CER con saldo &gt; 0</p>
              <p className="text-2xl font-bold text-emerald-400">{positiveCers}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/60 border-emerald-500/30">
          <CardContent className="p-4 flex items-center gap-3">
            <ArrowDown className="h-8 w-8 text-blue-400" />
            <div>
              <p className="text-xs text-muted-foreground">Saldo totale</p>
              <p className="text-2xl font-bold text-blue-400">{fmt(totaleKg)} kg</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/60 border-emerald-500/30">
          <CardContent className="p-4 flex items-center gap-3">
            <ArrowUp className="h-8 w-8 text-amber-400" />
            <div>
              <p className="text-xs text-muted-foreground">Movimenti totali (tenant)</p>
              <p className="text-2xl font-bold text-amber-400">{movimenti?.length ?? 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtri data storica */}
      <Card className="bg-card/40 border-emerald-500/20">
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div>
            <Label className="text-xs text-muted-foreground">Dal (opzionale)</Label>
            <Input type="date" value={dataDal} onChange={(e) => setDataDal(e.target.value)} className="bg-card/60" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Al (saldo storico)</Label>
            <Input type="date" value={dataAl} onChange={(e) => setDataAl(e.target.value)} className="bg-card/60" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Filtro CER</Label>
            <Input placeholder="es. 170405" value={searchCer} onChange={(e) => setSearchCer(e.target.value)} className="bg-card/60" />
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={showAllCer}
                onChange={(e) => setShowAllCer(e.target.checked)}
                className="h-4 w-4 accent-emerald-500"
              />
              Mostra tutti i CER a magazzino (anche a zero)
            </label>
            <div className="text-xs text-muted-foreground">
              Saldo = carichi − scarichi con data ≤ {fmtDate(new Date(dataAl))}. Vista in sola lettura.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant="outline"
          onClick={() => recalculate.mutate()}
          disabled={recalculate.isPending}
          className="gap-2 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
        >
          <RefreshCw className="h-4 w-4" /> Aggiorna vista
        </Button>
        <Button
          variant="outline"
          onClick={handleExportPdf}
          className="gap-2 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
        >
          <FileText className="h-4 w-4" /> Stampa PDF
        </Button>
        <Button
          variant="outline"
          onClick={handleExportExcel}
          className="gap-2 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
        >
          <FileSpreadsheet className="h-4 w-4" /> Excel
        </Button>
        <Button
          variant="outline"
          onClick={() => window.print()}
          className="gap-2 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
        >
          <Printer className="h-4 w-4" /> Stampa pagina
        </Button>
      </div>

      {/* Table — stesso layout PDF */}
      <Card className="bg-card/60 border-border/30">
        <CardHeader>
          <CardTitle className="text-emerald-400">📋 Stampa Registrazioni per C.E.R. — al {fmtDate(new Date(dataAl))}</CardTitle>
          <p className="text-xs text-muted-foreground">{COMPANY.ragione}</p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Caricamento...</p>
          ) : !filtered.length ? (
            <p className="text-muted-foreground text-sm">
              Nessun movimento registrato per Multyproget. I dati demo sono stati ripuliti — inserisci movimenti reali tramite Carico/Scarico.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-border/50 text-muted-foreground bg-card/40">
                    <th className="text-left py-2 px-3" rowSpan={2}>C.E.R.</th>
                    <th className="text-left py-2 px-3" rowSpan={2}>Descrizione</th>
                    <th className="text-center py-1 px-3" colSpan={3}>Quantità</th>
                  </tr>
                  <tr className="border-b border-border/30 text-muted-foreground bg-card/30">
                    <th className="text-right py-1 px-3">Carico</th>
                    <th className="text-right py-1 px-3">Scarico</th>
                    <th className="text-right py-1 px-3">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.cer} className="border-b border-border/10 hover:bg-white/5">
                      <td className="py-1.5 px-3 font-mono font-bold text-emerald-300">{r.cer}</td>
                      <td className="py-1.5 px-3 text-xs">{r.descrizione || "—"}</td>
                      <td className="py-1.5 px-3 text-right">{fmt(r.carico)}</td>
                      <td className="py-1.5 px-3 text-right">{fmt(r.scarico)}</td>
                      <td className={`py-1.5 px-3 text-right font-bold ${r.saldo > 0 ? "text-emerald-400" : r.saldo < 0 ? "text-red-400" : "text-muted-foreground"}`}>
                        {fmt(r.saldo)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-emerald-500/10 border-t-2 border-emerald-500/40 font-bold">
                    <td colSpan={2} className="py-2 px-3">TOTALI GENERALI</td>

                    <td className="py-2 px-3 text-right">{fmt(totals.carico)}</td>
                    <td className="py-2 px-3 text-right">{fmt(totals.scarico)}</td>
                    <td className="py-2 px-3 text-right text-emerald-300">{fmt(totals.saldo)}</td>
                  </tr>
                </tbody>
              </table>
              <p className="text-xs text-muted-foreground mt-3 italic">
                Salvo diversa indicazione l'unità di misura di riferimento è il kg.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
