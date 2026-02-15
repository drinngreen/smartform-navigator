import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';

const BRIDGE_URL = 'http://localhost:8765';
const parser = new XMLParser({ ignoreAttributes: false });

const REGISTRY_IDS: Record<string, string> = {
    'certificato.p12': 'R1DDEWC3SHU',
    '08934760961.p12': 'R1DDEWC3SHU',
    'niyol.p12': 'INSERISCI_ID_REG_NIYOL',
    'multyproget.p12': 'INSERISCI_ID_REG_MULTY'
};
const OPERATOR_IDS: Record<string, string> = {
    'certificato.p12': 'R6QSWHZ6HJV',
    '08934760961.p12': 'R6QSWHZ6HJV',
    'multyproget.p12': 'RQEL39R7NS0'
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

export async function submitFir(xmlContent: string, p12Filename: string) {
    try {
        const registryId = REGISTRY_IDS[p12Filename];
        if (!registryId) throw new Error("ID Registro mancante");

        const xmlObj = parser.parse(xmlContent);
        let movimenti: any[] = [];

        if (xmlObj.registro_carico_scarico?.movimenti?.movimento) {
            const m = xmlObj.registro_carico_scarico.movimenti.movimento;
            movimenti = Array.isArray(m) ? m : [m];
        } else {
             movimenti = [{ progressivo: "TEST", data: new Date().toISOString(), ...xmlObj }];
        }

        const operatorId = OPERATOR_IDS[p12Filename];
        for (const mov of movimenti) {
            const url = `https://api.rentri.gov.it/dati-registri/v1.0/operatore/${operatorId}/movimenti`;
            const cerFormatted = formatCER(mov.codice_cer || mov.codice_eer);
            const tipo = formatTipo(mov.tipo);
            const causale = determineCausale(tipo);

            const payload = {
                data_movimento: formatDate(mov.data),
                tipo_movimento: tipo,
                causale,
                descrizione: formatDesc(mov.descrizione),
                rifiuto: {
                    codice_eer: cerFormatted,
                    quantita: parseFloat(mov.quantita),
                    unita_misura: formatUM(mov.unita_misura),
                    stato_fisico: 1,
                    pericoloso: cerFormatted.includes('*')
                },
                ...(causale === "RE" ? { provenienza: (mov.provenienza || "U") } : { destinato_attivita: (mov.destinato_attivita || "R13") }),
                ...(p12Filename === "multyproget.p12" ? {
                  intermediario: { denominazione: "MULTY PROGET S.R.L.", codice_fiscale: "12347770013" },
                  intermediari: [ { denominazione: "MULTY PROGET S.R.L.", codice_fiscale: "12347770013" } ]
                } : {}),
                note: `Prg: ${mov.progressivo}`
            };

            console.log(`[INVIO] CER: '${cerFormatted}' -> ${url}`);
            const batchPayload = [payload];

            const res = await axios.post(`${BRIDGE_URL}/send-rentri`, {
                url: url,
                payload: JSON.stringify(batchPayload),
                filename: p12Filename
            });

            if (!res.data.success) {
                let err = res.data.data;
                try {
                    const j = JSON.parse(err);
                    if (j.model_state) err = JSON.stringify(j.model_state);
                    else if (j.title) err = j.title;
                } catch {}
                throw new Error(`RENTRI: ${err}`);
            }
        }
        return { success: true, data: "OK" };
    } catch (e: any) {
        console.error("[CRITICAL]", e.message);
        throw e;
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
