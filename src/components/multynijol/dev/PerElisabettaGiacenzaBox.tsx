import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

const MULTY_TENANT_ID = "77ec9a3d-602e-438f-97bf-1c69abd8f691";
const IMPIANTO_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const CER = "170405";
const ITEM_ID = "0b0e7777-ea90-4aaf-8e39-31c974904ef9";
const CAUSA_RETTIFICA_NEGATIVA = "d8532de9-9a86-45b3-8e63-26a3ddcbd4b5";
/** Saldo al 31/12/2025 del registro cartaceo (StRegRag 2025) per il CER 170405. */
const SALDO_2025 = 87662;
const DECISION_KEY = "per_elisabetta_170405_decisione";

const fmt = (n: number) => n.toLocaleString("it-IT", { minimumFractionDigits: 0, maximumFractionDigits: 3 });

type Scelta = "lascia" | "negativo" | "pareggio";

export function PerElisabettaGiacenzaBox() {
  const qc = useQueryClient();
  const [scelta, setScelta] = useState<Scelta | null>(null);
  const [saving, setSaving] = useState(false);
  const [fatto, setFatto] = useState<string | null>(() => localStorage.getItem(DECISION_KEY));

  const { data, isLoading } = useQuery({
    queryKey: ["per-elisabetta-170405"],
    queryFn: async () => {
      const [stock, registro] = await Promise.all([
        supabase
          .from("dragon_stock_movements")
          .select("quantity, sign, item:dragon_items!inner(codice_cer)")
          .eq("company_id", MULTY_TENANT_ID)
          .like("item.codice_cer", `${CER}%`),
        supabase
          .from("registro_generale")
          .select("carico_scarico, quantita")
          .eq("tenant_id", MULTY_TENANT_ID)
          .eq("cer", CER),
      ]);
      if (stock.error) throw stock.error;
      if (registro.error) throw registro.error;

      const attuale = (stock.data ?? []).reduce(
        (acc: number, r: any) => acc + (r.sign === "PLUS" ? Number(r.quantity) : -Number(r.quantity)),
        0,
      );
      const netto2026 = (registro.data ?? []).reduce(
        (acc: number, r: any) =>
          acc + (String(r.carico_scarico).toLowerCase().startsWith("c") ? Number(r.quantita) : -Number(r.quantita)),
        0,
      );
      const teorico = SALDO_2025 + netto2026;
      return { attuale, netto2026, teorico, differenza: attuale - teorico };
    },
  });

  const applica = async () => {
    if (!scelta || !data) return;
    setSaving(true);
    try {
      if (scelta === "lascia") {
        localStorage.setItem(DECISION_KEY, "Lasciato tutto invariato");
        setFatto("Lasciato tutto invariato");
        toast.success("Nessuna modifica effettuata: i dati restano come sono.");
      } else if (scelta === "negativo") {
        const kg = Math.abs(data.differenza);
        const { error } = await supabase.from("dragon_stock_movements").insert({
          company_id: MULTY_TENANT_ID,
          item_id: ITEM_ID,
          cause_id: CAUSA_RETTIFICA_NEGATIVA,
          quantity: kg,
          sign: "MINUS",
          warehouse_scope: "WASTE",
          movement_date: new Date().toISOString().slice(0, 10),
          note: `Scelta Elisabetta: allineamento CER ${CER} al saldo reale del registro (differenza ${fmt(kg)} kg). Pareggio manuale successivo a cura ufficio.`,
        });
        if (error) throw error;
        await supabase.rpc("recalculate_magazzino_giacenza", {
          p_tenant_id: MULTY_TENANT_ID,
          p_impianto_id: IMPIANTO_ID,
          p_cer: CER,
        });
        localStorage.setItem(DECISION_KEY, `Portato al saldo reale (${fmt(data.teorico)} kg)`);
        setFatto(`Portato al saldo reale (${fmt(data.teorico)} kg)`);
        toast.success(`Rettifica registrata: ${fmt(kg)} kg scaricati. Ora la giacenza segue il registro.`);
      } else {
        const kg = Math.abs(data.differenza);
        const { error } = await supabase.from("registro_generale").insert({
          tenant_id: MULTY_TENANT_ID,
          registro: "MULTY_IMPIANTO",
          data_movimento: "2026-01-01",
          cer: CER,
          descrizione: "Ferro e acciaio",
          carico_scarico: "Carico",
          segno: "+",
          quantita: kg,
          annotazioni: `Scelta Elisabetta: carico di pareggio giacenza iniziale 2025 (CER ${CER}).`,
        });
        if (error) throw error;
        localStorage.setItem(DECISION_KEY, `Carico di pareggio registrato (${fmt(kg)} kg)`);
        setFatto(`Carico di pareggio registrato (${fmt(kg)} kg)`);
        toast.success(`Carico di pareggio di ${fmt(kg)} kg inserito nel registro: ora registro e giacenza coincidono.`);
      }
      qc.invalidateQueries({ queryKey: ["per-elisabetta-170405"] });
      qc.invalidateQueries({ queryKey: ["dragon-stock"] });
      qc.invalidateQueries({ queryKey: ["registro-generale"] });
    } catch (e: any) {
      toast.error("Non è stato possibile applicare la scelta: " + (e.message || e));
    } finally {
      setSaving(false);
    }
  };

  const opzioni: { id: Scelta; titolo: string; testo: string }[] = [
    {
      id: "lascia",
      titolo: "1) Lasciare le cose così",
      testo: "Nessuna modifica: la giacenza resta quella attuale e la differenza rimane come è oggi.",
    },
    {
      id: "negativo",
      titolo: "2) Portare la giacenza al saldo reale (può andare in negativo)",
      testo:
        "La giacenza viene allineata al risultato del registro. Poi si pareggia a mano con nuovi movimenti o nuove cernite.",
    },
    {
      id: "pareggio",
      titolo: "3) Caricare il movimento corrispondente (pareggio automatico)",
      testo:
        "Viene inserito nel registro il carico mancante: registro e giacenza tornano a coincidere subito, senza toccare la giacenza attuale.",
    },
  ];

  if (fatto) return null;

  return (
    <Card className="border-2 border-pink-500/50 bg-gradient-to-r from-pink-500/10 to-fuchsia-500/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-pink-300 flex items-center gap-2">
          <AlertTriangle size={18} /> Per Elisabetta — differenza sul ferro e acciaio (CER 170405)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {isLoading || !data ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 size={16} className="animate-spin" /> Calcolo in corso…
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-lg bg-card/60 p-3">
                <div className="text-xs text-muted-foreground">Saldo al 31/12/2025</div>
                <div className="font-bold">{fmt(SALDO_2025)} kg</div>
              </div>
              <div className="rounded-lg bg-card/60 p-3">
                <div className="text-xs text-muted-foreground">Movimenti 2026 (carichi − scarichi)</div>
                <div className="font-bold">{fmt(data.netto2026)} kg</div>
              </div>
              <div className="rounded-lg bg-card/60 p-3">
                <div className="text-xs text-muted-foreground">Risultato del registro</div>
                <div className="font-bold">{fmt(data.teorico)} kg</div>
              </div>
              <div className="rounded-lg bg-card/60 p-3">
                <div className="text-xs text-muted-foreground">Giacenza nel programma</div>
                <div className="font-bold text-emerald-400">{fmt(data.attuale)} kg</div>
              </div>
            </div>

            <p className="text-foreground">
              Differenza da decidere: <b className="text-amber-300">{fmt(Math.abs(data.differenza))} kg</b>. Scegli come
              procedere:
            </p>

            <div className="space-y-2">
              {opzioni.map((o) => (
                <label
                  key={o.id}
                  className={`flex gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                    scelta === o.id ? "border-pink-400 bg-pink-500/10" : "border-border/50 bg-card/40 hover:bg-card/60"
                  }`}
                >
                  <input
                    type="radio"
                    name="per-elisabetta-170405"
                    className="mt-1 h-4 w-4 accent-pink-500"
                    checked={scelta === o.id}
                    onChange={() => setScelta(o.id)}
                  />
                  <span>
                    <span className="block font-semibold">{o.titolo}</span>
                    <span className="block text-xs text-muted-foreground">{o.testo}</span>
                  </span>
                </label>
              ))}
            </div>

            {fatto && (
              <div className="flex items-center gap-2 text-emerald-300 text-xs">
                <CheckCircle2 size={14} /> Ultima scelta applicata: {fatto}
              </div>
            )}

            <Button
              onClick={applica}
              disabled={!scelta || saving}
              className="bg-pink-600 hover:bg-pink-700 gap-2"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Conferma la scelta
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
