import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Package, RefreshCw, Search } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const MULTY_TENANT_ID = "77ec9a3d-602e-438f-97bf-1c69abd8f691";

interface GiacenzaVisibile {
  id: string;
  cer: string;
  descrizione_cer: string | null;
  quantita_kg: number;
  area_stoccaggio: string | null;
  updated_at: string | null;
}

const formatKg = (value: number) =>
  value.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 3 });

export function DevGiacenzeSolaLettura() {
  const [search, setSearch] = useState("");
  const { data = [], isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["giacenze-sola-lettura", MULTY_TENANT_ID],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("magazzino_giacenze")
        .select("id, cer, descrizione_cer, quantita_kg, area_stoccaggio, updated_at")
        .eq("tenant_id", MULTY_TENANT_ID)
        .order("cer");
      if (error) throw error;
      return (data ?? []).map((row) => ({
        ...row,
        quantita_kg: Number(row.quantita_kg) || 0,
      })) as GiacenzaVisibile[];
    },
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return data;
    return data.filter((row) =>
      row.cer.toLowerCase().includes(term) ||
      (row.descrizione_cer ?? "").toLowerCase().includes(term),
    );
  }, [data, search]);

  const totale = filtered.reduce((sum, row) => sum + row.quantita_kg, 0);
  const positivi = filtered.filter((row) => row.quantita_kg > 0).length;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <Card className="border-emerald-500/30 bg-card/60">
          <CardContent className="flex items-center gap-3 p-4">
            <Package className="h-7 w-7 text-emerald-400" />
            <div><p className="text-xs text-muted-foreground">CER con disponibilità</p><p className="text-xl font-bold text-emerald-400">{positivi}</p></div>
          </CardContent>
        </Card>
        <Card className="border-cyan-500/30 bg-card/60">
          <CardContent className="flex items-center gap-3 p-4">
            <Package className="h-7 w-7 text-cyan-400" />
            <div><p className="text-xs text-muted-foreground">Totale visibile</p><p className="text-xl font-bold text-cyan-400">{formatKg(totale)} kg</p></div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/30 bg-card/60">
        <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
          <div>
            <CardTitle className="text-base text-emerald-300">Giacenze</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">Vista dei saldi correnti. Nessun comando modifica i dati.</p>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> Aggiorna
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cerca CER o descrizione" className="pl-9" />
          </div>
          {error ? <p className="text-sm text-destructive">Giacenze non disponibili: {(error as Error).message}</p> : null}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border/30 text-muted-foreground">
                <th className="px-3 py-2 text-left">CER</th>
                <th className="px-3 py-2 text-left">Descrizione</th>
                <th className="px-3 py-2 text-left">Area</th>
                <th className="px-3 py-2 text-right">Giacenza (kg)</th>
              </tr></thead>
              <tbody>
                {isLoading ? <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">Lettura in corso…</td></tr> : null}
                {!isLoading && filtered.length === 0 ? <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">Nessuna giacenza trovata.</td></tr> : null}
                {filtered.map((row) => (
                  <tr key={row.id} className="border-b border-border/10">
                    <td className="px-3 py-2 font-mono text-emerald-300">{row.cer}</td>
                    <td className="px-3 py-2">{row.descrizione_cer || "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{row.area_stoccaggio || "—"}</td>
                    <td className={`px-3 py-2 text-right font-mono font-semibold ${row.quantita_kg < 0 ? "text-destructive" : "text-foreground"}`}>{formatKg(row.quantita_kg)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}