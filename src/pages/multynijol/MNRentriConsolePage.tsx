import { useEffect, useMemo, useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { useMNContextStore, MN_CONTEXTS } from "@/stores/mnContextStore";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import {
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
import { healthCheck as vpsHealthCheck } from "@/lib/rentriSuperApi";
import {
  caricaMovimentiCandidati,
  mapMovimentiToRentri,
  inviaRegistroRentri,
  aggiornaStatoInvio,
  type MovimentoImpiantoRow,
} from "@/lib/rentriRegistroSync";
import { RentriFirDaFirmarePanel } from "@/components/rentri/RentriFirDaFirmarePanel";
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
  PenLine,
  Copy,
} from "lucide-react";


const CONTEXT_TO_CLIENTE: Record<string, RentriCliente> = {
  multyproget: "multy",
  "dev-multyproget": "multy",
  "multyproget-intermediario": "multy",
  "multyproget-impianto": "multy",
  niyol: "niyol",
};

const SHARED_POOL_USER_ID = "00000000-0000-0000-0000-000000000000";
/** Blocchi di vidimazione appartenenti a ciascuna società (fallback se il bridge non espone CF/U.L.). */
const ALLOWED_BLOCCHI: Record<string, string[]> = {
  multy: ["ZRZXR"],
  niyol: ["DGXYQ", "BPJMG"],
};
const validContexts = ["multyproget", "niyol", "dev-multyproget", "multyproget-impianto", "multyproget-intermediario"];

type TabId = "stato" | "numeri" | "dafirmare" | "registri" | "invii" | "lemon";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "stato", label: "Stato RENTRI", icon: <Activity size={14} /> },
  { id: "numeri", label: "Numeri FIR", icon: <Ticket size={14} /> },
  { id: "dafirmare", label: "FIR da firmare", icon: <PenLine size={14} /> },
  { id: "registri", label: "Invio Registri", icon: <ClipboardList size={14} /> },
  { id: "invii", label: "Invii effettuati", icon: <Send size={14} /> },
  { id: "lemon", label: "Dark Lemon", icon: <Sparkles size={14} /> },
];

export default function MNRentriConsolePage() {
  const { context } = useParams<{ context: string }>();
  const setActiveContext = useMNContextStore((s) => s.setActiveContext);
  const isValid = !!context && validContexts.includes(context);
  const mnCtx = MN_CONTEXTS.find((c) => c.id === context) ?? MN_CONTEXTS.find((c) => c.id === "multyproget") ?? MN_CONTEXTS[0];
  const [cliente, setCliente] = useState<RentriCliente>(CONTEXT_TO_CLIENTE[context ?? ""] ?? "multy");
  const configKey = rentriConfigKey(cliente);
  const societaId = configKey === "niyol" ? "niyol" : "multy";

  useEffect(() => {
    if (isValid) setActiveContext(mnCtx);
  }, [context, isValid]);

  const initialTab = ((): TabId => {
    const t = new URLSearchParams(window.location.search).get("tab");
    const ids: TabId[] = ["stato", "numeri", "dafirmare", "registri", "invii", "lemon"];
    return ids.includes(t as TabId) ? (t as TabId) : "stato";
  })();
  const [tab, setTab] = useState<TabId>(initialTab);

  /* ── Stato RENTRI ── */
  const [vpsUp, setVpsUp] = useState<boolean | null>(null);
  const [blocchi, setBlocchi] = useState<Record<string, unknown>[]>([]);
  const [loadingStato, setLoadingStato] = useState(false);
  const [result, setResult] = useState<RentriVpsResponse | null>(null);

  /** Filtra i blocchi restituiti dal bridge tenendo solo quelli della società selezionata. */
  const filtraBlocchiPerCliente = (list: any[], key: string) => {
    const cf = RENTRI_ISSUERS[key];
    const ul = RENTRI_UNITA_LOCALI[key];
    const allowed = ALLOWED_BLOCCHI[key] ?? [];
    return list.filter((b: any) => {
      const codice = String(b?.codice ?? b?.blocco ?? b?.identificativo ?? "").toUpperCase();
      const bCf = String(b?.identificativo_soggetto ?? b?.cf_soggetto ?? b?.codice_fiscale ?? b?.issuer ?? "");
      const bUl = String(b?.num_iscr_sito ?? b?.numero_iscrizione_sito ?? b?.unita_locale ?? "");
      if (bCf) return bCf.replace(/^IT/i, "") === cf;
      if (bUl) return bUl === ul;
      return allowed.length === 0 || allowed.includes(codice);
    });
  };

  const refreshStato = async () => {
    setLoadingStato(true);
    setResult(null);
    try {
      const health = await vpsHealthCheck();
      setVpsUp(!!health?.ok);
      const res = await listaBlocchi(cliente);
      setResult(res);
      const raw = res.data as any;
      const list = Array.isArray(raw) ? raw : raw?.blocchi ?? raw?.items ?? raw?.content ?? [];
      setBlocchi(Array.isArray(list) ? filtraBlocchiPerCliente(list, configKey) : []);
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
  const [pool, setPool] = useState<{ id: string; fir_number: string; status: string; user_id: string | null; assigned_at: string | null }[]>([]);
  const [personale, setPersonale] = useState<
    { id: string; user_id: string | null; nome: string | null; cognome: string | null; mn_context: string | null; tenant_id: string | null }[]
  >([]);
  const [qty, setQty] = useState(5);
  const [pescando, setPescando] = useState(false);
  const [assegnando, setAssegnando] = useState(false);
  const [assignApp, setAssignApp] = useState<"multyproget" | "niyol">(
    configKey === "niyol" ? "niyol" : "multyproget",
  );

  useEffect(() => {
    setAssignApp(configKey === "niyol" ? "niyol" : "multyproget");
  }, [configKey]);

  const appDiProfilo = (u: { mn_context: string | null; tenant_id: string | null }) =>
    u.mn_context === "niyol" || u.tenant_id === "819c783e-78dd-4080-8265-802e75b0d813" ? "niyol" : "multyproget";

  const loadPool = async () => {
    const [{ data: poolRows }, { data: profs }] = await Promise.all([
      supabase
        .from("fir_number_pool")
        .select("id, fir_number, status, user_id, assigned_at")
        .eq("societa_id", societaId)
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("profiles")
        .select("id, user_id, nome, cognome, mn_context, tenant_id")
        .or(
          "mn_context.in.(multyproget,niyol),tenant_id.in.(77ec9a3d-602e-438f-97bf-1c69abd8f691,819c783e-78dd-4080-8265-802e75b0d813)",
        )
        .order("cognome", { ascending: true }),
    ]);
    setPool((poolRows ?? []) as any);
    setPersonale((profs ?? []) as any);
  };

  useEffect(() => {
    loadPool();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [societaId]);

  const disponibili = useMemo(() => pool.filter((p) => p.status === "available"), [pool]);

  /** Mappa auth-uid → nome dipendente (profiles.user_id o profiles.id) */
  const nomeByUid = useMemo(() => {
    const map: Record<string, string> = {};
    for (const u of personale) {
      const label = [u.nome, u.cognome].filter(Boolean).join(" ").trim();
      if (!label) continue;
      if (u.user_id) map[u.user_id] = label;
      map[u.id] = map[u.id] ?? label;
    }
    return map;
  }, [personale]);

  const assegnati = useMemo(
    () =>
      pool
        .filter((p) => p.status !== "available")
        .map((p) => ({
          ...p,
          assegnatario:
            p.user_id && p.user_id !== SHARED_POOL_USER_ID
              ? nomeByUid[p.user_id] ?? "🏢 Ufficio / admin"
              : "Serbatoio condiviso",
        })),
    [pool, nomeByUid],
  );



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

  /** Contrassegna il numero come usato direttamente dall'ufficio (admin) */
  const handleAssegnaUfficio = async (firNumber: string) => {
    setAssegnando(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const adminId = auth?.user?.id;
      if (!adminId) throw new Error("Sessione admin non valida");
      const tenantId =
        assignApp === "niyol" ? "819c783e-78dd-4080-8265-802e75b0d813" : "77ec9a3d-602e-438f-97bf-1c69abd8f691";
      const { error } = await supabase.rpc("create_manual_fir_draft_for_tenant" as never, {
        p_user_id: adminId,
        p_tenant_id: tenantId,
        p_numero_fir: firNumber,
      } as never);
      if (error) throw error;
      toast.success(`FIR ${firNumber} contrassegnato come UFFICIO (uso admin)`);
      loadPool();
    } catch (e: any) {
      toast.error(`Errore assegnazione ufficio: ${e.message}`);
    } finally {
      setAssegnando(false);
    }
  };

  const copyFir = async (firNumber: string) => {
    try {
      await navigator.clipboard.writeText(firNumber);
      toast.success(`Copiato: ${firNumber}`);
    } catch {
      toast.error("Copia non riuscita");
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

  /* movimenti già inviati (riferimento_interno presente in rentri_invii_registri) */
  const [inviatiIds, setInviatiIds] = useState<Set<string>>(new Set());
  const [selezione, setSelezione] = useState<Set<string>>(new Set());
  const [movDetail, setMovDetail] = useState<MovimentoImpiantoRow | null>(null);


  const toggleSel = (id: string) =>
    setSelezione((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const inviaMovimenti = async (rows: MovimentoImpiantoRow[]) => {
    const payload = mapMovimentiToRentri(rows, cliente);
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
      if (response.success) {
        toast.success(`Registro inviato: ${payload.length} movimenti`);
        setSelezione(new Set());
      } else toast.error(response.userMessage ?? "Invio registro fallito");
      loadInvii();
    } catch (e: any) {
      toast.error(`Errore invio: ${e.message}`);
    } finally {
      setInviando(false);
    }
  };

  const handleInviaTutti = () => inviaMovimenti(movimenti.filter((m) => !inviatiIds.has(m.id)));
  const handleInviaSelezionati = () => inviaMovimenti(movimenti.filter((m) => selezione.has(m.id)));

  /* ── Invii effettuati ── */
  const [invii, setInvii] = useState<any[]>([]);
  const loadInvii = async () => {
    const { data } = await supabase
      .from("rentri_invii_registri")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    const rows = data ?? [];
    setInvii(rows);
    const ids = new Set<string>();
    for (const r of rows as any[]) {
      if (r.stato === "ERRORE") continue;
      for (const m of (r.movimenti ?? []) as any[]) {
        if (m?.riferimento_interno) ids.add(String(m.riferimento_interno));
      }
    }
    setInviatiIds(ids);
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
  const label = configKey === "niyol" ? "Niyol" : "Multyproget";

  return (
    <MNAdminLayout title={`Console RENTRI — ${label}`} subtitle="Stato, numeri FIR, registri e invii">
      <div className="space-y-6">
        {/* Barra stato */}
        <div className="flex flex-wrap items-center gap-2">
          {(["multy", "niyol"] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCliente(c)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${
                configKey === c
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-secondary/50 text-muted-foreground border-border/50 hover:bg-secondary"
              }`}
            >
              {c === "niyol" ? "Niyol" : "Multyproget"}
            </button>
          ))}
        </div>

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
              {personale.filter((u) => appDiProfilo(u) === assignApp).length === 0 && (
                <p className="text-xs text-amber-400">
                  Nessun dipendente collegato all'app {assignApp === "niyol" ? "Niyol" : "Multyproget"}: creane uno da
                  Dashboard → Gestione utenti app.
                </p>
              )}
              <div className="space-y-2 max-h-[420px] overflow-auto">
                {disponibili.map((p) => (
                  <div key={p.id} className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-secondary/40 border border-border/30">
                    <span className="font-mono text-sm font-bold">{p.fir_number}</span>
                    <button
                      type="button"
                      title="Copia numero FIR"
                      onClick={() => copyFir(p.fir_number)}
                      className="rounded-md border border-border/60 bg-background/60 p-1.5 text-muted-foreground hover:text-foreground"
                    >
                      <Copy size={14} />
                    </button>
                    <select
                      disabled={assegnando}
                      value=""
                      onChange={(e) => {
                        const v = e.target.value;
                        if (!v) return;
                        if (v === "__ufficio__") handleAssegnaUfficio(p.fir_number);
                        else handleAssegna(p.fir_number, v);
                        e.target.value = "";
                      }}
                      className="ml-auto rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
                    >
                      <option value="">Assegna a…</option>
                      <option value="__ufficio__">🏢 Contrassegna come UFFICIO (uso admin)</option>
                      {personale
                        .filter((u) => appDiProfilo(u) === assignApp)
                        .map((u) => (
                          <option key={u.id} value={u.user_id ?? u.id}>
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

            <div className="rounded-2xl bg-card/60 border border-border/30 p-6 space-y-3">
              <h3 className="text-base font-display tracking-wider flex items-center gap-2">
                <Users size={16} /> Numeri già assegnati ({assegnati.length})
              </h3>
              <p className="text-xs text-muted-foreground">
                Numeri scaricati da RENTRI e già assegnati a un dipendente o all'ufficio.
              </p>
              <div className="space-y-2 max-h-[420px] overflow-auto">
                {assegnati.map((p) => (
                  <div
                    key={p.id}
                    className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-secondary/30 border border-border/30"
                  >
                    <span className="font-mono text-sm font-bold">{p.fir_number}</span>
                    <button
                      type="button"
                      title="Copia numero FIR"
                      onClick={() => copyFir(p.fir_number)}
                      className="rounded-md border border-border/60 bg-background/60 p-1.5 text-muted-foreground hover:text-foreground"
                    >
                      <Copy size={14} />
                    </button>
                    <span className="text-sm text-foreground">{p.assegnatario}</span>
                    <span
                      className={`ml-auto text-[11px] uppercase font-semibold px-2 py-1 rounded-full ${
                        p.status === "consumed"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-amber-500/20 text-amber-300"
                      }`}
                    >
                      {p.status === "consumed" ? "utilizzato" : "assegnato"}
                    </span>
                    {p.assigned_at && (
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {new Date(p.assigned_at).toLocaleDateString("it-IT")}
                      </span>
                    )}
                  </div>
                ))}
                {assegnati.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nessun numero assegnato al momento.</p>
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
              <button onClick={handleInviaSelezionati} disabled={inviando || selezione.size === 0}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-secondary border border-primary/50 font-semibold disabled:opacity-40">
                {inviando ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Invia selezionati ({selezione.size})
              </button>
              <button onClick={handleInviaTutti} disabled={inviando || movimenti.filter((m) => !inviatiIds.has(m.id)).length === 0}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-40">
                {inviando ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Invia tutti i non inviati
              </button>
            </div>

            <div className="max-h-[420px] overflow-auto rounded-xl border border-border/30">
              <table className="w-full text-sm">
                <thead className="bg-secondary/60 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 w-8">
                      <input
                        type="checkbox"
                        checked={movimenti.length > 0 && selezione.size === movimenti.filter((m) => !inviatiIds.has(m.id)).length && selezione.size > 0}
                        onChange={(e) =>
                          setSelezione(e.target.checked ? new Set(movimenti.filter((m) => !inviatiIds.has(m.id)).map((m) => m.id)) : new Set())
                        }
                      />
                    </th>
                    <th className="text-left px-3 py-2">Data</th>
                    <th className="text-left px-3 py-2">Tipo</th>
                    <th className="text-left px-3 py-2">CER</th>
                    <th className="text-right px-3 py-2">Kg</th>
                    <th className="text-left px-3 py-2">FIR</th>
                    <th className="text-left px-3 py-2">Stato</th>
                    <th className="text-right px-3 py-2">Azione</th>
                  </tr>
                </thead>
                <tbody>
                  {movimenti.map((m) => {
                    const inviato = inviatiIds.has(m.id);
                    return (
                      <tr key={m.id} className={`border-t border-border/20 ${inviato ? "bg-emerald-500/5" : ""}`}>
                        <td className="px-3 py-2">
                          <input type="checkbox" checked={selezione.has(m.id)} onChange={() => toggleSel(m.id)} />
                        </td>
                        <td className="px-3 py-2">{m.data_movimento}</td>
                        <td className="px-3 py-2">{m.tipo_movimento}</td>
                        <td className="px-3 py-2 font-mono">{m.cer}</td>
                        <td className="px-3 py-2 text-right">{Number(m.quantita_kg ?? 0).toLocaleString("it-IT")}</td>
                        <td className="px-3 py-2 font-mono text-xs">{m.numero_fir ?? "—"}</td>
                        <td className="px-3 py-2">
                          {inviato ? (
                            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
                              ✓ INVIATO
                            </span>
                          ) : (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">Da inviare</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => setMovDetail(m)}
                              className="rounded-lg border border-border px-3 py-1 text-xs font-semibold"
                            >
                              Dettagli
                            </button>
                            <button
                              onClick={() => inviaMovimenti([m])}
                              disabled={inviando}
                              className="rounded-lg border border-primary/50 px-3 py-1 text-xs font-semibold disabled:opacity-40"
                            >
                              {inviato ? "Reinvia" : "Invia"}
                            </button>
                          </div>
                        </td>

                      </tr>
                    );
                  })}
                  {movimenti.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">
                        Nessun movimento caricato.
                      </td>
                    </tr>
                  )}

                </tbody>
              </table>
            </div>
            <RentriResultBanner result={result} />

            {movDetail && (
              <div
                className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4"
                onClick={() => setMovDetail(null)}
              >
                <div
                  className="max-h-[85vh] w-full max-w-2xl overflow-auto rounded-xl border border-border bg-card p-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-bold">Dettagli movimento</h3>
                    <button
                      type="button"
                      onClick={() => setMovDetail(null)}
                      className="rounded border border-border bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground"
                    >
                      ✕ Chiudi
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-muted-foreground">Data:</span> {movDetail.data_movimento}</div>
                    <div><span className="text-muted-foreground">Tipo:</span> {movDetail.tipo_movimento}</div>
                    <div><span className="text-muted-foreground">CER:</span> {movDetail.cer}</div>
                    <div><span className="text-muted-foreground">Kg:</span> {Number(movDetail.quantita_kg ?? 0).toLocaleString("it-IT")}</div>
                    <div><span className="text-muted-foreground">FIR:</span> {movDetail.numero_fir ?? "—"}</div>
                    <div><span className="text-muted-foreground">Stato:</span> {inviatiIds.has(movDetail.id) ? "INVIATO" : "Da inviare"}</div>
                    <div className="col-span-2"><span className="text-muted-foreground">Descrizione:</span> {movDetail.descrizione_rifiuto ?? "—"}</div>
                    <div className="col-span-2"><span className="text-muted-foreground">Produttore:</span> {movDetail.produttore_denominazione ?? "—"}</div>
                    <div className="col-span-2"><span className="text-muted-foreground">Destinatario:</span> {movDetail.destinatario_denominazione ?? "—"}</div>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {tab === "dafirmare" && (
          <div className="rounded-2xl bg-card/60 border border-border/30 p-6 space-y-4">
            <h3 className="text-base font-display tracking-wider">Formulari su RENTRI da firmare come destinatario</h3>
            <RentriFirDaFirmarePanel cliente={cliente} />
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
