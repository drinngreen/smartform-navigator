import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, ScanSearch, CheckCircle2, AlertTriangle } from "lucide-react";

const MULTY_TENANT_ID = "77ec9a3d-602e-438f-97bf-1c69abd8f691";

interface RigaConfronto {
  cer: string;
  saldo_registrato: number;
  saldo_atteso: number;
  differenza: number;
}

const fmt = (n: number) =>
  Number(n || 0).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 3 });

export function DevConfrontoSaldiModule() {
  const { data, isFetching, refetch, error } = useQuery({
    queryKey: ["confronto-saldi", MULTY_TENANT_ID],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("simula_recalculate_magazzino_giacenza" as never, {
        p_tenant_id: MULTY_TENANT_ID,
        p_impianto_id: null,
        p_cer: null,
      } as never);
      if (error) throw error;
      return ((data ?? []) as unknown as RigaConfronto[]).map((r) => ({
        cer: r.cer,
        saldo_registrato: Number(r.saldo_registrato) || 0,
        saldo_atteso: Number(r.saldo_atteso) || 0,
        differenza: Number(r.differenza) || 0,
      }));
    },
  });

  const righe = data ?? [];
  const differenti = righe.filter((r) => Math.abs(r.differenza) > 0.001);

  return (
    <div className="space-y-4">
      <Card className="bg-card/60 border-emerald-500/30">
        <CardHeader className="pb-3 flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base text-emerald-300 flex items-center gap-2">
              <ScanSearch className="h-4 w-4" /> Confronto saldi — sola lettura
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Confronta il saldo registrato con quello ricalcolato dai soli movimenti effettivi. Non modifica
              nessun dato: elenca le differenze, non le corregge mai da solo.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-3 w-3 mr-1 ${isFetching ? "animate-spin" : ""}`} /> Ricontrolla
          </Button>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-sm text-rose-400">Confronto non disponibile: {(error as Error).message}</p>
          ) : isFetching && righe.length === 0 ? (
            <p className="text-sm text-muted-foreground">Lettura in corso…</p>
          ) : differenti.length === 0 ? (
            <p className="text-sm text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> Nessuna differenza su {righe.length} codici CER.
            </p>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-amber-400 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> {differenti.length} codici con differenza su {righe.length}{" "}
                controllati. Nessuna correzione automatica.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-muted-foreground border-b border-border/30">
                      <th className="text-left py-2">CER</th>
                      <th className="text-right py-2">Registrato (kg)</th>
                      <th className="text-right py-2">Ricalcolato (kg)</th>
                      <th className="text-right py-2">Differenza (kg)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {differenti.map((r) => (
                      <tr key={r.cer} className="border-b border-border/10">
                        <td className="py-2 font-mono">{r.cer}</td>
                        <td className="py-2 text-right">{fmt(r.saldo_registrato)}</td>
                        <td className="py-2 text-right">{fmt(r.saldo_atteso)}</td>
                        <td className={`py-2 text-right font-semibold ${r.differenza < 0 ? "text-rose-400" : "text-amber-400"}`}>
                          {fmt(r.differenza)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
