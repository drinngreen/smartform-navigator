import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  FileText, Download, Search, Plus, Sparkles, Send, RefreshCw, AlertTriangle, CalendarClock, Building2, Loader2,
} from "lucide-react";

export interface AutorizzazioneRow {
  id: string;
  azienda: string;
  titolo: string;
  tipo: string;
  numero: string | null;
  ente: string | null;
  oggetto: string | null;
  data_rilascio: string | null;
  data_scadenza: string | null;
  file_path: string | null;
  file_name: string | null;
  contenuto: string | null;
}

const AZIENDE = [
  { id: "multyproget", label: "MULTY PROGET S.R.L.", color: "34,197,94" },
  { id: "niyol", label: "NIYOL ETICONS LOGISTICA S.R.L. SB", color: "6,182,212" },
];

const TIPI: Record<string, { label: string; color: string }> = {
  albo: { label: "Albo Gestori", color: "59,130,246" },
  impianto: { label: "Impianto / art. 208", color: "249,115,22" },
  art216: { label: "Art. 216 semplificata", color: "168,85,247" },
  aua: { label: "AUA", color: "236,72,153" },
  visura: { label: "Visura Albo", color: "16,185,129" },
  altro: { label: "Altro", color: "148,163,184" },
};

function fmtDate(d: string | null) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function scadenzaState(d: string | null) {
  if (!d) return { label: "Scadenza non indicata", tone: "muted" as const };
  const today = new Date();
  const exp = new Date(d);
  const days = Math.ceil((exp.getTime() - today.getTime()) / 86400000);
  if (days < 0) return { label: `Scaduta il ${fmtDate(d)}`, tone: "danger" as const };
  if (days < 90) return { label: `Scade il ${fmtDate(d)} (${days} gg)`, tone: "warn" as const };
  return { label: `Valida fino al ${fmtDate(d)}`, tone: "ok" as const };
}

export function AutorizzazioniModule() {
  const { toast } = useToast();
  const [rows, setRows] = useState<AutorizzazioneRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroAzienda, setFiltroAzienda] = useState<string>("tutte");
  const [filtroTipo, setFiltroTipo] = useState<string>("tutti");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<AutorizzazioneRow | null>(null);

  // AI
  const [chat, setChat] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Upload
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    azienda: "multyproget", tipo: "albo", titolo: "", numero: "", ente: "",
    oggetto: "", data_rilascio: "", data_scadenza: "",
  });
  const [file, setFile] = useState<File | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("autorizzazioni_aziendali")
      .select("id, azienda, titolo, tipo, numero, ente, oggetto, data_rilascio, data_scadenza, file_path, file_name, contenuto")
      .order("azienda")
      .order("data_rilascio", { ascending: false });
    if (error) toast({ title: "Errore caricamento", description: error.message, variant: "destructive" });
    setRows((data as AutorizzazioneRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chat, asking]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (filtroAzienda !== "tutte" && r.azienda !== filtroAzienda) return false;
      if (filtroTipo !== "tutti" && r.tipo !== filtroTipo) return false;
      if (!needle) return true;
      return `${r.titolo} ${r.numero ?? ""} ${r.ente ?? ""} ${r.oggetto ?? ""} ${r.contenuto ?? ""}`
        .toLowerCase().includes(needle);
    });
  }, [rows, filtroAzienda, filtroTipo, q]);

  const inScadenza = useMemo(
    () => rows.filter((r) => {
      if (!r.data_scadenza) return false;
      const days = Math.ceil((new Date(r.data_scadenza).getTime() - Date.now()) / 86400000);
      return days < 90;
    }),
    [rows],
  );

  const downloadPdf = async (row: AutorizzazioneRow) => {
    if (!row.file_path) return;
    const { data, error } = await supabase.storage.from("autorizzazioni").createSignedUrl(row.file_path, 300);
    if (error || !data) {
      toast({ title: "Download non riuscito", description: error?.message, variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  };

  const ask = async (preset?: string) => {
    const text = (preset ?? question).trim();
    if (!text || asking) return;
    setQuestion("");
    const history = chat.slice(-8);
    setChat((c) => [...c, { role: "user", content: text }]);
    setAsking(true);
    try {
      const { data, error } = await supabase.functions.invoke("autorizzazioni-ai", {
        body: { action: "ask", question: text, azienda: filtroAzienda, history },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error ?? "Errore AI");
      setChat((c) => [...c, { role: "assistant", content: data.answer }]);
    } catch (e: any) {
      setChat((c) => [...c, { role: "assistant", content: `⚠️ Errore: ${e.message ?? e}` }]);
    } finally {
      setAsking(false);
    }
  };

  const handleUpload = async () => {
    if (!file || !form.titolo.trim()) {
      toast({ title: "Dati mancanti", description: "Titolo e file PDF sono obbligatori", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${form.azienda}/${Date.now()}_${safe}`;
      const up = await supabase.storage.from("autorizzazioni").upload(path, file, { contentType: "application/pdf" });
      if (up.error) throw up.error;
      const { data: inserted, error } = await supabase.from("autorizzazioni_aziendali").insert({
        azienda: form.azienda,
        tipo: form.tipo,
        titolo: form.titolo.trim(),
        numero: form.numero.trim() || null,
        ente: form.ente.trim() || null,
        oggetto: form.oggetto.trim() || null,
        data_rilascio: form.data_rilascio || null,
        data_scadenza: form.data_scadenza || null,
        file_path: path,
        file_name: file.name,
      }).select("id").single();
      if (error) throw error;

      toast({ title: "Autorizzazione caricata", description: "Estrazione testo per l'AI in corso…" });
      await supabase.functions.invoke("autorizzazioni-ai", { body: { action: "extract", id: inserted.id } });
      setUploadOpen(false);
      setFile(null);
      setForm({ azienda: "multyproget", tipo: "albo", titolo: "", numero: "", ente: "", oggetto: "", data_rilascio: "", data_scadenza: "" });
      await load();
      toast({ title: "Pronta", description: "Il documento è consultabile e interrogabile dall'AI." });
    } catch (e: any) {
      toast({ title: "Errore caricamento", description: e.message ?? String(e), variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const suggerimenti = [
    "Quali categorie Albo abbiamo e con quali scadenze?",
    "Quali codici CER siamo autorizzati a ricevere in impianto?",
    "Quali operazioni R e D sono autorizzate nell'impianto di Piscina?",
    "Quali sono i quantitativi massimi di stoccaggio istantaneo?",
    "Possiamo trasportare rifiuti pericolosi? Con quali limiti?",
    "Quali prescrizioni dobbiamo rispettare sul deposito?",
  ];

  return (
    <div className="space-y-4">
      {/* Header stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Documenti in archivio</p>
          <p className="text-2xl font-bold">{rows.length}</p>
        </Card>
        {AZIENDE.map((a) => (
          <Card key={a.id} className="p-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Building2 className="w-3 h-3" /> {a.id === "niyol" ? "Niyol" : "Multyproget"}</p>
            <p className="text-2xl font-bold">{rows.filter((r) => r.azienda === a.id).length}</p>
          </Card>
        ))}
        <Card className={`p-3 ${inScadenza.length ? "border-destructive" : ""}`}>
          <p className="text-xs text-muted-foreground flex items-center gap-1"><CalendarClock className="w-3 h-3" /> In scadenza (&lt;90gg)</p>
          <p className={`text-2xl font-bold ${inScadenza.length ? "text-destructive" : ""}`}>{inScadenza.length}</p>
        </Card>
      </div>

      {/* AI panel */}
      <Card className="p-4 border-primary/40">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="font-bold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> AUTHORITY AI — assistente autorizzazioni
          </h3>
          <span className="text-xs text-muted-foreground">
            Ambito: {filtroAzienda === "tutte" ? "tutte le aziende" : filtroAzienda === "niyol" ? "Niyol" : "Multyproget"}
          </span>
        </div>

        {chat.length === 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {suggerimenti.map((s) => (
              <button key={s} onClick={() => ask(s)} className="text-xs px-2.5 py-1.5 rounded-lg border border-border hover:border-primary/60 text-left">
                {s}
              </button>
            ))}
          </div>
        )}

        {chat.length > 0 && (
          <div className="max-h-[380px] overflow-y-auto space-y-3 mb-3 pr-1">
            {chat.map((m, i) => (
              <div key={i} className={`p-3 rounded-xl text-sm whitespace-pre-wrap ${m.role === "user" ? "bg-primary/10 ml-8" : "bg-muted/50 mr-4"}`}>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{m.role === "user" ? "Tu" : "Authority AI"}</p>
                {m.content}
              </div>
            ))}
            {asking && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Sto consultando le autorizzazioni…</div>}
            <div ref={chatEndRef} />
          </div>
        )}

        <div className="flex gap-2">
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ask()}
            placeholder="Chiedi qualsiasi cosa sulle autorizzazioni (CER, categorie, scadenze, prescrizioni)…"
          />
          <Button onClick={() => ask()} disabled={asking}><Send className="w-4 h-4" /></Button>
        </div>
      </Card>

      {/* Filtri */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-8" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca nel testo dei documenti…" />
        </div>
        <Select value={filtroAzienda} onValueChange={setFiltroAzienda}>
          <SelectTrigger className="w-[190px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="tutte">Tutte le aziende</SelectItem>
            <SelectItem value="multyproget">Multyproget</SelectItem>
            <SelectItem value="niyol">Niyol</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
          <SelectTrigger className="w-[190px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="tutti">Tutti i tipi</SelectItem>
            {Object.entries(TIPI).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={load} title="Ricarica"><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /></Button>

        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="w-4 h-4" /> Aggiungi autorizzazione</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Nuova autorizzazione</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Azienda</label>
                  <Select value={form.azienda} onValueChange={(v) => setForm({ ...form, azienda: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="multyproget">Multyproget</SelectItem>
                      <SelectItem value="niyol">Niyol</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Tipo</label>
                  <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(TIPI).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Titolo *</label>
                <Input value={form.titolo} onChange={(e) => setForm({ ...form, titolo: e.target.value })} placeholder="Es. Albo Gestori TO30695 — Categoria 4 classe F" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-muted-foreground">Numero</label><Input value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} /></div>
                <div><label className="text-xs text-muted-foreground">Ente</label><Input value={form.ente} onChange={(e) => setForm({ ...form, ente: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-muted-foreground">Data rilascio</label><Input type="date" value={form.data_rilascio} onChange={(e) => setForm({ ...form, data_rilascio: e.target.value })} /></div>
                <div><label className="text-xs text-muted-foreground">Data scadenza</label><Input type="date" value={form.data_scadenza} onChange={(e) => setForm({ ...form, data_scadenza: e.target.value })} /></div>
              </div>
              <div><label className="text-xs text-muted-foreground">Oggetto</label><Textarea rows={3} value={form.oggetto} onChange={(e) => setForm({ ...form, oggetto: e.target.value })} /></div>
              <div>
                <label className="text-xs text-muted-foreground">File PDF *</label>
                <Input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setUploadOpen(false)}>Annulla</Button>
              <Button onClick={handleUpload} disabled={uploading}>{uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Carica e indicizza"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Elenco */}
      <div className="grid gap-3 md:grid-cols-2">
        {filtered.map((r) => {
          const tipo = TIPI[r.tipo] ?? TIPI.altro;
          const sc = scadenzaState(r.data_scadenza);
          return (
            <Card key={r.id} className="p-4 space-y-2 hover:border-primary/50 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    <span
                      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
                      style={{ background: `rgba(${tipo.color},0.15)`, color: `rgb(${tipo.color})`, border: `1px solid rgba(${tipo.color},0.4)` }}
                    >{tipo.label}</span>
                    <Badge variant="outline">{r.azienda === "niyol" ? "Niyol" : "Multyproget"}</Badge>
                    {r.numero && <span className="text-xs font-mono text-muted-foreground">{r.numero}</span>}
                  </div>
                  <p className="font-semibold leading-tight">{r.titolo}</p>
                  <p className="text-xs text-muted-foreground">{r.ente}</p>
                </div>
              </div>
              {r.oggetto && <p className="text-sm text-muted-foreground line-clamp-3">{r.oggetto}</p>}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-muted-foreground">Rilascio: {fmtDate(r.data_rilascio)}</span>
                <span className={
                  sc.tone === "danger" ? "text-destructive font-semibold flex items-center gap-1"
                    : sc.tone === "warn" ? "text-amber-500 font-semibold flex items-center gap-1"
                    : sc.tone === "ok" ? "text-emerald-500" : "text-muted-foreground"
                }>
                  {sc.tone !== "ok" && sc.tone !== "muted" && <AlertTriangle className="w-3 h-3" />} {sc.label}
                </span>
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => downloadPdf(r)} disabled={!r.file_path}>
                  <Download className="w-3.5 h-3.5" /> PDF
                </Button>
                <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => setSelected(r)}>
                  <FileText className="w-3.5 h-3.5" /> Testo
                </Button>
                <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => setChatDoc(r)}>
                  <Sparkles className="w-3.5 h-3.5" /> Chiedi all'AI
                </Button>

              </div>
            </Card>
          );
        })}
        {!loading && filtered.length === 0 && (
          <p className="text-sm text-muted-foreground col-span-full">Nessuna autorizzazione trovata con i filtri correnti.</p>
        )}
      </div>

      {/* Viewer testo */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader><DialogTitle className="pr-8">{selected?.titolo}</DialogTitle></DialogHeader>
          <div className="overflow-y-auto text-xs whitespace-pre-wrap font-mono bg-muted/40 p-3 rounded-lg">
            {selected?.contenuto || "Testo non ancora estratto per questo documento."}
          </div>
          <DialogFooter>
            {selected?.file_path && (
              <Button variant="outline" className="gap-1.5" onClick={() => selected && downloadPdf(selected)}>
                <Download className="w-4 h-4" /> Scarica PDF originale
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
