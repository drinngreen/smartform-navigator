import { useEffect, useState } from "react";
import { CheckCircle2, Circle, Clock, XCircle, Loader2 } from "lucide-react";
import { caricaRaccontoFir, type RaccontoFir, type StatoPasso } from "@/lib/firStatoRacconto";

function Icona({ stato }: { stato: StatoPasso }) {
  if (stato === "fatto") return <CheckCircle2 size={16} className="text-primary shrink-0" />;
  if (stato === "errore") return <XCircle size={16} className="text-destructive shrink-0" />;
  if (stato === "in_corso") return <Clock size={16} className="text-amber-400 shrink-0" />;
  return <Circle size={16} className="text-muted-foreground shrink-0" />;
}

export function FirStatoRiepilogo({ numeroFir }: { numeroFir: string }) {
  const [racconto, setRacconto] = useState<RaccontoFir | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let attivo = true;
    setLoading(true);
    void caricaRaccontoFir(numeroFir).then((r) => {
      if (!attivo) return;
      setRacconto(r);
      setLoading(false);
    });
    return () => { attivo = false; };
  }, [numeroFir]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="fir-stato-loading">
        <Loader2 size={14} className="animate-spin" /> Ricostruisco la storia del formulario…
      </div>
    );
  }
  if (!racconto) return null;

  return (
    <div className="rounded-xl border border-border/40 bg-secondary/20 p-4 space-y-3" data-testid="fir-stato-riepilogo">
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Cosa è successo a questo formulario</p>
        <h4 className="text-base font-semibold">
          {racconto.numeroFir} — {racconto.titolo}
        </h4>
        <p className="mt-1 text-sm text-muted-foreground">{racconto.sintesi}</p>
      </div>

      <ol className="space-y-2">
        {racconto.passi.map((passo) => (
          <li key={passo.titolo} className="flex items-start gap-2 text-sm" data-testid="fir-stato-passo">
            <Icona stato={passo.stato} />
            <div>
              <p className="font-medium">{passo.titolo}</p>
              <p className="text-muted-foreground">{passo.dettaglio}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2">
        <p className="text-xs font-semibold text-primary">Cosa devi fare ora</p>
        <p className="text-sm">{racconto.cosaFareOra}</p>
      </div>
    </div>
  );
}

export default FirStatoRiepilogo;
