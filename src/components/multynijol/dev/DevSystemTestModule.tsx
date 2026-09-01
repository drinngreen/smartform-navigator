import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useMNContextStore } from "@/stores/mnContextStore";
import { Scissors, Package, FileText, Loader2, CheckCircle2, XCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

type Step = { name: string; ok: boolean; expected?: string; actual?: string };
type TestReport = {
  session: string;
  scenario: string;
  steps: Step[];
  duration_ms?: number;
  passed: boolean;
  integrity_ok: boolean;
};

const SCENARIOS = [
  { key: "cernite", label: "Testa Cernite", icon: Scissors, desc: "Carica un CER di test, esegue una cernita reale (1000 kg → 600 + 300 + calo), verifica giacenze, annulla e ripulisce." },
  { key: "giacenze", label: "Testa Giacenze", icon: Package, desc: "Carichi e scarichi reali, blocco oltre disponibilità, coerenza registro/magazzino, poi pulizia." },
  { key: "fir", label: "Testa FIR", icon: FileText, desc: "Bozza FIR di test, blocco duplicati, verifica che nessun numero reale venga consumato." },
] as const;

type HealthCheck = { check: string; anomalie: number };
type HealthReport = { generated_at: string; ok: boolean; checks: HealthCheck[] };

export function DevSystemTestModule() {
  const companyId = useMNContextStore((s) => s.activeContext.tenantId);
  const [running, setRunning] = useState<string | null>(null);
  const [reports, setReports] = useState<TestReport[]>([]);
  const [health, setHealth] = useState<HealthReport | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  const runHealth = async () => {
    setHealthLoading(true);
    try {
      const { data, error } = await (supabase.rpc as any)("system_health_check");
      if (error) throw error;
      const report = data as HealthReport;
      setHealth(report);
      if (report.ok) toast.success("Controllo a 10 fattori: tutto regolare");
      else toast.error("Controllo a 10 fattori: anomalie rilevate");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setHealthLoading(false);
    }
  };

  const run = async (scenario: string) => {
    if (!companyId) {
      toast.error("Contesto azienda non disponibile");
      return;
    }
    setRunning(scenario);
    try {
      const { data, error } = await (supabase.rpc as any)("dragon_test_run", {
        p_company_id: companyId,
        p_scenario: scenario,
      });
      if (error) throw error;
      const report = data as TestReport;
      setReports((prev) => [report, ...prev].slice(0, 10));
      if (report.passed && report.integrity_ok) toast.success(`Test ${scenario}: superato`);
      else toast.error(`Test ${scenario}: fallito`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setRunning(null);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-emerald-300 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" /> Test di Sistema
        </h3>
        <p className="text-xs text-muted-foreground">
          I test eseguono operazioni reali sul database, verificano i risultati e poi eliminano integralmente i dati di test,
          confrontando le giacenze prima e dopo.
        </p>
      </div>

      {/* Controllo a 10 fattori (sola lettura) */}
      <div className="rounded-xl border border-border/30 bg-card/60 p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <h4 className="font-semibold text-sm text-emerald-300">Controllo a 10 fattori</h4>
            <p className="text-xs text-muted-foreground">
              Verifica in sola lettura di giacenze, allineamento registri, ricevute privati, codici materiale, numeri
              formulario, ricevute RENTRI e cernite. Non modifica alcun dato.
            </p>
          </div>
          <button
            onClick={() => void runHealth()}
            disabled={healthLoading}
            className="ml-auto px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 disabled:opacity-50 flex items-center gap-2"
          >
            {healthLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            Esegui controllo
          </button>
        </div>
        {health && (
          <div className="divide-y divide-border/20 rounded-lg border border-border/30">
            {health.checks.map((c) => (
              <div key={c.check} className="flex items-center gap-3 px-3 py-2 text-xs">
                {Number(c.anomalie) === 0 ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-destructive shrink-0" />
                )}
                <span className="flex-1">{c.check}</span>
                <span className={Number(c.anomalie) === 0 ? "text-emerald-400" : "text-destructive font-semibold"}>
                  {Number(c.anomalie) === 0 ? "OK" : `${c.anomalie} anomalie`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {SCENARIOS.map(({ key, label, icon: Icon, desc }) => (
          <div key={key} className="rounded-xl border border-border/30 bg-card/60 p-4 flex flex-col gap-3">
            <div>
              <h4 className="font-semibold text-emerald-300 flex items-center gap-2 text-sm">
                <Icon className="h-4 w-4" /> {label}
              </h4>
              <p className="text-xs text-muted-foreground mt-1">{desc}</p>
            </div>
            <button
              onClick={() => run(key)}
              disabled={running !== null}
              className="mt-auto px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {running === key ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
              {running === key ? "Esecuzione..." : label}
            </button>
          </div>
        ))}
      </div>

      {reports.length === 0 && (
        <p className="text-xs text-muted-foreground">Nessun test eseguito in questa sessione.</p>
      )}

      <div className="space-y-4">
        {reports.map((r) => (
          <div key={r.session} className="rounded-xl border border-border/30 bg-card/60 overflow-hidden">
            <div className="flex items-center justify-between gap-3 flex-wrap px-4 py-3 border-b border-border/30">
              <div className="flex items-center gap-2">
                {r.passed && r.integrity_ok ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                ) : (
                  <XCircle className="h-5 w-5 text-destructive" />
                )}
                <span className="font-medium text-sm">Test {r.scenario}</span>
                <span className="text-xs text-muted-foreground">{r.session}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {r.duration_ms ? `${r.duration_ms} ms` : ""}
              </span>
            </div>
            <div className="divide-y divide-border/20">
              {r.steps.map((s, i) => (
                <div key={i} className="px-4 py-2 text-xs flex items-start gap-3">
                  {s.ok ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <div className="font-medium">{s.name}</div>
                    {(s.expected || s.actual) && (
                      <div className="text-muted-foreground break-all">
                        atteso: {s.expected ?? "—"} · ottenuto: {s.actual ?? "—"}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div
              className={`px-4 py-2 text-xs font-medium ${
                r.integrity_ok ? "text-emerald-300" : "text-destructive"
              }`}
            >
              Sistema integro dopo il test: {r.integrity_ok ? "SÌ" : "NO"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
