import { supabase } from "@/lib/supabaseClient";

export type RentriCliente = "multy" | "niyol" | "global";
export type RentriTipoOperazione = "REGISTRO" | "FIR_EMISSIONE" | "VIDIMAZIONE" | "LOTTO" | "LISTA_BLOCCHI" | "DETTAGLIO_FIR" | "FIRMA_RICEZIONE";

export interface RentriVpsRequest {
  cliente: RentriCliente;
  tipo_operazione: RentriTipoOperazione;
  payload: Record<string, unknown>;
}

export interface RentriVpsResponse {
  success: boolean;
  status: number;
  data: unknown;
  error?: string;
}

export async function inviaOperazioneRentri(
  request: RentriVpsRequest
): Promise<RentriVpsResponse> {
  try {
    const { data, error } = await supabase.functions.invoke("rentri-vps-proxy", {
      body: request,
    });

    if (error) {
      return { success: false, status: 0, data: null, error: error.message };
    }

    return data as RentriVpsResponse;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, status: 0, data: null, error: message };
  }
}
