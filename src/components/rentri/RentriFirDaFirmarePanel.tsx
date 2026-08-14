import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, RefreshCw, PenLine, Search } from "lucide-react";
import {
  elencoFormulariRentri,
  dettaglioFormularioRentri,
  accettaFirInArrivoDestinatario,
  rentriConfigKey,
  RENTRI_CF_SOGGETTO,
  RENTRI_UNITA_LOCALI,
  type RentriCliente,
} from "@/lib/rentriVpsApi";

interface FirRow {
  numero_fir: string;
  codice_eer: string;
  quantita: number;
  unita_misura: string;
  stato: string;
  data_creazione: string;
  data_emissione?: string;
  produttore_nome: string;
  destinatario_nome: string;
  destinatario_cf: string;
  trasportatore_nome: string;
  accettato: boolean;
  raw: Record<string, unknown>;
}

function mapRow(d: any): FirRow {
  const dest = Array.isArray(d.destinatari) ? d.destinatari[0] ?? {} : d.destinatario ?? {};
  const tras = Array.isArray(d.trasportatori) ? d.trasportatori[0] ?? {} : {};
  return {
    numero_fir: String(d.numero_fir ?? ""),
    codice_eer: String(d.codice_eer ?? ""),
    quantita: Number(d.quantita ?? 0),
    unita_misura: String(d.unita_misura ?? "kg"),
    stato: String(d.stato ?? ""),
    data_creazione: String(d.data_creazione ?? ""),
    data_emissione: d.data_emissione ? String(d.data_emissione) : undefined,
    produttore_nome: String(d.produttore?.denominazione ?? ""),
    destinatario_nome: String(dest.denominazione ?? ""),
    destinatario_cf: String(dest.codice_fiscale ?? ""),
    trasportatore_nome: String(tras.denominazione ?? ""),
    accettato: Boolean(d.accettazione) || String(d.stato ?? "").toLowerCase().startsWith("accett"),
    raw: d,
  };
}

function fmtDate(v?: string) {
  if (!v) return "—";
  const dt = new Date(v);
  return Number.isNaN(dt.getTime()) ? v : dt.toLocaleString("it-IT");
}

export function RentriFirDaFirmarePanel({ cliente }: { cliente: RentriCliente }) {
  const configKey = rentriConfigKey(cliente);
  const cfSoggetto = RENTRI_CF_SOGGETTO[configKey] ?? "";
  const unitaLocale = RENTRI_UNITA_LOCALI[configKey] ?? "";

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<FirRow[]>([]);
  const [filtro, setFiltro] = useState<"da_firmare" | "tutti">("da_firmare");
  const [q, setQ] = useState("");
  const [detail, setDetail] = useState<{ numero: string; data: unknown } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // firma
  const [firmaFir, setFirmaFir] = useState<FirRow | null>(null);
  const [kg, setKg] = useState("");
  const [dataArrivo, setDataArrivo] = useState(() => new Date().toISOString().slice(0, 10));
  const [oraArrivo, setOraArrivo] = useState(() => new Date().toTimeString().slice(0, 5));
  const [esito, setEsito] = useState<"accettato" | "parziale" | "respinto">("accettato");
  const [motivazione, setMotivazione] = useState("");
  const [firmando, setFirmando] = useState(false);

  const carica = async () => {
    setLoading(true);
    try {
      const res = await elencoFormulariRentri(cliente, cfSoggetto, unitaLocale);
      if (!res.success) throw new Error(res.error || "Errore RENTRI");
      const raw = res.data as any;
      const list = Array.isArray(raw) ? raw : raw?.formulari ?? raw?.items ?? raw?.content ?? [];
      setRows((Array.isArray(list) ? list : []).map(mapRow));
      toast.success(`${Array.isArray(list) ? list.length : 0} formulari letti da RENTRI`);
    } catch (e: any) {
      toast.error(`RENTRI: ${e.message}`);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carica();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cliente]);

  const visibili = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows
      .filter((r) => (filtro === "tutti" ? true : !r.accettato && r.destinatario_cf === cfSoggetto))
      .filter((r) =>
        !term
          ? true
          : [r.numero_fir, r.codice_eer, r.produttore_nome, r.destinatario_nome, r.trasportatore_nome]
              .join(" ")
              .toLowerCase()
              .includes(term),
      );
  }, [rows, filtro, q, cfSoggetto]);

  const apriDettaglio = async (r: FirRow) => {
    setDetailLoading(true);
    setDetail({ numero: r.numero_fir, data: null });
    try {
      const res = await dettaglioFormularioRentri(cliente, r.numero_fir, cfSoggetto, unitaLocale);
      if (!res.success) throw new Error(res.error || "Errore RENTRI");
      setDetail({ numero: r.numero_fir, data: res.data });
    } catch (e: any) {
      toast.error(`Dettaglio: ${e.message}`);
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const apriFirma = (r: FirRow) => {
    setFirmaFir(r);
    setKg(String(r.quantita || ""));
    setEsito("accettato");
    setMotivazione("");
  };

  const confermaFirma = async () => {
    if (!firmaFir) return;
    if (!kg || Number(kg) <= 0) return toast.error("Inserisci i kg pesati a destino");
    if (!window.confirm(`Firmare l'accettazione del FIR ${firmaFir.numero_fir} su RENTRI?`)) return;
    setFirmando(true);
    try {
      const res = await accettaFirInArrivoDestinatario(
        cliente,
        firmaFir.numero_fir,
        {
          data_ora_ricezione: new Date(`${dataArrivo}T${oraArrivo}:00`).toISOString(),
          quantita_ricevuta: { valore: Number(kg), unita_misura: "kg" },
          esito_conferimento:
            esito === "parziale"
              ? "ACCETTATO_PARZIALMENTE"
              : esito === "respinto"
                ? "RESPINTO"
                : "ACCETTATO_TOTALMENTE",
          num_iscr_sito: unitaLocale,
          motivazione: motivazione || undefined,
        },
        cfSoggetto,
      );
      if (!res.success) throw new Error(res.error || "Errore firma");
      toast.success(`FIR ${firmaFir.numero_fir} accettato su RENTRI`);
      setFirmaFir(null);
      carica();
    } catch (e: any) {
      toast.error(`Firma non riuscita: ${e.message}`);
    } finally {
      setFirmando(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={carica}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {loading ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />}
          Cerca su RENTRI
        </button>
        <div className="flex overflow-hidden rounded-md border border-border">
          {(["da_firmare", "tutti"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`px-3 py-2 text-xs font-semibold ${
                filtro === f ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"
              }`}
            >
              {f === "da_firmare" ? "Da firmare" : "Tutti"}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cerca numero, CER, ditta…"
            className="rounded-md border border-border bg-background py-2 pl-7 pr-3 text-sm"
          />
        </div>
        <span className="text-xs text-muted-foreground">
          Soggetto: {cfSoggetto} · U.L. {unitaLocale} · {visibili.length} risultati
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Numero FIR</th>
              <th className="px-3 py-2 text-left">CER</th>
              <th className="px-3 py-2 text-left">Produttore</th>
              <th className="px-3 py-2 text-left">Trasportatore</th>
              <th className="px-3 py-2 text-left">Destinatario</th>
              <th className="px-3 py-2 text-right">Q.tà</th>
              <th className="px-3 py-2 text-left">Stato</th>
              <th className="px-3 py-2 text-left">Emissione</th>
              <th className="px-3 py-2 text-right">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {visibili.map((r) => (
              <tr key={r.numero_fir} className="border-t border-border">
                <td className="px-3 py-2 font-mono text-xs font-bold">{r.numero_fir}</td>
                <td className="px-3 py-2 font-mono text-xs">{r.codice_eer}</td>
                <td className="px-3 py-2 text-xs">{r.produttore_nome}</td>
                <td className="px-3 py-2 text-xs">{r.trasportatore_nome}</td>
                <td className="px-3 py-2 text-xs">{r.destinatario_nome}</td>
                <td className="px-3 py-2 text-right font-mono text-xs">
                  {r.quantita.toLocaleString("it-IT")} {r.unita_misura}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
                      r.accettato ? "bg-emerald-500/15 text-emerald-600" : "bg-amber-500/15 text-amber-600"
                    }`}
                  >
                    {r.stato || (r.accettato ? "Accettato" : "Da firmare")}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs">{fmtDate(r.data_emissione ?? r.data_creazione)}</td>
                <td className="px-3 py-2 text-right">
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => apriDettaglio(r)}
                      className="rounded border border-border px-2 py-1 text-[11px]"
                    >
                      Dettaglio
                    </button>
                    {!r.accettato && r.destinatario_cf === cfSoggetto && (
                      <button
                        onClick={() => apriFirma(r)}
                        className="inline-flex items-center gap-1 rounded bg-amber-500 px-2 py-1 text-[11px] font-semibold text-black"
                      >
                        <PenLine size={11} /> Firma
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {visibili.length === 0 && !loading && (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center text-sm text-muted-foreground">
                  Nessun formulario trovato su RENTRI con questo filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {detail && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4"
          onClick={() => setDetail(null)}
          onKeyDown={(e) => e.key === "Escape" && setDetail(null)}
ሴ        >
          <div
            className="max-h-[85vh] w-full max-w-3xl overflow-auto rounded-lg border border-border bg-card p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-bold">Dettaglio RENTRI · {detail.numero}</h3>
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="rounded border border-border bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground"
              >
                ✕ Chiudi
              </button>
            </div>

            {detailLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="animate-spin" size={14} /> Caricamento…
              </div>
            ) : (
              <pre className="whitespace-pre-wrap break-all rounded bg-muted/40 p-3 text-[11px]">
                {JSON.stringify(detail.data, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}

      {firmaFir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md space-y-3 rounded-lg border border-border bg-card p-4">
            <h3 className="font-bold">Firma accettazione · {firmaFir.numero_fir}</h3>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs">
                Data arrivo
                <input
                  type="date"
                  value={dataArrivo}
                  onChange={(e) => setDataArrivo(e.target.value)}
                  className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
                />
              </label>
              <label className="text-xs">
                Ora arrivo
                <input
                  type="time"
                  value={oraArrivo}
                  onChange={(e) => setOraArrivo(e.target.value)}
                  className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
                />
              </label>
            </div>
            <label className="block text-xs">
              Kg accettati a destino
              <input
                type="number"
                value={kg}
                onChange={(e) => setKg(e.target.value)}
                className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
              />
            </label>
            <label className="block text-xs">
              Esito
              <select
                value={esito}
                onChange={(e) => setEsito(e.target.value as typeof esito)}
                className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
              >
                <option value="accettato">Accettato totalmente</option>
                <option value="parziale">Accettato parzialmente</option>
                <option value="respinto">Respinto</option>
              </select>
            </label>
            {esito !== "accettato" && (
              <label className="block text-xs">
                Motivazione
                <input
                  value={motivazione}
                  onChange={(e) => setMotivazione(e.target.value)}
                  className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
                />
              </label>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setFirmaFir(null)} className="rounded border border-border px-3 py-1.5 text-sm">
                Annulla
              </button>
              <button
                onClick={confermaFirma}
                disabled={firmando}
                className="inline-flex items-center gap-2 rounded bg-amber-500 px-3 py-1.5 text-sm font-semibold text-black disabled:opacity-60"
              >
                {firmando ? <Loader2 className="animate-spin" size={14} /> : <PenLine size={14} />}
                Firma su RENTRI
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
