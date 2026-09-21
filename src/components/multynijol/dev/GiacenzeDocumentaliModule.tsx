import { useMemo, useState } from "react";
import { FileSpreadsheet, FileText, Printer, Search } from "lucide-react";
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

const groupByDay = (rows: DailyRow[]) => {
  const grouped = new Map<string, DailyRow[]>();
  rows.forEach((row) => {
    const current = grouped.get(row.data) ?? [];
    current.push(row);
    grouped.set(row.data, current);
  });
  return [...grouped.entries()];
};

const sumRows = (rows: DailyRow[]) => rows.reduce(
  (total, row) => ({
    carico: total.carico + row.carico,
    scarico: total.scarico + row.scarico,
    saldo: total.saldo + row.saldo,
  }),
  { carico: 0, scarico: 0, saldo: 0 },
);

export function GiacenzeDocumentaliModule() {
  const [dataDal, setDataDal] = useState(FIRST_DATE);
  const [dataAl, setDataAl] = useState(FINAL_DATE);
  const [searchCer, setSearchCer] = useState("");

  const setSafeStart = (value: string) => {
    if (value < FIRST_DATE) {
      setDataDal(FIRST_DATE);
      toast.error("Le giacenze sono disponibili a partire dal 18/07/2026");
      return;
    }
    setDataDal(value > dataAl ? dataAl : value);
  };

  const setSafeEnd = (value: string) => {
    if (value < FIRST_DATE) {
      setDataAl(FIRST_DATE);
      toast.error("Le giacenze sono disponibili a partire dal 18/07/2026");
      return;
    }
    if (value > FINAL_DATE) {
      setDataAl(FINAL_DATE);
      toast.error("Il 21/09/2026 è la situazione finale disponibile");
      return;
    }
    setDataAl(value < dataDal ? dataDal : value);
  };

  const periodRows = useMemo(() => allRows.filter((row) => {
    const date = toIso(row.data);
    return date >= dataDal && date <= dataAl;
  }), [dataAl, dataDal]);

  const visibleRows = useMemo(() => {
    const query = searchCer.trim().toLowerCase();
    if (!query) return periodRows;
    return periodRows.filter((row) => row.cer.toLowerCase().includes(query));
  }, [periodRows, searchCer]);

  const days = useMemo(() => groupByDay(visibleRows), [visibleRows]);
  const finalRows = useMemo(() => allRows.filter((row) => row.data === "21/09/2026"), []);
  const finalTotals = useMemo(() => sumRows(finalRows), [finalRows]);

  const filename = `Giacenze_dal_${toFilename(dataDal)}_al_${toFilename(dataAl)}`;

  const exportPdf = () => {
    if (!days.length) return toast.error("Nessuna giacenza da esportare");
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
    days.forEach(([date, rows], index) => {
      if (index > 0) doc.addPage();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(`Giacenze al ${date}`, 10, 12);
      const totals = sumRows(rows);
      autoTable(doc, {
        startY: 16,
        head: [["C.E.R.", "Descrizione", "Carico", "Scarico", "Saldo"]],
        body: rows.map((row) => [row.cer, row.descrizione, fmt(row.carico), fmt(row.scarico), fmt(row.saldo)]),
        foot: [["TOTALE", "", fmt(totals.carico), fmt(totals.scarico), fmt(totals.saldo)]],
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
    if (!days.length) return toast.error("Nessuna giacenza da esportare");
    const workbook = XLSX.utils.book_new();
    const detail = XLSX.utils.aoa_to_sheet([
      ["Data", "C.E.R.", "Descrizione", "Carico", "Scarico", "Saldo"],
      ...visibleRows.map((row) => [row.data, row.cer, row.descrizione, row.carico, row.scarico, row.saldo]),
    ]);
    detail["!cols"] = [{ wch: 13 }, { wch: 16 }, { wch: 70 }, { wch: 16 }, { wch: 16 }, { wch: 16 }];
    const totals = XLSX.utils.aoa_to_sheet([
      ["Data", "Carico", "Scarico", "Saldo"],
      ...days.map(([date, rows]) => {
        const total = sumRows(rows);
        return [date, total.carico, total.scarico, total.saldo];
      }),
    ]);
    totals["!cols"] = [{ wch: 13 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(workbook, detail, "Giorno per giorno");
    XLSX.utils.book_append_sheet(workbook, totals, "Totali per giorno");
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
        <CardContent className="grid grid-cols-1 gap-3 p-4 md:grid-cols-3">
          <div>
            <Label htmlFor="giacenze-dal" className="text-xs text-muted-foreground">Dal</Label>
            <Input id="giacenze-dal" type="date" min={FIRST_DATE} max={FINAL_DATE} value={dataDal} onChange={(event) => setSafeStart(event.target.value)} />
          </div>
          <div>
            <Label htmlFor="giacenze-al" className="text-xs text-muted-foreground">Al</Label>
            <Input id="giacenze-al" type="date" min={FIRST_DATE} max={FINAL_DATE} value={dataAl} onChange={(event) => setSafeEnd(event.target.value)} />
          </div>
          <div>
            <Label htmlFor="giacenze-cer" className="text-xs text-muted-foreground">Cerca C.E.R.</Label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input id="giacenze-cer" value={searchCer} onChange={(event) => setSearchCer(event.target.value)} className="pl-9" placeholder="es. 170405" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2 print:hidden">
        <Button variant="outline" onClick={exportPdf} className="gap-2"><FileText className="h-4 w-4" /> PDF</Button>
        <Button variant="outline" onClick={exportExcel} className="gap-2"><FileSpreadsheet className="h-4 w-4" /> Excel</Button>
        <Button variant="outline" onClick={() => window.print()} className="gap-2"><Printer className="h-4 w-4" /> Stampa</Button>
      </div>

      {days.map(([date, rows]) => {
        const totals = sumRows(rows);
        return (
          <Card key={date} className="break-after-page border-border/40 bg-card/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Giacenze al {date}</CardTitle>
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
                  {rows.map((row) => (
                    <tr key={`${date}-${row.cer}`} className="border-b border-border/20">
                      <td className="px-3 py-1.5 font-mono font-semibold">{row.cer}</td>
                      <td className="px-3 py-1.5 text-xs">{row.descrizione}</td>
                      <td className="px-3 py-1.5 text-right">{fmt(row.carico)}</td>
                      <td className="px-3 py-1.5 text-right">{fmt(row.scarico)}</td>
                      <td className="px-3 py-1.5 text-right font-semibold">{fmt(row.saldo)}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 font-bold">
                    <td colSpan={2} className="px-3 py-2">TOTALE</td>
                    <td className="px-3 py-2 text-right">{fmt(totals.carico)}</td>
                    <td className="px-3 py-2 text-right">{fmt(totals.scarico)}</td>
                    <td className="px-3 py-2 text-right">{fmt(totals.saldo)}</td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}