import { useState } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { trpc } from "../lib/trpc";
import { toast } from "sonner";
import { CheckCircle2, Send, FileText, Building2, Loader2, Upload } from "lucide-react";

export default function UploadFir() {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedCert, setSelectedCert] = useState("certificato.p12");
  const [dateOverride, setDateOverride] = useState<string>("");
  const [registryOverride, setRegistryOverride] = useState<string>("R1DDEWC3SHU");
  const multyRegistri = [
    { id: 'RQEL39R7NS0', label: 'Intermediazione' },
    { id: 'RAH20NP7O40', label: 'Produttore-Destinatario' },
    { id: 'RQCTG1TP7NT0', label: 'Trasporto Conto Proprio' }
  ]

  const { data: firFiles, refetch } = trpc.fir.list.useQuery();

  const uploadMutation = trpc.fir.upload.useMutation({
    onSuccess: () => {
      toast.success("File salvato correttamente!");
      setFiles([]);
      setUploading(false);
      refetch();
    },
    onError: (e) => {
      toast.error("Errore salvataggio: " + e.message);
      setUploading(false);
    }
  });

  const sendMutation = trpc.fir.send.useMutation({
    onSuccess: () => {
      toast.success("Inviato al RENTRI con successo!");
      refetch();
    },
    onError: (e) => toast.error("Errore Invio: " + e.message)
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles(selectedFiles.filter(f => f.name.endsWith('.xml')));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    try {
      for (const file of files) {
        const text = await file.text();
        await uploadMutation.mutateAsync({ filename: file.name, xmlContent: text });
      }
    } catch (e: any) {
      toast.error("Errore lettura file: " + e.message);
      setUploading(false);
    }
  };

  const handleSend = async (firId: number) => {
    if (!thumbprint && !filename) { return }
    const d = (dateOverride && dateOverride.length>=10) ? dateOverride : undefined
    await sendMutation.mutateAsync({ firId, thumbprint: selectedCert, dateMovimento: d, registryId: registryOverride });
  };

  return (
    <div className="container py-8 max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-white flex items-center gap-2">
        <FileText className="text-purple-500" /> Gestione FIR Singolo
      </h1>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle>1. Chi Spedisce?</CardTitle>
            <CardDescription>Scegli il certificato da usare</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Building2 className="w-4 h-4"/> Azienda</Label>
              <Select value={selectedCert} onValueChange={(v)=>{ setSelectedCert(v); if (v==='multyproget.p12') setRegistryOverride('RQEL39R7NS0'); else setRegistryOverride('R1DDEWC3SHU'); }}>
                <SelectTrigger className="bg-slate-950 border-slate-700 h-12 text-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="certificato.p12">Global Reco (Default)</SelectItem>
                  <SelectItem value="08934760961.p12">Global Reco (P.IVA)</SelectItem>
                  <SelectItem value="niyol.p12">Niyol S.r.l.</SelectItem>
                  <SelectItem value="multyproget.p12">Multyproget S.r.l.</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

          <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle>2. Carica XML</CardTitle>
            <CardDescription>Seleziona il file dal PC</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input type="file" accept=".xml" multiple onChange={handleFileChange} className="bg-slate-950 border-slate-700" />
            <div className="space-y-2">
              <Label>Data movimento (opzionale)</Label>
              <Input type="date" value={dateOverride} onChange={(e)=>setDateOverride(e.target.value)} className="bg-slate-950 border-slate-700" />
            </div>
            {selectedCert === 'multyproget.p12' ? (
              <div className="space-y-2">
                <Label>Registro</Label>
                <Select value={registryOverride} onValueChange={setRegistryOverride}>
                  <SelectTrigger className="bg-slate-950 border-slate-700 h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {multyRegistri.map(r => (<SelectItem key={r.id} value={r.id}>{r.id} - {r.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Registro</Label>
                <Input type="text" value={registryOverride} onChange={(e)=>setRegistryOverride(e.target.value)} className="bg-slate-950 border-slate-700" />
              </div>
            )}
            <Button onClick={handleUpload} disabled={uploading || files.length === 0} className="w-full bg-purple-600 hover:bg-purple-700 font-bold">
              {uploading ? <Loader2 className="animate-spin mr-2" /> : <Upload className="mr-2 h-4 w-4"/>}
              {uploading ? "Sto caricando..." : "SALVA NEL DB"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader><CardTitle>3. Lista File Pronti ({(firFiles as any)?.length || 0})</CardTitle></CardHeader>
        <CardContent className="space-y-2 max-h-[500px] overflow-auto">
          {!firFiles || (firFiles as any[]).length === 0 ? (
            <p className="text-slate-500 text-center py-4">Nessun file caricato.</p>
          ) : (
            (firFiles as any[]).map((f: any) => (
              <div key={f.id} className="flex justify-between items-center p-3 rounded bg-slate-950 border border-slate-800 hover:border-slate-600 transition">
                <div className="flex flex-col">
                  <span className="font-medium text-slate-200">{f.filename ?? `FIR #${f.id}`}</span>
                  <div className="flex gap-2 text-xs">
                    <span className="text-slate-500">{new Date(f.createdAt ?? Date.now()).toLocaleString()}</span>
                    <span className={`uppercase font-bold ${f.status === 'completed' ? 'text-green-500' : 'text-yellow-500'}`}>{f.status}</span>
                  </div>
                </div>
                {f.status === 'completed' ? (
                  <div className="flex items-center text-green-500 gap-2 bg-green-950/30 px-3 py-1 rounded border border-green-900">
                    <CheckCircle2 className="w-5 h-5" /> INVIATO
                  </div>
                ) : f.status === 'processing' ? (
                  <div className="flex items-center text-yellow-400 gap-2 bg-yellow-950/30 px-3 py-1 rounded border border-yellow-900">
                    <Loader2 className="w-5 h-5 animate-spin" /> IN ELABORAZIONE
                  </div>
                ) : (
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 shadow-lg shadow-green-900/20" onClick={() => sendMutation.mutate({ firId: f.id, thumbprint: selectedCert })} disabled={sendMutation.isLoading}>
                    {sendMutation.isLoading ? <Loader2 className="animate-spin w-4 h-4" /> : <Send className="w-4 h-4 mr-2" />}
                    INVIA ORA
                  </Button>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

        {firFiles && (firFiles as any[]).length > 0 && (
          <Card>
            <CardHeader><CardTitle>3. Invia FIR</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(firFiles as any[]).map((fir: any) => (
                  <div key={fir.id} className="flex items-center justify-between p-4 rounded-lg border border-slate-800 bg-slate-900/50">
                    <div>
                      <p className="font-bold">FIR #{fir.id}</p>
                      <p className="text-xs text-slate-400">Stato: <span className="uppercase">{fir.status}</span></p>
                    </div>
                    {fir.status === 'in_attesa' && (
                      <Button size="sm" onClick={() => handleSend(fir.id)}>
                        <Send className="h-4 w-4 mr-2" /> Invia (Firma)
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
    </div>
  );
}