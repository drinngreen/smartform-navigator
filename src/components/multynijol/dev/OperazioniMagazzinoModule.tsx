import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, PackagePlus, PackageMinus, Scale, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabaseClient";
import { fetchMovimentiSuccessivi, saldiBase21Settembre } from "./GiacenzeDocumentaliModule";
import { GIACENZE_FINAL_DATE, saldiAlGiorno, verificaNuoviMovimenti } from "@/lib/giacenzeCascata";

const TENANT = "77ec9a3d-602e-438f-97bf-1c69abd8f691";
const REGISTRO = "MULTY_IMPIANTO";
type Tipo = "carico" | "scarico" | "rettifica+" | "rettifica-";
const TIPI: Record<Tipo, { label: string; segno: "+" | "-"; op: string }> = {
  carico: { label: "Carico di lavorazione", segno: "+", op: "Carico di Lavorazione" },
  scarico: { label: "Scarico di lavorazione", segno: "-", op: "Scarico di Lavorazione" },
  "rettifica+": { label: "Rettifica inventariale +", segno: "+", op: "Rettifica inventariale +" },
  "rettifica-": { label: "Rettifica inventariale −", segno: "-", op: "Rettifica inventariale −" },
};
const OPS = Object.values(TIPI).map((t) => t.op);
const today = () => new Date().toISOString().slice(0, 10);
const fmt = (n: number) => n.toLocaleString("it-IT", { maximumFractionDigits: 3 });
const itD = (d: string) => d.split("-").reverse().join("/");

export function OperazioniMagazzinoModule() {
  const qc = useQueryClient();
  const [tipo, setTipo] = useState<Tipo>("carico");
  const [data, setData] = useState(today());
  const [cer, setCer] = useState("");
  const [kg, setKg] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const base = useMemo(saldiBase21Settembre, []);
  const { data: movimenti = [], isLoading } = useQuery({ queryKey: ["giacenze-movimenti-live"], queryFn: fetchMovimentiSuccessivi });
  const { data: elenco = [], refetch } = useQuery({
    queryKey: ["operazioni-magazzino"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("registro_generale")
        .select("id,data_movimento,cer,quantita,segno,tipo_operazione,annotazioni,created_at")
        .eq("tenant_id", TENANT).eq("registro", REGISTRO).eq("incide_giacenze", true)
        .in("tipo_operazione", OPS).order("data_movimento", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const cerN = cer.replace(/\D/g, "");
  const q = Number(kg.replace(",", "."));
  const t = TIPI[tipo];
  const nuovo = { data, cer: cerN, carico: t.segno === "+" ? q : 0, scarico: t.segno === "-" ? q : 0 };
  const prima = cerN ? saldiAlGiorno(base, movimenti, data).get(cerN) ?? 0 : 0;
  const primaOggi = cerN ? saldiAlGiorno(base, movimenti, today()).get(cerN) ?? 0 : 0;
  const delta = t.segno === "+" ? q || 0 : -(q || 0);
  const motivoObbl = tipo.startsWith("rettifica");

  const salva = async (righe: { data: string; cer: string; kg: number; segno: "+" | "-"; op: string; note: string }[], msg: string) => {
    const nuovi = righe.map((r) => ({ data: r.data, cer: r.cer, carico: r.segno === "+" ? r.kg : 0, scarico: r.segno === "-" ? r.kg : 0 }));
    const fresh = await fetchMovimentiSuccessivi();
    const v = verificaNuoviMovimenti(base, fresh, nuovi);
    if (v.ok === false) return toast.error(v.errore);
    if (!window.confirm(msg)) return;
    setBusy(true);
    const { error } = await (supabase as any).from("registro_generale").insert(righe.map((r) => ({
      tenant_id: TENANT, registro: REGISTRO, data_movimento: r.data, cer: r.cer, quantita: r.kg,
      segno: r.segno, carico_scarico: r.segno === "+" ? "Carico" : "Scarico", tipo_operazione: r.op,
      stato_movimento: "effettivo", incide_giacenze: true, created_by_agent: false, annotazioni: r.note,
    })));
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Operazione registrata");
    setKg(""); setNote("");
    qc.invalidateQueries({ queryKey: ["giacenze-movimenti-live"] });
    refetch();
  };

  const conferma = () => {
    if (data <= GIACENZE_FINAL_DATE) return toast.error("Le giacenze fino al 21/09/2026 sono immutabili");
    if (!/^\d{6}$/.test(cerN)) return toast.error("CER non valido (6 cifre)");
    if (!(q > 0)) return toast.error("Kg non validi");
    if (motivoObbl && !note.trim()) return toast.error("Per la rettifica il motivo è obbligatorio");
    salva([{ data, cer: cerN, kg: q, segno: t.segno, op: t.op, note: note.trim() || t.label }],
      `${t.label} del ${itD(data)}\nCER ${cerN}: ${fmt(q)} kg\nSaldo al ${itD(data)}: ${fmt(prima)} → ${fmt(prima + delta)} kg\nConfermi?`);
  };

  const annulla = (r: any) => {
    const segno = r.segno === "+" ? "-" : "+";
    salva([{ data: r.data_movimento, cer: r.cer, kg: Number(r.quantita), segno, op: segno === "+" ? TIPI["rettifica+"].op : TIPI["rettifica-"].op, note: `Annullo operazione ${r.id}` }],
      `Annullo "${r.tipo_operazione}" del ${itD(r.data_movimento)} (CER ${r.cer}, ${fmt(Number(r.quantita))} kg) con un movimento inverso. Confermi?`);
  };
  const annullati = new Set(elenco.map((r: any) => String(r.annotazioni ?? "").match(/^Annullo operazione (.+)$/)?.[1]).filter(Boolean));

  return (
    <div className="space-y-4">
      <Card className="border-border/40 bg-card/60">
        <CardHeader><CardTitle className="text-base">Operazioni straordinarie di magazzino (senza formulario)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">Valgono dal giorno scelto in poi. Date fino al 21/09/2026 rifiutate. Nessuna operazione può portare un CER sotto zero, nemmeno nei giorni successivi.</p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(TIPI) as Tipo[]).map((k) => (
              <Button key={k} size="sm" variant={tipo === k ? "default" : "outline"} onClick={() => setTipo(k)} className="gap-1">
                {k === "carico" ? <PackagePlus className="h-4 w-4" /> : k === "scarico" ? <PackageMinus className="h-4 w-4" /> : <Scale className="h-4 w-4" />}{TIPI[k].label}
              </Button>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div><Label className="text-xs">Data</Label><Input type="date" min="2026-09-22" max={today()} value={data} onChange={(e) => setData(e.target.value)} /></div>
            <div><Label className="text-xs">CER</Label><Input value={cer} onChange={(e) => setCer(e.target.value)} placeholder="170405" /></div>
            <div><Label className="text-xs">Kg</Label><Input value={kg} onChange={(e) => setKg(e.target.value)} inputMode="decimal" /></div>
            <div><Label className="text-xs">{motivoObbl ? "Motivo (obbligatorio)" : "Note"}</Label><Input value={note} onChange={(e) => setNote(e.target.value)} /></div>
          </div>
          {cerN.length === 6 && (
            <div className="rounded-lg border border-border/40 p-3 text-sm">
              Saldo CER {cerN} al {itD(data)}: <b>{fmt(prima)}</b> → <b>{fmt(prima + delta)}</b> kg · oggi: <b>{fmt(primaOggi)}</b> → <b>{fmt(primaOggi + delta)}</b> kg
            </div>
          )}
          <Button onClick={conferma} disabled={busy || isLoading}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Registra operazione</Button>
        </CardContent>
      </Card>

      <Card className="border-border/40 bg-card/60">
        <CardHeader><CardTitle className="text-base">Operazioni registrate ({elenco.length})</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-muted-foreground"><tr>{["Data", "Operazione", "CER", "Kg", "Note", ""].map((h) => <th key={h} className="px-2 py-1 text-left">{h}</th>)}</tr></thead>
            <tbody>
              {elenco.map((r: any) => (
                <tr key={r.id} className="border-t border-border/20">
                  <td className="px-2 py-1">{itD(String(r.data_movimento).slice(0, 10))}</td>
                  <td className="px-2 py-1">{r.tipo_operazione}</td>
                  <td className="px-2 py-1 font-mono">{r.cer}</td>
                  <td className="px-2 py-1 text-right">{r.segno}{fmt(Number(r.quantita))}</td>
                  <td className="px-2 py-1">{r.annotazioni}</td>
                  <td className="px-2 py-1">
                    {annullati.has(r.id) ? <span className="text-muted-foreground">Annullata</span>
                      : !String(r.annotazioni ?? "").startsWith("Annullo") && (
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => annulla(r)} className="gap-1"><Undo2 className="h-3 w-3" />Annulla</Button>
                      )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
