import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";

interface ExportColumn {
  header: string;
  key: string;
  width?: number;
  format?: (value: any, row: any) => string;
}

/**
 * Export data to Excel (.xlsx)
 */
export function exportToExcel(
  data: Record<string, any>[],
  columns: ExportColumn[],
  filename: string,
  sheetName = "Dati"
) {
  const rows = data.map((row) =>
    columns.reduce((acc, col) => {
      acc[col.header] = col.format ? col.format(row[col.key], row) : (row[col.key] ?? "");
      return acc;
    }, {} as Record<string, any>)
  );

  const ws = XLSX.utils.json_to_sheet(rows);

  // Set column widths
  ws["!cols"] = columns.map((col) => ({ wch: col.width || 18 }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

/**
 * Export data to PDF (landscape table)
 */
export function exportToPdf(
  data: Record<string, any>[],
  columns: ExportColumn[],
  filename: string,
  title?: string
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 10;
  const marginY = 10;
  let y = marginY;

  // Title (supports multiline with \n)
  if (title) {
    const lines = title.split("\n");
    lines.forEach((line, idx) => {
      if (idx === 0) {
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
      } else {
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
      }
      doc.text(line, marginX, y + 5);
      y += idx === 0 ? 6 : 4;
    });
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`Esportato il ${new Date().toLocaleDateString("it-IT")} — ${data.length} record`, marginX, y + 4);
    y += 8;
  }

  // Column widths
  const totalAvail = pageW - marginX * 2;
  const totalDeclared = columns.reduce((s, c) => s + (c.width || 18), 0);
  const colWidths = columns.map((c) => ((c.width || 18) / totalDeclared) * totalAvail);

  // Header
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setFillColor(30, 30, 40);
  doc.setTextColor(255, 255, 255);
  doc.rect(marginX, y, totalAvail, 6, "F");
  let x = marginX + 1;
  columns.forEach((col, i) => {
    doc.text(col.header.toUpperCase(), x, y + 4, { maxWidth: colWidths[i] - 2 });
    x += colWidths[i];
  });
  y += 7;

  // Rows
  doc.setFont("helvetica", "normal");
  doc.setTextColor(20, 20, 20);

  data.forEach((row, rowIdx) => {
    if (y > pageH - 12) {
      doc.addPage();
      y = marginY;
    }

    if (rowIdx % 2 === 0) {
      doc.setFillColor(245, 245, 248);
      doc.rect(marginX, y - 1, totalAvail, 5.5, "F");
    }

    x = marginX + 1;
    columns.forEach((col, i) => {
      const val = col.format ? col.format(row[col.key], row) : String(row[col.key] ?? "—");
      doc.text(val.substring(0, 60), x, y + 3, { maxWidth: colWidths[i] - 2 });
      x += colWidths[i];
    });
    y += 5.5;
  });

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(`Pagina ${p}/${totalPages}`, pageW - marginX - 20, pageH - 5);
  }

  doc.save(`${filename}.pdf`);
}
