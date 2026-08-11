import { useEffect, useMemo, useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { useMNContextStore, MN_CONTEXTS } from "@/stores/mnContextStore";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import {
  healthCheckVps,
  listaBlocchi,
  vidimaFIRAsync,
  registriDisponibili,
  rentriConfigKey,
  RENTRI_ISSUERS,
  RENTRI_UNITA_LOCALI,
  RENTRI_BLOCCO_CORRENTE,
  type RentriCliente,
  type RentriVpsResponse,
} from "@/lib/rentriVpsApi";
import {
  caricaMovimentiCandidati,
  mapMovimentiToRentri,
  inviaRegistroRentri,
  aggiornaStatoInvio,
  type MovimentoImpiantoRow,
} from "@/lib/rentriRegistroSync";
import { RentriResultBanner } from "@/components/rentri/RentriResultBanner";
import { DarkLemonMNChat } from "@/components/ai/DarkLemonMNChat";
import {
  Activity,
  ClipboardList,
  Loader2,
  RefreshCw,
  Send,
  Sparkles,
  Ticket,
  Users,
} from "lucide-react";

const CONTEXT_TO_CLIENTE: Record<string, RentriCliente> = {
  multyproget: "multy",
  "multyproget-intermediario": "multy",
  "multyproget-impianto": "multy",
  niyol: "niyol",
};

const SHARED_POOL_USER_ID = "00000000-0000-0000-0000-000000000000";
const validContexts = ["multyproget", "niyol"];

type TabId = "stato" | "numeri" | "registri" | "invii" | "lemon";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "stato", label: "Stato RENTRI", icon: <Activity size={14} /> },
  { id: "numeri", label: "Numeri FIR", icon: <Ticket size={14} /> },
  { id: "registri", label: "Invio Registri", icon: <ClipboardList size={14} /> },
  { id: "invii", label: "Invii effettuati", icon: <Send size={14} /> },
  { id: "lemon", label: "Dark Lemon", icon: <Sparkles size={14} /> },
];

export default function MNRentriConsolePage() {
  const { context } = useParams<{ context: string }>();
  const setActiveContext = useMNContextStore((s) => s.setActiveContext);
  const isValid = !!context && validContexts.includes(context);
  const mnCtx = MN_CONTEXTS.find((c) => c.id === context) ?? MN_CONTEXTS[0];
  const cliente = CONTEXT_TO_CLIENTE[context ?? ""] ?? "multy";
  const configKey = rentriConfigKey(cliente);
  const societaId = configKey === "niyol" ? "niyol" : "multyproget";

  useEffect(() => {
    if (isValid) setActiveContext(mnCtx);
  }, [context, isValid]);

  const [tab, setTab] = useState<TabId>("stato");

  /* ── Stato RENTRI ── */
  const [vpsUp, setVpsUp] = useState<boolean | null>(null);
  const [blocchi, setBlocchi] = useState<Record<string, unknown>[]>([]);
  const [loadingStato, setLoadingStato] = useState(false);
  const [result, setResult] = useState<RentriVpsResponse | null>(null);

  const refreshStato = async () => {
    setLoadingStato(true);
    setResult(null);
    try {
      const health = await healthCheckVps();
      setVpsUp(!!health?.ok);
      const res = await listaBlocchi(cliente, RENTRI_ISSUERS[configKey]);
      setResult(res);
      const raw = res.data as any;
      const list = Array.isArray(raw) ? raw : raw?.blocchi ?? raw?.items ?? raw?.content ?? [];
      setBlocchi(Array.isArray(list) ? list : []);
    } catch (e: any) {
      setVpsUp(false);
      toast.error(`Errore stato RENTRI: ${e.message}`);
    } finally {
      setLoadingStato(false);
    }
  };

  useEffect(() => {
    refreshStato();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cliente]);

  /* ── Numeri FIR ── */
  const [pool, setPool] = useState<{ id: string; fir_number: string; status: string; user_id: string | null }[]>([]);
  const [personale, setPersonale] = useState<{ id: string; nome: string | null; cognome: string | null; mn_context: string | null }[]>([]);
  const [qty, setQty] = useState(5);
  const [pescando, setPescando] = useState(false);
  const [assegnando, setAssegnando] = useState(false);
  const [assignApp, setAssignApp] = useState<"multyproget" | "niyol">(societaId as any);

  const loadPool = async () => {
    const [{ data: poolRows }, { data: profs }] = await Promise.all([
      supabase
        .from("fir_number_pool")
        .select("id, fir_number, status, user_id")
        .eq("societa_id", societaId)
        .order("created_at", { ascending: false })
        .limit(200),
      supabase.from("profiles").select("id, nome, cognome, mn_context").not("mn_context", "is", null),
    ]);
    setPool((poolRows ?? []) as any);
    setPersonale((profs ?? []) as any);
  };

  useEffect(() => {
    loadPool();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [societaId]);

  const disponibili = useMemo(() => pool.filter((p) => p.status === "available"), [pool]);

  const handlePesca = async () => {
    setPescando(true);
    try {
      const blocco = RENTRI_BLOCCO_CORRENTE[configKey] ?? "";
      const res = await vidimaFIRAsync(cliente, qty, blocco, RENTRI_UNITA_LOCALI[configKey], (m) =>
        toast.info(m, { id: "vidimazione" }),
      );
      const numeri = (res.numeri ?? []).filter((n: string) => n && !n.startsWith("TEST-"));
      if (numeri.length === 0) {
        toast.warning(res.pending ? "Richiesta accettata, numeri non ancora disponibili" : "Nessun numero ricevuto");
        return;
      }
      const rows = numeri.map((n: string) => ({
        fir_number: n,
        user_id: SHARED_POOL_USER_ID,
        status: "available" as const,
        societa_id: societaId,
      }));
      const { error } = await supabase.from("fir_number_pool").insert(rows as never);
      if (error) throw error;
      toast.success(`${numeri.length} numeri FIR acquisiti da RENTRI`);
      loadPool();
    } catch (e: any) {
      toast.error(`Errore vidimazione: ${e.message}`);
    } finally {
      setPescando(false);
    }
  };

  const handleAssegna = async (firNumber: string, userId: string) => {
    setAssegnando(true);
    try {
      const tenantId =
        assignApp === "niyol" ? "819c783e-78dd-4080-8265-802e75b0d813" : "77ec9a3d-602e-438f-97bf-1c69abd8f691";
      const { error } = await supabase.rpc("create_manual_fir_draft_for_tenant" as never, {
        p_user_id: userId,
        p_tenant_id: tenantId,
        p_numero_fir: firNumber,
      } as never);
      if (error) throw error;
      toast.success(`FIR ${firNumber} assegnato (${assignApp})`);
      loadPool();
    } catch (e: any) {
      toast.error(`Errore assegnazione: ${e.message}`);
    } finally {
      setAssegnando(false);
    }
  };

  /* ── Invio registri ── */
  const registri = registriDisponibili(cliente);
  const [registroId, setRegistroId] = useState(registri[0]?.id ?? "");
  const today = new Date().toISOString().slice(0, 10);
  const [dataDa, setDataDa] = useState(today);
  const [dataA, setDataA] = useState(today);
  const [movimenti, setMovimenti] = useState<MovimentoImpiantoRow[]>([]);
  const [caricando, setCaricando] = useState(false);
  const [inviando, setInviando] = useState(false);

  useEffect(() => {
    setRegistroId(registri[0]?.id ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cliente]);

  const handleCarica = async () => {
    setCaricando(true);
    try {
      const rows = await caricaMovimentiCandidati(mnCtx.tenantId, dataDa, dataA);
      setMovimenti(rows);
      toast.success(`${rows.length} movimenti trovati`);
    } catch (e: any) {
      toast.error(`Errore caricamento: ${e.message}`);
    } finally {
      setCaricando(false);
    }
  };

  const handleInviaRegistro = async () => {
    const payload = mapMovimentiToRentri(movimenti, cliente);
    if (payload.length === 0) {
      toast.error("Nessun movimento valido da inviare");
      return;
    }
    setInviando(true);
    setResult(null);
    try {
      const { response } = await inviaRegistroRentri({
        cliente,
        registroId,
        tenantId: mnCtx.tenantId,
        movimenti: payload,
      });
      setResult(response);
      if (response.success) toast.success(`Registro inviato: ${payload.length} movimenti`);
      else toast.error(response.userMessage ?? "Invio registro fallito");
      loadInvii();
    } catch (e: any) {
      toast.error(`Errore invio: ${e.message}`);
    } finally {
      setInviando(false);
    }
  };

  /* ── Invii effettuati ── */
  const [invii, setInvii] = useState<any[]>([]);
  const loadInvii = async () => {
    const { data } = await supabase
      .from("rentri_invii_registri")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    setInvii(data ?? []);
  };
  useEffect(() => {
    loadInvii();
  }, []);

  const handleAggiorna = async (row: any) => {
    if (!row.transazione_id) return;
    const res = await aggiornaStatoInvio(row.id, cliente, row.transazione_id, row.registro_id);
    setResult(res);
    loadInvii();
  };

  if (!isValid) return <Navigate to="/mn/admin" replace />;
  const label = context === "niyol" ? "Niyol" : "Multyproget";

  return (
    <MNAdminLayout title={`Console RENTRI — ${label}`} subtitle="Stato, numeri FIR, registri e invii">
      <div className="space-y-6">
        {/* Barra stato */}
        <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl bg-card/60 border border-border/30">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              vpsUp === true ? "bg-green-400 animate-pulse" : vpsUp === false ? "bg-red-500" : "bg-yellow-400"
            }`}
          />
          <span className="text-sm text-muted-foreground">
            Bridge RENTRI: <strong className="text-foreground">{vpsUp === true ? "Online" : vpsUp === false ? "Offline" : "..."}</strong>
          </span>
          <span className="text-xs text-muted-foreground">CF: {RENTRI_ISSUERS[configKey]}</span>
          <span className="text-xs text-muted-foreground">U.L.: {RENTRI_UNITA_LOCALI[configKey]}</span>
          <button
            onClick={refreshStato}
            className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary text-xs font-semibold hover:bg-secondary/70"
          >
            {loadingStato ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Aggiorna
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 flex-wrap">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${
                tab === t.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-secondary/50 text-muted-foreground border-border/50 hover:bg-secondary"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {tab === "stato" && (
          <div className="rounded-2xl bg-card/60 border border-border/30 p-6 space-y-4">
            <h3 className="text-base font-display tracking-wider">Blocchi di vidimazione attivi</h3>
            {blocchi.length === 0 && <p className="text-sm text-muted-foreground">Nessun blocco disponibile.</p>}
            <div className="grid gap-3 md:grid-cols-2">
              {blocchi.map((b: any, i) => (
                <div key={i} className="p-4 rounded-xl bg-secondary/40 border border-border/30 text-sm space-y-1">
                  <div className="font-mono font-bold text-primary">{b.codice ?? b.blocco ?? b.identificativo}</div>
                  <div className="text-muted-foreground">{b.descrizione ?? b.nome ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">
                    FIR vidimati: {b.numero_fir_vidimati ?? b.vidimati ?? "—"}
                  </div>
                </div>
              ))}
            </div>
            <div className="pt-2 border-t border-border/30">
              <h4 className="text-sm font-semibold mb-2">Registri configurati</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                {registri.map((r) => (
                  <li key={r.id}>
                    <span className="font-mono text-foreground">{r.id}</span> — {r.nome} ({r.tipo})
                  </li>
                ))}
              </ul>
            </div>
            <RentriResultBanner result={result} />
          </div>
        )}

        {tab === "numeri" && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-card/60 border border-border/30 p-6 space-y-4">
              <h3 className="text-base font-display tracking-wider">Pesca numeri FIR da RENTRI</h3>
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Quantità</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={qty}
                    onChange={(e) => setQty(Number(e.target.value))}
                    className="block w-28 rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm"
                  />
                </div>
                <button
                  onClick={handlePesca}
                  disabled={pescando}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-40"
                >
                  {pescando ? <Loader2 size={16} className="animate-spin" /> : <Ticket size={16} />} Vidima e acquisisci
                </button>
                <span className="text-sm text-muted-foreground">
                  Disponibili in serbatoio: <strong className="text-foreground">{disponibili.length}</strong>
                </span>
              </div>
            </div>

            <div className="rounded-2xl bg-card/60 border border-border/30 p-6 space-y-4">
              <h3 className="text-base font-display tracking-wider flex items-center gap-2">
                <Users size={16} /> Assegna numeri al personale
              </h3>
              <div className="flex gap-2">
                {(["multyproget", "niyol"] as const).map((a) => (
                  <button
                    key={a}
                    onClick={() => setAssignApp(a)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold border ${
                      assignApp === a
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-secondary/50 text-muted-foreground border-border/50"
                    }`}
                  >
                    App {a === "niyol" ? "Niyol" : "Multyproget"}
                  </button>
                ))}
              </div>
              <div className="space-y-2 max-h-[420px] overflow-auto">
                {disponibili.map((p) => (
                  <div key={p.id} className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-secondary/40 border border-border/30">
                    <span className="font-mono text-sm font-bold">{p.fir_number}</span>
                    <select
                      disabled={assegnando}
                      defaultValue=""
                      onChange={(e) => e.target.value && handleAssegna(p.fir_number, e.target.value)}
                      className="ml-auto rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
                    >
                      <option value="">Assegna a…</option>
                      {personale
                        .filter((u) => !u.mn_context || u.mn_context === assignApp)
                        .map((u) => (
                          <option key={u.id} value={u.id}>
                            {[u.nome, u.cognome].filter(Boolean).join(" ") || u.id.slice(0, 8)}
                          </option>
                        ))}
                    </select>
                  </div>
                ))}
                {disponibili.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nessun numero disponibile: vidima nuovi numeri.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === "registri" && (
          <div className="rounded-2xl bg-card/60 border border-border/30 p-6 space-y-4">
            <h3 className="text-base font-display tracking-wider">Invio movimenti al registro</h3>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Registro</label>
                <select
                  value={registroId}
                  onChange={(e) => setRegistroId(e.target.value)}
                  className="block rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm"
                >
                  {registri.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nome} ({r.id})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Dal</label>
                <input type="date" value={dataDa} onChange={(e) => setDataDa(e.target.value)}
                  className="block rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Al</label>
                <input type="date" value={dataA} onChange={(e) => setDataA(e.target.value)}
                  className="block rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm" />
              </div>
              <button onClick={handleCarica} disabled={caricando}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-secondary font-semibold disabled:opacity-40">
                {caricando ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} Carica movimenti
              </button>
              <button onClick={handleInviaRegistro} disabled={inviando || movimenti.length === 0}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-40">
                {inviando ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Invia a RENTRI
              </button>
            </div>

            <div className="max-h-[420px] overflow-auto rounded-xl border border-border/30">
              <table className="w-full text-sm">
                <thead className="bg-secondary/60 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left px-3 py-2">Data</th>
                    <th className="text-left px-3 py-2">Tipo</th>
                    <th className="text-left px-3 py-2">CER</th>
                    <th className="text-right px-3 py-2">Kg</th>
                    <th className="text-left px-3 py-2">FIR</th>
                  </tr>
                </thead>
                <tbody>
                  {movimenti.map((m) => (
                    <tr key={m.id} className="border-t border-border/20">
                      <td className="px-3 py-2">{m.data_movimento}</td>
                      <td className="px-3 py-2">{m.tipo_movimento}</td>
                      <td className="px-3 py-2 font-mono">{m.cer}</td>
                      <td className="px-3 py-2 text-right">{Number(m.quantita_kg ?? 0).toLocaleString("it-IT")}</td>
                      <td className="px-3 py-2 font-mono text-xs">{m.numero_fir ?? "—"}</td>
                    </tr>
                  ))}
                  {movimenti.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                        Nessun movimento caricato.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <RentriResultBanner result={result} />
          </div>
        )}

        {tab === "invii" && (
          <div className="rounded-2xl bg-card/60 border border-border/30 p-6 space-y-4">
            <h3 className="text-base font-display tracking-wider">Invii registri effettuati</h3>
            <div className="max-h-[520px] overflow-auto rounded-xl border border-border/30">
              <table className="w-full text-sm">
                <thead className="bg-secondary/60 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left px-3 py-2">Data</th>
                    <th className="text-left px-3 py-2">Cliente</th>
                    <th className="text-left px-3 py-2">Registro</th>
                    <th className="text-right px-3 py-2">Mov.</th>
                    <th className="text-left px-3 py-2">Stato</th>
                    <th className="text-left px-3 py-2">Transazione</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {invii.map((r) => (
                    <tr key={r.id} className="border-t border-border/20">
                      <td className="px-3 py-2">{new Date(r.created_at).toLocaleString("it-IT")}</td>
                      <td className="px-3 py-2">{r.cliente}</td>
                      <td className="px-3 py-2">{r.registro_nome ?? r.registro_id}</td>
                      <td className="px-3 py-2 text-right">{r.num_movimenti}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`px-2 py-0.5 rounded-md text-xs font-semibold ${
                            r.stato === "CONFERMATO"
                              ? "bg-green-500/15 text-green-400"
                              : r.stato === "ERRORE"
                                ? "bg-red-500/15 text-red-400"
                                : "bg-amber-500/15 text-amber-400"
                          }`}
                        >
                          {r.stato}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">{r.transazione_id ?? "—"}</td>
                      <td className="px-3 py-2 text-right">
                        {r.transazione_id && (
                          <button onClick={() => handleAggiorna(r)} className="text-xs px-2 py-1 rounded-md bg-secondary hover:bg-secondary/70">
                            Aggiorna stato
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {invii.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                        Nessun invio registrato.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "lemon" && <DarkLemonMNChat context={context} />}
      </div>
    </MNAdminLayout>
  );
}
