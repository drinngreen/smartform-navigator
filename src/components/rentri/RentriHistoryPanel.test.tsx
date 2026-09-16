import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const fetchRentriHistory = vi.fn();
vi.mock("@/lib/rentriHistory", () => ({
  fetchRentriHistory: (...args: unknown[]) => fetchRentriHistory(...args),
  logRentriOperation: vi.fn(),
  normalizeHistoryPath: (p: string) => p,
}));

import { RentriHistoryPanel } from "@/components/rentri/RentriHistoryPanel";

const row = (over: Record<string, unknown> = {}) => ({
  id: crypto.randomUUID(),
  user_id: "u1",
  tenant_id: null,
  cliente: "multyproget",
  tipo_operazione: "LISTA_BLOCCHI",
  rentri_method: "GET",
  rentri_path: "/vidimazione-formulari/v1.0",
  mode: "real",
  http_status: 200,
  success: true,
  error_code: null,
  error_message: null,
  payload_inviato: null,
  risposta: null,
  identificativo_rentri: null,
  transazione_id: null,
  esito_finale: "CONFERMATO",
  created_at: new Date().toISOString(),
  ...over,
});

beforeEach(() => {
  fetchRentriHistory.mockReset();
});

describe("RentriHistoryPanel", () => {
  it("mostra lo stato di caricamento", async () => {
    let resolve!: (v: unknown[]) => void;
    fetchRentriHistory.mockImplementation(() => new Promise((r) => { resolve = r; }));
    render(<RentriHistoryPanel />);
    expect(screen.getByTestId("history-loading")).toBeInTheDocument();
    resolve([]);
    await screen.findByTestId("history-empty");
  });

  it("mostra il messaggio di cronologia vuota", async () => {
    fetchRentriHistory.mockResolvedValue([]);
    render(<RentriHistoryPanel />);
    expect(await screen.findByTestId("history-empty")).toBeInTheDocument();
  });

  it("mostra l'errore di caricamento", async () => {
    fetchRentriHistory.mockImplementation(() => { throw new Error("permission denied"); });
    render(<RentriHistoryPanel />);
    expect(await screen.findByTestId("history-error")).toBeInTheDocument();
  });

  it("mostra righe di successo e fallimento con stato leggibile", async () => {
    fetchRentriHistory.mockResolvedValue([
      row(),
      row({ success: false, http_status: 500, error_code: "BRIDGE_ERROR", error_message: "Errore del bridge" }),
      row({ mode: "dry_run", tipo_operazione: "REGISTRO" }),
    ]);
    render(<RentriHistoryPanel />);
    await waitFor(() => expect(screen.getAllByTestId("history-row")).toHaveLength(3));
    expect(screen.getByText(/Operazione completata/)).toBeInTheDocument();
    expect(screen.getByText(/nessun invio confermato/i)).toBeInTheDocument();
    expect(screen.getAllByText(/verifica/i).length).toBeGreaterThan(0);
  });

  it("mostra il motivo preciso restituito dal RENTRI", async () => {
    fetchRentriHistory.mockResolvedValue([
      row({
        success: false,
        http_status: 400,
        error_code: "BAD_REQUEST",
        risposta: {
          model_state: {
            "dati_partenza.destinatario.autorizzazione.tipo": ["sys.required"],
            "dati_partenza.rifiuto.codice_eer": ["sys.invalid"],
          },
        },
      }),
    ]);
    render(<RentriHistoryPanel />);
    expect(await screen.findByText("Motivo del rifiuto RENTRI")).toBeInTheDocument();
    expect(screen.getByText(/Tipo autorizzazione del destinatario: campo obbligatorio mancante/)).toBeInTheDocument();
    expect(screen.getByText(/Codice EER: valore non valido/)).toBeInTheDocument();
  });

  it("trova invio e rifiuti tramite numero FIR nel payload", async () => {
    fetchRentriHistory.mockResolvedValue([
      row({
        success: false,
        http_status: 400,
        tipo_operazione: "FIR_EMISSIONE",
        payload_inviato: { dati_partenza: { numero_fir: "ZRZXR000772TM" } },
      }),
      row({
        tipo_operazione: "FIR_EMISSIONE",
        payload_inviato: { dati_partenza: { numero_fir: "ABCDE000001XY" } },
      }),
    ]);
    render(<RentriHistoryPanel />);
    const search = await screen.findByLabelText("Cerca numero FIR");
    await import("@testing-library/user-event").then(({ default: userEvent }) =>
      userEvent.type(search, "ZRZXR 000772 TM"),
    );
    expect(screen.getAllByTestId("history-row")).toHaveLength(1);
    expect(screen.getByText("ZRZXR 000772 TM")).toBeInTheDocument();
  });
});
