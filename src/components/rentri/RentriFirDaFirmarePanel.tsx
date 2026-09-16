import { useCallback, useEffect, useMemo, useState } from "react";
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
import { supabase } from "@/lib/supabaseClient";

/** Impianti di destino per cliente: solo dove esiste un impianto autorizzato a ricevere. */
const IMPIANTO_DESTINO: Record<string, { impianto_id: string; tenant_id: string }> = {
  multy: {
    impianto_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    tenant_id: "77ec9a3d-602e-438f-97bf-1c69abd8f691",
  },
};

const SOCIETA: { key: "multy" | "niyol"; label: string }[] = [
  { key: "multy", label: "Multyproget" },
  { key: "niyol", label: "Niyol" },
];

interface FirRow {
  societa: "multy" | "niyol";
  societaLabel: string;
  numero_fir: string;
  codice_eer: string;
  quantita: number;
  unita_misura: string;
  stato: string;
  data_creazione: string;
  data_emissione?: string;
  produttore_nome: string;
  produttore_cf: string;
  destinatario_nome: string;
  destinatario_cf: string;
  trasportatore_nome: string;
  trasportatore_cf: string;
  ruolo: string;
  accettato: boolean;
  raw: Record<string, unknown>;
}

function mapRow(d: any, societa: "multy" | "niyol", societaLabel: string, cfSoggetto: string): FirRow {
  const dest = Array.isArray(d.destinatari) ? d.destinatari[0] ?? {} : d.destinatario ?? {};
  const tras = Array.isArray(d.trasportatori) ? d.trasportatori[0] ?? {} : d.trasportatore ?? {};
  const prod = d.produttore ?? {};
  const destCf = String(dest.codice_fiscale ?? d.destinatario_codice_fiscale ?? "");
  const trasCf = String(tras.codice_fiscale ?? "");
  const prodCf = String(prod.codice_fiscale ?? "");
  const ruoli: string[] = [];
  if (prodCf && prodCf === cfSoggetto) ruoli.push("Produttore");
  if (trasCf && trasCf === cfSoggetto) ruoli.push("Trasportatore");
  if (destCf && destCf === cfSoggetto) ruoli.push("Destinatario");
  return {
    societa,
    societaLabel,
    numero_fir: String(d.numero_fir ?? ""),
    codice_eer: String(d.codice_eer ?? ""),
    quantita: Number(d.quantita ?? 0),
    unita_misura: String(d.unita_misura ?? "kg"),
    stato: String(d.stato ?? ""),
    data_creazione: String(d.data_creazione ?? ""),
    data_emissione: d.data_emissione ? String(d.data_emissione) : undefined,
    produttore_nome: String(prod.denominazione ?? ""),
    produttore_cf: prodCf,
    destinatario_nome: String(dest.denominazione ?? ""),
    destinatario_cf: destCf,
    trasportatore_nome: String(tras.denominazione ?? ""),
    trasportatore_cf: trasCf,
    ruolo: ruoli.join(" + ") || "—",
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
  const [societaSel, setSocietaSel] = useState<"tutte" | "multy" | "niyol">("tutte");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<FirRow[]>([]);
  const [filtro, setFiltro] = useState<"da_firmare" | "tutti">("da_firmare");
  const [ruoloSel, setRuoloSel] = useState<"tutti" | "produttore" | "trasportatore" | "destinatario">("tutti");
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

  const daLeggere = useMemo(
    () => (societaSel === "tutte" ? SOCIETA : SOCIETA.filter((s) => s.key === societaSel)),
    [societaSel],
  );

  const carica = useCallback(async () => {
    setLoading(true);
    const acc: FirRow[] = [];
    const errori: string[] = [];
    for (const s of daLeggere) {
      const cf = RENTRI_CF_SOGGETTO[s.key] ?? "";
      const ul = RENTRI_UNITA_LOCALI[s.key] ?? "";
      try {
        const res = await elencoFormulariRentri(s.key as RentriCliente, cf, ul);
        if (!res.success) throw new Error(res.error || "Errore RENTRI");
        const raw = res.data as any;
        const list = Array.isArray(raw) ? raw : raw?.formulari ?? raw?.items ?? raw?.content ?? [];
        for (const d of Array.isArray(list) ? list : []) acc.push(mapRow(d, s.key, s.label, cf));
      } catch (e: any) {
        errori.push(`${s.label}: ${e.message}`);
      }
    }
    acc.sort((a, b) => (b.data_emissione ?? b.data_creazione).localeCompare(a.data_emissione ?? a.data_creazione));
    setRows(acc);
    setLoading(false);
    if (errori.length) toast.error(`RENTRI — ${errori.join(" · ")}`);
    else toast.success(`${acc.length} formulari letti dal RENTRI`);
  }, [daLeggere]);

  useEffect(() => {
    carica();
  }, [carica]);

  const visibili = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows
      .filter((r) => (filtro === "tutti" ? true : !r.accettato))
      .filter((r) =>
        ruoloSel === "tutti"
          ? true
          : ruoloSel === "produttore"
            ? r.ruolo.includes("Produttore")
            : ruoloSel === "trasportatore"
              ? r.ruolo.includes("Trasportatore")
              : r.ruolo.includes("Destinatario"),
      )
      .filter((r) =>
        !term
          ? true
          : [r.numero_fir, r.codice_eer, r.produttore_nome, r.destinatario_nome, r.trasportatore_nome, r.societaLabel]
              .join(" ")
              .toLowerCase()
              .includes(term),
      );
  }, [rows, filtro, ruoloSel, q]);

  const conteggi = useMemo(() => {
    const out: Record<string, { tutti: number; daFirmare: number; produttore: number; trasportatore: number; destinatario: number }> = {};
    for (const s of SOCIETA) {
      const r = rows.filter((x) => x.societa === s.key);
      out[s.key] = {
        tutti: r.length,
        daFirmare: r.filter((x) => !x.accettato).length,
        produttore: r.filter((x) => x.ruolo.includes("Produttore")).length,
        trasportatore: r.filter((x) => x.ruolo.includes("Trasportatore")).length,
        destinatario: r.filter((x) => x.ruolo.includes("Destinatario")).length,
      };
    }
    return out;
  }, [rows]);

  const apriDettaglio = async (r: FirRow) => {
    setDetailLoading(true);
    setDetail({ numero: r.numero_fir, data: null });
    try {
      const res = await dettaglioFormularioRentri(
        r.societa as RentriCliente,
        r.numero_fir,
        RENTRI_CF_SOGGETTO[r.societa] ?? "",
        RENTRI_UNITA_LOCALI[r.societa] ?? "",
      );
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
      const cfSoggetto = RENTRI_CF_SOGGETTO[firmaFir.societa] ?? "";
      const unitaLocale = RENTRI_UNITA_LOCALI[firmaFir.societa] ?? "";
      const res = await accettaFirInArrivoDestinatario(
        firmaFir.societa as RentriCliente,
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

      // Solo con esito confermato (totale o parziale) il rifiuto entra davvero in impianto.
      // La pesata certificata passa obbligatoriamente dal punto unico idempotente.
      const destino = IMPIANTO_DESTINO[firmaFir.societa];
      if (esito !== "respinto" && destino) {
        const { error: movErr } = await (supabase as any).rpc("applica_movimento_giacenza", {
          p_tenant_id: destino.tenant_id,
          p_impianto_id: destino.impianto_id,
          p_cer: firmaFir.codice_eer,
          p_quantita_kg: Number(kg),
          p_segno: "CARICO",
          p_causale: "FIR_DIGITALE_CHIUSO_RENTRI",
          p_documento: `RENTRI:${firmaFir.numero_fir}:ACCETTAZIONE_DESTINATARIO`,
          p_attore: "human",
          p_descrizione: `FIR ${firmaFir.numero_fir} — ${firmaFir.produttore_nome || "produttore"}`,
          p_fir_id: null,
          p_numero_fir: firmaFir.numero_fir,
        });
        if (movErr) {
          toast.error(
            `Firma inviata, ma il carico in impianto non è stato registrato: ${movErr.message}`,
          );
        } else {
          toast.success("Carico registrato in impianto e giacenze aggiornate");
        }
      } else if (esito !== "respinto" && !destino) {
        toast.info("Firma inviata. Per questa società non è configurato un impianto di destino.");
      }

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

        <div className="flex overflow-hidden rounded-md border border-border">
          {(["tutti", "produttore", "trasportatore", "destinatario"] as const).map((rl) => (
            <button
              key={rl}
              onClick={() => setRuoloSel(rl)}
              className={`px-3 py-2 text-xs font-semibold ${
                ruoloSel === rl ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"
              }`}
            >
              {rl === "tutti" ? "Tutti i ruoli" : rl === "produttore" ? "Produttore" : rl === "trasportatore" ? "Trasportatore" : "Destinatario"}
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
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {SOCIETA.map((s) => (
          <span key={s.key} className="rounded-md border border-border/50 px-2 py-1">
            <strong className="text-foreground">{s.label}</strong> · {conteggi[s.key]?.tutti ?? 0} sul RENTRI ·{" "}
            <span className="text-amber-500">{conteggi[s.key]?.daFirmare ?? 0} da firmare</span> · CF{" "}
            {RENTRI_CF_SOGGETTO[s.key]}
          </span>
        ))}
        <span>{visibili.length} righe mostrate</span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Società</th>
              <th className="px-3 py-2 text-left">Numero FIR</th>
              <th className="px-3 py-2 text-left">Ruolo</th>
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
              <tr key={`${r.societa}-${r.numero_fir}`} className="border-t border-border">
                <td className="px-3 py-2 text-xs font-semibold">{r.societaLabel}</td>
                <td className="px-3 py-2 font-mono text-xs font-bold">{r.numero_fir}</td>
                <td className="px-3 py-2 text-xs">{r.ruolo}</td>
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
                    {!r.accettato && r.destinatario_cf === (RENTRI_CF_SOGGETTO[r.societa] ?? "") && (
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
                <td colSpan={11} className="px-3 py-6 text-center text-sm text-muted-foreground">
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
>
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
            <h3 className="font-bold">
              Firma accettazione · {firmaFir.numero_fir} ({firmaFir.societaLabel})
            </h3>
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
