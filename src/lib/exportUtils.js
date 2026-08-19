import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
/**
 * Export data to Excel (.xlsx)
 */
export function exportToExcel(data, columns, filename, sheetName = "Dati", headerLines) {
    const rows = data.map((row) => columns.reduce((acc, col) => {
        acc[col.header] = col.format ? col.format(row[col.key], row) : (row[col.key] ?? "");
        return acc;
    }, {}));
    const ws = XLSX.utils.json_to_sheet([]);
    // Add optional header lines (company info etc.)
    let startRow = 0;
    if (headerLines && headerLines.length > 0) {
        const headerData = headerLines.map((line) => [line]);
        XLSX.utils.sheet_add_aoa(ws, headerData, { origin: "A1" });
        startRow = headerLines.length + 1; // blank row after header
    }
    // Add data with column headers
    XLSX.utils.sheet_add_json(ws, rows, { origin: `A${startRow + 1}` });
    // Set column widths
    ws["!cols"] = columns.map((col) => ({ wch: col.width || 18 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `${filename}.xlsx`);
}
/**
 * Export data to PDF (landscape table)
 */
export function exportToPdf(data, columns, filename, title) {
    // Auto-pick page format/orientation based on column count to avoid overlap
    const colCount = columns.length;
    const format = colCount > 20 ? "a2" : colCount > 12 ? "a3" : "a4";
    const orientation = colCount > 4 ? "landscape" : "portrait";
    const doc = new jsPDF({ orientation, unit: "mm", format });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const marginX = 8;
    let y = 10;
    // Title block
    if (title) {
        const lines = title.split("\n");
        lines.forEach((line, idx) => {
            doc.setFontSize(idx === 0 ? 13 : 8);
            doc.setFont("helvetica", idx === 0 ? "bold" : "normal");
            doc.text(line, marginX, y);
            y += idx === 0 ? 5 : 4;
        });
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(110, 110, 110);
        doc.text(`Esportato il ${new Date().toLocaleDateString("it-IT")} — ${data.length} record`, marginX, y + 3);
        y += 6;
    }
    // Build head/body
    const head = [columns.map((c) => c.header.toUpperCase())];
    const body = data.map((row) => columns.map((col) => {
        const raw = col.format ? col.format(row[col.key], row) : row[col.key];
        if (raw === null || raw === undefined || raw === "")
            return "—";
        return String(raw);
    }));
    // Adaptive font size based on column density
    const fontSize = colCount > 25 ? 5.5 : colCount > 18 ? 6 : colCount > 12 ? 6.5 : 8;
    autoTable(doc, {
        head,
        body,
        startY: y + 2,
        margin: { left: marginX, right: marginX, top: 10, bottom: 12 },
        styles: {
            font: "helvetica",
            fontSize,
            cellPadding: { top: 1.2, right: 1.2, bottom: 1.2, left: 1.2 },
            overflow: "linebreak",
            valign: "middle",
            lineColor: [220, 220, 230],
            lineWidth: 0.1,
        },
        headStyles: {
            fillColor: [30, 30, 40],
            textColor: 255,
            fontStyle: "bold",
            fontSize: Math.max(fontSize - 0.5, 5),
            halign: "left",
        },
        alternateRowStyles: { fillColor: [245, 245, 248] },
        tableWidth: "auto",
        horizontalPageBreak: false,
        showHead: "everyPage",
        didDrawPage: () => {
            const pageCount = doc.internal.getNumberOfPages();
            const current = doc.internal.getCurrentPageInfo().pageNumber;
            doc.setFontSize(7);
            doc.setTextColor(150, 150, 150);
            doc.text(`Pagina ${current}/${pageCount}`, pageW - marginX - 20, pageH - 5);
        },
    });
    doc.save(`${filename}.pdf`);
}
