// Generatore HTML della ricevuta privati — layout identico al modulo cartaceo Multyproget

export type RicevutaMateriale = {
  cer: string | null;
  descrizione?: string | null;
  kg_pesati: number | null;
  prezzo_kg?: number | null;
  importo?: number | null;
};

export type RicevutaPrintData = {
  numero: string;
  data: string; // ISO
  destinatario: {
    nome: string;
    indirizzo?: string | null;
    cap?: string | null;
    comune?: string | null;
    provincia?: string | null;
    codice_fiscale?: string | null;
    partita_iva?: string | null;
    codice?: string | null;
  };
  causale?: string | null;
  condizioniPagamento?: string | null;
  materiali: RicevutaMateriale[];
  totale: number;
  note?: string | null;
  veicolo?: string | null;
  /** Se true stampa il layout "solo date": nessun numero progressivo di documento */
  soloData?: boolean;
};

const esc = (v: unknown) =>
  String(v ?? "")
    .split("&").join("&amp;")
    .split("<").join("&lt;")
    .split(">").join("&gt;")
    .split('"').join("&quot;")
    .split("'").join("&#039;");

const num = (v: number | null | undefined, dec = 2) =>
  Number(v ?? 0).toLocaleString("it-IT", { minimumFractionDigits: dec, maximumFractionDigits: dec });

/**
 * Completa i valori mancanti di ogni riga:
 * - se c'è il totale e il peso -> calcola il prezzo al kg
 * - se c'è il prezzo al kg e il peso -> calcola il totale
 */
export function normalizzaMateriali(materiali: RicevutaMateriale[]): RicevutaMateriale[] {
  return materiali.map((m) => {
    const kg = Number(m.kg_pesati) || 0;
    let prezzo = m.prezzo_kg != null && m.prezzo_kg !== ("" as any) ? Number(m.prezzo_kg) : null;
    let importo = m.importo != null && m.importo !== ("" as any) ? Number(m.importo) : null;
    if (importo == null && prezzo != null) importo = Math.round(prezzo * kg * 100) / 100;
    if (prezzo == null && importo != null && kg > 0) prezzo = Math.round((importo / kg) * 10000) / 10000;
    return { ...m, prezzo_kg: prezzo, importo };
  });
}

const RICEVUTA_CSS = `
  @page { size: A4; margin: 12mm; }
  html, body { background:#fff !important; color:#000 !important; margin:0; padding:0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; }
  .doc-page { page-break-after: always; }
  .doc-page:last-child { page-break-after: auto; }
  .titolo { text-align:center; font-weight:bold; font-size:13px; line-height:1.35; margin-bottom:18px; text-transform:uppercase; }
  .top { display:flex; justify-content:space-between; align-items:flex-start; gap:20px; margin-bottom:26px; }
  .cliente { border:1px solid #000; padding:10px 14px; min-width:300px; min-height:92px; }
  .cliente .nome { font-weight:bold; font-size:14px; margin-bottom:10px; text-transform:uppercase; }
  .cliente .riga { font-size:13px; line-height:1.5; }
  .mittente { text-align:right; font-size:11px; line-height:1.5; color:#1f7a34; }
  .mittente .nome { font-weight:bold; }
  table { width:100%; border-collapse:collapse; }
  .doc td, .doc th { border:1px solid #000; padding:3px 6px; vertical-align:top; }
  .lbl { font-size:8px; color:#000; display:block; }
  .val { font-size:12px; font-weight:bold; }
  .doc .center { text-align:center; }
  .items { margin-top:14px; }
  .items th { border:1px solid #000; background:#fff; font-size:10px; padding:3px 5px; }
  .items td { border-left:1px solid #000; border-right:1px solid #000; padding:3px 5px; font-size:11px; }
  .items tbody tr:first-child td { border-top:1px solid #000; }
  .items .c-art { width:14%; }
  .items .c-um { width:6%; text-align:center; }
  .items .c-num { width:12%; text-align:right; }
  .items .filler td { height:150px; border-bottom:1px solid #000; }
  .strong { font-weight:bold; }
  .tot-row td { border:1px solid #000; font-weight:bold; font-size:12px; padding:4px 6px; }
  .decl { border:1px solid #000; border-top:none; padding:10px 12px; }
  .decl p { margin:0 0 10px; text-align:justify; font-size:11.5px; font-weight:bold; line-height:1.45; }
  .firma { display:flex; align-items:flex-end; gap:12px; margin:16px 0 6px; }
  .firma .lab { font-weight:bold; font-size:12px; }
  .firma .lab small { display:block; font-weight:normal; }
  .dots { flex:1; border-bottom:1px dashed #000; height:14px; }
  .small { font-size:8.5px; text-align:center; line-height:1.5; }
  .privacy-title { text-align:center; font-size:9px; font-weight:bold; margin-top:10px; }
  .consensi { display:flex; justify-content:space-around; margin:14px 0 10px; font-size:12px; }
  .box { display:inline-block; width:11px; height:11px; border:1px solid #000; margin-right:6px; vertical-align:-1px; }
  .firma2 { display:flex; gap:24px; align-items:flex-end; margin-top:10px; font-size:11px; }
  .note-box { border:1px solid #000; border-top:none; padding:8px 12px; }
  .note-title { font-size:9px; font-weight:bold; letter-spacing:1px; margin-bottom:3px; }
  .note-body { font-size:11px; white-space:pre-wrap; }
  @media print { html, body { background:#fff !important; } button, input { display:none !important; } }
`;

/** Corpo di una singola ricevuta (una pagina A4) */
export function buildRicevutaBody(d: RicevutaPrintData): string {
  const righe = normalizzaMateriali(d.materiali);
  const totale = d.totale || righe.reduce((s, r) => s + (Number(r.importo) || 0), 0);

  const indirizzoRighe = [
    d.destinatario.indirizzo,
    [d.destinatario.cap, d.destinatario.comune, d.destinatario.provincia ? `- ${d.destinatario.provincia}` : ""]
      .filter(Boolean)
      .join(" ")
      .trim(),
  ].filter(Boolean);

  const righeHtml = righe
    .map(
      (r) => `<tr>
        <td class="c-art">${esc(r.cer ?? "")}</td>
        <td class="c-desc">${esc([r.cer ? `CER ${r.cer}` : "", r.descrizione ?? ""].filter(Boolean).join(" — "))}</td>
        <td class="c-um">Kg</td>
        <td class="c-num">${num(r.kg_pesati)}</td>
        <td class="c-num">${r.prezzo_kg != null ? num(r.prezzo_kg) : ""}</td>
        <td class="c-num">${r.importo != null ? num(r.importo) : ""}</td>
      </tr>`,
    )
    .join("");

  const veicoloHtml = d.veicolo
    ? `<tr><td class="c-art"></td><td class="c-desc strong">${esc(d.veicolo)}</td><td></td><td></td><td></td><td></td></tr>`
    : "";

  const noteHtml = d.note
    ? `<div class="note-box">
         <div class="note-title">NOTE</div>
         <div class="note-body">${esc(d.note).split("\n").join("<br/>")}</div>
       </div>`
    : "";

  const dataVal = esc(new Date(d.data).toLocaleDateString("it-IT"));

  // Layout "solo date": nessun numero progressivo di documento
  const testataHtml = d.soloData
    ? `<tr>
      <td class="center" style="width:22%"><span class="lbl">Data Doc.</span><span class="val">${dataVal}</span></td>
      <td style="width:48%"><span class="lbl">Partita Iva / Cod. Fiscale</span><span class="val">${esc(d.destinatario.partita_iva ?? "")} / ${esc(d.destinatario.codice_fiscale ?? "")}</span></td>
      <td class="center" style="width:18%"><span class="lbl">Codice</span><span class="val">${esc(d.destinatario.codice ?? "")}</span></td>
      <td class="center" style="width:12%"><span class="lbl">Pag.</span><span class="val">1/1</span></td>
    </tr>
    <tr>
      <td><span class="lbl">Causale del trasporto</span><span class="val">${esc(d.causale || "ACQUISTO")}</span></td>
      <td colspan="3"><span class="lbl">Banca d'appoggio</span><span class="val">&nbsp;</span></td>
    </tr>
    <tr>
      <td><span class="lbl">Cond. Pagamento</span><span class="val">${esc(d.condizioniPagamento || "")}</span></td>
      <td colspan="3"><span class="lbl">Filiale</span><span class="val">&nbsp;</span></td>
    </tr>`
    : `<tr>
      <td class="center" style="width:18%"><span class="lbl">N. Documento</span><span class="val">${esc(d.numero)}</span></td>
      <td class="center" style="width:15%"><span class="lbl">Data Doc.</span><span class="val">${dataVal}</span></td>
      <td style="width:42%"><span class="lbl">Partita Iva / Cod. Fiscale</span><span class="val">${esc(d.destinatario.partita_iva ?? "")} / ${esc(d.destinatario.codice_fiscale ?? "")}</span></td>
      <td class="center" style="width:15%"><span class="lbl">Codice</span><span class="val">${esc(d.destinatario.codice ?? "")}</span></td>
      <td class="center" style="width:10%"><span class="lbl">Pag.</span><span class="val">1/1</span></td>
    </tr>
    <tr>
      <td colspan="2"><span class="lbl">Causale del trasporto</span><span class="val">${esc(d.causale || "ACQUISTO")}</span></td>
      <td colspan="3"><span class="lbl">Banca d'appoggio</span><span class="val">&nbsp;</span></td>
    </tr>
    <tr>
      <td colspan="2"><span class="lbl">Cond. Pagamento</span><span class="val">${esc(d.condizioniPagamento || "")}</span></td>
      <td colspan="3"><span class="lbl">Filiale</span><span class="val">&nbsp;</span></td>
    </tr>`;

  return `<div class="doc-page">
  <div class="titolo">Soggetto privato esonerato dall'emissione della fattura ai sensi<br/>dell'art 1 D.P.R. 633 e successive modifiche ed integrazioni</div>

  <div class="top">
    <div class="cliente">
      <div class="nome">${esc(d.destinatario.nome)}</div>
      ${indirizzoRighe.map((r) => `<div class="riga">${esc(r)}</div>`).join("")}
    </div>
    <div class="mittente">
      <div class="nome">MULTY PROGET S.R.L.</div>
      <div>Via Rivarossa, 18/20 - 10060 Piscina</div>
      <div>0121 570709</div>
      <div>info@multyproget.it</div>
      <div>P.IVA 1234 777 0013</div>
    </div>
  </div>

  <table class="doc">
    ${testataHtml}
  </table>

  <table class="items">
    <thead>
      <tr>
        <th class="c-art">Cod. Articolo</th>
        <th>Descrizione</th>
        <th class="c-um">U.m.</th>
        <th class="c-num">Quantità</th>
        <th class="c-num">Prezzo</th>
        <th class="c-num">Totale</th>
      </tr>
    </thead>
    <tbody>
      ${righeHtml}
      ${veicoloHtml}
      <tr class="filler"><td></td><td></td><td></td><td></td><td></td><td></td></tr>
      <tr class="tot-row">
        <td colspan="4" style="border:none"></td>
        <td>TOTALE</td>
        <td style="text-align:right">${num(totale)}</td>
      </tr>
    </tbody>
  </table>

  ${noteHtml}

  <div class="decl">
    <p>Il sottoscritto dichiara di non essere soggetto all'applicazione della normativa IVA in quanto "PRIVATO" Art. 1,4,5 DPR 633/72. Dichiara inoltre che la merce elencata è di propria provenienza e che non è obbligato alla compilazione del formulario</p>
    <p>Il cedente attesta di essere stato pagato in pari data per l'intero importo della merce venduta.</p>

    <div class="firma">
      <div class="lab">FIRMA<small>(leggibile)</small></div>
      <div class="dots"></div>
    </div>

    <div class="small">Cessione in regime di riverse charge. Esente da bollo art.6 tabella B - D.P.R. 642/72 Senza addebito IVA art.74 comma 8° e 9° del D.P.R. 633/72</div>
    <div class="privacy-title">INFORMATIVA PRIVACY<br/><span style="font-weight:normal">ex. art 13 D.lgs 196/2003</span></div>
    <div class="small">Ai sensi dell'articolo 13 del D.Lgs 196/2003, l'interessato: presta il suo consenso al trattamento dei dati personali per i fini indicati della suddetta normativa?</div>

    <div class="consensi">
      <div><span class="box"></span>Do il consenso</div>
      <div><span class="box"></span>Nego il consenso</div>
    </div>

    <div class="firma2">
      <div class="dots"></div>
      <div style="white-space:nowrap">,</div>
      <div class="dots"></div>
      <div style="white-space:nowrap">Firma</div>
      <div class="dots"></div>
    </div>
  </div>
  </div>`;
}

function wrapDocument(title: string, bodies: string[]): string {
  return `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8" />
<meta name="color-scheme" content="only light" />
<title>${esc(title)}</title>
<style>${RICEVUTA_CSS}</style>
</head>
<body>
${bodies.join("\n")}
</body>
</html>`;
}

export function buildRicevutaHtml(d: RicevutaPrintData): string {
  return wrapDocument(`Ricevuta ${d.soloData ? new Date(d.data).toLocaleDateString("it-IT") : d.numero}`, [
    buildRicevutaBody(d),
  ]);
}

export function buildRicevuteHtml(list: RicevutaPrintData[], title = "Ricevute"): string {
  return wrapDocument(title, list.map(buildRicevutaBody));
}

function apriEStampa(html: string) {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
  setTimeout(() => {
    try {
      w.focus();
      w.print();
    } catch {
      /* popup bloccato */
    }
  }, 350);
}

export function stampaRicevuta(d: RicevutaPrintData) {
  apriEStampa(buildRicevutaHtml(d));
}

/** Stampa/scarica più ricevute in un unico documento (una per pagina) */
export function stampaRicevute(list: RicevutaPrintData[], title = "Ricevute") {
  if (!list.length) return;
  apriEStampa(buildRicevuteHtml(list, title));
}
