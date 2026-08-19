// ══════════════════════════════════════════════════════════════
// Preset aziendali Multyproget / Niyol per compilazione FIR
// I dati anagrafici sono fissi, le autorizzazioni sono gestibili
// dall'utente (salvate localmente) tramite la tendina nei moduli.
// ══════════════════════════════════════════════════════════════
export const AZIENDE_PRESETS = [
    {
        key: "multyproget",
        nome: "MULTY PROGET S.R.L.",
        indirizzo: "VIA RIVAROSSA 18/20 - 10060 Piscina (TO)",
        cf: "12347770013",
        piva: "12347770013",
        autorizzazioni: [],
    },
    {
        key: "niyol",
        nome: "NIYOL ETICONS LOGISTICA SRL SB",
        indirizzo: "VIA RIVAROSSA 18/20 - 10060 Piscina (TO)",
        cf: "09879800010",
        piva: "09879800010",
        autorizzazioni: [],
    },
];
export const TIPI_AUTORIZZAZIONE = [
    "Albo Naz. Gestori Ambientali",
    "AUA",
    "AIA",
    "Art. 208 D.Lgs 152/06",
    "Comunicazione art. 216 (semplificata)",
    "Iscrizione RENTRI",
    "Altro",
];
const STORAGE_KEY = "mn-autorizzazioni-presets-v1";
function readStore() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    }
    catch {
        return {};
    }
}
function writeStore(store) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    }
    catch {
        /* storage non disponibile */
    }
}
export function getAutorizzazioni(aziendaKey) {
    const base = AZIENDE_PRESETS.find((a) => a.key === aziendaKey)?.autorizzazioni ?? [];
    return [...base, ...(readStore()[aziendaKey] ?? [])];
}
export function addAutorizzazione(aziendaKey, aut) {
    const store = readStore();
    const entry = { ...aut, id: `${Date.now()}` };
    store[aziendaKey] = [...(store[aziendaKey] ?? []), entry];
    writeStore(store);
    return entry;
}
export function removeAutorizzazione(aziendaKey, id) {
    const store = readStore();
    store[aziendaKey] = (store[aziendaKey] ?? []).filter((a) => a.id !== id);
    writeStore(store);
}
