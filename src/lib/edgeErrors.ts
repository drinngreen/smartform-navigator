/**
 * Estrae il messaggio leggibile restituito da una Edge Function
 * anche quando la risposta ha uno stato non 2xx (FunctionsHttpError),
 * dove supabase-js espone solo un messaggio generico.
 */
export async function messaggioErroreEdge(error: any, data?: any): Promise<string> {
  if (data?.error) return String(data.error);
  const res = error?.context;
  if (res && typeof res.json === "function") {
    try {
      const body = await res.clone().json();
      if (body?.error) return String(body.error);
      if (body?.message) return String(body.message);
    } catch {
      try {
        const txt = await res.clone().text();
        if (txt) return txt;
      } catch {
        /* ignora */
      }
    }
  }
  return error?.message || "Operazione fallita";
}
