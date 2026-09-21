import { useMemo, useState } from "react";
import { FileSpreadsheet, FileText, Plus, Printer, Search, X } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import giacenzeData from "@/data/giacenzeGiornaliere18Luglio.json";

const FIRST_DATE = "2026-07-18";
const FINAL_DATE = "2026-09-21";

type DailyRow = {
  data: string;
  cer: string;
  descrizione: string;
  carico: number;
  scarico: number;
  saldo: number;
};

const allRows = giacenzeData.rows as DailyRow[];

const toIso = (date: string) => {
  const [day, month, year] = date.split("/");
  return `${year}-${month}-${day}`;
};

const toItalian = (date: string) => date.split("-").reverse().join("/");
const toFilename = (date: string) => date.split("-").reverse().join("-");
const fmt = (value: number) => value.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 3 });

const sumRows = (rows: DailyRow[]) => rows.reduce(
  (total, row) => ({
    carico: total.carico + row.carico,
    scarico: total.scarico + row.scarico,
    saldo: total.saldo + row.saldo,
  }),
  { carico: 0, scarico: 0, saldo: 0 },
);

export function GiacenzeDocumentaliModule() {
  const [pickerDate, setPickerDate] = useState(FINAL_DATE);
  const [selectedDates, setSelectedDates] = useState<string[]>([FINAL_DATE]);
  const [searchCer, setSearchCer] = useState("");

  const normalizeDate = (value: string) => {
    if (!value) return null;
    if (value < FIRST_DATE) {
      toast.error("Le giacenze sono disponibili a partire dal 18/07/2026");
      return FIRST_DATE;
    }
    if (value > FINAL_DATE) {
      toast.error("Il 21/09/2026 è la situazione finale disponibile");
      return FINAL_DATE;
    }
    return value;
  };

  const addDate = (value: string) => {
    const date = normalizeDate(value);
    if (!date) return;
    setPickerDate(date);
    if (selectedDates.includes(date)) {
      toast.info(`La giornata del ${toItalian(date)} è già presente`);
      return;
    }
    setSelectedDates((current) => [...current, date].sort());
    toast.success(`Giornata del ${toItalian(date)} aggiunta`);
  };

  const removeDate = (date: string) => {
    setSelectedDates((current) => current.filter((item) => item !== date));
  };

  const giorni = useMemo(
    () => selectedDates
      .slice()
      .sort()
      .map((date) => {
        const rows = allRows.filter((row) => toIso(row.data) === date);
        return { date, rows, totals: sumRows(rows) };
      })
      .filter((giorno) => giorno.rows.length > 0),
    [selectedDates],
  );

  const query = searchCer.trim().toLowerCase();
  const visibleRows = (rows: DailyRow[]) => (query ? rows.filter((row) => row.cer.toLowerCase().includes(query)) : rows);

  const finalRows = useMemo(() => allRows.filter((row) => row.data === "21/09/2026"), []);
  const finalTotals = useMemo(() => sumRows(finalRows), [finalRows]);

  const filename = giorni.length === 1
    ? `Giacenze_del_${toFilename(giorni[0].date)}`
    : `Giacenze_${giorni.length}_giornate`;

  const exportPdf = () => {
    if (!giorni.length) return toast.error("Nessuna giacenza da esportare");
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
    giorni.forEach((giorno, index) => {
      if (index > 0) doc.addPage();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(`Giacenze al ${toItalian(giorno.date)}`, 10, 12);
      autoTable(doc, {
        startY: 16,
        head: [["C.E.R.", "Descrizione", "Carico", "Scarico", "Saldo"]],
        body: giorno.rows.map((row) => [row.cer, row.descrizione, fmt(row.carico), fmt(row.scarico), fmt(row.saldo)]),
        foot: [["TOTALE", "", fmt(giorno.totals.carico), fmt(giorno.totals.scarico), fmt(giorno.totals.saldo)]],
        styles: { font: "helvetica", fontSize: 7, cellPadding: 1, lineWidth: 0.1 },
        headStyles: { fillColor: [55, 65, 81], textColor: 255 },
        footStyles: { fillColor: [229, 231, 235], textColor: 0, fontStyle: "bold" },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 80 },
          2: { cellWidth: 25, halign: "right" },
          3: { cellWidth: 25, halign: "right" },
          4: { cellWidth: 25, halign: "right" },
        },
        margin: { left: 10, right: 10, bottom: 10 },
        showHead: "everyPage",
        showFoot: "lastPage",
      });
    });
    doc.save(`${filename}.pdf`);
  };

  const exportExcel = () => {
    if (!giorni.length) return toast.error("Nessuna giacenza da esportare");
    const workbook = XLSX.utils.book_new();
    const aoa: (string | number)[][] = [];
    giorni.forEach((giorno, index) => {
      if (index > 0) aoa.push([]);
      aoa.push([`Giacenze al ${toItalian(giorno.date)}`]);
      aoa.push(["Data", "C.E.R.", "Descrizione", "Carico", "Scarico", "Saldo"]);
      giorno.rows.forEach((row) => aoa.push([row.data, row.cer, row.descrizione, row.carico, row.scarico, row.saldo]));
      aoa.push(["TOTALE", "", "", giorno.totals.carico, giorno.totals.scarico, giorno.totals.saldo]);
    });
    const detail = XLSX.utils.aoa_to_sheet(aoa);
    detail["!cols"] = [{ wch: 13 }, { wch: 16 }, { wch: 70 }, { wch: 16 }, { wch: 16 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(workbook, detail, "Giacenze per giornata");
    XLSX.writeFile(workbook, `${filename}.xlsx`);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="border-border/40 bg-card/60">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Primo giorno disponibile</p>
            <p className="text-xl font-bold">18/07/2026</p>
          </CardContent>
        </Card>
        <Card className="border-border/40 bg-card/60">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Situazione finale</p>
            <p className="text-xl font-bold">21/09/2026</p>
          </CardContent>
        </Card>
        <Card className="border-border/40 bg-card/60">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Saldo finale</p>
            <p className="text-xl font-bold text-emerald-400">{fmt(finalTotals.saldo)} kg</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/40 bg-card/40">
        <CardContent className="space-y-3 p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <Label htmlFor="giacenze-giorno" className="text-xs text-muted-foreground">Giorno</Label>
              <form
                className="flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  addDate(pickerDate);
                }}
              >
                <Input
                  id="giacenze-giorno"
                  type="date"
                  min={FIRST_DATE}
                  max={FINAL_DATE}
                  value={pickerDate}
                  onChange={(event) => {
                    const date = normalizeDate(event.target.value);
                    if (date) setPickerDate(date);
                  }}
                />
                <Button type="submit" variant="outline" className="gap-1 whitespace-nowrap">
                  <Plus className="h-4 w-4" /> Aggiungi
                </Button>
              </form>
            </div>
            <div>
              <Label htmlFor="giacenze-cer" className="text-xs text-muted-foreground">Cerca C.E.R.</Label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input id="giacenze-cer" value={searchCer} onChange={(event) => setSearchCer(event.target.value)} className="pl-9" placeholder="es. 170405" />
              </div>
            </div>
          </div>

          {selectedDates.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Giornate selezionate: {selectedDates.length}
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedDates.slice().sort().map((date) => (
                  <span key={date} className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-muted/40 px-3 py-1 text-xs">
                    {toItalian(date)}
                    <button type="button" onClick={() => removeDate(date)} aria-label={`Rimuovi ${toItalian(date)}`} className="print:hidden">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2 print:hidden">
        <Button variant="outline" onClick={exportPdf} className="gap-2"><FileText className="h-4 w-4" /> PDF</Button>
        <Button variant="outline" onClick={exportExcel} className="gap-2"><FileSpreadsheet className="h-4 w-4" /> Excel</Button>
        <Button variant="outline" onClick={() => window.print()} className="gap-2"><Printer className="h-4 w-4" /> Stampa</Button>
      </div>

      {giorni.map((giorno) => (
        <Card key={giorno.date} className="break-after-page border-border/40 bg-card/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Giacenze al {toItalian(giorno.date)}</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="px-3 py-2 text-left">C.E.R.</th>
                  <th className="px-3 py-2 text-left">Descrizione</th>
                  <th className="px-3 py-2 text-right">Carico</th>
                  <th className="px-3 py-2 text-right">Scarico</th>
                  <th className="px-3 py-2 text-right">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows(giorno.rows).map((row) => (
                  <tr key={`${giorno.date}-${row.cer}`} className="border-b border-border/20">
                    <td className="px-3 py-1.5 font-mono font-semibold">{row.cer}</td>
                    <td className="px-3 py-1.5 text-xs">{row.descrizione}</td>
                    <td className="px-3 py-1.5 text-right">{fmt(row.carico)}</td>
                    <td className="px-3 py-1.5 text-right">{fmt(row.scarico)}</td>
                    <td className="px-3 py-1.5 text-right font-semibold">{fmt(row.saldo)}</td>
                  </tr>
                ))}
                <tr className="border-t-2 font-bold">
                  <td colSpan={2} className="px-3 py-2">TOTALE</td>
                  <td className="px-3 py-2 text-right">{fmt(giorno.totals.carico)}</td>
                  <td className="px-3 py-2 text-right">{fmt(giorno.totals.scarico)}</td>
                  <td className="px-3 py-2 text-right">{fmt(giorno.totals.saldo)}</td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
