import { jsPDF } from "jspdf";

/**
 * Stampa del Registro Cronologico di Carico/Scarico nel MODELLO UFFICIALE RENTRI
 * (blocchi numerati 1..42, due movimenti per pagina A4 orizzontale).
 * Nessuna modifica ai dati: è solo un renderer di stampa.
 */

export interface RegistroRentriRow {
  numero_interno?: string | number | null;
  numero_movimento?: string | number | null;
  data_movimento?: string | null;
  cer?: string | null;
  descrizione?: string | null;
  carico_scarico?: string | null;
  tipo_operazione?: string | null;
  numero_formulario?: string | null;
  quantita?: number | string | null;
  peso_destino?: number | string | null;
  qta_scaricata?: number | string | null;
  data_ricezione?: string | null;
  luogo_produzione?: string | null;
  destinazione?: string | null;
  classi_pericolo?: string | null;
  stato_fisico?: string | null;
  annotazioni?: string | null;
  intermediario?: string | null;
  cod_intermed?: string | null;
  indirizzo_intermed?: string | null;
  indirizzo_cantiere?: string | null;
  cap_cantiere?: string | null;
  comune_cantiere?: string | null;
  provincia_cantiere?: string | null;
  data_emissione_formulario?: string | null;
  form_urbano?: boolean | string | null;
  [key: string]: unknown;
}

const it = (v?: string | null) => (v ? String(v).slice(0, 10).split("-").reverse().join("/") : "");
const num = (v: unknown) =>
  v === null || v === undefined || v === "" ? "" : Number(v).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const txt = (v: unknown) => (v === null || v === undefined ? "" : String(v));

export function stampaRegistroModelloRentri(
  rows: RegistroRentriRow[],
  filename: string,
  intestazione: { operatore: string; registro: string; periodo: string }
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4", compress: true });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 6;
  const blockH = (pageH - M * 2 - 12) / 2;

  const label = (t: string, x: number, y: number, size = 4.6) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(size);
    doc.setTextColor(90, 90, 90);
    doc.text(t, x, y);
  };
  const value = (t: string, x: number, y: number, maxW: number, size = 6) => {
    if (!t) return;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(size);
    doc.setTextColor(0, 0, 0);
    const lines = doc.splitTextToSize(t, maxW);
    doc.text(lines.slice(0, 3), x, y);
  };
  const section = (t: string, x: number, y: number, w: number) => {
    doc.setFillColor(238, 240, 244);
    doc.rect(x, y - 3.2, w, 4.4, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.4);
    doc.setTextColor(20, 20, 20);
    doc.text(t, x + 1, y);
  };
  const box = (x: number, y: number, w: number, h: number) => {
    doc.setDrawColor(150, 160, 180);
    doc.setLineWidth(0.15);
    doc.rect(x, y, w, h);
  };
  const check = (x: number, y: number, on: boolean) => {
    box(x, y, 3, 3);
    if (on) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6);
      doc.setTextColor(0, 0, 0);
      doc.text("X", x + 0.7, y + 2.4);
    }
  };

  const header = () => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text("REGISTRO CRONOLOGICO DI CARICO E SCARICO", M, M + 3);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(70, 70, 70);
    doc.text(`${intestazione.operatore} — ${intestazione.registro} — ${intestazione.periodo}`, M, M + 7);
  };

  const drawBlock = (r: RegistroRentriRow, top: number) => {
    const w = pageW - M * 2;
    const c1 = M;
    const w1 = w * 0.28;
    const c2 = c1 + w1;
    const w2 = w * 0.25;
    const c3 = c2 + w2;
    const w3 = w * 0.25;
    const c4 = c3 + w3;
    const w4 = w - w1 - w2 - w3;
    box(c1, top, w, blockH);
    doc.line(c2, top, c2, top + blockH);
    doc.line(c3, top, c3, top + blockH);
    doc.line(c4, top, c4, top + blockH);

    const isCarico = String(r.carico_scarico || "").toLowerCase().startsWith("c");
    let y = top + 5;

    /* ---- Col 1: RIFERIMENTI OPERAZIONE ---- */
    section("RIFERIMENTI OPERAZIONE", c1 + 1, y, w1 - 2);
    y += 5;
    label("1) Registrazione n.", c1 + 2, y);
    value(txt(r.numero_interno), c1 + 24, y, w1 - 26);
    y += 4.5;
    label("2) Del", c1 + 2, y);
    value(it(r.data_movimento), c1 + 24, y, w1 - 26);
    y += 5;
    label("3) Carico", c1 + 2, y);
    check(c1 + 16, y - 2.6, isCarico);
    label("4) Scarico", c1 + 24, y);
    check(c1 + 40, y - 2.6, !isCarico);
    y += 5;
    label("5) Riferimento operazione", c1 + 2, y);
    value(txt(r.numero_movimento), c1 + 40, y, w1 - 42);
    y += 4.5;
    label("Causale operazione", c1 + 2, y);
    value(txt(r.tipo_operazione), c1 + 30, y, w1 - 32);
    y += 4.5;
    label("6) Rettifica Reg. nr.", c1 + 2, y);
    y += 4.5;
    label("7) Stoccaggio istantaneo", c1 + 2, y);
    y += 5;
    label("Produttore o Detentore:", c1 + 2, y);
    y += 3.4;
    value(txt(r.luogo_produzione), c1 + 2, y, w1 - 4, 5.6);
    y += 7;
    label("42) Annotazioni:", c1 + 2, y);
    y += 3.4;
    value(txt(r.annotazioni), c1 + 2, y, w1 - 4, 5.2);

    /* ---- Col 2: IDENTIFICAZIONE DEL RIFIUTO ---- */
    let y2 = top + 5;
    section("IDENTIFICAZIONE DEL RIFIUTO", c2 + 1, y2, w2 - 2);
    y2 += 5;
    label("8) Codice EER", c2 + 2, y2);
    value(txt(r.cer), c2 + 22, y2, w2 - 24, 7);
    y2 += 5;
    label("9) Provenienza:", c2 + 2, y2);
    label("Urbano", c2 + 22, y2);
    check(c2 + 32, y2 - 2.6, String(r.form_urbano) === "true" || r.form_urbano === true);
    label("Speciale", c2 + 38, y2);
    check(c2 + 50, y2 - 2.6, !(String(r.form_urbano) === "true" || r.form_urbano === true));
    y2 += 5;
    label("10) Descrizione del rifiuto:", c2 + 2, y2);
    y2 += 3.4;
    value(txt(r.descrizione), c2 + 2, y2, w2 - 4, 5.6);
    y2 += 7;
    label("11) Caratteristica di Pericolo (HP):", c2 + 2, y2);
    value(txt(r.classi_pericolo), c2 + 2, y2 + 3.4, w2 - 4, 5.6);
    y2 += 8;
    label("12) Stato fisico", c2 + 2, y2);
    value(txt(r.stato_fisico), c2 + 24, y2, 12);
    y2 += 4.5;
    label("13) Unità di misura: kg", c2 + 2, y2);
    y2 += 4.5;
    label("14) Quantità", c2 + 2, y2);
    value(num(r.quantita), c2 + 22, y2, w2 - 24, 7);
    y2 += 5;
    label("15) Destinato a:", c2 + 2, y2);
    value(txt(r.destinazione), c2 + 24, y2, w2 - 26);

    /* ---- Col 3: INTEGRAZIONE FIR / ESITO / PROVENIENZA ---- */
    let y3 = top + 5;
    section("INTEGRAZIONE FIR / REGISTRO C/S", c3 + 1, y3, w3 - 2);
    y3 += 5;
    label("22) Num. Formulario", c3 + 2, y3);
    value(txt(r.numero_formulario), c3 + 30, y3, w3 - 32, 6.4);
    y3 += 4.5;
    label("23) Data inizio trasporto", c3 + 2, y3);
    value(it(r.data_emissione_formulario), c3 + 34, y3, w3 - 36);
    y3 += 5.5;
    section("ESITO CONFERIMENTO", c3 + 1, y3, w3 - 2);
    y3 += 5;
    label("24) Data fine trasporto", c3 + 2, y3);
    value(it(r.data_ricezione), c3 + 34, y3, w3 - 36);
    y3 += 4.5;
    label("25) Peso verificato a destino", c3 + 2, y3);
    value(num(r.peso_destino), c3 + 40, y3, w3 - 42);
    y3 += 4.5;
    label("27) Quantità", c3 + 2, y3);
    value(num(r.qta_scaricata), c3 + 22, y3, w3 - 24);
    y3 += 4.5;
    label("29) Causale", c3 + 2, y3);
    value(txt(r.tipo_operazione), c3 + 22, y3, w3 - 24, 5.4);
    y3 += 5.5;
    section("PROVENIENZA DEL RIFIUTO", c3 + 1, y3, w3 - 2);
    y3 += 5;
    label("30) Denominazione", c3 + 2, y3);
    y3 += 3.4;
    value(txt(r.luogo_produzione), c3 + 2, y3, w3 - 4, 5.6);
    y3 += 7;
    label("32) Indirizzo/luogo di produzione", c3 + 2, y3);
    y3 += 3.4;
    value(
      [r.indirizzo_cantiere, r.cap_cantiere, r.comune_cantiere, r.provincia_cantiere].filter(Boolean).join(" "),
      c3 + 2,
      y3,
      w3 - 4,
      5.6
    );

    /* ---- Col 4: Trasportatore / Destinatario / Intermediario ---- */
    let y4 = top + 5;
    section("Trasportatore", c4 + 1, y4, w4 - 2);
    y4 += 5;
    label("33) Denominazione", c4 + 2, y4);
    y4 += 8;
    label("34) Codice fiscale", c4 + 2, y4);
    y4 += 5;
    label("35) N. Iscrizione Albo", c4 + 2, y4);
    y4 += 6;
    section("Destinatario", c4 + 1, y4, w4 - 2);
    y4 += 5;
    label("36) Denominazione", c4 + 2, y4);
    y4 += 3.4;
    value(txt(r.destinazione), c4 + 2, y4, w4 - 4, 5.6);
    y4 += 6;
    label("37) Codice fiscale", c4 + 2, y4);
    y4 += 6;
    section("Intermediario o Commerciante", c4 + 1, y4, w4 - 2);
    y4 += 5;
    label("39) Denominazione", c4 + 2, y4);
    y4 += 3.4;
    value(txt(r.intermediario), c4 + 2, y4, w4 - 4, 5.6);
    y4 += 6;
    label("40) Codice fiscale", c4 + 2, y4);
    value(txt(r.cod_intermed), c4 + 26, y4, w4 - 28);
  };

  rows.forEach((r, i) => {
    const slot = i % 2;
    if (slot === 0) {
      if (i > 0) doc.addPage();
      header();
    }
    drawBlock(r, M + 10 + slot * (blockH + 2));
  });

  const pages = (doc as any).internal.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(130, 130, 130);
    doc.text(`Pagina ${p}/${pages}`, pageW - M - 18, pageH - 2.5);
  }

  doc.save(`${filename}.pdf`);
}
