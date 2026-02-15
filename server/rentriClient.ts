import axios from 'axios'
import { XMLParser } from 'fast-xml-parser'
import { CONFIG } from './config.ts'
import { getAuthHeaders } from './auth.ts'

const BRIDGE_URL = 'http://localhost:8765'
const parser = new XMLParser({ ignoreAttributes: false })

const REGISTRY_IDS: Record<string, string> = {
    'certificato.p12': 'R6QSWHZ6HJV',
    'multyproget.p12': 'RQEL39R7NS0'
};
const OPERATOR_IDS: Record<string, string> = {
    'certificato.p12': '08934760961',
    'multyproget.p12': '12347770013'
};

function formatCER(c: string) {
    if (!c) return "";
    let clean = c.toString().trim().replace(/[^0-9\*]/g, '');
    const hasStar = clean.includes('*');
    clean = clean.replace('*', '');
    if (clean.length === 6 && !clean.includes('.')) {
        clean = `${clean.substring(0, 2)}.${clean.substring(2, 4)}.${clean.substring(4, 6)}`;
    }
    return hasStar ? `${clean}*` : clean;
}

function formatUM(u: string) {
    if (!u) return "KG";
    const s = u.trim().toUpperCase();
    return (s === "KG" || s === "KILOGRAMMI" || s === "KGS") ? "KG" : (s === "LT" || s === "LITRI" ? "L" : s);
}

function formatDate(d: string) {
    if (!d) return new Date().toISOString().split('T')[0] + "T12:00:00+01:00";
    const ymd = d.includes("T") ? d.split("T")[0] : d;
    return `${ymd}T12:00:00+01:00`;
}

function formatTipo(t: string) { return (t || "CA").toUpperCase().startsWith("S") ? "SC" : "CA"; }
function determineCausale(t: string) { return t === "SC" ? "TE" : "RE"; }
function formatDesc(d: string) { return (d || "Movimento").substring(0, 250); }

export async function submitFir(xmlContent: string, filename: string, dateMovimento?: string, customRegistryId?: string) {
  const isMulty = filename.includes('multy')
  const isGlobal = filename.includes('certificato') || filename.includes('08934760961')
  if (!isMulty && !isGlobal) throw new Error('Unknown company for file: ' + filename)
  const registryId = customRegistryId || REGISTRY_IDS[filename] || (isMulty ? 'RQEL39R7NS0' : 'R6QSWHZ6HJV')
  const operatorId = OPERATOR_IDS[filename] || (isMulty ? '12347770013' : '08934760961')
  try {
    const list = buildMovimentiFromXml(xmlContent, dateMovimento)
    if (list.length === 0) throw new Error('No movements found in XML')
    const payload = JSON.stringify(list)
    const url = `https://api.rentri.gov.it/dati-registri/v1.0/operatore/${registryId}/movimenti`
    try {
      const bridgeRes = await axios.post(`${BRIDGE_URL}/send-registrazioni`, {
        url,
        payload,
        filename,
        issuer: operatorId
      })
      const d = bridgeRes.data?.data
      if (typeof d === 'string') {
        try {
          const j = JSON.parse(d)
          return { status: 202, transazioneId: j.transazione_id, registryId, operatorId, sentPayload: list }
        } catch {
          return { status: 500, error: 'Invalid JSON from bridge', raw: d }
        }
      }
      return { status: 202, transazioneId: d?.transazione_id, registryId, operatorId, sentPayload: list }
    } catch (e: any) {
      console.error('Bridge Error:', e.message)
      throw new Error(`Bridge Error: ${e.message}`)
    }
  } catch (e: any) {
    console.error('Submit Error:', e.message)
    throw e
  }
}

export function buildMovimentiFromXml(xmlContent: string){
    const xmlObj = parser.parse(xmlContent);
    let movimenti: any[] = [];
    if (xmlObj.registro_carico_scarico?.movimenti?.movimento) {
        const m = xmlObj.registro_carico_scarico.movimenti.movimento;
        movimenti = Array.isArray(m) ? m : [m];
    } else {
        movimenti = [{
            progressivo: "TEST",
            data: new Date().toISOString().slice(0,10),
            codice_eer: "170407",
            quantita: 1,
            unita_misura: "KG",
            provenienza: "U",
            tipo: "CA",
            descrizione: "Movimento"
        }];
    }
    return movimenti;
}
