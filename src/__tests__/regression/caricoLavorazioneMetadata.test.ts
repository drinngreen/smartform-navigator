import { describe, expect, it } from "vitest";
import { caricoMetadataPayload, emptyCaricoMetadata } from "@/lib/caricoLavorazioneMetadata";

describe("Metadati carico di lavorazione", () => {
  it("conserva nota interna separata e quantità supplementari senza trasformarle in kg", () => {
    const result = caricoMetadataPayload({ ...emptyCaricoMetadata(), notaInterna: "Riservata", litri: "12,50", metriCubi: "0,25", numero: "3" });
    expect(result.nota_int).toBe("Riservata");
    expect(result).not.toHaveProperty("annotazioni");
    expect(result).not.toHaveProperty("quantita");
    expect(result.raw.carico_lavorazione).toEqual({ litri: 12.5, metri_cubi: 0.25, numero: 3 });
  });
  it("salva caratteristiche nei campi esistenti del registro", () => {
    const result = caricoMetadataPayload({ ...emptyCaricoMetadata(), descrizione: " ferro ", statoFisico: "2", classiPericolo: ["HP01", "HP15"], destinazione: "R13", urbano: true });
    expect(result).toMatchObject({ descrizione: "ferro", stato_fisico: "2", classi_pericolo: "HP01, HP15", destinazione: "R13", form_urbano: true, origine_rifiuto: "Rifiuto" });
    expect(result.raw.carico_lavorazione.litri).toBeNull();
  });
});