/**
 * Firma di partenza xFIR — canale remoto ca-rentri (CON CONFERMA MOBILE).
 *
 * REGOLE NON NEGOZIABILI (imposte dall'operatore, provate in produzione su
 * FIR FRVKM 001315 HL firmato con RENTRI SIGN CA, credentials_id 8UTTEE35E):
 *  - MAI firmare il digest localmente con il certificato di interoperabilità
 *    (multyproget.p12): quel certificato serve solo a autenticare le API.
 *  - MAI chiamare /hash se il FIR non è in FirmaProduttoreTrasportatoreIniziale.
 *  - MAI chiamare /signatures/sign-hash prima della conferma sul dispositivo
 *    mobile (RENTRI risponde sign.sadAutorizzazioneNonConfermata).
 *  - MAI riusare token, digest_to_sign o sad di una sessione precedente.
 *  - Ogni step salva request/response raw.
 */
import { supabase } from "@/lib/supabaseClient";
import {
  inviaOperazioneRentriCustom,
  rentriConfigKey,
  RENTRI_CF_SOGGETTO,
  RENTRI_UNITA_LOCALI,
  type RentriCliente,
  type RentriVpsResponse,
} from "@/lib/rentriVpsApi";

export const HASH_ALGO_SHA256 = "2.16.840.1.101.3.4.2.1";

export const STATO_TRASPORTO_INIZIALE = "InserimentoTrasportoIniziale";
export const STATO_FIRMABILE = "FirmaProduttoreTrasportatoreIniziale";
export const STATO_PARTITO = "InserimentoAccettazione";

export interface XfirCredential {
  credentials_id: string;
  description?: string;
  auth_mode?: string;
  auth_expression?: string;
  raw: Record<string, unknown>;
}

export interface XfirCredentialInfo {
  credentials_id: string;
  certificato: string;
  sign_algo: string;
  auth_mode: string;
  auth_expression: string;
  description: string;
  raw: Record<string, unknown>;
}

export interface XfirStepLog {
  step: string;
  method: string;
  path: string;
  request: unknown;
  response: unknown;
  status: number;
  at: string;
}

export interface XfirSessione {
  numero_fir: string;
  credentials_id?: string;
  device_description?: string;
  digest_to_sign?: string;
  token?: string;
  handle?: string;
  authorize_at?: string;
  conferma_mobile_at?: string;
  esito_sign_hash?: string;
  esito_acquisizione_firma?: string;
  stato_finale?: string;
  log: XfirStepLog[];
}

function soggetto(cliente: RentriCliente, cf?: string, ul?: string) {
  const key = rentriConfigKey(cliente);
  return {
    cf: cf || RENTRI_CF_SOGGETTO[key] || "",
    ul: ul || RENTRI_UNITA_LOCALI[key] || "",
  };
}

function firId(numeroFir: string) {
  return encodeURIComponent(numeroFir.replace(/\s+/g, ""));
}

function logStep(
  sessione: XfirSessione,
  step: string,
  method: string,
  path: string,
  request: unknown,
  res: RentriVpsResponse,
): XfirStepLog {
  const entry: XfirStepLog = {
    step,
    method,
    path,
    request,
    response: res.data ?? res.error ?? null,
    status: res.status,
    at: new Date().toISOString(),
  };
  sessione.log.push(entry);
  return entry;
}

function asRecord(value: unknown): Record<string, any> {
  return (value && typeof value === "object" ? value : {}) as Record<string, any>;
}

export class XfirError extends Error {
  constructor(message: string, readonly codice?: string, readonly dettaglio?: unknown) {
    super(message);
    this.name = "XfirError";
  }
}

/* ────────────── 1. Stato FIR ────────────── */

export async function getDettaglioFir(
  cliente: RentriCliente,
  numeroFir: string,
  cf?: string,
  ul?: string,
) {
  const s = soggetto(cliente, cf, ul);
  const path = `/formulari/v1.0/${firId(numeroFir)}?identificativo_soggetto=${s.cf}&num_iscr_sito=${s.ul}`;
  return { path, res: await inviaOperazioneRentriCustom(cliente, "GET", path, null) };
}

export function statoDalDettaglio(data: unknown): string {
  const d = asRecord(data);
  return String(d.stato ?? d.stato_formulario ?? d.statoFormulario ?? "").trim();
}

/** POST /trasporto — imposta/aggiorna i dati di trasporto e porta il FIR allo stato firmabile. */
export async function startTrasportoFir(
  cliente: RentriCliente,
  numeroFir: string,
  datiTrasporto: Record<string, unknown>,
  cf?: string,
  ul?: string,
) {
  const s = soggetto(cliente, cf, ul);
  const path = `/formulari/v1.0/${firId(numeroFir)}/trasporto?identificativo_soggetto=${s.cf}&num_iscr_sito=${s.ul}`;
  return { path, res: await inviaOperazioneRentriCustom(cliente, "POST", path, datiTrasporto) };
}

/* ────────────── 2. Credenziali remote ca-rentri ────────────── */

export async function listActiveCredentials(
  cliente: RentriCliente,
  cf?: string,
  ul?: string,
): Promise<{ path: string; res: RentriVpsResponse; credenziali: XfirCredential[] }> {
  const s = soggetto(cliente, cf, ul);
  const path =
    `/ca-rentri/v1.0/credentials/list?identificativo_soggetto=${s.cf}` +
    `&num_iscr_sito=${s.ul}&only_valid=true&cert_info=true`;
  const res = await inviaOperazioneRentriCustom(cliente, "GET", path, null);
  const d = asRecord(res.data);
  const lista: unknown[] = Array.isArray(d.credentials)
    ? d.credentials
    : Array.isArray(d.credentials_ids)
      ? d.credentials_ids
      : Array.isArray(res.data)
        ? (res.data as unknown[])
        : [];

  const credenziali = lista.map((item) => {
    if (typeof item === "string") return { credentials_id: item, raw: { credentials_id: item } };
    const r = asRecord(item);
    return {
      credentials_id: String(r.credentials_id ?? r.credentialsId ?? r.id ?? ""),
      description: r.description ? String(r.description) : undefined,
      auth_mode: r.auth?.mode ? String(r.auth.mode) : undefined,
      auth_expression: r.auth?.expression ? String(r.auth.expression) : undefined,
      raw: r,
    };
  }).filter((c) => c.credentials_id);

  return { path, res, credenziali };
}

export async function getCredentialInfo(
  cliente: RentriCliente,
  credentialsId: string,
): Promise<{ path: string; res: RentriVpsResponse; info: XfirCredentialInfo | null }> {
  const path =
    `/ca-rentri/v1.0/credentials/info?credentials_id=${encodeURIComponent(credentialsId)}` +
    `&auth_info=true&cert_info=true&certificates=single`;
  const res = await inviaOperazioneRentriCustom(cliente, "GET", path, null);
  const d = asRecord(res.data);
  const certificati: unknown[] = Array.isArray(d.cert?.certificates) ? d.cert.certificates : [];
  const certificato = certificati.length > 0 ? String(certificati[0]) : "";
  const algos: unknown[] = Array.isArray(d.key?.algo) ? d.key.algo : [];

  const info: XfirCredentialInfo | null = certificato
    ? {
        credentials_id: credentialsId,
        certificato,
        sign_algo: algos.length > 0 ? String(algos[0]) : "",
        auth_mode: String(d.auth?.mode ?? ""),
        auth_expression: String(d.auth?.expression ?? ""),
        description: String(d.description ?? d.cert?.subjectDN ?? credentialsId),
        raw: d,
      }
    : null;

  return { path, res, info };
}

/* ────────────── 3. Hash del FIR ────────────── */

export async function getHashToSign(
  cliente: RentriCliente,
  numeroFir: string,
  certificato: string,
  cf?: string,
  ul?: string,
) {
  const s = soggetto(cliente, cf, ul);
  const path = `/formulari/v1.0/${firId(numeroFir)}/hash?identificativo_soggetto=${s.cf}&num_iscr_sito=${s.ul}`;
  const body = { certificato };
  const res = await inviaOperazioneRentriCustom(cliente, "POST", path, body);
  const d = asRecord(res.data);
  const r = asRecord(d.result ?? d);
  return {
    path,
    body,
    res,
    digest_to_sign: r.digest_to_sign ? String(r.digest_to_sign) : "",
    token: r.token ? String(r.token) : "",
    hash_algorithm: r.hash_algorithm ? String(r.hash_algorithm) : HASH_ALGO_SHA256,
  };
}

/* ────────────── 4. Autorizzazione remota (conferma mobile) ────────────── */

export async function authorizeRemoteSignature(
  cliente: RentriCliente,
  credentialsId: string,
  digestToSign: string,
  numeroFir: string,
) {
  const path = `/ca-rentri/v1.0/credentials/authorize`;
  const body = {
    credentials_id: credentialsId,
    num_signatures: 1,
    hashes: [digestToSign],
    hash_algo: HASH_ALGO_SHA256,
    description: `Firma xFIR ${numeroFir}`,
    auth_data: [{ id: "mobile" }],
  };
  const res = await inviaOperazioneRentriCustom(cliente, "POST", path, body);
  const d = asRecord(res.data);
  return {
    path,
    body,
    res,
    handle: d.handle ? String(d.handle) : "",
    sad: d.sad ? String(d.sad) : "",
    expires_in: Number(d.expires_in ?? 0),
  };
}

export async function pollAuthorizeCheck(cliente: RentriCliente, handle: string) {
  const path = `/ca-rentri/v1.0/credentials/authorize-check/${encodeURIComponent(handle)}`;
  const res = await inviaOperazioneRentriCustom(cliente, "GET", path, null);
  const d = asRecord(res.data);
  const stato = String(d.status ?? d.stato ?? d.state ?? "").toLowerCase();
  const confermato =
    d.confirmed === true ||
    d.authorized === true ||
    /confirm|authorized|autorizz|complete|signed/.test(stato);
  const rifiutato = /denied|refus|rifiut|reject|expired|scadut/.test(stato);
  return { path, res, confermato, rifiutato, stato, sad: d.sad ? String(d.sad) : "" };
}

/* ────────────── 5. Firma remota dell'hash ────────────── */

export async function signHashRemote(
  cliente: RentriCliente,
  credentialsId: string,
  sad: string,
  digestToSign: string,
  signAlgo: string,
) {
  const path = `/ca-rentri/v1.0/signatures/sign-hash`;
  const body = {
    credentials_id: credentialsId,
    sad,
    hashes: [digestToSign],
    sign_algo: signAlgo,
    hash_algo: HASH_ALGO_SHA256,
  };
  const res = await inviaOperazioneRentriCustom(cliente, "POST", path, body);
  const d = asRecord(res.data);
  const firme: unknown[] = Array.isArray(d.signatures)
    ? d.signatures
    : Array.isArray(d.firme)
      ? d.firme
      : Array.isArray(res.data)
        ? (res.data as unknown[])
        : [];
  const firma = firme.length > 0 ? String(firme[0]) : d.signature ? String(d.signature) : "";
  return { path, body: { ...body, sad: "***" }, res, firma };
}

/* ────────────── 6. Acquisizione firma sul FIR ────────────── */

export async function acquisizioneFirma(
  cliente: RentriCliente,
  numeroFir: string,
  certificato: string,
  token: string,
  firma: string,
  credentialsId: string,
  cf?: string,
  ul?: string,
) {
  const s = soggetto(cliente, cf, ul);
  const path =
    `/formulari/v1.0/${firId(numeroFir)}/acquisizione-firma` +
    `?identificativo_soggetto=${s.cf}&num_iscr_sito=${s.ul}`;
  const body = {
    certificato,
    token,
    firma,
    identificativo_utente: credentialsId,
  };
  const res = await inviaOperazioneRentriCustom(cliente, "POST", path, body);
  const d = asRecord(res.data);
  const transazione = d.transazione_id ?? d.transazioneId ?? d.id_transazione ?? d.id;
  return { path, body: { ...body, firma: "***" }, res, transazione_id: transazione ? String(transazione) : "" };
}

export async function pollTransazioneFormulario(cliente: RentriCliente, transazioneId: string) {
  const path = `/formulari/v1.0/transazioni/${encodeURIComponent(transazioneId)}/result`;
  const res = await inviaOperazioneRentriCustom(cliente, "GET", path, null);
  const d = asRecord(res.data);
  return {
    path,
    res,
    errore: d.errore === true,
    completato: res.success && d.errore !== true,
    messaggio: String(d.messaggio ?? d.message ?? d.descrizione ?? ""),
  };
}

/* ────────────── Persistenza minima ────────────── */

export async function salvaSessioneFirma(cliente: RentriCliente, sessione: XfirSessione) {
  try {
    await supabase.from("rentri_firma_sessioni").insert([
      {
        cliente: rentriConfigKey(cliente),
        numero_fir: sessione.numero_fir,
        credentials_id: sessione.credentials_id ?? null,
        device_description: sessione.device_description ?? null,
        digest_to_sign: sessione.digest_to_sign ?? null,
        token: sessione.token ?? null,
        handle: sessione.handle ?? null,
        authorize_at: sessione.authorize_at ?? null,
        conferma_mobile_at: sessione.conferma_mobile_at ?? null,
        esito_sign_hash: sessione.esito_sign_hash ?? null,
        esito_acquisizione_firma: sessione.esito_acquisizione_firma ?? null,
        stato_finale: sessione.stato_finale ?? null,
        log_raw: sessione.log as unknown,
      } as never,
    ]);
  } catch {
    /* la persistenza non deve mai bloccare il flusso di firma */
  }
  // Il `sad` non viene MAI persistito: vive solo nella finestra operativa.
}

/* ────────────── Orchestratore ────────────── */

export type XfirFase =
  | "dettaglio"
  | "trasporto"
  | "verifica-stato"
  | "credenziali"
  | "credenziale-info"
  | "hash"
  | "authorize"
  | "attesa-conferma"
  | "sign-hash"
  | "acquisizione-firma"
  | "transazione"
  | "verifica-finale"
  | "completato"
  | "errore";

export interface XfirProgress {
  fase: XfirFase;
  messaggio: string;
  sessione: XfirSessione;
  /** secondi rimanenti per la conferma mobile */
  scadenzaSecondi?: number;
  device?: string;
}

export interface StartDepartureOptions {
  cliente: RentriCliente;
  numeroFir: string;
  /** payload dei dati di trasporto: inviato solo se il FIR è in InserimentoTrasportoIniziale */
  datiTrasporto?: Record<string, unknown>;
  credentialsId?: string;
  codiceFiscale?: string;
  numIscrSito?: string;
  /** timeout della conferma mobile (default 180s) */
  timeoutConfermaMs?: number;
  onProgress?: (p: XfirProgress) => void;
  /** interrompe l'attesa della conferma mobile */
  isAborted?: () => boolean;
}

export interface XfirResult {
  ok: boolean;
  statoFinale: string;
  sessione: XfirSessione;
  errore?: string;
  codiceErrore?: string;
}

/**
 * Flusso completo di partenza xFIR, senza scorciatoie:
 * dettaglio → (trasporto) → stato firmabile → credentials/list → credentials/info
 * → /hash → authorize → conferma mobile → sign-hash → acquisizione-firma
 * → polling result → rilettura stato = InserimentoAccettazione.
 */
export async function startDepartureXfirFlow(opts: StartDepartureOptions): Promise<XfirResult> {
  const {
    cliente,
    numeroFir,
    datiTrasporto,
    credentialsId,
    codiceFiscale,
    numIscrSito,
    timeoutConfermaMs = 180_000,
    onProgress,
    isAborted,
  } = opts;

  const sessione: XfirSessione = { numero_fir: numeroFir, log: [] };
  const emit = (fase: XfirFase, messaggio: string, extra?: Partial<XfirProgress>) =>
    onProgress?.({ fase, messaggio, sessione, ...extra });

  const fallisci = async (messaggio: string, codice?: string): Promise<XfirResult> => {
    sessione.stato_finale = sessione.stato_finale ?? "ERRORE";
    emit("errore", messaggio);
    await salvaSessioneFirma(cliente, sessione);
    return { ok: false, statoFinale: sessione.stato_finale, sessione, errore: messaggio, codiceErrore: codice };
  };

  // 1. Dettaglio FIR
  emit("dettaglio", "Lettura stato FIR dal RENTRI…");
  let det = await getDettaglioFir(cliente, numeroFir, codiceFiscale, numIscrSito);
  logStep(sessione, "dettaglio", "GET", det.path, null, det.res);
  if (!det.res.success) return fallisci(det.res.userMessage || det.res.error || "FIR non leggibile dal RENTRI");
  let stato = statoDalDettaglio(det.res.data);

  // 2. Dati di trasporto (solo se richiesto e se lo stato lo consente)
  if (stato === STATO_TRASPORTO_INIZIALE && datiTrasporto) {
    emit("trasporto", "Invio dati di trasporto…");
    const tr = await startTrasportoFir(cliente, numeroFir, datiTrasporto, codiceFiscale, numIscrSito);
    logStep(sessione, "trasporto", "POST", tr.path, datiTrasporto, tr.res);
    if (!tr.res.success) return fallisci(tr.res.userMessage || tr.res.error || "Invio dati di trasporto fallito");

    emit("verifica-stato", "Rilettura stato FIR…");
    det = await getDettaglioFir(cliente, numeroFir, codiceFiscale, numIscrSito);
    logStep(sessione, "dettaglio-post-trasporto", "GET", det.path, null, det.res);
    stato = statoDalDettaglio(det.res.data);
  }

  // 3. Stato firmabile obbligatorio
  if (stato !== STATO_FIRMABILE) {
    return fallisci(
      `Il FIR è in stato "${stato || "sconosciuto"}": la firma non è possibile finché non risulta ${STATO_FIRMABILE}.`,
      "fir.statoFormularioNonCompatibile",
    );
  }

  // 4. Credenziali remote attive
  emit("credenziali", "Ricerca credenziali di firma remota…");
  const lista = await listActiveCredentials(cliente, codiceFiscale, numIscrSito);
  logStep(sessione, "credentials-list", "GET", lista.path, null, lista.res);
  if (lista.credenziali.length === 0) {
    return fallisci(
      "Nessuna credenziale di firma remota attiva per questa unità locale: serve l'onboarding del dispositivo sul portale RENTRI.",
      "credentials.nessunaAttiva",
    );
  }
  const scelta =
    lista.credenziali.find((c) => c.credentials_id === credentialsId) ?? lista.credenziali[0];
  sessione.credentials_id = scelta.credentials_id;

  // 5. Info credenziale (certificato remoto + algoritmo)
  emit("credenziale-info", "Lettura certificato remoto…");
  const info = await getCredentialInfo(cliente, scelta.credentials_id);
  logStep(sessione, "credentials-info", "GET", info.path, null, info.res);
  if (!info.info) {
    return fallisci("La credenziale remota non espone alcun certificato: flusso bloccato.", "credentials.certificatoMancante");
  }
  sessione.device_description = info.info.description;

  // 6. Hash da firmare
  emit("hash", "Richiesta hash del formulario…");
  const hash = await getHashToSign(cliente, numeroFir, info.info.certificato, codiceFiscale, numIscrSito);
  logStep(sessione, "hash", "POST", hash.path, hash.body, hash.res);
  if (!hash.res.success || !hash.digest_to_sign || !hash.token) {
    return fallisci(hash.res.userMessage || hash.res.error || "Il RENTRI non ha restituito digest e token");
  }
  sessione.digest_to_sign = hash.digest_to_sign;
  sessione.token = hash.token;

  // 7. Autorizzazione con conferma mobile
  emit("authorize", "Invio notifica al dispositivo…");
  const auth = await authorizeRemoteSignature(cliente, scelta.credentials_id, hash.digest_to_sign, numeroFir);
  logStep(sessione, "authorize", "POST", auth.path, auth.body, auth.res);
  if (!auth.res.success || !auth.handle) {
    return fallisci(auth.res.userMessage || auth.res.error || "Autorizzazione di firma non avviata");
  }
  sessione.handle = auth.handle;
  sessione.authorize_at = new Date().toISOString();

  // 8. Attesa conferma mobile — nessun sign-hash prima della conferma
  const scadenza = Date.now() + Math.min(timeoutConfermaMs, (auth.expires_in || 0) * 1000 || timeoutConfermaMs);
  let sad = "";
  while (Date.now() < scadenza) {
    if (isAborted?.()) return fallisci("Attesa conferma mobile interrotta dall'operatore.");
    emit("attesa-conferma", "Notifica inviata al dispositivo: conferma la firma sul cellulare.", {
      scadenzaSecondi: Math.max(0, Math.round((scadenza - Date.now()) / 1000)),
      device: info.info.description,
    });
    await new Promise((r) => setTimeout(r, 3000));
    const check = await pollAuthorizeCheck(cliente, auth.handle);
    logStep(sessione, "authorize-check", "GET", check.path, null, check.res);
    if (check.rifiutato) return fallisci("Autorizzazione rifiutata o scaduta sul dispositivo.", "sign.sadAutorizzazioneNonConfermata");
    if (check.confermato) {
      sad = check.sad || auth.sad;
      sessione.conferma_mobile_at = new Date().toISOString();
      break;
    }
  }
  if (!sad) {
    return fallisci(
      "Conferma sul dispositivo non ricevuta: la firma non è stata tentata.",
      "sign.sadAutorizzazioneNonConfermata",
    );
  }

  // 9. Firma remota dell'hash
  emit("sign-hash", "Firma remota in corso…");
  const sign = await signHashRemote(cliente, scelta.credentials_id, sad, hash.digest_to_sign, info.info.sign_algo);
  logStep(sessione, "sign-hash", "POST", sign.path, sign.body, sign.res);
  sessione.esito_sign_hash = sign.res.success ? "OK" : `KO ${sign.res.status}`;
  if (!sign.res.success || !sign.firma) {
    return fallisci(sign.res.userMessage || sign.res.error || "Firma remota non restituita");
  }

  // 10. Acquisizione firma sul FIR
  emit("acquisizione-firma", "Invio firma al formulario…");
  const acq = await acquisizioneFirma(
    cliente,
    numeroFir,
    info.info.certificato,
    hash.token,
    sign.firma,
    scelta.credentials_id,
    codiceFiscale,
    numIscrSito,
  );
  logStep(sessione, "acquisizione-firma", "POST", acq.path, acq.body, acq.res);
  sessione.esito_acquisizione_firma = acq.res.success ? "ACCETTATA" : `KO ${acq.res.status}`;
  if (!acq.res.success) {
    return fallisci(acq.res.userMessage || acq.res.error || "Acquisizione firma rifiutata dal RENTRI");
  }

  // 11. Polling esito transazione
  if (acq.transazione_id) {
    emit("transazione", "Verifica esito transazione…");
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const t = await pollTransazioneFormulario(cliente, acq.transazione_id);
      logStep(sessione, "transazione-result", "GET", t.path, null, t.res);
      if (t.errore) return fallisci(t.messaggio || "Transazione di firma in errore");
      if (t.completato) break;
    }
  }

  // 12. Rilettura stato finale — unica prova di partenza
  emit("verifica-finale", "Rilettura FIR dal RENTRI…");
  const finale = await getDettaglioFir(cliente, numeroFir, codiceFiscale, numIscrSito);
  logStep(sessione, "dettaglio-finale", "GET", finale.path, null, finale.res);
  const statoFinale = statoDalDettaglio(finale.res.data);
  sessione.stato_finale = statoFinale;
  await salvaSessioneFirma(cliente, sessione);

  if (statoFinale !== STATO_PARTITO) {
    return {
      ok: false,
      statoFinale,
      sessione,
      errore: `Firma inviata ma il RENTRI riporta ancora lo stato "${statoFinale || "sconosciuto"}": il FIR non risulta partito.`,
    };
  }

  emit("completato", "FIR firmato e partito (InserimentoAccettazione).");
  return { ok: true, statoFinale, sessione };
}
