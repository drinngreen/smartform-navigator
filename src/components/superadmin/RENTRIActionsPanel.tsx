import { useState } from "react";
import { Loader2, Send, Download, Truck, Factory, Zap, FileText, CheckCircle2, XCircle, List, Search } from "lucide-react";
import {
  listaBlocchi,
  richiestaVidimazione,
  emissioneFir,
  firmaRicezione,
  scaricaPdfLotto,
  statoTransazioneFir,
  statoTransazioneRegistro,
  type RentriCliente,
} from "@/lib/rentriVpsApi";
import { getBlocksForTenant, getPrimaryBlock } from "@/lib/rentriBlockCodes";

interface Props {
  tenant: string; // "global" | "multy" | "niyol"
}

const COMPANY_MAP: Record<string, string> = {
  global: "GLOBAL",
  multy: "MULTY",
  niyol: "NIYOL",
};

function ResultBanner({ result }: { result: { ok: boolean; data: any } | null }) {
  if (!result) return null;
  return (
    <div className={`mt-3 rounded-lg p-3 text-xs font-mono whitespace-pre-wrap max-h-48 overflow-auto border ${result.ok ? "bg-green-500/10 border-green-500/30 text-green-300" : "bg-red-500/10 border-red-500/30 text-red-300"}`}>
      <div className="flex items-center gap-1 mb-1 font-semibold">
        {result.ok ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
        {result.ok ? "Successo" : "Errore"}
      </div>
      {JSON.stringify(result.data, null, 2)}
    </div>
  );
}

export function RENTRIActionsPanel({ tenant }: Props) {
  const company = COMPANY_MAP[tenant] || "GLOBAL";
  const cliente = (tenant.toLowerCase()) as RentriCliente;
  const blocks = getBlocksForTenant(tenant);
  const primary = getPrimaryBlock(tenant);

  /* ── Lista Blocchi ── */
  const [lbLoading, setLbLoading] = useState(false);
  const [lbResult, setLbResult] = useState<any>(null);

  /* ── Vidimazione ── */
  const [vidQty, setVidQty] = useState(5);
  const [vidBlock, setVidBlock] = useState(primary?.code ?? "");
  const [vidLoading, setVidLoading] = useState(false);
  const [vidResult, setVidResult] = useState<any>(null);

  /* ── Emissione ── */
  const [emPayload, setEmPayload] = useState("{}");
  const [emLoading, setEmLoading] = useState(false);
  const [emResult, setEmResult] = useState<any>(null);

  /* ── Firma Ricezione ── */
  const [frPayload, setFrPayload] = useState("{}");
  const [frLoading, setFrLoading] = useState(false);
  const [frResult, setFrResult] = useState<any>(null);

  /* ── Scarica PDF ── */
  const [pdfBlock, setPdfBlock] = useState(primary?.code ?? "");
  const [pdfProg, setPdfProg] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfResult, setPdfResult] = useState<any>(null);

  /* ── Transazione ── */
  const [txnId, setTxnId] = useState("");
  const [txnType, setTxnType] = useState<"fir" | "registro">("fir");
  const [txnLoading, setTxnLoading] = useState(false);
  const [txnResult, setTxnResult] = useState<any>(null);

  const cardClass = "rounded-xl border border-border bg-card/60 backdrop-blur-sm p-4 space-y-3";
  const btnClass = "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-40";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Zap size={18} className="text-primary" />
        <h2 className="text-lg font-display tracking-wider">Azioni RENTRI — VPS Proxy</h2>
        <span className="text-xs text-muted-foreground ml-2">Tenant: <strong className="text-foreground">{company}</strong></span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 0. Lista Blocchi */}
        <div className={cardClass}>
          <h3 className="text-sm font-semibold flex items-center gap-2"><List size={14} className="text-primary" /> Lista Blocchi Attivi</h3>
          <p className="text-xs text-muted-foreground">Interroga RENTRI per i blocchi vidimazione disponibili.</p>
          <button disabled={lbLoading} className={`${btnClass} bg-primary text-primary-foreground hover:bg-primary/80`}
            onClick={async () => { setLbLoading(true); setLbResult(null); const r = await listaBlocchi(cliente); setLbResult({ ok: r.success, data: r.data }); setLbLoading(false); }}>
            {lbLoading ? <Loader2 size={14} className="animate-spin" /> : <List size={14} />} Interroga
          </button>
          <ResultBanner result={lbResult} />
        </div>

        {/* 1. Vidimazione */}
        <div className={cardClass}>
          <h3 className="text-sm font-semibold flex items-center gap-2"><FileText size={14} className="text-primary" /> Richiedi Nuovi FIR (Vidimazione)</h3>
          <p className="text-xs text-muted-foreground">Richiede un nuovo numero FIR dal RENTRI.</p>
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-xs text-muted-foreground">Blocco:</label>
            <select value={vidBlock} onChange={(e) => setVidBlock(e.target.value)}
              className="rounded-md border border-border bg-secondary/50 px-2 py-1 text-sm">
              {blocks.map(b => <option key={b.code} value={b.code}>{b.code} — {b.label}</option>)}
            </select>
            <label className="text-xs text-muted-foreground">Qtà:</label>
            <input type="number" min={1} max={500} value={vidQty} onChange={(e) => setVidQty(Number(e.target.value))}
              className="w-20 rounded-md border border-border bg-secondary/50 px-2 py-1 text-sm" />
            <button disabled={vidLoading} className={`${btnClass} bg-primary text-primary-foreground hover:bg-primary/80`}
              onClick={async () => {
                setVidLoading(true); setVidResult(null);
                const block = blocks.find(b => b.code === vidBlock);
                const r = await richiestaVidimazione(cliente, vidQty, vidBlock, block?.sito ?? undefined);
                setVidResult({ ok: r.success, data: r.data }); setVidLoading(false);
              }}>
              {vidLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Invia
            </button>
          </div>
          <ResultBanner result={vidResult} />
        </div>

        {/* 2. Emissione FIR */}
        <div className={cardClass}>
          <h3 className="text-sm font-semibold flex items-center gap-2"><Truck size={14} className="text-cyan-400" /> Emetti FIR (Firma Partenza)</h3>
          <p className="text-xs text-muted-foreground">Firma digitalmente il FIR e lo invia al RENTRI.</p>
          <textarea value={emPayload} onChange={(e) => setEmPayload(e.target.value)} rows={3} placeholder='{"produttore": {...}, "rifiuto": {...}}'
            className="w-full rounded-md border border-border bg-secondary/50 px-2 py-1 text-xs font-mono" />
          <button disabled={emLoading} className={`${btnClass} bg-cyan-600 text-white hover:bg-cyan-700`}
            onClick={async () => {
              setEmLoading(true); setEmResult(null);
              try { const p = JSON.parse(emPayload); const r = await emissioneFir(cliente, p); setEmResult({ ok: r.success, data: r.data }); }
              catch { setEmResult({ ok: false, data: { error: "JSON non valido" } }); }
              setEmLoading(false);
            }}>
            {emLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Emetti
          </button>
          <ResultBanner result={emResult} />
        </div>

        {/* 3. Firma Ricezione */}
        <div className={cardClass}>
          <h3 className="text-sm font-semibold flex items-center gap-2"><Factory size={14} className="text-orange-400" /> Firma Ricezione (Impianto)</h3>
          <p className="text-xs text-muted-foreground">Firma l'accettazione del rifiuto in impianto.</p>
          <textarea value={frPayload} onChange={(e) => setFrPayload(e.target.value)} rows={3} placeholder='{"arrivo": {...}, "accettazione": {...}}'
            className="w-full rounded-md border border-border bg-secondary/50 px-2 py-1 text-xs font-mono" />
          <button disabled={frLoading} className={`${btnClass} bg-orange-600 text-white hover:bg-orange-700`}
            onClick={async () => {
              setFrLoading(true); setFrResult(null);
              try { const p = JSON.parse(frPayload); const r = await firmaRicezione(cliente, p); setFrResult({ ok: r.success, data: r.data }); }
              catch { setFrResult({ ok: false, data: { error: "JSON non valido" } }); }
              setFrLoading(false);
            }}>
            {frLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Firma Ricezione
          </button>
          <ResultBanner result={frResult} />
        </div>

        {/* 4. Scarica PDF */}
        <div className={cardClass}>
          <h3 className="text-sm font-semibold flex items-center gap-2"><Download size={14} className="text-green-400" /> Scarica PDF (QR Code)</h3>
          <p className="text-xs text-muted-foreground">Recupera il PDF vidimato con QR Code dal RENTRI.</p>
          <div className="flex items-center gap-2 flex-wrap">
            <select value={pdfBlock} onChange={(e) => setPdfBlock(e.target.value)}
              className="rounded-md border border-border bg-secondary/50 px-2 py-1 text-sm">
              {blocks.map(b => <option key={b.code} value={b.code}>{b.code}</option>)}
            </select>
            <input type="text" value={pdfProg} onChange={(e) => setPdfProg(e.target.value)} placeholder="Progressivo"
              className="w-28 rounded-md border border-border bg-secondary/50 px-2 py-1 text-sm" />
            <button disabled={pdfLoading || !pdfProg.trim()} className={`${btnClass} bg-green-600 text-white hover:bg-green-700`}
              onClick={async () => { setPdfLoading(true); setPdfResult(null); const r = await scaricaPdfLotto(cliente, pdfBlock, pdfProg.trim()); setPdfResult({ ok: r.success, data: r.data }); setPdfLoading(false); }}>
              {pdfLoading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Scarica
            </button>
          </div>
          <ResultBanner result={pdfResult} />
        </div>

        {/* 5. Stato Transazione */}
        <div className={cardClass}>
          <h3 className="text-sm font-semibold flex items-center gap-2"><Search size={14} className="text-yellow-400" /> Stato Transazione</h3>
          <p className="text-xs text-muted-foreground">Verifica l'esito di una transazione asincrona RENTRI.</p>
          <div className="flex items-center gap-2 flex-wrap">
            <select value={txnType} onChange={(e) => setTxnType(e.target.value as "fir" | "registro")}
              className="rounded-md border border-border bg-secondary/50 px-2 py-1 text-sm">
              <option value="fir">FIR</option>
              <option value="registro">Registro</option>
            </select>
            <input type="text" value={txnId} onChange={(e) => setTxnId(e.target.value)} placeholder="Transazione ID"
              className="flex-1 min-w-[180px] rounded-md border border-border bg-secondary/50 px-2 py-1 text-sm" />
            <button disabled={txnLoading || !txnId.trim()} className={`${btnClass} bg-yellow-600 text-white hover:bg-yellow-700`}
              onClick={async () => {
                setTxnLoading(true); setTxnResult(null);
                const r = txnType === "fir"
                  ? await statoTransazioneFir(cliente, txnId.trim())
                  : await statoTransazioneRegistro(cliente, txnId.trim());
                setTxnResult({ ok: r.success, data: r.data }); setTxnLoading(false);
              }}>
              {txnLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />} Verifica
            </button>
          </div>
          <ResultBanner result={txnResult} />
        </div>
      </div>
    </div>
  );
}
