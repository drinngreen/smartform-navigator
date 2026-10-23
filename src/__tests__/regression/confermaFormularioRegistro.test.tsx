import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ConfermaFormularioRegistro } from "@/components/rentri/ConfermaFormularioRegistro";
import { MULTY_TENANT, NIYOL_TENANT } from "@/lib/rentriFirGiacenze";

const mocks = vi.hoisted(() => ({
  detail: vi.fn(), multyWrite: vi.fn(), niyolWrite: vi.fn(),
  state: vi.fn().mockResolvedValue(new Map()), invalidate: vi.fn(),
}));
vi.mock("@/lib/rentriVpsApi", () => ({ dettaglioFormularioRentri: mocks.detail }));
vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ invalidateQueries: mocks.invalidate }) }));
vi.mock("@/lib/rentriFirGiacenze", async (original) => ({
  ...await original<typeof import("@/lib/rentriFirGiacenze")>(),
  leggiStatoRegistro: mocks.state, leggiStatoRegistroNiyol: mocks.state,
  registraFirInGiacenze: mocks.multyWrite, registraFirInRegistroNiyol: mocks.niyolWrite,
}));

const detail = (date = "2026-09-23", external = false) => ({
  success: true, data: {
    numero_fir: "ZRZXR 000974 BL",
    dati_partenza: {
      data_emissione: date, rifiuto: { codice_eer: "170407" },
      produttore: { codice_fiscale: "12347770013", denominazione: "MULTY",
        ...(external ? { luogo_produzione: { indirizzo: "Via Capri", citta: { comune_id: "001221" } } } : {}),
      },
      destinatario: { codice_fiscale: "00470790015" },
      trasportatore: { codice_fiscale: "09879800010" },
    },
    dati_accettazione: { data_ora_arrivo: `${date}T12:00:00Z`, quantita_accettata: { valore: 1000, unita_misura: "kg" } },
  },
});

afterEach(() => { cleanup(); vi.clearAllMocks(); });
const open = async (tenantId = MULTY_TENANT) => {
  render(<ConfermaFormularioRegistro numeroFir="ZRZXR 000974 BL" tenantId={tenantId} />);
  fireEvent.click(screen.getAllByRole("button")[0]);
  await waitFor(() => expect(mocks.state).toHaveBeenCalled());
};
const confirm = async () => {
  const buttons = screen.getByRole("dialog").querySelectorAll("button");
  // The explicit confirmation precedes the dialog's close icon.
  const action = Array.from(buttons).find((b) => b.textContent?.startsWith("Conferma"));
  if (!action) throw new Error("No confirmation available");
  fireEvent.click(action);
};

describe("Conferma dal formulario: nessuna scrittura senza anteprima e click", () => {
  it("aprire l'anteprima non registra; confermare usa 1000 kg accettati e rilegge RENTRI", async () => {
    mocks.detail.mockResolvedValue(detail());
    await open();
    expect(mocks.multyWrite).not.toHaveBeenCalled();
    await confirm();
    await waitFor(() => expect(mocks.multyWrite).toHaveBeenCalledTimes(1));
    expect(mocks.detail).toHaveBeenCalledTimes(2);
    expect(mocks.multyWrite.mock.calls[0][0]).toMatchObject({ kg_accettati: 1000, data_arrivo: "2026-09-23" });
  });
  it("data 21/09 resta bloccata anche nel formulario", async () => {
    mocks.detail.mockResolvedValue(detail("2026-09-21"));
    await open();
    expect(mocks.multyWrite).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog").querySelectorAll("button")).toHaveLength(2);
  });
  it("cantiere Rondissone conserva l'esclusione dalle giacenze", async () => {
    mocks.detail.mockResolvedValue(detail("2026-09-23", true));
    await open(); await confirm();
    await waitFor(() => expect(mocks.multyWrite).toHaveBeenCalledTimes(1));
    expect(mocks.multyWrite.mock.calls[0][0]).toMatchObject({ cantiere_diverso: true, cantiere_verificato: true });
  });
  it("Niyol chiama solo la registrazione Niyol e non quella Multy", async () => {
    mocks.detail.mockResolvedValue(detail());
    await open(NIYOL_TENANT); await confirm();
    await waitFor(() => expect(mocks.niyolWrite).toHaveBeenCalledTimes(1));
    expect(mocks.multyWrite).not.toHaveBeenCalled();
    expect(mocks.niyolWrite.mock.calls[0][0].kg_accettati).toBe(1000);
  });
  it("dati modificati tra anteprima e conferma fermano la scrittura", async () => {
    mocks.detail.mockResolvedValueOnce(detail()).mockResolvedValueOnce(detail("2026-09-24"));
    await open(); await confirm();
    await waitFor(() => expect(mocks.detail).toHaveBeenCalledTimes(2));
    expect(mocks.multyWrite).not.toHaveBeenCalled();
  });
});