/**
 * Pesca dei formulari dal RENTRI: scarica l'elenco del soggetto per il periodo
 * scelto e lo porta in archivio (fir_forms) in modo idempotente.
 *
 * - quelli già presenti vengono riconosciuti e aggiornati (merge form_data);
 * - quelli nuovi entrano come documenti da lavorare;
 * - le differenze fra archivio locale e RENTRI vengono elencate, MAI corrette da sole.
 *
 * Nessuna scrittura su movimenti_impianto: i movimenti nascono solo alla firma
 * del destinatario (chiusura certificata).
 */

import { supabase } from "@/lib/supabaseClient";
import {
  elencoFormulariRentri,
  dettaglioFormularioRentri,
  RENTRI_CF_SOGGETTO,
  RENTRI_UNITA_LOCALI,
  rentriConfigKey,
  type RentriCliente,
} from "@/lib/rentriVpsApi";

export interface RisultatoPesca {
  letti: number;
  nuovi: number;
  aggiornati: number;
  differenze: string[];
  dettagli: { numero_fir: string; azione: "nuovo" | "aggiornato" | "invariato"; cer: string; quantita: number; stato: string }[];
}

function inPeriodo(riga: Record<string, unknown>, da: string, a: string): boolean {
  const raw = String(riga.data_emissione ?? riga.data_creazione ?? "").slice(0, 10);
  if (!raw || Number.isNaN(Date.parse(raw))) return true; // senza data non si filtra: entra comunque
  return raw >= da && raw <= a;
}

export async function pescaFormulariRentri(params: {
  cliente: RentriCliente;
  tenantId: string;
  dataDa: string;
  dataA: string;
  /** true = scarica il dettaglio completo di ogni formulario (più lento, più dati) */
  conDettaglio?: boolean;
}): Promise<RisultatoPesca> {
  const { cliente, tenantId, dataDa, dataA, conDettaglio } = params;
  const key = rentriConfigKey(cliente);
  const cf = RENTRI_CF_SOGGETTO[key] ?? "";
  const ul = RENTRI_UNITA_LOCALI[key] ?? "";

  const res = await elencoFormulariRentri(cliente, cf, ul);
  if (!res.success) throw new Error(res.error || "Lettura elenco formulari non riuscita");
  const raw = res.data as unknown;
  const listaRaw: Record<string, unknown>[] = Array.isArray(raw)
    ? (raw as Record<string, unknown>[])
    : (((raw as Record<string, unknown>)?.formulari ??
        (raw as Record<string, unknown>)?.items ??
        (raw as Record<string, unknown>)?.content ??
        []) as Record<string, unknown>[]);

  const selezione = listaRaw.filter((r) => inPeriodo(r, dataDa, dataA));

  // Archivio locale per il tenant
  const locali: { id: string; numero_fir: string | null; form_data: Record<string, unknown> | null }[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("fir_forms")
      .select("id, numero_fir, form_data")
      .eq("tenant_id", tenantId)
      .not("numero_fir", "is", null)
      .order("created_at", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    locali.push(...((data ?? []) as typeof locali));
    if ((data?.length ?? 0) < pageSize) break;
  }
  const perNumero = new Map<string, { id: string; form_data: Record<string, unknown> }>();
  for (const r of locali) {
    const n = String((r as Record<string, unknown>).numero_fir ?? "").replace(/\s+/g, "").toUpperCase();
    if (n) perNumero.set(n, { id: r.id, form_data: r.form_data ?? {} });
  }

  const risultato: RisultatoPesca = { letti: selezione.length, nuovi: 0, aggiornati: 0, differenze: [], dettagli: [] };

  for (const riga of selezione) {
    const numero = String(riga.numero_fir ?? "").replace(/\s+/g, "").toUpperCase();
    if (!numero) {
      risultato.differenze.push("Un formulario letto dal RENTRI non ha numero leggibile: non importato.");
      continue;
    }
    const eer = String(riga.codice_eer ?? "");
    const quantita = Number(riga.quantita ?? 0);
    const stato = String(riga.stato ?? "");
    const esistente = perNumero.get(numero);

    let datiImport: Record<string, unknown> = {
      ...riga,
      numero_fir: numero,
      origine: "RENTRI_IMPORT",
      imported_at: new Date().toISOString(),
    };
    if (conDettaglio) {
      const det = await dettaglioFormularioRentri(cliente, numero, cf, ul);
      if (det.success) datiImport = { ...datiImport, dettaglio_rentri: det.data };
      else risultato.differenze.push(`Dettaglio non leggibile per ${numero}: ${det.error ?? "errore RENTRI"}`);
    }

    if (!esistente) {
      const { error } = await supabase.from("fir_forms").insert({
        tenant_id: tenantId,
        numero_fir: numero,
        codice_eer: eer || null,
        quantita: Number.isFinite(quantita) ? quantita : null,
        status: "completato",
        form_data: datiImport,
      } as never);
      if (error) {
        risultato.differenze.push(`Import non riuscito per ${numero}: ${error.message}`);
        continue;
      }
      risultato.nuovi++;
      risultato.dettagli.push({ numero_fir: numero, azione: "nuovo", cer: eer, quantita, stato });
    } else {
      const attuale = esistente.form_data ?? {};
      const importatoPrecedente = (attuale as Record<string, unknown>).origine === "RENTRI_IMPORT";
      // Differenze elencate in sola lettura, mai corrette da sole
      const cerLocale = String((attuale as Record<string, unknown>).codice_eer ?? "");
      if (cerLocale && eer && cerLocale.replace(/\D/g, "") !== eer.replace(/\D/g, "")) {
        risultato.differenze.push(`${numero}: CER locale ${cerLocale} ≠ RENTRI ${eer} (sola lettura)`);
      }
      const { error } = await supabase
        .from("fir_forms")
        .update({ form_data: { ...attuale, dati_rentri: datiImport, last_import_at: new Date().toISOString() } } as never)
        .eq("id", esistente.id);
      if (error) {
        risultato.differenze.push(`Aggiornamento non riuscito per ${numero}: ${error.message}`);
        continue;
      }
      if (!importatoPrecedente) risultato.aggiornati++;
      risultato.dettagli.push({ numero_fir: numero, azione: importatoPrecedente ? "aggiornato" : "invariato", cer: eer, quantita, stato });
    }
  }

  return risultato;
}
