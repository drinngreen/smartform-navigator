// Real FatturaPA XML builder (FPR12) — minimal but SDI-valid structure.
import { supabase } from "@/lib/supabaseClient";
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
const esc = (s) => String(s ?? "").replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[c]));
const num = (v, d = 2) => Number(v || 0).toFixed(d);
export function buildFatturaPAXml(f, righe) {
    const totale = Number(f.totale || 0);
    const codDest = f.cliente_codice_destinatario || "0000000";
    const progressivo = String(f.numero).padStart(5, "0");
    // Group rows by IVA rate to build DatiRiepilogo
    const groups = new Map();
    righe.forEach((r) => {
        const rc = !!r.reverse_charge;
        const key = rc ? "RC" : String(r.aliquota_iva);
        const g = groups.get(key) || { imp: 0, iva: 0, aliquota: rc ? 0 : r.aliquota_iva, natura: rc ? "N6.1" : undefined };
        g.imp += Number(r.imponibile);
        g.iva += rc ? 0 : Number(r.imponibile) * (r.aliquota_iva / 100);
        groups.set(key, g);
    });
    const cedenteBlock = `
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
    </CedentePrestatore>`;
    const cessionarioBlock = `
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
    </CessionarioCommittente>`;
    const dettaglioLinee = righe
        .map((r, i) => `
      <DettaglioLinee>
        <NumeroLinea>${i + 1}</NumeroLinea>
        <Descrizione>${esc(r.descrizione).slice(0, 1000)}</Descrizione>
        <Quantita>${num(r.quantita, 2)}</Quantita>
        <UnitaMisura>${esc(r.unita_misura || "n").slice(0, 10)}</UnitaMisura>
        <PrezzoUnitario>${num(r.prezzo_unitario, 2)}</PrezzoUnitario>
        <PrezzoTotale>${num(r.imponibile, 2)}</PrezzoTotale>
        <AliquotaIVA>${num(r.reverse_charge ? 0 : r.aliquota_iva, 2)}</AliquotaIVA>
        ${r.reverse_charge ? `<Natura>N6.1</Natura>` : ""}
      </DettaglioLinee>`)
        .join("");
    const datiRiepilogo = Array.from(groups.values())
        .map((g) => `
      <DatiRiepilogo>
        <AliquotaIVA>${num(g.aliquota, 2)}</AliquotaIVA>
        ${g.natura ? `<Natura>${g.natura}</Natura>` : ""}
        <ImponibileImporto>${num(g.imp, 2)}</ImponibileImporto>
        <Imposta>${num(g.iva, 2)}</Imposta>
        ${g.natura ? `<RiferimentoNormativo>Art.74 co.7 DPR 633/72 - inversione contabile</RiferimentoNormativo>` : ""}
      </DatiRiepilogo>`)
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
    ${cedenteBlock}
    ${cessionarioBlock}
  </FatturaElettronicaHeader>
  <FatturaElettronicaBody>
    <DatiGenerali>
      <DatiGeneraliDocumento>
        <TipoDocumento>TD01</TipoDocumento>
        <Divisa>EUR</Divisa>
        <Data>${esc(f.data_emissione)}</Data>
        <Numero>${esc(f.numero_completo)}</Numero>
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
/** Crea la scrittura di Prima Nota collegata alla fattura usando i conti ERP di default */
export async function creaPrimaNotaDaFattura(f, tipo = "servizi") {
    if (!f.tenant_id)
        throw new Error("tenant mancante");
    // Recupera conti ERP di default
    const [cliRes, ricRes, ivaRes, causaleRes] = await Promise.all([
        supabase.from("erp_piano_conti").select("id").eq("tenant_id", f.tenant_id).eq("codice", "20.10.001").maybeSingle(),
        supabase.from("erp_piano_conti").select("id").eq("tenant_id", f.tenant_id).eq("codice", tipo === "noleggio" ? "40.10.002" : "40.10.001").maybeSingle(),
        supabase.from("erp_piano_conti").select("id").eq("tenant_id", f.tenant_id).eq("codice", "25.20.001").maybeSingle(),
        supabase.from("erp_causali_contabili").select("id").eq("tenant_id", f.tenant_id).eq("codice", tipo === "noleggio" ? "FTV-NOL" : "FTV").maybeSingle(),
    ]);
    const conto_cliente_id = cliRes.data?.id;
    const conto_ricavi_id = ricRes.data?.id;
    const conto_iva_id = ivaRes.data?.id;
    const causale_id = causaleRes.data?.id;
    if (!conto_cliente_id || !conto_ricavi_id || !conto_iva_id) {
        throw new Error("Piano conti ERP non configurato: mancano conti Crediti/Ricavi/IVA.");
    }
    const { creaScritturaDaFatturaVendita } = await import("@/lib/primaNotaService");
    return creaScritturaDaFatturaVendita({
        tenant_id: f.tenant_id,
        fattura_id: f.id,
        numero_fattura: f.numero_completo,
        cliente_nome: f.cliente_ragione_sociale,
        imponibile: Number(f.imponibile || 0),
        iva: Number(f.iva || 0),
        totale: Number(f.totale || 0),
        conto_cliente_id,
        conto_ricavi_id,
        conto_iva_id,
        causale_id,
    });
}
