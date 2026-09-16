import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { ShieldCheck, ShieldAlert, Loader2 } from "lucide-react";

interface Sintesi {
  numero_fir: string | null;
  produttore: string | null;
  trasportatore: string | null;
  destinatario: string | null;
  codice_eer: string | null;
  descrizione_rifiuto: string | null;
  quantita: number | null;
  unita_misura: string | null;
  stato_fisico: string | null;
  stato_formulario: string | null;
  data_emissione: string | null;
  data_inizio_trasporto: string | null;
  targa: string | null;
}

const STATO_LABEL: Record<string, string> = {
  bozza: "In preparazione / in viaggio",
  inviato: "Inviato su RENTRI",
  completato: "Chiuso a destino",
};

/**
 * Pagina pubblica di verifica del formulario: accessibile solo con il token
 * segreto stampato nel QR. Sola lettura, nessun dato sensibile.
 */
export default function FirVerificaPubblicaPage() {
  const { token } = useParams<{ token: string }>();
  const [sintesi, setSintesi] = useState<Sintesi | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "notfound">("loading");

  useEffect(() => {
    if (!token) {
      setState("notfound");
      return;
    }
    void (async () => {
      const { data, error } = await supabase.rpc("fir_pubblico_sintesi", { _token: token });
      if (error || !data || (Array.isArray(data) && data.length === 0)) {
        setState("notfound");
        return;
      }
      setSintesi(Array.isArray(data) ? (data[0] as Sintesi) : (data as unknown as Sintesi));
      setState("ok");
    })();
  }, [token]);

  return (
    <div className="min-h-screen bg-background flex items-start justify-center p-4">
      <div className="w-full max-w-md mt-10 rounded-2xl border border-border/50 bg-card/70 p-6 space-y-4">
        <div className="flex items-center gap-3">
          {state === "ok" ? (
            <ShieldCheck className="h-8 w-8 text-emerald-500" />
          ) : state === "notfound" ? (
            <ShieldAlert className="h-8 w-8 text-red-500" />
          ) : (
            <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
          )}
          <div>
            <h1 className="text-lg font-display tracking-wider">Verifica formulario</h1>
            <p className="text-xs text-muted-foreground">Controllo ufficiale · Multyproget / Niyol · RENTRI</p>
          </div>
        </div>

        {state === "loading" && <p className="text-sm text-muted-foreground">Verifica in corso…</p>}

        {state === "notfound" && (
          <p className="text-sm text-red-400">
            Codice non valido o formulario non più disponibile. Il QR può essere verificato solo dal formulario originale.
          </p>
        )}

        {state === "ok" && sintesi && (
          <div className="space-y-2 text-sm">
            <Row label="Numero FIR" value={sintesi.numero_fir || "—"} mono />
            <Row label="Stato" value={STATO_LABEL[sintesi.stato_formulario ?? ""] ?? sintesi.stato_formulario ?? "—"} />
            <Row label="Produttore" value={sintesi.produttore || "—"} />
            <Row label="Trasportatore" value={sintesi.trasportatore || "—"} />
            <Row label="Destinatario" value={sintesi.destinatario || "—"} />
            <Row label="Rifiuto (CER)" value={`${sintesi.codice_eer || "—"} — ${sintesi.descrizione_rifiuto || ""}`} />
            <Row
              label="Quantità dichiarata"
              value={sintesi.quantita != null ? `${sintesi.quantita} ${sintesi.unita_misura || "kg"}` : "—"}
            />
            <Row label="Stato fisico" value={sintesi.stato_fisico || "—"} />
            <Row label="Inizio trasporto" value={sintesi.data_inizio_trasporto || "—"} />
            <Row label="Targa" value={sintesi.targa || "—"} />
            <p className="pt-2 text-[11px] text-muted-foreground">
              Documento di trasporto di rifiuti (FIR). Per contestazioni confrontare i dati con il formulario cartaceo
              firmato dal trasportatore.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/30 pb-1.5">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className={`text-right ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}
