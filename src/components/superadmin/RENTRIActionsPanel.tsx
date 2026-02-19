import { useState } from "react";
import { Loader2, Send, Download, Truck, Factory, Zap, FileText, CheckCircle2, XCircle } from "lucide-react";
import {
  richiestaVidimazioneNgrok,
  emissioneFirNgrok,
  firmaRicezioneNgrok,
  getPdfNgrok,
  flowTransportNgrok,
  flowFacilityNgrok,
  flowMassiveEmissionNgrok,
} from "@/lib/rentriNgrokApi";

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

  /* ── Vidimazione ── */
  const [vidQty, setVidQty] = useState(5);
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

  /* ── Get PDF ── */
  const [pdfFirId, setPdfFirId] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfResult, setPdfResult] = useState<any>(null);

  /* ── Flows ── */
  const [flowLoading, setFlowLoading] = useState<string | null>(null);
  const [flowResult, setFlowResult] = useState<any>(null);
  const [massiveQty, setMassiveQty] = useState(5);

  const cardClass = "rounded-xl border border-border bg-card/60 backdrop-blur-sm p-4 space-y-3";
  const btnClass = "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-40";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Zap size={18} className="text-primary" />
        <h2 className="text-lg font-display tracking-wider">Azioni RENTRI — Ngrok</h2>
        <span className="text-xs text-muted-foreground ml-2">Tenant: <strong className="text-foreground">{company}</strong></span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. Vidimazione */}
        <div className={cardClass}>
          <h3 className="text-sm font-semibold flex items-center gap-2"><FileText size={14} className="text-primary" /> Richiedi Nuovi FIR (Vidimazione)</h3>
          <p className="text-xs text-muted-foreground">Richiede un blocco di nuovi codici FIR vuoti dal RENTRI.</p>
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">Quantità:</label>
            <input type="number" min={1} max={500} value={vidQty} onChange={(e) => setVidQty(Number(e.target.value))}
              className="w-20 rounded-md border border-border bg-secondary/50 px-2 py-1 text-sm" />
            <button disabled={vidLoading} className={`${btnClass} bg-primary text-primary-foreground hover:bg-primary/80`}
              onClick={async () => { setVidLoading(true); setVidResult(null); const r = await richiestaVidimazioneNgrok(company, vidQty); setVidResult(r); setVidLoading(false); }}>
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
              try { const p = JSON.parse(emPayload); const r = await emissioneFirNgrok(company, p); setEmResult(r); }
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
          <p className="text-xs text-muted-foreground">Firma l'accettazione del rifiuto in impianto. Solo MULTY.</p>
          <textarea value={frPayload} onChange={(e) => setFrPayload(e.target.value)} rows={3} placeholder='{"arrivo": {...}, "accettazione": {...}}'
            className="w-full rounded-md border border-border bg-secondary/50 px-2 py-1 text-xs font-mono" />
          <button disabled={frLoading || company !== "MULTY"} className={`${btnClass} bg-orange-600 text-white hover:bg-orange-700`}
            onClick={async () => {
              setFrLoading(true); setFrResult(null);
              try { const p = JSON.parse(frPayload); const r = await firmaRicezioneNgrok(company, p); setFrResult(r); }
              catch { setFrResult({ ok: false, data: { error: "JSON non valido" } }); }
              setFrLoading(false);
            }}>
            {frLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Firma Ricezione
          </button>
          {company !== "MULTY" && <p className="text-xs text-yellow-400">⚠ Questa azione è disponibile solo per MULTY</p>}
          <ResultBanner result={frResult} />
        </div>

        {/* 4. Scarica PDF */}
        <div className={cardClass}>
          <h3 className="text-sm font-semibold flex items-center gap-2"><Download size={14} className="text-green-400" /> Scarica PDF (QR Code)</h3>
          <p className="text-xs text-muted-foreground">Recupera il PDF ufficiale con il QR Code dal RENTRI.</p>
          <div className="flex items-center gap-2">
            <input type="text" value={pdfFirId} onChange={(e) => setPdfFirId(e.target.value)} placeholder="ID FIR (es. SKKZR...)"
              className="flex-1 rounded-md border border-border bg-secondary/50 px-2 py-1 text-sm" />
            <button disabled={pdfLoading || !pdfFirId.trim()} className={`${btnClass} bg-green-600 text-white hover:bg-green-700`}
              onClick={async () => { setPdfLoading(true); setPdfResult(null); const r = await getPdfNgrok(company, pdfFirId.trim()); setPdfResult(r); setPdfLoading(false); }}>
              {pdfLoading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Scarica
            </button>
          </div>
          <ResultBanner result={pdfResult} />
        </div>
      </div>

      {/* 5. Test Flussi */}
      <div className={cardClass}>
        <h3 className="text-sm font-semibold flex items-center gap-2"><Zap size={14} className="text-yellow-400" /> Test Flussi Completi (Automazioni Rapide)</h3>
        <p className="text-xs text-muted-foreground">Esegui flussi automatici di test per verificare l'intero ciclo.</p>
        <div className="flex flex-wrap items-center gap-3">
          <button disabled={flowLoading !== null} className={`${btnClass} bg-cyan-600 text-white hover:bg-cyan-700`}
            onClick={async () => { setFlowLoading("transport"); setFlowResult(null); const r = await flowTransportNgrok(company); setFlowResult(r); setFlowLoading(null); }}>
            {flowLoading === "transport" ? <Loader2 size={14} className="animate-spin" /> : <Truck size={14} />} Flow Trasporto
          </button>
          <button disabled={flowLoading !== null} className={`${btnClass} bg-orange-600 text-white hover:bg-orange-700`}
            onClick={async () => { setFlowLoading("facility"); setFlowResult(null); const r = await flowFacilityNgrok(); setFlowResult(r); setFlowLoading(null); }}>
            {flowLoading === "facility" ? <Loader2 size={14} className="animate-spin" /> : <Factory size={14} />} Flow Impianto
          </button>
          <div className="flex items-center gap-2">
            <input type="number" min={1} max={100} value={massiveQty} onChange={(e) => setMassiveQty(Number(e.target.value))}
              className="w-16 rounded-md border border-border bg-secondary/50 px-2 py-1 text-sm" />
            <button disabled={flowLoading !== null} className={`${btnClass} bg-purple-600 text-white hover:bg-purple-700`}
              onClick={async () => { setFlowLoading("massive"); setFlowResult(null); const r = await flowMassiveEmissionNgrok(company, massiveQty); setFlowResult(r); setFlowLoading(null); }}>
              {flowLoading === "massive" ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />} Emissione Massiva
            </button>
          </div>
        </div>
        <ResultBanner result={flowResult} />
      </div>
    </div>
  );
}
