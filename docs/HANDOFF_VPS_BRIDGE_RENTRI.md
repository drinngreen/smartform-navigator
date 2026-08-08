# Handoff Diagnostico — Bridge RENTRI (VPS)

**Destinatario:** Gestore del VPS / bridge RENTRI
**Redatto:** 2026-08-08
**Classe:** Diagnostica in sola lettura — nessuna azione richiesta su Lovable

---

## 1. Contesto

Durante un test reale in sola lettura verso RENTRI, la Edge Function `rentri-vps-proxy` (Lovable Cloud) ha inoltrato la richiesta al bridge pubblico come da contratto. Il bridge ha risposto **HTTP 500**, quindi il guasto è a valle del proxy Lovable, non sul lato applicativo.

**Non è stato eseguito alcun POST operativo né alcun retry.**

---

## 2. Dati della richiesta

| Voce | Valore |
|---|---|
| Timestamp UTC richiesta | `2026-08-08T14:06:52.171Z` |
| Timestamp UTC risposta | `2026-08-08T14:07:02.577Z` |
| Durata approssimativa | ~10,4 secondi |
| Endpoint bridge | `POST /invia-operazione` |
| URL bridge | `https://rentri-bridge.dragonrifiuti.space/invia-operazione` |
| Tenant bridge | `multyproget` |
| Metodo RENTRI | `GET` |
| RENTRI path | `/vidimazione-formulari/v1.0?identificativo=12347770013` |
| Payload | `null` |
| Tentativi | 1 (nessun retry, nessun fallback) |
| POST operativo a RENTRI | **No** |

### Body inviato al bridge (struttura, campi non sensibili)

```json
{
  "cliente": "multyproget",
  "rentri_method": "GET",
  "rentri_path": "/vidimazione-formulari/v1.0?identificativo=12347770013",
  "payload": null
}
```

Header inviati: `Content-Type: application/json`, `x-bridge-key: <redatto>`.

---

## 3. Esito

| Voce | Valore |
|---|---|
| Esito bridge | **HTTP 500** |
| Body sanitizzato bridge | `{"error":"Errore del bridge RENTRI"}` |
| Edge Function | Ha ricevuto e **propagato correttamente** il 500 (non mascherato come 200) |
| Scritture DB | 0 |
| Chiave bridge | Non richiesta, non mostrata, non inclusa in questo handoff |

---

## 4. Risoluzione configurazione (lato Lovable)

- `multyproget` è risolto tramite alias verso la configurazione `multy`.
- **Unit ID** e **registry ID** risultano presenti e validi (verificato in dry-run prima della chiamata reale).
- I blocchi FIR attesi per Multyproget sono configurati nel proxy.
- Nessuna anomalia lato Edge Function: la richiesta è conforme al contratto e l'errore è generato esclusivamente dal bridge.

---

## 5. Prossimo passo (per il gestore VPS)

Leggere i **log del processo bridge sul VPS** nella finestra temporale:

```
2026-08-08 14:06:45Z  –  2026-08-08 14:07:10Z
```

Cercare in particolare:
- connessione/mTLS verso RENTRI fallita o rifiutata;
- errore di autenticazione/tenant per `multyproget`;
- eccezione non gestita nel processo bridge (source del 500 generico `{"error":"Errore del bridge RENTRI"}`);
- eventuale timeout verso RENTRI (~10s di durata totale suggeriscono un timeout lato bridge).

**Non ripetere la richiesta da Lovable** e **non modificare nulla su Lovable** (codice, Edge Function, secret, migrazioni, UI o configurazioni). L'anomalia è isolata sul VPS/bridge.

---

## 6. Riepilogo vincoli rispettati

- ✅ Nessuna modifica a codice, Edge Function, UI, secret, migrazioni o configurazioni
- ✅ Nessuna ulteriore chiamata al bridge o a RENTRI
- ✅ Nessuna scrittura nel database
- ✅ Chiave bridge non esposta
- ✅ Nessun retry, fallback o POST operativo
