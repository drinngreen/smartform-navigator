import { describe, it, expect } from "vitest";
import { splitIndirizzoRentri, splitConducente, dataOraRoma, pulisciAnnotazioni, FIRMA_API_ATTIVA } from "@/lib/rentriFirma";

describe("invio RENTRI con firma nell'app RENTRI", () => {
  it("firma API spenta", () => expect(FIRMA_API_ATTIVA).toBe(false));
  it("via senza CAP e città ripetuti", () => {
    expect(splitIndirizzoRentri("VIA RIVAROSSA 18/20 - 10060 Piscina (TO)")).toEqual({ indirizzo: "VIA RIVAROSSA 18/20", cap: "10060" });
  });
  it("conducente: mai cognome copiato dal nome", () => {
    expect(() => splitConducente("", "", "KEVIN")).toThrow(/nome e cognome/);
    expect(splitConducente("", "", "MARIO ROSSI")).toEqual({ nome: "MARIO", cognome: "ROSSI" });
  });
  it("ora italiana con fuso esplicito", () => {
    expect(dataOraRoma("2026-09-18", "08:00")).toBe("2026-09-18T08:00:00+02:00");
    expect(dataOraRoma("2026-12-01", "08:00")).toBe("2026-12-01T08:00:00+01:00");
  });
  it("annotazioni senza testo di vidimazione", () => {
    expect(pulisciAnnotazioni("Validazione virtuale: Vid. Vir. del 07/09/2026 14:59:38 per conto della Camera di Commercio di Torino, rich. da 12347770013 MULTY PROGET S.R.L.")).toBe("");
    expect(pulisciAnnotazioni("Consegna al cancello 2")).toBe("Consegna al cancello 2");
  });
});
