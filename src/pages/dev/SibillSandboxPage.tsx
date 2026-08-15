import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, FlaskConical, Send, Sparkles, Webhook, ShieldAlert } from "lucide-react";

/**
 * SIBILL SANDBOX PLAYGROUND — pagina di test ISOLATA.
 *
 * ⚠️ Nessun dato viene letto o scritto sulle tabelle di produzione
 * (`fatture`, `anagrafica_aziende_mp`, `fatture_sibill_sync`).
 * Tutto vive nello stato React: credenziali, payload e risposte.
 */

const SANDBOX_FN = "sibill-sandbox";
const FUNCTIONS_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

const rnd = (n: number) => Math.floor(Math.random() * n);

function mockCounterpart() {
  const suffix = String(1000 + rnd(9000));
  return {
    company_name: `Azienda Test SRL ${suffix}`,
    vat_number: `${11111111111 + rnd(88888888)}`.slice(0, 11),
    tax_number: `${11111111111 + rnd(88888888)}`.slice(0, 11),
    address: `Via della Prova ${rnd(200) + 1}`,
    city: "Perugia",
    postal_code: "06100",
    province_code: "PG",
    country: "IT",
    destination_code: "SUBM19N",
    identity_type: "COMPANY",
  };
}

function mockInvoice(counterpartName: string, vat: string) {
  const imponibile = 1000.0;
  const aliquota = 22;
  return {
    format: "FPA12",
    document_type: "TD01",
    number: `TEST-2026-${String(rnd(99) + 1).padStart(2, "0")}`,
    date: new Date().toISOString().slice(0, 10),
    currency: "EUR",
    counterpart: { company_name: counterpartName, vat_number: vat, country: "IT" },
    lines: [
      {
        line_number: 1,
        description: "Servizio di smaltimento fittizio",
        quantity: 1,
        unit_of_measure: "n",
        unit_price: imponibile,
        total_price: imponibile,
        vat_rate: aliquota,
      },
    ],
    vat_summary: [
      { vat_rate: aliquota, taxable_amount: imponibile, tax_amount: +(imponibile * aliquota / 100).toFixed(2) },
    ],
    total_amount: +(imponibile * (1 + aliquota / 100)).toFixed(2),
    payment: { method: "MP05", due_date: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10) },
  };
}

function JsonBox({ title, value, tone }: { title: string; value: unknown; tone?: string }) {
  return (
    <div className="flex-1 min-w-0">
      <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1">{title}</div>
      <pre className={`h-72 overflow-auto rounded-xl border border-border/40 bg-black/80 p-3 text-[11px] leading-relaxed font-mono ${tone ?? "text-emerald-300"}`}>
        {value === null || value === undefined ? "—" : JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

export default function SibillSandboxPage() {
  const [apiKey, setApiKey] = useState("");
  const [companyId, setCompanyId] = useState("");

  const [counterpart, setCounterpart] = useState<any>(mockCounterpart());
  const [invoice, setInvoice] = useState<any>(() => {
    const c = mockCounterpart();
    return mockInvoice(c.company_name, c.vat_number);
  });

  const [sentPayload, setSentPayload] = useState<any>(null);
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [httpStatus, setHttpStatus] = useState<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [mock, setMock] = useState(true);
  const [scenario, setScenario] = useState("success");

  const [webhookDocId, setWebhookDocId] = useState("");
  const [webhookStatus, setWebhookStatus] = useState("PAID");
  const [webhookPreviewOnly, setWebhookPreviewOnly] = useState(true);

  const ready = mock || (apiKey.trim().length > 0 && companyId.trim().length > 0);

  const webhookPayload = useMemo(
    () => ({
      event: "document.updated",
      data: {
        id: webhookDocId || "doc_test_00000000",
        status: webhookStatus === "PAID" ? "DELIVERED" : webhookStatus,
        flows: [{ delivery_status: webhookStatus === "PAID" ? "DELIVERED" : webhookStatus, payment_status: webhookStatus }],
      },
    }),
    [webhookDocId, webhookStatus],
  );

  const callSandbox = async (label: string, path: string, payload: any, method = "POST") => {
    if (!ready) { toast.error("Inserisci Sandbox API Key e Company ID (oppure attiva la modalità MOCK)"); return; }
    setBusy(label);
    setSentPayload({ method, url: `https://integration.dev.sibill.com${path}`, body: payload, mode: mock ? `MOCK (${scenario})` : "REALE" });
    setApiResponse(null);
    setHttpStatus(null);
    try {
      const res = await fetch(`${FUNCTIONS_BASE}/${SANDBOX_FN}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
        body: JSON.stringify({ api_key: apiKey.trim(), path, method, payload, mock, mock_scenario: scenario }),
      });
      const data = await res.json();
      setHttpStatus(data?.status ?? res.status);
      setApiResponse(data?.response ?? data);
      const docId = data?.response?.data?.id;
      if (docId && String(docId).startsWith("doc")) setWebhookDocId(docId);
      if (data?.ok) toast.success(`${label}${mock ? " (MOCK)" : ""}: ${data.status} OK (${data.elapsed_ms} ms)`);
      else toast.error(`${label}: HTTP ${data?.status ?? res.status}`);
    } catch (e: any) {
      setApiResponse({ error: e.message });
      toast.error("Errore rete: " + e.message);
    } finally {
      setBusy(null);
    }
  };


  const sendWebhook = async () => {
    if (webhookPreviewOnly) {
      setSentPayload({ method: "POST", url: `${FUNCTIONS_BASE}/sibill-webhook`, body: webhookPayload });
      setApiResponse({ info: "Solo anteprima: nessuna chiamata inviata. Togli la spunta per inviare davvero." });
      setHttpStatus(null);
      return;
    }
    setBusy("webhook");
    setSentPayload({ method: "POST", url: `${FUNCTIONS_BASE}/sibill-webhook`, body: webhookPayload });
    try {
      const res = await fetch(`${FUNCTIONS_BASE}/sibill-webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: ANON_KEY },
        body: JSON.stringify(webhookPayload),
      });
      const text = await res.text();
      setHttpStatus(res.status);
      try { setApiResponse(JSON.parse(text)); } catch { setApiResponse({ raw: text }); }
      res.ok ? toast.success("Webhook locale inviato") : toast.error(`Webhook: HTTP ${res.status}`);
    } catch (e: any) {
      setApiResponse({ error: e.message });
      toast.error("Errore webhook: " + e.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="space-y-2">
          <div className="flex items-center gap-3">
            <FlaskConical className="h-6 w-6 text-amber-400" />
            <h1 className="text-2xl font-display tracking-wide">Sibill Sandbox Playground</h1>
            <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-400">AMBIENTE DI TEST</Badge>
          </div>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-400" />
            Pagina isolata: usa solo dati fittizi e non scrive nulla su fatture o anagrafiche reali.
            Endpoint: <code className="font-mono">https://integration.dev.sibill.com</code>
          </p>
        </header>

        {/* Credenziali */}
        <section className="rounded-2xl border border-border/30 bg-card/60 p-5 grid gap-4 md:grid-cols-2">
          <div>
            <Label className="text-xs text-muted-foreground">Sandbox API Key (Bearer Token)</Label>
            <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk_dev_..." className="font-mono" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Sandbox Company ID</Label>
            <Input value={companyId} onChange={(e) => setCompanyId(e.target.value)} placeholder="cmp_..." className="font-mono" />
          </div>
          <p className="md:col-span-2 text-[11px] text-muted-foreground">
            Le credenziali restano solo in memoria per questa sessione: non vengono salvate né inviate al database.
          </p>
        </section>

        <Tabs defaultValue="counterpart">
          <TabsList>
            <TabsTrigger value="counterpart">Cliente Mock</TabsTrigger>
            <TabsTrigger value="invoice">Invia Fattura Mock</TabsTrigger>
            <TabsTrigger value="webhook">Simula Webhook</TabsTrigger>
          </TabsList>

          <TabsContent value="counterpart" className="space-y-4 pt-4">
            <div className="rounded-2xl border border-border/30 bg-card/60 p-5 space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => setCounterpart(mockCounterpart())}>
                  <Sparkles className="h-4 w-4 mr-2" /> Genera Cliente Mock
                </Button>
                <Button
                  disabled={!ready || busy !== null}
                  onClick={() => callSandbox("Counterpart", `/api/v1/companies/${companyId.trim()}/counterparts`, counterpart)}
                >
                  {busy === "Counterpart" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                  Invia a Sibill (POST /counterparts)
                </Button>
              </div>
              <Textarea
                value={JSON.stringify(counterpart, null, 2)}
                onChange={(e) => { try { setCounterpart(JSON.parse(e.target.value)); } catch { /* json in modifica */ } }}
                className="h-56 font-mono text-[11px]"
              />
            </div>
          </TabsContent>

          <TabsContent value="invoice" className="space-y-4 pt-4">
            <div className="rounded-2xl border border-border/30 bg-card/60 p-5 space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => setInvoice(mockInvoice(counterpart.company_name, counterpart.vat_number))}>
                  <Sparkles className="h-4 w-4 mr-2" /> Rigenera fattura FPA12 fittizia
                </Button>
                <Button
                  disabled={!ready || busy !== null}
                  onClick={() => callSandbox("Documento", `/api/v1/companies/${companyId.trim()}/documents`, invoice)}
                >
                  {busy === "Documento" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                  Invia a Sibill (POST /documents)
                </Button>
              </div>
              <Textarea
                value={JSON.stringify(invoice, null, 2)}
                onChange={(e) => { try { setInvoice(JSON.parse(e.target.value)); } catch { /* json in modifica */ } }}
                className="h-72 font-mono text-[11px]"
              />
            </div>
          </TabsContent>

          <TabsContent value="webhook" className="space-y-4 pt-4">
            <div className="rounded-2xl border border-border/30 bg-card/60 p-5 space-y-3">
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Document ID Sibill</Label>
                  <Input value={webhookDocId} onChange={(e) => setWebhookDocId(e.target.value)} placeholder="doc_..." className="font-mono" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Stato</Label>
                  <Select value={webhookStatus} onValueChange={setWebhookStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PAID">PAID</SelectItem>
                      <SelectItem value="DELIVERED">DELIVERED</SelectItem>
                      <SelectItem value="REJECTED">REJECTED</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button onClick={sendWebhook} disabled={busy !== null} className="w-full">
                    {busy === "webhook" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Webhook className="h-4 w-4 mr-2" />}
                    Invia Webhook Locale
                  </Button>
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input type="checkbox" checked={webhookPreviewOnly} onChange={(e) => setWebhookPreviewOnly(e.target.checked)} />
                Solo anteprima payload (non invia nulla). Togli la spunta per chiamare davvero il webhook:
                aggiornerà lo stato della fattura collegata a questo document_id, se esiste.
              </label>
            </div>
          </TabsContent>
        </Tabs>

        {/* Ispettore */}
        <section className="rounded-2xl border border-border/30 bg-card/60 p-5 space-y-3">
          <div className="flex items-center gap-3">
            <h2 className="font-display tracking-wide text-sm">Ispettore richieste</h2>
            {httpStatus !== null && (
              <Badge variant={httpStatus >= 200 && httpStatus < 300 ? "outline" : "destructive"} className="font-mono text-[10px]">
                HTTP {httpStatus}
              </Badge>
            )}
          </div>
          <div className="flex flex-col md:flex-row gap-4">
            <JsonBox title="Payload inviato" value={sentPayload} tone="text-cyan-300" />
            <JsonBox
              title="Risposta API"
              value={apiResponse}
              tone={httpStatus !== null && httpStatus >= 400 ? "text-rose-300" : "text-emerald-300"}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
