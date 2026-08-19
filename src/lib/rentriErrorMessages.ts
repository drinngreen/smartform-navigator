/**
 * Messaggi utente per gli esiti RENTRI.
 * Il dettaglio tecnico resta separato e non contiene mai segreti.
 */

export type RentriErrorCode =
  | "OK"
  | "BAD_REQUEST"
  | "INVALID_DATA"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "BRIDGE_ERROR"
  | "BRIDGE_UNAVAILABLE"
  | "CLIENT_ERROR"
  | "NETWORK_ERROR"
  | "UNKNOWN";

export function rentriErrorCodeForStatus(status: number): RentriErrorCode {
  if (status === 400) return "BAD_REQUEST";
  if (status === 401) return "UNAUTHORIZED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 422) return "INVALID_DATA";
  if (status === 429) return "RATE_LIMITED";
  if (status === 502 || status === 503 || status === 504) return "BRIDGE_UNAVAILABLE";
  if (status >= 500) return "BRIDGE_ERROR";
  if (status >= 400) return "CLIENT_ERROR";
  if (status >= 200 && status < 300) return "OK";
  return "UNKNOWN";
}

/** Messaggio leggibile, mai tecnico, mai contenente segreti. */
export function rentriUserMessage(status: number, fallback?: string): string {
  switch (rentriErrorCodeForStatus(status)) {
    case "OK":
      return "Operazione completata.";
    case "BAD_REQUEST":
    case "INVALID_DATA":
      return "Dati della richiesta non validi o incompleti.";
    case "UNAUTHORIZED":
    case "FORBIDDEN":
      return "Autorizzazione non valida o operazione non consentita.";
    case "NOT_FOUND":
      return "Risorsa RENTRI non trovata: l'identificativo indicato non esiste (o la transazione è scaduta) per questa azienda.";

    case "RATE_LIMITED":
      return "Limite temporaneo raggiunto: riprovare più tardi.";
    case "BRIDGE_ERROR":
      return "Errore interno del bridge: nessun invio confermato.";
    case "BRIDGE_UNAVAILABLE":
      return "Bridge o servizio temporaneamente non disponibile.";
    case "NETWORK_ERROR":
      return "Connessione al servizio non riuscita: riprovare più tardi.";
    default:
      return fallback?.trim() || "Operazione non riuscita.";
  }
}

const SECRET_PATTERNS: RegExp[] = [
  /x-bridge-key\s*[:=]\s*\S+/gi,
  /(authorization|password|passphrase|apikey|api_key|token)\s*[:=]\s*(bearer\s+)?\S+/gi,
  /bearer\s+[A-Za-z0-9._~+/=-]+/gi,
  /-----BEGIN[\s\S]*?-----/gi,
];

/** Ripulisce un messaggio tecnico da segreti e stack trace prima di mostrarlo o salvarlo. */
export function sanitizeRentriMessage(raw: unknown): string {
  let out = String(raw ?? "").split("\n")[0].slice(0, 500);
  for (const pattern of SECRET_PATTERNS) out = out.replace(pattern, "***");
  return out.trim();
}
