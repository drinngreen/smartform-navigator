import { supabase } from "@/lib/supabaseClient";
import { ANAGRAFICA_TENANT_ID, upsertSoggetto } from "@/lib/anagraficaSync";

/**
 * Registrazione automatica in anagrafica dei soggetti e delle sedi operative
 * scritti a mano nel formulario.
 *
 * Regole:
 * - non crea mai doppioni: prima cerca per codice fiscale / partita IVA, poi
 *   per denominazione normalizzata;
 * - se l'azienda esiste già e l'indirizzo usato nel formulario è diverso dalla
 *   sede legale e da tutte le sedi già registrate, salva una nuova sede
 *   operativa (unità locale);
 * - non tocca registro, giacenze, cernite o dati storici.
 */

export interface SoggettoFormulario {
  ruolo: "PRODUTTORE" | "DESTINATARIO" | "TRASPORTATORE" | "INTERMEDIARIO";
  denominazione: string;
  identificativo: string;
  indirizzo: string;
}

export interface IndirizzoScomposto {
  via: string;
  cap: string;
  comune: string;
  provincia: string;
}

/** Confronto tollerante a spazi, punteggiatura e maiuscole. */
export const normalizzaTesto = (v: unknown) =>
  String(v ?? "")
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, "");

/**
 * Scompone l'indirizzo così come viene scritto nei formulari:
 * "VIA ROMA 10 - 10100 TORINO (TO)" oppure "VIA ROMA 10, 10100 TORINO TO".
 */
export function scomponiIndirizzo(valore: string): IndirizzoScomposto {
  const testo = String(valore ?? "").trim();
  if (!testo) return { via: "", cap: "", comune: "", provincia: "" };

  const provinciaMatch = testo.match(/\(([A-Za-z]{2})\)\s*$/);
  let resto = provinciaMatch ? testo.slice(0, provinciaMatch.index).trim() : testo;
  let provincia = provinciaMatch ? provinciaMatch[1].toUpperCase() : "";

  if (!provincia) {
    const codaProvincia = resto.match(/[\s,]([A-Za-z]{2})\s*$/);
    if (codaProvincia) {
      provincia = codaProvincia[1].toUpperCase();
      resto = resto.slice(0, codaProvincia.index).trim();
    }
  }

  const capMatch = resto.match(/\b(\d{5})\b/);
  const cap = capMatch ? capMatch[1] : "";

  let via = resto;
  let comune = "";
  if (capMatch) {
    via = resto.slice(0, capMatch.index).trim();
    comune = resto.slice((capMatch.index ?? 0) + 5).trim();
  }

  via = via.replace(/[\s,;-]+$/, "").trim();
  comune = comune.replace(/^[\s,;-]+/, "").replace(/[\s,;-]+$/, "").trim();

  return { via, cap, comune, provincia };
}

/** Chiave di confronto di un indirizzo completo. */
export const chiaveIndirizzo = (parti: {
  indirizzo?: string | null;
  cap?: string | null;
  comune?: string | null;
  citta?: string | null;
  provincia?: string | null;
}) =>
  normalizzaTesto(
    [parti.indirizzo, parti.cap, parti.comune ?? parti.citta, parti.provincia].filter(Boolean).join(" "),
  );

/** Estrae dal formulario i soggetti da registrare (solo quelli con denominazione). */
export function soggettiDalFormulario(d: Record<string, any>): SoggettoFormulario[] {
  const candidati: SoggettoFormulario[] = [
    {
      ruolo: "PRODUTTORE",
      denominazione: String(d.produttoreDenominazione ?? "").trim(),
      identificativo: String(d.produttoreCF ?? "").trim(),
      indirizzo: String(d.produttoreUnitaLocale ?? "").trim(),
    },
    {
      ruolo: "DESTINATARIO",
      denominazione: String(d.destinatarioDenominazione ?? "").trim(),
      identificativo: String(d.destinatarioCF ?? "").trim(),
      indirizzo: String(d.destinatarioUnitaLocale ?? "").trim(),
    },
    {
      ruolo: "TRASPORTATORE",
      denominazione: String(d.trasportatoreDenominazione ?? "").trim(),
      identificativo: String(d.trasportatoreCF ?? "").trim(),
      indirizzo: String(d.trasportatoreSituatoIn ?? "").trim(),
    },
    {
      ruolo: "INTERMEDIARIO",
      denominazione: String(d.intermediarioDenominazione ?? "").trim(),
      identificativo: String(d.intermediarioCF ?? "").trim(),
      indirizzo: "",
    },
  ];

  const visti = new Set<string>();
  return candidati.filter((s) => {
    if (!s.denominazione) return false;
    const chiave = normalizzaTesto(s.identificativo) || normalizzaTesto(s.denominazione);
    if (visti.has(chiave)) return false;
    visti.add(chiave);
    return true;
  });
}

export interface EsitoRegistrazione {
  aziendeCreate: string[];
  sediCreate: string[];
  errori: string[];
}

/** Ricerca l'azienda già presente in anagrafica, senza crearne una nuova. */
async function trovaAzienda(soggetto: SoggettoFormulario) {
  const id = soggetto.identificativo.replace(/\s/g, "");
  if (id.length > 3) {
    const { data } = await supabase
      .from("anagrafica_aziende_mp")
      .select("id,ragione_sociale,indirizzo,citta,provincia,cap,codice_fiscale,partita_iva")
      .or(`codice_fiscale.eq.${id},partita_iva.eq.${id}`)
      .limit(5);
    if (data && data.length > 0) return data[0];
  }

  const { data } = await supabase
    .from("anagrafica_aziende_mp")
    .select("id,ragione_sociale,indirizzo,citta,provincia,cap,codice_fiscale,partita_iva")
    .ilike("ragione_sociale", soggetto.denominazione)
    .limit(5);
  const atteso = normalizzaTesto(soggetto.denominazione);
  return (data || []).find((r: any) => normalizzaTesto(r.ragione_sociale) === atteso) ?? null;
}

/** Registra la sede operativa solo se non coincide con la sede legale né con una già presente. */
async function registraSedeOperativa(
  azienda: any,
  indirizzo: string,
  esito: EsitoRegistrazione,
) {
  const parti = scomponiIndirizzo(indirizzo);
  if (!parti.via) return;

  const chiaveNuova = chiaveIndirizzo({
    indirizzo: parti.via,
    cap: parti.cap,
    comune: parti.comune,
    provincia: parti.provincia,
  });
  if (!chiaveNuova) return;

  const chiaveSedeLegale = chiaveIndirizzo(azienda);
  if (chiaveNuova === chiaveSedeLegale) return;
  // Indirizzo scritto per esteso ma coincidente con la sede legale.
  if (chiaveSedeLegale && chiaveSedeLegale.includes(chiaveNuova)) return;

  const { data: esistenti } = await supabase
    .from("cliente_unita_locali")
    .select("id,denominazione,indirizzo,comune,provincia,cap")
    .eq("cliente_id", azienda.id)
    .limit(500);
  const giaPresente = (esistenti || []).some((s: any) => chiaveIndirizzo(s) === chiaveNuova);
  if (giaPresente) return;

  const { error } = await supabase.from("cliente_unita_locali").insert({
    cliente_id: azienda.id,
    denominazione: parti.comune || parti.via,
    indirizzo: parti.via,
    comune: parti.comune || null,
    provincia: parti.provincia || null,
    cap: parti.cap || null,
  } as any);
  if (error) {
    esito.errori.push(`Sede operativa di ${azienda.ragione_sociale}: ${error.message}`);
    return;
  }
  esito.sediCreate.push(`${azienda.ragione_sociale} — ${[parti.via, parti.comune].filter(Boolean).join(", ")}`);
}

/**
 * Registra in anagrafica i soggetti nuovi e le sedi operative nuove presenti
 * nel formulario. Non modifica mai registro, giacenze o dati storici.
 */
export async function registraAnagraficheFormulario(
  d: Record<string, any>,
  tenantId: string = ANAGRAFICA_TENANT_ID,
): Promise<EsitoRegistrazione> {
  const esito: EsitoRegistrazione = { aziendeCreate: [], sediCreate: [], errori: [] };

  for (const soggetto of soggettiDalFormulario(d)) {
    try {
      const azienda = await trovaAzienda(soggetto);

      if (!azienda) {
        const parti = scomponiIndirizzo(soggetto.indirizzo);
        const identificativo = soggetto.identificativo.replace(/\s/g, "").toUpperCase();
        const isPartitaIva = /^\d{11}$/.test(identificativo);
        await upsertSoggetto({
          tenantId,
          ragioneSociale: soggetto.denominazione,
          codiceFiscale: isPartitaIva ? "" : identificativo,
          partitaIva: isPartitaIva ? identificativo : "",
          indirizzo: parti.via,
          comune: parti.comune,
          provincia: parti.provincia,
          cap: parti.cap,
          categoria: soggetto.ruolo,
        });
        esito.aziendeCreate.push(soggetto.denominazione);
        continue;
      }

      if (soggetto.indirizzo) await registraSedeOperativa(azienda, soggetto.indirizzo, esito);
    } catch (e: any) {
      esito.errori.push(`${soggetto.denominazione}: ${e?.message || e}`);
    }
  }

  return esito;
}

/** Messaggio leggibile dell'esito, o stringa vuota se non è cambiato nulla. */
export function descriviEsitoRegistrazione(esito: EsitoRegistrazione): string {
  const parti: string[] = [];
  if (esito.aziendeCreate.length)
    parti.push(`Nuove aziende in anagrafica: ${esito.aziendeCreate.join(", ")}`);
  if (esito.sediCreate.length)
    parti.push(`Nuove sedi operative: ${esito.sediCreate.join(" · ")}`);
  return parti.join(" — ");
}
