import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { CheckCircle2, Clock, XCircle, Send, FileText, Search, Loader2 } from "lucide-react";

interface Props { tenantId?: string }

const eur = (v: number | null | undefined) =>
  v == null ? "—" : new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(v);

const dataIt = (d: string | null | undefined) => {
  if (!d) return "—";
  const [y, m, g] = d.slice(0, 10).split("-");
  return y && m && g ? `${g}/${m}/${y}` : d;
};

type Esito = {
  label: string;
  tone: "ok" | "wait" | "err" | "idle";
  icon: typeof CheckCircle2;
  detail?: string;
};

const TONE: Record<Esito["tone"], string> = {
  ok: "bg-emerald-600/20 text-emerald-200 border-emerald-500/40",
  wait: "bg-amber-500/15 text-amber-200 border-amber-500/40",
  err: "bg-red-500/15 text-red-200 border-red-500/40",
  idle: "bg-muted/30 text-muted-foreground border-border/40",
};

/** Fatture emesse dal gestionale (comprese quelle di cortesia) con l'esito reale lato Sibill/SdI. */
export function FattureEmesseEsitoPanel({ tenantId }: Props) {
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["fatture-esito-sibill", tenantId],
    refetchInterval: 120000,
    queryFn: async () => {
      let q = supabase.from("fatture" as any).select("*")
        .order("anno", { ascending: false }).order("numero", { ascending: false }).limit(500);
      if (tenantId) q = q.eq("tenant_id", tenantId);
      const { data: fatture } = await q;
      const list = (fatture || []) as any[];
      const ids = list.map((f) => f.id);

      const { data: sync } = ids.length
        ? await supabase.from("fatture_sibill_sync" as any).select("*").in("fattura_id", ids)
        : { data: [] as any[] };
      const syncMap = new Map(((sync || []) as any[]).map((s) => [s.fattura_id, s]));

      const docIds = ((sync || []) as any[]).map((s) => s.sibill_document_id).filter(Boolean);
      const numeri = list.map((f) => f.numero_completo).filter(Boolean);
      const { data: docs } = (docIds.length || numeri.length)
        ? await supabase.from("sibill_documents_cache" as any).select("*")
            .or([
              docIds.length ? `doc_id.in.(${docIds.join(",")})` : null,
              numeri.length ? `number.in.(${numeri.map((n: string) => `"${n}"`).join(",")})` : null,
            ].filter(Boolean).join(","))
        : { data: [] as any[] };
      const byDocId = new Map(((docs || []) as any[]).map((d) => [d.doc_id, d]));
      const byNumber = new Map(((docs || []) as any[]).map((d) => [d.number, d]));

      return list.map((f) => {
        const s = syncMap.get(f.id);
        const doc = (s?.sibill_document_id && byDocId.get(s.sibill_document_id)) || byNumber.get(f.numero_completo) || null;
        return { f, s, doc };
      });
    },
  });

  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    const all = data || [];
    if (!s) return all;
    return all.filter((r: any) =>
      String(r.f.numero_completo || "").toLowerCase().includes(s) ||
      String(r.f.cliente_ragione_sociale || "").toLowerCase().includes(s));
  }, [data, search]);

  const esito = (r: any): Esito => {
    const { f, s, doc } = r;
    const stato = String(doc?.status || "").toUpperCase();
    const delivery = String(doc?.delivery_status || "").toUpperCase();
    const mock = !!s?.sibill_document_id?.includes("_mock_");

    if (doc?.delivery_date || stato === "DELIVERED" || delivery === "DELIVERED") {
      return { label: "Consegnata al cassetto fiscale", tone: "ok", icon: CheckCircle2, detail: dataIt(doc?.delivery_date) };
    }
    if (["REJECTED", "DISCARDED", "ERROR", "FAILED"].includes(stato) || delivery === "FAILED" || s?.sync_status === "errore") {
      return { label: "Scartata / errore SdI", tone: "err", icon: XCircle, detail: s?.error_title || stato || delivery };
    }
    if (mock) return { label: "Simulazione (MOCK)", tone: "idle", icon: FileText };
    if (s?.sibill_document_id || doc) return { label: "Trasmessa — in attesa esito", tone: "wait", icon: Clock, detail: stato || delivery || undefined };
    if (f.stato === "cortesia") return { label: "Cortesia — non trasmessa", tone: "idle", icon: FileText };
    return { label: "Non trasmessa a Sibill", tone: "idle", icon: Send };
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl">
        <h3 className="text-sm font-semibold">Fatture emesse dal gestionale (incl. cortesia)</h3>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca numero o cliente…"
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-background/60 border border-border/30 text-sm" />
        </div>
        <span className="text-xs text-muted-foreground">{rows.length} fatture</span>
      </div>

      <div className="rounded-2xl border border-border/30 bg-card/60 backdrop-blur-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-background/60 text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="p-3 text-left">Numero</th>
                <th className="p-3 text-left">Cliente</th>
                <th className="p-3 text-left">Data</th>
                <th className="p-3 text-right">Imponibile</th>
                <th className="p-3 text-right">Totale</th>
                <th className="p-3 text-left">Tipo</th>
                <th className="p-3 text-left">Esito Sibill / SdI</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin inline mr-2" /> Caricamento fatture…
                </td></tr>
              )}
              {!isLoading && rows.length === 0 && (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Nessuna fattura emessa dal gestionale.</td></tr>
              )}
              {rows.map((r: any) => {
                const e = esito(r);
                const Icon = e.icon;
                return (
                  <tr key={r.f.id} className="border-t border-border/20 hover:bg-background/40">
                    <td className="p-3 font-medium">{r.f.numero_completo || `${r.f.numero}/${r.f.anno}`}</td>
                    <td className="p-3">{r.f.cliente_ragione_sociale || "—"}</td>
                    <td className="p-3">{dataIt(r.f.data_emissione || r.f.created_at)}</td>
                    <td className="p-3 text-right">{eur(Number(r.f.imponibile ?? 0))}</td>
                    <td className="p-3 text-right font-semibold">{eur(Number(r.f.totale ?? 0))}</td>
                    <td className="p-3">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs border ${
                        r.f.stato === "cortesia"
                          ? "bg-amber-500/15 text-amber-200 border-amber-500/40"
                          : r.f.stato === "annullata"
                          ? "bg-red-500/15 text-red-200 border-red-500/40"
                          : "bg-blue-600/20 text-blue-200 border-blue-500/40"}`}>
                        {r.f.stato === "cortesia" ? "Cortesia" : r.f.stato === "annullata" ? "Annullata" : "Elettronica"}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border ${TONE[e.tone]}`}
                        title={e.detail || ""}>
                        <Icon className="h-3.5 w-3.5" />
                        {e.label}
                      </span>
                      {e.detail && <div className="text-[11px] text-muted-foreground mt-1">{e.detail}</div>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
