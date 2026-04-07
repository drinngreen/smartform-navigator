import { useState } from "react";
import { ricercaFir, firmaRicezione, type RentriCliente } from "@/lib/rentriVpsApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, PenTool, CheckCircle, XCircle, Loader2, FileText, Clock } from "lucide-react";
import { toast } from "sonner";

interface FirSearchResult {
  raw: Record<string, any>;
  numero_fir: string;
  produttore: string;
  trasportatore: string;
  destinatario: string;
  cer: string;
  quantita: string;
  stato: string;
}

interface TimelineEvent {
  time: string;
  label: string;
  success: boolean;
}

export function DevFirmaDigitaleModule() {
  const [searchNum, setSearchNum] = useState("");
  const [searching, setSearching] = useState(false);
  const [firData, setFirData] = useState<FirSearchResult | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Reception form
  const [kgPesata, setKgPesata] = useState("");
  const [dataArrivo, setDataArrivo] = useState(new Date().toISOString().slice(0, 10));
  const [oraArrivo, setOraArrivo] = useState(new Date().toISOString().slice(11, 16));
  const [esito, setEsito] = useState<"accettato" | "parziale" | "respinto">("accettato");
  const [motivazione, setMotivazione] = useState("");
  const [signing, setSigning] = useState(false);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);

  const addEvent = (label: string, success: boolean) => {
    setTimeline(prev => [{ time: new Date().toLocaleTimeString("it-IT"), label, success }, ...prev]);
  };

  const handleSearch = async () => {
    if (!searchNum.trim()) return;
    setSearching(true);
    setFirData(null);
    setSearchError(null);
    try {
      const res = await ricercaFir("multy" as RentriCliente, searchNum.trim());
      if (!res.success) throw new Error(res.error || "FIR non trovato");
      const d = (res.data as any) || {};
      const fir = d.fir || d.formulario || d;
      setFirData({
        raw: fir,
        numero_fir: fir.numero_fir || fir.numeroFir || searchNum,
        produttore: fir.produttore?.denominazione || fir.dati_partenza?.produttore?.denominazione || "—",
        trasportatore: fir.trasportatore?.denominazione || fir.dati_partenza?.trasportatori?.[0]?.denominazione || "—",
        destinatario: fir.destinatario?.denominazione || fir.dati_partenza?.destinatario?.denominazione || "—",
        cer: fir.rifiuto?.codice_eer || fir.dati_partenza?.rifiuto?.codice_eer || "—",
        quantita: String(fir.rifiuto?.quantita?.valore || fir.dati_partenza?.rifiuto?.quantita?.valore || "—"),
        stato: fir.stato || fir.stato_fir || "—",
      });
      addEvent(`Ricerca FIR ${searchNum} completata`, true);
    } catch (err: any) {
      setSearchError(err.message);
      addEvent(`Ricerca FIR ${searchNum} fallita: ${err.message}`, false);
    } finally {
      setSearching(false);
    }
  };

  const handleFirmaRicezione = async () => {
    if (!firData || !kgPesata) { toast.error("Compila i campi obbligatori"); return; }
    setSigning(true);
    try {
      const payload = {
        dati_arrivo: {
          numero_fir: firData.numero_fir,
          data_ora_arrivo: `${dataArrivo}T${oraArrivo}:00`,
          accettazione: {
            accettato: esito !== "respinto",
            parziale: esito === "parziale",
            quantita_ricevuta: { valore: parseFloat(kgPesata), unita_misura: "kg" },
            motivazione: motivazione || undefined,
          },
        },
      };
      const res = await firmaRicezione("multy" as RentriCliente, payload);
      if (!res.success) throw new Error(res.error || "Errore firma ricezione");
      addEvent(`Firma ricezione ${firData.numero_fir} completata`, true);
      toast.success("✅ Firma ricezione completata!");
    } catch (err: any) {
      addEvent(`Firma ricezione fallita: ${err.message}`, false);
      toast.error("Errore: " + err.message);
    } finally {
      setSigning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search */}
      <Card className="bg-card/60 border-border/30">
        <CardHeader>
          <CardTitle className="text-emerald-400 flex items-center gap-2"><Search className="h-5 w-5" /> Ricerca FIR su RENTRI</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Input value={searchNum} onChange={e => setSearchNum(e.target.value)} placeholder="Numero FIR (es. ZRZXR 000001 TO)" className="font-mono flex-1 bg-background/80 border-border/30" onKeyDown={e => e.key === "Enter" && handleSearch()} />
            <Button onClick={handleSearch} disabled={searching || !searchNum.trim()} className="gap-2 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30">
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Cerca
            </Button>
          </div>
          {searchError && (
            <div className="flex items-center gap-2 text-destructive text-sm"><XCircle className="h-4 w-4" /> {searchError}</div>
          )}
        </CardContent>
      </Card>

      {/* FIR Data */}
      {firData && (
        <Card className="bg-card/60 border-emerald-500/30">
          <CardHeader>
            <CardTitle className="text-emerald-400 flex items-center gap-2"><FileText className="h-5 w-5" /> FIR: {firData.numero_fir}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div><span className="text-muted-foreground">Produttore:</span><p className="font-semibold text-foreground">{firData.produttore}</p></div>
              <div><span className="text-muted-foreground">Trasportatore:</span><p className="font-semibold text-foreground">{firData.trasportatore}</p></div>
              <div><span className="text-muted-foreground">Destinatario:</span><p className="font-semibold text-foreground">{firData.destinatario}</p></div>
              <div><span className="text-muted-foreground">CER:</span><p className="font-mono font-semibold text-amber-300">{firData.cer}</p></div>
              <div><span className="text-muted-foreground">Quantità:</span><p className="font-semibold text-foreground">{firData.quantita} kg</p></div>
              <div><span className="text-muted-foreground">Stato:</span><p className="font-semibold text-foreground">{firData.stato}</p></div>
            </div>

            {/* Reception Form */}
            <div className="border-t border-border/30 pt-4 space-y-4">
              <h4 className="text-sm font-display uppercase tracking-wider text-emerald-400 flex items-center gap-2"><PenTool className="h-4 w-4" /> Firma Ricezione</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Kg Pesata *</Label>
                  <Input type="number" value={kgPesata} onChange={e => setKgPesata(e.target.value)} placeholder="0" className="bg-background/80 border-border/30 font-mono" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Data Arrivo</Label>
                  <Input type="date" value={dataArrivo} onChange={e => setDataArrivo(e.target.value)} className="bg-background/80 border-border/30" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Ora Arrivo</Label>
                  <Input type="time" value={oraArrivo} onChange={e => setOraArrivo(e.target.value)} className="bg-background/80 border-border/30" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Esito</Label>
                  <Select value={esito} onValueChange={(v: any) => setEsito(v)}>
                    <SelectTrigger className="bg-background/80 border-border/30"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="accettato">✅ Accettato</SelectItem>
                      <SelectItem value="parziale">⚠️ Parziale</SelectItem>
                      <SelectItem value="respinto">❌ Respinto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {esito !== "accettato" && (
                <div>
                  <Label className="text-xs text-muted-foreground">Motivazione</Label>
                  <Textarea value={motivazione} onChange={e => setMotivazione(e.target.value)} placeholder="Motivo accettazione parziale/rifiuto..." className="bg-background/80 border-border/30" rows={2} />
                </div>
              )}
              <Button onClick={handleFirmaRicezione} disabled={signing || !kgPesata} className="gap-2 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30">
                {signing ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenTool className="h-4 w-4" />} FIRMA RICEZIONE
              </Button>
            </div>

            {/* Raw data */}
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground font-mono">Dati grezzi RENTRI</summary>
              <pre className="mt-2 p-3 bg-background/80 rounded-lg overflow-x-auto text-muted-foreground font-mono text-[10px] max-h-60 overflow-y-auto">{JSON.stringify(firData.raw, null, 2)}</pre>
            </details>
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      {timeline.length > 0 && (
        <Card className="bg-card/60 border-border/30">
          <CardHeader>
            <CardTitle className="text-muted-foreground flex items-center gap-2 text-sm"><Clock className="h-4 w-4" /> Timeline Eventi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {timeline.map((ev, i) => (
                <div key={i} className="flex items-center gap-3 text-xs">
                  {ev.success ? <CheckCircle className="h-3.5 w-3.5 text-emerald-400 shrink-0" /> : <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />}
                  <span className="font-mono text-muted-foreground">{ev.time}</span>
                  <span className="text-foreground">{ev.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
