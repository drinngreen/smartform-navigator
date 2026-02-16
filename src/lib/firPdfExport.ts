/**
 * FIR PDF Export – Generazione PDF ministeriale A4 con coordinate millimetriche.
 * Usa jsPDF per produrre 3 pagine: Formulario, Integrazione, Intermodale.
 * Font: Courier 9pt blu scuro (#000080). QR 28x28mm.
 * Coordinate normalizzate 0-1 rapportate a 210x297mm.
 */
import { jsPDF } from "jspdf";
import type { FIRDataStore } from "@/stores/firStore";

// ── A4 dimensions in mm ────────────────────────────────
const W = 210;
const H = 297;

// ── Helpers ─────────────────────────────────────────────
/** Convert normalized (0-1) coords to mm */
const nx = (n: number) => n * W;
const ny = (n: number) => n * H;

function setFont(doc: jsPDF, size = 9) {
  doc.setFont("Courier", "normal");
  doc.setFontSize(size);
  doc.setTextColor(0, 0, 128); // #000080
}

function txt(doc: jsPDF, text: string, xNorm: number, yNorm: number, size = 9) {
  if (!text) return;
  setFont(doc, size);
  doc.text(text, nx(xNorm), ny(yNorm));
}

function txtR(doc: jsPDF, text: string, xNorm: number, yNorm: number, size = 9) {
  if (!text) return;
  setFont(doc, size);
  doc.text(text, nx(xNorm), ny(yNorm), { align: "right" });
}

/** Draw an "X" mark for checkboxes */
function mark(doc: jsPDF, xNorm: number, yNorm: number) {
  setFont(doc, 12);
  doc.text("X", nx(xNorm), ny(yNorm));
}

// ── Stato fisico label ──────────────────────────────────
const STATO_MAP: Record<string, string> = {
  "1": "Solido pulverulento",
  "2": "Solido non pulverulento",
  "3": "Fangoso palabile",
  "4": "Liquido",
  "5": "Aeriforme",
  "6": "Altro",
};

// ── MAIN EXPORT ─────────────────────────────────────────
export async function generateFIRPdf(formData: FIRDataStore): Promise<Blob> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const d = formData;

  // ════════════════════════════════════════════════════════
  // PAGINA 1 – FORMULARIO
  // ════════════════════════════════════════════════════════

  // ── Numero FIR (top right) ──
  txt(doc, d.selectedFirNumber || d.numeroRegistro, 0.72, 0.045, 11);

  // ── Data emissione ──
  txt(doc, d.dataEmissione, 0.15, 0.075);

  // ── Registro SI/NO ──
  if (d.registroSi) mark(doc, 0.60, 0.075);
  else mark(doc, 0.68, 0.075);

  // ── Numero registro ──
  txt(doc, d.numeroRegistro, 0.78, 0.075);

  // ── SEZIONE 1: PRODUTTORE ──
  txt(doc, d.produttoreDenominazione, 0.05, 0.125);
  txt(doc, d.produttoreUnitaLocale, 0.05, 0.145);
  txt(doc, d.produttoreCF, 0.55, 0.125);
  txt(doc, d.produttoreLuogoProduzioneDiverso, 0.05, 0.165);
  txt(doc, d.produttoreNumeroAut, 0.55, 0.145);
  txt(doc, d.produttoreTipoAut, 0.80, 0.145);
  txt(doc, d.produttoreDataAut, 0.55, 0.165);

  // ── Detentore ──
  if (d.isDetentore) {
    mark(doc, 0.05, 0.185);
    txt(doc, d.detentoreDenominazione, 0.15, 0.185);
    txt(doc, d.detentoreUnitaLocale, 0.15, 0.200);
    txt(doc, d.detentoreCF, 0.55, 0.185);
    txt(doc, d.detentoreNumeroAut, 0.55, 0.200);
    txt(doc, d.detentoreTipoAut, 0.80, 0.200);
  }

  // ── Cantiere ──
  if (d.cantiereIndirizzo) {
    txt(doc, d.cantiereIndirizzo, 0.05, 0.215);
    txt(doc, `${d.cantiereComune} (${d.cantiereProvincia})`, 0.05, 0.230);
    txt(doc, d.cantiereCAP, 0.55, 0.230);
  }

  // ── SEZIONE 3: DESTINATARIO ──
  txt(doc, d.destinatarioDenominazione, 0.05, 0.260);
  txt(doc, d.destinatarioUnitaLocale, 0.05, 0.278);
  txt(doc, d.destinatarioCF, 0.55, 0.260);
  txt(doc, d.destinatarioOperazione, 0.55, 0.278);
  txt(doc, d.destinatarioCodiceOperazione, 0.65, 0.278);
  txt(doc, d.destinatarioNumeroAut, 0.55, 0.295);
  txt(doc, d.destinatarioTipoAut, 0.80, 0.295);
  txt(doc, d.destinatarioDataAut, 0.55, 0.310);

  // ── SEZIONE 4: TRASPORTATORE ──
  txt(doc, d.trasportatoreDenominazione, 0.05, 0.340);
  txt(doc, d.trasportatoreCF, 0.55, 0.340);
  txt(doc, d.trasportatoreNumeroAlbo, 0.05, 0.358);
  txt(doc, d.trasportatoreDataAlbo, 0.35, 0.358);
  txt(doc, d.trasportatoreSituatoIn, 0.55, 0.358);
  txt(doc, d.trasportatoreNomeAutista, 0.05, 0.375);

  // ── SEZIONE 5: INTERMEDIARIO ──
  txt(doc, d.intermediarioDenominazione, 0.05, 0.405);
  txt(doc, d.intermediarioCF, 0.55, 0.405);
  txt(doc, d.intermediarioNumeroAlbo, 0.05, 0.420);

  // ── SEZIONE 6: CARATTERISTICHE RIFIUTO ──
  txt(doc, d.codiceEER, 0.05, 0.455, 7); // EER in 7pt
  txt(doc, d.descrizione, 0.20, 0.455);
  txt(doc, STATO_MAP[d.statoFisico] || d.statoFisico, 0.05, 0.475, 5); // Stato in 5pt
  txt(doc, d.provenienza === "urbano" ? "Urbano" : "Speciale", 0.35, 0.475);
  txt(doc, d.quantita ? `${d.quantita} Kg` : "", 0.55, 0.455);
  txt(doc, d.quantitaLitri ? `${d.quantitaLitri} L` : "", 0.75, 0.455);
  txt(doc, d.aspettoEsteriore === "colli" ? "Colli" : "Rinfusa", 0.55, 0.475);
  txt(doc, d.numeroColli ? `N. ${d.numeroColli}` : "", 0.75, 0.475);

  // HP
  if (d.caratteristicheHP.length > 0) {
    txt(doc, d.caratteristicheHP.join(", "), 0.05, 0.495);
  }

  // Verificato partenza
  if (d.verificatoPartenza) mark(doc, 0.55, 0.495);

  // Analisi
  if (d.analisiRapportiProva) {
    mark(doc, 0.05, 0.515);
    txt(doc, d.analisiNumero, 0.20, 0.515);
    txt(doc, d.analisiValidaAl, 0.55, 0.515);
  }
  if (d.classificazione) {
    mark(doc, 0.05, 0.530);
    txt(doc, d.classificazioneNumero, 0.20, 0.530);
    txt(doc, d.classificazioneValidaAl, 0.55, 0.530);
  }

  // ── SEZIONE 7: ADR ──
  if (d.trasportoADR) {
    mark(doc, 0.05, 0.555);
    txt(doc, d.adrClassePericolo, 0.20, 0.555);
    txt(doc, d.adrNumeroONU, 0.45, 0.555);
    txt(doc, d.adrNote, 0.65, 0.555);
  }

  // ── SEZIONE 8-9: CONDUCENTE E TRASPORTO ──
  txt(doc, d.conducenteNomeCognome, 0.05, 0.590);
  txt(doc, d.oraDataInizioTrasporto, 0.55, 0.590);
  txt(doc, d.oraInizioTrasporto, 0.80, 0.590);
  txt(doc, d.targaAutomezzo, 0.05, 0.610);
  txt(doc, d.targaRimorchio, 0.35, 0.610);
  txt(doc, d.percorsoDiverso, 0.55, 0.610);

  // ── SEZIONE 10: ALLEGATI ──
  if (d.allegatoMicroraccolta) mark(doc, 0.05, 0.640);
  if (d.allegatoIntermodale) mark(doc, 0.30, 0.640);

  // ── SEZIONE 12: ACCETTAZIONE DESTINATARIO ──
  txt(doc, d.dataOraArrivo, 0.05, 0.695);
  if (d.accettazione === "intero") mark(doc, 0.45, 0.695);
  if (d.accettazione === "parziale") {
    mark(doc, 0.55, 0.695);
    txt(doc, d.quantitaAccettata, 0.70, 0.695);
  }
  if (d.accettazione === "respinto") {
    mark(doc, 0.65, 0.695);
    txt(doc, d.causaleRespingimento, 0.05, 0.720);
    txt(doc, d.motivazioneRespingimento, 0.05, 0.735);
  }
  txt(doc, d.pesoRicevuto ? `${d.pesoRicevuto} Kg` : "", 0.55, 0.720);
  txt(doc, d.dataRicezione, 0.05, 0.750);
  txt(doc, d.oraRicezione, 0.35, 0.750);
  if (d.inAttesaVerificaAnalitica) mark(doc, 0.55, 0.750);

  // ── SEZIONE 17: ANNOTAZIONI ──
  if (d.annotazioni) {
    setFont(doc, 7);
    const lines = doc.splitTextToSize(d.annotazioni, nx(0.85));
    doc.text(lines, nx(0.05), ny(0.810));
  }

  // ── Footer: Quadrato vidimazione + Numero FIR ──
  doc.setDrawColor(0, 0, 128);
  doc.rect(nx(0.75), ny(0.92), 28, 28); // quadrato vidimazione 28x28mm
  txt(doc, d.selectedFirNumber || d.numeroRegistro, 0.05, 0.96, 8);

  // ════════════════════════════════════════════════════════
  // PAGINA 2 – INTEGRAZIONE (TRASBORDO)
  // ════════════════════════════════════════════════════════
  doc.addPage();

  // Numero FIR top right (dalla pagina 2)
  txt(doc, d.selectedFirNumber || d.numeroRegistro, 0.72, 0.045, 11);

  // ── SEZIONE 13: TRASBORDO PARZIALE ──
  txt(doc, d.trasbordoParzDenominazione, 0.05, 0.100);
  txt(doc, d.trasbordoParzCF, 0.55, 0.100);
  txt(doc, d.trasbordoParzAlbo, 0.05, 0.118);
  txt(doc, d.trasbordoParzCausale, 0.35, 0.118);
  txt(doc, d.trasbordoParzQuantitaResidua, 0.55, 0.118);
  txt(doc, d.trasbordoParzNuovoFir, 0.75, 0.118);

  // ── TRASBORDO TOTALE ──
  txt(doc, d.trasbordoTotDenominazione, 0.05, 0.160);
  txt(doc, d.trasbordoTotCF, 0.55, 0.160);
  txt(doc, d.trasbordoTotAlbo, 0.05, 0.178);
  txt(doc, d.trasbordoTotTarga, 0.35, 0.178);
  txt(doc, d.trasbordoTotRimorchio, 0.55, 0.178);
  txt(doc, d.trasbordoTotConducente, 0.05, 0.195);
  txt(doc, d.trasbordoTotDataPresaCarico, 0.55, 0.195);

  // ── SEZIONE 14: SOSTE TECNICHE ──
  txt(doc, d.sosta1Luogo, 0.05, 0.250);
  txt(doc, d.sosta1Inizio, 0.45, 0.250);
  txt(doc, d.sosta1Fine, 0.75, 0.250);

  txt(doc, d.sosta2Luogo, 0.05, 0.280);
  txt(doc, d.sosta2Inizio, 0.45, 0.280);
  txt(doc, d.sosta2Fine, 0.75, 0.280);

  txt(doc, d.sosta3Luogo, 0.05, 0.310);
  txt(doc, d.sosta3Inizio, 0.45, 0.310);
  txt(doc, d.sosta3Fine, 0.75, 0.310);

  // ── SEZIONE 15: SECONDO DESTINATARIO ──
  txt(doc, d.dest2Denominazione, 0.05, 0.365);
  txt(doc, d.dest2UnitaLocale, 0.05, 0.383);
  txt(doc, d.dest2CF, 0.55, 0.365);
  txt(doc, d.dest2Autorizzazione, 0.55, 0.383);
  txt(doc, d.dest2TipoAut, 0.80, 0.383);
  txt(doc, d.dest2DataAut, 0.55, 0.400);
  txt(doc, d.dest2Operazione, 0.05, 0.400);
  txt(doc, d.dest2CodiceOperazione, 0.20, 0.400);

  // ── SEZIONE 16-17: ANNOTAZIONI CONTINUAZIONE ──
  if (d.annotazioniContinuazione) {
    setFont(doc, 7);
    const lines = doc.splitTextToSize(d.annotazioniContinuazione, nx(0.85));
    doc.text(lines, nx(0.05), ny(0.450));
  }

  // Footer pagina 2
  doc.setDrawColor(0, 0, 128);
  doc.rect(nx(0.75), ny(0.92), 28, 28);
  txt(doc, d.selectedFirNumber || d.numeroRegistro, 0.05, 0.96, 8);

  // ════════════════════════════════════════════════════════
  // PAGINA 3 – INTERMODALE
  // ════════════════════════════════════════════════════════
  doc.addPage();

  txt(doc, d.selectedFirNumber || d.numeroRegistro, 0.72, 0.045, 11);

  // ── TERRESTRE ──
  txt(doc, d.interTerrDenominazione, 0.05, 0.120);
  txt(doc, d.interTerrCF, 0.55, 0.120);
  txt(doc, d.interTerrAlbo, 0.05, 0.140);
  txt(doc, d.interTerrConducente, 0.35, 0.140);
  txt(doc, d.interTerrTarga, 0.55, 0.140);
  txt(doc, d.interTerrRimorchio, 0.75, 0.140);

  // ── FERROVIARIO ──
  txt(doc, d.interFerroDenominazione, 0.05, 0.200);
  txt(doc, d.interFerroIdTreno, 0.55, 0.200);
  txt(doc, d.interFerroCF, 0.05, 0.218);
  txt(doc, d.interFerroTratta, 0.35, 0.218);
  if (d.interFerroRid) mark(doc, 0.75, 0.218);
  txt(doc, d.interFerroStazionePartenza, 0.05, 0.238);
  txt(doc, d.interFerroStazioneArrivo, 0.45, 0.238);
  txt(doc, d.interFerroDataPartenza, 0.05, 0.255);
  txt(doc, d.interFerroDataArrivo, 0.45, 0.255);

  // ── MARITTIMO ──
  txt(doc, d.interMareDenominazione, 0.05, 0.310);
  txt(doc, d.interMareIdNave, 0.55, 0.310);
  txt(doc, d.interMareCF, 0.05, 0.328);
  if (d.interMareImdg) mark(doc, 0.45, 0.328);
  txt(doc, d.interMarePortoPartenza, 0.05, 0.348);
  txt(doc, d.interMarePortoArrivo, 0.45, 0.348);
  txt(doc, d.interMareDataPartenza, 0.05, 0.365);
  txt(doc, d.interMareDataArrivo, 0.45, 0.365);

  // Footer pagina 3
  doc.setDrawColor(0, 0, 128);
  doc.rect(nx(0.75), ny(0.92), 28, 28);
  txt(doc, d.selectedFirNumber || d.numeroRegistro, 0.05, 0.96, 8);

  // ── Output ──
  return doc.output("blob");
}
