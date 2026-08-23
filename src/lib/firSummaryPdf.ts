/**
 * FIR Summary PDF – Clean table-style PDF with QR Code, subjects, and waste info.
 * Replaces the ministerial millimetric alignment with a readable summary.
 */
import { jsPDF } from "jspdf";
import type { FIRDataStore } from "@/stores/firStore";

const STATO_MAP: Record<string, string> = {
  "1": "Solido pulverulento",
  "2": "Solido non pulverulento",
  "3": "Fangoso palabile",
  "4": "Liquido",
  "5": "Aeriforme",
  "6": "Altro",
};

interface SummaryOptions {
  qrCodeBase64?: string;
}

export async function generateFIRSummaryPdf(
  data: FIRDataStore,
  options: SummaryOptions = {}
): Promise<Blob> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210;
  const margin = 15;
  const contentW = W - margin * 2;
  let y = margin;

  // ── Header ──
  doc.setFillColor(0, 0, 80);
  doc.rect(0, 0, W, 35, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(18);
  doc.text("RIEPILOGO VIAGGIO FIR", margin, 18);
  doc.setFontSize(10);
  doc.setFont("Helvetica", "normal");
  doc.text(`Numero: ${data.selectedFirNumber || "N/A"}`, margin, 28);
  doc.text(`Data: ${data.dataEmissione || new Date().toLocaleDateString("it-IT")}`, W - margin, 28, { align: "right" });

  // QR Code in header (right side)
  if (options.qrCodeBase64) {
    try {
      doc.addImage(options.qrCodeBase64, "PNG", W - margin - 25, 4, 25, 25);
    } catch (e) {
      console.warn("QR code image failed:", e);
    }
  }

  y = 42;

  // Helper functions
  const sectionTitle = (title: string) => {
    doc.setFillColor(240, 240, 250);
    doc.rect(margin, y - 4, contentW, 7, "F");
    doc.setTextColor(0, 0, 80);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(10);
    doc.text(title, margin + 2, y);
    y += 8;
  };

  const row = (label: string, value: string) => {
    if (!value) return;
    doc.setTextColor(100, 100, 100);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.text(label, margin + 2, y);
    doc.setTextColor(0, 0, 0);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    doc.text(value, margin + 55, y);
    y += 5;
  };

  const separator = () => {
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, W - margin, y);
    y += 3;
  };

  // ── 1. Produttore ──
  sectionTitle("1. PRODUTTORE / DETENTORE");
  row("Denominazione:", data.produttoreDenominazione);
  row("Codice Fiscale:", data.produttoreCF);
  row("Unità Locale:", data.produttoreUnitaLocale);
  if (data.cantiereIndirizzo) {
    row("Cantiere:", `${data.cantiereIndirizzo} ${data.cantiereComune} (${data.cantiereProvincia})`);
  }
  separator();

  // ── 2. Destinatario ──
  sectionTitle("3. DESTINATARIO");
  row("Denominazione:", data.destinatarioDenominazione);
  row("Codice Fiscale:", data.destinatarioCF);
  row("Unità Locale:", data.destinatarioUnitaLocale);
  row("Operazione:", data.destinatarioOperazione);
  row("Autorizzazione:", data.destinatarioNumeroAut);
  separator();

  // ── 3. Trasportatore ──
  sectionTitle("4. TRASPORTATORE");
  row("Denominazione:", data.trasportatoreDenominazione);
  row("Codice Fiscale:", data.trasportatoreCF);
  row("Iscrizione Albo:", data.trasportatoreNumeroAlbo);
  row("Conducente:", data.conducenteNomeCognome || data.trasportatoreNomeAutista);
  row("Targa:", data.targaAutomezzo);
  if (data.targaRimorchio) row("Rimorchio:", data.targaRimorchio);
  separator();

  // ── 4. Intermediario ──
  if (data.intermediarioDenominazione) {
    sectionTitle("5. INTERMEDIARIO");
    row("Denominazione:", data.intermediarioDenominazione);
    row("Codice Fiscale:", data.intermediarioCF);
    row("Iscrizione Albo:", data.intermediarioNumeroAlbo);
    separator();
  }

  // ── 5. Rifiuto ──
  sectionTitle("6. CARATTERISTICHE DEL RIFIUTO");
  row("Codice EER:", data.codiceEER);
  row("Descrizione:", data.descrizione);
  row("Stato Fisico:", STATO_MAP[data.statoFisico] || data.statoFisico);
  row("Quantità:", `${data.quantita} ${data.unitaMisura}`);
  if (data.pesoRicevuto) row("Peso a Destino:", `${data.pesoRicevuto} kg`);
  row("Provenienza:", data.provenienza === "urbano" ? "Urbano" : "Speciale");
  if (data.caratteristicheHP?.length > 0) {
    row("HP:", data.caratteristicheHP.join(", "));
  }
  if (data.trasportoADR) {
    row("ADR:", `Classe ${data.adrClassePericolo} - ONU ${data.adrNumeroONU}`);
  }
  separator();

  // ── 6. Trasporto ──
  sectionTitle("8-9. DATI TRASPORTO");
  row("Inizio:", `${data.oraDataInizioTrasporto} ${data.oraInizioTrasporto}`);
  if (data.dataFineTrasporto) row("Fine:", `${data.dataFineTrasporto} ${data.oraFineTrasporto}`);
  if (data.percorsoDiverso) row("Percorso:", data.percorsoDiverso);
  separator();

  // ── Annotazioni: vidimazione virtuale + numero FIR ──
  y += 4;
  sectionTitle("17. ANNOTAZIONI");
  doc.setTextColor(30, 30, 30);
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(7.5);
  const vidLines = doc.splitTextToSize(
    buildVidimazioneLabel(options.cliente, options.producedAt),
    contentW - 34,
  );
  doc.text(vidLines, margin + 2, y);
  y += vidLines.length * 4 + 2;

  // QR RENTRI 28x28 mm in basso a destra + numero FIR sotto
  if (options.qrCodeBase64) {
    try {
      doc.addImage(options.qrCodeBase64, "PNG", W - margin - 28, 232, 28, 28);
    } catch (e) {
      console.warn("QR code image failed:", e);
    }
  }
  doc.setTextColor(0, 0, 128);
  doc.setFont("Courier", "bold");
  doc.setFontSize(11);
  doc.text(data.selectedFirNumber || "", W - margin, 266, { align: "right" });

  // ── Footer ──
  y += 5;
  doc.setTextColor(150, 150, 150);
  doc.setFont("Helvetica", "italic");
  doc.setFontSize(7);
  doc.text("Documento generato automaticamente - Riepilogo non sostitutivo del formulario ministeriale", margin, 285);
  doc.text(`Generato il ${new Date().toLocaleString("it-IT")}`, W - margin, 285, { align: "right" });


  return doc.output("blob");
}
