import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, Send, CheckCircle2, RefreshCw, ClipboardList, Clock, FileSpreadsheet, Printer, AlertTriangle } from "lucide-react";
import { exportToExcel, exportToPdf } from "@/lib/exportUtils";
import { toast } from "sonner";
import {
  leggiMovimentiRegistroRentri,
  normalizzaNumeroFir,
} from "@/lib/rentriRegistroIntermediazione";
import { inviaRegistroRentri, type MovimentoRentri } from "@/lib/rentriRegistroSync";
import { RENTRI_UNITA_LOCALI, rentriConfigKey, type RentriCliente } from "@/lib/rentriVpsApi";
import { elencoFirIntermediario, movimentiIntermediazioneDaFirRentri } from "@/lib/rentriFirIntermediario";
import {
  CONFINE_STORICO_INVIATI,
  chiaveDatiMovimento,
  statoRigaRegistro,
  type EsitoTrasmissione,
} from "@/lib/rentriStatoRegistri";

const MULTY_TENANT_ID = "77ec9a3d-602e-438f-97bf-1c69abd8f691";
const NIYOL_TENANT_ID = "819c783e-78dd-4080-8265-802e75b0d813";

/** Registri cronologici ufficiali gestiti dalla console. */
export const REGISTRI_RENTRI = [
  { id: "MULTY_IMPIANTO", label: "Multyproget — Impianto", tenant: MULTY_TENANT_ID, registroId: "RAH20NP7O40", source: "registro", cliente: "multy" },
  { id: "MULTY_CONTO_PROPRIO", label: "Multyproget — Conto Proprio", tenant: MULTY_TENANT_ID, registroId: "RQCTGTP7NT0", source: "registro", cliente: "multy" },
  { id: "MULTY_PRIVATI", label: "Multyproget — Privati", tenant: MULTY_TENANT_ID, registroId: "RAH20NP7O40", source: "privati", cliente: "multy" },
  { id: "MULTY_INTERMEDIARIO", label: "Multyproget — Intermediazione", tenant: MULTY_TENANT_ID, registroId: "RQEL39R7NS0", source: "intermediario", cliente: "multy" },
  { id: "NIYOL", label: "Niyol", tenant: NIYOL_TENANT_ID, registroId: "RTR31497PX0", source: "registro", cliente: "niyol" },
] as const;

type RegistroCfg = (typeof REGISTRI_RENTRI)[number];
type RegistroId = RegistroCfg["id"];
/** "TUTTI" = vista totale su tutti i registri. */
type VistaId = RegistroId | "TUTTI";
type Filtro = "tutti" | "da_inviare" | "inviati";

interface RigaRegistro {
  id: string;
  numero_interno: number | null;
  data_movimento: string | null;
  cer: string | null;
  descrizione: string | null;
  carico_scarico: string | null;
  tipo_operazione: string | null;
  numero_formulario: string | null;
  quantita: number | null;
  origine?: "rentri_intermediario";
  /** Registro di appartenenza: serve nella vista totale. */
  registroId: RegistroId;
  registroLabel: string;
}

const fmtKg = (v: number | null | undefined) => Number(v ?? 0).toLocaleString("it-IT");
const fmtData = (d: string | null | undefined) =>
  d ? new Date(`${d}T00:00:00`).toLocaleDateString("it-IT") : "—";

const EXPORT_COLS_REGISTRO = [
  { header: "Registro", key: "registroLabel", width: 28 },
  { header: "N. interno", key: "numero_interno", width: 12 },
  { header: "Data", key: "data_movimento", width: 12, format: (v: any) => fmtData(v) },
  { header: "C/S", key: "carico_scarico", width: 8 },
  { header: "CER", key: "cer", width: 10 },
  { header: "Descrizione", key: "descrizione", width: 32 },
  { header: "Operazione", key: "tipo_operazione", width: 12 },
  { header: "Formulario", key: "numero_formulario", width: 18 },
  { header: "Kg", key: "quantita", width: 12, format: (v: any) => fmtKg(v) },
  { header: "Stato RENTRI", key: "stato_rentri", width: 20 },
  { header: "Identificativo RENTRI", key: "identificativo_rentri", width: 26 },
];

/** Converte una riga del registro nel movimento da trasmettere al RENTRI. */
export function rigaToMovimentoRentri(r: RigaRegistro, cliente: RentriCliente): MovimentoRentri {
  return {
    tipo_movimento: String(r.carico_scarico ?? "").toUpperCase() === "SCARICO" ? "SCARICO" : "CARICO",
    data_registrazione: r.data_movimento ?? new Date().toISOString().slice(0, 10),
    codice_eer: String(r.cer ?? "").replace(/\D/g, ""),
    descrizione: r.descrizione ?? "",
    quantita: Number(r.quantita ?? 0),
    unita_misura: "kg",
    num_iscr_sito: RENTRI_UNITA_LOCALI[rentriConfigKey(cliente)] ?? "",
    numero_fir: r.numero_formulario,
    riferimento_interno: r.id,
    origine: r.origine,
  };
}

/** Movimenti candidati di un singolo registro (sola lettura). */
async function caricaMovimentiRegistro(cfg: RegistroCfg): Promise<RigaRegistro[]> {
  const base = { registroId: cfg.id, registroLabel: cfg.label };

  if (cfg.source === "intermediario") {
    const { response, righe } = await elencoFirIntermediario(cfg.cliente as RentriCliente, {
      dataDa: "2025-01-01",
      dataA: new Date().toISOString().slice(0, 10),
    });
    if (!response.success) throw new Error(response.userMessage || response.error || "Il RENTRI non ha risposto.");
    return movimentiIntermediazioneDaFirRentri(righe).map((r) => ({
      ...base,
      id: r.id,
      numero_interno: null,
      data_movimento: r.data_movimento,
      cer: r.cer,
      descrizione: r.descrizione_rifiuto,
      carico_scarico: r.tipo_movimento,
      tipo_operazione: null,
      numero_formulario: r.numero_fir,
      quantita: r.quantita_kg,
      origine: "rentri_intermediario" as const,
    }));
  }

  if (cfg.source === "privati") {
    const { data, error } = await supabase
      .from("privati_conferimenti" as any)
      .select("id, numero_progressivo, data, cer, kg_pesati, nome_privato")
      .eq("tenant_id", cfg.tenant)
      .order("data", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r: any) => ({
      ...base,
      id: r.id,
      numero_interno: r.numero_progressivo,
      data_movimento: r.data,
      cer: r.cer,
      descrizione: r.nome_privato,
      carico_scarico: "CARICO",
      tipo_operazione: null,
      numero_formulario: null,
      quantita: r.kg_pesati,
    }));
  }

  const { data, error } = await supabase
    .from("registro_generale" as any)
    .select(
      "id, numero_interno, data_movimento, cer, descrizione, carico_scarico, tipo_operazione, numero_formulario, quantita",
    )
    .eq("tenant_id", cfg.tenant)
    .eq("registro", cfg.id)
    .order("data_movimento", { ascending: false })
    .order("numero_interno", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as any[]).map((r) => ({ ...base, ...r })) as RigaRegistro[];
}

/** Movimenti già presenti sul registro RENTRI, indicizzati per FIR e per dati. */
async function leggiRegistratiRentri(cfg: RegistroCfg) {
  const perFir = new Map<string, EsitoTrasmissione>();
  const perDati = new Map<string, EsitoTrasmissione>();
  const { movimenti } = await leggiMovimentiRegistroRentri(
    cfg.cliente as RentriCliente,
    cfg.registroId,
    "2025-01-01",
    "2027-12-31",
  );
  movimenti
    .filter((mv) => !mv.annullato)
    .forEach((mv) => {
      const esito: EsitoTrasmissione = {
        stato: "REGISTRATO",
        progressivi: mv.progressivo ? [String(mv.progressivo)] : [],
        identificativi: mv.identificativo ? [mv.identificativo] : [],
        etichetta: "INVIATO",
      };
      if (mv.chiaveFir) perFir.set(mv.chiaveFir, esito);
      const k = chiaveDatiMovimento(mv.dataRegistrazione, mv.eer, mv.quantitaKg);
      if (k) perDati.set(k, esito);
    });
  return { perFir, perDati };
}

export function RentriRegistriPanel({ registroIniziale }: { registroIniziale?: VistaId } = {}) {
  const [vista, setVista] = useState<VistaId>(registroIniziale ?? "MULTY_IMPIANTO");
  const [filtro, setFiltro] = useState<Filtro>("tutti");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [conferma, setConferma] = useState<RigaRegistro[] | null>(null);
  const [inviando, setInviando] = useState(false);
  const queryClient = useQueryClient();

  /** Registri coinvolti: uno solo, oppure tutti nella vista totale. */
  const cfgs = useMemo<RegistroCfg[]>(
    () => (vista === "TUTTI" ? [...REGISTRI_RENTRI] : REGISTRI_RENTRI.filter((r) => r.id === vista)),
    [vista],
  );
  const cfgSingolo = vista === "TUTTI" ? null : cfgs[0];

  const { data: movimenti, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["rentri-registri-panel", vista],
    queryFn: async () => {
      const blocchi = await Promise.all(cfgs.map((c) => caricaMovimentiRegistro(c)));
      return blocchi.flat();
    },
  });

  /**
   * Stato reale di trasmissione: si legge SEMPRE dal RENTRI, per ogni registro.
   * Il periodo fino al 31/07/2026 è già stato trasmesso da terminale.
   */
  const { data: registrati, isFetching: isFetchingRentri } = useQuery({
    queryKey: ["rentri-registro-movimenti", vista],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const mappa = new Map<RegistroId, { perFir: Map<string, EsitoTrasmissione>; perDati: Map<string, EsitoTrasmissione> }>();
      for (const c of cfgs) {
        try {
          mappa.set(c.id, await leggiRegistratiRentri(c));
        } catch {
          mappa.set(c.id, { perFir: new Map(), perDati: new Map() });
        }
      }
      return mappa;
    },
  });

  /** Tutti i movimenti in ordine cronologico inverso con il rispettivo stato. */
  const righe = useMemo(() => {
    const list = [...(movimenti ?? [])];
    list.sort((a, b) => {
      const da = a.data_movimento ?? "";
      const db = b.data_movimento ?? "";
      if (da !== db) return db.localeCompare(da);
      return Number(b.numero_interno ?? 0) - Number(a.numero_interno ?? 0);
    });
    const vuoto = { perFir: new Map<string, EsitoTrasmissione>(), perDati: new Map<string, EsitoTrasmissione>() };
    return list.map((r) => {
      const idx = registrati?.get(r.registroId) ?? vuoto;
      return {
        riga: r,
        esito: statoRigaRegistro({
          data: r.data_movimento,
          eer: r.cer,
          kg: r.quantita,
          chiaveFir: r.numero_formulario ? normalizzaNumeroFir(r.numero_formulario) : null,
          perFir: idx.perFir,
          perDati: idx.perDati,
        }),
      };
    });
  }, [movimenti, registrati]);

  const inviati = useMemo(() => righe.filter((x) => x.esito), [righe]);
  const daInviare = useMemo(() => righe.filter((x) => !x.esito), [righe]);

  const visibili = useMemo(() => {
    if (filtro === "inviati") return inviati;
    if (filtro === "da_inviare") return daInviare;
    return righe;
  }, [filtro, righe, inviati, daInviare]);

  const righeExport = useMemo(
    () =>
      visibili.map((x) => ({
        ...x.riga,
        stato_rentri: x.esito?.etichetta ?? "Da inviare",
        identificativo_rentri: x.esito?.identificativi?.join(", ") || "",
      })),
    [visibili],
  );

  const toggle = (id: string) =>
    setSel((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  /** Invio reale al registro RENTRI: parte solo dal popup di conferma. */
  const eseguiInvio = async () => {
    if (!conferma || conferma.length === 0) return;
    const registriCoinvolti = new Set(conferma.map((r) => r.registroId));
    if (registriCoinvolti.size > 1) {
      toast.error("Seleziona movimenti di un solo registro per volta: ogni registro RENTRI è distinto.");
      return;
    }
    const cfg = REGISTRI_RENTRI.find((r) => r.id === conferma[0].registroId)!;
    const movs = conferma.map((r) => rigaToMovimentoRentri(r, cfg.cliente as RentriCliente));
    const invalide = movs.filter((m) => !m.codice_eer || !(m.quantita > 0));
    if (invalide.length) {
      toast.error("Movimenti incompleti: servono codice CER e quantità maggiore di zero.");
      return;
    }
    setInviando(true);
    try {
      const esito = await inviaRegistroRentri({
        cliente: cfg.cliente as RentriCliente,
        registroId: cfg.registroId,
        tenantId: cfg.tenant,
        movimenti: movs,
      });
      if (esito.esitoFinale === "CONFERMATO") {
        toast.success(`RENTRI ha registrato ${movs.length} movimenti.`);
      } else if (esito.esitoFinale === "IN_VERIFICA") {
        toast.info("Invio preso in carico dal RENTRI: l'esito definitivo arriva a breve.");
      } else {
        toast.error(esito.motivoScarto ?? "Il RENTRI ha scartato l'invio.");
      }
      setConferma(null);
      setSel(new Set());
      await queryClient.invalidateQueries({ queryKey: ["rentri-registro-movimenti"] });
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invio al RENTRI non riuscito.");
    } finally {
      setInviando(false);
    }
  };

  const daInviareVisibili = visibili.filter((x) => !x.esito);
  const allSelected = daInviareVisibili.length > 0 && daInviareVisibili.every((x) => sel.has(x.riga.id));

  const FILTRI: { key: Filtro; label: string; count: number }[] = [
    { key: "tutti", label: "Tutti", count: righe.length },
    { key: "da_inviare", label: "Da inviare", count: daInviare.length },
    { key: "inviati", label: "Inviati", count: inviati.length },
  ];

  const opzioni: { id: VistaId; label: string }[] = [
    { id: "TUTTI", label: "Vista totale — tutti i registri" },
    ...REGISTRI_RENTRI.map((r) => ({ id: r.id as VistaId, label: r.label })),
  ];

  return (
    <div className="space-y-4">
      {/* Selettore registro */}
      <div className="flex flex-wrap items-center gap-2">
        {opzioni.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => {
              setVista(r.id);
              setSel(new Set());
            }}
            className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-all ${
              vista === r.id
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-secondary/50 text-muted-foreground border-border/50 hover:bg-secondary"
            }`}
          >
            <ClipboardList size={14} />
            {r.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => void refetch()}
          className="ml-auto flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-xs font-semibold hover:bg-secondary/70"
        >
          {isFetching ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Aggiorna
        </button>
      </div>

      <p className="text-xs text-muted-foreground">
        {cfgSingolo ? (
          <>
            Registro RENTRI <span className="font-mono text-foreground">{cfgSingolo.registroId}</span> —{" "}
          </>
        ) : (
          <>Vista totale su tutti i registri — </>
        )}
        elenco cronologico dal movimento più recente al più vecchio.{" "}
        {isFetchingRentri
          ? "Sto leggendo dal RENTRI quali movimenti risultano già registrati…"
          : "Lo stato è letto direttamente dal RENTRI."}{" "}
        Tutti i movimenti fino al <strong className="text-foreground">{fmtData(CONFINE_STORICO_INVIATI)}</strong>{" "}
        risultano già trasmessi da terminale e non sono più inviabili.
      </p>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Caricamento registro...</p>
      ) : (
        <div className="rounded-2xl border border-border/30 bg-card/60 p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {FILTRI.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFiltro(f.key)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
                  filtro === f.key
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border/50 bg-secondary/40 text-muted-foreground hover:bg-secondary"
                }`}
              >
                {f.label} ({f.count})
              </button>
            ))}
            <div className="ml-auto flex flex-wrap gap-2">
              <button
                type="button"
                disabled={visibili.length === 0}
                onClick={() => exportToExcel(righeExport, EXPORT_COLS_REGISTRO, `registro-${String(vista).toLowerCase()}`, "Registro")}
                className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
              >
                <FileSpreadsheet size={13} /> Excel
              </button>
              <button
                type="button"
                disabled={visibili.length === 0}
                onClick={() =>
                  exportToPdf(
                    righeExport,
                    EXPORT_COLS_REGISTRO,
                    `registro-${String(vista).toLowerCase()}`,
                    `${cfgSingolo ? cfgSingolo.label : "Tutti i registri"} — Registri RENTRI\n${visibili.length} movimenti`,
                  )
                }
                className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
              >
                <Printer size={13} /> PDF
              </button>
              <button
                type="button"
                disabled={daInviareVisibili.length === 0}
                onClick={() =>
                  setSel(allSelected ? new Set() : new Set(daInviareVisibili.map((x) => x.riga.id)))
                }
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
              >
                {allSelected ? "Deseleziona tutti" : "Seleziona da inviare"}
              </button>
              <button
                type="button"
                disabled={sel.size === 0}
                onClick={() => setConferma(visibili.filter((x) => !x.esito && sel.has(x.riga.id)).map((x) => x.riga))}
                className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-1.5 text-xs font-bold text-black disabled:opacity-40"
              >
                <Send size={13} /> Invia selezionati ({sel.size})
              </button>
            </div>
          </div>

          <div className="max-h-[620px] overflow-auto rounded-xl border border-border/30">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-secondary/80 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2" />
                  <th className="px-3 py-2 text-left">Stato</th>
                  {vista === "TUTTI" && <th className="px-3 py-2 text-left">Registro</th>}
                  <th className="px-3 py-2 text-left">N. Int.</th>
                  <th className="px-3 py-2 text-left">Data</th>
                  <th className="px-3 py-2 text-left">C./S.</th>
                  <th className="px-3 py-2 text-left">CER</th>
                  <th className="px-3 py-2 text-right">Kg</th>
                  <th className="px-3 py-2 text-left">Formulario</th>
                  <th className="px-3 py-2 text-left">Progressivo RENTRI</th>
                  <th className="px-3 py-2 text-left">Identificativo</th>
                  <th className="px-3 py-2 text-left">Invio</th>
                </tr>
              </thead>
              <tbody>
                {visibili.map(({ riga: r, esito: e }) => (
                  <tr
                    key={`${r.registroId}-${r.id}`}
                    className={`border-t border-border/20 ${e ? "bg-emerald-500/5" : "bg-amber-500/5"}`}
                  >
                    <td className="px-3 py-2">
                      {!e && (
                        <input type="checkbox" checked={sel.has(r.id)} onChange={() => toggle(r.id)} />
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {e ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                          <CheckCircle2 size={11} /> {e.etichetta}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
                          <Clock size={11} /> DA INVIARE
                        </span>
                      )}
                    </td>
                    {vista === "TUTTI" && <td className="px-3 py-2 text-xs">{r.registroLabel}</td>}
                    <td className="px-3 py-2 font-mono">{r.numero_interno ?? "—"}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{fmtData(r.data_movimento)}</td>
                    <td className="px-3 py-2">{r.carico_scarico ?? "—"}</td>
                    <td className="px-3 py-2 font-mono">{r.cer ?? "—"}</td>
                    <td className="px-3 py-2 text-right font-mono">{fmtKg(r.quantita)}</td>
                    <td className="px-3 py-2 font-mono text-xs">{r.numero_formulario ?? "—"}</td>
                    <td className="px-3 py-2 font-mono text-xs">{(e?.progressivi ?? []).join(", ") || "—"}</td>
                    <td className="px-3 py-2 font-mono text-[11px]">
                      {(e?.identificativi ?? []).join(" | ") || "—"}
                    </td>
                    <td className="px-3 py-2">
                      {!e && (
                        <button
                          type="button"
                          onClick={() => setConferma([r])}
                          className="flex items-center gap-1 rounded-lg bg-amber-500 px-2.5 py-1 text-[11px] font-bold text-black"
                        >
                          <Send size={11} /> Invia
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {visibili.length === 0 && (
                  <tr>
                    <td colSpan={12} className="px-3 py-6 text-center text-muted-foreground">
                      Nessun movimento in questa vista.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {conferma && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4"
          onClick={() => !inviando && setConferma(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-amber-500/40 bg-card p-6 space-y-4"
            onClick={(ev) => ev.stopPropagation()}
          >
            <div className="flex items-center gap-2 text-amber-400">
              <AlertTriangle size={22} />
              <p className="text-lg font-bold">Conferma invio al RENTRI</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Stai per trasmettere <strong className="text-foreground">{conferma.length}</strong>{" "}
              {conferma.length === 1 ? "movimento" : "movimenti"} al registro{" "}
              <span className="font-mono text-foreground">{conferma[0].registroLabel}</span>. L'operazione è reale e
              non si annulla.
            </p>
            <div className="max-h-56 overflow-auto rounded-lg border border-border/40 text-xs">
              <table className="w-full">
                <tbody>
                  {conferma.map((r) => (
                    <tr key={r.id} className="border-b border-border/20">
                      <td className="px-2 py-1 whitespace-nowrap">{fmtData(r.data_movimento)}</td>
                      <td className="px-2 py-1">{r.carico_scarico}</td>
                      <td className="px-2 py-1 font-mono">{r.cer ?? "—"}</td>
                      <td className="px-2 py-1 text-right font-mono">{fmtKg(r.quantita)} kg</td>
                      <td className="px-2 py-1 font-mono">{r.numero_formulario ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={inviando}
                onClick={() => setConferma(null)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-semibold disabled:opacity-40"
              >
                Annulla
              </button>
              <button
                type="button"
                disabled={inviando}
                onClick={() => void eseguiInvio()}
                className="flex items-center gap-2 rounded-lg bg-amber-500 px-5 py-2 text-sm font-bold text-black disabled:opacity-40"
              >
                {inviando ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                {inviando ? "Invio in corso…" : "CONFERMO L'INVIO"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
