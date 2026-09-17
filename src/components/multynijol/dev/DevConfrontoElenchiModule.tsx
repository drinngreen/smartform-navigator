import { useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import {
  leggiElencoFormulari,
  confrontaConRegistro,
  normalizzaChiaveFir,
  versoMovimento,
  type FormularioElenco,
} from "@/lib/confrontoFormulariExcel";

/**
 * Confronto elenchi formulari ↔ registro cronologico.
 * Inserisce SOLO le registrazioni documentali mancanti.
 * Non tocca mai giacenze, cernite o Dragon e non invia nulla al RENTRI.
 */

const MULTY_TENANT_ID = "77ec9a3d-602e-438f-97bf-1c69abd8f691";
const NIYOL_TENANT_ID = "819c783e-78dd-4080-8265-802e75b0d813";

const REGISTRI = [
  { id: "MULTY_IMPIANTO", label: "Impianto", tenant: MULTY_TENANT_ID },
  { id: "MULTY_CONTO_PROPRIO", label: "Conto Proprio", tenant: MULTY_TENANT_ID },
  { id: "NIYOL", label: "Niyol", tenant: NIYOL_TENANT_ID },
  { id: "MULTY_INTERMEDIARIO", label: "Intermediazione", tenant: MULTY_TENANT_ID },
] as const;

type RegistroId = (typeof REGISTRI)[number]["id"];

interface Esito {
  presenti: FormularioElenco[];
  mancanti: FormularioElenco[];
  bozze: FormularioElenco[];
  nomeFile: string;
}

export function DevConfrontoElenchiModule() {
  const [registro, setRegistro] = useState<RegistroId>("MULTY_IMPIANTO");
  const [esito, setEsito] = useState<Esito | null>(null);
  const [selezione, setSelezione] = useState<Set<string>>(new Set());
  const [caricamento, setCaricamento] = useState(false);
  const [inserimento, setInserimento] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const cfg = REGISTRI.find((r) => r.id === registro)!;

  const analizza = async (file: File) => {
    setCaricamento(true);
    setEsito(null);
    setSelezione(new Set());
    try {
      const elenco = leggiElencoFormulari(await file.arrayBuffer());
      if (elenco.length === 0) {
        toast.error("Nessun formulario leggibile nel file selezionato.");
        return;
      }
      const { data, error } = await supabase
        .from("registro_generale" as any)
        .select("numero_formulario")
        .not("numero_formulario", "is", null);
      if (error) throw error;
      const chiavi = new Set(
        (data ?? []).map((r: any) => normalizzaChiaveFir(r.numero_formulario)).filter(Boolean),
      );
      const risultato = confrontaConRegistro(elenco, chiavi);
      setEsito({ ...risultato, nomeFile: file.name });
      setSelezione(new Set(risultato.mancanti.map((m) => m.chiave!)));
      toast.success(
        `${elenco.length} formulari letti · ${risultato.mancanti.length} da registrare · ${risultato.bozze.length} bozze escluse`,
      );
    } catch (e: any) {
      toast.error(`Lettura non riuscita: ${e?.message ?? e}`);
    } finally {
      setCaricamento(false);
    }
  };

  const registraMancanti = async () => {
    if (!esito) return;
    const daInserire = esito.mancanti.filter((m) => selezione.has(m.chiave!));
    if (daInserire.length === 0) {
      toast.error("Nessun formulario selezionato.");
      return;
    }
    setInserimento(true);
    try {
      const righe = daInserire.map((m) => ({
        tenant_id: cfg.tenant,
        registro: cfg.id,
        data_movimento: m.dataEmissione,
        data_emissione_formulario: m.dataEmissione,
        numero_formulario: m.numeroFir,
        numero_interno: m.numeroInterno ? String(m.numeroInterno) : null,
        cer: m.cer,
        descrizione: m.descrizione,
        quantita: m.quantitaKg,
        carico_scarico: versoMovimento(m.tipo, m.destinatario),
        luogo_produzione: m.produttore,
        destinazione: m.destinatario,
        stato_movimento: "effettivo",
        al_rentri: false,
        annotazioni: `Registrazione documentale da elenco ${esito.nomeFile}`,
        created_by_agent: true,
      }));
      const { error } = await supabase.from("registro_generale" as any).insert(righe as any);
      if (error) throw error;
      toast.success(`${righe.length} registrazioni documentali aggiunte. Giacenze invariate.`);
      setEsito({
        ...esito,
        presenti: [...esito.presenti, ...daInserire],
        mancanti: esito.mancanti.filter((m) => !selezione.has(m.chiave!)),
      });
      setSelezione(new Set());
    } catch (e: any) {
      toast.error(`Inserimento non riuscito: ${e?.message ?? e}`);
    } finally {
      setInserimento(false);
    }
  };

  const toggle = (chiave: string) => {
    setSelezione((prev) => {
      const next = new Set(prev);
      next.has(chiave) ? next.delete(chiave) : next.add(chiave);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/40 bg-card/60 p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-bold">
          <FileSpreadsheet size={16} className="text-emerald-400" />
          Confronto elenchi formulari — solo registrazione documentale
        </div>
        <p className="mb-3 text-xs text-muted-foreground">
          Carica l'elenco esportato dal gestionale. Vengono aggiunti solo i formulari assenti nel
          registro. Le bozze restano escluse. Giacenze, cernite e invii al RENTRI non vengono toccati.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={registro}
            onChange={(e) => {
              setRegistro(e.target.value as RegistroId);
              setEsito(null);
              setSelezione(new Set());
            }}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            {REGISTRI.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void analizza(f);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={caricamento}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {caricamento ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
            Carica elenco Excel
          </button>
        </div>
      </div>

      {esito && (
        <div className="rounded-2xl border border-border/40 bg-card/60 p-4">
          <div className="mb-3 flex flex-wrap items-center gap-4 text-xs font-semibold">
            <span className="flex items-center gap-1 text-emerald-400">
              <CheckCircle2 size={14} /> Già presenti: {esito.presenti.length}
            </span>
            <span className="flex items-center gap-1 text-amber-400">
              <AlertTriangle size={14} /> Da registrare: {esito.mancanti.length}
            </span>
            <span className="text-muted-foreground">Bozze escluse: {esito.bozze.length}</span>
          </div>

          {esito.mancanti.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nessun formulario mancante: l'elenco coincide con il registro.
            </p>
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border border-border/30">
                <table className="w-full text-xs">
                  <thead className="bg-secondary/60 text-left">
                    <tr>
                      <th className="p-2"> </th>
                      <th className="p-2">Formulario</th>
                      <th className="p-2">Data</th>
                      <th className="p-2">CER</th>
                      <th className="p-2">Kg</th>
                      <th className="p-2">Produttore</th>
                      <th className="p-2">Destinatario</th>
                      <th className="p-2">Stato</th>
                    </tr>
                  </thead>
                  <tbody>
                    {esito.mancanti.map((m) => (
                      <tr key={m.chiave!} className="border-t border-border/20">
                        <td className="p-2">
                          <input
                            type="checkbox"
                            checked={selezione.has(m.chiave!)}
                            onChange={() => toggle(m.chiave!)}
                            aria-label={`Seleziona ${m.numeroFir}`}
                          />
                        </td>
                        <td className="p-2 font-mono">{m.numeroFir}</td>
                        <td className="p-2">{m.dataEmissione}</td>
                        <td className="p-2">{m.cer}</td>
                        <td className="p-2">{m.quantitaKg?.toLocaleString("it-IT")}</td>
                        <td className="p-2">{m.produttore}</td>
                        <td className="p-2">{m.destinatario}</td>
                        <td className="p-2">{m.statoFormulario}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                type="button"
                onClick={registraMancanti}
                disabled={inserimento || selezione.size === 0}
                className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {inserimento && <Loader2 size={15} className="animate-spin" />}
                Registra {selezione.size} formulari nel registro {cfg.label}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
