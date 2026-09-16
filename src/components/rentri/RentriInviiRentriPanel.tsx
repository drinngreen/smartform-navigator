import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, RefreshCw } from "lucide-react";
import { ricercaMovimenti, RENTRI_REGISTRI, type RentriCliente } from "@/lib/rentriVpsApi";

interface RigaRentri {
  societa: string;
  registro: string;
  progressivo: string;
  data: string;
  tipo: string;
  cer: string;
  quantita: string;
  fir: string;
  raw: unknown;
}

const SOCIETA: { key: "multy" | "niyol"; label: string }[] = [
  { key: "multy", label: "Multyproget" },
  { key: "niyol", label: "Niyol" },
];

function str(v: unknown): string {
  return v === null || v === undefined ? "" : String(v);
}

function mapMov(d: any, societa: string, registro: string): RigaRentri {
  const rif = Array.isArray(d?.riferimenti_fir) ? d.riferimenti_fir[0] ?? {} : d?.fir ?? {};
  return {
    societa,
    registro,
    progressivo: str(d?.numero_progressivo ?? d?.progressivo ?? d?.numero_registrazione),
    data: str(d?.data_registrazione ?? d?.dataRegistrazione ?? d?.data),
    tipo: str(d?.tipo_movimento ?? d?.tipo ?? d?.causale),
    cer: str(d?.codice_eer ?? d?.cer ?? d?.rifiuto?.codice_eer),
    quantita: str(d?.quantita?.valore ?? d?.quantita ?? d?.rifiuto?.quantita),
    fir: str(rif?.numero_fir ?? d?.numero_fir),
    raw: d,
  };
}

function isoDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

/** Lettura in sola lettura dei movimenti realmente presenti sui registri RENTRI. */
export function RentriInviiRentriPanel() {
  const [loading, setLoading] = useState(false);
  const [righe, setRighe] = useState<RigaRentri[]>([]);
  const [errori, setErrori] = useState<string[]>([]);
  const [dataDa, setDataDa] = useState(() => isoDaysAgo(30));
  const [dataA, setDataA] = useState(() => new Date().toISOString().slice(0, 10));
  const [societaSel, setSocietaSel] = useState<"tutte" | "multy" | "niyol">("tutte");
  const [detail, setDetail] = useState<unknown>(null);

  const daLeggere = useMemo(
    () => (societaSel === "tutte" ? SOCIETA : SOCIETA.filter((s) => s.key === societaSel)),
    [societaSel],
  );

  const carica = useCallback(async () => {
    setLoading(true);
    const acc: RigaRentri[] = [];
    const errs: string[] = [];
    for (const s of daLeggere) {
      for (const reg of RENTRI_REGISTRI[s.key] ?? []) {
        try {
          const res = await ricercaMovimenti(s.key as RentriCliente, dataDa, dataA, reg.id);
          if (!res.success) throw new Error(res.error || `Errore ${res.status}`);
          const raw = res.data as any;
          const list = Array.isArray(raw) ? raw : raw?.movimenti ?? raw?.items ?? raw?.content ?? [];
          for (const m of Array.isArray(list) ? list : []) acc.push(mapMov(m, s.label, reg.nome));
        } catch (e: any) {
          errs.push(`${s.label} · ${reg.nome}: ${e.message}`);
        }
      }
    }
    acc.sort((a, b) => b.data.localeCompare(a.data));
    setRighe(acc);
    setErrori(errs);
    setLoading(false);
    if (errs.length) toast.error(`RENTRI: ${errs.length} registri non leggibili`);
    else toast.success(`${acc.length} movimenti letti dai registri RENTRI`);
  }, [daLeggere, dataDa, dataA]);

  useEffect(() => {
    carica();
  }, [carica]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={carica}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {loading ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />}
          Leggi dal RENTRI
        </button>
        <div className="flex overflow-hidden rounded-md border border-border">
          {(["tutte", "multy", "niyol"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSocietaSel(s)}
              className={`px-3 py-2 text-xs font-semibold ${
                societaSel === s ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"
              }`}
            >
              {s === "tutte" ? "Multy + Niyol" : s === "multy" ? "Multyproget" : "Niyol"}
            </button>
          ))}
        </div>
        <input
          type="date"
          value={dataDa}
          onChange={(e) => setDataDa(e.target.value)}
          className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
        />
        <input
          type="date"
          value={dataA}
          onChange={(e) => setDataA(e.target.value)}
          className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
        />
        <span className="text-xs text-muted-foreground">{righe.length} movimenti sul RENTRI</span>
      </div>

      {errori.length > 0 && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
          {errori.map((e) => (
            <div key={e}>{e}</div>
          ))}
        </div>
      )}

      <div className="max-h-[420px] overflow-auto rounded-xl border border-border/30">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Società</th>
              <th className="px-3 py-2 text-left">Registro</th>
              <th className="px-3 py-2 text-left">Progr.</th>
              <th className="px-3 py-2 text-left">Data</th>
              <th className="px-3 py-2 text-left">Tipo</th>
              <th className="px-3 py-2 text-left">CER</th>
              <th className="px-3 py-2 text-right">Q.tà</th>
              <th className="px-3 py-2 text-left">FIR</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {righe.map((r, i) => (
              <tr key={`${r.societa}-${r.registro}-${r.progressivo}-${i}`} className="border-t border-border/20">
                <td className="px-3 py-2 text-xs font-semibold">{r.societa}</td>
                <td className="px-3 py-2 text-xs">{r.registro}</td>
                <td className="px-3 py-2 font-mono text-xs">{r.progressivo || "—"}</td>
                <td className="px-3 py-2 text-xs">{r.data || "—"}</td>
                <td className="px-3 py-2 text-xs">{r.tipo || "—"}</td>
                <td className="px-3 py-2 font-mono text-xs">{r.cer || "—"}</td>
                <td className="px-3 py-2 text-right font-mono text-xs">{r.quantita || "—"}</td>
                <td className="px-3 py-2 font-mono text-xs">{r.fir || "—"}</td>
                <td className="px-3 py-2 text-right">
                  <button
                    onClick={() => setDetail(r.raw)}
                    className="rounded border border-border px-2 py-1 text-[11px]"
                  >
                    Dettaglio
                  </button>
                </td>
              </tr>
            ))}
            {righe.length === 0 && !loading && (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center text-muted-foreground">
                  Nessun movimento sui registri RENTRI nel periodo scelto.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {detail !== null && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4"
          onClick={() => setDetail(null)}
        >
          <div
            className="max-h-[85vh] w-full max-w-3xl overflow-auto rounded-lg border border-border bg-card p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-bold">Movimento RENTRI</h3>
              <button
                onClick={() => setDetail(null)}
                className="rounded border border-border bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground"
              >
                ✕ Chiudi
              </button>
            </div>
            <pre className="whitespace-pre-wrap break-all rounded bg-muted/40 p-3 text-[11px]">
              {JSON.stringify(detail, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
