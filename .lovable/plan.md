

## Piano: Aggiornare la Mappatura Codici Blocco RENTRI

### Contesto
I test di vidimazione falliscono con 404 perche il sistema non invia il `codice_blocco` corretto per ogni azienda. Ora abbiamo la lista completa dei blocchi validi.

### Dati Codici Blocco

```text
GLOBAL RECO (08934760961)
  FMGWB  (TO0001) - 71.376 FIR
  SKKZR  (TO0001) - 1 FIR
  XNQLK  (MI0001) - 57.900 FIR
  GPFMK  (no sito) - 1 FIR

MULTY PROGET (12347770013)
  ZRZXR  (TO0001) - 534 FIR
  FRVKM  (no sito) - 787 FIR

NIYOL (09879800010)
  BPJMG  (TO0001) - 322 FIR
  DGXYQ  (no sito) - 1 FIR
```

### Modifiche

**1. Edge Function `rentri-vps-proxy/index.ts`**
- Aggiungere una mappa `BLOCK_CODES` per-cliente con blocco primario (sito TO0001) e alternativi
- Quando `tipo_operazione === "VIDIMAZIONE"` e il payload non contiene `codice_blocco`, iniettare automaticamente il blocco primario del cliente
- Passare anche `num_iscr_sito` corretto (TO0001 per il blocco primario)

**2. `rentri-test/config.ts`**
- Aggiornare la configurazione con tutti i blocchi per ogni azienda (legacy + current + alternativi)

**3. `src/components/superadmin/RENTRIDemoTestHub.tsx`**
- Aggiungere selettore codice blocco nella UI vidimazione, pre-popolato con i blocchi del tenant attivo
- Il blocco primario (con sito TO0001) selezionato di default

**4. `src/components/superadmin/FIRPoolSection.tsx`**
- Aggiungere selettore codice blocco anche qui, stessa logica

**5. `src/pages/multynijol/MNRENTRIPage.tsx`**
- Aggiungere helper per auto-compilare il `codice_blocco` nel payload quando si seleziona VIDIMAZIONE

### Risultato
Le vidimazioni invieranno automaticamente il codice blocco corretto per ogni azienda, eliminando gli errori 404.

