import { XMLParser } from 'fast-xml-parser'
import { v4 as uuidv4 } from 'uuid'

export type OperatorInfo = { identificativoOperatore: string; codiceFiscale: string; numeroIscrizione: string }

function isUuidV4(s: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)
}

function formatEER(cer: string) {
  const digits = cer.replace(/[^0-9]/g, '')
  if (digits.length === 6) return `${digits.slice(0,2)}.${digits.slice(2,4)}.${digits.slice(4,6)}`
  if (/^\d{2}\.\d{2}\.\d{2}$/.test(cer)) return cer
  return cer
}

function normalizeUnita(_u: string) {
  return 'kg'
}

function toDecimalString(q: any) {
  const n = Number(String(q).replace(',', '.'))
  if (Number.isNaN(n)) throw new Error('Quantita non valida')
  return n.toFixed(2)
}

function extractNumeroRegistrazione(s: string) {
  const n = parseInt(String(s).replace(/\D/g, ''), 10)
  if (!Number.isFinite(n)) throw new Error('NumeroRegistrazione mancante')
  return n
}

function toIsoDate(d: string) {
  const m = d.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(m)) return m
  const dt = new Date(m)
  if (isNaN(dt.getTime())) throw new Error('DataRegistrazione non valida')
  const y = dt.getFullYear()
  const mm = String(dt.getMonth()+1).padStart(2,'0')
  const dd = String(dt.getDate()).padStart(2,'0')
  return `${y}-${mm}-${dd}`
}

export function generateRegistroXml(oldXmlContent: string, info: OperatorInfo) {
  const parser = new XMLParser({ ignoreAttributes: false })
  const obj = parser.parse(oldXmlContent)
  const root = obj?.registro_carico_scarico || obj
  const movs = root?.movimenti?.movimento
  const lista = Array.isArray(movs) ? movs : movs ? [movs] : []
  if (lista.length === 0) throw new Error('Nessun movimento rilevato nel file di origine')
  const now = new Date()
  const anno = now.getFullYear()
  const dataCreazione = now.toISOString()
  const numeroRegistrazioni = lista.length
  const header = `<?xml version="1.0" encoding="UTF-8"?>\n<rtr:DatiRegistro xmlns:rtr="http://www.rentri.gov.it/dati_registri/v1.0" xmlns:ds="http://www.w3.org/2000/09/xmldsig#" versione="1.0">\n  <Intestazione>\n    <IdentificativoOperatore>${info.identificativoOperatore}</IdentificativoOperatore>\n    <CodiceFiscale>${info.codiceFiscale}</CodiceFiscale>\n    <NumeroIscrizione>${info.numeroIscrizione}</NumeroIscrizione>\n  </Intestazione>\n  <Registrazioni anno="${anno}" dataCreazione="${dataCreazione}" numeroRegistrazioni="${numeroRegistrazioni}">`
  let body = ''
  const errors: string[] = []
  for (const m of lista) {
    try {
      const idVal = String(m.id || m.ID || '')
      const id = isUuidV4(idVal) ? idVal : uuidv4()
      const numero = extractNumeroRegistrazione(String(m.progressivo || m.NumeroRegistrazione || ''))
      const data = toIsoDate(String(m.data || m.DataRegistrazione || ''))
      const tipoRaw = String(m.tipo || m.TipoMovimento || '').toLowerCase()
      const tipo = tipoRaw.includes('scar') ? 'SC' : 'CA'
      const causale = tipo === 'CA' ? 'RE' : 'TE'
      const cerRaw = String(m.codice_cer || m.CodiceEER || '')
      const cer = formatEER(cerRaw)
      if (!/^(\d{2}\.\d{2}\.\d{2})(\*?)$/.test(cer)) throw new Error('CodiceEER non valido')
      const descr = String(m.descrizione || m.Descrizione || '')
      const stato = m.stato_fisico || m.StatoFisico || 1
      const quant = toDecimalString(m.quantita || m.Quantita || '0')
      const unita = normalizeUnita(String(m.unita_misura || m.UnitaMisura || 'KG'))
      let soggetti = ''
      if (tipo === 'SC') {
        const dest = m.destinatario || {}
        const tras = m.trasportatore || {}
        const destRS = String(dest.ragione_sociale || '')
        const destCF = String(dest.codice_fiscale || '')
        if (!destRS || !destCF) throw new Error('Destinatario mancante per movimento di scarico')
        let blocco = '      <Soggetti>\n        <Destinatario>\n          <RagioneSociale>'+destRS+'</RagioneSociale>\n          <CodiceFiscale>'+destCF+'</CodiceFiscale>\n        </Destinatario>\n'
        const trasRS = String(tras.ragione_sociale || '')
        const trasCF = String(tras.codice_fiscale || '')
        if (trasRS && trasCF) {
          blocco += '        <Trasportatore>\n          <RagioneSociale>'+trasRS+'</RagioneSociale>\n          <CodiceFiscale>'+trasCF+'</CodiceFiscale>\n        </Trasportatore>\n'
        }
        blocco += '      </Soggetti>\n'
        soggetti = blocco
      }
      body += `\n    <Movimento>\n      <IDMovimento>${id}</IDMovimento>\n      <NumeroRegistrazione>${numero}</NumeroRegistrazione>\n      <DataRegistrazione>${data}</DataRegistrazione>\n      <TipoMovimento>${tipo}</TipoMovimento>\n      <Causale>${causale}</Causale>\n      <DettaglioRifiuto>\n        <CodiceEER>${cer}</CodiceEER>\n        ${descr ? `<Descrizione>${descr.substring(0,250)}</Descrizione>\n        ` : ''}<StatoFisico>${stato}</StatoFisico>\n        <Quantita>${quant}</Quantita>\n        <UnitaMisura>${unita}</UnitaMisura>\n      </DettaglioRifiuto>\n${soggetti}    </Movimento>`
    } catch (e: any) {
      errors.push(String(e.message || e))
    }
  }
  const trailer = '\n  </Registrazioni>\n</rtr:DatiRegistro>'
  const xml = header + body + trailer
  return { xml, count: numeroRegistrazioni, errors }
}