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

export function DevSystemTestModule() {
  const companyId = useMNContextStore((s) => s.activeContext.tenantId);
  const [running, setRunning] = useState<string | null>(null);
  const [reports, setReports] = useState<TestReport[]>([]);

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
