import { elencoSoggetti, type FirIntermediarioRow } from "@/lib/rentriFirIntermediario";

export type RuoloFir = "Produttore" | "Destinatario" | "Trasportatore" | "Intermediario";
const norm = (v: unknown) => String(v ?? "").replace(/[^a-z0-9]/gi, "").toUpperCase();

export function ruoliFormulario(row: FirIntermediarioRow, cf: string): RuoloFir[] {
  if (!row.raw || typeof row.raw !== "object" || !norm(cf)) return [];
  const raw = row.raw as Record<string, unknown>;
  const keys: [RuoloFir, string][] = [["Produttore", "produttor"], ["Destinatario", "destinatar"], ["Trasportatore", "trasportator"], ["Intermediario", "intermediar"]];
  return keys.filter(([, key]) => elencoSoggetti(raw, [key]).some((s) => norm(s.codice_fiscale) === norm(cf))).map(([role]) => role);
}

export function statoFormulario(stato: string | null): string {
  if (stato === "FirmaProduttoreTrasportatoreIniziale") return "Partenza da firmare nell’app RENTRI";
  if (stato === "InserimentoAccettazione") return "Fase accettazione — verificare dettaglio";
  return stato || "Stato non disponibile";
}