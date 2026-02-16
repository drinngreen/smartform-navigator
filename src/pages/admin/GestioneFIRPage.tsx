import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { richiediNuoviNumeri, inviaFirmaRentri, getRentriPdfUrl, checkRentriHealth } from "@/services/rentriApi";
import { Upload, RefreshCw, Database, Package, CheckCircle, Clock, AlertTriangle, Zap, Download, FileText, XCircle } from "lucide-react";

export default function GestioneFIRPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [bulkInput, setBulkInput] = useState("");
  const [isRequesting, setIsRequesting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    details?: string;
    qrCode?: string;
    numeroFir?: string;
  } | null>(null);

  // ── Pool stats query ──────────────────────────────────
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["fir-pool-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fir_number_pool")
        .select("status, societa_id")
        .eq("societa_id", "global");

      if (error) throw error;

      const total = data?.length ?? 0;
      const disponibili = data?.filter((r: any) => r.status === "available").length ?? 0;
      const assegnati = data?.filter((r: any) => r.status === "reserved").length ?? 0;
      const usati = data?.filter((r: any) => r.status === "consumed").length ?? 0;

      return { total, disponibili, assegnati, usati };
    },
    refetchInterval: 10000,
  });

  // ── Bulk import mutation ──────────────────────────────
  const importMutation = useMutation({
    mutationFn: async (numbers: string[]) => {
      const rows = numbers.map((n) => ({
        fir_number: n.trim(),
        user_id: user!.id,
        status: "available" as const,
        societa_id: "global",
      }));

      const { error } = await supabase.from("fir_number_pool").insert(rows);
      if (error) throw error;
      return rows.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["fir-pool-stats"] });
      queryClient.invalidateQueries({ queryKey: ["fir-number-pool"] });
      toast.success(`✅ ${count} numeri caricati nel serbatoio`);
      setBulkInput("");
    },
    onError: (err: any) => {
      toast.error(`Errore caricamento: ${err.message}`);
    },
  });

  const handleBulkImport = () => {
    const numbers = bulkInput
      .split(/[,\n\r]+/)
      .map((n) => n.trim())
      .filter((n) => n.length > 0);

    if (numbers.length === 0) {
      toast.error("Inserisci almeno un numero FIR");
      return;
    }

    // Check for duplicates
    const unique = [...new Set(numbers)];
    if (unique.length < numbers.length) {
      toast.warning(`Rimossi ${numbers.length - unique.length} duplicati`);
    }

    importMutation.mutate(unique);
  };

  // ── Request new numbers from RENTRI ──────────────────
  const handleRequestFromRentri = async () => {
    setIsRequesting(true);
    try {
      const result = await richiediNuoviNumeri("global");
      if (result.numeri && result.numeri.length > 0) {
        // Save to pool
        const rows = result.numeri.map((n: string) => ({
          fir_number: n,
          user_id: user!.id,
          status: "available" as const,
          societa_id: "global",
        }));

        const { error } = await supabase.from("fir_number_pool").insert(rows);
        if (error) throw error;

        queryClient.invalidateQueries({ queryKey: ["fir-pool-stats"] });
        queryClient.invalidateQueries({ queryKey: ["fir-number-pool"] });
        toast.success(`✅ ${result.numeri.length} nuovi numeri ricevuti da RENTRI`);
      } else {
        toast.info("Nessun nuovo numero disponibile da RENTRI");
      }
    } catch (err: any) {
      toast.error(`Errore richiesta RENTRI: ${err.message}`);
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <AdminLayout title="Gestione FIR" subtitle="Serbatoio Numeri Formulario">
      <div className="space-y-6">
        {/* ── Stats Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={<Database className="h-5 w-5" />} label="Totale" value={stats?.total ?? 0} color="text-primary" loading={statsLoading} />
          <StatCard icon={<CheckCircle className="h-5 w-5" />} label="Disponibili" value={stats?.disponibili ?? 0} color="text-neon-green" loading={statsLoading} />
          <StatCard icon={<Clock className="h-5 w-5" />} label="Assegnati" value={stats?.assegnati ?? 0} color="text-neon-cyan" loading={statsLoading} />
          <StatCard icon={<Package className="h-5 w-5" />} label="Usati" value={stats?.usati ?? 0} color="text-orange-400" loading={statsLoading} />
        </div>

        {/* ── Bulk Import ── */}
        <div className="rounded-2xl bg-card/60 border border-border/30 p-6 space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <Upload className="h-5 w-5" />
            <h3 className="font-display text-lg tracking-wider uppercase">Carica Numeri nel Serbatoio</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Incolla i numeri FIR separati da virgola o su righe separate.
          </p>
          <textarea
            value={bulkInput}
            onChange={(e) => setBulkInput(e.target.value)}
            placeholder={"FMGWB001234\nFMGWB001235\nXNQLK009876"}
            rows={6}
            className="w-full bg-background/80 border border-primary/15 rounded-xl px-4 py-3 text-foreground text-sm font-mono placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary/40 transition-all resize-none"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-mono">
              {bulkInput.split(/[,\n\r]+/).filter((n) => n.trim()).length} numeri rilevati
            </span>
            <button
              onClick={handleBulkImport}
              disabled={importMutation.isPending || !bulkInput.trim()}
              className="px-6 py-3 rounded-xl bg-primary/20 border border-primary/30 text-primary font-display text-sm tracking-wider hover:bg-primary/30 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {importMutation.isPending ? (
                <div className="w-4 h-4 border-2 border-primary/50 border-t-primary rounded-full animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              CARICA NEL SERBATOIO
            </button>
          </div>
        </div>

        {/* ── Request from RENTRI ── */}
        <div className="rounded-2xl bg-card/60 border border-border/30 p-6 space-y-4">
          <div className="flex items-center gap-2 text-neon-cyan">
            <RefreshCw className="h-5 w-5" />
            <h3 className="font-display text-lg tracking-wider uppercase">Richiedi Nuovi Numeri a RENTRI</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Se il serbatoio è vuoto, puoi richiedere nuovi numeri vidimati direttamente dal sistema RENTRI.
          </p>
          {(stats?.disponibili ?? 0) === 0 && (
            <div className="flex items-center gap-2 text-amber-400 text-xs font-mono">
              <AlertTriangle className="h-4 w-4" />
              ATTENZIONE: Serbatoio vuoto!
            </div>
          )}
          <button
            onClick={handleRequestFromRentri}
            disabled={isRequesting}
            className="px-6 py-3 rounded-xl bg-neon-cyan/20 border border-neon-cyan/30 text-neon-cyan font-display text-sm tracking-wider hover:bg-neon-cyan/30 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isRequesting ? (
              <div className="w-4 h-4 border-2 border-neon-cyan/50 border-t-neon-cyan rounded-full animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            RICHIEDI NUOVI NUMERI A RENTRI
          </button>
        </div>
        {/* ── Test Invio RENTRI (Sandbox) ── */}
        <div className="rounded-2xl bg-card/60 border border-border/30 p-6 space-y-4">
          <div className="flex items-center gap-2 text-amber-400">
            <Zap className="h-5 w-5" />
            <h3 className="font-display text-lg tracking-wider uppercase">Test Invio RENTRI (Sandbox)</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Esegui un invio di test con dati fittizi per verificare il collegamento mTLS con il server Render e RENTRI.
          </p>

          <button
            onClick={async () => {
              setIsTesting(true);
              setTestResult(null);
              const startTime = Date.now();
              try {
                // Step 1: Health check
                console.log("[RENTRI TEST] Running health check...");
                const health = await checkRentriHealth();
                console.log("[RENTRI TEST] Health:", JSON.stringify(health));
                if (!health.ok) {
                  setTestResult({
                    success: false,
                    message: `❌ Server non raggiungibile`,
                    details: `URL: ${health.url}\nStatus: ${health.status}\nBody: ${health.body}`,
                  });
                  toast.error("Server RENTRI non raggiungibile");
                  setIsTesting(false);
                  return;
                }

                // Step 2: Actual test
                console.log("[RENTRI TEST] Calling /firma-fir...");
                const result = await inviaFirmaRentri({
                  societaId: "global",
                  payloadFir: {
                    _test: true,
                    numero_fir: "SKKZR00000001",
                    produttore: { denominazione: "Test Srl", codice_fiscale: "00000000000", indirizzo: "Via Test 1, 10100 Torino (TO)" },
                    destinatario: { denominazione: "Impianto Test Srl", codice_fiscale: "11111111111", indirizzo: "Via Prova 2, 10100 Torino (TO)" },
                    trasportatore: { denominazione: "Trasporto Test Srl", codice_fiscale: "22222222222", albo: "TO/00001" },
                    rifiuto: { codice_eer: "150101", descrizione: "Imballaggi di carta e cartone (TEST)", stato_fisico: "solido non pulverulento", quantita: 10, unita_misura: "kg" },
                  },
                });
                const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
                // Map backend field names (firNumber, rentriId) to expected names
                const numeroFir = result.numero_fir || (result as any).firNumber || "";
                const rentriId = (result as any).rentriId || "";
                const qrCode = result.qr_code || (result as any).qrCode || "";
                setTestResult({
                  success: true,
                  message: `✅ TEST SUPERATO (${elapsed}s) — RENTRI ID: ${rentriId || "N/A"}`,
                  details: JSON.stringify(result, null, 2),
                  qrCode: qrCode,
                  numeroFir: numeroFir,
                });
                toast.success("Test RENTRI superato!");
              } catch (err: any) {
                const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
                setTestResult({
                  success: false,
                  message: `❌ TEST FALLITO (${elapsed}s)`,
                  details: err.message || String(err),
                });
                toast.error("Test RENTRI fallito: " + err.message);
              } finally {
                setIsTesting(false);
              }
            }}
            disabled={isTesting}
            className="px-6 py-3 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 font-display text-sm tracking-wider hover:bg-amber-500/30 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isTesting ? (
              <div className="w-4 h-4 border-2 border-amber-500/50 border-t-amber-400 rounded-full animate-spin" />
            ) : (
              <Zap className="h-4 w-4" />
            )}
            {isTesting ? "INVIO IN CORSO..." : "ESEGUI TEST INVIO RENTRI"}
          </button>

          {/* Result panel */}
          {testResult && (
            <div className={`rounded-xl border p-4 space-y-3 ${testResult.success ? "bg-neon-green/5 border-neon-green/30" : "bg-destructive/5 border-destructive/30"}`}>
              <div className="flex items-center gap-2">
                {testResult.success ? <CheckCircle className="h-5 w-5 text-neon-green" /> : <XCircle className="h-5 w-5 text-destructive" />}
                <span className={`font-display text-sm ${testResult.success ? "text-neon-green" : "text-destructive"}`}>
                  {testResult.message}
                </span>
              </div>

              {testResult.success && testResult.qrCode && (
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-white rounded-lg">
                    <img src={testResult.qrCode} alt="QR Code Test" className="h-20 w-20" />
                  </div>
                  <div className="text-xs font-mono text-muted-foreground space-y-1">
                    <p><span className="text-primary">N. FIR:</span> {testResult.numeroFir}</p>
                    <p><span className="text-primary">QR:</span> Ricevuto ✓</p>
                  </div>
                </div>
              )}

              {testResult.success && testResult.numeroFir && (
                <div className="flex gap-2">
                  <a
                    href={getRentriPdfUrl(testResult.numeroFir)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/20 border border-primary/30 text-primary text-xs font-display hover:bg-primary/30 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" /> Scarica PDF Test
                  </a>
                  <a
                    href={getRentriPdfUrl(testResult.numeroFir)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-card border border-border/30 text-muted-foreground text-xs font-display hover:text-foreground transition-colors"
                  >
                    <FileText className="h-3.5 w-3.5" /> Apri in nuova tab
                  </a>
                </div>
              )}

              {/* Technical log */}
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground font-mono">Log tecnico</summary>
                <pre className="mt-2 p-3 bg-background/80 rounded-lg overflow-x-auto text-muted-foreground font-mono text-[10px] leading-relaxed max-h-60 overflow-y-auto">
                  {testResult.details}
                </pre>
              </details>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
function StatCard({ icon, label, value, color, loading }: { icon: React.ReactNode; label: string; value: number; color: string; loading: boolean }) {
  return (
    <div className="rounded-2xl bg-card/60 border border-border/30 p-4 flex flex-col items-center gap-2">
      <div className={`${color} opacity-70`}>{icon}</div>
      <span className={`text-2xl font-display font-bold ${color}`}>
        {loading ? "—" : value}
      </span>
      <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">{label}</span>
    </div>
  );
}
