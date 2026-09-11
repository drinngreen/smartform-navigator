import { DevRegistroGeneraleModule } from "./DevRegistroGeneraleModule";

/**
 * Impianto → Registro C/S.
 * Vista UNICA: usa esattamente la stessa sorgente dati del Registro Generale
 * (tabella registro_generale + privati + cernite), così i due registri non possono
 * più divergere. Ogni modifica fatta da una parte è immediatamente visibile nell'altra.
 */
export function DevRegistroCaricoScaricoModule() {
  return <DevRegistroGeneraleModule />;
}
