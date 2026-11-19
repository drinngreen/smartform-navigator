import { elencoSoggetti, type FirIntermediarioRow } from "@/lib/rentriFirIntermediario";

export type RuoloFir = "Produttore" | "Destinatario" | "Trasportatore" | "Intermediario" | "Conto proprio";
const norm = (v: unknown) => String(v ?? "").replace(/[^a-z0-9]/gi, "").toUpperCase();

/**
 * Ruoli della società nel formulario. Con `bloccoContoProprio` (per Multyproget il
 * blocco FRVKM dei dipendenti) i FIR di quel blocco in cui la società è trasportatore
 * sono trasporti in conto proprio e compaiono come «Conto proprio».
 */
export function ruoliFormulario(row: FirIntermediarioRow, cf: string, bloccoContoProprio?: string): RuoloFir[] {
  if (!row.raw || typeof row.raw !== "object" || !norm(cf)) return [];
  const raw = row.raw as Record<string, unknown>;
  const keys: [RuoloFir, string][] = [["Produttore", "produttor"], ["Destinatario", "destinatar"], ["Trasportatore", "trasportator"], ["Intermediario", "intermediar"]];
  const ruoli = keys.filter(([, key]) => elencoSoggetti(raw, [key]).some((s) => norm(s.codice_fiscale) === norm(cf))).map(([role]) => role);
  if (bloccoContoProprio && ruoli.includes("Trasportatore") && norm(row.numeroFir).startsWith(norm(bloccoContoProprio))) {
    return ruoli.map((r) => (r === "Trasportatore" ? "Conto proprio" : r));
  }
  return ruoli;
}

export function statoFormulario(stato: string | null): string {
  if (stato === "FirmaProduttoreTrasportatoreIniziale") return "Partenza da firmare nell’app RENTRI";
  if (stato === "InserimentoAccettazione") return "Fase accettazione — verificare dettaglio";
  return stato || "Stato non disponibile";
}