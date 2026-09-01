import { useState } from "react";
import { FileCheck2, X, ChevronDown, ChevronUp, Trash2 } from "lucide-react";

const STORAGE_KEY = "dev-report-stato-2026-09-01-hidden";

const CONTROLLI: { n: number; label: string; ok: boolean; nota?: string }[] = [
  { n: 1, label: "Giacenze Dragon mai negative", ok: true },
  { n: 2, label: "Giacenze magazzino mai negative", ok: true },
  { n: 3, label: "Registro Dragon allineato al magazzino", ok: true },
  { n: 4, label: "Controlli automatici di allineamento attivi", ok: true },
  { n: 5, label: "Ogni conferimento privato ha la ricevuta (362/362)", ok: true },
  { n: 6, label: "Ricevute coerenti con i movimenti", ok: true },
  { n: 7, label: "Nessun codice materiale duplicato", ok: true },
  { n: 8, label: "Nessun numero formulario duplicato", ok: true },
  { n: 9, label: "Movimenti privati con ricevuta RENTRI", ok: false, nota: "3 posizioni aperte" },
  { n: 10, label: "Cernite completate con materiali in uscita", ok: true },
];

const APERTE = [
  "Prog. RENTRI 2026/272 (11/07, Cavazza Richard): trasmesso 4.317 kg invece di 43,17 kg — da rettificare sul RENTRI.",
  "Movimenti 361 e 362 (120 + 134 kg): mai trasmessi al RENTRI, ora in Console RENTRI › Privati fra i «da inviare».",
  "Prog. RENTRI 2026/1 (02/01, 355 kg): accettato (202) ma ricevuta non nel listato ufficiale — verificare al prossimo scarico.",
];

export function ReportStatoCard() {
  const [hidden, setHidden] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);

  if (hidden) return null;

  const elimina = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setHidden(true);
  };

  return (
    <div className="mb-4 rounded-xl border border-emerald-500/40 bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <FileCheck2 size={20} className="text-emerald-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-emerald-300">
            Report stato sistema — 1 settembre 2026
          </div>
          <div className="text-xs text-muted-foreground">
            9/10 controlli verdi · 51/51 test OK · Dragon e magazzino allineati (scostamento 0)
          </div>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 transition-colors"
        >
          {open ? (
            <>
              <ChevronUp size={14} /> Chiudi
            </>
          ) : (
            <>
              <ChevronDown size={14} /> Dettagli
            </>
          )}
        </button>
        {confirming ? (
          <div className="flex items-center gap-1">
            <button
              onClick={elimina}
              className="text-xs px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30 transition-colors"
            >
              Conferma
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="text-xs px-2 py-1.5 rounded-lg border border-border/40 text-muted-foreground hover:bg-muted/30 transition-colors"
            >
              Annulla
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            title="Elimina report dalla dashboard"
            className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 size={14} /> Elimina
          </button>
        )}
      </div>

      {/* Body */}
      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-border/20 pt-3 text-sm">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Controllo a 10 fattori
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
              {CONTROLLI.map((c) => (
                <div key={c.n} className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${c.ok ? "bg-emerald-400" : "bg-amber-400"}`}
                  />
                  <span className="text-xs">
                    <span className="text-muted-foreground">{c.n}.</span> {c.label}
                    {c.nota && <span className="text-amber-400"> — {c.nota}</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Correzioni eseguite
            </div>
            <ul className="list-disc list-inside text-xs space-y-1 text-foreground/90">
              <li>
                2 movimenti su azienda errata (vitale elisabetta 120 kg, BONINO ALEX 134 kg) spostati su
                Multyproget, progressivi 361/362 — ora «da inviare» in Console RENTRI.
              </li>
              <li>
                Giacenze aggiornate: 200140-FE 73.431 → 73.551 kg, 200140-CAVO 9.073 → 9.207 kg.
              </li>
              <li>Rimossi doppioni e movimenti di allineamento duplicati.</li>
              <li>Ricevute n. 1 e n. 272 con nota di anomalia nella colonna esito della console.</li>
            </ul>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-amber-400 mb-2">
              Posizioni ancora aperte
            </div>
            <ul className="list-disc list-inside text-xs space-y-1 text-foreground/90">
              {APERTE.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </div>

          <div className="text-xs text-muted-foreground">
            Numerazione interna sfalsata di 1 dal progressivo 239 (conseguenza dei 2 movimenti recuperati):
            l'abbinamento movimenti/ricevute avviene per data + materiale + peso, nessun falso positivo.
            Punto di ripristino: scrivi in chat «ripristina il punto del 1 settembre».
          </div>
        </div>
      )}
    </div>
  );
}
