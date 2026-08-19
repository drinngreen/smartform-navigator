// FatturaPA XML builder (FPR12) — copia server-side allineata a src/lib/fatturaPA.ts
const CEDENTE = {
  denominazione: "MULTYPROGET S.R.L.",
  partitaIva: "12347770013",
  codiceFiscale: "12347770013",
  regimeFiscale: "RF01",
  indirizzo: "Via Rivarossa 18/20",
  cap: "10060",
  comune: "Piscina",
  provincia: "TO",
  nazione: "IT",
};

const esc = (s: any) =>
  String(s ?? "").replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[c]!));

const num = (v: any, d = 2) => Number(v || 0).toFixed(d);

export type FatturaRiga = {
  descrizione: string;
  quantita: number;
  unita_misura: string;
  prezzo_unitario: number;
  imponibile: number;
  aliquota_iva: number;
  reverse_charge?: boolean;
};

export function buildFatturaPAXml(f: any, righe: FatturaRiga[]): string {
  const totale = Number(f.totale || 0);
  const codDest = f.cliente_codice_destinatario || "0000000";
  const progressivo = String(f.numero).padStart(5, "0");
  const numeroCompleto = f.numero_completo || `${f.numero}/${f.anno}`;

  const groups = new Map<string, { imp: number; iva: number; aliquota: number; natura?: string }>();
  righe.forEach((r) => {
    const rc = !!r.reverse_charge;
    const key = rc ? "RC" : String(r.aliquota_iva);
    const g = groups.get(key) || { imp: 0, iva: 0, aliquota: rc ? 0 : r.aliquota_iva, natura: rc ? "N6.1" : undefined };
    g.imp += Number(r.imponibile);
    g.iva += rc ? 0 : Number(r.imponibile) * (r.aliquota_iva / 100);
    groups.set(key, g);
  });

  const dettaglioLinee = righe
    .map(
      (r, i) => `
      <DettaglioLinee>
        <NumeroLinea>${i + 1}</NumeroLinea>
        <Descrizione>${esc(r.descrizione).slice(0, 1000)}</Descrizione>
        <Quantita>${num(r.quantita, 2)}</Quantita>
        <UnitaMisura>${esc(r.unita_misura || "n").slice(0, 10)}</UnitaMisura>
        <PrezzoUnitario>${num(r.prezzo_unitario, 2)}</PrezzoUnitario>
        <PrezzoTotale>${num(r.imponibile, 2)}</PrezzoTotale>
        <AliquotaIVA>${num(r.reverse_charge ? 0 : r.aliquota_iva, 2)}</AliquotaIVA>
        ${r.reverse_charge ? `<Natura>N6.1</Natura>` : ""}
      </DettaglioLinee>`
    )
    .join("");

  const datiRiepilogo = Array.from(groups.values())
    .map(
      (g) => `
      <DatiRiepilogo>
        <AliquotaIVA>${num(g.aliquota, 2)}</AliquotaIVA>
        ${g.natura ? `<Natura>${g.natura}</Natura>` : ""}
        <ImponibileImporto>${num(g.imp, 2)}</ImponibileImporto>
        <Imposta>${num(g.iva, 2)}</Imposta>
        ${g.natura ? `<RiferimentoNormativo>Art.74 co.7 DPR 633/72 - inversione contabile</RiferimentoNormativo>` : ""}
      </DatiRiepilogo>`
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<p:FatturaElettronica versione="FPR12" xmlns:p="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2">
  <FatturaElettronicaHeader>
    <DatiTrasmissione>
      <IdTrasmittente><IdPaese>IT</IdPaese><IdCodice>${esc(CEDENTE.partitaIva)}</IdCodice></IdTrasmittente>
      <ProgressivoInvio>${esc(progressivo)}</ProgressivoInvio>
      <FormatoTrasmissione>FPR12</FormatoTrasmissione>
      <CodiceDestinatario>${esc(codDest)}</CodiceDestinatario>
    </DatiTrasmissione>
    <CedentePrestatore>
      <DatiAnagrafici>
        <IdFiscaleIVA><IdPaese>IT</IdPaese><IdCodice>${esc(CEDENTE.partitaIva)}</IdCodice></IdFiscaleIVA>
        <CodiceFiscale>${esc(CEDENTE.codiceFiscale)}</CodiceFiscale>
        <Anagrafica><Denominazione>${esc(CEDENTE.denominazione)}</Denominazione></Anagrafica>
        <RegimeFiscale>${CEDENTE.regimeFiscale}</RegimeFiscale>
      </DatiAnagrafici>
      <Sede>
        <Indirizzo>${esc(CEDENTE.indirizzo)}</Indirizzo>
        <CAP>${CEDENTE.cap}</CAP>
        <Comune>${esc(CEDENTE.comune)}</Comune>
        <Provincia>${CEDENTE.provincia}</Provincia>
        <Nazione>${CEDENTE.nazione}</Nazione>
      </Sede>
    </CedentePrestatore>
    <CessionarioCommittente>
      <DatiAnagrafici>
        ${f.cliente_partita_iva ? `<IdFiscaleIVA><IdPaese>IT</IdPaese><IdCodice>${esc(f.cliente_partita_iva)}</IdCodice></IdFiscaleIVA>` : ""}
        ${f.cliente_codice_fiscale ? `<CodiceFiscale>${esc(f.cliente_codice_fiscale)}</CodiceFiscale>` : ""}
        <Anagrafica><Denominazione>${esc(f.cliente_ragione_sociale)}</Denominazione></Anagrafica>
      </DatiAnagrafici>
      <Sede>
        <Indirizzo>${esc(f.cliente_indirizzo || "N.D.")}</Indirizzo>
        <CAP>00000</CAP>
        <Comune>${esc("N.D.")}</Comune>
        <Nazione>IT</Nazione>
      </Sede>
    </CessionarioCommittente>
  </FatturaElettronicaHeader>
  <FatturaElettronicaBody>
    <DatiGenerali>
      <DatiGeneraliDocumento>
        <TipoDocumento>TD01</TipoDocumento>
        <Divisa>EUR</Divisa>
        <Data>${esc(f.data_emissione)}</Data>
        <Numero>${esc(numeroCompleto)}</Numero>
        <ImportoTotaleDocumento>${num(totale, 2)}</ImportoTotaleDocumento>
        ${f.note ? `<Causale>${esc(String(f.note).slice(0, 200))}</Causale>` : ""}
      </DatiGeneraliDocumento>
    </DatiGenerali>
    <DatiBeniServizi>
      ${dettaglioLinee}
      ${datiRiepilogo}
    </DatiBeniServizi>
  </FatturaElettronicaBody>
</p:FatturaElettronica>`;
}
