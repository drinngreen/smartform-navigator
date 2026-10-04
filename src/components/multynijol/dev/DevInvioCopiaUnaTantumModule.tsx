import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Send, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Esito = { tabella: string; totale: number | null; inviate: number; copiate: number; errori: number; dettaglio?: string };

const SB_URL = import.meta.env.VITE_SUPABASE_URL || "https://zungtspcixpxjpjlcwzy.supabase.co";
const SB_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
const pausa = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function token(): Promise<string> {
  const r = await Promise.race([supabase.auth.getSession().then((s) => s.data.session?.access_token || ""), pausa(4000).then(() => "")]);
  if (r) return r;
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i) || "";
    if (k.startsWith("sb-") && k.endsWith("-auth-token")) {
      const t = JSON.parse(localStorage.getItem(k) || "{}")?.access_token;
      if (t) return t;
    }
  }
  throw new Error("Sessione non trovata: esci e rientra nell'app");
}

async function call(body: Record<string, unknown>, onWait: (s: string) => void) {
  for (let t = 0; ; t++) {
    let msg = "";
    try {
      const res = await fetch(`${SB_URL}/functions/v1/sync-push-once`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${await token()}`, apikey: SB_KEY },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(90000),
      });
      const txt = await res.text();
      let d: any = null; try { d = JSON.parse(txt); } catch { /* */ }
      if (res.ok && !d?.error) return d;
      msg = String(d?.error || `${res.status} ${txt}`).slice(0, 300);
    } catch (e) { msg = `TEMPORANEO: ${(e as Error).message}`; }
    if (!/TEMPORANEO|50\d|52\d|546/.test(msg) || t >= 5) throw new Error(msg);
    const att = Math.min(60000, 5000 * 2 ** t);
    onWait(`Server occupato, riprovo tra ${att / 1000} secondi…`);
    await pausa(att);
  }
}

export function DevInvioCopiaUnaTantumModule() {
  const [busy, setBusy] = useState(false);
  const [stato, setStato] = useState("");
  const [esiti, setEsiti] = useState<Esito[]>([]);

  const avvia = async () => {
    if (!window.confirm("Inviare UNA VOLTA SOLA una copia di tutti i dati al progetto di destinazione?\nQui nessun dato viene modificato e non resta attivo nessun invio automatico.")) return;
    setBusy(true); setEsiti([]); setStato("Lettura elenco tabelle…");
    const out: Esito[] = [];
    try {
      const { tables } = await call({ action: "list" }, setStato);
      for (let i = 0; i < tables.length; i++) {
        const t = tables[i] as string;
        const e: Esito = { tabella: t, totale: null, inviate: 0, copiate: 0, errori: 0 };
        try {
          let from = 0;
          for (;;) {
            setStato(`Tabella ${i + 1} di ${tables.length}: ${t} · ${e.inviate} righe inviate`);
            const r = await call({ action: "push", table: t, from, size: 100 }, (s) => setStato(`${t}: ${s}`));
            if (r.total != null) e.totale = r.total;
            e.inviate += r.sent; e.copiate += r.applied; e.errori += r.failedCount || 0;
            if (r.failed?.length && !e.dettaglio) e.dettaglio = String(r.failed[0].error || "").slice(0, 160);
            if (r.done || r.sent === 0) break;
            from += r.sent;
          }
        } catch (err) { e.dettaglio = (err as Error).message; e.errori = e.errori || -1; }
        out.push(e); setEsiti([...out]);
      }
      const ko = out.filter((e) => e.errori !== 0 || (e.totale != null && e.copiate !== e.totale));
      ko.length ? toast.warning(`Invio terminato: ${ko.length} tabelle da controllare`) : toast.success("Invio terminato: tutte le righe copiate");
      setStato(`Completato · ${out.reduce((s, e) => s + e.copiate, 0).toLocaleString("it-IT")} righe copiate · nessun invio automatico attivo`);
    } catch (err) { toast.error((err as Error).message); setStato(""); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/30 bg-card/60 p-4 flex flex-wrap items-center gap-3">
        <Send className="h-6 w-6 text-primary" />
        <div className="flex-1 min-w-[220px]">
          <h2 className="text-lg font-semibold">Invio copia una tantum al progetto di destinazione</h2>
          <p className="text-xs text-muted-foreground">Parte solo quando premi il pulsante. Nessun automatismo, nessun invio programmato. Qui i dati vengono solo letti.</p>
        </div>
        <button onClick={avvia} disabled={busy} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm disabled:opacity-40">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Invia copia adesso
        </button>
      </div>
      {stato && <p className="text-sm text-muted-foreground">{stato}</p>}
      {esiti.length > 0 && (
        <div className="rounded-2xl border border-border/30 bg-card/60 max-h-[420px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-background/80"><tr className="text-xs text-muted-foreground uppercase">
              <th className="text-left p-2">Tabella</th><th className="text-right p-2">Righe qui</th><th className="text-right p-2">Copiate di là</th><th className="text-left p-2">Esito</th></tr></thead>
            <tbody>{esiti.map((e) => {
              const ok = e.errori === 0 && (e.totale == null ? e.copiate === e.inviate : e.copiate === e.totale);
              return (
                <tr key={e.tabella} className="border-t border-border/10">
                  <td className="p-2 font-mono">{e.tabella}</td>
                  <td className="p-2 text-right">{(e.totale ?? e.inviate).toLocaleString("it-IT")}</td>
                  <td className="p-2 text-right">{e.copiate.toLocaleString("it-IT")}</td>
                  <td className={`p-2 ${ok ? "text-muted-foreground" : "text-destructive"}`}>{ok ? "OK" : e.dettaglio || `${e.errori} righe non copiate`}</td>
                </tr>);
            })}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
