import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { saldiAlGiorno } from "@/lib/giacenzeCascata";
import { fetchMovimentiSuccessivi, saldiBase21Settembre } from "./GiacenzeDocumentaliModule";

const oggi = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date());

/** Sola lettura: segnala i CER con saldo ufficiale negativo. Non corregge nulla. */
export function AllarmeGiacenzeNegative() {
  const { data: movimenti } = useQuery({
    queryKey: ["giacenze-movimenti-live"],
    queryFn: fetchMovimentiSuccessivi,
    refetchInterval: 60_000,
  });
  if (!movimenti) return null;
  const saldi = saldiAlGiorno(saldiBase21Settembre(), movimenti, oggi());
  const negativi = [...saldi.entries()].filter(([, v]) => v < -0.0005).sort((a, b) => a[1] - b[1]);
  if (!negativi.length) return null;
  return (
    <div role="alert" className="mb-4 animate-pulse rounded-xl border-8 border-destructive bg-destructive p-6 text-destructive-foreground shadow-2xl">
      <div className="flex items-center gap-4">
        <AlertTriangle className="h-20 w-20 shrink-0" />
        <div>
          <p className="text-4xl font-black uppercase leading-tight md:text-5xl">⚠ Giacenze in negativo!</p>
          <p className="mt-2 text-xl font-bold">
            {negativi.length} CER sotto zero. Confermate subito i formulari arrivati (Vista veloce → ✓ → «Conferma registro e giacenze»).
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {negativi.map(([cer, v]) => (
          <span key={cer} className="rounded-md bg-background px-3 py-1 text-lg font-black text-destructive">
            {cer}: {v.toLocaleString("it-IT", { maximumFractionDigits: 2 })} kg
          </span>
        ))}
      </div>
    </div>
  );
}
