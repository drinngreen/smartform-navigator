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
  created_at: new Date().toISOString(),
  ...over,
});

beforeEach(() => fetchRentriHistory.mockReset());

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
});
